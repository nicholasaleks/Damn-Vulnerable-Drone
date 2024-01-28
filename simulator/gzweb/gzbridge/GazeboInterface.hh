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

#ifndef GZBRIDGE_GAZEBOINTERFACE_HH_
#define GZBRIDGE_GAZEBOINTERFACE_HH_

#include <string>
#include <list>
#include <map>
#include <memory>
#include <mutex>
#include <thread>
#include <condition_variable>

#include <gazebo/msgs/msgs.hh>
#include <gazebo/transport/TransportIface.hh>


namespace gzweb
{
  class OgreMaterialParser;

  class GazeboInterface
  {
    /// \brief Constructor.
    /// \param[in] _server Websocket server.
    public: GazeboInterface();

    /// \brief Destructor.
    public: virtual ~GazeboInterface();

    /// \brief Initialize gazebo interface.
    public: void Init();

    /// \brief Run the gazebo interface in a thread.
    public: void RunThread();

    /// \brief Stop the gazebo interace.
    public: void Fini();

    /// \brief Push a request message to incoming messages buffer.
    /// \return Request message.
    public: void PushRequest(const std::string &_request);

    /// \brief Get incoming messages.
    /// \return Incoming messages.
    public: std::vector<std::string> PopIncomingMessages();

    /// \brief Get outgoing messages.
    /// \return Outgoing messages.
    public: std::vector<std::string> PopOutgoingMessages();

    /// \brief Receive message from websocket server.
    /// \param[in] _msg Message received.
    public: void Receive(const std::string &_msg);

    /// \brief Load material scripts.
    /// \param[in] _path Path to the material scripts.
    public: void LoadMaterialScripts(const std::string &_path);

    /// \brief Set the connected state
    /// \param[in] _connected True if there are client connections.
    public: void SetConnected(bool _connected);

    /// \brief Get the connected state
    /// \return True if there are client connections.
    public: bool IsConnected();

    /// \brief Pack topic publish message.
    private: std::string PackOutgoingTopicMsg(const std::string &_topic,
        const std::string &_msg);

    /// \brief Pack service response message.
    private: std::string PackOutgoingServiceMsg(const std::string &_id,
        const std::string &_msg);

    /// \brief Send message through websocket server.
    /// \param[in] _msg Message to be sent.
    private: void Send(const std::string &_msg);

    /// \brief Run the gazebo interface.
    private: void Run();

    /// \brief Run the gazebo service handling loop.
    private: void RunService();

    /// \brief Process the messages.
    private: void ProcessMessages();

    /// \brief Process the service requests.
    private: void ProcessServiceRequests();

    /// \brief Model message callback.
    /// \param[in] _msg The message data.
    private: void OnModelMsg(ConstModelPtr &_msg);

    /// \brief Pose message callback.
    /// \param[in] _msg The message data.
    private: void OnPoseMsg(ConstPosesStampedPtr &_msg);

    /// \brief Request callback
    /// \param[in] _msg The message data.
    private: void OnRequest(ConstRequestPtr &_msg);

    /// \brief Light factory message callback.
    /// \param[in] _msg The message data.
    private: void OnLightFactoryMsg(ConstLightPtr &_msg);

    /// \brief Light modify message callback.
    /// \param[in] _msg The message data.
    private: void OnLightModifyMsg(ConstLightPtr &_msg);

    /// \brief Joint message callback.
    /// \param[in] _msg The message data.
    private: void OnJointMsg(ConstJointPtr &_msg);

    /// \brief Scene message callback.
    /// \param[in] _msg The message data.
    private: void OnSensorMsg(ConstSensorPtr &_msg);

    /// \brief Visual message callback.
    /// \param[in] _msg The message data.
    private: void OnVisualMsg(ConstVisualPtr &_msg);

    /// \brief Called when a scene message is received on the
    /// ~/scene topic
    /// \param[in] _msg The message.
    private: void OnScene(ConstScenePtr &_msg);

    /// \brief Physics message callback.
    /// \param[in] _msg The message data.
    private: void OnPhysicsMsg(ConstPhysicsPtr &_msg);

    /// \brief World stats message callback.
    /// \param[in] _msg The message.
    private: void OnStats(ConstWorldStatisticsPtr &_msg);

    /// \brief Road message callback.
    /// \param[in] _msg The message.
    private: void OnRoad(ConstRoadPtr &_msg);

    /// \brief Response callback
    /// \param[in] _msg The message data.
    private: void OnResponse(ConstResponsePtr &_msg);

    /// \brief Block if there are no connections.
    private: void WaitForConnection();

    /// \brief a pose at a specific time
    typedef std::pair<gazebo::common::Time, ignition::math::Pose3d> TimedPose;

    /// \brief True if the message is to be ignored because it is either
    /// too old, or too similar
    /// \param[in] _previous The previous pose
    /// \param[in] _current The latest pose
    private: bool FilterPoses(const TimedPose &_previous,
        const TimedPose &_current);

