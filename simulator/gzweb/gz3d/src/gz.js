var GZ3D = GZ3D || {
  REVISION : '1'
};

var globalEmitter = new EventEmitter2({verboseMemoryLeak: true});

// Assuming all mobile devices are touch devices.
var isTouchDevice = /Mobi/.test(navigator.userAgent);