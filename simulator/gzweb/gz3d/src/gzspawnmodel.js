/**
 * Spawn a model into the scene
 * @constructor
 */
GZ3D.SpawnModel = function(scene, domElement)
{
  this.scene = scene;
  this.domElement = ( domElement !== undefined ) ? domElement : document;
  this.init();
  this.obj = undefined;
  this.callback = undefined;
  this.sdfParser = undefined;

  // Material for simple shapes being spawned (grey transparent)
  this.spawnedShapeMaterial = new THREE.MeshPhongMaterial(
      {color:0xffffff, shading: THREE.SmoothShading} );
  this.spawnedShapeMaterial.transparent = true;
  this.spawnedShapeMaterial.opacity = 0.5;
};

/**
 * Initialize SpawnModel
 */
GZ3D.SpawnModel.prototype.init = function()
{
  this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  this.ray = new THREE.Ray();
  this.obj = null;
  this.active = false;
  this.snapDist = null;
};

/**
 * Start spawning an entity. Only simple shapes supported so far.
 * Adds a temp object to the scene which is not registered on the server.
 * @param {string} entity
 * @param {function} callback
 */
GZ3D.SpawnModel.prototype.start = function(entity, callback)
{
  if (this.active)
  {
    this.finish();
  }

  this.callback = callback;

  this.obj = new THREE.Object3D();
  var mesh;
  if (entity === 'box')
  {
    mesh = this.scene.createBox(1, 1, 1);
    mesh.material = this.spawnedShapeMaterial;
  }
  else if (entity === 'sphere')
  {
    mesh = this.scene.createSphere(0.5);
    mesh.material = this.spawnedShapeMaterial;
  }
  else if (entity === 'cylinder')
  {
    mesh = this.scene.createCylinder(0.5, 1.0);
    mesh.material = this.spawnedShapeMaterial;
  }
  else if (entity === 'pointlight')
  {
    mesh = this.scene.createLight(1);
  }
  else if (entity === 'spotlight')
  {
    mesh = this.scene.createLight(2);
  }
  else if (entity === 'directionallight')
  {
    mesh = this.scene.createLight(3);
  }
  else
  {
    mesh = this.sdfParser.loadSDF(entity);
    //TODO: add transparency to the object
  }

  this.obj.name = this.generateUniqueName(entity);
  this.obj.add(mesh);

  // temp model appears within current view
  var pos = new THREE.Vector2(window.window.innerWidth/2, window.innerHeight/2);
  var intersect = new THREE.Vector3();
  this.scene.getRayCastModel(pos, intersect);

  this.obj.position.x = intersect.x;
  this.obj.position.y = intersect.y;
  this.obj.position.z += 0.5;
  this.scene.add(this.obj);
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

  var that = this;

  this.mouseDown = function(event) {that.onMouseDown(event);};
  this.mouseUp = function(event) {that.onMouseUp(event);};
  this.mouseMove = function(event) {that.onMouseMove(event);};
  this.keyDown = function(event) {that.onKeyDown(event);};
  this.touchMove = function(event) {that.onTouchMove(event,true);};
  this.touchEnd = function(event) {that.onTouchEnd(event);};

  this.domElement.addEventListener('mousedown', that.mouseDown, false);
  this.domElement.addEventListener( 'mouseup', that.mouseUp, false);
  this.domElement.addEventListener( 'mousemove', that.mouseMove, false);
  document.addEventListener( 'keydown', that.keyDown, false);

  this.domElement.addEventListener( 'touchmove', that.touchMove, false);
  this.domElement.addEventListener( 'touchend', that.touchEnd, false);

  this.active = true;

};

/**
 * Finish spawning an entity: re-enable camera controls,
 * remove listeners, remove temp object
 */
