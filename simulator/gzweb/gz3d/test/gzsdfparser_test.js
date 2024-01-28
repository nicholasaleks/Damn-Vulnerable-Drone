describe('Sdf Parser tests', function() {

  const utilsPath = 'http://localhost:9876/base/gz3d/test/utils/';

  var scene;
  var gui;
  var sdfparser;

  beforeAll(function(){
    // Initializing object used in the test.
    scene = new GZ3D.Scene();
    gui = new GZ3D.Gui(scene);
    sdfparser = new GZ3D.SdfParser(scene, gui);
  });

  describe('Initialization', function() {
    it('should be properly initialized', function() {

      expect(sdfparser.emitter).toEqual(globalEmitter);
    });
  });

  describe('Parse color test, string to json', function() {
    it('should return a json color', function() {
      var color = {r: 212, g: 199, b: 0.2, a: 0.9};
      expect(sdfparser.parseColor('212 199 0.2 0.9')).toEqual(color);
      color = {r: 0, g: 300, b: 0.0001, a: -278};
      expect(sdfparser.parseColor('0 300 0.0001 -278')).toEqual(color);
      // Shouldn't equal
      expect(sdfparser.parseColor('0 300 0.0001-278')).not.toEqual(color);
      expect(sdfparser.parseColor('0 300 0.0001')).not.toEqual(color);
      expect(sdfparser.parseColor('0 A 0.0001-278')).not.toEqual(color);
    });
  });

  describe('Parse string size test, string to json', function() {
    it('should return a json', function() {
      var size = {x: 0.092, y: 1, z: 1.1};
      expect(sdfparser.parseSize('0.092 1 1.1')).toEqual(size);
      // Shouldn't equal
      expect(sdfparser.parseSize('0.0 9.2. 11.1')).not.toEqual(size);
      expect(sdfparser.parseSize('11 2121')).not.toEqual(size);
      expect(sdfparser.parseSize('x 21 z')).not.toEqual(size);
    });
  });

  describe('Parse 3DVector test, string to json', function() {
    it('should return a json object', function() {
      var vec = {x: 1.001, y: 3, z: 0.0001};
      expect(sdfparser.parse3DVector('1.001 3 0.0001')).toEqual(vec);
      // Shouldn't equal
      expect(sdfparser.parse3DVector('1.001 3 0.0.0001')).not.toEqual(vec);
      expect(sdfparser.parse3DVector('1 21')).not.toEqual(vec);
      expect(sdfparser.parse3DVector('a 20 c')).not.toEqual(vec);
    });
  });

  describe('Parse scale test, string to Vector3', function() {
    it('should return a vector3 object', function() {
      var vec = new THREE.Vector3(0.1,0.4,0.66);
      expect(sdfparser.parseScale('0.1 0.4 0.66')).toEqual(vec);
      // Shouldn't equal
      expect(sdfparser.parseScale('0..1 0.4 0.66')).not.toEqual(vec);
      expect(sdfparser.parseScale('0.104 0.66')).not.toEqual(vec);
      expect(sdfparser.parseScale('1 2 A')).not.toEqual(vec);
    });
  });

  describe('Spawn a light from SDF', function() {
    it('Should create a THREE.Object3D of type directional light', function() {
      var sdfLight, obj3D;

      sdfLight = '<?xml version="1.0" ?>'+
      '<sdf version="1.5">'+
        '<light type="directional" name="sun">'+
          '<cast_shadows>true</cast_shadows>'+
          '<pose>0 0 10 0 0 0</pose>'+
          '<diffuse>0.8 0.8 0.8 1</diffuse>'+
          '<specular>0.2 0.2 0.2 1</specular>'+
          '<attenuation>'+
            '<range>1000</range>'+
            '<constant>0.9</constant>'+
            '<linear>0.01</linear>'+
            '<quadratic>0.001</quadratic>'+
          '</attenuation>'+
          '<direction>-0.5 0.1 -0.9</direction>'+
        '</light>'+
      '</sdf>';

      obj3D = sdfparser.spawnFromSDF(sdfLight);
      expect(obj3D.color.r).toEqual(0.8);
      expect(obj3D.color.g).toEqual(0.8);
      expect(obj3D.color.b).toEqual(0.8);
      // expect(obj3D.color.a).toEqual(1);
      expect(obj3D.intensity).toEqual(0.9);
      expect(obj3D.type).toEqual('DirectionalLight');
      expect(obj3D.name).toEqual('sun');
    });
  });

  describe('Spawn a box from SDF, initialize and verify its pose', function() {
    it('Should spawn in the right pose', function() {
      var pose, rotation, sdf, obj3D, expectedRot;

      position = {x:3, y:1, z:1};
      rotation = {x:0.5, y:1, z:0.2};
      sdf = sdfparser.createBoxSDF(position, rotation);
      obj3D = sdfparser.spawnFromSDF(sdf);
      expect(obj3D.position.x).toEqual(position.x);
      expect(obj3D.position.y).toEqual(position.y);
      expect(obj3D.position.z).toEqual(position.z);
      // Shouldn't equal
      expect(obj3D.position.z).not.toEqual(0.9);
      expectedRot = obj3D.rotation.reorder('ZYX');
      expect(expectedRot.x).toBeCloseTo(rotation.x, 3);
      expect(expectedRot.y).toBeCloseTo(rotation.y, 3);
      expect(expectedRot.z).toBeCloseTo(rotation.z, 3);
    });
  });

  describe('Load without URL or file name', function() {
    it('should not break.', function() {

      var obj = sdfparser.loadSDF();
      expect(obj).toEqual(undefined);
    });
  });

  describe('Load inexistent URL', function() {
    it('should not break.', function() {

      var obj = sdfparser.loadSDF('http://banana.sdf');
      expect(obj).toEqual(undefined);
    });
  });

  describe('Add a model to the scene using custom urls', function() {
    it('should add a model to the scene and then remove it', function() {

      // Tell it to use custom URLs
      sdfparser.usingFilesUrls = true;

      // Check there are no custom URLs yet
      expect(sdfparser.customUrls.length).toEqual(0);

      // Try to add invalid URL
      sdfparser.addUrl('banana');
      expect(sdfparser.customUrls.length).toEqual(0);

      // Add valid URL
      sdfparser.addUrl(utilsPath + 'house_2/meshes/house_2.dae');
      expect(sdfparser.customUrls.length).toEqual(1);

      // Load SDF
      var obj = sdfparser.loadSDF(utilsPath + 'house_2/model.sdf');

      expect(obj).not.toEqual(undefined);
      expect(obj.children.length).toEqual(1);
      expect(obj.children[0].name).toEqual('link');
      expect(obj.children[0].children.length).toEqual(1);
      expect(obj.children[0].children[0].name).toEqual('visual');

      // Add to scene
      scene.add(obj);

      model = scene.getByName('House 2');
      expect(model).not.toEqual(undefined);

      // Remove from scene
      scene.remove(model);

      model = scene.getByName('House 2');
      expect(model).toEqual(undefined);
    });
  });

  // TODO: test sdfParser.createMaterial
  // have to be able to load the materials with no gzserver
  // or an another solution

});