    /// \brief Incoming messages.
    public: std::vector<std::string> incoming;

    /// \brief Outgoing messages.
    public: std::vector<std::string> outgoing;

    /// \brief Thread to run the main loop.
    private: std::unique_ptr<std::thread> runThread;

    /// \brief Thread for processing services requests.
    private: std::unique_ptr<std::thread> serviceThread;

    /// \brief Gazebo transport node.
    private: gazebo::transport::NodePtr node;

    /// \brief Subscribe to model info updates
    private: gazebo::transport::SubscriberPtr modelInfoSub;

    /// \brief Subscribe to pose updates
    private: gazebo::transport::SubscriberPtr poseSub;

    /// \brief Subscribe to the request topic
    private: gazebo::transport::SubscriberPtr requestSub;

    /// \brief Subscribe to light factory topic.
    private: gazebo::transport::SubscriberPtr lightFactorySub;

    /// \brief Subscribe to light modify topic.
    private: gazebo::transport::SubscriberPtr lightModifySub;

    /// \brief Subscribe to sensor topic
    private: gazebo::transport::SubscriberPtr sensorSub;

    /// \brief Subscribe to scene topic
    private: gazebo::transport::SubscriberPtr sceneSub;

    /// \brief Subscribe to physics topic
    private: gazebo::transport::SubscriberPtr physicsSub;

    /// \brief Subscribe to world stats topic
    private: gazebo::transport::SubscriberPtr statsSub;

    /// \brief Subscribe to visual topic
    private: gazebo::transport::SubscriberPtr visSub;

    /// \brief Subscribe to joint updates.
    private: gazebo::transport::SubscriberPtr jointSub;

    /// \brief Subscribe to road msgs.
    private: gazebo::transport::SubscriberPtr roadSub;

    /// \brief Publish requests
    private: gazebo::transport::PublisherPtr requestPub;

    /// \brief Publish model modify messages
    private: gazebo::transport::PublisherPtr modelPub;

    /// \brief Publish light factory messages
    private: gazebo::transport::PublisherPtr lightFactoryPub;

    /// \brief Publish light modify messages
    private: gazebo::transport::PublisherPtr lightModifyPub;

    /// \brief Publish factory messages
    private: gazebo::transport::PublisherPtr factoryPub;

    /// \brief Publish world control messages
    private: gazebo::transport::PublisherPtr worldControlPub;

    /// \brief Subscribe to reponses.
    private: gazebo::transport::SubscriberPtr responseSub;

    /// \brief Publish playback control messages
    private: gazebo::transport::PublisherPtr playbackControlPub;

    /// \brief Request message for getting initial scene info.
    private: std::map<int, gazebo::msgs::Request *> requests;

    /// \brief Mutex to lock the various message buffers.
    private: std::recursive_mutex receiveMutex;

    /// \brief Mutex to lock the service request buffer.
    private: std::recursive_mutex serviceMutex;

    /// \brief Mutex to lock the incoming message request buffer.
    private: std::recursive_mutex incomingMutex;

    /// \brief Mutex to lock the outgoing message request buffer.
    private: std::recursive_mutex outgoingMutex;

    /// \brief Mutex to protect the isConnected variable.
    private: std::mutex connectionMutex;

    /// \brief The condition to notify when connection state changes.
    public: std::condition_variable connectionCondition;

    /// \def ModelMsgs_L
    /// \brief List of model messages.
    typedef std::list<boost::shared_ptr<gazebo::msgs::Model const> >
        ModelMsgs_L;

    /// \brief List of model message to process.
    private: ModelMsgs_L modelMsgs;

    /// \def RequestMsgs_L
    /// \brief List of request messages.
    typedef std::list<boost::shared_ptr<gazebo::msgs::Request const> >
        RequestMsgs_L;
    /// \brief List of request message to process.
    private: RequestMsgs_L requestMsgs;

    /// \def PoseMsgs_L.
    /// \brief List of messages.
    typedef std::list<gazebo::msgs::Pose> PoseMsgs_L;

    /// \brief List of pose message to process.
    private: PoseMsgs_L poseMsgs;

    /// \def LightMsgs_L.
    /// \brief List of light messages.
    typedef std::list<boost::shared_ptr<gazebo::msgs::Light const> >
        LightMsgs_L;

    /// \brief List of light factory message to process.
    private: LightMsgs_L lightFactoryMsgs;

    /// \brief List of light modify message to process.
    private: LightMsgs_L lightModifyMsgs;

    /// \def SensorMsgs_L
    /// \brief List of sensor messages.
    typedef std::list<boost::shared_ptr<gazebo::msgs::Sensor const> >
        SensorMsgs_L;

    /// \brief List of sensor message to process.
    private: SensorMsgs_L sensorMsgs;

    /// \def VisualMsgs_L
    /// \brief List of visual messages.
    typedef std::list<boost::shared_ptr<gazebo::msgs::Visual const> >
        VisualMsgs_L;

