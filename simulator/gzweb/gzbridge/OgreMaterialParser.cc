#include <iostream>
#include <sstream>

#include "ConfigLoader.hh"
#include "OgreMaterialParser.hh"

using namespace gzweb;

/////////////////////////////////////////////////
OgreMaterialParser::OgreMaterialParser()
{
  this->configLoader = new ConfigLoader(".material");
}

/////////////////////////////////////////////////
OgreMaterialParser::~OgreMaterialParser()
{
  delete this->configLoader;
}

/////////////////////////////////////////////////
void OgreMaterialParser::Load(const std::string &_path)
{
  ConfigLoader::loadAllFiles(this->configLoader, _path);
}

/////////////////////////////////////////////////
std::string OgreMaterialParser::GetMaterialAsJson() const
{
  std::string jsonStr = "{";

  std::map<std::string, ConfigNode *> scripts =
      this->configLoader->getAllConfigScripts();

  std::map<std::string, ConfigNode *>::iterator it;
  bool first = true;
  for (it = scripts.begin(); it != scripts.end(); ++it)
  {
    std::string name = it->first;
    ConfigNode *node = it->second;

    ConfigNode *techniqueNode = node->findChild("technique");
    if (techniqueNode)
    {
      ConfigNode *passNode = techniqueNode->findChild("pass");
      if (passNode)
      {
        if (!first)
          jsonStr += ", ";
        else
          first = false;

        std::size_t index = name.rfind(" ");
        if (index != std::string::npos)
        {
          name = name.substr(index+1);
        }
        jsonStr += "\"" + name + "\":{";

        ConfigNode *ambientNode = passNode->findChild("ambient");
        if (ambientNode)
        {
          std::stringstream ss;
          std::vector<std::string> values = ambientNode->getValues();
          if (values.size() == 1)
            ss << "\"";
          for (unsigned int i = 0; i < values.size(); ++i)
          {
            std::string value = ambientNode->getValue(i);
            if (value[0] == '.')
              value = '0' + value;
            ss << value;
            if (i != values.size() - 1)
              ss << ",";
          }
          if (values.size() == 1)
            ss << "\"";
          jsonStr += "\"ambient\":[" + ss.str() + "],";
        }

        ConfigNode *diffuseNode = passNode->findChild("diffuse");
        if (diffuseNode)
        {
          std::stringstream ss;
          std::vector<std::string> values = diffuseNode->getValues();
          if (values.size() == 1)
            ss << "\"";
          for (unsigned int i = 0; i < values.size(); ++i)
          {
            std::string value = diffuseNode->getValue(i);
            if (value[0] == '.')
              value = '0' + value;
            ss << value;
            if (i != values.size() - 1)
              ss << ",";
          }
          if (values.size() == 1)
            ss << "\"";
          jsonStr += "\"diffuse\":[" + ss.str() + "],";
        }

        ConfigNode *specularNode = passNode->findChild("specular");
        if (specularNode)
        {
          std::stringstream ss;
          std::vector<std::string> values = specularNode->getValues();
          if (values.size() == 1)
            ss << "\"";
          for (unsigned int i = 0; i < values.size(); ++i)
          {
            std::string value = specularNode->getValue(i);
            if (value[0] == '.')
              value = '0' + value;
            ss << value;
            if (i != values.size() - 1)
              ss << ",";
          }
          if (values.size() == 1)
            ss << "\"";
          jsonStr += "\"specular\":[" + ss.str() + "],";
        }

        ConfigNode *depthWriteNode = passNode->findChild("depth_write");
        if (depthWriteNode)
        {
          std::stringstream ss;
          std::string depthWriteStr = depthWriteNode->getValue(0);
          if (depthWriteStr == "off")
            ss << "false";
          else
            ss << "true";
          jsonStr += "\"depth_write\":" + ss.str() + ",";
        }

        ConfigNode *depthCheckNode = passNode->findChild("depth_check");
        if (depthCheckNode)
        {
          std::stringstream ss;
          std::string depthCheckStr = depthCheckNode->getValue(0);
          if (depthCheckStr == "off")
            ss << "false";
          else
            ss << "true";
          jsonStr += "\"depth_check\":" + ss.str() + ",";
        }

        ConfigNode *textureUnitNode = passNode->findChild("texture_unit");
        if (textureUnitNode)
        {
          ConfigNode *textureNode = textureUnitNode->findChild("texture");
          if (textureNode)
          {
            std::string textureStr = textureNode->getValue(0);
            index = textureStr.rfind(".");
            if (index != std::string::npos)
            {
              textureStr = textureStr.substr(0, index+1) + "png";
            }

            jsonStr += "\"texture\":\"" + textureStr + "\",";
          }
          ConfigNode *scaleNode = textureUnitNode->findChild("scale");
          if (scaleNode)
          {
            std::stringstream ss;
            std::vector<std::string> values = scaleNode->getValues();
            if (values.size() == 1)
              ss << "\"";
            for (unsigned int i = 0; i < values.size(); ++i)
            {
              std::string value = scaleNode->getValue(i);
              if (value[0] == '.')
                value = '0' + value;
              ss << value;
              if (i != values.size() - 1)
                ss << ",";
            }
            if (values.size() == 1)
              ss << "\"";
            jsonStr += "\"scale\":[" + ss.str() + "],";
          }
          ConfigNode *alphaOpNode = textureUnitNode->findChild("alpha_op_ex");
          if (alphaOpNode)
          {
            std::stringstream ss;
            std::vector<std::string> values = alphaOpNode->getValues();
            // a bit hacky, just assuming there is an alpha value to use
            // fix this to support more ogre alpha operations.
            if (values[1] == "src_manual")
            {
              ss << values[3];
            }
            jsonStr += "\"opacity\":" + ss.str() + ",";
          }
        }
        if (jsonStr[jsonStr.size()-1] == ',')
        {
          jsonStr = jsonStr.substr(0, jsonStr.size()-1);
        }
        jsonStr += "}";
      }
    }

  }

  jsonStr += "}";

  // std::cout << jsonStr << std::endl;

  return jsonStr;
}
