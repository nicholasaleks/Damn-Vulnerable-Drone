/**
 * Class responsible for communication with the backend via a websocket, it
 * forwards user commands to the server and propagates updates coming from the
 * server to other classes.
 * @constructor
 * @param {GZ3D.Scene} scene - A scene to connect to
 */
GZ3D.GZIface = function(scene, url)
{
  this.emitter = globalEmitter || new EventEmitter2({verboseMemoryLeak: true});
  this.scene = scene;
  this.url = url || (location.hostname + ':' + location.port);

  this.isConnected = false;

  this.material = [];
  this.entityMaterial = {};

  this.connect();
  this.visualsToAdd = [];

  this.numConnectionTrials = 0;
  this.maxConnectionTrials = 30; // try to connect 30 times
  this.timeToSleepBtwTrials = 1000; // wait 1 second between connection trials
};

/**
 * Attempt to establish websocket connection.
 */
GZ3D.GZIface.prototype.connect = function()
{
  this.webSocket = new ROSLIB.Ros({
    url : 'ws://' + this.url
  });

  var that = this;
  this.webSocket.on('connection', function() {
    that.onConnected();
  });
  this.webSocket.on('error', function() {
    that.onError();
  });

  this.numConnectionTrials++;
};

/**
 * Callback when the websocket fails to connect.
 */
GZ3D.GZIface.prototype.onError = function()
{
  // Notify others about connection failure only once
  if (this.numConnectionTrials === 1)
  {
    this.emitter.emit('connectionError');
  }

  var that = this;
  // retry to connect after certain time
  if (this.numConnectionTrials < this.maxConnectionTrials)
  {
    setTimeout(function() {
      that.connect();
    }, this.timeToSleepBtwTrials);
  }
};

/**
 * Callback when the websocket connects successfully.
 */
