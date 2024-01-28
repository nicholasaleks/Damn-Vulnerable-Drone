/**
 * The scene is where everything is placed, from objects, to lights and cameras.
 *
 * Supports radial menu on an orthographic scene when gzradialmenu.js has been
 * included (useful for mobile devices).
 *
 * @param shaders GZ3D.Shaders instance, if not provided, custom shaders will
 *                not be set.
 * @constructor
 */
GZ3D.Scene = function(shaders)
{
  this.emitter = globalEmitter || new EventEmitter2({verboseMemoryLeak: true});
  this.shaders = shaders;
  this.init();
};

/**
 * Initialize scene
 */
GZ3D.Scene.prototype.init = function()
{
  this.name = 'default';
  this.scene = new THREE.Scene();
  // this.scene.name = this.name;
  this.meshes = {};

  // only support one heightmap for now.
  this.heightmap = null;

  this.selectedEntity = null;

  this.manipulationMode = 'view';
  this.pointerOnMenu = false;

  // loaders
  this.textureLoader = new THREE.TextureLoader();
  this.textureLoader.crossOrigin = '';
  this.colladaLoader = new THREE.ColladaLoader();
  this.objLoader = new THREE.OBJLoader();
  this.stlLoader = new THREE.STLLoader();

  this.renderer = new THREE.WebGLRenderer({antialias: true });
  this.renderer.setPixelRatio(window.devicePixelRatio);
  this.renderer.setClearColor(0xb2b2b2, 1);
  this.renderer.autoClear = false;
  // this.renderer.shadowMapEnabled = true;
  // this.renderer.shadowMapSoft = true;

  // lights
  this.ambient = new THREE.AmbientLight( 0x666666 );
  this.scene.add(this.ambient);

  // camera
  var width = this.getDomElement().width;
  var height = this.getDomElement().height;
  this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  this.defaultCameraPosition = new THREE.Vector3(4.71707, -4.27718, 1.55);
  this.resetView();

  // Ortho camera and scene for rendering sprites
  // Currently only used for the radial menu
  if (typeof GZ3D.RadialMenu === 'function')
  {
    this.cameraOrtho = new THREE.OrthographicCamera(-width * 0.5, width * 0.5,
        height*0.5, -height*0.5, 1, 10);
    this.cameraOrtho.position.z = 10;
    this.sceneOrtho = new THREE.Scene();

    // Radial menu (only triggered by touch)
    this.radialMenu = new GZ3D.RadialMenu(this.getDomElement());
    this.sceneOrtho.add(this.radialMenu.menu);
  }

  // Grid
  this.grid = new THREE.GridHelper(20, 20, 0xCCCCCC, 0x4D4D4D);
  this.grid.name = 'grid';
  this.grid.position.z = 0.05;
  this.grid.rotation.x = Math.PI * 0.5;
  this.grid.castShadow = false;
  this.grid.material.transparent = true;
  this.grid.material.opacity = 0.5;
  this.grid.visible = false;
  this.scene.add(this.grid);

  this.showCollisions = false;

  this.spawnModel = new GZ3D.SpawnModel(
      this, this.getDomElement());

  this.simpleShapesMaterial = new THREE.MeshPhongMaterial(
      {color:0xffffff, shading: THREE.SmoothShading} );

  var that = this;

  // Only capture events inside the webgl div element.
  this.getDomElement().addEventListener( 'mouseup',
      function(event) {that.onPointerUp(event);}, false );

  this.getDomElement().addEventListener( 'mousedown',
      function(event) {that.onPointerDown(event);}, false );

  this.getDomElement().addEventListener( 'DOMMouseScroll',
      function(event) {that.onMouseScroll(event);}, false ); //firefox

  this.getDomElement().addEventListener( 'mousewheel',
      function(event) {that.onMouseScroll(event);}, false );

  this.getDomElement().addEventListener( 'touchstart',
      function(event) {that.onPointerDown(event);}, false );

  this.getDomElement().addEventListener( 'touchend',
      function(event) {that.onPointerUp(event);}, false );

  // Handles for translating and rotating objects
  this.modelManipulator = new GZ3D.Manipulator(this.camera, isTouchDevice,
      this.getDomElement());

  this.timeDown = null;

  this.controls = new THREE.OrbitControls(this.camera,
      this.getDomElement());
  this.scene.add(this.controls.targetIndicator);

  // Bounding Box
  var indices = new Uint16Array(
      [ 0, 1, 1, 2, 2, 3, 3, 0,
        4, 5, 5, 6, 6, 7, 7, 4,
        0, 4, 1, 5, 2, 6, 3, 7 ] );
  var positions = new Float32Array(8 * 3);
  var boxGeometry = new THREE.BufferGeometry();
  boxGeometry.setIndex(new THREE.BufferAttribute( indices, 1 ));
  boxGeometry.addAttribute( 'position',
      new THREE.BufferAttribute(positions, 3));
  this.boundingBox = new THREE.LineSegments(boxGeometry,
      new THREE.LineBasicMaterial({color: 0xffffff}));

  this.boundingBox.visible = false;

  // Joint visuals
  this.jointTypes =
      {
        REVOLUTE: 1,
        REVOLUTE2: 2,
        PRISMATIC: 3,
        UNIVERSAL: 4,
        BALL: 5,
        SCREW: 6,
        GEARBOX: 7,
        FIXED: 8
      };
  this.jointAxis = new THREE.Object3D();
  this.jointAxis.name = 'JOINT_VISUAL';
  var geometry, material, mesh;

  // XYZ
  var XYZaxes = new THREE.Object3D();

  geometry = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 10, 1, false);

  material = new THREE.MeshBasicMaterial({color: new THREE.Color(0xff0000)});
  mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = 0.15;
  mesh.rotation.z = -Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  XYZaxes.add(mesh);

  material = new THREE.MeshBasicMaterial({color: new THREE.Color(0x00ff00)});
  mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.15;
  mesh.name = 'JOINT_VISUAL';
  XYZaxes.add(mesh);

  material = new THREE.MeshBasicMaterial({color: new THREE.Color(0x0000ff)});
  mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = 0.15;
  mesh.rotation.x = Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  XYZaxes.add(mesh);

  geometry = new THREE.CylinderGeometry(0, 0.03, 0.1, 10, 1, true);

  material = new THREE.MeshBasicMaterial({color: new THREE.Color(0xff0000)});
  mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = 0.3;
  mesh.rotation.z = -Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  XYZaxes.add(mesh);

  material = new THREE.MeshBasicMaterial({color: new THREE.Color(0x00ff00)});
  mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.3;
  mesh.name = 'JOINT_VISUAL';
  XYZaxes.add(mesh);

  material = new THREE.MeshBasicMaterial({color: new THREE.Color(0x0000ff)});
  mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = 0.3;
  mesh.rotation.x = Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  XYZaxes.add(mesh);

  this.jointAxis['XYZaxes'] = XYZaxes;

  var mainAxis = new THREE.Object3D();

  material = new THREE.MeshLambertMaterial();
  material.color = new THREE.Color(0xffff00);

  var mainAxisLen = 0.3;
  geometry = new THREE.CylinderGeometry(0.015, 0.015, mainAxisLen, 36, 1,
      false);

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = mainAxisLen * 0.5;
  mesh.rotation.x = Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  mainAxis.add(mesh);

  geometry = new THREE.CylinderGeometry(0, 0.035, 0.1, 36, 1, false);

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = mainAxisLen;
  mesh.rotation.x = Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  mainAxis.add(mesh);

  this.jointAxis['mainAxis'] = mainAxis;

  var rotAxis = new THREE.Object3D();

  geometry = new THREE.TorusGeometry(0.04, 0.006, 10, 36, Math.PI * 3/2);

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = mainAxisLen;
  mesh.name = 'JOINT_VISUAL';
  rotAxis.add(mesh);

  geometry = new THREE.CylinderGeometry(0.015, 0, 0.025, 10, 1, false);

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = -0.04;
  mesh.position.z = mainAxisLen;
  mesh.rotation.z = Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  rotAxis.add(mesh);

  this.jointAxis['rotAxis'] = rotAxis;

  var transAxis = new THREE.Object3D();

  geometry = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 10, 1, true);

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = 0.03;
  mesh.position.y = 0.03;
  mesh.position.z = mainAxisLen * 0.5;
  mesh.rotation.x = Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  transAxis.add(mesh);

  geometry = new THREE.CylinderGeometry(0.02, 0, 0.0375, 10, 1, false);

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = 0.03;
  mesh.position.y = 0.03;
  mesh.position.z = mainAxisLen * 0.5 + 0.05;
  mesh.rotation.x = -Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  transAxis.add(mesh);

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = 0.03;
  mesh.position.y = 0.03;
  mesh.position.z = mainAxisLen * 0.5 - 0.05;
  mesh.rotation.x = Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  transAxis.add(mesh);

  this.jointAxis['transAxis'] = transAxis;

  var screwAxis = new THREE.Object3D();

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = -0.04;
  mesh.position.z = mainAxisLen - 0.11;
  mesh.rotation.z = -Math.PI/4;
  mesh.rotation.x = -Math.PI/10;
  mesh.name = 'JOINT_VISUAL';
  screwAxis.add(mesh);

  var radius = 0.04;
  var length = 0.02;
  var curve = new THREE.CatmullRomCurve3(
      [new THREE.Vector3(radius, 0, 0*length),
      new THREE.Vector3(0, radius, 1*length),
      new THREE.Vector3(-radius, 0, 2*length),
      new THREE.Vector3(0, -radius, 3*length),
      new THREE.Vector3(radius, 0, 4*length),
      new THREE.Vector3(0, radius, 5*length),
      new THREE.Vector3(-radius, 0, 6*length)]);
  geometry = new THREE.TubeGeometry(curve, 36, 0.01, 10, false);

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = mainAxisLen - 0.23;
  mesh.name = 'JOINT_VISUAL';
  screwAxis.add(mesh);

  this.jointAxis['screwAxis'] = screwAxis;

  var ballVisual = new THREE.Object3D();

  geometry = new THREE.SphereGeometry(0.06);

  mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'JOINT_VISUAL';
  ballVisual.add(mesh);

  this.jointAxis['ballVisual'] = ballVisual;

  // center of mass visual
  this.COMvisual = new THREE.Object3D();
  this.COMvisual.name = 'COM_VISUAL';

  geometry = new THREE.SphereGeometry(1, 32, 32);

  mesh = new THREE.Mesh(geometry);
  this.setMaterial(mesh, {'ambient':[0.5,0.5,0.5,1.000000],
    'texture':'assets/media/materials/textures/com.png'});
  mesh.name = 'COM_VISUAL';
  mesh.rotation.z = -Math.PI/2;
  this.COMvisual.add(mesh);
};

GZ3D.Scene.prototype.initScene = function()
{
  this.emitter.emit('show_grid', 'show');

  // create a sun light
  var obj = this.createLight(3, new THREE.Color(0.8, 0.8, 0.8), 0.9,
       {position: {x:0, y:0, z:10}, orientation: {x:0, y:0, z:0, w:1}},
       null, true, 'sun', {x: 0.5, y: 0.1, z: -0.9});

  this.add(obj);
};

GZ3D.Scene.prototype.setSDFParser = function(sdfParser)
{
  this.spawnModel.sdfParser = sdfParser;
};

/**
 * Window event callback
 * @param {} event - mousedown or touchdown events
 */
