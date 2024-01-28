describe('Log play tests', function() {

  let logPlay;

  beforeAll(function(){
    logPlay = new GZ3D.LogPlay();
  });

  describe('Initialization', function() {
    it('should be properly initialized', function() {

      expect(logPlay.emitter).toEqual(globalEmitter);
    });
  });

});