GZ3D.GZIface.prototype.onConnected = function()
{
  this.isConnected = true;
  this.emitter.emit('connection');

  this.heartbeatTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/heartbeat',
    messageType : 'heartbeat',
  });

  var that = this;
  var publishHeartbeat = function()
  {
    var hearbeatMsg =
    {
      alive : 1
    };
    that.heartbeatTopic.publish(hearbeatMsg);
  };

  setInterval(publishHeartbeat, 5000);

  var statusTopic = new ROSLIB.Topic({
    ros: this.webSocket,
    name: '~/status',
    messageType : 'status',
  });

  var statusUpdate = function(message)
  {
    if (message.status === 'error')
    {
      that.isConnected = false;
      this.emitter.emit('gzstatus', 'error');
    }
  };
  statusTopic.subscribe(statusUpdate.bind(this));

  var materialTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/material',
    messageType : 'material',
  });

  var materialUpdate = function(message)
  {
    this.material = message;
    this.emitter.emit('material', this.material);

  };
  materialTopic.subscribe(materialUpdate.bind(this));

  this.sceneTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/scene',
    messageType : 'scene',
  });

  var sceneUpdate = function(message)
  {
    if (message.name)
    {
      this.scene.name = message.name;
    }

    if (message.grid === true)
    {
      this.emitter.emit('show_grid', 'show');
    }

    if (message.ambient)
    {
      var ambient = new THREE.Color();
      ambient.r = message.ambient.r;
      ambient.g = message.ambient.g;
      ambient.b = message.ambient.b;

      this.scene.ambient.color = ambient;
    }

    if (message.background)
    {
      var background = new THREE.Color();
      background.r = message.background.r;
      background.g = message.background.g;
      background.b = message.background.b;

      this.scene.renderer.clear();
      this.scene.renderer.setClearColor(background, 1);
    }

    for (var i = 0; i < message.light.length; ++i)
    {
      var light = message.light[i];
      var lightObj = this.createLightFromMsg(light);
      this.scene.add(lightObj);
      this.emitter.emit('setLightStats', light, 'update');
    }

    for (var j = 0; j < message.model.length; ++j)
    {
      var model = message.model[j];
      var modelObj = this.createModelFromMsg(model);
      this.scene.add(modelObj);
      this.emitter.emit('setModelStats', model, 'update');
    }

    this.emitter.emit('setSceneStats', message);
    this.sceneTopic.unsubscribe();
  };
  this.sceneTopic.subscribe(sceneUpdate.bind(this));

  this.physicsTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/physics',
    messageType : 'physics',
  });

  var physicsUpdate = function(message)
  {
    this.emitter.emit('setPhysicsStats', message);
  };
  this.physicsTopic.subscribe(physicsUpdate.bind(this));

  // Update model pose
  var poseTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/pose/info',
    messageType : 'pose',
  });

  var poseUpdate = function(message)
  {
    var entity = this.scene.getByName(message.name);
    if (entity && entity !== this.scene.modelManipulator.object
        && entity.parent !== this.scene.modelManipulator.object)
    {
      this.scene.updatePose(entity, message.position, message.orientation);
      this.emitter.emit('setModelStats', message, 'update');
    }
  };

  poseTopic.subscribe(poseUpdate.bind(this));

  // Requests - for deleting models
  var requestTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/request',
    messageType : 'request',
  });

  var requestUpdate = function(message)
  {
    if (message.request === 'entity_delete')
    {
      var entity = this.scene.getByName(message.data);
      if (entity)
      {
        if (entity.children[0] instanceof THREE.Light)
        {
          this.emitter.emit('setLightStats', {name: message.data}, 'delete');
          this.emitter.emit('notification_popup', message.data+' deleted');
        }
        else
        {
          this.emitter.emit('setModelStats', {name: message.data}, 'delete');
          this.emitter.emit('notification_popup', message.data+' deleted');
        }
        this.scene.remove(entity);
      }
    }
  };

  requestTopic.subscribe(requestUpdate.bind(this));

  // Model info messages - currently used for spawning new models
  var modelInfoTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/model/info',
    messageType : 'model',
  });

  var modelUpdate = function(message)
  {
    if (!this.scene.getByName(message.name))
    {
      var modelObj = this.createModelFromMsg(message);
      if (modelObj)
      {
        this.scene.add(modelObj);
        this.emitter.emit('notification_popup', message.name+' inserted');
      }

      // visuals may arrive out of order (before the model msg),
      // add the visual in if we find its parent here
      var len = this.visualsToAdd.length;
      var i = 0;
      var j = 0;
      while (i < len)
      {
        var parentName = this.visualsToAdd[j].parent_name;
        if (parentName.indexOf(modelObj.name) >=0)
        {
          var parent = this.scene.getByName(parentName);
          var visualObj = this.createVisualFromMsg(this.visualsToAdd[j]);
          parent.add(visualObj);
          this.visualsToAdd.splice(j, 1);
        }
        else
        {
          j++;
        }
        i++;
      }
    }
    this.emitter.emit('setModelStats', message, 'update');
  };

  modelInfoTopic.subscribe(modelUpdate.bind(this));

  // Visual messages - currently just used for collision visuals
  var visualTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/visual',
    messageType : 'visual',
  });

  var visualUpdate = function(message)
  {
    if (!this.scene.getByName(message.name))
    {
      // accept only collision visual msgs for now
      if (message.name.indexOf('COLLISION_VISUAL') < 0)
      {
        return;
      }

      // delay the add if parent not found, this array will checked in
      // modelUpdate function
      var parent = this.scene.getByName(message.parent_name);
      if (message.parent_name && !parent)
      {
        this.visualsToAdd.push(message);
      }
      else
      {
        var visualObj = this.createVisualFromMsg(message);
        parent.add(visualObj);
      }
    }
  };

  visualTopic.subscribe(visualUpdate.bind(this));

  // world stats
  var worldStatsTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/world_stats',
    messageType : 'world_stats',
  });

  var worldStatsUpdate = function(message)
  {
    this.forwardWorldStats(message);
  };

  worldStatsTopic.subscribe(worldStatsUpdate.bind(this));

  // Spawn new lights
  var lightFactoryTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/factory/light',
    messageType : 'light',
  });

  var lightCreate = function(message)
  {
    var entity = this.scene.getByName(message.name);
    if (!entity)
    {
      var lightObj = this.createLightFromMsg(message);
      this.scene.add(lightObj);

      // For the inserted light to have effect
      var allObjects = [];
      this.scene.scene.getDescendants(allObjects);
      for (var l = 0; l < allObjects.length; ++l)
      {
        if (allObjects[l].material)
        {
          allObjects[l].material.needsUpdate = true;
        }
      }

      this.emitter.emit('notification_popup', message.name+' inserted');
    }
    this.emitter.emit('setLightStats', message, 'update');
  };

  lightFactoryTopic.subscribe(lightCreate.bind(this));

  // Update existing lights
  var lightModifyTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/light/modify',
    messageType : 'light',
  });

  var lightUpdate = function(message)
  {
    var entity = this.scene.getByName(message.name);
    if (entity && entity !== this.scene.modelManipulator.object
        && entity.parent !== this.scene.modelManipulator.object)
    {
      this.scene.updateLight(entity, message);
      this.emitter.emit('setLightStats', message, 'update');
    }
  };

  lightModifyTopic.subscribe(lightUpdate.bind(this));

  // heightmap
  this.heightmapDataService = new ROSLIB.Service({
    ros : this.webSocket,
    name : '~/heightmap_data',
    serviceType : 'heightmap_data'
  });

  // road
  this.roadService = new ROSLIB.Service({
    ros : this.webSocket,
    name : '~/roads',
    serviceType : 'roads'
  });

  var request = new ROSLIB.ServiceRequest({
      name : 'roads'
  });

  // send service request and load road on response
  this.roadService.callService(request,
  function(result)
  {
    var roadsObj = that.createRoadsFromMsg(result);
    this.scene.add(roadsObj);
  });

  // Model modify messages - for modifying models
  this.modelModifyTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/model/modify',
    messageType : 'model',
  });

  // Light messages - for modifying lights
  this.lightModifyTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/light/modify',
    messageType : 'light',
  });

  var publishEntityModify = function(entity)
  {
    var matrix = entity.matrixWorld;
    var translation = new THREE.Vector3();
    var quaternion = new THREE.Quaternion();
    var scale = new THREE.Vector3();
    matrix.decompose(translation, quaternion, scale);

    var entityMsg =
    {
      name : entity.name,
      id : entity.userData.id,
      createEntity : 0,
      position :
      {
        x : translation.x,
        y : translation.y,
        z : translation.z
      },
      orientation :
      {
        w: quaternion.w,
        x: quaternion.x,
        y: quaternion.y,
        z: quaternion.z
      }
    };
    if (entity.children[0] &&
        entity.children[0] instanceof THREE.Light)
    {
      entityMsg.diffuse =
      {
        r: entity.children[0].color.r,
        g: entity.children[0].color.g,
        b: entity.children[0].color.b
      };
      entityMsg.specular =
      {
        r: entity.serverProperties.specular.r,
        g: entity.serverProperties.specular.g,
        b: entity.serverProperties.specular.b
      };
      entityMsg.direction = entity.direction;
      entityMsg.range = entity.children[0].distance;
      entityMsg.attenuation_constant =
        entity.serverProperties.attenuation_constant;
      entityMsg.attenuation_linear = entity.serverProperties.attenuation_linear;
      entityMsg.attenuation_quadratic =
        entity.serverProperties.attenuation_quadratic;

      that.lightModifyTopic.publish(entityMsg);
    }
    else
    {
      that.modelModifyTopic.publish(entityMsg);
    }
  };

  this.emitter.on('entityChanged', publishEntityModify);

  // Link messages - for modifying links
  this.linkModifyTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/link',
    messageType : 'link',
  });

  var publishLinkModify = function(entity, type)
  {
    var modelMsg =
    {
      name : entity.parent.name,
      id : entity.parent.userData.id,
      link:
      {
        name: entity.name,
        id: entity.userData.id,
        self_collide: entity.serverProperties.self_collide,
        gravity: entity.serverProperties.gravity,
        kinematic: entity.serverProperties.kinematic
      }
    };

    that.linkModifyTopic.publish(modelMsg);
  };

  this.emitter.on('linkChanged', publishLinkModify);

  // Factory messages - for spawning new models
  this.factoryTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/factory',
    messageType : 'factory',
  });

  // Factory messages - for spawning new lights
  this.lightFactoryTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/factory/light',
    messageType : 'light',
  });

  var publishFactory = function(model, type)
  {
    var matrix = model.matrixWorld;
    var translation = new THREE.Vector3();
    var quaternion = new THREE.Quaternion();
    var scale = new THREE.Vector3();
    matrix.decompose(translation, quaternion, scale);
    var entityMsg =
    {
      name : model.name,
      type : type,
      createEntity : 1,
      position :
      {
        x : translation.x,
        y : translation.y,
        z : translation.z
      },
      orientation :
      {
        w: quaternion.w,
        x: quaternion.x,
        y: quaternion.y,
        z: quaternion.z
      }
    };
    if (model.children[0].children[0] instanceof THREE.Light)
    {
      that.lightFactoryTopic.publish(entityMsg);
    }
    else
    {
      that.factoryTopic.publish(entityMsg);
    }
  };

  // For deleting models
  this.deleteTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/entity_delete',
    messageType : 'entity_delete',
  });

  var publishDeleteEntity = function(entity)
  {
    var modelMsg =
    {
      name: entity.name
    };

    that.deleteTopic.publish(modelMsg);
  };

  this.emitter.on('deleteEntity',
      function(entity)
      {
        publishDeleteEntity(entity);
      }
  );

  // World control messages - for resetting world/models
  this.worldControlTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/world_control',
    messageType : 'world_control',
  });

  var publishWorldControl = function(state, resetType)
  {
    var worldControlMsg = {};
    if (state !== null)
    {
      worldControlMsg.pause = state;
    }
    if (resetType)
    {
      worldControlMsg.reset = resetType;
    }
    that.worldControlTopic.publish(worldControlMsg);
  };

  this.emitter.on('entityCreated', publishFactory);

  this.emitter.on('reset',
      function(resetType)
      {
        publishWorldControl(null, resetType);
      }
  );

  this.emitter.on('pause',
      function(paused)
      {
        publishWorldControl(paused, null);
      }
  );

  // Log play control messages
  this.playbackControlTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/playback_control',
    messageType : 'playback_control',
  });

  var publishPlaybackControl = function(playbackControl)
  {
    that.playbackControlTopic.publish(playbackControl);
  };

  this.emitter.on('logPlayChanged', publishPlaybackControl);
};