GZ3D.Scene.prototype.onPointerDown = function(event)
{
  event.preventDefault();

  if (this.spawnModel.active)
  {
    return;
  }

  var mainPointer = true;
  var pos;
  if (event.touches)
  {
    if (event.touches.length === 1)
    {
      pos = new THREE.Vector2(
          event.touches[0].clientX, event.touches[0].clientY);
    }
    else if (event.touches.length === 2)
    {
      pos = new THREE.Vector2(
          (event.touches[0].clientX + event.touches[1].clientX)/2,
          (event.touches[0].clientY + event.touches[1].clientY)/2);
    }
    else
    {
      return;
    }
  }
  else
  {
    pos = new THREE.Vector2(
          event.clientX, event.clientY);
    if (event.which !== 1)
    {
      mainPointer = false;
    }
  }

  var intersect = new THREE.Vector3();
  var model = this.getRayCastModel(pos, intersect);

  if (intersect)
  {
    this.controls.target = intersect;
  }

  // Cancel in case of multitouch
  if (event.touches && event.touches.length !== 1)
  {
    return;
  }

  // Manipulation modes
  // Model found
  if (model)
  {
    // Do nothing to the floor plane
    if (model.name === 'plane')
    {
      this.timeDown = new Date().getTime();
    }
    else if (this.modelManipulator.pickerNames.indexOf(model.name) >= 0)
    {
      // Do not attach manipulator to itself
    }
    // Attach manipulator to model
    else if (model.name !== '')
    {
      if (mainPointer && model.parent === this.scene)
      {
        this.selectEntity(model);
      }
    }
    // Manipulator pickers, for mouse
    else if (this.modelManipulator.hovered)
    {
      this.modelManipulator.update();
      this.modelManipulator.object.updateMatrixWorld();
    }
    // Sky
    else
    {
      this.timeDown = new Date().getTime();
    }
  }
  // Plane from below, for example
  else
  {
    this.timeDown = new Date().getTime();
  }
};

/**
 * Window event callback
 * @param {} event - mouseup or touchend events
 */
GZ3D.Scene.prototype.onPointerUp = function(event)
{
  event.preventDefault();

  // Clicks (<150ms) outside any models trigger view mode
  var millisecs = new Date().getTime();
  if (millisecs - this.timeDown < 150)
  {
    this.setManipulationMode('view');
    // TODO: Remove jquery from scene
    if (typeof GZ3D.Gui === 'function')
    {
      $( '#view-mode' ).click();
      $('input[type="radio"]').checkboxradio('refresh');
    }
  }
  this.timeDown = null;
};

/**
 * Window event callback
 * @param {} event - mousescroll event
 */
GZ3D.Scene.prototype.onMouseScroll = function(event)
{
  event.preventDefault();

  var pos = new THREE.Vector2(event.clientX, event.clientY);

  var intersect = new THREE.Vector3();
  var model = this.getRayCastModel(pos, intersect);

  if (intersect)
  {
    this.controls.target = intersect;
  }
};

/**
 * Window event callback
 * @param {} event - keydown events
 */
GZ3D.Scene.prototype.onKeyDown = function(event)
{
  if (event.shiftKey)
  {
    // + and - for zooming
    if (event.keyCode === 187 || event.keyCode === 189)
    {
      var pos = new THREE.Vector2(this.getDomElement().width/2.0,
          this.getDomElement().height/2.0);

      var intersect = new THREE.Vector3();
      var model = this.getRayCastModel(pos, intersect);

      if (intersect)
      {
        this.controls.target = intersect;
      }

      if (event.keyCode === 187)
      {
        this.controls.dollyOut();
      }
      else
      {
        this.controls.dollyIn();
      }
    }
  }

  // DEL to delete entities
  if (event.keyCode === 46)
  {
    if (this.selectedEntity)
    {
      this.emitter.emit('delete_entity');
    }
  }

  // F2 for turning on effects
  if (event.keyCode === 113)
  {
    this.effectsEnabled = !this.effectsEnabled;
  }

  // Esc/R/T for changing manipulation modes
  // TODO: Remove jquery from scene
  if (typeof GZ3D.Gui === 'function')
  {
    if (event.keyCode === 27) // Esc
    {
      $( '#view-mode' ).click();
      $('input[type="radio"]').checkboxradio('refresh');
    }
    if (event.keyCode === 82) // R
    {
      $( '#rotate-mode' ).click();
      $('input[type="radio"]').checkboxradio('refresh');
    }
    if (event.keyCode === 84) // T
    {
      $( '#translate-mode' ).click();
      $('input[type="radio"]').checkboxradio('refresh');
    }
  }
};

/**
 * Check if there's a model immediately under canvas coordinate 'pos'
 * @param {THREE.Vector2} pos - Canvas coordinates
 * @param {THREE.Vector3} intersect - Empty at input,
 * contains point of intersection in 3D world coordinates at output
 * @returns {THREE.Object3D} model - Intercepted model closest to the camera
 */
GZ3D.Scene.prototype.getRayCastModel = function(pos, intersect)
{
  var vector = new THREE.Vector3(
      ((pos.x - this.getDomElement().offsetLeft)
      / this.getDomElement().width) * 2 - 1,
      -((pos.y - this.getDomElement().offsetTop)
      / this.getDomElement().height) * 2 + 1, 1);
  vector.unproject(this.camera);
  var ray = new THREE.Raycaster( this.camera.position,
      vector.sub(this.camera.position).normalize() );

  var allObjects = [];
  this.scene.getDescendants(allObjects);
  var objects = ray.intersectObjects(allObjects);

  var model;
  var point;
  if (objects.length > 0)
  {
    modelsloop:
    for (var i = 0; i < objects.length; ++i)
    {
      model = objects[i].object;
      if (model.name.indexOf('_lightHelper') >= 0)
      {
        model = model.parent;
        break;
      }

      if (!this.modelManipulator.hovered &&
          (model.name === 'plane'))
      {
        // model = null;
        point = objects[i].point;
        break;
      }

      if (model.name === 'grid' || model.name === 'boundingBox' ||
          model.name === 'JOINT_VISUAL' || model.name === 'INERTIA_VISUAL'
	  || model.name === 'COM_VISUAL')
      {
        point = objects[i].point;
        model = null;
        continue;
      }

      while (model.parent !== this.scene)
      {
        // Select current mode's handle
        if (model.parent.parent === this.modelManipulator.gizmo &&
            ((this.manipulationMode === 'translate' &&
              model.name.indexOf('T') >=0) ||
             (this.manipulationMode === 'rotate' &&
               model.name.indexOf('R') >=0)))
        {
          break modelsloop;
        }
        model = model.parent;
      }

      if (this.radialMenu && model === this.radialMenu.menu)
      {
        continue;
      }

      if (model.name.indexOf('COLLISION_VISUAL') >= 0)
      {
        model = null;
        continue;
      }

      if (this.modelManipulator.hovered)
      {
        if (model === this.modelManipulator.gizmo)
        {
          break;
        }
      }
      else if (model.name !== '')
      {
        point = objects[i].point;
        break;
      }
    }
  }
  if (point)
  {
    intersect.x = point.x;
    intersect.y = point.y;
    intersect.z = point.z;
  }
  return model;
};

/**
 * Get the renderer's DOM element
 * @returns {domElement}
 */
GZ3D.Scene.prototype.getDomElement = function()
{
  return this.renderer.domElement;
};

/**
 * Render scene
 */
GZ3D.Scene.prototype.render = function()
{
  // Kill camera control when:
  // -manipulating
  // -using radial menu
  // -pointer over menus
  // -spawning
  if (this.modelManipulator.hovered ||
      (this.radialMenu && this.radialMenu.showing) ||
      this.pointerOnMenu ||
      this.spawnModel.active)
  {
    this.controls.enabled = false;
    this.controls.update();
  }
  else
  {
    this.controls.enabled = true;
    this.controls.update();
  }

  this.modelManipulator.update();
  if (this.radialMenu)
  {
    this.radialMenu.update();
  }

  this.renderer.clear();
  this.renderer.render(this.scene, this.camera);

  this.renderer.clearDepth();
  if (this.sceneOrtho && this.cameraOrtho)
  {
    this.renderer.render(this.sceneOrtho, this.cameraOrtho);
  }
};

/**
 * Set scene size.
 * @param {double} width
 * @param {double} height
 */
GZ3D.Scene.prototype.setSize = function(width, height)
{
  this.camera.aspect = width / height;
  this.camera.updateProjectionMatrix();

  if (this.cameraOrtho)
  {
    this.cameraOrtho.left = -width / 2;
    this.cameraOrtho.right = width / 2;
    this.cameraOrtho.top = height / 2;
    this.cameraOrtho.bottom = -height / 2;
    this.cameraOrtho.updateProjectionMatrix();
  }

  this.renderer.setSize(width, height);
  this.render();
};

/**
 * Add object to the scene
 * @param {THREE.Object3D} model
 */
GZ3D.Scene.prototype.add = function(model)
{
  model.viewAs = 'normal';
  this.scene.add(model);
};

/**
 * Remove object from the scene
 * @param {THREE.Object3D} model
 */
GZ3D.Scene.prototype.remove = function(model)
{
  this.scene.remove(model);
};

/**
 * Returns the object which has the given name
 * @param {string} name
 * @returns {THREE.Object3D} model
 */
GZ3D.Scene.prototype.getByName = function(name)
{
  return this.scene.getObjectByName(name);
};

/**
 * Update a model's pose
 * @param {THREE.Object3D} model
 * @param {} position
 * @param {} orientation
 */
GZ3D.Scene.prototype.updatePose = function(model, position, orientation)
{
  if (this.modelManipulator && this.modelManipulator.object &&
      this.modelManipulator.hovered)
  {
    return;
  }

  this.setPose(model, position, orientation);
};

/**
 * Set a model's pose
 * @param {THREE.Object3D} model
 * @param {} position
 * @param {} orientation
 */
GZ3D.Scene.prototype.setPose = function(model, position, orientation)
{
  model.position.x = position.x;
  model.position.y = position.y;
  model.position.z = position.z;
  model.quaternion.w = orientation.w;
  model.quaternion.x = orientation.x;
  model.quaternion.y = orientation.y;
  model.quaternion.z = orientation.z;
};

GZ3D.Scene.prototype.removeAll = function()
{
  while(this.scene.children.length > 0)
  {
    this.scene.remove(this.scene.children[0]);
  }
};

/**
 * Create plane
 * @param {double} normalX
 * @param {double} normalY
 * @param {double} normalZ
 * @param {double} width
 * @param {double} height
 * @returns {THREE.Mesh}
 */
GZ3D.Scene.prototype.createPlane = function(normalX, normalY, normalZ,
    width, height)
{
  var geometry = new THREE.PlaneGeometry(width, height, 1, 1);
  var material =  new THREE.MeshPhongMaterial();
  var mesh = new THREE.Mesh(geometry, material);
  var normal = new THREE.Vector3(normalX, normalY, normalZ);
  var cross = normal.crossVectors(normal, mesh.up);
  mesh.rotation = normal.applyAxisAngle(cross, -(normal.angleTo(mesh.up)));
  mesh.name = 'plane';
  mesh.receiveShadow = true;
  return mesh;
};

/**
 * Create sphere
 * @param {double} radius
 * @returns {THREE.Mesh}
 */
GZ3D.Scene.prototype.createSphere = function(radius)
{
  var geometry = new THREE.SphereGeometry(radius, 32, 32);
  var mesh = new THREE.Mesh(geometry, this.simpleShapesMaterial);
  return mesh;
};

/**
 * Create cylinder
 * @param {double} radius
 * @param {double} length
 * @returns {THREE.Mesh}
 */
