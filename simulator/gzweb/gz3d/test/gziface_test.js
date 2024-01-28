describe('Iface tests', function() {

  let scene;
  let iface;

  beforeAll(function(){
    scene = new GZ3D.Scene();
    iface = new GZ3D.GZIface(scene);
  });

  describe('Initialization', function() {
    it('should be properly initialized', function() {

      expect(iface.emitter).toEqual(globalEmitter);
    });
  });

});