/**
 * Emit events with latest world stats
 * @param {Object} stats - World statistics message
 */
GZ3D.GZIface.prototype.forwardWorldStats = function(stats)
{
  if (stats.paused !== undefined)
  {
    this.emitter.emit('setPaused', stats.paused);
  }

  if (stats.log_playback_stats)
  {
    this.emitter.emit('setLogPlayVisible', true);
    this.emitter.emit('setLogPlayStats', stats.sim_time,
        stats.log_playback_stats.start_time,
        stats.log_playback_stats.end_time);
  }
  else
  {
    this.emitter.emit('setLogPlayVisible', false);
    this.emitter.emit('setRealTime', stats.real_time);
  }

  this.emitter.emit('setSimTime', stats.sim_time);
};

/**
 * Create new model based on a message.
 * @param {Object} model - Model message
 * @return {Object} Model object
 */
GZ3D.GZIface.prototype.createModelFromMsg = function(model)
{
  var modelObj = new THREE.Object3D();
  modelObj.name = model.name;
  modelObj.userData.id = model.id;
  if (model.pose)
  {
    this.scene.setPose(modelObj, model.pose.position, model.pose.orientation);
  }
  for (var j = 0; j < model.link.length; ++j)
  {
    var link = model.link[j];
    var linkObj = new THREE.Object3D();
    linkObj.name = link.name;
    linkObj.userData.id = link.id;
    linkObj.serverProperties =
        {
          self_collide: link.self_collide,
          gravity: link.gravity,
          kinematic: link.kinematic
        };

    if (link.inertial)
    {
      var inertialPose, inertialMass, inertia = {};
      linkObj.userData.inertial = {};
      inertialPose = link.inertial.pose;
      inertialMass = link.inertial.mass;
      inertia.ixx = link.inertial.ixx;
      inertia.ixy = link.inertial.ixy;
      inertia.ixz = link.inertial.ixz;
      inertia.iyy = link.inertial.iyy;
      inertia.iyz = link.inertial.iyz;
      inertia.izz = link.inertial.izz;
      linkObj.userData.inertial.inertia = inertia;
      if (inertialMass)
      {
        linkObj.userData.inertial.mass = inertialMass;
      }
      if (inertialPose)
      {
        linkObj.userData.inertial.pose = inertialPose;
      }
    }

    if (link.pose)
    {
      this.scene.setPose(linkObj, link.pose.position,
          link.pose.orientation);
    }
    modelObj.add(linkObj);
    for (var k = 0; k < link.visual.length; ++k)
    {
      var visual = link.visual[k];
      var visualObj = this.createVisualFromMsg(visual);
      if (visualObj && !visualObj.parent)
      {
        linkObj.add(visualObj);
      }
    }

    for (var l = 0; l < link.collision.length; ++l)
    {
      var collision = link.collision[l];
      for (var m = 0; m < link.collision[l].visual.length; ++m)
      {
        var collisionVisual = link.collision[l].visual[m];
        var collisionVisualObj = this.createVisualFromMsg(collisionVisual);
        if (collisionVisualObj && !collisionVisualObj.parent)
        {
          linkObj.add(collisionVisualObj);
        }
      }
    }
  }
  if (model.joint)
  {
    modelObj.joint = model.joint;
  }

  return modelObj;
};

