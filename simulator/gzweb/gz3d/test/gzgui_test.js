describe('Gui tests', function() {

  let $controller;

  beforeAll(function(){
    module('gzangular');
  });

  beforeEach(inject(function(_$controller_){
    // The injector unwraps the underscores (_) from around the parameter names
    // when matching
    $controller = _$controller_;
  }));

  // Perform all GUI tests on a single spec because the timing between fixture
  // loading and jquery readiness is tricky
  describe('jQuery interactions', function() {

    it('check GUI events', function() {

      // Check global emitter
      expect(globalEmitter).toBeDefined();

      // Check there are no listeners yet
      expect(globalEmitter.eventNames().length).toEqual(0);
      expect(globalEmitter.listenerCount()).toEqual(0);

      // Check Jquery is ready
      expect(jQuery.isReady).toBeTruthy();

      // Check the fixture is not there yet
      expect($('body').length).toEqual(1);
      expect($('#translate-mode').length).toEqual(0);
      expect($('.tab').length).toEqual(0);

      // Load fixture
      loadFixtures('myfixture.html');

      // Check the fixture is present
      expect($('#translate-mode').length).toEqual(1);
      expect($('.tab').length).toEqual(3);

      // Now we can release jQuery so the events get setup using the fixture
      $.holdReady(false);

      // Initialize objects used in the test.
      const scene = new GZ3D.Scene();
      const gui = new GZ3D.Gui(scene);

      // Check everyone is using the same emitter
      expect(gui.emitter).toEqual(globalEmitter);
      expect(scene.emitter).toEqual(globalEmitter);

      // Now we have more events and listeners
      expect(globalEmitter.eventNames().length).toEqual(56);
      expect(globalEmitter.listeners('manipulation_mode').length)
          .toEqual(1);
      expect(globalEmitter.listeners('toggle_notifications').length)
          .toEqual(1);
      expect(globalEmitter.listeners('show_orbit_indicator').length)
          .toEqual(1);
      expect(globalEmitter.listeners('openTab').length).toEqual(1);
      expect(globalEmitter.listeners('pointerOnMenu').length)
          .toEqual(1);
      expect(globalEmitter.listeners('pointerOffMenu').length)
          .toEqual(1);
      expect(globalEmitter.listeners('longpress_container_start').length)
          .toEqual(1);

      // Check GUI initial values
      expect(gui.spawnState).toEqual(null);
      expect(gui.longPressContainerState).toEqual(null);
      expect(gui.openTreeWhenSelected).toEqual(false);
      expect(gui.modelStatsDirty).toEqual(false);
      expect(gui.logPlay).toBeDefined();

      // Emit some events
      expect(scene.manipulationMode).toEqual('view');
      globalEmitter.emit('manipulation_mode', 'translate');
      expect(scene.manipulationMode).toEqual('translate');
      globalEmitter.emit('manipulation_mode', 'rotate');
      expect(scene.manipulationMode).toEqual('rotate');

      expect($('#view-mode').prop('checked')).toEqual(true);

      globalEmitter.emit('show_grid', 'show');
      expect(scene.grid.visible).toEqual(true);
      globalEmitter.emit('show_grid', 'hide');
      expect(scene.grid.visible).toEqual(false);

      expect(scene.modelManipulator.snapDist).toEqual(null);
      globalEmitter.emit('snap_to_grid');
      expect(scene.modelManipulator.snapDist).toEqual(0.5);
      globalEmitter.emit('snap_to_grid');
      expect(scene.modelManipulator.snapDist).toEqual(null);

      expect(gui.showNotifications).toEqual(false);
      globalEmitter.emit('toggle_notifications');
      expect(gui.showNotifications).toEqual(true);

      expect(gui.openTreeWhenSelected).toEqual(false);
      globalEmitter.emit('openTreeWhenSelected');
      expect(gui.openTreeWhenSelected).toEqual(true)

      // Spy on global emitter so we can see when it is triggered
      // The function is suppresed from here on, so the effects of `emit`
      // aren't achieved
      spyOn(globalEmitter, 'emit');
      expect(globalEmitter.emit.calls.count()).toEqual(0);

      // Click translate mode
      let spyEvent = spyOnEvent('#translate-mode', 'click')
      $('#translate-mode').click()
      expect('click').toHaveBeenTriggeredOn('#translate-mode')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(1);
      expect(globalEmitter.emit).toHaveBeenCalledWith('manipulation_mode',
          'translate');
      globalEmitter.emit.calls.reset();

      // Click view mode
      spyEvent = spyOnEvent('#view-mode', 'click')
      $('#view-mode').click()
      expect('click').toHaveBeenTriggeredOn('#view-mode')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(1);
      expect(globalEmitter.emit).toHaveBeenCalledWith('manipulation_mode',
          'view');
      globalEmitter.emit.calls.reset();

      // Click rotate mode
      spyEvent = spyOnEvent('#rotate-mode', 'click')
      $('#rotate-mode').click()
      expect('click').toHaveBeenTriggeredOn('#rotate-mode')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(1);
      expect(globalEmitter.emit).toHaveBeenCalledWith('manipulation_mode',
          'rotate');
      globalEmitter.emit.calls.reset();

      // close tabs when clicking to open one

      spyEvent = spyOnEvent('.tab', 'click')
      $('#mainMenuTab').trigger('click')
      expect('click').toHaveBeenTriggeredOn('.tab')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(1);
      expect(globalEmitter.emit).toHaveBeenCalledWith('openTab', 'mainMenu',
          'mainMenu');
      globalEmitter.emit.calls.reset();

      // close tabs when clicking on closePanels class
      spyEvent = spyOnEvent('.closePanels', 'click')
      $('.closePanels')[0].click()
      expect('click').toHaveBeenTriggeredOn('.closePanels')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(1);
      expect(globalEmitter.emit).toHaveBeenCalledWith('closeTabs', true);
      globalEmitter.emit.calls.reset();

      // start spawning box
      spyEvent = spyOnEvent('[id^="header-insert-"]', 'click')
      $('#header-insert-box').click()
      expect('click').toHaveBeenTriggeredOn('[id^="header-insert-"]')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(2);
      expect(globalEmitter.emit).toHaveBeenCalledWith('closeTabs', false);
      expect(globalEmitter.emit).toHaveBeenCalledWith('spawn_entity_start',
          'box');
      globalEmitter.emit.calls.reset();

      // play
      spyEvent = spyOnEvent('#play', 'click')
      $('#play').click()
      expect('click').toHaveBeenTriggeredOn('#play')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(2);
      expect(globalEmitter.emit).toHaveBeenCalledWith('notification_popup',
          'Physics engine running');
      expect(globalEmitter.emit).toHaveBeenCalledWith('pause', false);
      globalEmitter.emit.calls.reset();

      // reset models
      spyEvent = spyOnEvent('#reset-model', 'click')
      $('#reset-model').click()
      expect('click').toHaveBeenTriggeredOn('#reset-model')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(2);
      expect(globalEmitter.emit).toHaveBeenCalledWith('reset', 'model');
      expect(globalEmitter.emit).toHaveBeenCalledWith('closeTabs', false);
      globalEmitter.emit.calls.reset();

      // reset world
      spyEvent = spyOnEvent('#reset-world', 'click')
      $('#reset-world').click()
      expect('click').toHaveBeenTriggeredOn('#reset-world')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(2);
      expect(globalEmitter.emit).toHaveBeenCalledWith('reset', 'world');
      expect(globalEmitter.emit).toHaveBeenCalledWith('closeTabs', false);
      globalEmitter.emit.calls.reset();


      // reset view
      globalEmitter.emit.calls.reset();
      spyEvent = spyOnEvent('#reset-view', 'click')
      $('#reset-view').click()
      expect('click').toHaveBeenTriggeredOn('#reset-view')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(2);
      expect(globalEmitter.emit).toHaveBeenCalledWith('view_reset');
      expect(globalEmitter.emit).toHaveBeenCalledWith('closeTabs', false);
      globalEmitter.emit.calls.reset();

      // view grid
      spyEvent = spyOnEvent('#view-grid', 'click')
      $('#view-grid').click()
      expect('click').toHaveBeenTriggeredOn('#view-grid')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(2);
      expect(globalEmitter.emit).toHaveBeenCalledWith('show_grid', 'toggle');
      expect(globalEmitter.emit).toHaveBeenCalledWith('closeTabs', false);
      globalEmitter.emit.calls.reset();

      // view collisions
      spyEvent = spyOnEvent('#view-collisions', 'click')
      $('#view-collisions').click()
      expect('click').toHaveBeenTriggeredOn('#view-collisions')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(2);
      expect(globalEmitter.emit).toHaveBeenCalledWith('show_collision');
      expect(globalEmitter.emit).toHaveBeenCalledWith('closeTabs', false);
      globalEmitter.emit.calls.reset();

      // view orbit indicator
      spyEvent = spyOnEvent('#view-orbit-indicator', 'click')
      $('#view-orbit-indicator').click()
      expect('click').toHaveBeenTriggeredOn('#view-orbit-indicator')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(2);
      expect(globalEmitter.emit).toHaveBeenCalledWith('show_orbit_indicator');
      expect(globalEmitter.emit).toHaveBeenCalledWith('closeTabs', false);
      globalEmitter.emit.calls.reset();

      // snap to grid
      spyEvent = spyOnEvent('#snap-to-grid', 'click')
      $('#snap-to-grid').click()
      expect('click').toHaveBeenTriggeredOn('#snap-to-grid')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(2);
      expect(globalEmitter.emit).toHaveBeenCalledWith('snap_to_grid');
      expect(globalEmitter.emit).toHaveBeenCalledWith('closeTabs', false);
      globalEmitter.emit.calls.reset();

      // open tree when selected
      spyEvent = spyOnEvent('#open-tree-when-selected', 'click')
      $('#open-tree-when-selected').click()
      expect('click').toHaveBeenTriggeredOn('#open-tree-when-selected')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(2);
      expect(globalEmitter.emit).toHaveBeenCalledWith('openTreeWhenSelected');
      expect(globalEmitter.emit).toHaveBeenCalledWith('closeTabs', false);
      globalEmitter.emit.calls.reset();

      // toggle notifications
      spyEvent = spyOnEvent('#toggle-notifications', 'click')
      $('#toggle-notifications').click()
      expect('click').toHaveBeenTriggeredOn('#toggle-notifications')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(2);
      expect(globalEmitter.emit).toHaveBeenCalledWith('toggle_notifications');
      expect(globalEmitter.emit).toHaveBeenCalledWith('closeTabs', false);
      globalEmitter.emit.calls.reset();

      // view transparent
      $('#model-popup').popup();

      spyEvent = spyOnEvent('#view-transparent', 'click')
      $('#view-transparent').click()
      expect('click').toHaveBeenTriggeredOn('#view-transparent')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(1);
      expect(globalEmitter.emit).toHaveBeenCalledWith('set_view_as',
          'transparent');
      globalEmitter.emit.calls.reset();

      // view wireframe
      spyEvent = spyOnEvent('#view-wireframe', 'click')
      $('#view-wireframe').click()
      expect('click').toHaveBeenTriggeredOn('#view-wireframe')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(1);
      expect(globalEmitter.emit).toHaveBeenCalledWith('set_view_as',
          'wireframe');
      globalEmitter.emit.calls.reset();

      // not view joints if there isn't an entity with joints selected
      spyEvent = spyOnEvent('#view-joints', 'click')
      $('#view-joints').click()
      expect('click').toHaveBeenTriggeredOn('#view-joints')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit).not.toHaveBeenCalled();
      globalEmitter.emit.calls.reset();

      // not view COM if there isn\'t an entity with mass selected
      spyEvent = spyOnEvent('#view-com', 'click')
      $('#view-com').click()
      expect('click').toHaveBeenTriggeredOn('#view-com')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit).not.toHaveBeenCalled();
      globalEmitter.emit.calls.reset();

      // not view inertia if there isn\'t an entity with mass selected
      spyEvent = spyOnEvent('#view-inertia', 'click')
      $('#view-inertia').click()
      expect('click').toHaveBeenTriggeredOn('#view-inertia')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit).not.toHaveBeenCalled();
      globalEmitter.emit.calls.reset();

      // delete entity
      spyEvent = spyOnEvent('#delete-entity', 'click')
      $('#delete-entity').click()
      expect('click').toHaveBeenTriggeredOn('#delete-entity')
      expect(spyEvent).toHaveBeenTriggered()
      expect(globalEmitter.emit.calls.count()).toEqual(1);
      expect(globalEmitter.emit).toHaveBeenCalledWith('delete_entity');
      globalEmitter.emit.calls.reset();

      // Return the model title given the model path
      expect(getNameFromPath('box')).toEqual('Box');
      expect(getNameFromPath('spotlight')).toEqual('Spot Light');
      expect(getNameFromPath('stone_10_2_5_1cm')).toEqual(
          'Stone 10 x 2.5 x 1 cm');
      expect(getNameFromPath('depth_camera')).toEqual('Depth Camera');
      expect(getNameFromPath('cinder_block_wide')).toEqual('Cinder Block Wide');
      expect(getNameFromPath('polaris_ranger_xp900_no_roll_cage')).toEqual(
          'Polaris Ranger without roll cage');
    });
  });
});