GZ3D.SpawnModel.prototype.finish = function()
{
  var that = this;

  this.domElement.removeEventListener( 'mousedown', that.mouseDown, false);
  this.domElement.removeEventListener( 'mouseup', that.mouseUp, false);
  this.domElement.removeEventListener( 'mousemove', that.mouseMove, false);
  document.removeEventListener( 'keydown', that.keyDown, false);

  this.scene.remove(this.obj);
  this.obj = undefined;
  this.active = false;
};

/**
 * Window event callback
 * @param {} event - not yet
 */
GZ3D.SpawnModel.prototype.onMouseDown = function(event)
{
  // Does this ever get called?
  // Change like this:
  // https://bitbucket.org/osrf/gzweb/pull-request/14
  event.preventDefault();
  event.stopImmediatePropagation();
};

/**
 * Window event callback
 * @param {} event - mousemove events
 */
GZ3D.SpawnModel.prototype.onMouseMove = function(event)
{
  if (!this.active)
  {
    return;
  }

  event.preventDefault();

  this.moveSpawnedModel(event.clientX,event.clientY);
};

/**
 * Window event callback
 * @param {} event - touchmove events
 */
GZ3D.SpawnModel.prototype.onTouchMove = function(event,originalEvent)
{
  if (!this.active)
  {
    return;
  }

  var e;

  if (originalEvent)
  {
    e = event;
  }
  else
  {
    e = event.originalEvent;
  }
  e.preventDefault();

  if (e.touches.length === 1)
  {
    this.moveSpawnedModel(e.touches[ 0 ].pageX,e.touches[ 0 ].pageY);
  }
};

/**
 * Window event callback
 * @param {} event - touchend events
 */
GZ3D.SpawnModel.prototype.onTouchEnd = function()
{
  if (!this.active)
  {
    return;
  }

  this.callback(this.obj);
  this.finish();
};

/**
 * Window event callback
 * @param {} event - mousedown events
 */
GZ3D.SpawnModel.prototype.onMouseUp = function(event)
{
  if (!this.active)
  {
    return;
  }

  this.callback(this.obj);
  this.finish();
};

/**
 * Window event callback
 * @param {} event - keydown events
 */
GZ3D.SpawnModel.prototype.onKeyDown = function(event)
{
  if ( event.keyCode === 27 ) // Esc
  {
    this.finish();
  }
};

/**
 * Move temp spawned model
 * @param {integer} positionX - Horizontal position on the canvas
 * @param {integer} positionY - Vertical position on the canvas
 */
GZ3D.SpawnModel.prototype.moveSpawnedModel = function(positionX, positionY)
{
  var vector = new THREE.Vector3( (positionX / window.innerWidth) * 2 - 1,
        -(positionY / window.innerHeight) * 2 + 1, 0.5);
  vector.unproject(this.scene.camera);
  this.ray.set(this.scene.camera.position,
      vector.sub(this.scene.camera.position).normalize());
  var point = this.ray.intersectPlane(this.plane);

  if (!point)
  {
    return;
  }

  point.z = this.obj.position.z;

  if(this.snapDist)
  {
    point.x = Math.round(point.x / this.snapDist) * this.snapDist;
    point.y = Math.round(point.y / this.snapDist) * this.snapDist;
  }

  this.scene.setPose(this.obj, point, new THREE.Quaternion());

  if (this.obj.children[0].children[0] &&
     (this.obj.children[0].children[0] instanceof THREE.SpotLight ||
      this.obj.children[0].children[0] instanceof THREE.DirectionalLight))
  {
    var lightObj = this.obj.children[0].children[0];
    if (lightObj.direction)
    {
      if (lightObj.target)
      {
        lightObj.target.position.copy(lightObj.direction);
      }
    }
  }
};

/**
 * Generate unique name for spawned entity
 * @param {string} entity - entity type
 */
GZ3D.SpawnModel.prototype.generateUniqueName = function(entity)
{
  var i = 0;
  while (i < 1000)
  {
    if (this.scene.getByName(entity+'_'+i))
    {
      ++i;
    }
    else
    {
      return entity+'_'+i;
    }
  }
};