/**
 * Create new visual based on a message.
 * @param {Object} visual - Visual message
 * @return {Object} Visual object
 */
GZ3D.GZIface.prototype.createVisualFromMsg = function(visual)
{
  if (visual.geometry)
  {
    var geom = visual.geometry;
    var visualObj = new THREE.Object3D();
    visualObj.name = visual.name;
    if (visual.pose)
    {
      this.scene.setPose(visualObj, visual.pose.position,
          visual.pose.orientation);
    }

    visualObj.castShadow = visual.cast_shadows;
    visualObj.receiveShadow = visual.receive_shadows;

    this.createGeom(geom, visual.material, visualObj);

    return visualObj;
  }
};

/**
 * Create new light based on a message.
 * @param {Object} light - Light message
 * @return {Object} Light object
 */
GZ3D.GZIface.prototype.createLightFromMsg = function(light)
{
  var obj, range, direction;

  if (light.type === 1)
  {
    direction = null;
    range = light.range;
  }
  else if (light.type === 2)
  {
    direction = light.direction;
    range = light.range;
  }
  else if (light.type === 3)
  {
    direction = light.direction;
    range = null;
  }

  // equation taken from
  // eslint-disable-next-line
  // https://docs.blender.org/manual/en/dev/render/blender_render/lighting/lights/light_attenuation.html
  var E = 1;
  var D = 1;
  var r = 1;
  var L = light.attenuation_linear;
  var Q = light.attenuation_quadratic;
  var intensity = E*(D/(D+L*r))*(Math.pow(D,2)/(Math.pow(D,2)+Q*Math.pow(r,2)));

  obj = this.scene.createLight(light.type, light.diffuse, intensity,
        light.pose, range, light.cast_shadows, light.name,
        direction, light.specular, light.attenuation_constant,
        light.attenuation_linear, light.attenuation_quadratic);

  return obj;
};