    /// \brief List of visual messages to process.
    private: VisualMsgs_L visualMsgs;

    /// \def JointMsgs_L
    /// \brief List of joint messages.
    typedef std::list<boost::shared_ptr<gazebo::msgs::Joint const> >
        JointMsgs_L;

    /// \brief List of joint message to process.
    private: JointMsgs_L jointMsgs;

    /// \def SceneMsgs_L
    /// \brief List of scene messages.
    typedef std::list<boost::shared_ptr<gazebo::msgs::Scene const> >
        SceneMsgs_L;

    /// \brief List of scene message to process.
    private: SceneMsgs_L sceneMsgs;

    /// \def PhysicsMsgs_L
    /// \brief List of physics messages.
    typedef std::list<boost::shared_ptr<gazebo::msgs::Physics const> >
        PhysicsMsgs_L;

    /// \brief List of physics message to process.
    private: PhysicsMsgs_L physicsMsgs;

    /// \def SceneMsgs_L
    /// \brief List of world stats messages.
    typedef std::list<boost::shared_ptr<gazebo::msgs::WorldStatistics const> >
        WorldStatsMsgs_L;

    /// \brief List of world stats message to process.
    private: WorldStatsMsgs_L statsMsgs;

    /// \def RoadMsgs_L
    /// \brief List of road messages.
    typedef std::list<boost::shared_ptr<gazebo::msgs::Road const> >
        RoadMsgs_L;

    /// \brief List of road message to process.
    private: RoadMsgs_L roadMsgs;

    /// \def PoseMsgsFilter_M
    /// \brief Map of last pose messages used for filtering
    typedef std::map< std::string, TimedPose> PoseMsgsFilter_M;

    private: PoseMsgsFilter_M poseMsgsFilterMap;

    /// \brief List of service requests to process.
    private: std::vector<std::string> serviceRequests;

    /// \brief True to stop the interface.
    private: bool stop = false;

    /// \brief Name of sensor topic.
    private: std::string sensorTopic;

    /// \brief Name of visual topic.
    private: std::string visualTopic;

    /// \brief Name of joint topic.
    private: std::string jointTopic;

    /// \brief Name of model topic.
    private: std::string modelTopic;

    /// \brief Name of pose topic.
    private: std::string poseTopic;

    /// \brief Name of request topic.
    private: std::string requestTopic;

    /// \brief Name of light factory topic.
    private: std::string lightFactoryTopic;

    /// \brief Name of light modify topic.
    private: std::string lightModifyTopic;

    /// \brief Name of link topic.
    private: std::string linkTopic;

    /// \brief Name of scene topic.
    private: std::string sceneTopic;

    /// \brief Name of physics topic.
    private: std::string physicsTopic;

    /// \brief Name of world stats topic.
    private: std::string statsTopic;

    /// \brief Name of model modify topic.
    private: std::string modelModifyTopic;

    /// \brief Name of factory topic.
    private: std::string factoryTopic;

    /// \brief Name of world control topic.
    private: std::string worldControlTopic;

    /// \brief A custom topic for getting mapping of materials to textures
    /// referenced by gazebo
    private: std::string materialTopic;

    /// \brief Name of road topic.
    private: std::string roadTopic;

    /// \brief Name of heightmap data service.
    private: std::string heightmapService;

    /// \brief Name of delete topic.
    private: std::string deleteTopic;

    /// \brief Name of playback control topic.
    private: std::string playbackControlTopic;

    /// \brief Ogre material parser.
    private: OgreMaterialParser *materialParser = nullptr;

    /// \brief Last world stats msg received
    private: boost::shared_ptr<gazebo::msgs::WorldStatistics const>
        lastStatsMsg;

    /// \brief Most recent world stats msg received
    private: boost::shared_ptr<gazebo::msgs::WorldStatistics const>
        statsMsg;

    /// \brief Last world state received, play or paused.
    private: bool lastPausedState;

    /// \brief filter pose message based on minimum distance criteria
    private: double minimumDistanceSquared = 0;

    /// \brief filter pose message based on minimum rotation criteria
    private: double minimumQuaternionSquared = 0;

    /// \brief filter pose message based on minimum elapsed time (seconds)
    private: double minimumMsgAge = 0;

    private: int skippedMsgCount = 0;
    private: int messageWindowSize = 0;
    private: int messageCount = 0;

    /// \brief True if there is a client connection.
    private: bool isConnected = false;

    public: void SetPoseFilterMinimumDistanceSquared(double _m);
    public: double GetPoseFilterMinimumDistanceSquared();
    public: void SetPoseFilterMinimumQuaternionSquared(double _m);
    public: double GetPoseFilterMinimumQuaternionSquared();
    public: void SetPoseFilterMinimumMsgAge(double _m);
    public: double GetPoseFilterMinimumMsgAge();
  };
}

#endif
