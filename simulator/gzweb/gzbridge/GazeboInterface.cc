/*
 * Copyright 2013 Open Source Robotics Foundation
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

#include <gazebo/gazebo_config.h>

#include "pb2json.hh"
#include "OgreMaterialParser.hh"
#include "GazeboInterface.hh"

#define MAX_NUM_MSG_SIZE 1000

using namespace gzweb;

/////////////////////////////////////////////////
GazeboInterface::GazeboInterface()
{
  // Create our node for communication
  this->node.reset(new gazebo::transport::Node());
  this->node->Init();

  // Gazebo topics
  this->sensorTopic = "~/sensor";
  this->visualTopic = "~/visual";
  this->jointTopic = "~/joint";
  this->modelTopic = "~/model/info";
  this->poseTopic = "~/pose/info";
  this->requestTopic = "~/request";
  this->lightFactoryTopic = "~/factory/light";
  this->lightModifyTopic = "~/light/modify";
  this->linkTopic = "~/link";
  this->sceneTopic = "~/scene";
  this->physicsTopic = "~/physics";
  this->modelModifyTopic = "~/model/modify";
  this->factoryTopic = "~/factory";
  this->worldControlTopic = "~/world_control";
  this->statsTopic = "~/world_stats";
  this->roadTopic = "~/roads";
  this->heightmapService = "~/heightmap_data";
  this->deleteTopic = "~/entity_delete";
  this->playbackControlTopic = "~/playback_control";

  // material topic
  this->materialTopic = "~/material";

  this->sensorSub = this->node->Subscribe(this->sensorTopic,
      &GazeboInterface::OnSensorMsg, this, true);

  this->visSub = this->node->Subscribe(this->visualTopic,
      &GazeboInterface::OnVisualMsg, this);

  this->jointSub = this->node->Subscribe(this->jointTopic,
      &GazeboInterface::OnJointMsg, this);

  // For entity creation
  this->modelInfoSub = node->Subscribe(this->modelTopic,
      &GazeboInterface::OnModelMsg, this);

  // For entity update
  this->poseSub = this->node->Subscribe(this->poseTopic,
      &GazeboInterface::OnPoseMsg, this);

  // For entity delete coming from the server side
  this->requestSub = this->node->Subscribe(this->requestTopic,
      &GazeboInterface::OnRequest, this);

  // For lights
  this->lightFactorySub = this->node->Subscribe(this->lightFactoryTopic,
      &GazeboInterface::OnLightFactoryMsg, this);
  this->lightModifySub = this->node->Subscribe(this->lightModifyTopic,
      &GazeboInterface::OnLightModifyMsg, this);

  this->sceneSub = this->node->Subscribe(this->sceneTopic,
      &GazeboInterface::OnScene, this);

  this->physicsSub = this->node->Subscribe(this->physicsTopic,
      &GazeboInterface::OnPhysicsMsg, this);

  this->statsSub = this->node->Subscribe(this->statsTopic,
      &GazeboInterface::OnStats, this);

  this->roadSub = this->node->Subscribe(this->roadTopic,
      &GazeboInterface::OnRoad, this, true);

  // For getting scene info on connect
  this->requestPub =
      this->node->Advertise<gazebo::msgs::Request>(this->requestTopic);

  // For modifying models
  this->modelPub =
      this->node->Advertise<gazebo::msgs::Model>(this->modelModifyTopic);

  // For modifying lights
  this->lightModifyPub =
      this->node->Advertise<gazebo::msgs::Light>(this->lightModifyTopic);

  // For spawning models
  this->factoryPub =
      this->node->Advertise<gazebo::msgs::Factory>(this->factoryTopic);

  // For spawning lights
  this->lightFactoryPub =
      this->node->Advertise<gazebo::msgs::Light>(this->lightFactoryTopic);

  // For controlling world
  this->worldControlPub =
      this->node->Advertise<gazebo::msgs::WorldControl>(
      this->worldControlTopic);

  // For controlling playback
  this->playbackControlPub =
      this->node->Advertise<gazebo::msgs::LogPlaybackControl>(
      this->playbackControlTopic);


  this->responseSub = this->node->Subscribe("~/response",
      &GazeboInterface::OnResponse, this);

  this->materialParser = new OgreMaterialParser();

  this->lastPausedState = true;

  // message filtering apparatus
  this->minimumDistanceSquared = 0.0001;
  this->minimumQuaternionSquared = 0.0001;
  this->minimumMsgAge = 0.03;
  this->skippedMsgCount = 0;
  this->messageWindowSize = 10000;
  this->messageCount = 0;

  this->isConnected = false;
}

/////////////////////////////////////////////////
GazeboInterface::~GazeboInterface()
{
  this->Fini();
  this->node->Fini();

  this->modelMsgs.clear();
  this->poseMsgs.clear();
  this->requestMsgs.clear();
  this->lightFactoryMsgs.clear();
  this->lightModifyMsgs.clear();
  this->visualMsgs.clear();
  this->sceneMsgs.clear();
  this->physicsMsgs.clear();
  this->jointMsgs.clear();
  this->sensorMsgs.clear();

  this->sensorSub.reset();
  this->visSub.reset();
  this->lightFactorySub.reset();
  this->lightModifySub.reset();
  this->sceneSub.reset();
  this->jointSub.reset();
  this->modelInfoSub.reset();
  this->requestPub.reset();
  this->modelPub.reset();
  this->lightFactoryPub.reset();
  this->lightModifyPub.reset();
  this->responseSub.reset();
  this->node.reset();

  if (this->runThread)
    this->runThread->join();
  if (this->serviceThread)
    this->serviceThread->join();
}

/////////////////////////////////////////////////
void GazeboInterface::Init()
{
  this->requestPub->WaitForConnection();
}

/////////////////////////////////////////////////
void GazeboInterface::RunThread()
{
  this->runThread.reset(
      new std::thread(std::bind(&GazeboInterface::Run, this)));
  this->serviceThread.reset(new std::thread(
      std::bind(&GazeboInterface::RunService, this)));
}

/////////////////////////////////////////////////
void GazeboInterface::Run()
{
  while (!this->stop)
  {
    this->WaitForConnection();
    this->ProcessMessages();
  }
}

//////////////////////////////////////////////////
void GazeboInterface::RunService()
{
  while (!this->stop)
  {
    this->WaitForConnection();
    this->ProcessServiceRequests();
  }
}

/////////////////////////////////////////////////
void GazeboInterface::Fini()
{
  this->stop = true;
}

/////////////////////////////////////////////////
void GazeboInterface::ProcessMessages()
{
  {
    std::lock_guard<std::recursive_mutex> lock(this->receiveMutex);

    // Process incoming messages.
    std::vector<std::string> msgs = this->PopIncomingMessages();

    for (unsigned int i = 0; i < msgs.size(); ++i)
    {
      std::string msg = msgs[i];

      std::string operation = get_value(msg, "op");
      // ignore "advertise" messages (responsible for announcing the
      // availability of topics) as we currently don't make use of them.
      if (operation == "advertise")
        continue;

      std::string topic = get_value(msg.c_str(), "topic");

      // Process subscribe requests
      if (!topic.empty())
      {
        if (topic == this->sceneTopic)
        {
          gazebo::msgs::Request *requestMsg;
          requestMsg = gazebo::msgs::CreateRequest("scene_info");
          if (this->requests.find(requestMsg->id()) != this->requests.end())
            requests.erase(requestMsg->id());
          this->requests[requestMsg->id()] = requestMsg;
          this->requestPub->Publish(*requestMsg);
        }
        else if (topic == this->physicsTopic)
        {
          gazebo::msgs::Request *requestPhysicsMsg;
          requestPhysicsMsg = gazebo::msgs::CreateRequest("physics_info", "");
          if (this->requests.find(requestPhysicsMsg->id()) !=
               this->requests.end())
            requests.erase(requestPhysicsMsg->id());
          this->requests[requestPhysicsMsg->id()] = requestPhysicsMsg;
          this->requestPub->Publish(*requestPhysicsMsg);
        }
        else if (topic == this->poseTopic)
        {
          // TODO we currently subscribe on init,
          // should change logic so that  we subscribe only
          // when we receive sub msgs
        }
        else if (topic == this->modelModifyTopic)
        {
          std::string name = get_value(msg, "msg:name");
          int id = atoi(get_value(msg, "msg:id").c_str());

          if (name == "")
            continue;

          ignition::math::Vector3d pos(
            atof(get_value(msg, "msg:position:x").c_str()),
            atof(get_value(msg, "msg:position:y").c_str()),
            atof(get_value(msg, "msg:position:z").c_str()));
          ignition::math::Quaterniond quat(
            atof(get_value(msg, "msg:orientation:w").c_str()),
            atof(get_value(msg, "msg:orientation:x").c_str()),
            atof(get_value(msg, "msg:orientation:y").c_str()),
            atof(get_value(msg, "msg:orientation:z").c_str()));
          ignition::math::Pose3d pose(pos, quat);

          gazebo::msgs::Model modelMsg;
          modelMsg.set_id(id);
          modelMsg.set_name(name);
          gazebo::msgs::Set(modelMsg.mutable_pose(), pose);

          this->modelPub->Publish(modelMsg);
        }
        else if (topic == this->lightFactoryTopic ||
            topic == this->lightModifyTopic)
        {
          std::string name = get_value(msg, "msg:name");
          std::string type = get_value(msg, "msg:type");
          // createEntity = 1: create new light
          // createEntity = 0: modify existing light
          std::string createEntity = get_value(msg, "msg:createEntity");

          if (name == "")
            continue;

          gazebo::msgs::Light lightMsg;
          lightMsg.set_name(name);

          ignition::math::Vector3d pos(
              atof(get_value(msg, "msg:position:x").c_str()),
              atof(get_value(msg, "msg:position:y").c_str()),
              atof(get_value(msg, "msg:position:z").c_str()));
          ignition::math::Quaterniond quat(
              atof(get_value(msg, "msg:orientation:w").c_str()),
              atof(get_value(msg, "msg:orientation:x").c_str()),
              atof(get_value(msg, "msg:orientation:y").c_str()),
              atof(get_value(msg, "msg:orientation:z").c_str()));
          ignition::math::Pose3d pose(pos, quat);
          gazebo::msgs::Set(lightMsg.mutable_pose(), pose);

          if (createEntity.compare("0") == 0)
          {
            ignition::math::Vector3d direction(
              atof(get_value(msg, "msg:direction:x").c_str()),
              atof(get_value(msg, "msg:direction:y").c_str()),
              atof(get_value(msg, "msg:direction:z").c_str()));
            gazebo::msgs::Set(lightMsg.mutable_direction(), direction);

#if GAZEBO_MAJOR_VERSION >= 9
            ignition::math::Color diffuse(
#else
            gazebo::common::Color diffuse(
#endif
                atof(get_value(msg, "msg:diffuse:r").c_str()),
                atof(get_value(msg, "msg:diffuse:g").c_str()),
                atof(get_value(msg, "msg:diffuse:b").c_str()), 1);
            gazebo::msgs::Set(lightMsg.mutable_diffuse(), diffuse);
#if GAZEBO_MAJOR_VERSION >= 9
            ignition::math::Color specular(
#else
            gazebo::common::Color specular(
#endif
                atof(get_value(msg, "msg:specular:r").c_str()),
                atof(get_value(msg, "msg:specular:g").c_str()),
                atof(get_value(msg, "msg:specular:b").c_str()), 1);
            gazebo::msgs::Set(lightMsg.mutable_specular(), specular);

            lightMsg.set_range(atof(get_value(msg, "msg:range").c_str()));
            lightMsg.set_attenuation_constant(atof(
                get_value(msg, "msg:attenuation_constant").c_str()));
            lightMsg.set_attenuation_linear(atof(
                get_value(msg, "msg:attenuation_linear").c_str()));
            lightMsg.set_attenuation_quadratic(atof(
                get_value(msg, "msg:attenuation_quadratic").c_str()));

            this->lightModifyPub->Publish(lightMsg);
          }
          else
          {
            if (type.compare("pointlight") == 0)
            {
              lightMsg.set_type(gazebo::msgs::Light::POINT);
            }
            else if (type.compare("spotlight") == 0)
            {
              lightMsg.set_type(gazebo::msgs::Light::SPOT);
              gazebo::msgs::Set(lightMsg.mutable_direction(),
                  ignition::math::Vector3d(0,0,-1));
            }
            else if (type.compare("directionallight") == 0)
            {
              lightMsg.set_type(gazebo::msgs::Light::DIRECTIONAL);
              gazebo::msgs::Set(lightMsg.mutable_direction(),
                  ignition::math::Vector3d(0,0,-1));
            }
            gazebo::msgs::Set(lightMsg.mutable_diffuse(),

#if GAZEBO_MAJOR_VERSION >= 9
                ignition::math::Color(0.5, 0.5, 0.5, 1));
#else
                gazebo::common::Color(0.5, 0.5, 0.5, 1));
#endif
            gazebo::msgs::Set(lightMsg.mutable_specular(),

#if GAZEBO_MAJOR_VERSION >= 9
                ignition::math::Color(0.1, 0.1, 0.1, 1));
#else
                gazebo::common::Color(0.1, 0.1, 0.1, 1));
#endif
            lightMsg.set_attenuation_constant(0.5);
            lightMsg.set_attenuation_linear(0.01);
            lightMsg.set_attenuation_quadratic(0.001);
            lightMsg.set_range(20);

            this->lightFactoryPub->Publish(lightMsg);
          }

        }
        else if (topic == this->linkTopic)
        {
          std::string modelName = get_value(msg, "msg:name");
          int modelId = atoi(get_value(msg, "msg:id").c_str());

          std::string linkName = get_value(msg, "msg:link:name");
          int linkId = atoi(get_value(msg, "msg:link:id").c_str());

          if (modelName == "" || linkName == "")
            continue;

          gazebo::msgs::Model modelMsg;
          modelMsg.set_id(modelId);
          modelMsg.set_name(modelName);

          gazebo::msgs::Link *linkMsg = modelMsg.add_link();
          linkMsg->set_id(linkId);

          size_t index = linkName.find_last_of("::");
          if (index != std::string::npos)
              linkName = linkName.substr(index+1);
          linkMsg->set_name(linkName);

          std::string self_collideStr =
              get_value(msg, "msg:link:self_collide").c_str();
          bool self_collide = false;
          if (self_collideStr == "1")
          {
            self_collide = true;
          }
          linkMsg->set_self_collide(self_collide);

          std::string gravityStr =
              get_value(msg, "msg:link:gravity").c_str();
          bool gravity = false;
          if (gravityStr == "1")
          {
            gravity = true;
          }
          linkMsg->set_gravity(gravity);

          std::string kinematicStr =
              get_value(msg, "msg:link:kinematic").c_str();
          bool kinematic = false;
          if (kinematicStr == "1")
          {
            kinematic = true;
          }
          linkMsg->set_kinematic(kinematic);

          this->modelPub->Publish(modelMsg);
        }
        else if (topic == this->factoryTopic)
        {
          gazebo::msgs::Factory factoryMsg;
          std::stringstream newModelStr;

          std::string name = get_value(msg, "msg:name");
          std::string type = get_value(msg, "msg:type");

          ignition::math::Vector3d pos(
              atof(get_value(msg, "msg:position:x").c_str()),
              atof(get_value(msg, "msg:position:y").c_str()),
              atof(get_value(msg, "msg:position:z").c_str()));
          ignition::math::Quaterniond quat(
              atof(get_value(msg, "msg:orientation:w").c_str()),
              atof(get_value(msg, "msg:orientation:x").c_str()),
              atof(get_value(msg, "msg:orientation:y").c_str()),
              atof(get_value(msg, "msg:orientation:z").c_str()));
          ignition::math::Vector3d rpy = quat.Euler();

          if(type == "box" || type == "sphere" || type == "cylinder")
          {
            std::stringstream geom;
            if (type == "box")
            {
              geom  << "<box>"
                    <<   "<size>1.0 1.0 1.0</size>"
                    << "</box>";
            }
            else if (type == "sphere")
            {
              geom  << "<sphere>"
                    <<   "<radius>0.5</radius>"
                    << "</sphere>";
            }
            else if (type == "cylinder")
            {
              geom  << "<cylinder>"
                    <<   "<radius>0.5</radius>"
                    <<   "<length>1.0</length>"
                    << "</cylinder>";
            }

            newModelStr << "<sdf version ='" << SDF_VERSION << "'>"
                << "<model name='" << name << "'>"
                << "<pose>" << pos.X() << " " << pos.Y() << " " << pos.Z()
                            << " "
                            << rpy.X() << " " << rpy.Y() << " " << rpy.Z()
                            << "</pose>"
                << "<link name ='link'>"
                <<   "<inertial><mass>1.0</mass></inertial>"
                <<   "<collision name ='collision'>"
                <<     "<geometry>"
                <<        geom.str()
                <<     "</geometry>"
                << "</collision>"
                << "<visual name ='visual'>"
                <<     "<geometry>"
                <<        geom.str()
                <<     "</geometry>"
                <<     "<material>"
                <<       "<script>"
                <<         "<uri>file://media/materials/scripts/gazebo.material"
                <<         "</uri>"
                <<         "<name>Gazebo/Grey</name>"
                <<       "</script>"
                <<     "</material>"
                <<   "</visual>"
                << "</link>"
                << "</model>"
                << "</sdf>";
          }
          else
          {
            newModelStr << "<sdf version ='" << SDF_VERSION << "'>"
                  << "<model name='" << name << "'>"
                  << "  <pose>" << pos.X() << " " << pos.Y() << " "
                                << pos.Z() << " " << rpy.X() << " "
                                << rpy.Y() << " " << rpy.Z() << "</pose>"
                  << "  <include>"
                  << "    <uri>model://" << type << "</uri>"
                  << "  </include>"
                  << "</model>"
                  << "</sdf>";
          }

          // Spawn the model in the physics server
          factoryMsg.set_sdf(newModelStr.str());
          this->factoryPub->Publish(factoryMsg);
        }
        else if (topic == this->worldControlTopic)
        {
          gazebo::msgs::WorldControl worldControlMsg;
          std::string pause = get_value(msg, "msg:pause");
          std::string reset = get_value(msg, "msg:reset");
          if (!pause.empty())
          {
            int pauseValue = atoi(pause.c_str());
            worldControlMsg.set_pause(pauseValue);
          }
          if (!reset.empty())
          {
            if (reset == "model")
            {
              worldControlMsg.mutable_reset()->set_all(false);
              worldControlMsg.mutable_reset()->set_time_only(false);
              worldControlMsg.mutable_reset()->set_model_only(true);
            }
            else if (reset == "world")
            {
              worldControlMsg.mutable_reset()->set_all(true);
            }
          }
          if (!pause.empty() || !reset.empty())
            this->worldControlPub->Publish(worldControlMsg);
        }
        else if (topic == this->materialTopic)
        {

          if (this->materialParser)
          {
            std::string msg =
                this->PackOutgoingTopicMsg(this->materialTopic,
                this->materialParser->GetMaterialAsJson());
            this->Send(msg);
          }
        }
        else if (topic == this->deleteTopic)
        {
          std::string name = get_value(msg, "msg:name");
          gazebo::transport::requestNoReply(this->node, "entity_delete", name);
        }
        else if (topic == this->playbackControlTopic)
        {
          gazebo::msgs::LogPlaybackControl playbackControlMsg;
          std::string pause = get_value(msg, "msg:pause");
          std::string multiStep = get_value(msg, "msg:multi_step");
          std::string rewind = get_value(msg, "msg:rewind");
          std::string forward = get_value(msg, "msg:forward");
          std::string seekSec = get_value(msg, "msg:seek:sec");
          std::string seekNSec = get_value(msg, "msg:seek:nsec");
          if (!pause.empty())
          {
            int pauseValue = atoi(pause.c_str());
            playbackControlMsg.set_pause(pauseValue);
          }
          if (!multiStep.empty())
          {
            int multiStepValue = atoi(multiStep.c_str());
            playbackControlMsg.set_multi_step(multiStepValue);
          }
          if (!rewind.empty())
          {
            int rewindValue = atoi(rewind.c_str());
            playbackControlMsg.set_rewind(rewindValue);
          }
          if (!forward.empty())
          {
            int forwardValue = atoi(forward.c_str());
            playbackControlMsg.set_forward(forwardValue);
          }
          if (!seekSec.empty() && !seekNSec.empty())
          {
            auto seek = playbackControlMsg.mutable_seek();
            seek->set_sec(atof(seekSec.c_str()));
            seek->set_nsec(atof(seekNSec.c_str()));
          }
          this->playbackControlPub->Publish(playbackControlMsg);
        }
        else if (topic == this->statsTopic)
        {
          // simulate latching stats topic
          if (this->statsMsgs.empty())
          {
            this->statsMsgs.push_back(this->statsMsg);
          }
        }
      }
      else
      {
        // store service calls for processing later
        std::string service = get_value(msg.c_str(), "service");
        if (!service.empty())
        {
          std::lock_guard<std::recursive_mutex> lock(this->serviceMutex);
          this->serviceRequests.push_back(msg);
        }
      }
    }

    std::string msg;
    // Forward the scene messages.
    for (auto sIter = this->sceneMsgs.begin(); sIter != this->sceneMsgs.end();
        ++sIter)
    {
      msg = this->PackOutgoingTopicMsg(this->sceneTopic,
          pb2json(*(*sIter).get()));
      this->Send(msg);
    }
    this->sceneMsgs.clear();

    // Forward the physics messages.
    for (auto physicsIter = this->physicsMsgs.begin();
        physicsIter != this->physicsMsgs.end(); ++physicsIter)
    {
      msg = this->PackOutgoingTopicMsg(this->physicsTopic,
          pb2json(*(*physicsIter).get()));
      this->Send(msg);
    }
    this->physicsMsgs.clear();

    // Forward the model messages.
    for (auto modelIter = this->modelMsgs.begin();
        modelIter != this->modelMsgs.end(); ++modelIter)
    {
      msg = this->PackOutgoingTopicMsg(this->modelTopic,
          pb2json(*(*modelIter).get()));
      this->Send(msg);
    }
    this->modelMsgs.clear();

    // Forward the sensor messages.
    for (auto sensorIter = this->sensorMsgs.begin();
        sensorIter != this->sensorMsgs.end(); ++sensorIter)
    {
      msg = this->PackOutgoingTopicMsg(this->sensorTopic,
          pb2json(*(*sensorIter).get()));
      this->Send(msg);
    }
    this->sensorMsgs.clear();

    // Forward the light factory messages.
    for (auto lightIter = this->lightFactoryMsgs.begin();
        lightIter != this->lightFactoryMsgs.end(); ++lightIter)
    {
      msg = this->PackOutgoingTopicMsg(this->lightFactoryTopic,
          pb2json(*(*lightIter).get()));
      this->Send(msg);
    }
    this->lightFactoryMsgs.clear();

    // Forward the light modify messages.
    for (auto lightIter = this->lightModifyMsgs.begin();
        lightIter != this->lightModifyMsgs.end(); ++lightIter)
    {
      msg = this->PackOutgoingTopicMsg(this->lightModifyTopic,
          pb2json(*(*lightIter).get()));
      this->Send(msg);
    }
    this->lightModifyMsgs.clear();

    // Forward the visual messages.
    for (auto visualIter = this->visualMsgs.begin();
        visualIter != this->visualMsgs.end(); ++visualIter)
    {
      msg = this->PackOutgoingTopicMsg(this->visualTopic,
          pb2json(*(*visualIter).get()));
      this->Send(msg);
    }
    this->visualMsgs.clear();

    // Forward the joint messages.
    for (auto jointIter = this->jointMsgs.begin();
        jointIter != this->jointMsgs.end(); ++jointIter)
    {
      msg = this->PackOutgoingTopicMsg(this->jointTopic,
          pb2json(*(*jointIter).get()));
      this->Send(msg);
    }
    this->jointMsgs.clear();

    // Forward the request messages
    for (auto rIter =  this->requestMsgs.begin();
        rIter != this->requestMsgs.end(); ++rIter)
    {
      msg = this->PackOutgoingTopicMsg(this->requestTopic,
          pb2json(*(*rIter).get()));
      this->Send(msg);
    }
    this->requestMsgs.clear();

    // Forward the stats messages.
    for (auto wIter = this->statsMsgs.begin(); wIter != this->statsMsgs.end();
        ++wIter)
    {
      msg = this->PackOutgoingTopicMsg(this->statsTopic,
          pb2json(*(*wIter).get()));
      this->Send(msg);
    }
    this->statsMsgs.clear();

    // Forward all the pose messages.
    auto pIter = this->poseMsgs.begin();
    while (pIter != this->poseMsgs.end())
    {
      msg = this->PackOutgoingTopicMsg(this->poseTopic,
          pb2json(*pIter));
      this->Send(msg);
      ++pIter;
    }
    this->poseMsgs.clear();
  }
}

/////////////////////////////////////////////////
void GazeboInterface::ProcessServiceRequests()
{
  std::vector<std::string> services;
  {
    std::lock_guard<std::recursive_mutex> lock(this->serviceMutex);
    services = this->serviceRequests;
    this->serviceRequests.clear();
  }

  // process service request outside lock otherwise somehow it deadlocks
  for (unsigned int i = 0; i < services.size(); ++i)
  {
    std::string request = services[i];
    std::string service = get_value(request.c_str(), "service");
    std::string id = get_value(request.c_str(), "id");
    std::string name = get_value(request.c_str(), "args");
    if (service == this->heightmapService)
    {
      boost::shared_ptr<gazebo::msgs::Response> response
          = gazebo::transport::request(name, "heightmap_data");
      gazebo::msgs::Geometry geomMsg;
      if (response->response() != "error" &&
          response->type() == geomMsg.GetTypeName())
      {
        geomMsg.ParseFromString(response->serialized_data());

        std::string msg = this->PackOutgoingServiceMsg(id,
            pb2json(geomMsg));
        this->Send(msg);
      }
    }
    else if (service == this->roadTopic)
    {
      if (!this->roadMsgs.empty())
      {
        std::string msg = this->PackOutgoingServiceMsg(id,
            pb2json(*roadMsgs.front().get()));
        this->Send(msg);
      }
    }
  }
}

/////////////////////////////////////////////////
void GazeboInterface::OnModelMsg(ConstModelPtr &_msg)
{
  if (!this->IsConnected())
    return;

  std::lock_guard<std::recursive_mutex> lock(this->receiveMutex);
  this->modelMsgs.push_back(_msg);
}

/////////////////////////////////////////////////
bool GazeboInterface::FilterPoses(const TimedPose &_old,
    const TimedPose &_current)
{
  if (this->messageCount >= this->messageWindowSize)
  {
    // double ratio =  100.0 * this->skippedMsgCount  / this->messageWindowSize;
    // std::cout << "Message filter: " << ratio << " %" << std::endl;
    // std::cout << "Message count : " << this->skippedMsgCount;
    this->skippedMsgCount = 0;
    this->messageCount = 0;
  }
  this->messageCount++;

  bool hasMoved = false;
  bool isTooEarly = false;
  bool hasRotated = false;

  gazebo::common::Time mininumTimeElapsed(this->minimumMsgAge);

  gazebo::common::Time timeDifference =  _current.first - _old.first;

  // checking > 0 because world may have been reset
  if (timeDifference < mininumTimeElapsed && timeDifference.Double() > 0)
  {
    isTooEarly = true;
  }

  ignition::math::Vector3d posDiff = _current.second.Pos() - _old.second.Pos();
  double translationSquared = posDiff.SquaredLength();
  if (translationSquared > minimumDistanceSquared)
  {
    hasMoved = true;
  }

  ignition::math::Quaterniond i = _current.second.Rot().Inverse();
  ignition::math::Quaterniond qDiff =  i * _old.second.Rot();

  ignition::math::Vector3d d(qDiff.X(), qDiff.Y(), qDiff.Z());
  double rotation = d.SquaredLength();
  if (rotation > minimumQuaternionSquared)
  {
    hasRotated = true;
  }

  if (isTooEarly)
  {
    this->skippedMsgCount++;
    return true;
  }

  if ((hasMoved == false) && (hasRotated == false))
  {
    this->skippedMsgCount++;
    return true;
  }

  return false;
}

/////////////////////////////////////////////////
void GazeboInterface::OnPoseMsg(ConstPosesStampedPtr &_msg)
{
  if (!this->IsConnected())
    return;

  std::lock_guard<std::recursive_mutex> lock(this->receiveMutex);
  PoseMsgs_L::iterator iter;

  for (int i = 0; i < _msg->pose_size(); ++i)
  {
    // Find an old model message, and remove them
    for (iter = this->poseMsgs.begin(); iter != this->poseMsgs.end(); ++iter)
    {
      if ((*iter).name() == _msg->pose(i).name())
      {
        this->poseMsgs.erase(iter);
        break;
      }
    }
    bool filtered = false;

    std::string name = _msg->pose(i).name();

    ignition::math::Pose3d pose = gazebo::msgs::ConvertIgn(_msg->pose(i));
    gazebo::common::Time time = gazebo::msgs::Convert(_msg->time());

    PoseMsgsFilter_M::iterator it = this->poseMsgsFilterMap.find(name);

    TimedPose currentPose;
    currentPose.first = time;
    currentPose.second = pose;

    if (it == this->poseMsgsFilterMap.end())
    {
      std::pair<PoseMsgsFilter_M::iterator, bool> r;
      r = this->poseMsgsFilterMap.insert(make_pair(name, currentPose));
    }
    else
    {
      TimedPose oldPose = it->second;
      filtered = this->FilterPoses(oldPose, currentPose);
      if (!filtered)
      {
        // update the map
        it->second.first = currentPose.first;
        it->second.second = currentPose.second;
        this->poseMsgs.push_back(_msg->pose(i));
      }
    }
  }
}

/////////////////////////////////////////////////
void GazeboInterface::OnRequest(ConstRequestPtr &_msg)
{
  if (!this->IsConnected())
    return;

  std::lock_guard<std::recursive_mutex> lock(this->receiveMutex);
  this->requestMsgs.push_back(_msg);
}

/////////////////////////////////////////////////
void GazeboInterface::OnResponse(ConstResponsePtr &_msg)
{
  if (!this->IsConnected())
    return;

  if (this->requests.find(_msg->id()) == this->requests.end())
    return;

  if (_msg->has_type() && _msg->type() == "gazebo.msgs.Scene")
  {
    gazebo::msgs::Scene sceneMsg;
    sceneMsg.ParseFromString(_msg->serialized_data());
    boost::shared_ptr<gazebo::msgs::Scene> sm(
        new gazebo::msgs::Scene(sceneMsg));
    this->sceneMsgs.push_back(sm);
    this->requests.erase(_msg->id());
  }
  else if (_msg->has_type() && _msg->type() == "gazebo.msgs.Physics")
  {
    gazebo::msgs::Physics physicsMsg;
    physicsMsg.ParseFromString(_msg->serialized_data());
    boost::shared_ptr<gazebo::msgs::Physics> pm(
        new gazebo::msgs::Physics(physicsMsg));
    this->physicsMsgs.push_back(pm);
    this->requests.erase(_msg->id());
  }
}

/////////////////////////////////////////////////
void GazeboInterface::OnLightFactoryMsg(ConstLightPtr &_msg)
{
  if (!this->IsConnected())
    return;

  std::lock_guard<std::recursive_mutex> lock(this->receiveMutex);
  this->lightFactoryMsgs.push_back(_msg);
}

/////////////////////////////////////////////////
void GazeboInterface::OnLightModifyMsg(ConstLightPtr &_msg)
{
  if (!this->IsConnected())
    return;

  std::lock_guard<std::recursive_mutex> lock(this->receiveMutex);
  this->lightModifyMsgs.push_back(_msg);
}

/////////////////////////////////////////////////
void GazeboInterface::OnScene(ConstScenePtr &_msg)
{
  if (!this->IsConnected())
    return;

  std::lock_guard<std::recursive_mutex> lock(this->receiveMutex);
  this->sceneMsgs.push_back(_msg);
}

/////////////////////////////////////////////////
void GazeboInterface::OnPhysicsMsg(ConstPhysicsPtr &_msg)
{
  if (!this->IsConnected())
    return;

  std::lock_guard<std::recursive_mutex> lock(this->receiveMutex);
  this->physicsMsgs.push_back(_msg);
}

/////////////////////////////////////////////////
void GazeboInterface::OnStats(ConstWorldStatisticsPtr &_msg)
{
  // store stats msg. This is sent to all clients when they first connect to
  // the bridge to determine if gazebo is in sim or playback mode
  this->statsMsg = _msg;

  if (!this->IsConnected())
    return;

  gazebo::common::Time wallTime;
  wallTime = gazebo::msgs::Convert(_msg->real_time());

  gazebo::common::Time lastStatsTime;
  if (this->lastStatsMsg)
    lastStatsTime = gazebo::msgs::Convert(this->lastStatsMsg->real_time());
  // bool playback = this->lastStatsMsg->has_log_playback_stats();
  double timeDelta = (wallTime - lastStatsTime).Double();
  bool paused = _msg->paused();

  // pub at 1Hz, but force pub if world state changes
  if (timeDelta >= 1.0 || wallTime < lastStatsTime ||
      this->lastPausedState != paused)
  {
    this->lastPausedState = paused;
    this->lastStatsMsg = _msg;

    std::lock_guard<std::recursive_mutex> lock(this->receiveMutex);
    this->statsMsgs.push_back(_msg);
  }
}

/////////////////////////////////////////////////
void GazeboInterface::OnRoad(ConstRoadPtr &_msg)
{
  std::lock_guard<std::recursive_mutex> lock(this->receiveMutex);
  this->roadMsgs.push_back(_msg);
}

/////////////////////////////////////////////////
void GazeboInterface::OnJointMsg(ConstJointPtr &_msg)
{
  if (!this->IsConnected())
    return;

  std::lock_guard<std::recursive_mutex> lock(this->receiveMutex);
  this->jointMsgs.push_back(_msg);
}

/////////////////////////////////////////////////
void GazeboInterface::OnSensorMsg(ConstSensorPtr &_msg)
{
  if (!this->IsConnected())
    return;

  std::lock_guard<std::recursive_mutex> lock(this->receiveMutex);
  this->sensorMsgs.push_back(_msg);
}

/////////////////////////////////////////////////
void GazeboInterface::OnVisualMsg(ConstVisualPtr &_msg)
{
  if (!this->IsConnected())
    return;

  std::lock_guard<std::recursive_mutex> lock(this->receiveMutex);
  this->visualMsgs.push_back(_msg);
}

/////////////////////////////////////////////////
std::string GazeboInterface::PackOutgoingTopicMsg(const std::string &_topic,
    const std::string &_msg)
{
  // Use roslibjs format for now.
  std::string out;
  out += "{\"op\":\"publish\",\"topic\":\"" + _topic + "\", \"msg\":";
  out += _msg;
  out += "}";
  return out;
}

/////////////////////////////////////////////////
std::string GazeboInterface::PackOutgoingServiceMsg(const std::string &_id,
    const std::string &_msg)
{
  // Use roslibjs format for now.
  std::string out;
  out += "{\"op\":\"service_response\",\"id\":\"" + _id + "\", \"values\":";
  out += _msg;
  out += "}";
  return out;
}

/////////////////////////////////////////////////
void GazeboInterface::Send(const std::string &_msg)
{
  std::lock_guard<std::recursive_mutex> lock(this->outgoingMutex);
  if (outgoing.size() < MAX_NUM_MSG_SIZE)
    this->outgoing.push_back(_msg);
}

/////////////////////////////////////////////////
std::vector<std::string> GazeboInterface::PopIncomingMessages()
{
  std::lock_guard<std::recursive_mutex> lock(this->incomingMutex);
  std::vector<std::string> in = this->incoming;
  this->incoming.clear();
  return in;
}

/////////////////////////////////////////////////
std::vector<std::string> GazeboInterface::PopOutgoingMessages()
{
  std::lock_guard<std::recursive_mutex> lock(this->outgoingMutex);
  std::vector<std::string> out = this->outgoing;
  this->outgoing.clear();
  return out;
}

/////////////////////////////////////////////////
void GazeboInterface::PushRequest(const std::string &_msg)
{
  std::lock_guard<std::recursive_mutex> lock(this->incomingMutex);
  if (incoming.size() < MAX_NUM_MSG_SIZE)
    this->incoming.push_back(_msg);
}

/////////////////////////////////////////////////
void GazeboInterface::LoadMaterialScripts(const std::string &_path)
{
  if (this->materialParser)
    this->materialParser->Load(_path);
}

/////////////////////////////////////////////////
void GazeboInterface::WaitForConnection()
{
  std::unique_lock<std::mutex> lock(this->connectionMutex);
  while (!this->isConnected)
  {
    this->connectionCondition.wait(lock);
  }
}

/////////////////////////////////////////////////
void GazeboInterface::SetConnected(bool _connected)
{
  std::lock_guard<std::mutex> lock(this->connectionMutex);
  this->isConnected = _connected;
  this->connectionCondition.notify_all();
}

/////////////////////////////////////////////////
bool GazeboInterface::IsConnected()
{
  std::lock_guard<std::mutex> lock(this->connectionMutex);
  return this->isConnected;
}

/////////////////////////////////////////////////
void GazeboInterface::SetPoseFilterMinimumDistanceSquared(double _m)
{
  this->minimumDistanceSquared = _m;
}

/////////////////////////////////////////////////
double GazeboInterface::GetPoseFilterMinimumDistanceSquared()
{
  return this->minimumDistanceSquared;
}

/////////////////////////////////////////////////
void GazeboInterface::SetPoseFilterMinimumQuaternionSquared(double _m)
{
  this->minimumQuaternionSquared = _m;
}

/////////////////////////////////////////////////
double GazeboInterface::GetPoseFilterMinimumQuaternionSquared()
{
  return this->minimumQuaternionSquared;
}

/////////////////////////////////////////////////
void GazeboInterface::SetPoseFilterMinimumMsgAge(double _m)
{
  this->minimumMsgAge = _m;
}

/////////////////////////////////////////////////
double GazeboInterface::GetPoseFilterMinimumMsgAge()
{
  return this->minimumMsgAge;
}
