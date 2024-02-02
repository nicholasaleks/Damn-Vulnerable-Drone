/*global $:false */
/*global angular*/

var emUnits = function(value)
    {
      return value*parseFloat($('body').css('font-size'));
    };

var isWideScreen = function()
    {
      return $(window).width() / emUnits(1) > 35;
    };
var isTallScreen = function()
    {
      return $(window).height() / emUnits(1) > 35;
    };
var lastOpenMenu = {mainMenu: 'mainMenu', insertMenu: 'insertMenu',
    treeMenu: 'treeMenu'};

var tabColors = {selected: 'rgb(34, 170, 221)', unselected: 'rgb(42, 42, 42)'};

var modelList =
  [
    {path:'buildings', title:'Buildings',
    examplePath1:'fast_food', examplePath2:'kitchen_dining',
      examplePath3:'house_1', models:
    [
      {modelPath:'fast_food', modelTitle:'Fast Food'},
      {modelPath:'gas_station', modelTitle:'Gas Station'},
      {modelPath:'house_1', modelTitle:'House 1'},
      {modelPath:'house_2', modelTitle:'House 2'},
      {modelPath:'house_3', modelTitle:'House 3'},
      {modelPath:'iss', modelTitle:'International Space Station'},
      {modelPath:'iss_half', modelTitle:'ISS half'},
      {modelPath:'kitchen_dining', modelTitle:'Kitchen and Dining'},
      {modelPath:'office_building', modelTitle:'Office Building'},
      {modelPath:'powerplant', modelTitle:'Power Plant'},
      {modelPath:'starting_pen', modelTitle:'Starting Pen'},
      {modelPath:'willowgarage', modelTitle:'Willow Garage'},
      {modelPath:'cafe', modelTitle:'Cafe'},
      {modelPath:'box_target_green', modelTitle:'Box target (green)'},
      {modelPath:'box_target_red', modelTitle:'Box target (red)'},
      {modelPath:'hoop_red', modelTitle:'Hoop (red)'},
      {modelPath:'control_console', modelTitle:'Control Console'}
    ]},

    {path:'furniture', title:'Furniture',
    examplePath1:'hinged_door', examplePath2:'bookshelf', examplePath3:'table',
      models:
    [
      {modelPath:'bookshelf', modelTitle:'Book Shelf'},
      {modelPath:'cabinet', modelTitle:'Cabinet'},
      {modelPath:'drc_practice_door_4x8', modelTitle:'4x8 Doorway'},
      {modelPath:'drc_practice_ladder', modelTitle:'Ladder'},
      {modelPath:'hinged_door', modelTitle:'Hinged Door'},
      {modelPath:'table', modelTitle:'Table'},
      {modelPath:'table_marble', modelTitle:'Table Marble'},
      {modelPath:'cafe_table', modelTitle:'Cafe table'},

      {modelPath:'drc_practice_ball_valve', modelTitle:'Ball Valve'},
      {modelPath:'drc_practice_handle_wheel_valve',
        modelTitle:'Handle Wheel Valve'},
      {modelPath:'drc_practice_hand_wheel_valve',
        modelTitle:'Hand Wheel Valve'},
      {modelPath:'drc_practice_wheel_valve',
        modelTitle:'Wheel Valve'},
      {modelPath:'drc_practice_wheel_valve_large',
        modelTitle:'Wheel Valve Large'},
      {modelPath:'door_handle', modelTitle:'Door Handle'},

      {modelPath:'drc_practice_ball_valve_wall',
        modelTitle:'Wall (Ball Valve)'},
      {modelPath:'drc_practice_handle_wheel_valve_wall',
        modelTitle:'Wall (Handle Wheel Valve)'},
      {modelPath:'drc_practice_hand_wheel_valve_wall',
        modelTitle:'Wall (Hand Wheel Valve)'},
      {modelPath:'drc_practice_valve_wall', modelTitle:'Wall (Valve)'},
      {modelPath:'drc_practice_wheel_valve_wall',
        modelTitle:'Wall (Wheel Valve)'},
      {modelPath:'drc_practice_wheel_valve_large_wall',
        modelTitle:'Wall (Wheel Valve Large)'},
      {modelPath:'grey_wall', modelTitle:'Grey Wall'},
      {modelPath:'asphalt_plane', modelTitle:'Asphalt Plane'},
      {modelPath:'drc_practice_base_4x8', modelTitle:'Debris base'},
      {modelPath:'ground_plane', modelTitle:'Ground Plane'},
      {modelPath:'nist_maze_wall_120', modelTitle:'120 Maze Wall'},
      {modelPath:'nist_maze_wall_240', modelTitle:'240 Maze Wall'},
      {modelPath:'nist_maze_wall_triple_holes_120',
        modelTitle:'120 Maze Wall Triple Holes'},
      {modelPath:'nist_simple_ramp_120', modelTitle:'Simple Ramp'},
      {modelPath:'nist_stairs_120', modelTitle:'Stairs'}
    ]},

    {path:'kitchen', title:'Kitchen',
    examplePath1:'saucepan',  examplePath2:'beer',  examplePath3:'bowl',
      models:
    [
      {modelPath:'beer', modelTitle:'Beer'},
      {modelPath:'bowl', modelTitle:'Bowl'},
      {modelPath:'coke_can', modelTitle:'Coke Can'},
      {modelPath:'saucepan', modelTitle:'Saucepan'},
      {modelPath:'plastic_cup', modelTitle:'Plastic Cup'}
    ]},

    {path:'robocup', title:'Robocup', examplePath1:'robocup_3Dsim_ball',
    examplePath2:'robocup14_spl_goal', examplePath3:'robocup09_spl_field',
      models:
    [
      {modelPath:'robocup09_spl_field', modelTitle:'2009 SPL Field'},
      {modelPath:'robocup14_spl_field', modelTitle:'2014 SPL Field'},
      {modelPath:'robocup_3Dsim_field', modelTitle:'3D Sim. Field'},
      {modelPath:'robocup14_spl_goal', modelTitle:'SPL Goal'},
      {modelPath:'robocup_3Dsim_goal', modelTitle:'3D Sim. Goal'},
      {modelPath:'robocup_spl_ball', modelTitle:'SPL Ball'},
      {modelPath:'robocup_3Dsim_ball', modelTitle:'3D Sim. Ball'}
    ]},

    {path:'first', title:'FIRST', examplePath1:'frc2016_field',
    examplePath2:'frc2016_chevaldefrise', examplePath3:'frc_field_2015',
      models:
    [
      {modelPath:'frc2016_chevaldefrise', modelTitle:'Cheval de Frise'},
      {modelPath:'frc2016_drawbridge', modelTitle:'Draw Bridge'},
      {modelPath:'frc2016_field', modelTitle:'2016 Field'},
      {modelPath:'frc2016_lowbar', modelTitle:'Low Bar'},
      {modelPath:'frc2016_moat', modelTitle:'Moat'},
      {modelPath:'frc2016_portcullis', modelTitle:'Portcullis'},
      {modelPath:'frc2016_ramparts', modelTitle:'Ramparts'},
      {modelPath:'frc2016_rockwall', modelTitle:'Rockwall'},
      {modelPath:'frc2016_roughterrain', modelTitle:'Rough Terrain'},
      {modelPath:'frc2016_sallyport', modelTitle:'Sallyport'},
      {modelPath:'frc_field_2015', modelTitle:'2015 Field'}
    ]},

    {path:'robots', title:'Robots',
    examplePath1:'pioneer3at', examplePath2:'turtlebot', examplePath3:'pr2',
      models:
    [
      {modelPath:'create', modelTitle:'Create'},
      {modelPath:'husky', modelTitle:'Husky'},
      {modelPath:'irobot_hand', modelTitle:'iRobot Hand'},
      {modelPath:'pioneer2dx', modelTitle:'Pioneer 2DX'},
      {modelPath:'pioneer3at', modelTitle:'Pioneer 3AT'},
      {modelPath:'pr2', modelTitle:'PR2'},
      {modelPath:'robonaut', modelTitle:'Robonaut'},
      {modelPath:'simple_arm', modelTitle:'Simple Arm'},
      {modelPath:'simple_arm_gripper', modelTitle:'Simple Arm and Gripper'},
      {modelPath:'simple_gripper', modelTitle:'Simple Gripper'},
      {modelPath:'turtlebot', modelTitle:'TurtleBot'},
      {modelPath:'youbot', modelTitle:'YouBot'},
      {modelPath:'cart_rigid_suspension', modelTitle:'Cart: rigid suspension'},
      {modelPath:'cart_soft_suspension', modelTitle:'Cart: soft suspension'},
      {modelPath:'cessna', modelTitle:'Cessna'},
      {modelPath:'follower_vehicle', modelTitle:'Follower Vehicle'},
      {modelPath:'iris_with_standoffs', modelTitle:'Iris with Standoffs'},
      {modelPath:'iris_with_standoffs_demo',
        modelTitle:'Iris with Standoffs (demo)'},
      {modelPath:'mpl_right_arm', modelTitle:'MPL right arm'},
      {modelPath:'mpl_right_forearm', modelTitle:'MPL right forearm'},
      {modelPath:'parrot_bebop_2', modelTitle:'Parrot Bebop 2'},
      {modelPath:'quadrotor', modelTitle:'Quadrotor'},
      {modelPath:'submarine', modelTitle:'Submarine'},
      {modelPath:'submarine_buoyant', modelTitle:'Submarine (buoyant)'},
      {modelPath:'submarine_sinking', modelTitle:'Submarine (sinking)'},
      {modelPath:'warehouse_robot', modelTitle:'Warehouse Robot'},
      {modelPath:'zephyr_delta_wing', modelTitle:'Zephyr Delta Wing'}
    ]},

    {path:'sensors', title:'Sensors',
    examplePath1:'camera', examplePath2:'hokuyo', examplePath3:'kinect',
      models:
    [
      {modelPath:'camera', modelTitle:'Camera'},
      {modelPath:'stereo_camera', modelTitle:'Stereo Camera'},
      {modelPath:'hokuyo', modelTitle:'Hokuyo'},
      {modelPath:'kinect', modelTitle:'Kinect'},
      {modelPath:'depth_camera', modelTitle:'Depth Camera'},
      {modelPath:'gimbal_small_2d', modelTitle:'Gimbal Small 2D'},
      {modelPath:'velodyne_hdl32', modelTitle:'Velodyne HDL-32'}
    ]},

    {path:'street', title:'Street', examplePath1:'dumpster',
    examplePath2:'drc_practice_angled_barrier_45', examplePath3:'fire_hydrant',
      models:
    [
      {modelPath:'cinder_block', modelTitle:'Cinder Block'},
      {modelPath:'cinder_block_2', modelTitle:'Cinder Block 2'},
      {modelPath:'cinder_block_wide', modelTitle:'Cinder Block Wide'},
      {modelPath:'construction_barrel', modelTitle:'Construction Barrel'},
      {modelPath:'construction_cone', modelTitle:'Construction Cone'},
      {modelPath:'drc_practice_angled_barrier_45',
        modelTitle:'Angled Barrier 45'},
      {modelPath:'drc_practice_angled_barrier_135',
        modelTitle:'Angled Barrier 135'},
      {modelPath:'drc_practice_block_wall', modelTitle:'Block Wall'},
      {modelPath:'drc_practice_orange_jersey_barrier',
        modelTitle:'Jersey Barrier (Orange)'},
      {modelPath:'drc_practice_white_jersey_barrier',
        modelTitle:'Jersey Barrier (White)'},
      {modelPath:'drc_practice_truss', modelTitle:'Truss'},
      {modelPath:'drc_practice_yellow_parking_block',
        modelTitle:'Parking Block'},
      {modelPath:'dumpster', modelTitle:'Dumpster'},
      {modelPath:'fire_hydrant', modelTitle:'Fire Hydrant'},
      {modelPath:'jersey_barrier', modelTitle:'Jersey Barrier'},
      {modelPath:'lamp_post', modelTitle:'Lamp Post'},
      {modelPath:'mailbox', modelTitle:'Mailbox'},
      {modelPath:'mud_box', modelTitle:'Mud Box'},
      {modelPath:'nist_fiducial_barrel', modelTitle:'Fiducial Barrel'},
      {modelPath:'speed_limit_sign', modelTitle:'Speed Limit Sign'},
      {modelPath:'stop_sign', modelTitle:'Stop Sign'},
      {modelPath:'first_2015_trash_can', modelTitle:'Trash Can'},
      {modelPath:'person_standing', modelTitle:'Person Standning'},
      {modelPath:'person_walking', modelTitle:'Person Walking'}
    ]},

    {path:'tools', title:'Tools', examplePath1:'hammer',
    examplePath2:'polaris_ranger_ev', examplePath3:'cordless_drill', models:
    [
      {modelPath:'cordless_drill', modelTitle:'Cordless Drill'},
      {modelPath:'fire_hose_long', modelTitle:'Fire Hose'},
      {modelPath:'fire_hose_long_curled', modelTitle:'Fire Hose Long Curled'},
      {modelPath:'hammer', modelTitle:'Hammer'},
      {modelPath:'monkey_wrench', modelTitle:'Monkey Wrench'},
      {modelPath:'polaris_ranger_ev', modelTitle:'Polaris Ranger EV'},
      {modelPath:'polaris_ranger_xp900', modelTitle:'Polaris Ranger XP900'},
      {modelPath:'polaris_ranger_xp900_no_roll_cage',
        modelTitle:'Polaris Ranger without roll cage'},
      {modelPath:'utility_cart', modelTitle:'Utility Cart'},
      {modelPath:'car_wheel', modelTitle:'Car Wheel'},
      {modelPath:'arm_part', modelTitle:'Arm Part'},
      {modelPath:'gear_part', modelTitle:'Gear Part'},
      {modelPath:'gasket_part', modelTitle:'Gasket Part'},
      {modelPath:'disk_part', modelTitle:'Disk Part'},
      {modelPath:'pulley_part', modelTitle:'Pulley Part'},
      {modelPath:'piston_rod_part', modelTitle:'Piston Rod Part'},
      {modelPath:'t_brace_part', modelTitle:'T Brace Part'},
      {modelPath:'u_joint_part', modelTitle:'U Joint Part'}
    ]},

    {path:'misc', title:'Misc.', examplePath1:'brick_box_3x1x3',
    examplePath2:'drc_practice_4x4x20',
      examplePath3:'double_pendulum_with_base', models:
    [
      {modelPath:'double_pendulum_with_base',
        modelTitle:'Double Pendulum With Base'},
      {modelPath:'breakable_test', modelTitle:'Breakable_test'},
      {modelPath:'brick_box_3x1x3', modelTitle:'Brick Box 3x1x3'},
      {modelPath:'cardboard_box', modelTitle:'Cardboard Box'},
      {modelPath:'cube_20k', modelTitle:'Cube 20k'},
      {modelPath:'cricket_ball', modelTitle:'Cricket Ball'},
      {modelPath:'marble_1_5cm', modelTitle:'Marble 1.5 cm'},
      {modelPath:'metal_peg', modelTitle:'Metal Peg'},
      {modelPath:'metal_peg_board', modelTitle:'Metal Peg Board'},
      {modelPath:'mars_rover', modelTitle:'Mars Rover'},
      {modelPath:'stone_10_2_5_1cm', modelTitle:'Stone 10 x 2.5 x 1 cm'},
      {modelPath:'tube_2_25cm', modelTitle:'Tube 2.25 cm'},
      {modelPath:'tube_9_5mm', modelTitle:'Tube 9.5 mm'},
      {modelPath:'wood_block_10_2_1cm', modelTitle:'Wood Block 10 x 2 x 1 cm'},
      {modelPath:'wood_cube_10cm', modelTitle:'Wood Cube 10 cm'},
      {modelPath:'wood_cube_2_5cm', modelTitle:'Wood Cube 2.5 cm'},
      {modelPath:'wood_cube_5cm', modelTitle:'Wood Cube 5 cm'},
      {modelPath:'wood_cube_7_5cm', modelTitle:'Wood Cube 7.5 cm'},
      {modelPath:'wooden_board', modelTitle:'Wooden Board'},
      {modelPath:'wooden_case', modelTitle:'Wooden Case'},
      {modelPath:'wooden_case_metal_peg', modelTitle:'Wooden Case Metal Peg '},
      {modelPath:'wooden_case_wooden_peg', modelTitle:'Wooden Case Wooden Peg'},
      {modelPath:'wooden_peg', modelTitle:'Wooden Peg'},
      {modelPath:'wooden_peg_board', modelTitle:'Wooden Peg Board'},
      {modelPath:'drc_practice_2x4', modelTitle:'2x4 Lumber'},
      {modelPath:'drc_practice_2x6', modelTitle:'2x6 Lumber'},
      {modelPath:'drc_practice_4x4x20', modelTitle:'4x4x20 Lumber'},
      {modelPath:'drc_practice_4x4x40', modelTitle:'4x4x40 Lumber'},
      {modelPath:'drc_practice_blue_cylinder', modelTitle:'Blue Cylinder'},
      {modelPath:'drc_practice_wood_slats', modelTitle:'Wood Slats'},
      {modelPath:'nist_elevated_floor_120', modelTitle:'Elevated Floor 120'},
      {modelPath:'number1', modelTitle:'Number 1'},
      {modelPath:'number2', modelTitle:'Number 2'},
      {modelPath:'number3', modelTitle:'Number 3'},
      {modelPath:'number4', modelTitle:'Number 4'},
      {modelPath:'number5', modelTitle:'Number 5'},
      {modelPath:'number6', modelTitle:'Number 6'},
      {modelPath:'number7', modelTitle:'Number 7'},
      {modelPath:'number8', modelTitle:'Number 8'},
      {modelPath:'number9', modelTitle:'Number 9'},
      {modelPath:'ragdoll', modelTitle:'Ragdoll'},
      {modelPath:'textured_shapes', modelTitle:'Textured shapes'}
    ]}
  ];