GZ3D.Scene.prototype.createCylinder = function(radius, length)
{
  var geometry = new THREE.CylinderGeometry(radius, radius, length, 32, 1,
      false);
  var mesh = new THREE.Mesh(geometry, this.simpleShapesMaterial);
  mesh.rotation.x = Math.PI * 0.5;
  return mesh;
};

/**
 * Create box
 * @param {double} width
 * @param {double} height
 * @param {double} depth
 * @returns {THREE.Mesh}
 */
GZ3D.Scene.prototype.createBox = function(width, height, depth)
{
  var geometry = new THREE.BoxGeometry(width, height, depth, 1, 1, 1);

  // Fix UVs so textures are mapped in a way that is consistent to gazebo
  // Some face uvs need to be rotated clockwise, while others anticlockwise
  // After updating to threejs rev 62, geometries changed from quads (6 faces)
  // to triangles (12 faces).
  geometry.dynamic = true;
  var faceUVFixA = [1, 4, 5];
  var faceUVFixB = [0];
  for (var i = 0; i < faceUVFixA.length; ++i)
  {
    var idx = faceUVFixA[i]*2;
    var uva = geometry.faceVertexUvs[0][idx][0];
    geometry.faceVertexUvs[0][idx][0] = geometry.faceVertexUvs[0][idx][1];
    geometry.faceVertexUvs[0][idx][1] = geometry.faceVertexUvs[0][idx+1][1];
    geometry.faceVertexUvs[0][idx][2] = uva;

    geometry.faceVertexUvs[0][idx+1][0] = geometry.faceVertexUvs[0][idx+1][1];
    geometry.faceVertexUvs[0][idx+1][1] = geometry.faceVertexUvs[0][idx+1][2];
    geometry.faceVertexUvs[0][idx+1][2] = geometry.faceVertexUvs[0][idx][2];
  }
  for (var ii = 0; ii < faceUVFixB.length; ++ii)
  {
    var idxB = faceUVFixB[ii]*2;
    var uvc = geometry.faceVertexUvs[0][idxB][0];
    geometry.faceVertexUvs[0][idxB][0] = geometry.faceVertexUvs[0][idxB][2];
    geometry.faceVertexUvs[0][idxB][1] = uvc;
    geometry.faceVertexUvs[0][idxB][2] =  geometry.faceVertexUvs[0][idxB+1][1];

    geometry.faceVertexUvs[0][idxB+1][2] = geometry.faceVertexUvs[0][idxB][2];
    geometry.faceVertexUvs[0][idxB+1][1] = geometry.faceVertexUvs[0][idxB+1][0];
    geometry.faceVertexUvs[0][idxB+1][0] = geometry.faceVertexUvs[0][idxB][1];
  }
  geometry.uvsNeedUpdate = true;

  var mesh = new THREE.Mesh(geometry, this.simpleShapesMaterial);
  mesh.castShadow = true;
  return mesh;
};

/**
 * Create light
 * @param {} type - 1: point, 2: spot, 3: directional
 * @param {} diffuse
 * @param {} intensity
 * @param {} pose
 * @param {} distance
 * @param {} cast_shadows
 * @param {} name
 * @param {} direction
 * @param {} specular
 * @param {} attenuation_constant
 * @param {} attenuation_linear
 * @param {} attenuation_quadratic
 * @returns {THREE.Object3D}
 */
GZ3D.Scene.prototype.createLight = function(type, diffuse, intensity, pose,
    distance, cast_shadows, name, direction, specular, attenuation_constant,
    attenuation_linear, attenuation_quadratic)
{
  var obj = new THREE.Object3D();
  var color = new THREE.Color();

  if (typeof(diffuse) === 'undefined')
  {
    diffuse = 0xffffff;
  }
  else if (typeof(diffuse) !== THREE.Color)
  {
    color.r = diffuse.r;
    color.g = diffuse.g;
    color.b = diffuse.b;
    diffuse = color.clone();
  }
  else if (typeof(specular) !== THREE.Color)
  {
    color.r = specular.r;
    color.g = specular.g;
    color.b = specular.b;
    specular = color.clone();
  }

  if (pose)
  {
    this.setPose(obj, pose.position, pose.orientation);
    obj.matrixWorldNeedsUpdate = true;
  }

  var elements;
  if (type === 1)
  {
    elements = this.createPointLight(obj, diffuse, intensity,
        distance, cast_shadows);
  }
  else if (type === 2)
  {
    elements = this.createSpotLight(obj, diffuse, intensity,
        distance, cast_shadows);
  }
  else if (type === 3)
  {
    elements = this.createDirectionalLight(obj, diffuse, intensity,
        cast_shadows);
  }

  var lightObj = elements[0];
  var helper = elements[1];

  if (name)
  {
    lightObj.name = name;
    obj.name = name;
    helper.name = name + '_lightHelper';
  }

  var dir = new THREE.Vector3(0, 0, -1);
  if (direction)
  {
    dir.x = direction.x;
    dir.y = direction.y;
    dir.z = direction.z;
  }
  obj.direction = new THREE.Vector3(dir.x, dir.y, dir.z);

  var targetObj = new THREE.Object3D();
  lightObj.add(targetObj);

  targetObj.position.copy(dir);
  targetObj.matrixWorldNeedsUpdate = true;
  lightObj.target = targetObj;

  // Add properties which exist on the server but have no meaning on THREE.js
  obj.serverProperties = {};
  obj.serverProperties.specular = specular;
  obj.serverProperties.attenuation_constant = attenuation_constant;
  obj.serverProperties.attenuation_linear = attenuation_linear;
  obj.serverProperties.attenuation_quadratic = attenuation_quadratic;

  obj.add(lightObj);
  obj.add(helper);
  return obj;
};

/**
 * Create point light - called by createLight
 * @param {} obj - light object
 * @param {} color
 * @param {} intensity
 * @param {} distance
 * @param {} cast_shadows
 * @returns {Object.<THREE.Light, THREE.Mesh>}
 */
GZ3D.Scene.prototype.createPointLight = function(obj, color, intensity,
    distance, cast_shadows)
{
  if (typeof(intensity) === 'undefined')
  {
    intensity = 0.5;
  }

  var lightObj = new THREE.PointLight(color, intensity);

  if (distance)
  {
    lightObj.distance = distance;
  }
  if (cast_shadows)
  {
    lightObj.castShadow = cast_shadows;
  }

  var helperGeometry = new THREE.OctahedronGeometry(0.25, 0);
  helperGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI/2));
  var helperMaterial = new THREE.MeshBasicMaterial(
        {wireframe: true, color: 0x00ff00});
  var helper = new THREE.Mesh(helperGeometry, helperMaterial);

  return [lightObj, helper];
};

/**
 * Create spot light - called by createLight
 * @param {} obj - light object
 * @param {} color
 * @param {} intensity
 * @param {} distance
 * @param {} cast_shadows
 * @returns {Object.<THREE.Light, THREE.Mesh>}
 */
GZ3D.Scene.prototype.createSpotLight = function(obj, color, intensity,
    distance, cast_shadows)
{
  if (typeof(intensity) === 'undefined')
  {
    intensity = 1;
  }
  if (typeof(distance) === 'undefined')
  {
    distance = 20;
  }

  var lightObj = new THREE.SpotLight(color, intensity);
  lightObj.distance = distance;
  lightObj.position.set(0,0,0);

  if (cast_shadows)
  {
    lightObj.castShadow = cast_shadows;
  }

  var helperGeometry = new THREE.CylinderGeometry(0, 0.3, 0.2, 4, 1, true);
  helperGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI/2));
  helperGeometry.applyMatrix(new THREE.Matrix4().makeRotationZ(Math.PI/4));
  var helperMaterial = new THREE.MeshBasicMaterial(
        {wireframe: true, color: 0x00ff00});
  var helper = new THREE.Mesh(helperGeometry, helperMaterial);

  return [lightObj, helper];

};

/**
 * Create directional light - called by createLight
 * @param {} obj - light object
 * @param {} color
 * @param {} intensity
 * @param {} cast_shadows
 * @returns {Object.<THREE.Light, THREE.Mesh>}
 */
GZ3D.Scene.prototype.createDirectionalLight = function(obj, color, intensity,
    cast_shadows)
{
  if (typeof(intensity) === 'undefined')
  {
    intensity = 1;
  }

  var lightObj = new THREE.DirectionalLight(color, intensity);
  lightObj.shadow.camera.near = 1;
  lightObj.shadow.camera.far = 50;
  lightObj.shadow.mapSize.width = 4094;
  lightObj.shadow.mapSize.height = 4094;
  lightObj.shadow.camera.bottom = -100;
  lightObj.shadow.camera.feft = -100;
  lightObj.shadow.camera.right = 100;
  lightObj.shadow.camera.top = 100;
  lightObj.shadow.bias = 0.0001;
  lightObj.position.set(0,0,0);

  if (cast_shadows)
  {
    lightObj.castShadow = cast_shadows;
  }

  var helperGeometry = new THREE.Geometry();
  helperGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0));
  helperGeometry.vertices.push(new THREE.Vector3(-0.5,  0.5, 0));
  helperGeometry.vertices.push(new THREE.Vector3(-0.5,  0.5, 0));
  helperGeometry.vertices.push(new THREE.Vector3( 0.5,  0.5, 0));
  helperGeometry.vertices.push(new THREE.Vector3( 0.5,  0.5, 0));
  helperGeometry.vertices.push(new THREE.Vector3( 0.5, -0.5, 0));
  helperGeometry.vertices.push(new THREE.Vector3( 0.5, -0.5, 0));
  helperGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0));
  helperGeometry.vertices.push(new THREE.Vector3(   0,    0, 0));
  helperGeometry.vertices.push(new THREE.Vector3(   0,    0, -0.5));
  var helperMaterial = new THREE.LineBasicMaterial({color: 0x00ff00});
  var helper = new THREE.Line(helperGeometry, helperMaterial,
      THREE.LineSegments);

  return [lightObj, helper];
};

/**
 * Create roads
 * @param {} points
 * @param {} width
 * @param {} texture
 * @returns {THREE.Mesh}
 */
