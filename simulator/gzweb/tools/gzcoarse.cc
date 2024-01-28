/*
 * Copyright 2014 Open Source Robotics Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/

#include <gts.h>
#include <tinyxml.h>
#include <math.h>
#include <gazebo/gazebo_config.h>
#include <gazebo/common/Mesh.hh>
#include <gazebo/common/Material.hh>
#include <gazebo/common/ColladaLoader.hh>
#include "nanoflann.hpp"

#ifndef PI
#define PI 3.14159265359
#endif

enum GeometryType {POSITION, NORMAL, UVMAP};

//////////////////////////////////////////////////
// Custom data set for nanoflann
template <typename T>
struct PointCloud
{
  struct Point
  {
    T  x,y,z;
  };

  std::vector<Point>  pts;

  // Must return the number of data points
  inline size_t kdtree_get_point_count() const
  {
    return pts.size();
  }

  // Returns the distance between the vector "p1[0:size-1]" and the data point
  // with index "idx_p2" stored in the class:
  inline T kdtree_distance(const T *p1, const size_t idx_p2,
      size_t size) const
  {
    const T d0=p1[0]-pts[idx_p2].x;
    const T d1=p1[1]-pts[idx_p2].y;
    const T d2=p1[2]-pts[idx_p2].z;
    return d0*d0+d1*d1+d2*d2;
  }

  // Returns the dim'th component of the idx'th point in the class:
  // Since this is inlined and the "dim" argument is typically an immediate
  // value, the "if/else's" are actually solved at compile time.
  inline T kdtree_get_pt(const size_t idx, int dim) const
  {
    if (dim==0) return pts[idx].x;
    else if (dim==1) return pts[idx].y;
    else return pts[idx].z;
  }

  // Optional bounding-box computation: return false to default to a standard
  // bbox computation loop.
  template <class BBOX>
  bool kdtree_get_bbox(BBOX &bb) const
  {
    return false;
  }
};

//////////////////////////////////////////////////
/// \brief Export texture source, used by ExportGeometries/ConvertGztoDae.
/// Different from that in ColladaExporter, because it uses different indices.
/// Using nanoflann for kd-tree, but it could be changed to GTS kd-tree.
/// \param[in] _outSubMesh Pointer to an output submesh
/// \param[in] _inSubMesh Pointer to an input submesh
/// \param[in] _meshXml Pointer to the mesh XML instance
/// \param[in] _meshID Mesh ID (mesh_<number>)
void ExportTextureSource(const gazebo::common::SubMesh *_outSubMesh,
    const gazebo::common::SubMesh *_inSubMesh,
    TiXmlElement *_meshXml, const char *_meshID)
{
  std::cout << "Calculating texture map..." << std::endl;

  char sourceId[100], sourceArrayId[100];
  unsigned int inCount = _inSubMesh->GetVertexCount();

  //assert(inCount%3 == 0);
  if (inCount%3 != 0)
  {
    inCount = floor(inCount/3)*3;
  }

  std::ostringstream fillData;
  fillData.precision(5);
  fillData<<std::fixed;

  // Fill the point cloud with vertices from the original mesh
  PointCloud<double> cloud;
  cloud.pts.resize(inCount);
  ignition::math::Vector3d inVertex;
  for (size_t i = 0; i < inCount; ++i)
  {
    inVertex = _inSubMesh->Vertex(i);
    cloud.pts[i].x = inVertex.X();
    cloud.pts[i].y = inVertex.Y();
    cloud.pts[i].z = inVertex.Z();
  }

  // construct a kd-tree index:
  typedef nanoflann::KDTreeSingleIndexAdaptor<
      nanoflann::L2_Simple_Adaptor<double, PointCloud<double> > ,
      PointCloud<double>,
      3
      > my_kd_tree_t;

  my_kd_tree_t cloudIndex(3, cloud,
      nanoflann::KDTreeSingleIndexAdaptorParams(10));
  cloudIndex.buildIndex();

  // For each vertex of each triangle
  unsigned int outTriIndexCount = _outSubMesh->GetIndexCount();
  const size_t num_results = 30;
  std::vector<size_t> result_index(num_results);
  std::vector<double> out_dist_sqr(num_results);
  static const int offset[] = {1,2,-1,1,-2,-1};
  for (int i = 0; i < outTriIndexCount; ++i)
  {
    unsigned int outIndex = _outSubMesh->GetIndex(i);
    ignition::math::Vector3d outVertex = _outSubMesh->Vertex(outIndex);

    const double query_pt[3] = { outVertex.X(), outVertex.Y(), outVertex.Z()};
    // Get nearest num_results
    cloudIndex.knnSearch(&query_pt[0], num_results, &result_index[0],
        &out_dist_sqr[0]);

    std::vector<size_t> closestIndices;
    double closestDistance = 1000;
    for (int j = 0; j < num_results; ++j)
    {
      inVertex = _inSubMesh->Vertex(result_index[j]);

      double distance = inVertex.Distance(outVertex);
      // closer vertex
      if (distance <  closestDistance)
      {
        closestDistance = distance;
        closestIndices.clear();
        closestIndices.push_back(result_index[j]);
      }
      // overlapping vertex
      else if (distance == closestDistance)
      {
        closestIndices.push_back(result_index[j]);
      }
    }

    // Choose best UV among overlapping closestIndices

    // index%3 == 0: beginning of a triangle
    // triangle 1: i == 0,1,2; triangle 2: i == 3,4,5 and so on
    ignition::math::Vector2d outOffset(i+offset[(i % 3)*2],
                                       i+offset[(i % 3)*2+1]);
    // Get other vertices in the same triangle
    unsigned int outIndex_1 = _outSubMesh->GetIndex(outOffset.X());
    unsigned int outIndex_2 = _outSubMesh->GetIndex(outOffset.Y());
    ignition::math::Vector3d outVertex_1 = _outSubMesh->Vertex(outIndex_1);
    ignition::math::Vector3d outVertex_2 = _outSubMesh->Vertex(outIndex_2);

    // Get directions
    ignition::math::Vector3d outDir_1 = (outVertex_1-outVertex).Normalize();
    ignition::math::Vector3d outDir_2 = (outVertex_2-outVertex).Normalize();

    // Initialize closestVertex
    size_t closestIndex = closestIndices[0];
    ignition::math::Vector2d
        closestOffset(closestIndex+offset[(closestIndex % 3)*2],
                      closestIndex+offset[(closestIndex % 3)*2+1]);

    ignition::math::Vector3d closestVertex =
        _inSubMesh->Vertex(closestIndex);
    ignition::math::Vector3d closestVertex_1 =
        _inSubMesh->Vertex(closestOffset.X());
    ignition::math::Vector3d closestVertex_2 =
        _inSubMesh->Vertex(closestOffset.Y());

    ignition::math::Vector3d closestDir_1 =
        (closestVertex_1-closestVertex).Normalize();
    ignition::math::Vector3d closestDir_2 =
        (closestVertex_2-closestVertex).Normalize();

    // Initialize sum of closest directions
    double closestSum;
    if (outDir_1.Distance(closestDir_1) < outDir_1.Distance(closestDir_2))
    {
      closestSum = outDir_1.Distance(closestDir_1) +
                   outDir_2.Distance(closestDir_2);
    }
    else
    {
      closestSum = outDir_2.Distance(closestDir_1) +
                   outDir_1.Distance(closestDir_2);
    }

    // Find the closest direction among all triangles containing overlapping
    // vertices
    for (int k = 1; k < closestIndices.size(); ++k)
    {
      // Current vertex
      size_t currentIndex = closestIndices[k];
      ignition::math::Vector2d
          currentOffset(currentIndex+offset[(currentIndex % 3)*2],
                        currentIndex+offset[(currentIndex % 3)*2+1]);

      ignition::math::Vector3d currentVertex =
          _inSubMesh->Vertex(currentIndex);
      ignition::math::Vector3d currentVertex_1 =
          _inSubMesh->Vertex(currentOffset.X());
      ignition::math::Vector3d currentVertex_2 =
          _inSubMesh->Vertex(currentOffset.Y());

      ignition::math::Vector3d currentDir_1 =
          (currentVertex_1-currentVertex).Normalize();
      ignition::math::Vector3d currentDir_2 =
          (currentVertex_2-currentVertex).Normalize();

      double currentSum;
      if (outDir_1.Distance(currentDir_1) < outDir_1.Distance(currentDir_2))
      {
        currentSum = outDir_1.Distance(currentDir_1) +
                     outDir_2.Distance(currentDir_2);
      }
      else
      {
        currentSum = outDir_2.Distance(currentDir_1) +
                     outDir_1.Distance(currentDir_2);
      }

      if (currentSum < closestSum)
      {
        closestSum = currentSum;
        closestIndex = currentIndex;
        closestDir_1 = currentDir_1;
        closestDir_2 = currentDir_2;
        closestVertex = currentVertex;
      }
    }

    // Get UV coordinates
    double U = _inSubMesh->TexCoord(closestIndex).X();
    double V = _inSubMesh->TexCoord(closestIndex).Y();

    fillData << U << " " << 1.0-V << " ";
  }

  std::cout << "Texture map calculation complete." << std::endl;

  snprintf(sourceId, sizeof(sourceId), "%s-UVMap", _meshID);
  unsigned int outCount = _outSubMesh->GetVertexCount();
  int stride = 2;

  TiXmlElement *sourceXml = new TiXmlElement("source");
  _meshXml->LinkEndChild(sourceXml);
  sourceXml->SetAttribute("id", sourceId);
  sourceXml->SetAttribute("name", sourceId);

  snprintf(sourceArrayId, sizeof(sourceArrayId), "%s-array", sourceId);
  TiXmlElement *floatArrayXml = new TiXmlElement("float_array");
  floatArrayXml->SetAttribute("count", outCount *stride);
  floatArrayXml->SetAttribute("id", sourceArrayId);
  floatArrayXml->LinkEndChild(new TiXmlText(fillData.str().c_str()));
  sourceXml->LinkEndChild(floatArrayXml);

  TiXmlElement *techniqueCommonXml = new TiXmlElement("technique_common");
  sourceXml->LinkEndChild(techniqueCommonXml);

  snprintf(sourceArrayId, sizeof(sourceArrayId), "#%s-array", sourceId);
  TiXmlElement *accessorXml = new TiXmlElement("accessor");
  accessorXml->SetAttribute("count", outCount);
  accessorXml->SetAttribute("source", sourceArrayId);
  accessorXml->SetAttribute("stride", stride);
  techniqueCommonXml->LinkEndChild(accessorXml);

  TiXmlElement *paramXml = new TiXmlElement("param");

  paramXml->SetAttribute("type", "float");
  paramXml->SetAttribute("name", "U");
  accessorXml->LinkEndChild(paramXml);

  paramXml = new TiXmlElement("param");
  paramXml->SetAttribute("type", "float");
  paramXml->SetAttribute("name", "V");
  accessorXml->LinkEndChild(paramXml);
}

//////////////////////////////////////////////////
/// \brief Export geometry source, used by ExportGeometries/ConvertGztoDae
/// \param[in] _subMesh Pointer to a submesh
/// \param[in] _meshXml Pointer to the mesh XML instance
/// \param[in] _type POSITION, NORMAL or UVMAP
/// \param[in] _meshID Mesh ID (mesh_<number>)
void ExportGeometrySource(const gazebo::common::SubMesh *_subMesh,
    TiXmlElement *_meshXml, GeometryType _type, const char *_meshID)
{
  char sourceId[100], sourceArrayId[100];
  std::ostringstream fillData;
  fillData.precision(8);
  fillData << std::fixed;
  int stride;
  unsigned int count = 0;

  if (_type == POSITION)
  {
    snprintf(sourceId, sizeof(sourceId), "%s-Positions", _meshID);
    count = _subMesh->GetVertexCount();
    stride = 3;
    ignition::math::Vector3d vertex;
    for (unsigned int i = 0; i < count; ++i)
    {
      vertex = _subMesh->Vertex(i);
      fillData << vertex.X() << " " << vertex.Y() << " " << vertex.Z() << " ";
    }
  }
  if (_type == NORMAL)
  {
    snprintf(sourceId, sizeof(sourceId), "%s-Normals", _meshID);
    count = _subMesh->GetNormalCount();
    stride = 3;
    ignition::math::Vector3d normal;
    for (unsigned int i = 0; i < count; ++i)
    {
      normal = _subMesh->Normal(i);
      fillData << normal.X() << " " << normal.Y() << " " << normal.Z() << " ";
    }
  }

  TiXmlElement *sourceXml = new TiXmlElement("source");
  _meshXml->LinkEndChild(sourceXml);
  sourceXml->SetAttribute("id", sourceId);
  sourceXml->SetAttribute("name", sourceId);

  snprintf(sourceArrayId, sizeof(sourceArrayId), "%s-array", sourceId);
  TiXmlElement *floatArrayXml = new TiXmlElement("float_array");
  floatArrayXml->SetAttribute("count", count *stride);
  floatArrayXml->SetAttribute("id", sourceArrayId);
  floatArrayXml->LinkEndChild(new TiXmlText(fillData.str().c_str()));
  sourceXml->LinkEndChild(floatArrayXml);

  TiXmlElement *techniqueCommonXml = new TiXmlElement("technique_common");
  sourceXml->LinkEndChild(techniqueCommonXml);

  snprintf(sourceArrayId, sizeof(sourceArrayId), "#%s-array", sourceId);
  TiXmlElement *accessorXml = new TiXmlElement("accessor");
  accessorXml->SetAttribute("count", count);
  accessorXml->SetAttribute("source", sourceArrayId);
  accessorXml->SetAttribute("stride", stride);
  techniqueCommonXml->LinkEndChild(accessorXml);

  TiXmlElement *paramXml = new TiXmlElement("param");
  if (_type == POSITION || _type == NORMAL)
  {
    paramXml->SetAttribute("type", "float");
    paramXml->SetAttribute("name", "X");
    accessorXml->LinkEndChild(paramXml);

    paramXml = new TiXmlElement("param");
    paramXml->SetAttribute("type", "float");
    paramXml->SetAttribute("name", "Y");
    accessorXml->LinkEndChild(paramXml);

    paramXml = new TiXmlElement("param");
    paramXml->SetAttribute("type", "float");
    paramXml->SetAttribute("name", "Z");
    accessorXml->LinkEndChild(paramXml);
  }
}

//////////////////////////////////////////////////
/// \brief Export scene element, used by ConvertGzToDae
/// \param[in] _sceneXml Pointer to the scene XML instance
void ExportScene(TiXmlElement *_sceneXml)
{
  TiXmlElement *instanceVisualSceneXml =
      new TiXmlElement("instance_visual_scene");
  _sceneXml->LinkEndChild(instanceVisualSceneXml);
  instanceVisualSceneXml->SetAttribute("url", "#Scene");
}

//////////////////////////////////////////////////
/// \brief Export library visual scenes element, used by ConvertGzToDae
/// \param[in] _libraryVisualScenesXml Pointer to the library visual
/// scenes XML instance
/// \param[in] _mesh Output Gazebo mesh
void ExportVisualScenes(TiXmlElement *_libraryVisualScenesXml,
    const gazebo::common::Mesh *_mesh)
{
  unsigned int subMeshCount =  _mesh->GetSubMeshCount();

  TiXmlElement *visualSceneXml = new TiXmlElement("visual_scene");
  _libraryVisualScenesXml->LinkEndChild(visualSceneXml);
  visualSceneXml->SetAttribute("name", "Scene");
  visualSceneXml->SetAttribute("id", "Scene");

  TiXmlElement *nodeXml = new TiXmlElement("node");
  visualSceneXml->LinkEndChild(nodeXml);
  nodeXml->SetAttribute("name", "node");
  nodeXml->SetAttribute("id", "node");

  for (unsigned int i = 0; i < subMeshCount; ++i)
  {
    char meshId[100], materialId[100], attributeValue[100];
    snprintf(meshId, sizeof(meshId), "mesh_%u", i);
    snprintf(materialId, sizeof(materialId), "material_%u", i);

    TiXmlElement *instanceGeometryXml = new TiXmlElement("instance_geometry");
    nodeXml->LinkEndChild(instanceGeometryXml);
    snprintf(attributeValue, sizeof(attributeValue), "#%s", meshId);
    instanceGeometryXml->SetAttribute("url", attributeValue);

    const gazebo::common::Material *material =
        _mesh->GetMaterial(i);

    if (material)
    {
      TiXmlElement *bindMaterialXml = new TiXmlElement("bind_material");
      instanceGeometryXml->LinkEndChild(bindMaterialXml);

      TiXmlElement *techniqueCommonXml = new TiXmlElement("technique_common");
      bindMaterialXml->LinkEndChild(techniqueCommonXml);

      TiXmlElement *instanceMaterialXml =
          new TiXmlElement("instance_material");
      techniqueCommonXml->LinkEndChild(instanceMaterialXml);
      instanceMaterialXml->SetAttribute("symbol", materialId);
      snprintf(attributeValue, sizeof(attributeValue), "#%s", materialId);
      instanceMaterialXml->SetAttribute("target", attributeValue);

      std::string imageString = material->GetTextureImage();

      if (imageString.find("meshes/") != std::string::npos)
      {
        TiXmlElement *bindVertexInputXml =
            new TiXmlElement("bind_vertex_input");
        instanceMaterialXml->LinkEndChild(bindVertexInputXml);
        bindVertexInputXml->SetAttribute("semantic", "UVSET0");
        bindVertexInputXml->SetAttribute("input_semantic", "TEXCOORD");
      }
    }
  }
}

//////////////////////////////////////////////////
/// \brief Export library effects element, used by ConvertGzToDae
/// \param[in] _libraryEffectsXml Pointer to the library effects XML
/// instance
/// \param[in] _mesh Output Gazebo mesh
void ExportEffects(TiXmlElement *_libraryEffectsXml,
    const gazebo::common::Mesh *_mesh)
{
  unsigned int materialCount =  _mesh->GetMaterialCount();

  for (unsigned int i = 0; i < materialCount; ++i)
  {
    char id[100];
    snprintf(id, sizeof(id), "material_%u_fx", i);

    TiXmlElement *effectXml = new TiXmlElement("effect");
    effectXml->SetAttribute("id", id);
    _libraryEffectsXml->LinkEndChild(effectXml);

    TiXmlElement *profileCommonXml = new TiXmlElement("profile_COMMON");
    effectXml->LinkEndChild(profileCommonXml);

    // Image
    const gazebo::common::Material *material =
        _mesh->GetMaterial(i);
    std::string imageString = material->GetTextureImage();

    if (imageString.find("meshes/") != std::string::npos)
    {
      TiXmlElement *newParamXml = new TiXmlElement("newparam");
      snprintf(id, sizeof(id), "image_%u_surface", i);
      newParamXml->SetAttribute("sid", id);
      profileCommonXml->LinkEndChild(newParamXml);

      TiXmlElement *surfaceXml = new TiXmlElement("surface");
      surfaceXml->SetAttribute("type", "2D");
      newParamXml->LinkEndChild(surfaceXml);

      TiXmlElement *initFromXml = new TiXmlElement("init_from");
      snprintf(id, sizeof(id), "image_%u", i);
      initFromXml->LinkEndChild(new TiXmlText(id));
      surfaceXml->LinkEndChild(initFromXml);

      newParamXml = new TiXmlElement("newparam");
      snprintf(id, sizeof(id), "image_%u_sampler", i);
      newParamXml->SetAttribute("sid", id);
      profileCommonXml->LinkEndChild(newParamXml);

      TiXmlElement *sampler2dXml = new TiXmlElement("sampler2D");
      newParamXml->LinkEndChild(sampler2dXml);

      TiXmlElement *sourceXml = new TiXmlElement("source");
      snprintf(id, sizeof(id), "image_%u_surface", i);
      sourceXml->LinkEndChild(new TiXmlText(id));
      sampler2dXml->LinkEndChild(sourceXml);

      TiXmlElement *minFilterXml = new TiXmlElement("minfilter");
      minFilterXml->LinkEndChild(new TiXmlText("LINEAR"));
      sampler2dXml->LinkEndChild(minFilterXml);

      TiXmlElement *magFilterXml = new TiXmlElement("magfilter");
      magFilterXml->LinkEndChild(new TiXmlText("LINEAR"));
      sampler2dXml->LinkEndChild(magFilterXml);
    }

    TiXmlElement *techniqueXml = new TiXmlElement("technique");
    techniqueXml->SetAttribute("sid", "COMMON");
    profileCommonXml->LinkEndChild(techniqueXml);

    // gazebo::common::Material::ShadeMode shadeMode =
    //    material->GetShadeMode();

    // Using phong for now
    TiXmlElement *phongXml = new TiXmlElement("phong");
    techniqueXml->LinkEndChild(phongXml);

    // ambient
#if GAZEBO_MAJOR_VERSION >= 9
    unsigned int RGBAcolor = material->Ambient().AsRGBA();
#else
    unsigned int RGBAcolor = material->GetAmbient().GetAsRGBA();
#endif
    float r = ((RGBAcolor >> 24) & 0xFF) / 255.0f;
    float g = ((RGBAcolor >> 16) & 0xFF) / 255.0f;
    float b = ((RGBAcolor >> 8) & 0xFF) / 255.0f;
    float a = (RGBAcolor & 0xFF) / 255.0f;

    TiXmlElement *ambientXml = new TiXmlElement("ambient");
    phongXml->LinkEndChild(ambientXml);

    TiXmlElement *colorXml = new TiXmlElement("color");
    snprintf(id, sizeof(id), "%f %f %f %f", r, g, b, a);
    colorXml->LinkEndChild(new TiXmlText(id));
    ambientXml->LinkEndChild(colorXml);

    // emission
#if GAZEBO_MAJOR_VERSION >= 9
    RGBAcolor = material->Emissive().AsRGBA();
#else
    RGBAcolor = material->GetEmissive().GetAsRGBA();
#endif
    r = ((RGBAcolor >> 24) & 0xFF) / 255.0f;
    g = ((RGBAcolor >> 16) & 0xFF) / 255.0f;
    b = ((RGBAcolor >> 8) & 0xFF) / 255.0f;
    a = (RGBAcolor & 0xFF) / 255.0f;

    TiXmlElement *emissionXml = new TiXmlElement("emission");
    phongXml->LinkEndChild(emissionXml);

    colorXml = new TiXmlElement("color");
    snprintf(id, sizeof(id), "%f %f %f %f", r, g, b, a);
    colorXml->LinkEndChild(new TiXmlText(id));
    emissionXml->LinkEndChild(colorXml);

    // diffuse
    TiXmlElement *diffuseXml = new TiXmlElement("diffuse");
    phongXml->LinkEndChild(diffuseXml);

    if (imageString.find("meshes/") != std::string::npos)
    {
      TiXmlElement *textureXml = new TiXmlElement("texture");
      snprintf(id, sizeof(id), "image_%u", i);
      textureXml->SetAttribute("texture", id);
      textureXml->SetAttribute("texcoord", "UVSET0");
      diffuseXml->LinkEndChild(textureXml);
    }
    else
    {
#if GAZEBO_MAJOR_VERSION >= 9
      RGBAcolor = material->Diffuse().AsRGBA();
#else
      RGBAcolor = material->GetDiffuse().GetAsRGBA();
#endif
      r = ((RGBAcolor >> 24) & 0xFF) / 255.0f;
      g = ((RGBAcolor >> 16) & 0xFF) / 255.0f;
      b = ((RGBAcolor >> 8) & 0xFF) / 255.0f;
      a = (RGBAcolor & 0xFF) / 255.0f;

      colorXml = new TiXmlElement("color");
      snprintf(id, sizeof(id), "%f %f %f %f", r, g, b, a);
      colorXml->LinkEndChild(new TiXmlText(id));
      diffuseXml->LinkEndChild(colorXml);
    }

    // specular
#if GAZEBO_MAJOR_VERSION >= 9
    RGBAcolor = material->Specular().AsRGBA();
#else
    RGBAcolor = material->GetSpecular().GetAsRGBA();
#endif
    r = ((RGBAcolor >> 24) & 0xFF) / 255.0f;
    g = ((RGBAcolor >> 16) & 0xFF) / 255.0f;
    b = ((RGBAcolor >> 8) & 0xFF) / 255.0f;
    a = (RGBAcolor & 0xFF) / 255.0f;

    TiXmlElement *specularXml = new TiXmlElement("specular");
    phongXml->LinkEndChild(specularXml);

    colorXml = new TiXmlElement("color");
    snprintf(id, sizeof(id), "%f %f %f %f", r, g, b, a);
    colorXml->LinkEndChild(new TiXmlText(id));
    specularXml->LinkEndChild(colorXml);

    // transparency
    double transp = material->GetTransparency();

    TiXmlElement *transparencyXml = new TiXmlElement("transparency");
    phongXml->LinkEndChild(transparencyXml);

    TiXmlElement *floatXml = new TiXmlElement("float");
    snprintf(id, sizeof(id), "%f", transp);
    floatXml->LinkEndChild(new TiXmlText(id));
    transparencyXml->LinkEndChild(floatXml);

    // shininess
    double shine = material->GetShininess();

    TiXmlElement *shininessXml = new TiXmlElement("shininess");
    phongXml->LinkEndChild(shininessXml);

    colorXml = new TiXmlElement("color");
    snprintf(id, sizeof(id), "%f", shine);
    colorXml->LinkEndChild(new TiXmlText(id));
    shininessXml->LinkEndChild(colorXml);
  }
}

//////////////////////////////////////////////////
/// \brief Export library materials element, used by ConvertGzToDae
/// \param[in] _libraryMaterialsXml Pointer to the library materials XML
/// instance
/// \param[in] _mesh Output Gazebo mesh
void ExportMaterials(TiXmlElement *_libraryMaterialsXml,
    const gazebo::common::Mesh *_mesh)
{
  unsigned int materialCount =  _mesh->GetMaterialCount();

  for (unsigned int i = 0; i < materialCount; ++i)
  {
    char id[100];
    snprintf(id, sizeof(id), "material_%u", i);

    TiXmlElement *materialXml = new TiXmlElement("material");
    materialXml->SetAttribute("id", id);
    _libraryMaterialsXml->LinkEndChild(materialXml);

    snprintf(id, sizeof(id), "#material_%u_fx", i);
    TiXmlElement *instanceEffectXml = new TiXmlElement("instance_effect");
    instanceEffectXml->SetAttribute("url", id);
    materialXml->LinkEndChild(instanceEffectXml);
  }
}

//////////////////////////////////////////////////
/// \brief Export library images element, used by ConvertGzToDae
/// \param[in] _libraryImagesXml Pointer to the library images XML
/// instance
/// \param[in] _mesh Output Gazebo mesh
/// \return integer, number of images
int ExportImages(TiXmlElement *_libraryImagesXml,
    const gazebo::common::Mesh *_mesh)
{
  unsigned int materialCount =  _mesh->GetMaterialCount();

  int imageCount = 0;
  for (unsigned int i = 0; i < materialCount; ++i)
  {
    const gazebo::common::Material *material =
        _mesh->GetMaterial(i);
    std::string imageString = material->GetTextureImage();

    if (imageString.find("meshes/") != std::string::npos)
    {
      char id[100];
      snprintf(id, sizeof(id), "image_%u", i);

      TiXmlElement *imageXml = new TiXmlElement("image");
      imageXml->SetAttribute("id", id);
      _libraryImagesXml->LinkEndChild(imageXml);

      TiXmlElement *initFromXml = new TiXmlElement("init_from");
      initFromXml->LinkEndChild(new TiXmlText(
        imageString.substr(imageString.find(".."))));
      imageXml->LinkEndChild(initFromXml);

      imageCount++;
    }
  }

  return imageCount;
}

//////////////////////////////////////////////////
/// \brief Export library geometries element, used by ConvertGzToDae
/// \param[in] libraryGeometriesXml Pointer to the library geometries
/// XML instance
/// \param[in] _outMesh Output Gazebo mesh
/// \param[in] _inMesh Input Gazebo mesh
void ExportGeometries(TiXmlElement *_libraryGeometriesXml,
    const gazebo::common::Mesh *_outMesh,
    const gazebo::common::Mesh *_inMesh)
{
  unsigned int subMeshCount =  _outMesh->GetSubMeshCount();
  unsigned int materialCount =  _outMesh->GetMaterialCount();

  for (unsigned int i = 0; i < subMeshCount; ++i)
  {
    char meshId[100], materialId[100];
    snprintf(meshId, sizeof(meshId), "mesh_%u", i);
    snprintf(materialId, sizeof(materialId), "material_%u", i);

    TiXmlElement *geometryXml = new TiXmlElement("geometry");
    geometryXml->SetAttribute("id", meshId);
    _libraryGeometriesXml->LinkEndChild(geometryXml);

    TiXmlElement *meshXml = new TiXmlElement("mesh");
    geometryXml->LinkEndChild(meshXml);

    const gazebo::common::SubMesh *outSubMesh =
        _outMesh->GetSubMesh(i);
    const gazebo::common::SubMesh *inSubMesh =
        _inMesh->GetSubMesh(i);

    ExportGeometrySource(outSubMesh, meshXml, POSITION, meshId);
    ExportGeometrySource(outSubMesh, meshXml, NORMAL, meshId);
    if (materialCount != 0)
    {
      // Diff from ColladaExporter
      // ExportGeometrySource(outSubMesh, meshXml, UVMAP, meshId);
      ExportTextureSource(outSubMesh, inSubMesh, meshXml, meshId);
    }

    char attributeValue[100];

    TiXmlElement *verticesXml = new TiXmlElement("vertices");
    meshXml->LinkEndChild(verticesXml);
    snprintf(attributeValue, sizeof(attributeValue), "%s-Vertex", meshId);
    verticesXml->SetAttribute("id", attributeValue);
    verticesXml->SetAttribute("name", attributeValue);

    TiXmlElement *inputXml = new TiXmlElement("input");
    verticesXml->LinkEndChild(inputXml);
    inputXml->SetAttribute("semantic", "POSITION");
    snprintf(attributeValue, sizeof(attributeValue), "#%s-Positions", meshId);
    inputXml->SetAttribute("source", attributeValue);

    unsigned int indexCount = outSubMesh->GetIndexCount();

    TiXmlElement *trianglesXml = new TiXmlElement("triangles");
    meshXml->LinkEndChild(trianglesXml);
    trianglesXml->SetAttribute("count", indexCount/3);
    if (materialCount != 0)
    {
      trianglesXml->SetAttribute("material", materialId);
    }

    inputXml = new TiXmlElement("input");
    trianglesXml->LinkEndChild(inputXml);
    inputXml->SetAttribute("offset", 0);
    inputXml->SetAttribute("semantic", "VERTEX");
    snprintf(attributeValue, sizeof(attributeValue), "#%s-Vertex", meshId);
    inputXml->SetAttribute("source", attributeValue);

    inputXml = new TiXmlElement("input");
    trianglesXml->LinkEndChild(inputXml);
    inputXml->SetAttribute("offset", 1);
    inputXml->SetAttribute("semantic", "NORMAL");
    snprintf(attributeValue, sizeof(attributeValue), "#%s-Normals", meshId);
    inputXml->SetAttribute("source", attributeValue);

    if (materialCount != 0)
    {
      inputXml = new TiXmlElement("input");
      trianglesXml->LinkEndChild(inputXml);
      inputXml->SetAttribute("offset", 2);
      inputXml->SetAttribute("semantic", "TEXCOORD");
      snprintf(attributeValue, sizeof(attributeValue), "#%s-UVMap", meshId);
      inputXml->SetAttribute("source", attributeValue);
    }

    std::ostringstream fillData;
    for (unsigned int j = 0; j < indexCount; ++j)
    {
      fillData << outSubMesh->GetIndex(j) << " "
               << outSubMesh->GetIndex(j) << " ";
      if (materialCount != 0)
      {
        // Diff from ColladaExporter
        // fillData << outSubMesh->GetIndex(j) << " ";
        fillData << j << " ";
      }
    }

    TiXmlElement *pXml = new TiXmlElement("p");
    trianglesXml->LinkEndChild(pXml);
    pXml->LinkEndChild(new TiXmlText(fillData.str().c_str()));
  }
}

//////////////////////////////////////////////////
/// \brief Export asset element, used by ConvertGzToDae
/// \param[in] _assetXml Pointer to the asset XML instance
void ExportAsset(TiXmlElement *_assetXml)
{
  TiXmlElement *unitXml = new TiXmlElement("unit");
  unitXml->SetAttribute("meter", "1");
  unitXml->SetAttribute("name", "meter");
  _assetXml->LinkEndChild(unitXml);

  TiXmlElement *upAxisXml = new TiXmlElement("up_axis");
  upAxisXml->LinkEndChild(new TiXmlText("Z_UP"));
  _assetXml->LinkEndChild(upAxisXml);
}

//////////////////////////////////////////////////
/// \brief Convert Gazebo mesh to Collada XML Document
/// \param[in] _inGz Input Gazebo mesh
/// \param[in] _outGz Output Gazebo mesh
/// \return Collada XML Document
TiXmlDocument ConvertGzToDae(const gazebo::common::Mesh *_inGz,
    const gazebo::common::Mesh *_outGz)
{
  unsigned int materialCount = _outGz->GetMaterialCount();

  // Input and output collada files
  TiXmlDocument outDae;

  // XML declaration
  TiXmlDeclaration *declarationXml = new TiXmlDeclaration("1.0", "utf-8", "");
  outDae.LinkEndChild(declarationXml);

  // Collada element
  TiXmlElement *colladaXml = new TiXmlElement("COLLADA");
  outDae.LinkEndChild(colladaXml);
  colladaXml->SetAttribute("version", "1.4.1");
  colladaXml->SetAttribute("xmlns",
      "http://www.collada.org/2005/11/COLLADASchema");

  // Asset element
  TiXmlElement *assetXml = new TiXmlElement("asset");
  ExportAsset(assetXml);
  colladaXml->LinkEndChild(assetXml);

  // Library geometries element
  TiXmlElement *libraryGeometriesXml = new TiXmlElement("library_geometries");
  ExportGeometries(libraryGeometriesXml, _outGz, _inGz);
  colladaXml->LinkEndChild(libraryGeometriesXml);

  if (materialCount != 0)
  {
    // Library images element
    TiXmlElement *libraryImagesXml = new TiXmlElement("library_images");
    int imageCount = ExportImages(libraryImagesXml, _outGz);
    if (imageCount != 0)
    {
      colladaXml->LinkEndChild(libraryImagesXml);
    }

    // Library materials element
    TiXmlElement *libraryMaterialsXml = new TiXmlElement("library_materials");
    ExportMaterials(libraryMaterialsXml, _outGz);
    colladaXml->LinkEndChild(libraryMaterialsXml);

    // Library effects element
    TiXmlElement *libraryEffectsXml = new TiXmlElement("library_effects");
    ExportEffects(libraryEffectsXml, _outGz);
    colladaXml->LinkEndChild(libraryEffectsXml);
  }

  // Library visual scenes element
  TiXmlElement *libraryVisualScenesXml =
      new TiXmlElement("library_visual_scenes");
  ExportVisualScenes(libraryVisualScenesXml, _outGz);
  colladaXml->LinkEndChild(libraryVisualScenesXml);

  // Scene element
  TiXmlElement *sceneXml = new TiXmlElement("scene");
  ExportScene(sceneXml);
  colladaXml->LinkEndChild(sceneXml);

  return(outDae);
}

//////////////////////////////////////////////////
/// \brief Fill Gazebo SubMesh's faces, used by ConvertGtsToGz
/// \param[in] _t Pointer to GTS triangle
/// \param[in] _data Pointer to data: Gazebo SubMesh, index, GHashTable
void FillFace(GtsTriangle *_t, gpointer *_data)
{
  gazebo::common::SubMesh *subMesh =
      reinterpret_cast<gazebo::common::SubMesh *>(_data[0]);
  GHashTable*vIndex = reinterpret_cast<GHashTable *>(_data[2]);

  GtsVertex *v1, *v2, *v3;
  gts_triangle_vertices(_t, &v1, &v2, &v3);

  subMesh->AddIndex(GPOINTER_TO_UINT(g_hash_table_lookup(vIndex, v1)));
  subMesh->AddIndex(GPOINTER_TO_UINT(g_hash_table_lookup(vIndex, v2)));
  subMesh->AddIndex(GPOINTER_TO_UINT(g_hash_table_lookup(vIndex, v3)));
}

//////////////////////////////////////////////////
/// \brief Fill Gazebo SubMesh's vertices, used by ConvertGtsToGz
/// \param[in] _p Pointer to GTS point (vertex)
/// \param[in] _data Pointer to data: Gazebo SubMesh, index, GHashTable
void FillVertex(GtsPoint *_p, gpointer *_data)
{
  // create a Gazebo vertex from GTS_POINT and add it to the submesh
  gazebo::common::SubMesh *subMesh =
      reinterpret_cast<gazebo::common::SubMesh *>(_data[0]);
  GHashTable*vIndex = reinterpret_cast<GHashTable *>(_data[2]);
  subMesh->AddVertex(GTS_POINT(_p)->x, GTS_POINT(_p)->y, GTS_POINT(_p)->z);

  // add the normals, they are not correct now, but will be recalculated later
  subMesh->AddNormal(0, 0, 1);

  // fill the hash table which will later be used for adding indices to the
  // submesh in the FillFace function.
  g_hash_table_insert(vIndex, _p,
      GUINT_TO_POINTER((*(reinterpret_cast<guint *>(_data[1])))++));
}

//////////////////////////////////////////////////
/// \brief Convert GTS surface to Gazebo SubMesh
/// \param[in] _surface Pointer to GTS surface
/// \param[in] _subMesh Pointer to Gazebo SubMesh
void ConvertGtsToGz(GtsSurface *_surface, gazebo::common::SubMesh *_subMesh)
{
  unsigned int n;
  gpointer data[3];
  GHashTable *vIndex = g_hash_table_new(NULL, NULL);

  n = 0;
  data[0] = _subMesh;
  data[1] = &n;
  data[2] = vIndex;
  n = 0;
  gts_surface_foreach_vertex(_surface, (GtsFunc)FillVertex, data);
  n = 0;
  gts_surface_foreach_face(_surface, (GtsFunc)FillFace, data);
  g_hash_table_destroy(vIndex);
}

/////////////////////////////////////////////////
/// \brief Coarsen GTS mesh
/// \param[in] _inOutGts Pointer to GTS surface
/// \param[in] _desiredPercentage Desired percentage of edges
/// \return Success or failure
int CoarsenGts(GtsSurface *_inOutGts, double _desiredPercentage)
{
  // Number of edges
  guint edgesBefore = gts_surface_edge_number(_inOutGts);
  std::cout << "Edges before: " << edgesBefore << std::endl;

  if (edgesBefore < 300)
  {
    std::cout << "There are less than 300 edges. Not simplifying.\n";
    return -1;
  }

  // Default cost function COST_OPTIMIZED
  GtsKeyFunc cost_func = (GtsKeyFunc) gts_volume_optimized_cost;
  GtsVolumeOptimizedParams params = { 0.5, 0.5, 0. };
  gpointer cost_data = &params;

  // Default coarsen function OPTIMIZED
  GtsCoarsenFunc coarsen_func = (GtsCoarsenFunc) gts_volume_optimized_vertex;
  gpointer coarsen_data = &params;

  // Stop function STOP_NUMBER
  GtsStopFunc stop_func = (GtsStopFunc) gts_coarsen_stop_number;
  guint number = edgesBefore *_desiredPercentage/100;
  gpointer stop_data = &number;
  gdouble fold = PI/180.;

  // Coarsen
  gts_surface_coarsen (_inOutGts,
      cost_func,    cost_data,
      coarsen_func, coarsen_data,
      stop_func,    stop_data,
      fold);

  // Number of edges
  guint edgesAfter = gts_surface_edge_number(_inOutGts);
  double obtainedPercentage = (double)100*edgesAfter/edgesBefore;
  std::cout << "Edges after: " << edgesAfter << " ("
            << obtainedPercentage << "%)" << std::endl;

  if (obtainedPercentage > _desiredPercentage*1.5)
  {
    std::cout << "It wasn't possible to significantly reduce the mesh. "
              << "Not simplifying." << std::endl;
    return -1;
  }

  return 1;
}

//////////////////////////////////////////////////
/// \brief Merge vertices which are close together, used by ConvertGzToGts
/// \param[in] _vertices Pointer to vertices array
/// \param[in] _epsilon Maximum distance to merge
void MergeVertices(GPtrArray *_vertices, double _epsilon)
{
  GPtrArray *array;
  GNode *kdtree;
  GtsVertex **verticesData = reinterpret_cast<GtsVertex **>(_vertices->pdata);
  array = g_ptr_array_new();
  for (unsigned int i = 0; i < _vertices->len; ++i)
    g_ptr_array_add(array, verticesData[i]);
  kdtree = gts_kdtree_new(array, NULL);
  g_ptr_array_free(array, true);

  // for each vertex, do a bbox kdtree search to find nearby vertices within
  // _epsilon, merge vertices if they are within the bbox
  for (unsigned int i = 0; i < _vertices->len; ++i)
  {
    GtsVertex *v = reinterpret_cast<GtsVertex *>(verticesData[i]);

    // make sure vertex v is active (because they could be marked inactive
    // due to previous merge operation)
    if (!GTS_OBJECT (v)->reserved)
    {
      GtsBBox *bbox;
      GSList *selected, *j;

      // build bounding box
      bbox = gts_bbox_new(gts_bbox_class(),
          v,
          GTS_POINT(v)->x - _epsilon,
          GTS_POINT(v)->y - _epsilon,
          GTS_POINT(v)->z - _epsilon,
          GTS_POINT(v)->x + _epsilon,
          GTS_POINT(v)->y + _epsilon,
          GTS_POINT(v)->z + _epsilon);

      // select vertices which are inside bbox using kdtree
      j = selected = gts_kdtree_range(kdtree, bbox, NULL);
      while (j)
      {
        GtsVertex *sv = reinterpret_cast<GtsVertex *>(j->data);
        // mark sv as inactive (merged)
        if (sv != v && !GTS_OBJECT(sv)->reserved)
          GTS_OBJECT(sv)->reserved = v;
        j = j->next;
      }
      g_slist_free(selected);
      gts_object_destroy(GTS_OBJECT(bbox));
    }
  }

  gts_kdtree_destroy(kdtree);

  // destroy inactive vertices
  // we want to control vertex destruction
  gts_allow_floating_vertices = true;
  for (unsigned int i = 0; i < _vertices->len; ++i)
  {
    GtsVertex *v = reinterpret_cast<GtsVertex *>(verticesData[i]);
    // v is inactive
    if (GTS_OBJECT(v)->reserved)
    {
      verticesData[i] =
          reinterpret_cast<GtsVertex *>(GTS_OBJECT(v)->reserved);
      gts_object_destroy(GTS_OBJECT(v));
    }
  }
  gts_allow_floating_vertices = false;
}

//////////////////////////////////////////////////
/// \brief Convert Gazebo mesh to GTS mesh
/// \param[in] _subMesh Pointer to Gazebo SubMesh
/// \param[in] _surface Pointer to GTS surface
void ConvertGzToGts(const gazebo::common::SubMesh *_subMesh,
    GtsSurface *_surface)
{
  if (!_surface)
  {
    std::cout << ": Surface is NULL\n";
    return;
  }

  GtsSurface *subSurface = gts_surface_new(
    gts_surface_class(), gts_face_class(), gts_edge_class(),
    gts_vertex_class());

  unsigned int indexCount = _subMesh->GetIndexCount();
  if (_subMesh->GetVertexCount() <= 2)
    return;

  GPtrArray *vertices = g_ptr_array_new();
  for (unsigned int j = 0; j < _subMesh->GetVertexCount(); ++j)
  {
    ignition::math::Vector3d vertex = _subMesh->Vertex(j);
    g_ptr_array_add(vertices, gts_vertex_new(gts_vertex_class(), vertex.X(),
        vertex.Y(), vertex.Z()));
  }

  MergeVertices(vertices, 1e-7);

  GtsVertex **verticesData =
      reinterpret_cast<GtsVertex **>(vertices->pdata);
  for (unsigned int j = 0; j < indexCount/3; ++j)
  {
    // if vertices on the same GtsSegment, this segment. Else, NULL.
    GtsEdge *e1 = GTS_EDGE(gts_vertices_are_connected(
        verticesData[_subMesh->GetIndex(3*j)],
        verticesData[_subMesh->GetIndex(3*j+1)]));
    GtsEdge *e2 = GTS_EDGE(gts_vertices_are_connected(
        verticesData[_subMesh->GetIndex(3*j+1)],
        verticesData[_subMesh->GetIndex(3*j+2)]));
    GtsEdge *e3 = GTS_EDGE(gts_vertices_are_connected(
        verticesData[_subMesh->GetIndex(3*j+2)],
        verticesData[_subMesh->GetIndex(3*j)]));

    // If vertices are different and not connected
    if (e1 == NULL && verticesData[_subMesh->GetIndex(3*j)]
        != verticesData[_subMesh->GetIndex(3*j+1)])
    {
      e1 = gts_edge_new(subSurface->edge_class,
          verticesData[_subMesh->GetIndex(3*j)],
          verticesData[_subMesh->GetIndex(3*j+1)]);
    }
    if (e2 == NULL && verticesData[_subMesh->GetIndex(3*j+1)]
        != verticesData[_subMesh->GetIndex(3*j+2)])
    {
      e2 = gts_edge_new(subSurface->edge_class,
          verticesData[_subMesh->GetIndex(3*j+1)],
          verticesData[_subMesh->GetIndex(3*j+2)]);
    }
    if (e3 == NULL && verticesData[_subMesh->GetIndex(3*j+2)]
        != verticesData[_subMesh->GetIndex(3*j)])
    {
      e3 = gts_edge_new(subSurface->edge_class,
          verticesData[_subMesh->GetIndex(3*j+2)],
          verticesData[_subMesh->GetIndex(3*j)]);
    }

    // If all 3 edges are defined and different
    if (e1 != NULL && e2 != NULL && e3 != NULL &&
        e1 != e2 && e2 != e3 && e1 != e3)
    {
      if (GTS_SEGMENT (e1)->v1 == GTS_SEGMENT (e2)->v1)
      {
        if (!gts_segment_connect (GTS_SEGMENT (e3),
            GTS_SEGMENT (e1)->v2,
            GTS_SEGMENT (e2)->v2))
          continue;
      }
      else if (GTS_SEGMENT (e1)->v2 == GTS_SEGMENT (e2)->v1)
      {
        if (!gts_segment_connect (GTS_SEGMENT (e3),
            GTS_SEGMENT (e1)->v1,
            GTS_SEGMENT (e2)->v2))
          continue;
      }
      else if (GTS_SEGMENT (e1)->v2 == GTS_SEGMENT (e2)->v2)
      {
        if (!gts_segment_connect (GTS_SEGMENT (e3),
            GTS_SEGMENT (e1)->v1,
            GTS_SEGMENT (e2)->v1))
          continue;
      }
      else if (GTS_SEGMENT (e1)->v1 == GTS_SEGMENT (e2)->v2)
      {
        if (!gts_segment_connect (GTS_SEGMENT (e3),
            GTS_SEGMENT (e1)->v2,
            GTS_SEGMENT (e2)->v1))
          continue;
      }

      GtsFace *face = gts_face_new(subSurface->face_class, e1, e2, e3);
      if (!gts_triangle_is_duplicate(&face->triangle))
        gts_surface_add_face(subSurface, face);
    }
    else
    {
      std::cout << ": Ignoring degenerate facet!\n";
    }
  }
  gts_surface_merge(_surface, subSurface);
}

/////////////////////////////////////////////////
int main(int argc, char **argv)
{
  if (argc < 3)
  {
    std::cout << "Missing argument. Please specify a collada file and "
              << "the desired percentage of edges. For 20%, write 20."
              << std::endl;
    return -1;
  }
  if (atoi(argv[2]) < 0 || atoi(argv[2]) > 100)
  {
    std::cout << "The percentage must be between 0 and 100"
              << std::endl;
    return -1;
  }

  TiXmlDocument inDae(argv[1]);
  if (!inDae.LoadFile())
  {
    std::cout << "Could not open dae file." << std::endl;
    return -1;
  }

  std::string filename = argv[1];
  filename = filename.substr(0, filename.find(".dae"));

  double desiredPercentage = atoi (argv[2]);

  // COLLADA to GAZEBO
  gazebo::common::ColladaLoader loader;
  gazebo::common::Mesh *inGz = loader.Load(argv[1]);
/*
  // export original Gz mesh to Dae
  TiXmlDocument exportInDae;
  exportInDae = ConvertGzToDae(inGz,inGz);
  exportInDae.SaveFile(filename+"_original.dae");

  return 0;
*/

  gazebo::common::Mesh *outGz = new gazebo::common::Mesh();

  for (int s = 0; s < inGz->GetSubMeshCount(); ++s)
  {
    const gazebo::common::SubMesh *inSubMesh = inGz->GetSubMesh(s);

    // GAZEBO to GTS
    GtsSurface *inOutGts;
    inOutGts = gts_surface_new(gts_surface_class(), gts_face_class(),
        gts_edge_class(), gts_vertex_class());
    ConvertGzToGts(inSubMesh, inOutGts);

    // SIMPLIFICATION
    if (!CoarsenGts(inOutGts, desiredPercentage))
    {
      return -1;
    }

    // GTS to GAZEBO
    // Vertices:  inOutGts
    // Normals:   RecalculateNormals
    // TexCoords: none
    // Materials: inGz
    gazebo::common::SubMesh *outSubMesh = new gazebo::common::SubMesh();
    outGz->AddSubMesh(outSubMesh);
    ConvertGtsToGz(inOutGts, outSubMesh);

    gts_object_destroy(GTS_OBJECT(inOutGts));
  }

  // Calculate normals
  outGz->RecalculateNormals();

  // Add material
  for (unsigned int m = 0; m < inGz->GetMaterialCount(); ++m)
  {
    const gazebo::common::Material *inMaterial = inGz->GetMaterial(m);
    gazebo::common::Material *outMaterial = new gazebo::common::Material();

    outMaterial->SetTextureImage(inMaterial->GetTextureImage());
#if GAZEBO_MAJOR_VERSION >= 9
    outMaterial->SetAmbient(inMaterial->Ambient());
    outMaterial->SetDiffuse(inMaterial->Diffuse());
    outMaterial->SetSpecular(inMaterial->Specular());
    outMaterial->SetEmissive(inMaterial->Emissive());
#else
    outMaterial->SetAmbient(inMaterial->GetAmbient());
    outMaterial->SetDiffuse(inMaterial->GetDiffuse());
    outMaterial->SetSpecular(inMaterial->GetSpecular());
    outMaterial->SetEmissive(inMaterial->GetEmissive());
#endif
    outMaterial->SetTransparency(inMaterial->GetTransparency());
    outMaterial->SetShininess(inMaterial->GetShininess());

    outGz->AddMaterial(outMaterial);
  }


  // GAZEBO to COLLADA

//#if GAZEBO_MAJOR_VERSION < 4
// ConvertGzToDae is equal to ColladaExporter, except for ExportTextureSource,
// which uses Collada indexation for UV coordinates
  TiXmlDocument outDae;
  outDae = ConvertGzToDae(inGz, outGz);
  outDae.SaveFile(filename+"_coarse.dae");
//#else
//  outGz doesn't have texture coordinates, so this is incomplete
//  gazebo::common::MeshManager::Instance()->
//        Export(outGz, filename+"_coarse", "dae", false);
//#endif

  return 0;
}
