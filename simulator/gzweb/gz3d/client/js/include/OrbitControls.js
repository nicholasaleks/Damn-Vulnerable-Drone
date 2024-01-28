/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */

/**
 * Modified by Ian Chen ichen@osrfoundation.org
 */

/*global THREE, console */

// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
// supported.
//
//    Orbit - middle mouse / touch: one finger move
//    Zoom - right mouse, or mousewheel / touch: two finger spread or squish
//    Pan - left mouse, or arrow keys / touch: two finger swipe
//
// This is a drop-in replacement for (most) TrackballControls used in examples.
// That is, include this js file and wherever you see:
//    	controls = new THREE.TrackballControls(camera);
//      controls.target.z = 150;
// Simple substitute "OrbitControls" and the control should work as-is.

THREE.OrbitControls = function (object, domElement)
{
  this.object = object;
  this.domElement = (domElement !== undefined) ? domElement : document;

  // API

  // Set to false to disable this control
  this.enabled = true;

  // "target" sets the location of focus, where the control orbits around
  // and where it pans with respect to.
  this.target = new THREE.Vector3();
  this.targetIndicator = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 20),
      new THREE.MeshPhongMaterial({emissive: 0x333300,
      color: 0xffff00,
      shading: THREE.SmoothShading}));
  this.targetIndicator.visible = false;
  this.showTargetIndicator = false;
  // center is old, deprecated; use "target" instead
  this.center = this.target;
  this.object.lookAt(this.target);
  // This option actually enables dollying in and out; left as "zoom" for
  // backwards compatibility
  this.noZoom = false;
  this.zoomSpeed = 1.0;
  // Limits to how far you can dolly in and out
  this.minDistance = 0;
  this.maxDistance = Infinity;

  // Set to true to disable this control
  this.noRotate = false;
  this.rotateSpeed = 1.0;

  // Set to true to disable this control
  this.noPan = false;
  this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

  // Set to true to automatically rotate around the target
  this.autoRotate = false;
  this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

  // How far you can orbit vertically, upper and lower limits.
  // Range is 0 to Math.PI radians.
  this.minPolarAngle = 0; // radians
  this.maxPolarAngle = Math.PI; // radians

  // Set to true to disable use of the keys
  this.noKeys = false;
  // The four arrow keys
  this.keys = {LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40};

  ////////////
  // internals

  var scope = this;

  var EPS = 0.000001;

  var rotateStart = new THREE.Vector2();
  var rotateEnd = new THREE.Vector2();
  var rotateDelta = new THREE.Vector2();

  var panStart = new THREE.Vector2();
  var panEnd = new THREE.Vector2();
  var panDelta = new THREE.Vector2();

  var dollyStart = new THREE.Vector2();
  var dollyEnd = new THREE.Vector2();
  var dollyDelta = new THREE.Vector2();

  var phiDelta = 0;
  var thetaDelta = 0;
  var scale = 1;
  var pan = new THREE.Vector3();

  var lastPosition = new THREE.Vector3();

  var STATE = {NONE : -1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3,
      TOUCH_DOLLY_PAN : 4};
  var state = STATE.NONE;

  var scrollTime = null;

  // events

  var changeEvent =
  {
    type: 'change'
  };

  this.rotateLeft = function (angle)
  {
    if (angle === undefined)
    {
      angle = getAutoRotationAngle();
    }
    thetaDelta -= angle;
  };

  this.rotateUp = function (angle)
  {
    if (angle === undefined)
    {
      angle = getAutoRotationAngle();
    }
    phiDelta -= angle;
  };

  // pass in distance in world space to move left
  this.panLeft = function (distance)
  {
    var panOffset = new THREE.Vector3();
    var te = this.object.matrix.elements;
    // get X column of matrix
    panOffset.set(te[0], te[1], te[2]);
    panOffset.multiplyScalar(-distance);

    pan.add(panOffset);
  };

  // pass in distance in world space to move up
  this.panUp = function (distance)
  {
    var panOffset = new THREE.Vector3();
    var te = this.object.matrix.elements;
    // get Y column of matrix
    panOffset.set(te[4], te[5], te[6]);
    panOffset.multiplyScalar(distance);

    pan.add(panOffset);
  };

  // main entry point; pass in Vector2 of change desired in pixel space,
  // right and down are positive
  this.pan = function (delta)
  {
    var element = scope.domElement === document ?
        scope.domElement.body : scope.domElement;

    if (scope.object.fov !== undefined)
    {
      // perspective
      var position = scope.object.position;
      var offset = position.clone().sub(scope.target);

      var targetDistance = offset.length();

      var vfov = scope.object.fov * Math.PI / 180.0;
      var hfov = 2 * Math.atan(Math.tan(vfov / 2.0) * scope.object.aspect);
      scope.panLeft(2 * delta.x * targetDistance * Math.tan(hfov/2)
          / element.clientWidth);
      scope.panUp(2 * delta.y * targetDistance * Math.tan(vfov/2)
          / element.clientHeight);
    }
    else if (scope.object.top !== undefined)
    {
      // orthographic
      scope.panLeft(delta.x * (scope.object.right - scope.object.left) /
          element.clientWidth);
      scope.panUp(delta.y * (scope.object.top - scope.object.bottom) /
          element.clientHeight);
    }
    else
    {
      // camera neither orthographic or perspective - warn user
      console.warn('WARNING: OrbitControls.js encountered an unknown'+
                   'camera type - pan disabled.');
    }
  };

  this.dollyIn = function (dollyScale)
  {
    if (dollyScale === undefined)
    {
      dollyScale = getZoomScale();
    }

    scale /= dollyScale;
  };

  this.dollyOut = function (dollyScale)
  {
    if (dollyScale === undefined)
    {
      dollyScale = getZoomScale();
    }

    scale *= dollyScale;
  };

  this.update = function ()
  {
    var position = this.object.position;
    var offset = position.clone().sub(this.target);

    // angle from y-axis around z-axis
    var theta = Math.atan2(offset.x, offset.y);

    // angle from z-axis
    var phi = Math.atan2(Math.sqrt(offset.x * offset.x + offset.y * offset.y),
        offset.z);

    if (this.autoRotate)
    {
      this.rotateLeft(getAutoRotationAngle());
    }

    var oldTheta = theta;
    var oldPhi = phi;

    theta -= thetaDelta;
    phi += phiDelta;

    // restrict phi to be between desired limits
    phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, phi));

    // restrict phi to be betwee EPS and PI-EPS
    phi = Math.max(EPS, Math.min(Math.PI - EPS, phi));

    var radius = offset.length() * scale;

    // restrict radius to be between desired limits
    radius = Math.max(this.minDistance, Math.min(this.maxDistance, radius));

    // move target to panned location
    this.target.add(pan);

    offset.x = radius * Math.sin(phi) * Math.sin(theta);
    offset.z = radius * Math.cos(phi);
    offset.y = radius * Math.sin(phi) * Math.cos(theta);

    if (thetaDelta || phiDelta)
    {
      var rotateAroundWorldAxis = function (object, axis, radians)
      {
        rotWorldMatrix = new THREE.Matrix4();
        rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);
        rotWorldMatrix.multiply(object.matrix); // pre-multiply

        rotWorldMatrix.decompose(object.position,
            object.quaternion, object.scale);
        object.updateMatrix();
      }

      this.object.position.sub(this.target);
      this.object.updateMatrix();
      rotateAroundWorldAxis(this.object, new THREE.Vector3(0, 0, 1),
          oldTheta - theta);
      var localPitch = new THREE.Vector3(1, 0, 0);
      localPitch.applyQuaternion(this.object.quaternion);
      rotateAroundWorldAxis(this.object, localPitch, phi - oldPhi);
      this.object.position.add(this.target);
      this.object.updateMatrix();

      /*var refObj = new THREE.Object3D();
      refObj.position.x = this.target.x;
      refObj.position.y = this.target.y;
      refObj.position.z = this.target.z;
      refObj.updateMatrix();
      refObj.updateMatrixWorld();

      var parent = this.object.parent;
      if (parent)
      {
        parent.remove(this.object);
     }

      refObj.add(this.object);
      this.object.position.x = offset.x;
      this.object.position.y = offset.y;
      this.object.position.z = offset.z;

//      console.log (offset.x + ' ' + offset.y + ' ');
      this.object.updateMatrix();
      this.object.updateMatrixWorld();

      var quat = new THREE.Quaternion();
      quat.setFromEuler(new THREE.Vector3(theta, 0, phi));
//      console.log('p t ' + phi + ' ' + theta);
      refObj.quaternion.w = quat.w;
      refObj.quaternion.x = quat.x;
      refObj.quaternion.y = quat.y;
      refObj.quaternion.z = quat.z;
      refObj.updateMatrix();
      refObj.updateMatrixWorld();

      var matrixWorld = new THREE.Matrix4();
      matrixWorld.copy(this.object.matrixWorld);

      refObj.remove(this.object);
      if (parent)
        parent.add(this.object);


      matrixWorld.decompose(this.object.position, this.object.quaternion,
          this.object.scale);
      console.log('p t ' + this.object.position.x + ' ' + this.object.position.y + ' ' +
          this.object.position.z);

//      this.object.matrxiWorld = matrixWorld;
      this.object.updateMatrix();
      this.object.updateMatrixWorld();*/
      //this.object.lookAt(this.target);
    }
    else
    {
      position.copy(this.target).add(offset);
//		  position.copy(newPos).add(offset);
    }

    //console.log(offset.x + ' ' + offset.y + ' ' +  offset.z);

    thetaDelta = 0;
    phiDelta = 0;
    scale = 1;
    pan.set(0,0,0);

    if (lastPosition.distanceTo(this.object.position) > 0)
    {
      this.dispatchEvent(changeEvent);
      lastPosition.copy(this.object.position);
    }

    if (scope.enabled === false)
    {
      setTargetIndicatorVisible(false)
    }

    var millisecs = new Date().getTime();
    if (scrollTime && millisecs - scrollTime > 400)
    {
      setTargetIndicatorVisible(false)
      scrollTime = null;
    }

    if (scope.targetIndicator.visible)
    {
      var scaleVec = new THREE.Vector3();
      scaleVec.copy(object.position).sub(scope.targetIndicator.position);
      var indicatorScale = scaleVec.length()/100;
      scope.targetIndicator.scale.set(
          indicatorScale, indicatorScale, indicatorScale);
    }

  };

  function setTargetIndicatorVisible(visible)
  {
    scope.targetIndicator.visible = visible;
    if (!scope.showTargetIndicator)
    {
      scope.targetIndicator.visible = false;
    }
  }

  function getAutoRotationAngle()
  {
    return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
  }

  function getZoomScale()
  {
    return Math.pow(0.95, scope.zoomSpeed);
  }

  function onMouseDown(event)
  {
    if (scope.enabled === false)
    {
      return;
    }
    event.preventDefault();

    if (event.shiftKey && event.button === 0)
    {
      if (scope.noRotate === true)
      {
        return;
      }
      state = STATE.ROTATE;
      rotateStart.set(event.clientX, event.clientY);
    }
    else if (event.button === 1)
    {
      if (scope.noRotate === true)
      {
        return;
      }

      state = STATE.ROTATE;

      rotateStart.set(event.clientX, event.clientY);
    }
    else if (event.button === 2)
    {
      if (scope.noZoom === true)
      {
        return;
      }

      state = STATE.DOLLY;

      dollyStart.set(event.clientX, event.clientY);
    }
    else if (event.button === 0)
    {
      if (scope.noPan === true)
      {
        return;
      }

      state = STATE.PAN;

      panStart.set(event.clientX, event.clientY);
    }
    scope.targetIndicator.position.set(scope.target.x,scope.target.y,
        scope.target.z);
    setTargetIndicatorVisible(true)

    scope.domElement.addEventListener('mousemove', onMouseMove, false);
    scope.domElement.addEventListener('mouseup', onMouseUp, false);
  }

  function onMouseMove(event)
  {
    if (scope.enabled === false)
    {
      scope.domElement.removeEventListener('mousemove', onMouseMove, false);
      scope.domElement.removeEventListener('mouseup', onMouseUp, false);
      return;
    }

    event.preventDefault();

    var element = scope.domElement === document ? scope.domElement.body :
        scope.domElement;

    if (state === STATE.ROTATE)
    {
      if (scope.noRotate === true)
      {
        return;
      }

      rotateEnd.set(event.clientX, event.clientY);
      rotateDelta.subVectors(rotateEnd, rotateStart);

      // rotating across whole screen goes 360 degrees around
      scope.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth *
          scope.rotateSpeed);
      // rotating up and down along whole screen attempts to go 360,
      // but limited to 180
      scope.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight *
          scope.rotateSpeed);

      rotateStart.copy(rotateEnd);
    }
    else if (state === STATE.DOLLY)
    {
      if (scope.noZoom === true)
      {
        return;
      }

      dollyEnd.set(event.clientX, event.clientY);
      dollyDelta.subVectors(dollyEnd, dollyStart);

      if (dollyDelta.y > 0)
      {
        scope.dollyIn();
      }
      else
      {
        scope.dollyOut();
      }

      dollyStart.copy(dollyEnd);
    }
    else if (state === STATE.PAN)
    {
      if (scope.noPan === true)
      {
        return;
      }

      panEnd.set(event.clientX, event.clientY);
      panDelta.subVectors(panEnd, panStart);

      scope.pan(panDelta);

      panStart.copy(panEnd);
    }

    scope.update();
  }

  function onMouseUp(/* event */)
  {
    if (scope.enabled === false)
    {
      return;
    }

    scope.domElement.removeEventListener('mousemove', onMouseMove, false);
    scope.domElement.removeEventListener('mouseup', onMouseUp, false);

    state = STATE.NONE;
    setTargetIndicatorVisible(false)
  }

  function onMouseWheel(event)
  {
    if (scope.enabled === false || scope.noZoom === true)
    {
      return;
    }

    scope.targetIndicator.position.set(scope.target.x,scope.target.y,
        scope.target.z);
    setTargetIndicatorVisible(true)
    scrollTime = new Date().getTime();

    var delta = 0;

    if (event.wheelDelta) // WebKit / Opera / Explorer 9
    {
      delta = event.wheelDelta;
    }
    else if (event.detail) // Firefox
    {
      delta = - event.detail;
    }

    if (delta > 0)
    {
        scope.dollyOut();
    }
    else
    {
      scope.dollyIn();
    }
  }

  function onKeyDown(event)
  {
    if (scope.enabled === false)
    {
      return;
    }
    if (scope.noKeys === true)
    {
      return;
    }
    if (scope.noPan === true)
    {
      return;
    }

    var needUpdate = false;

    switch (event.keyCode)
    {
      case scope.keys.UP:
          scope.pan(new THREE.Vector2(0, scope.keyPanSpeed));
          needUpdate = true;
          break;
      case scope.keys.BOTTOM:
          scope.pan(new THREE.Vector2(0, -scope.keyPanSpeed));
          needUpdate = true;
          break;
      case scope.keys.LEFT:
          scope.pan(new THREE.Vector2(scope.keyPanSpeed, 0));
          needUpdate = true;
          break;
      case scope.keys.RIGHT:
          scope.pan(new THREE.Vector2(-scope.keyPanSpeed, 0));
          needUpdate = true;
          break;
    }

    if (needUpdate)
    {
      scope.update();
    }
  }

  function touchstart(event)
  {
    if (scope.enabled === false)
    {
      return;
    }

    scope.targetIndicator.position.set(scope.target.x,scope.target.y,
        scope.target.z);
    setTargetIndicatorVisible(true)

    switch (event.touches.length)
    {
      case 1:	// one-fingered touch: rotate
          if (scope.noRotate === true)
          {
            return;
          }

          state = STATE.TOUCH_ROTATE;

          rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
          break;

      case 2:	// two-fingered touch: dolly + pan
          if (scope.noZoom === false)
          {
            state = STATE.TOUCH_DOLLY_PAN;

            var dx = event.touches[0].pageX - event.touches[1].pageX;
            var dy = event.touches[0].pageY - event.touches[1].pageY;
            var distance = Math.sqrt(dx * dx + dy * dy);
            dollyStart.set(0, distance);
          }

          if (scope.noPan === false)
          {
            var panAvgX = (event.touches[0].pageX + event.touches[1].pageX)/2;
            var panAvgY = (event.touches[0].pageY + event.touches[1].pageY)/2;

            panStart.set(panAvgX, panAvgY);
          }
          break;

      default:
          state = STATE.NONE;
    }
  }

  function touchmove(event)
  {
    if (scope.enabled === false)
    {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    var element = scope.domElement === document ? scope.domElement.body :
        scope.domElement;

    switch (event.touches.length)
    {
      case 1: // one-fingered touch: rotate
          if (scope.noRotate === true)
          {
            return;
          }
          if (state !== STATE.TOUCH_ROTATE)
          {
            return;
          }

          rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
          rotateDelta.subVectors(rotateEnd, rotateStart);

          // rotating across whole screen goes 360 degrees around
          scope.rotateLeft(2 * Math.PI * rotateDelta.x /
              element.clientWidth * scope.rotateSpeed);
          // rotating up and down along whole screen attempts to go 360,
          // but limited to 180
          scope.rotateUp(2 * Math.PI * rotateDelta.y /
              element.clientHeight * scope.rotateSpeed);

          rotateStart.copy(rotateEnd);
          break;

      case 2: // two-fingered touch: dolly + pan
          if (state !== STATE.TOUCH_DOLLY_PAN)
          {
            return;
          }

          // Dolly delta
          if (scope.noZoom === false)
          {
            var dx = event.touches[0].pageX - event.touches[1].pageX;
            var dy = event.touches[0].pageY - event.touches[1].pageY;
            var distance = Math.sqrt(dx * dx + dy * dy);

            dollyEnd.set(0, distance);
            dollyDelta.subVectors(dollyEnd, dollyStart);
            var dollyAbs = Math.abs(dollyDelta.y);
            dollyStart.copy(dollyEnd);
          }

          // Pan delta
          if (scope.noPan === false)
          {
            var panAvgX = (event.touches[0].pageX + event.touches[1].pageX)/2;
            var panAvgY = (event.touches[0].pageY + event.touches[1].pageY)/2;

            panEnd.set(panAvgX, panAvgY);
            panDelta.subVectors(panEnd, panStart);
            var panAbs = Math.max(Math.abs(panDelta.x),Math.abs(panDelta.y));
            panStart.copy(panEnd);
          }

          // Choose one
          if (scope.noPan === false && scope.noZoom === false)
          {
            if (dollyAbs > panAbs)
            {
              // Only dolly
              scope.noPan = true;
            }
            else
            {
              // Only pan
              scope.noZoom = true;
            }
          }

          // Dolly
          if (scope.noZoom === false)
          {
            // Threshold
            if (Math.abs(dollyDelta.y) > 1.3)
            {
              if (dollyDelta.y > 0)
              {
                scope.dollyOut();
              }
              else
              {
                scope.dollyIn();
              }
            }
          }

          // Pan
          if (scope.noPan === false)
          {
            scope.pan(panDelta);
          }
          break;

      default:
          state = STATE.NONE;
    }
  }

  function touchend(/* event */)
  {
    if (scope.enabled === false)
    {
      return;
    }

    state = STATE.NONE;
    scope.noPan = false;
    scope.noZoom = false;

    setTargetIndicatorVisible(false)
  }

  this.domElement.addEventListener('contextmenu', function (event)
      {
        event.preventDefault();
      }, false);
  this.domElement.addEventListener('mousedown', onMouseDown, false);
  this.domElement.addEventListener('mousewheel', onMouseWheel, false);
  this.domElement.addEventListener('DOMMouseScroll', onMouseWheel, false); // firefox

  this.domElement.addEventListener('keydown', onKeyDown, false);

  this.domElement.addEventListener('touchstart', touchstart, false);
  this.domElement.addEventListener('touchend', touchend, false);
  this.domElement.addEventListener('touchmove', touchmove, false);
};

THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