GZ3D.Scene.prototype.createRoads = function(points, width, texture)
{
  var geometry = new THREE.Geometry();
  geometry.dynamic = true;
  var texCoord = 0.0;
  var texMaxLen = width;
  var factor = 1.0;
  var curLen = 0.0;
  var tangent = new THREE.Vector3(0,0,0);
  var pA;
  var pB;
  var prevPt = new THREE.Vector3(0,0,0);
  var prevTexCoord;
  var texCoords = [];
  var j = 0;
  for (var i = 0; i < points.length; ++i)
  {
    var pt0 =  new THREE.Vector3(points[i].x, points[i].y,
        points[i].z);
    var pt1;
    if (i !== points.length - 1)
    {
      pt1 =  new THREE.Vector3(points[i+1].x, points[i+1].y,
          points[i+1].z);
    }
    factor = 1.0;
    if (i > 0)
    {
      curLen += pt0.distanceTo(prevPt);
    }
    texCoord = curLen/texMaxLen;
    if (i === 0)
    {
      tangent.x = pt1.x;
      tangent.y = pt1.y;
      tangent.z = pt1.z;
      tangent.sub(pt0);
      tangent.normalize();
    }
    else if (i === points.length - 1)
    {
      tangent.x = pt0.x;
      tangent.y = pt0.y;
      tangent.z = pt0.z;
      tangent.sub(prevPt);
      tangent.normalize();
    }
    else
    {
      var v0 = new THREE.Vector3(0,0,0);
      var v1 = new THREE.Vector3(0,0,0);
      v0.x = pt0.x;
      v0.y = pt0.y;
      v0.z = pt0.z;
      v0.sub(prevPt);
      v0.normalize();

      v1.x = pt1.x;
      v1.y = pt1.y;
      v1.z = pt1.z;
      v1.sub(pt0);
      v1.normalize();

      var dot = v0.dot(v1*-1);

      tangent.x = pt1.x;
      tangent.y = pt1.y;
      tangent.z = pt1.z;
      tangent.sub(prevPt);
      tangent.normalize();

      if (dot > -0.97 && dot < 0.97)
      {
        factor = 1.0 / Math.sin(Math.acos(dot) * 0.5);
      }
    }
    var theta = Math.atan2(tangent.x, -tangent.y);
    pA = new THREE.Vector3(pt0.x,pt0.y,pt0.z);
    pB = new THREE.Vector3(pt0.x,pt0.y,pt0.z);
    var w = (width * factor)*0.5;
    pA.x += Math.cos(theta) * w;
    pA.y += Math.sin(theta) * w;
    pB.x -= Math.cos(theta) * w;
    pB.y -= Math.sin(theta) * w;

    geometry.vertices.push(pA);
    geometry.vertices.push(pB);

    texCoords.push([0, texCoord]);
    texCoords.push([1, texCoord]);

    // draw triangle strips
    if (i > 0)
    {
      geometry.faces.push(new THREE.Face3(j, j+1, j+2,
        new THREE.Vector3(0, 0, 1)));
      geometry.faceVertexUvs[0].push(
          [new THREE.Vector2(texCoords[j][0], texCoords[j][1]),
           new THREE.Vector2(texCoords[j+1][0], texCoords[j+1][1]),
           new THREE.Vector2(texCoords[j+2][0], texCoords[j+2][1])]);
      j++;

      geometry.faces.push(new THREE.Face3(j, j+2, j+1,
        new THREE.Vector3(0, 0, 1)));
      geometry.faceVertexUvs[0].push(
          [new THREE.Vector2(texCoords[j][0], texCoords[j][1]),
           new THREE.Vector2(texCoords[j+2][0], texCoords[j+2][1]),
           new THREE.Vector2(texCoords[j+1][0], texCoords[j+1][1])]);
      j++;

    }

    prevPt.x = pt0.x;
    prevPt.y = pt0.y;
    prevPt.z = pt0.z;

    prevTexCoord = texCoord;
  }

  // geometry.computeTangents();
  geometry.computeFaceNormals();

  geometry.verticesNeedUpdate = true;
  geometry.uvsNeedUpdate = true;


  var material =  new THREE.MeshPhongMaterial();

 /* var ambient = mat['ambient'];
  if (ambient)
  {
    material.ambient.setRGB(ambient[0], ambient[1], ambient[2]);
  }
  var diffuse = mat['diffuse'];
  if (diffuse)
  {
    material.color.setRGB(diffuse[0], diffuse[1], diffuse[2]);
  }
  var specular = mat['specular'];
  if (specular)
  {
    material.specular.setRGB(specular[0], specular[1], specular[2]);
  }*/
  if (texture)
  {
    var tex = this.textureLoader.load(texture);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    material.map = tex;
  }

  var mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  return mesh;
};

/**
 * Load heightmap
 * @param {} heights Lookup table of heights
 * @param {} width Width in meters
 * @param {} height Height in meters
 * @param {} segmentWidth Size of lookup table
 * @param {} segmentHeight Size of lookup table
 * @param {} origin Heightmap position in the world
 * @param {} textures
 * @param {} blends
 * @param {} parent
 */
GZ3D.Scene.prototype.loadHeightmap = function(heights, width, height,
    segmentWidth, segmentHeight, origin, textures, blends, parent)
{
  if (this.heightmap)
  {
    console.log('Only one heightmap can be loaded at a time');
    return;
  }

  if (parent === undefined)
  {
    console.error('Missing parent, heightmap won\'t be loaded.');
    return;
  }

  // unfortunately large heightmaps kill the fps and freeze everything so
  // we have to scale it down
  var scale = 1;
  var maxHeightmapWidth = 256;
  var maxHeightmapHeight = 256;

  if ((segmentWidth-1) > maxHeightmapWidth)
  {
    scale = maxHeightmapWidth / (segmentWidth-1);
  }

  var geometry = new THREE.PlaneGeometry(width, height,
      (segmentWidth-1) * scale, (segmentHeight-1) * scale);
  geometry.dynamic = true;

  // Mirror the vertices about the X axis
  var vertices = [];
  for (var h = segmentHeight-1; h >= 0; --h)
  {
    for (var w = 0; w < segmentWidth; ++w)
    {
      vertices[(segmentHeight-h-1)*segmentWidth  + w]
          = heights[h*segmentWidth + w];
    }
  }

  // Sub-sample
  var col = (segmentWidth-1) * scale;
  var row = (segmentHeight-1) * scale;
  for (var r = 0; r < row; ++r)
  {
    for (var c = 0; c < col; ++c)
    {
      var index = (r * col * 1/(scale*scale)) +   (c * (1/scale));
      geometry.vertices[r*col + c].z = vertices[index];
    }
  }

  // Compute normals
  geometry.computeFaceNormals();
  geometry.computeVertexNormals();

  // Material - use shader if textures provided, otherwise use a generic phong
  // material
  var material;
  if (textures && textures.length > 0)
  {
    var textureLoaded = [];
    var repeats = [];
    for (var t = 0; t < textures.length; ++t)
    {
      textureLoaded[t] = this.textureLoader.load(textures[t].diffuse);
      textureLoaded[t].wrapS = THREE.RepeatWrapping;
      textureLoaded[t].wrapT = THREE.RepeatWrapping;
      repeats[t] = width/textures[t].size;
    }

    // for now, use fixed no. of textures and blends
    // so populate the remaining ones to make the fragment shader happy
    for (var tt = textures.length; tt< 3; ++tt)
    {
      textureLoaded[tt] = textureLoaded[tt-1];
    }

    for (var b = blends.length; b < 2; ++b)
    {
      blends[b] = blends[b-1];
    }

    for (var rr = repeats.length; rr < 3; ++rr)
    {
      repeats[rr] = repeats[rr-1];
    }

    // Use the same approach as gazebo scene, grab the first directional light
    // and use it for shading the terrain
    var lightDir = new THREE.Vector3(0, 0, 1);
    var lightDiffuse = new THREE.Color(0xffffff);
    var allObjects = [];
    this.scene.getDescendants(allObjects);
    for (var l = 0; l < allObjects.length; ++l)
    {
      if (allObjects[l] instanceof THREE.DirectionalLight)
      {
        lightDir = allObjects[l].target.position;
        lightDiffuse = allObjects[l].color;
        break;
      }
    }

    var options = {
      uniforms:
      {
        texture0: { type: 't', value: textureLoaded[0]},
        texture1: { type: 't', value: textureLoaded[1]},
        texture2: { type: 't', value: textureLoaded[2]},
        repeat0: { type: 'f', value: repeats[0]},
        repeat1: { type: 'f', value: repeats[1]},
        repeat2: { type: 'f', value: repeats[2]},
        minHeight1: { type: 'f', value: blends[0].min_height},
        fadeDist1: { type: 'f', value: blends[0].fade_dist},
        minHeight2: { type: 'f', value: blends[1].min_height},
        fadeDist2: { type: 'f', value: blends[1].fade_dist},
        ambient: { type: 'c', value: this.ambient.color},
        lightDiffuse: { type: 'c', value: lightDiffuse},
        lightDir: { type: 'v3', value: lightDir}
      },
    };

    if (this.shaders !== undefined)
    {
      options.vertexShader = this.shaders.heightmapVS;
      options.fragmentShader = this.shaders.heightmapFS;
    }
    else
    {
      console.log('Warning: heightmap shaders not provided.');
    }

    material = new THREE.ShaderMaterial(options);
  }
  else
  {
    material = new THREE.MeshPhongMaterial( { color: 0x555555 } );
  }

  var mesh = new THREE.Mesh(geometry, material);

  mesh.position.x = origin.x;
  mesh.position.y = origin.y;
  mesh.position.z = origin.z;
  parent.add(mesh);

  this.heightmap = parent;
};

/* eslint-disable */
/**
 * Load mesh
 * @example
 * // loading using URI
 * // callback(mesh)
 * loadMeshFromUri('assets/house_1/meshes/house_1.dae', undefined, undefined, function(mesh)
            {
              // use the mesh
            });
 * @param {string} uri
 * @param {} submesh
 * @param {} centerSubmesh
 * @param {function} callback
 */
/* eslint-enable */
GZ3D.Scene.prototype.loadMeshFromUri = function(uri, submesh, centerSubmesh,
  callback)
{
  var uriPath = uri.substring(0, uri.lastIndexOf('/'));
  var uriFile = uri.substring(uri.lastIndexOf('/') + 1);

  if (this.meshes[uri])
  {
    var mesh = this.meshes[uri];
    mesh = mesh.clone();
    this.useSubMesh(mesh, submesh, centerSubmesh);
    callback(mesh);
    return;
  }

  // load urdf model
  if (uriFile.substr(-4).toLowerCase() === '.dae')
  {
    return this.loadCollada(uri, submesh, centerSubmesh, callback);
  }
  else if (uriFile.substr(-4).toLowerCase() === '.obj')
  {
    return this.loadOBJ(uri, submesh, centerSubmesh, callback);
  }
  else if (uriFile.substr(-4).toLowerCase() === '.stl')
  {
    return this.loadSTL(uri, submesh, centerSubmesh, callback);
  }
  else if (uriFile.substr(-5).toLowerCase() === '.urdf')
  {
    /*var urdfModel = new ROSLIB.UrdfModel({
      string : uri
    });

    // adapted from ros3djs
    var links = urdfModel.links;
    for ( var l in links) {
      var link = links[l];
      if (link.visual && link.visual.geometry) {
        if (link.visual.geometry.type === ROSLIB.URDF_MESH) {
          var frameID = '/' + link.name;
          var filename = link.visual.geometry.filename;
          var meshType = filename.substr(-4).toLowerCase();
          var mesh = filename.substring(filename.indexOf('://') + 3);
          // ignore mesh files which are not in Collada format
          if (meshType === '.dae')
          {
            var dae = this.loadCollada(uriPath + '/' + mesh, parent);
            // check for a scale
            if(link.visual.geometry.scale)
            {
              dae.scale = new THREE.Vector3(
                  link.visual.geometry.scale.x,
                  link.visual.geometry.scale.y,
                  link.visual.geometry.scale.z
              );
            }
          }
        }
      }
    }*/
  }
};

/* eslint-disable */
/**
 * Load mesh
 * @example
 * // loading using URI
 * // callback(mesh)
 * @example
 * // loading using file string
 * // callback(mesh)
 * loadMeshFromString('assets/house_1/meshes/house_1.dae', undefined, undefined, function(mesh)
            {
              // use the mesh
            }, ['<?xml version="1.0" encoding="utf-8"?>
    <COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
      <asset>
        <contributor>
          <author>Cole</author>
          <authoring_tool>OpenCOLLADA for 3ds Max;  Ver.....']);
 * @param {string} uri
 * @param {} submesh
 * @param {} centerSubmesh
 * @param {function} callback
 * @param {array} files - files needed by the loaders[dae] in case of a collada
 * mesh, [obj, mtl] in case of object mesh, all as strings
 */