/**
 * Create new roads based on a message.
 * @param {Object} roads - Road message
 * @return {Object} Road object
 */
GZ3D.GZIface.prototype.createRoadsFromMsg = function(roads)
{
  var roadObj = new THREE.Object3D();

  var mat = this.material['Gazebo/Road'];
  var texture = null;
  if (mat)
  {
    texture = this.parseUri('media/materials/textures/' + mat['texture']);
  }
  var obj = this.scene.createRoads(roads.point, roads.width, texture);
  roadObj.add(obj);
  return roadObj;
};

/**
 * Substitute URI scheme with 'assets' or simply prepend 'assets' if URI
 * doesn't have a scheme.
 * @param {string} uri - Full URI including scheme
 * @return {string} Updated URI
 */
GZ3D.GZIface.prototype.parseUri = function(uri)
{
  var uriPath = 'assets';
  var idx = uri.indexOf('://');
  if (idx > 0)
  {
    idx +=3;
  }
  return uriPath + '/' + uri.substring(idx);
};

/**
 * Create geometry and append it to parent
 * @param {Object} geom - geometry message
 * @param {Object} material - material message
 * @param {Object} parent - parent object (i.e. visual)
 */
GZ3D.GZIface.prototype.createGeom = function(geom, material, parent)
{
  var obj;
  var uriPath = 'assets';
  var that = this;
  var mat = this.parseMaterial(material);

  if (geom.box)
  {
    obj = this.scene.createBox(geom.box.size.x, geom.box.size.y,
        geom.box.size.z);
  }
  else if (geom.cylinder)
  {
    obj = this.scene.createCylinder(geom.cylinder.radius,
        geom.cylinder.length);
  }
  else if (geom.sphere)
  {
    obj = this.scene.createSphere(geom.sphere.radius);
  }
  else if (geom.plane)
  {
    obj = this.scene.createPlane(geom.plane.normal.x, geom.plane.normal.y,
        geom.plane.normal.z, geom.plane.size.x, geom.plane.size.y);
  }
  else if (geom.mesh)
  {
    // get model name which the mesh is in
    var rootModel = parent;
    while (rootModel.parent)
    {
      rootModel = rootModel.parent;
    }

    // find model from database, download the mesh if it exists
    // var manifestXML;
    // var manifestURI = GAZEBO_MODEL_DATABASE_URI + '/manifest.xml';
    // var request = new XMLHttpRequest();
    // request.open('GET', manifestURI, false);
    // request.onreadystatechange = function(){
    //   if (request.readyState === 4)
    //   {
    //     if (request.status === 200 || request.status === 0)
    //     {
    //         manifestXML = request.responseXML;
    //     }
    //   }
    // };
    // request.send();

    // var uriPath;
    // var modelAvailable = false;
    // var modelsElem = manifestXML.getElementsByTagName('models')[0];
    // var i;
    // for (i = 0; i < modelsElem.getElementsByTagName('uri').length; ++i)
    // {
    //   var uri = modelsElem.getElementsByTagName('uri')[i];
    //   var model = uri.substring(uri.indexOf('://') + 3);
    //   if (model === rootModel)
    //   {
    //     modelAvailable = true;
    //   }
    // }

    // if (modelAvailable)
    {
      var meshUri = geom.mesh.filename;
      var submesh = geom.mesh.submesh;
      var centerSubmesh = geom.mesh.center_submesh;

      var uriType = meshUri.substring(0, meshUri.indexOf('://'));
      var modelName = '';
      // file:// or model://
      if (uriType === 'file' || uriType === 'model')
      {
        modelName = meshUri.substring(meshUri.indexOf('://') + 3);
      }
      // absolute path - happens when an urdf model is spawned
      // into gazebo through gazebo_ros_pkgs
      else if (meshUri.length > 0 && meshUri[0] === '/')
      {
        // hacky but try to guess the model name from uri based on the
        // meshes directory string
        var idx = meshUri.indexOf('/meshes/');
        if (idx > 1)
        {
          modelName = meshUri.substring(meshUri.lastIndexOf('/', idx-1));
        }
      }
      if (modelName.length > 0)
      {
        if (geom.mesh.scale)
        {
          parent.scale.x = geom.mesh.scale.x;
          parent.scale.y = geom.mesh.scale.y;
          parent.scale.z = geom.mesh.scale.z;
        }

        var modelUri = uriPath + '/' + modelName;
        // Use coarse version on touch devices
        if (modelUri.indexOf('.dae') !== -1 && isTouchDevice)
        {
          modelUri = modelUri.substring(0,modelUri.indexOf('.dae'));

          var checkModel = new XMLHttpRequest();
          checkModel.open('HEAD', modelUri+'_coarse.dae', false);
          checkModel.send();
          if (checkModel.status === 404)
          {
            modelUri = modelUri+'.dae';
          }
          else
          {
            modelUri = modelUri+'_coarse.dae';
          }
        }

        var ext = modelUri.substr(-4).toLowerCase();
        var materialName = parent.name + '::' + modelUri;
        this.entityMaterial[materialName] = mat;

        modelUri = 'http://' + this.url + '/' + modelUri;

        this.scene.loadMeshFromUri(modelUri, submesh, centerSubmesh,
          function(mesh) {
            if (mat)
            {
              // Because the stl mesh doesn't have any children we cannot set
              // the materials like other mesh types.
              if (modelUri.indexOf('.stl') === -1)
              {
                var allChildren = [];
                mesh.getDescendants(allChildren);
                for (var c = 0; c < allChildren.length; ++c)
                {
                  if (allChildren[c] instanceof THREE.Mesh)
                  {
                    that.scene.setMaterial(allChildren[c], mat);
                    break;
                  }
                }
              }
              else
              {
                that.scene.setMaterial(mesh, mat);
              }
            }
            else
            {
              if (ext === '.stl')
              {
                that.scene.setMaterial(mesh, {'ambient': [1,1,1,1]});
              }
            }
            parent.add(mesh);
            loadGeom(parent);
        });
      }
    }
  }
  else if (geom.heightmap)
  {
    var request = new ROSLIB.ServiceRequest({
      name : that.scene.name
    });

    // redirect the texture paths to the assets dir
    var textures = geom.heightmap.texture;
    for ( var k = 0; k < textures.length; ++k)
    {
      textures[k].diffuse = this.parseUri(textures[k].diffuse);
      textures[k].normal = this.parseUri(textures[k].normal);
    }

    var sizes = geom.heightmap.size;

    // send service request and load heightmap on response
    this.heightmapDataService.callService(request,
        function(result)
        {
          var heightmap = result.heightmap;
          // gazebo heightmap is always square shaped,
          // and a dimension of: 2^N + 1
          that.scene.loadHeightmap(heightmap.heights, heightmap.size.x,
              heightmap.size.y, heightmap.width, heightmap.height,
              heightmap.origin, textures,
              geom.heightmap.blend, parent);
            //console.log('Result for service call on ' + result);
        });

    //this.scene.loadHeightmap(parent)
  }

  if (obj)
  {
    if (mat)
    {
      // texture mapping for simple shapes and planes only,
      // not used by mesh and terrain
      this.scene.setMaterial(obj, mat);
    }
    obj.updateMatrix();
    parent.add(obj);
    loadGeom(parent);
  }

  function loadGeom(visualObj)
  {
    var allChildren = [];
    visualObj.getDescendants(allChildren);
    for (var c = 0; c < allChildren.length; ++c)
    {
      if (allChildren[c] instanceof THREE.Mesh)
      {
        allChildren[c].castShadow = true;
        allChildren[c].receiveShadow = true;

        if (visualObj.castShadows)
        {
          allChildren[c].castShadow = visualObj.castShadows;
        }
        if (visualObj.receiveShadows)
        {
          allChildren[c].receiveShadow = visualObj.receiveShadows;
        }

        if (visualObj.name.indexOf('COLLISION_VISUAL') >= 0)
        {
          allChildren[c].castShadow = false;
          allChildren[c].receiveShadow = false;

          allChildren[c].visible = this.scene.showCollisions;
        }
        break;
      }
    }
  }
};

