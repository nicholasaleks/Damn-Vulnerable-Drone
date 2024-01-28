// Based on TransformControls.js
// original author: arodic / https://github.com/arodic

/**
 * Manipulator to perform translate and rotate transforms on objects
 * within the scene.
 * @constructor
 */
GZ3D.Manipulator = function(camera, mobile, domElement, doc)
{
  // Needs camera for perspective
  this.camera = camera;

  // For mouse/touch events
  this.domElement = (domElement !== undefined) ? domElement : document;
  this.document = (doc !== undefined) ? doc : document;

  // Mobile / desktop
  this.mobile = (mobile !== undefined) ? mobile : false;

  // Object to be manipulated
  this.object = undefined;

  // translate / rotate
  this.mode = 'translate';

  // world / local
  this.space = 'world';

  // hovered used for backwards compatibility
  // Whenever it wasn't an issue, hovered and active were combined
  // into selected
  this.hovered = false;
  this.selected = 'null';

  this.scale = 1;

  this.snapDist = null;
  this.modifierAxis = new THREE.Vector3(1, 1, 1);
  this.gizmo = new THREE.Object3D();

  this.pickerNames = [];

  var scope = this;

  var changeEvent = {type: 'change'};

  var ray = new THREE.Raycaster();
  var pointerVector = new THREE.Vector2();

  var point = new THREE.Vector3();
  var offset = new THREE.Vector3();

  var rotation = new THREE.Vector3();
  var offsetRotation = new THREE.Vector3();

  var lookAtMatrix = new THREE.Matrix4();
  var eye = new THREE.Vector3();

  var tempMatrix = new THREE.Matrix4();
  var tempVector = new THREE.Vector3();
  var tempQuaternion = new THREE.Quaternion();
  var unitX = new THREE.Vector3(1, 0, 0);
  var unitY = new THREE.Vector3(0, 1, 0);
  var unitZ = new THREE.Vector3(0, 0, 1);

  var quaternionXYZ = new THREE.Quaternion();
  var quaternionX = new THREE.Quaternion();
  var quaternionY = new THREE.Quaternion();
  var quaternionZ = new THREE.Quaternion();
  var quaternionE = new THREE.Quaternion();

  var oldPosition = new THREE.Vector3();
  var oldRotationMatrix = new THREE.Matrix4();

  var parentRotationMatrix  = new THREE.Matrix4();
  var parentScale = new THREE.Vector3();

  var worldPosition = new THREE.Vector3();
  var worldRotation = new THREE.Vector3();
  var worldRotationMatrix  = new THREE.Matrix4();
  var camPosition = new THREE.Vector3();

  var hovered = null;
  var hoveredColor = new THREE.Color();

  // Picker currently selected (highlighted)
  var selectedPicker = null;
  var selectedColor = new THREE.Color();

  // Intersection planes
  var intersectionPlanes = {};
  var intersectionPlaneList = ['XY','YZ','XZ'];
  var currentPlane = 'XY';

  var planes = new THREE.Object3D();
  this.gizmo.add(planes);

  var planeMaterial = new THREE.MeshBasicMaterial(
      {visible: false, side: THREE.DoubleSide});
  for(var i in intersectionPlaneList)
  {
    intersectionPlanes[intersectionPlaneList[i]] =
        new THREE.Mesh(new THREE.PlaneGeometry(500, 500), planeMaterial);
    intersectionPlanes[intersectionPlaneList[i]].material.side =
        THREE.DoubleSide;
    planes.add(intersectionPlanes[intersectionPlaneList[i]]);
  }

  intersectionPlanes['YZ'].rotation.set(0, Math.PI/2, 0);
  intersectionPlanes['XZ'].rotation.set(-Math.PI/2, 0, 0);
  bakeTransformations(intersectionPlanes['YZ']);
  bakeTransformations(intersectionPlanes['XZ']);

  // Geometries

  var pickerAxes = {};
  var displayAxes = {};

  var HandleMaterial = function(parameters, over)
  {
    var material = new THREE.MeshBasicMaterial();
    if(over)
    {
      material.side = THREE.DoubleSide;
      material.depthTest = false;
      material.depthWrite = false;
    }
    material.transparent = true;
    material.setValues(parameters);
    if (parameters.opacity === undefined)
    {
      material.opacity = 0.5;
    }

    return material;
  };

  var LineMaterial = function(color, opacity)
  {
    var material = new THREE.LineBasicMaterial();
    material.color = color;
    material.depthTest = false;
    material.depthWrite = false;
    material.opacity = opacity !== undefined ? opacity : 1;
    material.transparent = true;
    return material;
  };

  // Colors
  var white = new THREE.Color(0xffffff);
  var gray = new THREE.Color(0x808080);
  var red = new THREE.Color(0xff0000);
  var green = new THREE.Color(0x00ff00);
  var blue = new THREE.Color(0x0000ff);
  var cyan = new THREE.Color(0x00ffff);
  var magenta = new THREE.Color(0xff00ff);
  var yellow = new THREE.Color(0xffff00);

  var geometry, mesh;

  // Translate

  pickerAxes['translate'] = new THREE.Object3D();
  displayAxes['translate'] = new THREE.Object3D();
  this.gizmo.add(pickerAxes['translate']);
  this.gizmo.add(displayAxes['translate']);

  // Picker cylinder
  if(this.mobile)
  {
    geometry = new THREE.CylinderGeometry(0.5, 0.01, 1.4, 10, 1, false);
  }
  else
  {
    geometry = new THREE.CylinderGeometry(0.2, 0.1, 0.8, 4, 1, false);
  }

  mesh = new THREE.Mesh(geometry,
      new HandleMaterial({color: red, visible: false, transparent: false}));
  mesh.position.x = 0.7;
  mesh.rotation.z = -Math.PI/2;
  bakeTransformations(mesh);
  mesh.name = 'TX';
  pickerAxes['translate'].add(mesh);
  this.pickerNames.push(mesh.name);

  mesh = new THREE.Mesh(geometry,
      new HandleMaterial({color: green, visible: false, transparent: false}));
  mesh.position.y = 0.7;
  bakeTransformations(mesh);
  mesh.name = 'TY';
  pickerAxes['translate'].add(mesh);
  this.pickerNames.push(mesh.name);

  mesh = new THREE.Mesh(geometry,
      new HandleMaterial({color: blue, visible: false, transparent: false}));
  mesh.position.z = 0.7;
  mesh.rotation.x = Math.PI/2;
  bakeTransformations(mesh);
  mesh.name = 'TZ';
  pickerAxes['translate'].add(mesh);
  this.pickerNames.push(mesh.name);

  if (this.mobile)
  {
    // Display cylinder
    geometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 10, 1, false);

    var mTXColor = new HandleMaterial({color: red, transparent: true}, true);
    mesh = new THREE.Mesh(geometry, mTXColor);
    mesh.position.x = 0.5;
    mesh.rotation.z = -Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = 'TX';
    displayAxes['translate'].add(mesh);

    var mTYColor = new HandleMaterial({color: green, transparent: true}, true);
    mesh = new THREE.Mesh(geometry, mTYColor);
    mesh.position.y = 0.5;
    bakeTransformations(mesh);
    mesh.name = 'TY';
    displayAxes['translate'].add(mesh);

    var mTZColor = new HandleMaterial({color: blue, transparent: true}, true);
    mesh = new THREE.Mesh(geometry, mTZColor);
    mesh.position.z = 0.5;
    mesh.rotation.x = Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = 'TZ';
    displayAxes['translate'].add(mesh);

    // Display cone (arrow tip)
    // make sure to reference the same material as the arrow body
    // so both can be corrected highlighted on touch start / end.
    geometry = new THREE.CylinderGeometry(0, 0.15, 0.4, 10, 1, false);

    mesh = new THREE.Mesh(geometry, mTXColor);
    mesh.position.x = 1.2;
    mesh.rotation.z = -Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = 'TX';
    displayAxes['translate'].add(mesh);

    mesh = new THREE.Mesh(geometry, mTYColor);
    mesh.position.y = 1.2;
    bakeTransformations(mesh);
    mesh.name = 'TY';
    displayAxes['translate'].add(mesh);

    mesh = new THREE.Mesh(geometry, mTZColor);
    mesh.position.z = 1.2;
    mesh.rotation.x = Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = 'TZ';
    displayAxes['translate'].add(mesh);
  }
  else
  {
    // Display lines
    geometry = new THREE.Geometry();
    geometry.vertices.push(
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)
    );
    geometry.colors.push(
        red, red, green, green, blue, blue
    );
    var material = new THREE.LineBasicMaterial({
        vertexColors: THREE.VertexColors,
        depthTest: false,
        depthWrite: false,
        transparent: true
    });
    mesh = new THREE.Line(geometry, material, THREE.LineSegments);
    displayAxes['translate'].add(mesh);

    // Display cone (arrow tip)
    geometry = new THREE.CylinderGeometry(0, 0.05, 0.2, 4, 1, true);

    mesh = new THREE.Mesh(geometry, new HandleMaterial(
        {color: red, opacity: 1}, true));
    mesh.position.x = 1.1;
    mesh.rotation.z = -Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = 'TX';
    displayAxes['translate'].add(mesh);

    mesh = new THREE.Mesh(geometry, new HandleMaterial(
        {color: green, opacity: 1}, true));
    mesh.position.y = 1.1;
    bakeTransformations(mesh);
    mesh.name = 'TY';
    displayAxes['translate'].add(mesh);

    mesh = new THREE.Mesh(geometry, new HandleMaterial(
        {color: blue, opacity: 1}, true));
    mesh.position.z = 1.1;
    mesh.rotation.x = Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = 'TZ';
    displayAxes['translate'].add(mesh);

    // Picker and display octahedron for TXYZ
    mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0),
        new HandleMaterial({color: white, opacity: 0.25}, true));
    mesh.name = 'TXYZ';
    this.pickerNames.push(mesh.name);
    displayAxes['translate'].add(mesh);

    mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0),
        new HandleMaterial({color: white, visible: false}, true));
    mesh.name = 'TXYZ';
    pickerAxes['translate'].add(mesh);

    // Picker and display planes
    geometry = new THREE.PlaneGeometry(0.3, 0.3);

    mesh = new THREE.Mesh(geometry, new HandleMaterial(
        {color: yellow, opacity: 0.25}, true));
    mesh.position.set(0.15, 0.15, 0);
    bakeTransformations(mesh);
    mesh.name = 'TXY';
    this.pickerNames.push(mesh.name);
    displayAxes['translate'].add(mesh);

    mesh = new THREE.Mesh(geometry, new HandleMaterial(
        {color: yellow, visible: false}, true));
    mesh.position.set(0.15, 0.15, 0);
    bakeTransformations(mesh);
    mesh.name = 'TXY';
    pickerAxes['translate'].add(mesh);

    mesh = new THREE.Mesh(geometry, new HandleMaterial(
        {color: cyan, opacity: 0.25}, true));
    mesh.position.set(0, 0.15, 0.15);
    mesh.rotation.y = Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = 'TYZ';
    this.pickerNames.push(mesh.name);
    displayAxes['translate'].add(mesh);

    mesh = new THREE.Mesh(geometry, new HandleMaterial(
        {color: cyan, visible: false}, true));
    mesh.position.set(0, 0.15, 0.15);
    mesh.rotation.y = Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = 'TYZ';
    pickerAxes['translate'].add(mesh);

    mesh = new THREE.Mesh(geometry, new HandleMaterial(
        {color: magenta, opacity: 0.25}, true));
    mesh.position.set(0.15, 0, 0.15);
    mesh.rotation.x = Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = 'TXZ';
    this.pickerNames.push(mesh.name);
    displayAxes['translate'].add(mesh);

    mesh = new THREE.Mesh(geometry, new HandleMaterial(
        {color: magenta, visible: false}, true));
    mesh.position.set(0.15, 0, 0.15);
    mesh.rotation.x = Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = 'TXZ';
    pickerAxes['translate'].add(mesh);
  }

  // Rotate

  pickerAxes['rotate'] = new THREE.Object3D();
  displayAxes['rotate'] = new THREE.Object3D();
  this.gizmo.add(pickerAxes['rotate']);
  this.gizmo.add(displayAxes['rotate']);

  // RX, RY, RZ

  // Picker torus
  if(this.mobile)
  {
    geometry = new THREE.TorusGeometry(1, 0.3, 4, 36, 2*Math.PI);
  }
  else
  {
    geometry = new THREE.TorusGeometry(1, 0.15, 4, 6, Math.PI);
  }

  mesh = new THREE.Mesh(geometry, new HandleMaterial(
      {color: red, visible: false, transparent: false}, false));
  mesh.rotation.z = -Math.PI/2;
  mesh.rotation.y = -Math.PI/2;
  bakeTransformations(mesh);
  mesh.name = 'RX';
  pickerAxes['rotate'].add(mesh);
  this.pickerNames.push(mesh.name);

  mesh = new THREE.Mesh(geometry, new HandleMaterial(
      {color: green, visible: false, transparent: false}, false));
  mesh.rotation.z = Math.PI;
  mesh.rotation.x = -Math.PI/2;
  bakeTransformations(mesh);
  mesh.name = 'RY';
  pickerAxes['rotate'].add(mesh);
  this.pickerNames.push(mesh.name);

  mesh = new THREE.Mesh(geometry, new HandleMaterial(
      {color: blue, visible: false, transparent: false}, false));
  mesh.rotation.z = -Math.PI/2;
  bakeTransformations(mesh);
  mesh.name = 'RZ';
  pickerAxes['rotate'].add(mesh);
  this.pickerNames.push(mesh.name);

  if (this.mobile)
  {
    // Display torus
    geometry = new THREE.TorusGeometry(1, 0.1, 4, 36, 2*Math.PI);

    mesh = new THREE.Mesh(geometry, new HandleMaterial({color: blue}, false));
    mesh.rotation.z = -Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = 'RZ';
    displayAxes['rotate'].add(mesh);

    mesh = new THREE.Mesh(geometry, new HandleMaterial({color: red}, false));
    mesh.rotation.z = -Math.PI/2;
    mesh.rotation.y = -Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = 'RX';
    displayAxes['rotate'].add(mesh);

    mesh = new THREE.Mesh(geometry, new HandleMaterial({color: green}, false));
    mesh.rotation.z = Math.PI;
    mesh.rotation.x = -Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = 'RY';
    displayAxes['rotate'].add(mesh);
  }
  else
  {
    // Display circles
    var Circle = function(radius, facing, arc)
    {
      geometry = new THREE.Geometry();
      arc = arc ? arc : 1;
      for(var i = 0; i <= 64 * arc; ++i)
      {
        if(facing === 'x')
        {
          geometry.vertices.push(new THREE.Vector3(
              0, Math.cos(i / 32 * Math.PI), Math.sin(i / 32 * Math.PI))
              .multiplyScalar(radius));
        }
        if(facing === 'y')
        {
          geometry.vertices.push(new THREE.Vector3(
              Math.cos(i / 32 * Math.PI), 0, Math.sin(i / 32 * Math.PI))
              .multiplyScalar(radius));
        }
        if(facing === 'z')
        {
          geometry.vertices.push(new THREE.Vector3(
              Math.sin(i / 32 * Math.PI), Math.cos(i / 32 * Math.PI), 0)
              .multiplyScalar(radius));
        }
      }
      return geometry;
    };

    mesh = new THREE.Line(new Circle(1, 'x', 0.5), new LineMaterial(red));
    mesh.name = 'RX';
    displayAxes['rotate'].add(mesh);

    mesh = new THREE.Line(new Circle(1, 'y', 0.5), new LineMaterial(green));
    mesh.name = 'RY';
    displayAxes['rotate'].add(mesh);

    mesh = new THREE.Line(new Circle(1, 'z', 0.5), new LineMaterial(blue));
    mesh.name = 'RZ';
    displayAxes['rotate'].add(mesh);

    mesh = new THREE.Line(new Circle(1, 'z'), new LineMaterial(gray));
    mesh.name = 'RXYZE';
    this.pickerNames.push(mesh.name);
    displayAxes['rotate'].add(mesh);

    mesh = new THREE.Line(new Circle(1.25, 'z'),
        new LineMaterial(yellow, 0.25));
    mesh.name = 'RE';
    this.pickerNames.push(mesh.name);
    displayAxes['rotate'].add(mesh);

    // Picker spheres
    mesh = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 12),
        new HandleMaterial({color: gray, visible: false}, true));
    mesh.name = 'RXYZE';
    pickerAxes['rotate'].add(mesh);
    this.pickerNames.push(mesh.name);

    intersectionPlanes['SPHERE'] = new THREE.Mesh(new
        THREE.SphereGeometry(0.95, 12, 12),
        new HandleMaterial({color: white, visible: false}, true));
    planes.add(intersectionPlanes['SPHERE']);

    mesh = new THREE.Mesh(new THREE.TorusGeometry(1.30, 0.15, 4, 12),
        new HandleMaterial({color: yellow, visible: false}, true));
    mesh.name = 'RE';
    pickerAxes['rotate'].add(mesh);
    this.pickerNames.push(mesh.name);
  }
  mesh = null;

  /**
   * Attach gizmo to an object
   * @param {THREE.Object3D} - Model to be manipulated
   */
  this.attach = function(object)
  {
    this.object = object;
    this.setMode(scope.mode);

    if(this.mobile)
    {
      this.domElement.addEventListener('touchstart', onTouchStart, false);
    }
    else
    {
      this.domElement.addEventListener('mousedown', onMouseDown, false);
      this.domElement.addEventListener('mousemove', onMouseHover, false);
    }
  };

  /**
   * Detatch gizmo from an object
   * @param {THREE.Object3D} - Model
   */
  this.detach = function(object)
  {
    this.object = undefined;
    this.selected = 'null';

    this.hide();

    if(this.mobile)
    {
      this.domElement.removeEventListener('touchstart', onTouchStart, false);
    }
    else
    {
      this.domElement.removeEventListener('mousedown', onMouseDown, false);
      this.domElement.removeEventListener('mousemove', onMouseHover, false);
    }
  };

  /**
   * Update gizmo's pose and scale
   */
  this.update = function()
  {
    if(this.object === undefined)
    {
      return;
    }

    this.object.updateMatrixWorld();
    worldPosition.setFromMatrixPosition(this.object.matrixWorld);

    this.camera.updateMatrixWorld();
    camPosition.setFromMatrixPosition(this.camera.matrixWorld);

    var scale = worldPosition.distanceTo(camPosition) / 6 * this.scale;
    this.gizmo.position.copy(worldPosition);
    this.gizmo.scale.set(scale, scale, scale);

    for(var i in this.gizmo.children)
    {
      for(var j in this.gizmo.children[i].children)
      {
        var object = this.gizmo.children[i].children[j];
        var name = object.name;

        if(name.search('E') !== -1)
        {
          lookAtMatrix.lookAt(camPosition, worldPosition,
              tempVector.set(0, 1, 0));
          object.rotation.setFromRotationMatrix(lookAtMatrix);
        }
        else
        {
          eye.copy(camPosition).sub(worldPosition).normalize();

          if (this.space === 'local')
          {
            tempQuaternion.setFromRotationMatrix(tempMatrix
                .extractRotation(this.object.matrixWorld));

            if (name.search('R') !== -1)
            {
              tempMatrix.makeRotationFromQuaternion(tempQuaternion)
                  .getInverse(tempMatrix);
              eye.applyMatrix4(tempMatrix);

              if (name === 'RX')
              {
                quaternionX.setFromAxisAngle(unitX, Math.atan2(-eye.y, eye.z));
                tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionX);
              }
              if (name ==='RY')
              {
                quaternionY.setFromAxisAngle(unitY, Math.atan2( eye.x, eye.z));
                tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionY);
              }
              if (name === 'RZ')
              {
                quaternionZ.setFromAxisAngle(unitZ, Math.atan2( eye.y, eye.x));
                tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionZ);
              }
            }
            object.quaternion.copy(tempQuaternion);
          }
          else if (this.space === 'world')
          {
            object.rotation.set(0, 0, 0);

            if(name === 'RX')
            {
              object.rotation.x = Math.atan2(-eye.y, eye.z);
            }
            if(name === 'RY')
            {
              object.rotation.y = Math.atan2( eye.x, eye.z);
            }
            if(name === 'RZ')
            {
              object.rotation.z = Math.atan2( eye.y, eye.x);
            }
          }
        }
      }
    }
  };

  /**
   * Hide gizmo
   */
  this.hide = function()
  {
    for(var i in displayAxes)
    {
      for(var j in displayAxes[i].children)
      {
        displayAxes[i].children[j].visible = false;
      }
    }
  };

  /**
   * Set mode
   * @param {string} value - translate | rotate
   */
  this.setMode = function(value)
  {
    scope.mode = value;

    this.hide();

    for(var i in displayAxes[this.mode].children)
    {
      displayAxes[this.mode].children[i].visible = true;
    }
    scope.update();
  };

  /**
   * Choose intersection plane
   */
  this.setIntersectionPlane = function()
  {
    eye.copy(camPosition).sub(worldPosition).normalize();

    if (this.space === 'local')
    {
       eye.applyMatrix4(tempMatrix.getInverse(scope.object.matrixWorld));
    }

    if (isSelected('TXYZ'))
    {
      if (Math.abs(eye.x) > Math.abs(eye.y) &&
          Math.abs(eye.x) > Math.abs(eye.z))
      {
        currentPlane = 'YZ';
      }
      else if (Math.abs(eye.y) > Math.abs(eye.x) &&
               Math.abs(eye.y) > Math.abs(eye.z))
      {
        currentPlane = 'XZ';
      }
      else
      {
        currentPlane = 'XY';
      }
    }
    else if (isSelected('RX') || isSelected('TYZ'))
    {
      currentPlane = 'YZ';
    }
    else if (isSelected('RY') || isSelected('TXZ'))
    {
      currentPlane = 'XZ';
    }
    else if (isSelected('RZ') || isSelected('TXY'))
    {
      currentPlane = 'XY';
    }
    else if (isSelected('X'))
    {
      if (Math.abs(eye.y) > Math.abs(eye.z))
      {
        currentPlane = 'XZ';
      }
      else
      {
        currentPlane = 'XY';
      }
    }
    else if (isSelected('Y'))
    {
      if (Math.abs(eye.x) > Math.abs(eye.z))
      {
        currentPlane = 'YZ';
      }
      else
      {
        currentPlane = 'XY';
      }
    }
    else if (isSelected('Z'))
    {
      if (Math.abs(eye.x) > Math.abs(eye.y))
      {
        currentPlane = 'YZ';
      }
      else
      {
        currentPlane = 'XZ';
      }
    }
  };

  /**
   * Window event callback
   * @param {} event
   */
  function onTouchStart(event)
  {
    event.preventDefault();

    var intersect = intersectObjects(event, pickerAxes[scope.mode].children);

    // If one of the current pickers was touched
    if(intersect)
    {
      if(selectedPicker !== intersect.object)
      {
        var selectedDisplay = null;
        // Back to original color
        if(selectedPicker !== null)
        {
          selectedDisplay =
              displayAxes[scope.mode].getObjectByName(selectedPicker.name);
          if (selectedDisplay)
          {
            selectedDisplay.material.color.copy(selectedColor);
          }
        }

        selectedPicker = intersect.object;

        // Save color for when it's deselected
        selectedColor.copy(selectedPicker.material.color);

        // Darken color
        selectedDisplay =
            displayAxes[scope.mode].getObjectByName(selectedPicker.name);
        if (selectedDisplay)
        {
          selectedDisplay.material.color.offsetHSL(0, 0, -0.3);
        }


        scope.dispatchEvent(changeEvent);
      }

      scope.selected = selectedPicker.name;
      scope.hovered = true;
      scope.update();
      scope.setIntersectionPlane();

      var planeIntersect = intersectObjects(event,
          [intersectionPlanes[currentPlane]]);

      if(planeIntersect)
      {
        oldPosition.copy(scope.object.position);

        oldRotationMatrix.extractRotation(scope.object.matrix);
        worldRotationMatrix.extractRotation(scope.object.matrixWorld);

        parentRotationMatrix.extractRotation(scope.object.parent.matrixWorld);
        parentScale.setFromMatrixScale(tempMatrix.getInverse(
            scope.object.parent.matrixWorld));

        offset.copy(planeIntersect.point);
      }
    }

    scope.document.addEventListener('touchmove', onPointerMove, false);
    scope.document.addEventListener('touchend', onTouchEnd, false);
  }


  /**
   * Window event callback
   * @param {} event
   */
  function onTouchEnd()
  {
    // Previously selected picker back to its color
    if(selectedPicker)
    {
      var selectedDisplay =
          displayAxes[scope.mode].getObjectByName(selectedPicker.name);
      if (selectedDisplay)
      {
        selectedDisplay.material.color.copy(selectedColor);
      }
    }

    selectedPicker = null;

    scope.dispatchEvent(changeEvent);

    scope.selected = 'null';
    scope.hovered = false;

    scope.document.removeEventListener('touchmove', onPointerMove, false);
    scope.document.removeEventListener('touchend', onTouchEnd, false);
  }

  /**
   * Window event callback
   * @param {} event
   */
  function onMouseHover(event)
  {
    event.preventDefault();

    if(event.button === 0 && scope.selected === 'null')
    {
      var intersect = intersectObjects(event, pickerAxes[scope.mode].children);

      var hoveredDisplay = null;
      if(intersect)
      {
        if(hovered !== intersect.object)
        {
          if(hovered !== null)
          {
            // revert display axis color
            hoveredDisplay =
                displayAxes[scope.mode].getObjectByName(hovered.name);
            if (hoveredDisplay)
            {
              hoveredDisplay.material.color.copy(hoveredColor);
            }
          }

          selectedPicker = intersect.object;
          hovered = intersect.object;
          hoveredColor.copy(hovered.material.color);

          // highlight display axis color
          hoveredDisplay =
              displayAxes[scope.mode].getObjectByName(hovered.name);
          if (hoveredDisplay)
          {
            hoveredDisplay.material.color.offsetHSL(0, 0, -0.3);
          }

          scope.dispatchEvent(changeEvent);
        }
        scope.hovered = true;
      }
      else if(hovered !== null)
      {
        // hovered.material.color.copy(hoveredColor);
        // revert display axis color
        hoveredDisplay =
            displayAxes[scope.mode].getObjectByName(hovered.name);
        if (hoveredDisplay)
        {
          hoveredDisplay.material.color.copy(hoveredColor);
        }

        hovered = null;

        scope.dispatchEvent(changeEvent);

        scope.hovered = false;
      }
    }
    scope.document.addEventListener('mousemove', onPointerMove, false);
    scope.document.addEventListener('mouseup', onMouseUp, false);
  }

  /**
   * Window event callback
   * @param {} event
   */
  function onMouseDown(event)
  {
    event.preventDefault();

    if(event.button !== 0)
    {
      return;
    }

    var intersect = intersectObjects(event, pickerAxes[scope.mode].children);

    if(intersect)
    {
        scope.selected = selectedPicker.name;

        scope.update();
        scope.setIntersectionPlane();

        var planeIntersect = intersectObjects(event,
            [intersectionPlanes[currentPlane]]);

        if(planeIntersect)
        {
          oldPosition.copy(scope.object.position);

          oldRotationMatrix.extractRotation(scope.object.matrix);
          worldRotationMatrix.extractRotation(scope.object.matrixWorld);

          parentRotationMatrix.extractRotation(
              scope.object.parent.matrixWorld);
          parentScale.setFromMatrixScale(tempMatrix.getInverse(
              scope.object.parent.matrixWorld));

          offset.copy(planeIntersect.point);
        }
    }

    scope.document.addEventListener('mousemove', onPointerMove, false);
    scope.document.addEventListener('mouseup', onMouseUp, false);
  }

  /**
   * Window event callback (mouse move and touch move)
   * @param {} event
   */
  function onPointerMove(event)
  {
    if(scope.selected === 'null')
    {
      return;
    }

    event.preventDefault();

    
    var planeIntersect = intersectObjects(event,
        [intersectionPlanes[currentPlane]]);

    if(planeIntersect)
    {
      point.copy(planeIntersect.point);

      if((scope.mode === 'translate') && isSelected('T'))
      {
        point.sub(offset);
        point.multiply(parentScale);

        if (scope.space === 'local')
        {
          point.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));

          if(!(isSelected('X')) || scope.modifierAxis.x !== 1)
          {
            point.x = 0;
          }
          if(!(isSelected('Y')) || scope.modifierAxis.y !== 1)
          {
            point.y = 0;
          }
          if(!(isSelected('Z')) || scope.modifierAxis.z !== 1)
          {
            point.z = 0;
          }
          if (isSelected('XYZ'))
          {
            point.set(0, 0, 0);
          }
          point.applyMatrix4(oldRotationMatrix);

          scope.object.position.copy(oldPosition);
          scope.object.position.add(point);
        }
        if (scope.space === 'world' || isSelected('XYZ'))
        {
          if(!(isSelected('X')) || scope.modifierAxis.x !== 1)
          {
            point.x = 0;
          }
          if(!(isSelected('Y')) || scope.modifierAxis.y !== 1)
          {
            point.y = 0;
          }
          if(!(isSelected('Z')) || scope.modifierAxis.z !== 1)
          {
            point.z = 0;
          }

          point.applyMatrix4(tempMatrix.getInverse(parentRotationMatrix));

          scope.object.position.copy(oldPosition);
          scope.object.position.add(point);

          if(scope.snapDist)
          {
            if(isSelected('X'))
            {
              scope.object.position.x = Math.round(scope.object.position.x /
                  scope.snapDist) * scope.snapDist;
            }
            if(isSelected('Y'))
            {
              scope.object.position.y = Math.round(scope.object.position.y /
                  scope.snapDist) * scope.snapDist;
            }
            if(isSelected('Z'))
            {
              scope.object.position.z = Math.round(scope.object.position.z /
                  scope.snapDist) * scope.snapDist;
            }
          }
        }
      }
      else if((scope.mode === 'rotate') && isSelected('R'))
      {
        point.sub(worldPosition);
        point.multiply(parentScale);
        tempVector.copy(offset).sub(worldPosition);
        tempVector.multiply(parentScale);

        if(scope.selected === 'RE')
        {
          point.applyMatrix4(tempMatrix.getInverse(lookAtMatrix));
          tempVector.applyMatrix4(tempMatrix.getInverse(lookAtMatrix));

          rotation.set(Math.atan2(point.z, point.y),
                       Math.atan2(point.x, point.z),
                       Math.atan2(point.y, point.x));
          offsetRotation.set(Math.atan2(tempVector.z, tempVector.y),
                             Math.atan2(tempVector.x, tempVector.z),
                             Math.atan2(tempVector.y, tempVector.x));

          tempQuaternion.setFromRotationMatrix(
            tempMatrix.getInverse(parentRotationMatrix));

          quaternionE.setFromAxisAngle(eye, rotation.z - offsetRotation.z);
          quaternionXYZ.setFromRotationMatrix(worldRotationMatrix);

          tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionE);
          tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionXYZ);

          scope.object.quaternion.copy(tempQuaternion);
        }
        else if(scope.selected === 'RXYZE')
        {
          // has this ever worked?
          quaternionE.setFromEuler(
            point.clone().cross(tempVector).normalize());

          tempQuaternion.setFromRotationMatrix(
            tempMatrix.getInverse(parentRotationMatrix));
          quaternionX.setFromAxisAngle(
            quaternionE, - point.clone().angleTo(tempVector));
          quaternionXYZ.setFromRotationMatrix(worldRotationMatrix);

          tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionX);
          tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionXYZ);

          scope.object.quaternion.copy(tempQuaternion);
        }
        else
        {
          if (scope.space === 'local')
          {
            point.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));

            tempVector.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));

            rotation.set(Math.atan2(point.z, point.y),
              Math.atan2(point.x, point.z), Math.atan2(point.y, point.x));
            offsetRotation.set(Math.atan2(tempVector.z, tempVector.y),
              Math.atan2(tempVector.x, tempVector.z),
                Math.atan2(tempVector.y, tempVector.x));

            quaternionXYZ.setFromRotationMatrix(oldRotationMatrix);
            quaternionX.setFromAxisAngle(unitX, rotation.x - offsetRotation.x);
            quaternionY.setFromAxisAngle(unitY, rotation.y - offsetRotation.y);
            quaternionZ.setFromAxisAngle(unitZ, rotation.z - offsetRotation.z);

            if (scope.selected === 'RX')
            {
              quaternionXYZ.multiplyQuaternions(quaternionXYZ, quaternionX);
            }
            if (scope.selected === 'RY')
            {
              quaternionXYZ.multiplyQuaternions(quaternionXYZ, quaternionY);
            }
            if (scope.selected === 'RZ')
            {
              quaternionXYZ.multiplyQuaternions(quaternionXYZ, quaternionZ);
            }

            scope.object.quaternion.copy(quaternionXYZ);
          }
          else if (scope.space === 'world')
          {
            rotation.set(Math.atan2(point.z, point.y),
              Math.atan2(point.x, point.z), Math.atan2(point.y, point.x));
            offsetRotation.set(Math.atan2(tempVector.z, tempVector.y),
              Math.atan2(tempVector.x, tempVector.z),
                Math.atan2(tempVector.y, tempVector.x));

            tempQuaternion.setFromRotationMatrix(tempMatrix.getInverse(
              parentRotationMatrix));

            quaternionX.setFromAxisAngle(unitX, rotation.x - offsetRotation.x);
            quaternionY.setFromAxisAngle(unitY, rotation.y - offsetRotation.y);
            quaternionZ.setFromAxisAngle(unitZ, rotation.z - offsetRotation.z);
            quaternionXYZ.setFromRotationMatrix(worldRotationMatrix);

            if(scope.selected === 'RX')
            {
              tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionX);
            }
            if(scope.selected === 'RY')
            {
              tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionY);
            }
            if(scope.selected === 'RZ')
            {
              tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionZ);
            }

            tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionXYZ);

            scope.object.quaternion.copy(tempQuaternion);
          }
        }
      }
    }

    scope.update();
    scope.dispatchEvent(changeEvent);
  }

  function onMouseUp(event)
  {
    scope.selected = 'null';

    scope.document.removeEventListener('mousemove', onPointerMove, false);
    scope.document.removeEventListener('mouseup', onMouseUp, false);
  }

  /**
   * intersectObjects
   * @param {} event
   * @param {} objects
   * @returns {?}
   */
  function intersectObjects(event, objects)
  {
    var pointer = event.touches ? event.touches[0] : event;

    var rect = domElement.getBoundingClientRect();
    var x = (pointer.clientX - rect.left) / rect.width;
    var y = (pointer.clientY - rect.top) / rect.height;
    pointerVector.set(x * 2 - 1, - y * 2 + 1);
    ray.setFromCamera(pointerVector, scope.camera);

    // checks all intersections between the ray and the objects,
    // true to check the descendants
    var intersections = ray.intersectObjects(objects, true);

    return intersections[0] ? intersections[0] : false;
  }

  /**
   * Checks if given name is currently selected
   * @param {} name
   * @returns {bool}
   */
  function isSelected(name)
  {
    if(scope.selected.search(name) !== -1)
    {
        return true;
    }
    else
    {
        return false;
    }
  }

  /**
   * bakeTransformations
   * @param {} object
   */
  function bakeTransformations(object)
  {
    var tempGeometry = new THREE.Geometry();
    object.updateMatrix();
    tempGeometry.merge(object.geometry, object.matrix);
    object.geometry = tempGeometry;
    object.position.set(0, 0, 0);
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);
  }
};

GZ3D.Manipulator.prototype = Object.create(THREE.EventDispatcher.prototype);