/* eslint-enable */
GZ3D.Scene.prototype.loadMeshFromString = function(uri, submesh, centerSubmesh,
  callback, files)
{
  var uriPath = uri.substring(0, uri.lastIndexOf('/'));
  var uriFile = uri.substring(uri.lastIndexOf('/') + 1);

  if (this.meshes[uri])
  {
    var mesh = this.meshes[uri];
    mesh = mesh.clone();
    this.useSubMesh(mesh, submesh, centerSubmesh);
    callback(mesh);
    return;
  }

  // load urdf model
  if (uriFile.substr(-4).toLowerCase() === '.dae')
  {
    // loadCollada just accepts one file, which is the dae file as string
    return this.loadCollada(uri, submesh, centerSubmesh, callback, files[0]);
  }
  else if (uriFile.substr(-4).toLowerCase() === '.obj')
  {
    return this.loadOBJ(uri, submesh, centerSubmesh, callback, files);
  }
};

/**
 * Load collada file
 * @param {string} uri - mesh uri which is used by colldaloader to load
 * the mesh file using an XMLHttpRequest.
 * @param {} submesh
 * @param {} centerSubmesh
 * @param {function} callback
 * @param {string} filestring -optional- the mesh file as a string to be parsed
 * if provided the uri will not be used just as a url, no XMLHttpRequest will
 * be made.
 */
GZ3D.Scene.prototype.loadCollada = function(uri, submesh, centerSubmesh,
  callback, filestring)
{
  var dae;
  var mesh = null;
  var that = this;

  /*
  // Crashes: issue #36
  if (this.meshes[uri])
  {
    dae = this.meshes[uri];
    dae = dae.clone();
    this.useColladaSubMesh(dae, submesh, centerSubmesh);
    callback(dae);
    return;
  }
  */

  if (!filestring)
  {
    this.colladaLoader.load(uri, function(collada)
    {
      meshReady(collada);
    });
  }
  else
  {
    this.colladaLoader.parse(filestring, function(collada)
    {
      meshReady(collada);
    }, undefined);
  }

  function meshReady(collada)
  {
    // check for a scale factor
    /*if(collada.dae.asset.unit)
    {
      var scale = collada.dae.asset.unit;
      collada.scene.scale = new THREE.Vector3(scale, scale, scale);
    }*/

    dae = collada.scene;
    dae.updateMatrix();
    that.prepareColladaMesh(dae);
    that.meshes[uri] = dae;
    dae = dae.clone();
    that.useSubMesh(dae, submesh, centerSubmesh);

    dae.name = uri;
    callback(dae);
  }
};

/**
 * Prepare collada by removing other non-mesh entities such as lights
 * @param {} dae
 */
GZ3D.Scene.prototype.prepareColladaMesh = function(dae)
{
  var allChildren = [];
  dae.getDescendants(allChildren);
  for (var i = 0; i < allChildren.length; ++i)
  {
    if (allChildren[i] instanceof THREE.Light)
    {
      allChildren[i].parent.remove(allChildren[i]);
    }
  }
};

/**
 * Prepare mesh by handling submesh-only loading
 * @param {} mesh
 * @param {} submesh
 * @param {} centerSubmesh
 * @returns {THREE.Mesh} mesh
 */
GZ3D.Scene.prototype.useSubMesh = function(mesh, submesh, centerSubmesh)
{
  if (!submesh)
  {
    return null;
  }

  var result;
  var allChildren = [];
  mesh.getDescendants(allChildren);
  for (var i = 0; i < allChildren.length; ++i)
  {
    if (allChildren[i] instanceof THREE.Mesh)
    {
      if (allChildren[i].name === submesh ||
          allChildren[i].geometry.name === submesh)
      {
        if (centerSubmesh)
        {
          // obj
          if (allChildren[i].geometry instanceof THREE.BufferGeometry)
          {
            var geomPosition = allChildren[i].geometry.attributes.position;
            var dim = geomPosition.itemSize;
            var minPos = [];
            var maxPos = [];
            var centerPos = [];
            var m = 0;
            for (m = 0; m < dim; ++m)
            {
              minPos[m] = geomPosition.array[m];
              maxPos[m] = minPos[m];
            }
            var kk = 0;
            for (kk = dim; kk < geomPosition.count * dim; kk+=dim)
            {
              for (m = 0; m < dim; ++m)
              {
                minPos[m] = Math.min(minPos[m], geomPosition.array[kk + m]);
                maxPos[m] = Math.max(maxPos[m], geomPosition.array[kk + m]);
              }
            }

            for (m = 0; m < dim; ++m)
            {
              centerPos[m] = minPos[m] + (0.5 * (maxPos[m] - minPos[m]));
            }

            for (kk = 0; kk < geomPosition.count * dim; kk+=dim)
            {
              for (m = 0; m < dim; ++m)
              {
                geomPosition.array[kk + m] -= centerPos[m];
              }
            }
            allChildren[i].geometry.attributes.position.needsUpdate = true;
          }
          // dae
          else
          {
            var vertices = allChildren[i].geometry.vertices;
            var vMin = new THREE.Vector3();
            var vMax = new THREE.Vector3();
            vMin.x = vertices[0].x;
            vMin.y = vertices[0].y;
            vMin.z = vertices[0].z;
            vMax.x = vMin.x;
            vMax.y = vMin.y;
            vMax.z = vMin.z;

            for (var j = 1; j < vertices.length; ++j)
            {
              vMin.x = Math.min(vMin.x, vertices[j].x);
              vMin.y = Math.min(vMin.y, vertices[j].y);
              vMin.z = Math.min(vMin.z, vertices[j].z);
              vMax.x = Math.max(vMax.x, vertices[j].x);
              vMax.y = Math.max(vMax.y, vertices[j].y);
              vMax.z = Math.max(vMax.z, vertices[j].z);
            }

            var center  = new THREE.Vector3();
            center.x = vMin.x + (0.5 * (vMax.x - vMin.x));
            center.y = vMin.y + (0.5 * (vMax.y - vMin.y));
            center.z = vMin.z + (0.5 * (vMax.z - vMin.z));

            for (var k = 0; k < vertices.length; ++k)
            {
              vertices[k].x -= center.x;
              vertices[k].y -= center.y;
              vertices[k].z -= center.z;
            }

            allChildren[i].geometry.verticesNeedUpdate = true;
            var p = allChildren[i].parent;
            while (p)
            {
              p.position.set(0, 0, 0);
              p = p.parent;
            }
          }
        }
        result = allChildren[i];
      }
      else
      {
        allChildren[i].parent.remove(allChildren[i]);
      }
    }
  }
  return result;
};

/**
 * Load Obj file
 * @param {string} uri - mesh uri which is used by mtlloader and the objloader
 * to load both the mesh file and the mtl file using XMLHttpRequests.
 * @param {} submesh
 * @param {} centerSubmesh
 * @param {function} callback
 * @param {array} files -optional- the mesh and the mtl files as a strings
 * to be parsed by the loaders, if provided the uri will not be used just
 * as a url, no XMLHttpRequest will be made.
 */