////////////////////////////////////////////////////////////////////////////////
// Response from DVD FLASK
////////////////////////////////////////////////////////////////////////////////
function updateStageStatus(stageNum, status) {
  const stageButton = $('#stage' + stageNum);

  // Reset classes and disable the button
  stageButton.prop('disabled', true)
             .removeClass('active-stage-btn loading-stage-btn flight-stage-btn');

  // Add the appropriate class based on the status
  switch (status) {
      case 'disabled':
          stageButton.addClass('flight-stage-btn');
          break;
      case 'enabled':
          stageButton.addClass('flight-stage-btn');
          stageButton.prop('disabled', false);
          break;
      case 'loading':
          stageButton.addClass('loading-stage-btn');
          stageButton.prop('disabled', false);
          break;
      case 'active':
          stageButton.addClass('active-stage-btn');
          stageButton.prop('disabled', false);
          break;
  }
}
document.addEventListener("DOMContentLoaded", function() {
  window.addEventListener("message", function(event) {
    // Check the origin for security
    if (event.origin !== "http://localhost:8000") {
        return;
    }

    const match = event.data.match(/^set-stage(\d+)-(\w+)$/);
      if (match) {
          const stageNum = match[1];
          const status = match[2];

          // Update the stage status if it's between 1 and 6
          if (stageNum >= 1 && stageNum <= 6) {
              updateStageStatus(stageNum, status);
          }
      }

    // RESET WORLD HANDLER
    if (event.data === "resetWorldCallback") {
      globalEmitter.emit('reset', 'world');
      globalEmitter.emit('closeTabs', false);
    }

    // Stage 1 CALL BACK
    if (event.data === "stage1Callback") {
      // Wait for 8 seconds
      setTimeout(function() {
        // Set data attribute to indicate the button was clicked
        $('#stage1').data('clicked', false);
        $('#stage1').find('.loading-stage-img').remove();
        $('#stage1').find('.hover-text').remove();
        $('#stage1').text($('#stage1').text().replace('Starting', ''));
        $('#stage1').text($('#stage1').text().replace('...', ''));
        $('#stage1').removeClass('loading-stage-btn');
        $('#stage1').addClass('active-stage-btn');
        // $this.prop('disabled', true);
        $('#stage2').prop('disabled', false);
        
        // wait for 5 seconds
      }, 8000);
    }
  });
});
////////////////////////////////////////////////////////////////////////////////
$(function()
{
  //Initialize
  if ('ontouchstart' in window || 'onmsgesturechange' in window)
  {
    $('body').addClass('isTouchDevice');
  }

  // Toggle items
  $('#view-collisions').buttonMarkup({icon: 'false'});
  $('#snap-to-grid').buttonMarkup({icon: 'false'});
  $('#open-tree-when-selected').buttonMarkup({icon: 'false'});
  $('#view-transparent').buttonMarkup({icon: 'false'});
  $('#view-wireframe').buttonMarkup({icon: 'false'});
  $('#view-joints').buttonMarkup({icon: 'false'});
  $('#view-com').buttonMarkup({icon: 'false'});
  globalEmitter.emit('toggle_notifications');
  globalEmitter.emit('show_orbit_indicator');

  $( '#clock-touch' ).popup('option', 'arrow', 't');
  $('#notification-popup-screen').remove();
  $('.tab').css('border-left-color', tabColors.unselected);

  if (isWideScreen())
  {
    globalEmitter.emit('openTab', 'mainMenu', 'mainMenu');
  }

  if (isTallScreen())
  {
    $('.collapsible_header').click();
    $('#expand-MODELS').click();
    $('#expand-LIGHTS').click();
  }

  // Touch devices
  if (isTouchDevice)
  {
    $('#logplay-slider')
        .css('width','100%');

    $('.mouse-only')
        .css('display','none');

    $('#play-header-fieldset')
        .css('position', 'absolute')
        .css('right', '13.6em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('#clock-header-fieldset')
        .css('position', 'absolute')
        .css('right', '10.2em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('#mode-header-fieldset')
        .css('position', 'absolute')
        .css('right', '0.5em')
        .css('top', '0.15em')
        .css('z-index', '1000');

    $('.gzGUI').touchstart(function(event){
        globalEmitter.emit('pointerOnMenu');
    });

    $('.gzGUI').touchend(function(event){
        globalEmitter.emit('pointerOffMenu');
    });

    // long press on canvas
    var press_time_container = 400;
    $('#container')
      .on('touchstart', function (event) {
        $(this).data('checkdown', setTimeout(function () {
          globalEmitter.emit('longpress_container_start',event);
        }, press_time_container));
      })
      .on('touchend', function (event) {
        clearTimeout($(this).data('checkdown'));
        globalEmitter.emit('longpress_container_end',event,false);
      })
      .on('touchmove', function (event) {
        clearTimeout($(this).data('checkdown'));
        $(this).data('checkdown', setTimeout(function () {
          globalEmitter.emit('longpress_container_start',event);
        }, press_time_container));
        globalEmitter.emit('longpress_container_move',event);
      });

    // long press on insert menu item
    var press_time_insert = 400;
    $('[id^="insert-entity-"]')
      .on('touchstart', function (event) {
        var path = $(this).attr('id');
        path = path.substring(14); // after 'insert-entity-'
        $(this).data('checkdown', setTimeout(function () {
          globalEmitter.emit('longpress_insert_start', event, path);
        }, press_time_insert));
      })
      .on('touchend', function (event) {
        clearTimeout($(this).data('checkdown'));
        globalEmitter.emit('longpress_insert_end',event,false);
      })
      .on('touchmove', function (event) {
        clearTimeout($(this).data('checkdown'));
        globalEmitter.emit('longpress_insert_move',event);
      });
  }
  // Mouse devices
  else
  {
    $('.touch-only')
        .css('display','none');

    $('[id^="insert-entity-"]')
      .click(function(event) {
        var path = $(this).attr('id');
        path = path.substring(14); // after 'insert-entity-'
        globalEmitter.emit('spawn_entity_start', path);
      })
      .on('mousedown', function(event) {
        event.preventDefault();
      });

    $('#play-header-fieldset')
        .css('position', 'absolute')
        .css('right', '41.2em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('#clock-mouse')
        .css('position', 'absolute')
        .css('right', '29.0em')
        .css('top', '0.5em')
        .css('z-index', '100')
        .css('width', '11.5em')
        .css('height', '2.5em')
        .css('background-color', '#333333')
        .css('padding', '3px')
        .css('border-radius', '5px');

    $('#mode-header-fieldset')
        .css('position', 'absolute')
        .css('right', '24.4em')
        .css('top', '0.15em')
        .css('z-index', '1000');

    $('#box-header-fieldset')
        .css('position', 'absolute')
        .css('right', '15.5em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('#sphere-header-fieldset')
        .css('position', 'absolute')
        .css('right', '12.5em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('#cylinder-header-fieldset')
        .css('position', 'absolute')
        .css('right', '9.5em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('#pointlight-header-fieldset')
        .css('position', 'absolute')
        .css('right', '6.5em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('#spotlight-header-fieldset')
        .css('position', 'absolute')
        .css('right', '3.5em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('#directionallight-header-fieldset')
        .css('position', 'absolute')
        .css('right', '0.5em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('.gzGUI').mouseenter(function(event){
        globalEmitter.emit('pointerOnMenu');
    });

    $('.gzGUI').mouseleave(function(event){
        globalEmitter.emit('pointerOffMenu');
    });

    // right-click
    $('#container').mousedown(function(event)
        {
          event.preventDefault();
          if(event.which === 3)
          {
            globalEmitter.emit('right_click', event);
          }
        });

    $('#model-popup-screen').mousedown(function(event)
        {
          $('#model-popup').popup('close');
        });
  }

  $('.tab').click(function()
      {
        var idTab = $(this).attr('id');
        var idMenu = idTab.substring(0,idTab.indexOf('Tab'));

        if($('#'+idTab).css('border-left-color') === tabColors.unselected)
        {
          globalEmitter.emit('openTab', lastOpenMenu[idMenu], idMenu);
        }
        else
        {
          globalEmitter.emit('closeTabs', true);
        }
      });

  $('.closePanels').click(function()
      {
        globalEmitter.emit('closeTabs', true);
      });

  $('#view-mode').click(function()
      {
        globalEmitter.emit('manipulation_mode', 'view');
      });
  $('#translate-mode').click(function()
      {
        globalEmitter.emit('manipulation_mode', 'translate');
      });
  $('#rotate-mode').click(function()
      {
        globalEmitter.emit('manipulation_mode', 'rotate');
      });

  $('[id^="header-insert-"]').click(function()
      {
        var entity = $(this).attr('id');
        entity = entity.substring(14); // after 'header-insert-'
        globalEmitter.emit('closeTabs', false);
        globalEmitter.emit('spawn_entity_start', entity);
      });

  $('#play').click(function()
      {
        if ( $('#playText').html().indexOf('Play') !== -1 )
        {
          globalEmitter.emit('pause', false);
          globalEmitter.emit('notification_popup','Physics engine running');
        }
        else
        {
          globalEmitter.emit('pause', true);
          globalEmitter.emit('notification_popup','Physics engine paused');
        }
      });
  $('#clock').click(function()
      {
        if ($.mobile.activePage.find('#clock-touch').parent().
            hasClass('ui-popup-active'))
        {
          $( '#clock-touch' ).popup('close');
        }
        else
        {
          var position = $('#clock').offset();
          $('#notification-popup').popup('close');
          $('#clock-touch').popup('open', {
              x:position.left+emUnits(1.6),
              y:emUnits(4)});
        }
      });

  ////////////////////////////////////////////////////////////////////////////////
  // Flight Stage Handler
  ////////////////////////////////////////////////////////////////////////////////

  $('.flight-stage-btn').hover(
    function() { // Mouse enter
      if (!$(this).is(':disabled') && !$(this).hasClass('active-stage-btn') && !$(this).data('clicked')) {
        $(this).prepend('<span style="margin-right: 4px;" class="hover-text">Start</span>');
      }
    },
    function() { // Mouse leave
      if (!$(this).data('clicked')) {
        $(this).find('.hover-text').remove();
      }
    }
  );
  
  // Click event
  $('#stage1, #stage2, #stage3, #stage4, #stage5, #stage6').click(function() {
    var $this = $(this); // Reference to the clicked button
  
    if (!$this.is(':disabled') && !$this.hasClass('active-stage-btn') && !$this.hasClass('loading-stage-btn')) {
      $this.data('clicked', true); // Set data attribute to indicate the button was clicked
      $this.addClass('loading-stage-btn');
      $this.removeClass('active-stage-btn');
      $this.removeClass('flight-stage-btn');
      $this.text($this.text().replace('Start', ''));
      // Add loader image and modify text
      $this.prepend('<img width="16" class="loading-stage-img" src="style/images/loader.gif" /> Starting ');
      $this.append('...');

      window.parent.postMessage(this.id, "http://localhost:8000");

    }
  });

  $('#reset-model').click(function()
      {
        globalEmitter.emit('reset', 'model');
        globalEmitter.emit('closeTabs', false);
      });
  $('#reset-world').click(function()
      {
        window.parent.postMessage("resetWorldClicked", "http://localhost:8000");
      });
  $('#reset-view').click(function()
      {
        globalEmitter.emit('view_reset');
        globalEmitter.emit('closeTabs', false);
      });
  $('#view-grid').click(function()
      {
        globalEmitter.emit('show_grid', 'toggle');
        globalEmitter.emit('closeTabs', false);
      });
  $('#view-collisions').click(function()
      {
        globalEmitter.emit('show_collision');
        globalEmitter.emit('closeTabs', false);
      });
  $('#view-orbit-indicator').click(function()
      {
        globalEmitter.emit('show_orbit_indicator');
        globalEmitter.emit('closeTabs', false);
      });
  $( '#snap-to-grid' ).click(function()
      {
        globalEmitter.emit('snap_to_grid');
        globalEmitter.emit('closeTabs', false);
      });
  $( '#open-tree-when-selected' ).click(function()
      {
        globalEmitter.emit('openTreeWhenSelected');
        globalEmitter.emit('closeTabs', false);
      });
  $( '#toggle-notifications' ).click(function()
      {
        globalEmitter.emit('toggle_notifications');
        globalEmitter.emit('closeTabs', false);
      });

  // Disable Esc key to close panel
  $('body').on('keyup', function(event)
      {
        if (event.which === 27)
        {
          return false;
        }
      });

  // Object menu
  $( '#view-transparent' ).click(function() {
    $('#model-popup').popup('close');
    globalEmitter.emit('set_view_as','transparent');
  });

  $( '#view-wireframe' ).click(function() {
    $('#model-popup').popup('close');
    globalEmitter.emit('set_view_as','wireframe');
  });

  $( '#view-joints' ).click(function() {
    if ($('#view-joints a').css('color') === 'rgb(255, 255, 255)')
    {
      $('#model-popup').popup('close');
      globalEmitter.emit('view_joints');
    }
  });

  $( '#view-com' ).click(function() {
    if ($('#view-com a').css('color') === 'rgb(255, 255, 255)')
    {
      $('#model-popup').popup('close');
      globalEmitter.emit('view_com');
    }
  });

  $( '#view-inertia' ).click(function() {
    if ($('#view-inertia a').css('color') === 'rgb(255, 255, 255)')
    {
      $('#model-popup').popup('close');
      globalEmitter.emit('view_inertia');
    }
  });

  $( '#delete-entity' ).click(function()
  {
    globalEmitter.emit('delete_entity');
  });
  $(window).resize(function()
  {
    globalEmitter.emit('resizePanel');
  });

  $('#logplay-slider-input').on('slidestop', function(event, ui)
  {
    globalEmitter.emit('logPlaySlideStop', $('#logplay-slider-input').val());
  });
  $('#logplay-slider-input').on('slidestart', function(event, ui)
  {
    globalEmitter.emit('logPlaySlideStart');
  });
  $('#logplay-rewind').click(function()
      {
        globalEmitter.emit('logPlayRewind');
      });
  $('#logplay-stepback').click(function()
      {
        globalEmitter.emit('logPlayStepback');
      });
  $('#logplay-play').click(function()
      {
        if ( $('#logplay-playText').html().indexOf('Play') !== -1 )
        {
          globalEmitter.emit('pause', false);
        }
        else
        {
          globalEmitter.emit('pause', true);
        }
      });
  $('#logplay-stepforward').click(function()
      {
        globalEmitter.emit('logPlayStepforward');
      });
  $('#logplay-forward').click(function()
      {
        globalEmitter.emit('logPlayForward');
      });
});

function getNameFromPath(path)
{
  if(path === 'box')
  {
    return 'Box';
  }
  if(path === 'sphere')
  {
    return 'Sphere';
  }
  if(path === 'cylinder')
  {
    return 'Cylinder';
  }
  if(path === 'pointlight')
  {
    return 'Point Light';
  }
  if(path === 'spotlight')
  {
    return 'Spot Light';
  }
  if(path === 'directionallight')
  {
    return 'Directional Light';
  }

  for(var i = 0; i < modelList.length; ++i)
  {
    for(var j = 0; j < modelList[i].models.length; ++j)
    {
      if(modelList[i].models[j].modelPath === path)
      {
        return modelList[i].models[j].modelTitle;
      }
    }
  }
}

// World tree
var gzangular = angular.module('gzangular',[]);
// add ng-right-click
gzangular.directive('ngRightClick', function($parse)
{
  return function(scope, element, attrs)
      {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function(event)
            {
              scope.$apply(function()
                  {
                    event.preventDefault();
                    fn(scope, {$event:event});
                  });
            });
      };
});

gzangular.controller('treeControl', ['$scope', function($scope)
{
  $scope.updateStats = function()
  {
    $scope.models = modelStats;
    $scope.lights = lightStats;
    $scope.scene = sceneStats;
    $scope.physics = physicsStats;
    if (!$scope.$$phase)
    {
      $scope.$apply();
    }
  };

  $scope.selectEntity = function (name)
  {
    $('#model-popup').popup('close');
    globalEmitter.emit('openTab', 'propertyPanel-' + convertNameId(name),
        'treeMenu');
    globalEmitter.emit('selectEntity', name);
  };

  $scope.openEntityMenu = function (event, name)
  {
    $('#model-popup').popup('close');
    globalEmitter.emit('openEntityPopup', event, name);
  };

  $scope.openTab = function (tab)
  {
    globalEmitter.emit('openTab', tab, 'treeMenu');
  };

  $scope.expandTree = function (tree)
  {
    var idContent = 'expandable-' + tree;
    var idHeader = 'expand-' + tree;

    if ($('#' + idContent).is(':visible'))
    {
      $('#' + idContent).hide();
      $('#' + idHeader+' img').css('transform','rotate(0deg)')
                              .css('-webkit-transform','rotate(0deg)')
                              .css('-ms-transform','rotate(0deg)');
    }
    else
    {
      $('#' + idContent).show();
      $('#' + idHeader+' img').css('transform','rotate(90deg)')
                              .css('-webkit-transform','rotate(90deg)')
                              .css('-ms-transform','rotate(90deg)');
    }
  };

  $scope.expandProperty = function (prop, modelName, subPropShortName,
    subPropName, parentProp)
  {
    var modelId = convertNameId(modelName);
    var idContent = 'expandable-' + prop + '-' + modelId;
    var idHeader = 'expand-' + prop + '-' + modelId;

    var idContentOthers, idHeaderOthers;

    if (subPropShortName)
    {
      idContentOthers = idContent;
      idHeaderOthers = idHeader;
      idContent = idContent + '-' + subPropShortName;
      idHeader = idHeader + '-' + subPropShortName;
    }

    if ($('#' + idContent).is(':visible'))
    {
      $('#' + idContent).hide();
      $('#' + idHeader+' img').css('transform','rotate(0deg)')
                              .css('-webkit-transform','rotate(0deg)')
                              .css('-ms-transform','rotate(0deg)');
    }
    else
    {
      if (subPropShortName && (prop === 'link' || prop === 'joint'))
      {
        $('[id^="' + idContentOthers + '-"]').hide();
        $('[id^="' + idHeaderOthers + '-"] img')
            .css('transform','rotate(0deg)')
            .css('-webkit-transform','rotate(0deg)')
            .css('-ms-transform','rotate(0deg)');
      }

      $('#' + idContent).show();
      $('#' + idHeader+' img').css('transform','rotate(90deg)')
                              .css('-webkit-transform','rotate(90deg)')
                              .css('-ms-transform','rotate(90deg)');

      if (prop === 'pose' && parentProp === 'link')
      {
        globalEmitter.emit('setPoseStats', modelName, subPropName);
      }
    }
  };

  $scope.changePose = function(prop1, prop2, name, value)
  {
    globalEmitter.emit('setPose', prop1, prop2, convertNameId(name), value);
  };

  $scope.changeLight = function(prop, name, value)
  {
    globalEmitter.emit('setLight', prop, convertNameId(name), value);
  };

  $scope.toggleProperty = function(prop, entity, subEntity)
  {
    // only for links so far
    globalEmitter.emit('toggleProperty', prop, entity, subEntity);
  };
}]);

// Insert menu
gzangular.controller('insertControl', ['$scope', function($scope)
{
  $scope.categories = modelList;

  $scope.spawnEntity = function(path)
  {
    globalEmitter.emit('spawn_entity_start', path);
  };

  $scope.openTab = function (tab)
  {
    globalEmitter.emit('openTab', tab, 'insertMenu');
  };
}]);


/**
 * Graphical user interface
 * @constructor
 * @param {GZ3D.Scene} scene - A scene to connect to
 */
GZ3D.Gui = function(scene)
{
  this.emitter = globalEmitter || new EventEmitter2({verboseMemoryLeak: true});
  this.scene = scene;
  this.domElement = scene.getDomElement();
  this.spawnState = null;
  this.longPressContainerState = null;
  this.showNotifications = false;
  this.openTreeWhenSelected = false;
  this.modelStatsDirty = false;

  this.logPlay = new GZ3D.LogPlay();

  var that = this;

  // throttle model pose updates, otherwise complex model kills framerate
  setInterval(function() {
    if (that.modelStatsDirty)
    {
      that.updateStats();
      that.modelStatsDirty = false;
    }
  }, 20);

  // On manipulation
  this.emitter.on('manipulation_mode',
      function(mode)
      {
        that.scene.setManipulationMode(mode);
        var space = that.scene.modelManipulator.space;

        if (mode === 'view')
        {
          that.emitter.emit('notification_popup', 'View mode');
        }
        else
        {
          that.emitter.emit('notification_popup',
              mode.charAt(0).toUpperCase()+
              mode.substring(1)+' mode in '+
              space.charAt(0).toUpperCase()+
              space.substring(1)+' space');
        }
      }
  );

  // Create temp model
  this.emitter.on('spawn_entity_start', function(entity)
      {
        // manually trigger view mode
        that.scene.setManipulationMode('view');
        $('#view-mode').prop('checked', true);
        $('input[type="radio"]').checkboxradio('refresh');

        var name = getNameFromPath(entity);

        that.spawnState = 'START';
        that.scene.spawnModel.start(entity,function(obj)
            {
              that.emitter.emit('entityCreated', obj, entity);
            });
        that.emitter.emit('notification_popup',
            'Place '+name+' at the desired position');
      }
  );

  // Move temp model by touch
  this.emitter.on('spawn_entity_move', function(event)
      {
        that.spawnState = 'MOVE';
        that.scene.spawnModel.onTouchMove(event,false);
      }
  );
  // Place temp model by touch
  this.emitter.on('spawn_entity_end', function()
      {
        if (that.spawnState === 'MOVE')
        {
          that.scene.spawnModel.onTouchEnd();
        }
        that.spawnState = null;
      }
  );

  this.emitter.on('reset', function(resetType)
      {
        if (resetType === 'world')
        {
          that.emitter.emit('notification_popup','Reset world');
        }
        else if (resetType === 'model')
        {
          that.emitter.emit('notification_popup','Reset model poses');
        }
      }
  );

  this.emitter.on('model_reset', function()
      {
        // TODO: no need to emit another one
        that.emitter.emit('reset', 'model');
        that.emitter.emit('notification_popup','Reset model poses');
      }
  );

  this.emitter.on('view_reset', function()
      {
        that.scene.resetView();
        that.emitter.emit('notification_popup','Reset view');
      }
  );

  this.emitter.on('show_collision', function()
      {
        that.scene.showCollision(!that.scene.showCollisions);
        if(!that.scene.showCollisions)
        {
          $('#view-collisions').buttonMarkup({icon: 'false'});
          that.emitter.emit('notification_popup','Hiding collisions');
        }
        else
        {
          $('#view-collisions').buttonMarkup({icon: 'check'});
          that.emitter.emit('notification_popup','Viewing collisions');
        }
      }
  );

  this.emitter.on('show_grid', function(option)
      {
        if (option === 'show')
        {
          that.scene.grid.visible = true;
        }
        else if (option === 'hide')
        {
          that.scene.grid.visible = false;
        }
        else if (option === 'toggle')
        {
          that.scene.grid.visible = !that.scene.grid.visible;
        }

        if(!that.scene.grid.visible)
        {
          $('#view-grid').buttonMarkup({icon: 'false'});
          that.emitter.emit('notification_popup','Hiding grid');
        }
        else
        {
          $('#view-grid').buttonMarkup({icon: 'check'});
          that.emitter.emit('notification_popup','Viewing grid');
        }
      }
  );

   this.emitter.on('show_orbit_indicator', function()
      {
        that.scene.controls.showTargetIndicator =
            !that.scene.controls.showTargetIndicator;
        if(!that.scene.controls.showTargetIndicator)
        {
          $('#view-orbit-indicator').buttonMarkup({icon: 'false'});
          that.emitter.emit('notification_popup','Hiding orbit indicator');
        }
        else
        {
          $('#view-orbit-indicator').buttonMarkup({icon: 'check'});
          that.emitter.emit('notification_popup','Viewing orbit indicator');
        }
      }
  );

  this.emitter.on('snap_to_grid',
      function ()
      {
        if(that.scene.modelManipulator.snapDist === null)
        {
          $('#snap-to-grid').buttonMarkup({icon: 'check'});
          that.scene.modelManipulator.snapDist = 0.5;
          that.scene.spawnModel.snapDist = that.scene.modelManipulator.snapDist;
          that.emitter.emit('notification_popup','Snapping to grid');
        }
        else
        {
          $('#snap-to-grid').buttonMarkup({icon: 'false'});
          that.scene.modelManipulator.snapDist = null;
          that.scene.spawnModel.snapDist = null;
          that.emitter.emit('notification_popup','Not snapping to grid');
        }
      }
  );

  this.emitter.on('openTreeWhenSelected', function ()
      {
        that.openTreeWhenSelected = !that.openTreeWhenSelected;
        if(!that.openTreeWhenSelected)
        {
          $('#open-tree-when-selected').buttonMarkup({icon: 'false'});
        }
        else
        {
          $('#open-tree-when-selected').buttonMarkup({icon: 'check'});
        }
      }
  );

  this.emitter.on('toggle_notifications', function ()
      {
        that.showNotifications = !that.showNotifications;
        if(!that.showNotifications)
        {
          $('#toggle-notifications').buttonMarkup({icon: 'false'});
        }
        else
        {
          $('#toggle-notifications').buttonMarkup({icon: 'check'});
        }
      }
  );


  this.emitter.on('longpress_container_start',
      function (event)
      {
        if (event.originalEvent.touches.length !== 1 ||
            that.scene.modelManipulator.hovered ||
            that.scene.spawnModel.active)
        {
          that.emitter.emit('longpress_container_end',
              event.originalEvent,true);
        }
        else
        {
          that.scene.showRadialMenu(event);
          that.longPressContainerState = 'START';
        }
      }
  );

  this.emitter.on('longpress_container_end', function(event,cancel)
      {
        if (that.longPressContainerState !== 'START')
        {
          that.longPressContainerState = 'END';
          return;
        }
        that.longPressContainerState = 'END';
        if (that.scene.radialMenu.showing)
        {
          if (cancel)
          {
            that.scene.radialMenu.hide(event);
          }
          else
          {
          that.scene.radialMenu.hide(event, function(type,entity)
              {
                if (type === 'delete')
                {
                  that.emitter.emit('deleteEntity',entity);
                  that.scene.setManipulationMode('view');
                  $( '#view-mode' ).prop('checked', true);
                  $('input[type="radio"]').checkboxradio('refresh');
                }
                else if (type === 'translate')
                {
                  $('#translate-mode').click();
                  $('input[type="radio"]').checkboxradio('refresh');
                  that.scene.attachManipulator(entity,type);
                }
                else if (type === 'rotate')
                {
                  $( '#rotate-mode' ).click();
                  $('input[type="radio"]').checkboxradio('refresh');
                  that.scene.attachManipulator(entity,type);
                }
                else if (type === 'transparent')
                {
                  that.emitter.emit('set_view_as','transparent');
                }
                else if (type === 'wireframe')
                {
                  that.emitter.emit('set_view_as','wireframe');
                }
                else if (type === 'joints')
                {
                  that.scene.selectEntity(entity);
                  that.emitter.emit('view_joints');
                }

              });
          }
        }
      }
  );

  this.emitter.on('longpress_container_move', function(event)
      {
        if (event.originalEvent.touches.length !== 1)
        {
          that.emitter.emit('longpress_container_end',event.originalEvent,true);
        }
        else
        {
          if (that.longPressContainerState !== 'START')
          {
            return;
          }
          if (that.scene.radialMenu.showing)
          {
            that.scene.radialMenu.onLongPressMove(event);
          }
        }
      }
  );

  this.emitter.on('longpress_insert_start', function (event, path)
      {
        navigator.vibrate(50);
        that.emitter.emit('spawn_entity_start', path);
        event.stopPropagation();
      }
  );

  this.emitter.on('longpress_insert_end', function(event)
      {
        that.emitter.emit('spawn_entity_end');
      }
  );

  this.emitter.on('longpress_insert_move', function(event)
      {
        that.emitter.emit('spawn_entity_move', event);
        event.stopPropagation();
      }
  );

  var notificationTimeout;
  this.emitter.on('notification_popup',
      function (notification, duration)
      {
        if (that.showNotifications)
        {
          clearTimeout(notificationTimeout);
          $( '#notification-popup' ).popup('close');
          $( '#notification-popup' ).html('&nbsp;'+notification+'&nbsp;');
          $( '#notification-popup' ).popup('open', {
              y:window.innerHeight-50});

          if (duration === undefined)
          {
            duration = 2000;
          }
          notificationTimeout = setTimeout(function()
          {
            $( '#notification-popup' ).popup('close');
          }, duration);
        }
      }
  );

  this.emitter.on('right_click', function (event)
      {
        that.scene.onRightClick(event, function(entity)
            {
              that.openEntityPopup(event, entity);
            });
      }
  );

  this.emitter.on('set_view_as', function (viewAs)
      {
        that.scene.setViewAs(that.scene.selectedEntity, viewAs);
      }
  );

  this.emitter.on('view_joints', function ()
      {
        that.scene.viewJoints(that.scene.selectedEntity);
      }
  );

  this.emitter.on('view_inertia', function ()
      {
        that.scene.viewInertia(that.scene.selectedEntity);
      }
  );

  this.emitter.on('view_com', function ()
      {
        that.scene.viewCOM(that.scene.selectedEntity);
      }
  );

  this.emitter.on('delete_entity', function ()
      {
        that.emitter.emit('deleteEntity',that.scene.selectedEntity);
        $('#model-popup').popup('close');
        that.scene.selectEntity(null);
      }
  );

  this.emitter.on('pointerOnMenu', function ()
      {
        that.scene.pointerOnMenu = true;
      }
  );

  this.emitter.on('pointerOffMenu', function ()
      {
        that.scene.pointerOnMenu = false;
      }
  );

  this.emitter.on('openTab', function (id, parentId)
      {
        lastOpenMenu[parentId] = id;

        $('.leftPanels').hide();
        $('#'+id).show();

        $('.tab').css('border-left-color', tabColors.unselected);
        $('#'+parentId+'Tab').css('border-left-color', tabColors.selected);

        if (id.indexOf('propertyPanel-') >= 0)
        {
          var entityName = id.substring(id.indexOf('-')+1);
          var object = that.scene.getByName(
              convertNameId(entityName, true));

          var stats = {};
          stats.name = entityName;

          stats.pose = {};
          stats.pose.position = {x: object.position.x,
                                 y: object.position.y,
                                 z: object.position.z};

          stats.pose.orientation = {x: object.quaternion._x,
                                    y: object.quaternion._y,
                                    z: object.quaternion._z,
                                    w: object.quaternion._w};
        }

        that.emitter.emit('resizePanel');
      }
  );

  this.emitter.on('closeTabs', function (force)
      {
        // Close for narrow viewports, force to always close
        if (force || !isWideScreen())
        {
          $('.leftPanels').hide();
          $('.tab').css('left', '0em');
          $('.tab').css('border-left-color', tabColors.unselected);
        }
      }
  );

  this.emitter.on('setTreeSelected', function (object)
      {
        for (var i = 0; i < modelStats.length; ++i)
        {
          if (modelStats[i].name === object)
          {
            modelStats[i].selected = 'selectedTreeItem';
            if (that.openTreeWhenSelected)
            {
              that.emitter.emit('openTab', 'propertyPanel-'+
                  convertNameId(object), 'treeMenu');
            }
          }
          else
          {
            modelStats[i].selected = 'unselectedTreeItem';
          }
        }
        for (i = 0; i < lightStats.length; ++i)
        {
          if (lightStats[i].name === object)
          {
            lightStats[i].selected = 'selectedTreeItem';
            if (that.openTreeWhenSelected)
            {
              that.emitter.emit('openTab', 'propertyPanel-' +
                  convertNameId(object), 'treeMenu');
            }
          }
          else
          {
            lightStats[i].selected = 'unselectedTreeItem';
          }
        }
        that.updateStats();
      }
  );

  this.emitter.on('setTreeDeselected', function ()
      {
        for (var i = 0; i < modelStats.length; ++i)
        {
          modelStats[i].selected = 'unselectedTreeItem';
        }
        for (i = 0; i < lightStats.length; ++i)
        {
          lightStats[i].selected = 'unselectedTreeItem';
        }
        that.updateStats();
      }
  );

  this.emitter.on('selectEntity', function (name)
      {
        var object = that.scene.getByName(name);
        that.scene.selectEntity(object);
      }
  );

  this.emitter.on('openEntityPopup', function (event, name)
      {
        if (!isTouchDevice)
        {
          var object = that.scene.getByName(name);
          that.openEntityPopup(event, object);
        }
      }
  );

  this.emitter.on('setPoseStats', function (modelName, linkName)
      {
        var object;
        if (linkName === undefined)
        {
          object = that.scene.getByName(modelName);
        }
        else
        {
          object = that.scene.getByName(linkName);
        }

        var stats = {};
        stats.name = object.name;
        stats.pose = {};
        stats.pose.position = {x: object.position.x,
                               y: object.position.y,
                               z: object.position.z};
        stats.pose.orientation = {x: object.quaternion._x,
                                  y: object.quaternion._y,
                                  z: object.quaternion._z,
                                  w: object.quaternion._w};

        if (object.children[0] instanceof THREE.Light)
        {
          that.setLightStats(stats, 'update');
        }
        else
        {
          that.setModelStats(stats, 'update');
        }
      }
  );

  this.emitter.on('resizePanel', function ()
      {
        if ($('.leftPanels').is(':visible'))
        {
          if (isWideScreen())
          {
            $('.tab').css('left', '23em');
          }
          else
          {
            $('.tab').css('left', '10.5em');
          }
        }

        if ($('.propertyPanels').is(':visible'))
        {
          var maxWidth = $(window).width();
          if (isWideScreen())
          {
            maxWidth = emUnits(23);
          }

          $('.propertyPanels').css('width', maxWidth);
        }
      }
  );

  this.emitter.on('setPose', function (prop1, prop2, name, value)
      {
        if (value === undefined)
        {
          return;
        }

        var entity = that.scene.getByName(name);
        if (prop1 === 'orientation')
        {
          entity['rotation']['_'+prop2] = value;
          entity['quaternion'].setFromEuler(entity['rotation']);
        }
        else
        {
          entity[prop1][prop2] = value;
        }
        entity.updateMatrixWorld();

        if (entity.children[0] &&
           (entity.children[0] instanceof THREE.SpotLight ||
            entity.children[0] instanceof THREE.DirectionalLight))
        {
          var lightObj = entity.children[0];
          var dir = new THREE.Vector3(0,0,0);
          dir.copy(entity.direction);
          entity.localToWorld(dir);
          lightObj.target.position.copy(dir);
        }

        that.scene.emitter.emit('entityChanged', entity);
      }
  );

  this.emitter.on('setLight', function (prop, name, value)
      {
        if (value === undefined)
        {
          return;
        }

        var entity = that.scene.getByName(name);
        var lightObj = entity.children[0];
        if (prop === 'diffuse')
        {
          lightObj.color = new THREE.Color(value);
        }
        else if (prop === 'specular')
        {
          entity.serverProperties.specular = new THREE.Color(value);
        }
        else if (prop === 'range')
        {
          lightObj.distance = value;
        }
        else if (prop === 'attenuation_constant')
        {
          entity.serverProperties.attenuation_constant = value;
        }
        else if (prop === 'attenuation_linear')
        {
          entity.serverProperties.attenuation_linear = value;
          lightObj.intensity = lightObj.intensity/(1+value);
        }
        else if (prop === 'attenuation_quadratic')
        {
          entity.serverProperties.attenuation_quadratic = value;
          lightObj.intensity = lightObj.intensity/(1+value);
        }

        // updating color too often, maybe only update when popup is closed
        that.scene.emitter.emit('entityChanged', entity);
      }
  );

  this.emitter.on('toggleProperty', function (prop, subEntityName)
      {
        var entity = that.scene.getByName(subEntityName);
        entity.serverProperties[prop] = !entity.serverProperties[prop];

        that.scene.emitter.emit('linkChanged', entity);
      }
  );

  this.emitter.on('setLightStats', function (stats, action)
      {
        that.setLightStats(stats, action);
      }
  );

  this.emitter.on('setModelStats', function (stats, action)
      {
        that.setModelStats(stats, action);
      }
  );

  this.emitter.on('setSceneStats', function (stats)
      {
        that.setSceneStats(stats);
      }
  );

  this.emitter.on('setPhysicsStats', function (stats)
      {
        that.setPhysicsStats(stats);
      }
  );

  this.emitter.on('setPaused', function (stats)
      {
        that.setPaused(stats);
      }
  );

  this.emitter.on('setLogPlayVisible', function (stats)
      {
        that.setLogPlayVisible(stats);
      }
  );

  this.emitter.on('setLogPlayStats', function (simTime, startTime, endTime)
      {
        that.setLogPlayStats(simTime, startTime, endTime);
      }
  );

  this.emitter.on('setRealTime', function (stats)
      {
        that.setRealTime(stats);
      }
  );

  this.emitter.on('setSimTime', function (stats)
      {
        that.setSimTime(stats);
      }
  );
};

/**
 * Play/pause simulation
 * @param {boolean} paused
 */
GZ3D.Gui.prototype.setPaused = function(paused)
{
  if (paused)
  {
    $('#playText').html(
        '<img style="height:1.2em" src="style/images/play.png" title="Play">');
  }
  else
  {
    $('#playText').html(
        '<img style="height:1.2em" src="style/images/pause.png" title="Pause">'
        );
  }
  // pause'd' event to inidicate simulation pause state has changed
  // this is different from the 'pause' event which indicates user has pressed
  // the play/pause button.
  this.emitter.emit('paused', paused);
};

/**
 * Update displayed real time
 * @param {string} realTime
 */
GZ3D.Gui.prototype.setRealTime = function(realTime)
{
  $('.real-time-value').text(formatTime(realTime));
};

/**
 * Update displayed simulation time
 * @param {string} simTime
 */
GZ3D.Gui.prototype.setSimTime = function(simTime)
{
  $('.sim-time-value').text(formatTime(simTime));
};

var sceneStats = {};
/**
 * Update scene stats on scene tree
 * @param {} stats
 */
GZ3D.Gui.prototype.setSceneStats = function(stats)
{
  sceneStats['ambient'] = this.round(stats.ambient, true);
  sceneStats['background'] = this.round(stats.background, true);
};

var physicsStats = {};
/**
 * Update physics stats on scene tree
 * @param {} stats
 */
GZ3D.Gui.prototype.setPhysicsStats = function(stats)
{
  physicsStats = stats;
  physicsStats['enable_physics'] = this.trueOrFalse(
      physicsStats['enable_physics']);
  physicsStats['max_step_size'] = this.round(
      physicsStats['max_step_size'], false, 3);
  physicsStats['gravity'] = this.round(
      physicsStats['gravity'], false, 3);
  physicsStats['sor'] = this.round(
      physicsStats['sor'], false, 3);
  physicsStats['cfm'] = this.round(
      physicsStats['cfm'], false, 3);
  physicsStats['erp'] = this.round(
      physicsStats['erp'], false, 3);
  physicsStats['contact_max_correcting_vel'] = this.round(
      physicsStats['contact_max_correcting_vel'], false, 3);
  physicsStats['contact_surface_layer'] = this.round(
      physicsStats['contact_surface_layer'], false, 3);

  this.updateStats();
};

var modelStats = [];
/**
 * Update model stats on property panel
 * @param {} stats
 * @param {} action: 'update' / 'delete'
 */
GZ3D.Gui.prototype.setModelStats = function(stats, action)
{
  var modelName = stats.name;
  var linkShortName;

  // if it's a link
  if (stats.name.indexOf('::') >= 0)
  {
    modelName = stats.name.substring(0, stats.name.indexOf('::'));
    linkShortName = stats.name.substring(stats.name.lastIndexOf('::')+2);
  }

  if (action === 'update')
  {
    var model = $.grep(modelStats, function(e)
        {
          return e.name === modelName;
        });

    var formatted;

    // New model
    if (model.length === 0)
    {
      var thumbnail = this.findModelThumbnail(modelName);

      formatted = this.formatStats(stats);

      modelStats.push(
          {
            name: modelName,
            id: convertNameId(modelName),
            thumbnail: thumbnail,
            selected: 'unselectedTreeItem',
            is_static: this.trueOrFalse(stats.is_static),
            position: formatted.pose.position,
            orientation: formatted.pose.orientation,
            links: [],
            joints: []
          });

      var newModel = modelStats[modelStats.length-1];

      // links
      if (stats.link)
      {
        for (var l = 0; l < stats.link.length; ++l)
        {
          var shortName = stats.link[l].name.substring(
              stats.link[l].name.lastIndexOf('::')+2);

          formatted = this.formatStats(stats.link[l]);

          newModel.links.push(
              {
                name: stats.link[l].name,
                shortName: shortName,
                self_collide: this.trueOrFalse(stats.link[l].self_collide),
                gravity: this.trueOrFalse(stats.link[l].gravity),
                kinematic: this.trueOrFalse(stats.link[l].kinematic),
                canonical: this.trueOrFalse(stats.link[l].canonical),
                position: formatted.pose.position,
                orientation: formatted.pose.orientation,
                inertial: formatted.inertial
              });
        }
      }

      // joints
      if (stats.joint)
      {
        for (var j = 0; j < stats.joint.length; ++j)
        {
          var jointShortName = stats.joint[j].name.substring(
              stats.joint[j].name.lastIndexOf('::')+2);
          var parentShortName = stats.joint[j].parent.substring(
              stats.joint[j].parent.lastIndexOf('::')+2);
          var childShortName = stats.joint[j].child.substring(
              stats.joint[j].child.lastIndexOf('::')+2);

          var type;
          switch (stats.joint[j].type)
          {
            case 1:
                type = 'Revolute';
                break;
            case 2:
                type = 'Revolute2';
                break;
            case 3:
                type = 'Prismatic';
                break;
            case 4:
                type = 'Universal';
                break;
            case 5:
                type = 'Ball';
                break;
            case 6:
                type = 'Screw';
                break;
            case 7:
                type = 'Gearbox';
                break;
            default:
                type = 'Unknown';
          }

          formatted = this.formatStats(stats.joint[j]);

          newModel.joints.push(
              {
                name: stats.joint[j].name,
                shortName: jointShortName,
                type: type,
                parent: stats.joint[j].parent,
                parentShortName: parentShortName,
                child: stats.joint[j].child,
                childShortName: childShortName,
                position: formatted.pose.position,
                orientation: formatted.pose.orientation,
                axis1: formatted.axis1,
                axis2: formatted.axis2
              });
        }
      }
      this.updateStats();
    }
    // Update existing model
    else
    {
      var link;

      if (stats.link && stats.link[0])
      {
        var LinkShortName = stats.link[0].name;

        link = $.grep(model[0].links, function(e)
            {
              return e.shortName === LinkShortName;
            });

        if (link[0])
        {
          if (link[0].self_collide)
          {
            link[0].self_collide = this.trueOrFalse(stats.link[0].self_collide);
          }
          if (link[0].gravity)
          {
            link[0].gravity = this.trueOrFalse(stats.link[0].gravity);
          }
          if (link[0].kinematic)
          {
            link[0].kinematic = this.trueOrFalse(stats.link[0].kinematic);
          }
        }
      }
      // Update pose stats only if they're being displayed and are not focused
      var modelId = convertNameId(modelName);
      if (!((linkShortName &&
          !$('#expandable-pose-'+modelId+'-'+linkShortName).is(':visible'))||
          (!linkShortName &&
          !$('#expandable-pose-'+modelId).is(':visible'))||
          $('#expandable-pose-'+modelId+' input').is(':focus')))
      {
        if (stats.position)
        {
          stats.pose = {};
          stats.pose.position = stats.position;
          stats.pose.orientation = stats.orientation;
        }
        if (stats.pose)
        {
          formatted = this.formatStats(stats);
          if (linkShortName === undefined)
          {
            model[0].position = formatted.pose.position;
            model[0].orientation = formatted.pose.orientation;
          }
          else
          {
            link = $.grep(model[0].links, function(e)
              {
                return e.shortName === linkShortName;
              });
            link[0].position = formatted.pose.position;
            link[0].orientation = formatted.pose.orientation;
          }
        }
        // throttle model pose updates
        this.updateModelStatsAsync();
      }
    }
  }
  else if (action === 'delete')
  {
    this.deleteFromStats('model', modelName);
    this.updateStats();
  }
};

var lightStats = [];
/**
 * Update light stats on property panel
 * @param {} stats
 * @param {} action: 'update' / 'delete'
 */
GZ3D.Gui.prototype.setLightStats = function(stats, action)
{
  var name = stats.name;

  if (action === 'update')
  {
    var light = $.grep(lightStats, function(e)
        {
          return e.name === name;
        });

    var formatted;

    // New light
    if (light.length === 0)
    {
      var type = stats.type;

      var thumbnail;
      switch(type)
      {
        case 2:
            thumbnail = 'style/images/spotlight.png';
            break;
        case 3:
            thumbnail = 'style/images/directionallight.png';
            break;
        default:
            thumbnail = 'style/images/pointlight.png';
      }

      stats.attenuation = {constant: stats.attenuation_constant,
                           linear: stats.attenuation_linear,
                           quadratic: stats.attenuation_quadratic};

      formatted = this.formatStats(stats);

      var direction;
      if (stats.direction)
      {
        direction = stats.direction;
      }

      lightStats.push(
          {
            name: name,
            id: convertNameId(name),
            thumbnail: thumbnail,
            selected: 'unselectedTreeItem',
            position: formatted.pose.position,
            orientation: formatted.pose.orientation,
            diffuse: formatted.diffuse,
            specular: formatted.specular,
            color: formatted.color,
            range: stats.range,
            attenuation: this.round(stats.attenuation, false, null),
            direction: direction
          });
    }
    else
    {
      formatted = this.formatStats(stats);

      if (stats.pose)
      {
        light[0].position = formatted.pose.position;
        light[0].orientation = formatted.pose.orientation;
      }

      if (stats.diffuse)
      {
        light[0].diffuse = formatted.diffuse;
      }

      if (stats.specular)
      {
        light[0].specular = formatted.specular;
      }
    }
  }
  else if (action === 'delete')
  {
    this.deleteFromStats('light', name);
  }

  this.updateStats();
};

/**
 * Find thumbnail
 * @param {} instanceName
 * @returns string
 */
GZ3D.Gui.prototype.findModelThumbnail = function(instanceName)
{
  for(var i = 0; i < modelList.length; ++i)
  {
    for(var j = 0; j < modelList[i].models.length; ++j)
    {
      var path = modelList[i].models[j].modelPath;
      if(instanceName.indexOf(path) >= 0)
      {
        return '/assets/'+path+'/thumbnails/0.png';
      }
    }
  }
  if(instanceName.indexOf('box') >= 0)
  {
    return 'style/images/box.png';
  }
  if(instanceName.indexOf('sphere') >= 0)
  {
    return 'style/images/sphere.png';
  }
  if(instanceName.indexOf('cylinder') >= 0)
  {
    return 'style/images/cylinder.png';
  }
  return 'style/images/box.png';
};

/**
 * Update model stats
 */
GZ3D.Gui.prototype.updateStats = function()
{
  var tree = angular.element($('#treeMenu')).scope();
  tree.updateStats();
};

GZ3D.Gui.prototype.updateModelStatsAsync = function()
{
  this.modelStatsDirty = true;
};

/**
 * Open entity (model/light) context menu
 * @param {} event
 * @param {THREE.Object3D} entity
 */
GZ3D.Gui.prototype.openEntityPopup = function(event, entity)
{
  this.scene.selectEntity(entity);
  $('.ui-popup').popup('close');

  if (entity.children[0] instanceof THREE.Light)
  {
    $('#view-transparent').css('visibility','collapse');
    $('#view-wireframe').css('visibility','collapse');
    $('#view-joints').css('visibility','collapse');
    $('#view-com').css('visibility','collapse');
    $('#view-inertia').css('visibility','collapse');
    $('#model-popup').popup('open',
      {x: event.clientX + emUnits(6),
       y: event.clientY + emUnits(-8)});
  }
  else
  {
    if (this.scene.selectedEntity.viewAs === 'transparent')
    {
      $('#view-transparent').buttonMarkup({icon: 'check'});
    }
    else
    {
      $('#view-transparent').buttonMarkup({icon: 'false'});
    }

    if (this.scene.selectedEntity.viewAs === 'wireframe')
    {
      $('#view-wireframe').buttonMarkup({icon: 'check'});
    }
    else
    {
      $('#view-wireframe').buttonMarkup({icon: 'false'});
    }

    if (entity.children.length === 0)
    {
      $('#view-inertia a').css('color', '#888888');
      $('#view-inertia').buttonMarkup({icon: 'false'});
      $('#view-com a').css('color', '#888888');
      $('#view-com').buttonMarkup({icon: 'false'});
    }
    else
    {
      $('#view-inertia a').css('color', '#ffffff');
      $('#view-com a').css('color', '#ffffff');
      if (entity.getObjectByName('INERTIA_VISUAL', true))
      {
        $('#view-inertia').buttonMarkup({icon: 'check'});
      }
      else
      {
        $('#view-inertia').buttonMarkup({icon: 'false'});
      }
      if (entity.getObjectByName('COM_VISUAL', true))
      {
        $('#view-com').buttonMarkup({icon: 'check'});
      }
      else
      {
        $('#view-com').buttonMarkup({icon: 'false'});
      }
    }

    if (entity.joint === undefined || entity.joint.length === 0)
    {
      $('#view-joints a').css('color', '#888888');
      $('#view-joints').buttonMarkup({icon: 'false'});
    }
    else
    {
      $('#view-joints a').css('color', '#ffffff');
      if (entity.getObjectByName('JOINT_VISUAL', true))
      {
        $('#view-joints').buttonMarkup({icon: 'check'});
      }
      else
      {
        $('#view-joints').buttonMarkup({icon: 'false'});
      }
    }

    $('#view-transparent').css('visibility','visible');
    $('#view-wireframe').css('visibility','visible');
    $('#view-joints').css('visibility','visible');
    $('#view-com').css('visibility','visible');
    $('#view-inertia').css('visibility','visible');
    $('#model-popup').popup('open',
      {x: event.clientX + emUnits(6),
       y: event.clientY + emUnits(0)});
  }
};

/* eslint-disable */
/**
 * Format stats message for proper display
 * @param {} stats
 * @returns {Object.<position, orientation, inertial,diffuse, specular, attenuation>}
 */
/* eslint-enable */
GZ3D.Gui.prototype.formatStats = function(stats)
{
  var position, orientation;
  var quat, rpy;
  if (stats.pose)
  {
    position = this.round(stats.pose.position, false, null);

    quat = new THREE.Quaternion(stats.pose.orientation.x,
        stats.pose.orientation.y, stats.pose.orientation.z,
        stats.pose.orientation.w);

    rpy = new THREE.Euler();
    rpy.setFromQuaternion(quat);

    orientation = {roll: rpy._x, pitch: rpy._y, yaw: rpy._z};
    orientation = this.round(orientation, false, null);
  }
  var inertial;
  if (stats.inertial)
  {
    inertial = this.round(stats.inertial, false, 3);

    var inertialPose = stats.inertial.pose;
    inertial.pose = {};

    inertial.pose.position = {x: inertialPose.position.x,
                              y: inertialPose.position.y,
                              z: inertialPose.position.z};

    inertial.pose.position = this.round(inertial.pose.position, false, 3);

    quat = new THREE.Quaternion(inertialPose.orientation.x,
        inertialPose.orientation.y, inertialPose.orientation.z,
        inertialPose.orientation.w);

    rpy = new THREE.Euler();
    rpy.setFromQuaternion(quat);

    inertial.pose.orientation = {roll: rpy._x, pitch: rpy._y, yaw: rpy._z};
    inertial.pose.orientation = this.round(inertial.pose.orientation, false, 3);
  }
  var diffuse, colorHex, comp;
  var color = {};
  if (stats.diffuse)
  {
    diffuse = this.round(stats.diffuse, true);

    colorHex = {};
    for (comp in diffuse)
    {
      colorHex[comp] = diffuse[comp].toString(16);
      if (colorHex[comp].length === 1)
      {
        colorHex[comp] = '0' + colorHex[comp];
      }
    }
    color.diffuse = '#' + colorHex['r'] + colorHex['g'] + colorHex['b'];
  }
  var specular;
  if (stats.specular)
  {
    specular = this.round(stats.specular, true);

    colorHex = {};
    for (comp in specular)
    {
      colorHex[comp] = specular[comp].toString(16);
      if (colorHex[comp].length === 1)
      {
        colorHex[comp] = '0' + colorHex[comp];
      }
    }
    color.specular = '#' + colorHex['r'] + colorHex['g'] + colorHex['b'];
  }
  var axis1;
  if (stats.axis1)
  {
    axis1 = {};
    axis1 = this.round(stats.axis1);
    axis1.direction = this.round(stats.axis1.xyz, false, 3);
  }
  var axis2;
  if (stats.axis2)
  {
    axis2 = {};
    axis2 = this.round(stats.axis2);
    axis2.direction = this.round(stats.axis2.xyz, false, 3);
  }

  return {pose: {position: position, orientation: orientation},
          inertial: inertial,
          diffuse: diffuse,
          specular: specular,
          color: color,
          axis1: axis1,
          axis2: axis2};
};

/**
 * Round numbers and format colors
 * @param {} stats
 * @param {} decimals - number of decimals to display, null for input fields
 * @returns result
 */
GZ3D.Gui.prototype.round = function(stats, isColor, decimals)
{
  var result = stats;
  if (typeof result === 'number')
  {
    result = this.roundNumber(result, isColor, decimals);
  }
  else // array of numbers
  {
    result = this.roundArray(result, isColor, decimals);
  }
  return result;
};

/**
 * Round number and format color
 * @param {} stats
 * @param {} decimals - number of decimals to display, null for input fields
 * @returns result
 */
GZ3D.Gui.prototype.roundNumber = function(stats, isColor, decimals)
{
  var result = stats;
  if (isColor)
  {
    result = Math.round(result * 255);
  }
  else
  {
    if (decimals === null)
    {
      result = Math.round(result*1000)/1000;
    }
    else
    {
      result = result.toFixed(decimals);
    }
  }
  return result;
};

/**
 * Round each number in an array
 * @param {} stats
 * @param {} decimals - number of decimals to display, null for input fields
 * @returns result
 */
GZ3D.Gui.prototype.roundArray = function(stats, isColor, decimals)
{
  var result = stats;
  for (var key in result)
  {
    if (typeof result[key] === 'number')
    {
      result[key] = this.roundNumber(result[key], isColor, decimals);
    }
  }
  return result;
};

/**
 * Format toggle items
 * @param {} stats: true / false
 * @returns {Object.<icon, title>}
 */
GZ3D.Gui.prototype.trueOrFalse = function(stats)
{
  return stats ?
      {icon: 'true', title: 'True'} :
      {icon: 'false', title: 'False'};
};

/**
 * Delete an entity from stats list
 * @param {} type: 'model' / 'light'
 * @param {} name
 */
GZ3D.Gui.prototype.deleteFromStats = function(type, name)
{
  var list = (type === 'model') ? modelStats : lightStats;

  for (var i = 0; i < list.length; ++i)
  {
    if (list[i].name === name)
    {
      if ($('#propertyPanel-'+ convertNameId(name)).is(':visible'))
      {
        this.emitter.emit('openTab', 'treeMenu', 'treeMenu');
      }

      list.splice(i, 1);
      break;
    }
  }
};

/**
 * Set the visibility of the log play back widget
 * @param {} visible
 */
GZ3D.Gui.prototype.setLogPlayVisible = function(visible)
{
  if (visible === this.logPlay.isVisible())
  {
    return;
  }

  this.logPlay.setVisible(visible);

  // update UI to be in log playback mode
  if (visible)
  {
    $('#editMenu').hide();
    $('#insertMenuTab').hide();
    $('#manipulatorModeFieldset').hide();
    $('#simpleShapesFieldset').hide();
    $('#lightsFieldset').hide();
    $('#clock-mouse').hide();
    $('#clock-header-fieldset').hide();
    $('#play-header-fieldset').hide();
  }
  else
  {
    $('#editMenu').show();
    $('#insertMenuTab').show();
    $('#manipulatorModeFieldset').show();
    $('#simpleShapesFieldset').show();
    $('#lightsFieldset').show();
    $('#clock-mouse').show();
    $('#clock-header-fieldset').show();
    $('#play-header-fieldset').show();
  }
};

/**
 * Set the log play back stats
 * @param {} simTime
 * @param {} startTime
 * @param {} endTime
 */
GZ3D.Gui.prototype.setLogPlayStats = function(simTime, startTime, endTime)
{
  this.logPlay.setStats(simTime, startTime, endTime);
  $('.end-time-value').text(formatTime(endTime));
};


/**
 * Convert name to id and vice versa
 * @param {} name Entity Name
 * @param {} reverse convert id to name
 */
var convertNameId = function(name, reverse)
{
  if (reverse)
  {
    return name.replace(new RegExp('_gzspace_', 'g'), ' ');
  }
  else
  {
    return name.replace(new RegExp(' ', 'g'), '_gzspace_');
  }
};

/**
 * Format time string
 * @param {} time object
 */
var formatTime = function(time)
{
  var timeSec = time.sec;
  var timeNSec = time.nsec;

  var timeDay = Math.floor(timeSec / 86400);
  timeSec -= timeDay * 86400;

  var timeHour = Math.floor(timeSec / 3600);
  timeSec -= timeHour * 3600;

  var timeMin = Math.floor(timeSec / 60);
  timeSec -= timeMin * 60;

  var timeMsec = Math.floor(timeNSec * 1e-6);

  var timeValue = '';

/*
  if (timeDay < 10)
  {
    timeValue += '0';
  }
  timeValue += timeDay.toFixed(0)  + ' ';
*/
  if (timeHour < 10)
  {
    timeValue += '0';
  }
  timeValue += timeHour.toFixed(0) + ':';
  if (timeMin < 10)
  {
    timeValue += '0';
  }
  timeValue += timeMin.toFixed(0) + ':';
  if (timeSec < 10)
  {
    timeValue += '0';
  }
  timeValue += timeSec.toFixed(0) + '.';

  timeValue += ('00' + timeMsec.toFixed(0)).slice(-3);

  return timeValue;
};