/**
 * Parse a material message and return an object containing its properties.
 * @param {Object} material - material message
 * @return Object containing material properties
 */
GZ3D.GZIface.prototype.parseMaterial = function(material)
{
  if (!material)
  {
    return null;
  }

  var uriPath = 'http://' + this.url + '/assets';
  var texture;
  var normalMap;
  var textureUri;
  var ambient;
  var diffuse;
  var specular;
  var opacity;
  var scale;
  var mat;

  // get texture from material script
  var script  = material.script;
  if (script)
  {
    if (script.name)
    {
      mat = this.material[script.name];
      if (mat)
      {
        ambient = mat['ambient'];
        diffuse = mat['diffuse'];
        specular = mat['specular'];
        opacity = mat['opacity'];
        scale = mat['scale'];

        var textureName = mat['texture'];
        if (textureName)
        {
          for (var i = 0; i < script.uri.length; ++i)
          {
            // handle the weird case where empty scripts become converted to
            // a single '__default__' script
            var scriptUri = script.uri[i];
            if (scriptUri === '__default__')
            {
              scriptUri = 'file://media/materials/scripts/gazebo.material';
            }

            var type = scriptUri.substring(0,
                  scriptUri.indexOf('://'));

            if (type === 'model')
            {
              if (scriptUri.indexOf('textures') > 0)
              {
                textureUri = scriptUri.substring(
                    scriptUri.indexOf('://') + 3);
                break;
              }
            }
            else if (type === 'file')
            {
              if (scriptUri.indexOf('materials') > 0)
              {
                textureUri = scriptUri.substring(
                    scriptUri.indexOf('://') + 3,
                    scriptUri.indexOf('materials') + 9) + '/textures';
                break;
              }
            }
          }
          if (textureUri)
          {
            texture = uriPath + '/' +
                textureUri  + '/' + textureName;
          }
        }
      }
    }
  }

  // normal map
  if (material.normal_map)
  {
    var mapUri;
    if (material.normal_map.indexOf('://') > 0)
    {
      mapUri = material.normal_map.substring(
          material.normal_map.indexOf('://') + 3,
          material.normal_map.lastIndexOf('/'));
    }
    else
    {
      mapUri = textureUri;
    }
    if (mapUri)
    {
      var startIndex = material.normal_map.lastIndexOf('/') + 1;
      if (startIndex < 0)
      {
        startIndex = 0;
      }
      var normalMapName = material.normal_map.substr(startIndex,
          material.normal_map.lastIndexOf('.') - startIndex);
      normalMap = uriPath + '/' +
        mapUri  + '/' + normalMapName + '.png';
    }
  }

  return {
      texture: texture,
      normalMap: normalMap,
      ambient: ambient,
      diffuse: diffuse,
      specular: specular,
      opacity: opacity,
      scale: scale
  };
};