GZ3D.Scene.prototype.loadOBJ = function(uri, submesh, centerSubmesh, callback,
  files)
{
  var obj = null;
  var baseUrl = uri.substr(0, uri.lastIndexOf('/') + 1);

  // We need one mtl loader per obj so paths don't get mixed up
  var mtlLoader = new THREE.MTLLoader();
  mtlLoader.setCrossOrigin('');

  var that = this;
  var containerLoaded = function (container)
  {
    // callback to signal mesh loading is complete
    var loadComplete = function()
    {
      obj = container;
      that.meshes[uri] = obj;
      obj = obj.clone();
      that.useSubMesh(obj, submesh, centerSubmesh);

      obj.name = uri;
      callback(obj);
    };

    // apply material to obj mesh
    var applyMaterial = function(mtlCreator)
    {
      var allChildren = [];
      container.getDescendants(allChildren);
      for (var j =0; j < allChildren.length; ++j)
      {
        var child = allChildren[j];
        if (child && child.material)
        {
          if (child.material.name)
          {
            child.material = mtlCreator.create(child.material.name);
          }
          else if (Array.isArray(child.material))
          {
            for (var k = 0; k < child.material.length; ++k)
            {
              child.material[k] = mtlCreator.create(child.material[k].name);
            }
          }
        }
      }
      loadComplete();
    };

    if (container.materialLibraries.length === 0)
    {
      // return if there are no materials to be applied
      loadComplete();
    }

    // Callback when raw .mtl file has been loaded
    //
    // Assumptions:
    //     * Both .obj and .mtl files are under the /meshes dir
    //     * Textures are under the /materials/textures dir
    //
    // Three texture filename patterns are handled. A single .mtl file may
    // have instances of all of these.
    // 1. Path relative to the meshes folder, which should always start with
    //    ../materials/textures/
    // 2. Gazebo URI in the model:// format, referencing another model
    //    in the same path as the one being loaded
    // 2. Just the image filename without a path
    var mtlRawFileLoaded = function(text)
    {
      // Handle model:// URI
      if (text.indexOf('model://') > 0)
      {
        if (mtlLoader.path.indexOf('/meshes/') < 0)
        {
          console.error('Failed to resolve texture URI. MTL file directory [' +
              mtlLoader.path +
              '] not supported, it should be in a /meshes directory');
          console.error(text);
          return;
        }

        // Get models path from .mtl file path
        // This assumes the referenced model is in the same path as the model
        // being loaded. So this may fail if there are models being loaded
        // from various paths
        var path = mtlLoader.path;
        path = path.substr(0, path.lastIndexOf('/meshes'));
        path = path.substr(0, path.lastIndexOf('/') + 1);

        // Search and replace
        text = text.replace(/model:\/\//g, path);
      }

      // Handle case in which the image filename is given without a path
      // We expect the texture to be under /materials/textures
      var lines = text.split('\n');
      var newText;
      for (var i in lines)
      {
        var line = lines[i];

        if (line === undefined)
        {
          continue;
        }

        // Skip lines without texture filenames
        if (line.indexOf('map_Ka') < 0 && line.indexOf('map_Kd') < 0)
        {
          newText += line += '\n';
          continue;
        }

        // Skip lines which already have /materials/textures
        if (line.indexOf('/materials/textures') > 0)
        {
          newText += line += '\n';
          continue;
        }

        // Add path to filename
        var p = mtlLoader.path;
        p = p.substr(0, p.lastIndexOf('meshes'));

        line = line.replace('map_Ka ', 'map_Ka ' + p + 'materials/textures/');
        line = line.replace('map_Kd ', 'map_Kd ' + p + 'materials/textures/');

        newText += line += '\n';
      }

      applyMaterial(mtlLoader.parse(newText));
    };

    for (var i=0; i < container.materialLibraries.length; ++i)
    {
      // Load raw .mtl file
      var mtlPath = container.materialLibraries[i];

      var fileLoader = new THREE.FileLoader(mtlLoader.manager);
      fileLoader.setPath(mtlLoader.path);
      fileLoader.load(mtlPath, mtlRawFileLoaded);
    }
  };

  if (!files)
  {
    this.objLoader.load(uri, function(_container)
    {
      // Assumes .mtl is in the same path as .obj
      mtlLoader.setPath(baseUrl);
      containerLoaded(_container);
    });
  }
  else if (files[0])
  {
    var _container = this.objLoader.parse(files[0]);
    // mtlLoader.parse(files[1]);
    // containerLoaded(_container);

    // this part is to be removed after updating the mtlLoader.
    obj = _container;
    this.meshes[uri] = obj;
    obj = obj.clone();
    this.useSubMesh(obj, submesh, centerSubmesh);

    obj.name = uri;
    callback(obj);
  }
};

/**
 * Load stl file.
 * Loads stl mesh given using it's uri
 * @param {string} uri
 * @param {} submesh
 * @param {} centerSubmesh
 * @param {function} callback
 */
GZ3D.Scene.prototype.loadSTL = function(uri, submesh, centerSubmesh,
  callback)
{
  var mesh = null;
  var that = this;
  this.stlLoader.load(uri, function(geometry)
  {
    mesh = new THREE.Mesh( geometry );
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    that.meshes[uri] = mesh;
    mesh = mesh.clone();
    that.useSubMesh(mesh, submesh, centerSubmesh);

    mesh.name = uri;
    callback(mesh);
  });
};

/**
 * Set material for an object
 * @param {} obj
 * @param {} material
 */
GZ3D.Scene.prototype.setMaterial = function(obj, material)
{
  if (obj)
  {
    if (material)
    {
      obj.material = new THREE.MeshPhongMaterial();
      var ambient = material.ambient;
      var diffuse = material.diffuse;
      if (diffuse)
      {
        // threejs removed ambient from phong and lambert materials so
        // aproximate the resulting color by mixing ambient and diffuse
        var dc = [];
        dc[0] = diffuse[0];
        dc[1] = diffuse[1];
        dc[2] = diffuse[2];
        if (ambient)
        {
          var a = 0.4;
          var d = 0.6;
          dc[0] = ambient[0]*a + diffuse[0]*d;
          dc[1] = ambient[1]*a + diffuse[1]*d;
          dc[2] = ambient[2]*a + diffuse[2]*d;
        }
        obj.material.color.setRGB(dc[0], dc[1], dc[2]);
      }
      var specular = material.specular;
      if (specular)
      {
        obj.material.specular.setRGB(specular[0], specular[1], specular[2]);
      }
      var opacity = material.opacity;
      if (opacity)
      {
        if (opacity < 1)
        {
          obj.material.transparent = true;
          obj.material.opacity = opacity;
        }
      }

      if (material.texture)
      {
        var texture = this.textureLoader.load(material.texture);
        if (material.scale)
        {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.x = 1.0 / material.scale[0];
          texture.repeat.y = 1.0 / material.scale[1];
        }
        obj.material.map = texture;
      }
      if (material.normalMap)
      {
        obj.material.normalMap =
            this.textureLoader.load(material.normalMap);
      }
    }
  }
};

/**
 * Set manipulation mode (view/translate/rotate)
 * @param {string} mode
 */
GZ3D.Scene.prototype.setManipulationMode = function(mode)
{
  this.manipulationMode = mode;

  if (mode === 'view')
  {
    if (this.modelManipulator.object)
    {
      this.emitter.emit('entityChanged', this.modelManipulator.object);
    }
    this.selectEntity(null);
  }
  else
  {
    // Toggle manipulaion space (world / local)
    if (this.modelManipulator.mode === this.manipulationMode)
    {
      this.modelManipulator.space =
        (this.modelManipulator.space === 'world') ? 'local' : 'world';
    }
    this.modelManipulator.mode = this.manipulationMode;
    this.modelManipulator.setMode(this.modelManipulator.mode);
    // model was selected during view mode
    if (this.selectedEntity)
    {
      this.selectEntity(this.selectedEntity);
    }
  }

};

/**
 * Show collision visuals
 * @param {boolean} show
 */
GZ3D.Scene.prototype.showCollision = function(show)
{
  if (show === this.showCollisions)
  {
    return;
  }

  var allObjects = [];
  this.scene.getDescendants(allObjects);
  for (var i = 0; i < allObjects.length; ++i)
  {
    if (allObjects[i] instanceof THREE.Object3D &&
        allObjects[i].name.indexOf('COLLISION_VISUAL') >=0)
    {
      var allChildren = [];
      allObjects[i].getDescendants(allChildren);
      for (var j =0; j < allChildren.length; ++j)
      {
        if (allChildren[j] instanceof THREE.Mesh)
        {
          allChildren[j].visible = show;
        }
      }
    }
  }
  this.showCollisions = show;

};

/**
 * Attach manipulator to an object
 * @param {THREE.Object3D} model
 * @param {string} mode (translate/rotate)
 */
GZ3D.Scene.prototype.attachManipulator = function(model,mode)
{
  if (this.modelManipulator.object)
  {
    this.emitter.emit('entityChanged', this.modelManipulator.object);
  }

  if (mode !== 'view')
  {
    this.modelManipulator.attach(model);
    this.modelManipulator.mode = mode;
    this.modelManipulator.setMode( this.modelManipulator.mode );
    this.scene.add(this.modelManipulator.gizmo);
  }
};

/**
 * Reset view
 */
GZ3D.Scene.prototype.resetView = function()
{
  this.camera.position.copy(this.defaultCameraPosition);
  this.camera.up = new THREE.Vector3(0, 0, 1);
  this.camera.lookAt(new THREE.Vector3( 0, 0, 0 ));
  this.camera.updateMatrix();
};

/**
 * Show radial menu
 * @param {} event
 */
GZ3D.Scene.prototype.showRadialMenu = function(e)
{
  if (!this.radialMenu)
  {
    return;
  }

  var event = e.originalEvent;

  var pointer = event.touches ? event.touches[ 0 ] : event;
  var pos = new THREE.Vector2(pointer.clientX, pointer.clientY);

  var intersect = new THREE.Vector3();
  var model = this.getRayCastModel(pos, intersect);

  if (model && model.name !== '' && model.name !== 'plane'
      && this.modelManipulator.pickerNames.indexOf(model.name) === -1)
  {
    this.radialMenu.show(event,model);
    this.selectEntity(model);
  }
};

/**
 * Sets the bounding box of an object while ignoring the addtional visuals.
 * @param {THREE.Box3} - box
 * @param {THREE.Object3D} - object
 */
GZ3D.Scene.prototype.setFromObject = function(box, object)
{
  box.min.x = box.min.y = box.min.z = + Infinity;
  box.max.x = box.max.y = box.max.z = - Infinity;
  var v = new THREE.Vector3();
  object.updateMatrixWorld( true );

  object.traverse( function ( node )
  {
    var i, l;
    var geometry = node.geometry;
    if ( geometry !== undefined )
    {

      if (node.name !== 'INERTIA_VISUAL' && node.name !== 'COM_VISUAL')
      {

        if ( geometry.isGeometry )
        {

          var vertices = geometry.vertices;

          for ( i = 0, l = vertices.length; i < l; i ++ )
          {

            v.copy( vertices[ i ] );
            v.applyMatrix4( node.matrixWorld );

            expandByPoint( v );

          }

        }
        else if ( geometry.isBufferGeometry )
        {

          var attribute = geometry.attributes.position;

          if ( attribute !== undefined )
          {

            for ( i = 0, l = attribute.count; i < l; i ++ )
            {

              v.fromBufferAttribute( attribute, i ).applyMatrix4(
                node.matrixWorld );

              expandByPoint( v );

            }
          }
        }
      }
    }
  });

  function expandByPoint(point)
  {
    box.min.min( point );
    box.max.max( point );
  }

};

/**
 * Show bounding box for a model. The box is aligned with the world.
 * @param {THREE.Object3D} model
 */
GZ3D.Scene.prototype.showBoundingBox = function(model)
{
  if (typeof model === 'string')
  {
    model = this.scene.getObjectByName(model);
  }

  if (this.boundingBox.visible)
  {
    if (this.boundingBox.parent === model)
    {
      return;
    }
    else
    {
      this.hideBoundingBox();
    }
  }
  var box = new THREE.Box3();
  // w.r.t. world
  this.setFromObject(box, model);
  // center vertices with object
  box.min.x = box.min.x - model.position.x;
  box.min.y = box.min.y - model.position.y;
  box.min.z = box.min.z - model.position.z;
  box.max.x = box.max.x - model.position.x;
  box.max.y = box.max.y - model.position.y;
  box.max.z = box.max.z - model.position.z;

  var position = this.boundingBox.geometry.attributes.position;
  var array = position.array;
  array[  0 ] = box.max.x; array[  1 ] = box.max.y; array[  2 ] = box.max.z;
  array[  3 ] = box.min.x; array[  4 ] = box.max.y; array[  5 ] = box.max.z;
  array[  6 ] = box.min.x; array[  7 ] = box.min.y; array[  8 ] = box.max.z;
  array[  9 ] = box.max.x; array[ 10 ] = box.min.y; array[ 11 ] = box.max.z;
  array[ 12 ] = box.max.x; array[ 13 ] = box.max.y; array[ 14 ] = box.min.z;
  array[ 15 ] = box.min.x; array[ 16 ] = box.max.y; array[ 17 ] = box.min.z;
  array[ 18 ] = box.min.x; array[ 19 ] = box.min.y; array[ 20 ] = box.min.z;
  array[ 21 ] = box.max.x; array[ 22 ] = box.min.y; array[ 23 ] = box.min.z;
  position.needsUpdate = true;
  this.boundingBox.geometry.computeBoundingSphere();

  // rotate the box back to the world
  var modelRotation = new THREE.Matrix4();
  modelRotation.extractRotation(model.matrixWorld);
  var modelInverse = new THREE.Matrix4();
  modelInverse.getInverse(modelRotation);
  this.boundingBox.quaternion.setFromRotationMatrix(modelInverse);
  this.boundingBox.name = 'boundingBox';
  this.boundingBox.visible = true;

  // Add box as model's child
  model.add(this.boundingBox);
};

/**
 * Hide bounding box
 */
GZ3D.Scene.prototype.hideBoundingBox = function()
{
  if(this.boundingBox.parent)
  {
    this.boundingBox.parent.remove(this.boundingBox);
  }
  this.boundingBox.visible = false;
};

/**
 * Mouse right click
 * @param {} event
 * @param {} callback - function to be executed to the clicked model
 */
GZ3D.Scene.prototype.onRightClick = function(event, callback)
{
  var pos = new THREE.Vector2(event.clientX, event.clientY);
  var model = this.getRayCastModel(pos, new THREE.Vector3());

  if(model && model.name !== '' && model.name !== 'plane' &&
      this.modelManipulator.pickerNames.indexOf(model.name) === -1)
  {
    callback(model);
  }
};


/**
 * Set model's view mode
 * @param {} model
 * @param {} viewAs (normal/transparent/wireframe)
 */
GZ3D.Scene.prototype.setViewAs = function(model, viewAs)
{
  // Toggle
  if (model.viewAs === viewAs)
  {
    viewAs = 'normal';
  }

  var showWireframe = (viewAs === 'wireframe');
  function materialViewAs(material)
  {
    if (materials.indexOf(material.id) === -1)
    {
      materials.push(material.id);
      if (viewAs === 'transparent')
      {
        if (material.opacity)
        {
          material.originalOpacity = material.opacity;
        }
        else
        {
          material.originalOpacity = 1.0;
        }
        material.opacity = 0.25;
        material.transparent = true;
      }
      else
      {
        material.opacity = material.originalOpacity ?
            material.originalOpacity : 1.0;
        if (material.opacity >= 1.0)
        {
          material.transparent = false;
        }
      }
      // wireframe handling
      material.wireframe = showWireframe;
    }
  }

  var wireframe;
  var descendants = [];
  var materials = [];
  model.getDescendants(descendants);
  for (var i = 0; i < descendants.length; ++i)
  {
    if (descendants[i].material &&
        descendants[i].name.indexOf('boundingBox') === -1 &&
        descendants[i].name.indexOf('COLLISION_VISUAL') === -1 &&
        !this.getParentByPartialName(descendants[i], 'COLLISION_VISUAL') &&
        descendants[i].name.indexOf('wireframe') === -1 &&
        descendants[i].name.indexOf('JOINT_VISUAL') === -1 &&
        descendants[i].name.indexOf('COM_VISUAL') === -1 &&
        descendants[i].name.indexOf('INERTIA_VISUAL') === -1)
    {
      // Note: multi-material is being deprecated and will be removed soon
      if (descendants[i].material instanceof THREE.MultiMaterial)
      {
        for (var j = 0; j < descendants[i].material.materials.length; ++j)
        {
          materialViewAs(descendants[i].material.materials[j]);
        }
      }
      else if (Array.isArray(descendants[i].material))
      {
        for (var k = 0; k < descendants[i].material.length; ++k)
        {
          materialViewAs(descendants[i].material[k]);
        }
      }
      else
      {
        materialViewAs(descendants[i].material);
      }
    }
  }
  model.viewAs = viewAs;
};

/**
 * Returns the closest parent whose name contains the given string
 * @param {} object
 * @param {} name
 */
GZ3D.Scene.prototype.getParentByPartialName = function(object, name)
{
  var parent = object.parent;
  while (parent && parent !== this.scene)
  {
    if (parent.name.indexOf(name) !== -1)
    {
      return parent;
    }

    parent = parent.parent;
  }
  return null;
};

/**
 * Select entity
 * @param {} object
 */
GZ3D.Scene.prototype.selectEntity = function(object)
{
  if (object)
  {
    if (object !== this.selectedEntity)
    {
      this.showBoundingBox(object);
      this.selectedEntity = object;
    }
    this.attachManipulator(object, this.manipulationMode);
    this.emitter.emit('setTreeSelected', object.name);
  }
  else
  {
    if (this.modelManipulator.object)
    {
      this.modelManipulator.detach();
      this.scene.remove(this.modelManipulator.gizmo);
    }
    this.hideBoundingBox();
    this.selectedEntity = null;
    this.emitter.emit('setTreeDeselected');
  }
};

/**
 * View joints
 * Toggle: if there are joints, hide, otherwise, show.
 * @param {} model
 */
GZ3D.Scene.prototype.viewJoints = function(model)
{
  if (model.joint === undefined || model.joint.length === 0)
  {
    return;
  }

  var child;

  // Visuals already exist
  if (model.jointVisuals)
  {
    // Hide = remove from parent
    if (model.jointVisuals[0].parent !== undefined &&
      model.jointVisuals[0].parent !== null)
    {
      for (var v = 0; v < model.jointVisuals.length; ++v)
      {
        model.jointVisuals[v].parent.remove(model.jointVisuals[v]);
      }
    }
    // Show: attach to parent
    else
    {
      for (var s = 0; s < model.joint.length; ++s)
      {
        child = model.getObjectByName(model.joint[s].child);

        if (!child)
        {
          continue;
        }

        child.add(model.jointVisuals[s]);
      }
    }
  }
  // Create visuals
  else
  {
    model.jointVisuals = [];
    for (var j = 0; j < model.joint.length; ++j)
    {
      child = model.getObjectByName(model.joint[j].child);

      if (!child)
      {
        continue;
      }

      // XYZ expressed w.r.t. child
      var jointVisual = this.jointAxis['XYZaxes'].clone();
      child.add(jointVisual);
      model.jointVisuals.push(jointVisual);
      jointVisual.scale.set(0.7, 0.7, 0.7);

      this.setPose(jointVisual, model.joint[j].pose.position,
          model.joint[j].pose.orientation);

      var mainAxis = null;
      if (model.joint[j].type !== this.jointTypes.BALL &&
          model.joint[j].type !== this.jointTypes.FIXED)
      {
        mainAxis = this.jointAxis['mainAxis'].clone();
        jointVisual.add(mainAxis);
      }

      var secondAxis = null;
      if (model.joint[j].type === this.jointTypes.REVOLUTE2 ||
          model.joint[j].type === this.jointTypes.UNIVERSAL)
      {
        secondAxis = this.jointAxis['mainAxis'].clone();
        jointVisual.add(secondAxis);
      }

      if (model.joint[j].type === this.jointTypes.REVOLUTE ||
          model.joint[j].type === this.jointTypes.GEARBOX)
      {
        mainAxis.add(this.jointAxis['rotAxis'].clone());
      }
      else if (model.joint[j].type === this.jointTypes.REVOLUTE2 ||
               model.joint[j].type === this.jointTypes.UNIVERSAL)
      {
        mainAxis.add(this.jointAxis['rotAxis'].clone());
        secondAxis.add(this.jointAxis['rotAxis'].clone());
      }
      else if (model.joint[j].type === this.jointTypes.BALL)
      {
        jointVisual.add(this.jointAxis['ballVisual'].clone());
      }
      else if (model.joint[j].type === this.jointTypes.PRISMATIC)
      {
        mainAxis.add(this.jointAxis['transAxis'].clone());
      }
      else if (model.joint[j].type === this.jointTypes.SCREW)
      {
        mainAxis.add(this.jointAxis['screwAxis'].clone());
      }

      var direction, tempMatrix, rotMatrix;
      if (mainAxis)
      {
        // main axis expressed w.r.t. parent model or joint frame
        if (!model.joint[j].axis1)
        {
          console.log('no joint axis ' +  model.joint[j].type + 'vs '
            + this.jointTypes.FIXED);
        }
        if (model.joint[j].axis1.use_parent_model_frame === undefined)
        {
          model.joint[j].axis1.use_parent_model_frame = true;
        }

        direction = new THREE.Vector3(
            model.joint[j].axis1.xyz.x,
            model.joint[j].axis1.xyz.y,
            model.joint[j].axis1.xyz.z);
        direction.normalize();

        tempMatrix = new THREE.Matrix4();
        if (model.joint[j].axis1.use_parent_model_frame)
        {
          tempMatrix.extractRotation(jointVisual.matrix);
          tempMatrix.getInverse(tempMatrix);
          direction.applyMatrix4(tempMatrix);
          tempMatrix.extractRotation(child.matrix);
          tempMatrix.getInverse(tempMatrix);
          direction.applyMatrix4(tempMatrix);
        }

        rotMatrix = new THREE.Matrix4();
        rotMatrix.lookAt(direction, new THREE.Vector3(0, 0, 0), mainAxis.up);
        mainAxis.quaternion.setFromRotationMatrix(rotMatrix);
      }

      if (secondAxis)
      {
        if (model.joint[j].axis2.use_parent_model_frame === undefined)
        {
          model.joint[j].axis2.use_parent_model_frame = true;
        }

        direction = new THREE.Vector3(
            model.joint[j].axis2.xyz.x,
            model.joint[j].axis2.xyz.y,
            model.joint[j].axis2.xyz.z);
        direction.normalize();

        tempMatrix = new THREE.Matrix4();
        if (model.joint[j].axis2.use_parent_model_frame)
        {
          tempMatrix.extractRotation(jointVisual.matrix);
          tempMatrix.getInverse(tempMatrix);
          direction.applyMatrix4(tempMatrix);
          tempMatrix.extractRotation(child.matrix);
          tempMatrix.getInverse(tempMatrix);
          direction.applyMatrix4(tempMatrix);
        }

        secondAxis.position =  direction.multiplyScalar(0.3);
        rotMatrix = new THREE.Matrix4();
        rotMatrix.lookAt(direction, new THREE.Vector3(0, 0, 0), secondAxis.up);
        secondAxis.quaternion.setFromRotationMatrix(rotMatrix);
      }
    }
  }
};

/**
 * View Center Of Mass
 * Toggle: if there are COM visuals, hide, otherwise, show.
 * @param {} model
 */
GZ3D.Scene.prototype.viewCOM = function(model)
{
  if (model === undefined || model === null)
  {
    return;
  }
  if (model.children.length === 0)
  {
    return;
  }

  var child;

  // Visuals already exist
  if (model.COMVisuals)
  {
    // Hide = remove from parent
    if (model.COMVisuals[0].parent !== undefined &&
      model.COMVisuals[0].parent !== null)
    {
      for (var v = 0; v < model.COMVisuals.length; ++v)
      {
        for (var k = 0; k < 3; k++)
        {
          model.COMVisuals[v].parent.remove(model.COMVisuals[v].crossLines[k]);
        }
        model.COMVisuals[v].parent.remove(model.COMVisuals[v]);
      }
    }
    // Show: attach to parent
    else
    {
      for (var s = 0; s < model.children.length; ++s)
      {
        child = model.getObjectByName(model.children[s].name);

        if (!child || child.name === 'boundingBox')
        {
          continue;
        }

        child.add(model.COMVisuals[s].crossLines[0]);
        child.add(model.COMVisuals[s].crossLines[1]);
        child.add(model.COMVisuals[s].crossLines[2]);
        child.add(model.COMVisuals[s]);
      }
    }
  }
  // Create visuals
  else
  {
    model.COMVisuals = [];
    var box, COMVisual, line_1, line_2, line_3, helperGeometry_1,
    helperGeometry_2, helperGeometry_3, helperMaterial, points = new Array(6);
    for (var j = 0; j < model.children.length; ++j)
    {
      child = model.getObjectByName(model.children[j].name);

      if (!child)
      {
        continue;
      }

      if (child.userData.inertial)
      {
        var mesh, radius, inertialMass, userdatapose, inertialPose = {};
        var inertial = child.userData.inertial;

        userdatapose = child.userData.inertial.pose;
        inertialMass = inertial.mass;

        // calculate the radius using lead density
        radius = Math.cbrt((0.75 * inertialMass ) / (Math.PI * 11340));

        COMVisual = this.COMvisual.clone();
        child.add(COMVisual);
        model.COMVisuals.push(COMVisual);
        COMVisual.scale.set(radius, radius, radius);

        var position = new THREE.Vector3(0, 0, 0);

        // get euler rotation and convert it to Quaternion
        var quaternion = new THREE.Quaternion();
        var euler = new THREE.Euler(0, 0, 0, 'XYZ');
        quaternion.setFromEuler(euler);

        inertialPose = {
          'position': position,
          'orientation': quaternion
        };

        if (userdatapose !== undefined)
        {
          this.setPose(COMVisual, userdatapose.position,
            userdatapose.orientation);
            inertialPose = userdatapose;
        }

        COMVisual.crossLines = [];

        // Store link's original rotation (w.r.t. the model)
        var originalRotation = new THREE.Euler();
        originalRotation.copy(child.rotation);

        // Align link with world (reverse parent rotation w.r.t. the world)
        child.setRotationFromMatrix(
          new THREE.Matrix4().getInverse(child.parent.matrixWorld));

        // Get its bounding box
        box = new THREE.Box3();

        box.setFromObject(child);

        // Rotate link back to its original rotation
        child.setRotationFromEuler(originalRotation);

        // w.r.t child
        var worldToLocal = new THREE.Matrix4();
        worldToLocal.getInverse(child.matrixWorld);
        box.applyMatrix4(worldToLocal);

        // X
        points[0] = new THREE.Vector3(box.min.x, inertialPose.position.y,
          inertialPose.position.z);
        points[1] = new THREE.Vector3(box.max.x, inertialPose.position.y,
            inertialPose.position.z);
        // Y
        points[2] = new THREE.Vector3(inertialPose.position.x, box.min.y,
              inertialPose.position.z);
        points[3] = new THREE.Vector3(inertialPose.position.x, box.max.y,
                inertialPose.position.z);
        // Z
        points[4] = new THREE.Vector3(inertialPose.position.x,
          inertialPose.position.y, box.min.z);
        points[5] = new THREE.Vector3(inertialPose.position.x,
          inertialPose.position.y, box.max.z);

        helperGeometry_1 = new THREE.Geometry();
        helperGeometry_1.vertices.push(points[0]);
        helperGeometry_1.vertices.push(points[1]);

        helperGeometry_2 = new THREE.Geometry();
        helperGeometry_2.vertices.push(points[2]);
        helperGeometry_2.vertices.push(points[3]);

        helperGeometry_3 = new THREE.Geometry();
        helperGeometry_3.vertices.push(points[4]);
        helperGeometry_3.vertices.push(points[5]);

        helperMaterial = new THREE.LineBasicMaterial({color: 0x00ff00});

        line_1 = new THREE.Line(helperGeometry_1, helperMaterial,
            THREE.LineSegments);
        line_2 = new THREE.Line(helperGeometry_2, helperMaterial,
            THREE.LineSegments);
        line_3 = new THREE.Line(helperGeometry_3, helperMaterial,
            THREE.LineSegments);

        line_1.name = 'COM_VISUAL';
        line_2.name = 'COM_VISUAL';
        line_3.name = 'COM_VISUAL';
        COMVisual.crossLines.push(line_1);
        COMVisual.crossLines.push(line_2);
        COMVisual.crossLines.push(line_3);

        // show lines
        child.add(line_1);
        child.add(line_2);
        child.add(line_3);
       }
    }
  }
};

// TODO: Issue https://bitbucket.org/osrf/gzweb/issues/138
/**
 * View inertia
 * Toggle: if there are inertia visuals, hide, otherwise, show.
 * @param {} model
 */
GZ3D.Scene.prototype.viewInertia = function(model)
{
  if (model === undefined || model === null)
  {
    return;
  }

  if (model.children.length === 0)
  {
    return;
  }

  var child;

  // Visuals already exist
  if (model.inertiaVisuals)
  {
    // Hide = remove from parent
    if (model.inertiaVisuals[0].parent !== undefined &&
      model.inertiaVisuals[0].parent !== null)
    {
      for (var v = 0; v < model.inertiaVisuals.length; ++v)
      {
        for (var k = 0; k < 3; k++)
        {
          model.inertiaVisuals[v].parent.remove(
            model.inertiaVisuals[v].crossLines[k]);
        }
        model.inertiaVisuals[v].parent.remove(model.inertiaVisuals[v]);
      }
    }
    // Show: attach to parent
    else
    {
      for (var s = 0; s < model.children.length; ++s)
      {
        child = model.getObjectByName(model.children[s].name);

        if (!child || child.name === 'boundingBox')
        {
          continue;
        }
        child.add(model.inertiaVisuals[s].crossLines[0]);
        child.add(model.inertiaVisuals[s].crossLines[1]);
        child.add(model.inertiaVisuals[s].crossLines[2]);
        child.add(model.inertiaVisuals[s]);
      }
    }
  }
  // Create visuals
  else
  {
    model.inertiaVisuals = [];
    var box , line_1, line_2, line_3, helperGeometry_1, helperGeometry_2,
    helperGeometry_3, helperMaterial, inertial, inertiabox,
    points = new Array(6);
    for (var j = 0; j < model.children.length; ++j)
    {
      child = model.getObjectByName(model.children[j].name);

      if (!child)
      {
        continue;
      }

      inertial = child.userData.inertial;
      if (inertial)
      {
        var mesh, boxScale, Ixx, Iyy, Izz, mass, inertia, material,
          inertialPose = {};

        if (inertial.pose)
        {
          inertialPose = child.userData.inertial.pose;
        }
        else if (child.position)
        {
          inertialPose.position = child.position;
          inertialPose.orientation = child.quaternion;
        }
        else
        {
          console.log('Link pose not found!');
          continue;
        }

        mass = inertial.mass;
        inertia = inertial.inertia;
        Ixx = inertia.ixx;
        Iyy = inertia.iyy;
        Izz = inertia.izz;
        boxScale = new THREE.Vector3();

        if (mass < 0 || Ixx < 0 || Iyy < 0 || Izz < 0 ||
          Ixx + Iyy < Izz || Iyy + Izz < Ixx || Izz + Ixx < Iyy)
        {
          // Unrealistic inertia, load with default scale
          console.log('The link ' + child.name + ' has unrealistic inertia, '
                +'unable to visualize box of equivalent inertia.');
        }
        else
        {
          // Compute dimensions of box with uniform density
          // and equivalent inertia.
          boxScale.x = Math.sqrt(6*(Izz +  Iyy - Ixx) / mass);
          boxScale.y = Math.sqrt(6*(Izz +  Ixx - Iyy) / mass);
          boxScale.z = Math.sqrt(6*(Ixx  + Iyy - Izz) / mass);

          inertiabox = new THREE.Object3D();
          inertiabox.name = 'INERTIA_VISUAL';

          // Inertia indicator: equivalent box of uniform density
          mesh = this.createBox(1, 1, 1);
          mesh.name = 'INERTIA_VISUAL';
          material = {'ambient':[1,0.0,1,1],'diffuse':[1,0.0,1,1],
            'depth_write':false,'opacity':0.5};
          this.setMaterial(mesh, material);
          inertiabox.add(mesh);
          inertiabox.name = 'INERTIA_VISUAL';
          child.add(inertiabox);

          model.inertiaVisuals.push(inertiabox);
          inertiabox.scale.set(boxScale.x, boxScale.y, boxScale.z);
          inertiabox.crossLines = [];

          this.setPose(inertiabox, inertialPose.position,
            inertialPose.orientation);
          // show lines
          box = new THREE.Box3();
          // w.r.t. world
          box.setFromObject(child);
          points[0] = new THREE.Vector3(inertialPose.position.x,
            inertialPose.position.y,
            -2 * boxScale.z + inertialPose.position.z);
          points[1] = new THREE.Vector3(inertialPose.position.x,
            inertialPose.position.y, 2 * boxScale.z + inertialPose.position.z);
          points[2] = new THREE.Vector3(inertialPose.position.x,
            -2 * boxScale.y + inertialPose.position.y ,
            inertialPose.position.z);
          points[3] = new THREE.Vector3(inertialPose.position.x,
            2 * boxScale.y + inertialPose.position.y, inertialPose.position.z);
          points[4] = new THREE.Vector3(
            -2 * boxScale.x + inertialPose.position.x,
            inertialPose.position.y, inertialPose.position.z);
          points[5] = new THREE.Vector3(
            2 * boxScale.x + inertialPose.position.x,
            inertialPose.position.y, inertialPose.position.z);

          helperGeometry_1 = new THREE.Geometry();
          helperGeometry_1.vertices.push(points[0]);
          helperGeometry_1.vertices.push(points[1]);

          helperGeometry_2 = new THREE.Geometry();
          helperGeometry_2.vertices.push(points[2]);
          helperGeometry_2.vertices.push(points[3]);

          helperGeometry_3 = new THREE.Geometry();
          helperGeometry_3.vertices.push(points[4]);
          helperGeometry_3.vertices.push(points[5]);

          helperMaterial = new THREE.LineBasicMaterial({color: 0x00ff00});
          line_1 = new THREE.Line(helperGeometry_1, helperMaterial,
              THREE.LineSegments);
          line_2 = new THREE.Line(helperGeometry_2, helperMaterial,
            THREE.LineSegments);
          line_3 = new THREE.Line(helperGeometry_3, helperMaterial,
            THREE.LineSegments);

          line_1.name = 'INERTIA_VISUAL';
          line_2.name = 'INERTIA_VISUAL';
          line_3.name = 'INERTIA_VISUAL';
          inertiabox.crossLines.push(line_1);
          inertiabox.crossLines.push(line_2);
          inertiabox.crossLines.push(line_3);

          // attach lines
          child.add(line_1);
          child.add(line_2);
          child.add(line_3);
        }
      }
    }
  }
};

/**
 * Update a light entity from a message
 * @param {} entity
 * @param {} msg
 */
GZ3D.Scene.prototype.updateLight = function(entity, msg)
{
  // TODO: Generalize this and createLight
  var lightObj = entity.children[0];
  var dir;

  var color = new THREE.Color();

  if (msg.diffuse)
  {
    color.r = msg.diffuse.r;
    color.g = msg.diffuse.g;
    color.b = msg.diffuse.b;
    lightObj.color = color.clone();
  }
  if (msg.specular)
  {
    color.r = msg.specular.r;
    color.g = msg.specular.g;
    color.b = msg.specular.b;
    entity.serverProperties.specular = color.clone();
  }

  var matrixWorld;
  if (msg.pose)
  {
    // needed to update light's direction
    this.setPose(entity, msg.pose.position, msg.pose.orientation);
    entity.matrixWorldNeedsUpdate = true;
  }

  if (msg.range)
  {
    // THREE.js's light distance impacts the attenuation factor defined in the
    // shader:
    // attenuation factor = 1.0 - distance-to-enlighted-point / light.distance
    // Gazebo's range (taken from OGRE 3D API) does not contribute to
    // attenuation; it is a hard limit for light scope.
    // Nevertheless, we identify them for sake of simplicity.
    lightObj.distance = msg.range;
  }

  if (msg.cast_shadows)
  {
    lightObj.castShadow = msg.cast_shadows;
  }

  if (msg.attenuation_constant)
  {
    entity.serverProperties.attenuation_constant = msg.attenuation_constant;
  }
  if (msg.attenuation_linear)
  {
    entity.serverProperties.attenuation_linear = msg.attenuation_linear;
    lightObj.intensity = lightObj.intensity/(1+msg.attenuation_linear);
  }
  if (msg.attenuation_quadratic)
  {
    entity.serverProperties.attenuation_quadratic = msg.attenuation_quadratic;
    lightObj.intensity = lightObj.intensity/(1+msg.attenuation_quadratic);
  }

//  Not handling these on gzweb for now
//
//  if (lightObj instanceof THREE.SpotLight) {
//    if (msg.spot_outer_angle) {
//      lightObj.angle = msg.spot_outer_angle;
//    }
//    if (msg.spot_falloff) {
//      lightObj.exponent = msg.spot_falloff;
//    }
//  }

  if (msg.direction)
  {
    dir = new THREE.Vector3(msg.direction.x, msg.direction.y,
        msg.direction.z);

    entity.direction = new THREE.Vector3();
    entity.direction.copy(dir);

    if (lightObj.target)
    {
      lightObj.target.position.copy(dir);
    }
  }
};

/**
 * Adds an sdf model to the scene.
 * @param {object} sdf - It is either SDF XML string or SDF XML DOM object
 * @returns {THREE.Object3D}
 */
GZ3D.Scene.prototype.createFromSdf = function(sdf)
{
  if (sdf === undefined)
  {
    console.log(' No argument provided ');
    return;
  }

  var obj = new THREE.Object3D();

  var sdfXml = this.spawnModel.sdfParser.parseXML(sdf);
  // sdfXML is always undefined, the XML parser doesn't work while testing
  // while it does work during normal usage.
  var myjson = xml2json(sdfXml, '\t');
  var sdfObj = JSON.parse(myjson).sdf;

  var mesh = this.spawnModel.sdfParser.spawnFromSDF(sdf);
  obj.name = mesh.name;
  obj.add(mesh);

  return obj;
};