/*GZ3D.GZIface.prototype.createGeom = function(geom, material, parent)
{
  var obj;

  var uriPath = 'assets';
  var texture;
  var normalMap;
  var textureUri;
  var mat;
  if (material)
  {
    // get texture from material script
    var script  = material.script;
    if (script)
    {
      if (script.uri.length > 0)
      {
        if (script.name)
        {
          mat = this.material[script.name];
          if (mat)
          {
            var textureName = mat['texture'];
            if (textureName)
            {
              for (var i = 0; i < script.uri.length; ++i)
              {
                var type = script.uri[i].substring(0,
                      script.uri[i].indexOf('://'));

                if (type === 'model')
                {
                  if (script.uri[i].indexOf('textures') > 0)
                  {
                    textureUri = script.uri[i].substring(
                        script.uri[i].indexOf('://') + 3);
                    break;
                  }
                }
                else if (type === 'file')
                {
                  if (script.uri[i].indexOf('materials') > 0)
                  {
                    textureUri = script.uri[i].substring(
                        script.uri[i].indexOf('://') + 3,
                        script.uri[i].indexOf('materials') + 9) + '/textures';
                    break;
                  }
                }
              }
              if (textureUri)
              {
                texture = uriPath + '/' +
                    textureUri  + '/' + textureName;
              }
            }
          }
        }
      }
    }
    // normal map
    if (material.normal_map)
    {
      var mapUri;
      if (material.normal_map.indexOf('://') > 0)
      {
        mapUri = material.normal_map.substring(
            material.normal_map.indexOf('://') + 3,
            material.normal_map.lastIndexOf('/'));
      }
      else
      {
        mapUri = textureUri;
      }
      if (mapUri)
      {
        var startIndex = material.normal_map.lastIndexOf('/') + 1;
        if (startIndex < 0)
        {
          startIndex = 0;
        }
        var normalMapName = material.normal_map.substr(startIndex,
            material.normal_map.lastIndexOf('.') - startIndex);
        normalMap = uriPath + '/' +
          mapUri  + '/' + normalMapName + '.png';
      }

    }
  }

  if (geom.box)
  {
    obj = this.scene.createBox(geom.box.size.x, geom.box.size.y,
        geom.box.size.z);
  }
  else if (geom.cylinder)
  {
    obj = this.scene.createCylinder(geom.cylinder.radius,
        geom.cylinder.length);
  }
  else if (geom.sphere)
  {
    obj = this.scene.createSphere(geom.sphere.radius);
  }
  else if (geom.plane)
  {
    obj = this.scene.createPlane(geom.plane.normal.x, geom.plane.normal.y,
        geom.plane.normal.z, geom.plane.size.x, geom.plane.size.y);
  }
  else if (geom.mesh)
  {
    // get model name which the mesh is in
    var rootModel = parent;
    while (rootModel.parent)
    {
      rootModel = rootModel.parent;
    }

    {
      var meshUri = geom.mesh.filename;
      var submesh = geom.mesh.submesh;
      var centerSubmesh = geom.mesh.center_submesh;

      console.log(geom.mesh.filename + ' ' + submesh);

      var uriType = meshUri.substring(0, meshUri.indexOf('://'));
      if (uriType === 'file' || uriType === 'model')
      {
        var modelName = meshUri.substring(meshUri.indexOf('://') + 3);
        if (geom.mesh.scale)
        {
          parent.scale.x = geom.mesh.scale.x;
          parent.scale.y = geom.mesh.scale.y;
          parent.scale.z = geom.mesh.scale.z;
        }

        this.scene.loadMesh(uriPath + '/' + modelName, submesh, centerSubmesh,
            texture, normalMap, parent);
      }
    }
  }
  else if (geom.heightmap)
  {
    var that = this;
    var request = new ROSLIB.ServiceRequest({
      name : that.scene.name
    });

    // redirect the texture paths to the assets dir
    var textures = geom.heightmap.texture;
    for ( var k = 0; k < textures.length; ++k)
    {
      textures[k].diffuse = this.parseUri(textures[k].diffuse);
      textures[k].normal = this.parseUri(textures[k].normal);
    }

    var sizes = geom.heightmap.size;

    // send service request and load heightmap on response
    this.heightmapDataService.callService(request,
        function(result)
        {
          var heightmap = result.heightmap;
          // gazebo heightmap is always square shaped,
          // and a dimension of: 2^N + 1
          that.scene.loadHeightmap(heightmap.heights, heightmap.size.x,
              heightmap.size.y, heightmap.width, heightmap.height,
              heightmap.origin, textures,
              geom.heightmap.blend, parent);
            //console.log('Result for service call on ' + result);
        });

    //this.scene.loadHeightmap(parent)
  }

  // texture mapping for simple shapes and planes only,
  // not used by mesh and terrain
  if (obj)
  {

    if (mat)
    {
      obj.material = new THREE.MeshPhongMaterial();

      var ambient = mat['ambient'];
      if (ambient)
      {
        obj.material.ambient.setRGB(ambient[0], ambient[1], ambient[2]);
      }
      var diffuse = mat['diffuse'];
      if (diffuse)
      {
        obj.material.color.setRGB(diffuse[0], diffuse[1], diffuse[2]);
      }
      var specular = mat['specular'];
      if (specular)
      {
        obj.material.specular.setRGB(specular[0], specular[1], specular[2]);
      }
      var opacity = mat['opacity'];
      if (opacity)
      {
        if (opacity < 1)
        {
          obj.material.transparent = true;
          obj.material.opacity = opacity;
        }
      }

      //this.scene.setMaterial(obj, texture, normalMap);

      if (texture)
      {
        obj.material.map = THREE.ImageUtils.loadTexture(texture);
      }
      if (normalMap)
      {
        obj.material.normalMap = THREE.ImageUtils.loadTexture(normalMap);
      }
    }
    obj.updateMatrix();
    parent.add(obj);
  }
};
*/
