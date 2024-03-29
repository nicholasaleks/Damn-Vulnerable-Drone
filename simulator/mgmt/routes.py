from flask import Blueprint, render_template, url_for, redirect
import docker
from docker.errors import NotFound
from models import Stage
from extensions import db
from models import Stage
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

main = Blueprint('main', __name__)

@main.route('/')
def index():
    stages = Stage.query.all()
    return render_template('pages/simulator.html', stages=stages, current_page='home')

@main.route('/reset', methods=['POST'])
def reset_world():
    print('Resetting World Simulation...')
    stage1 = Stage.query.filter_by(name='Stage 1').first()
    stage1.status = 'Enabled'
    stage2 = Stage.query.filter_by(name='Stage 2').first()
    stage2.status = 'Disabled'
    stage3 = Stage.query.filter_by(name='Stage 3').first()
    stage3.status = 'Disabled'
    stage4 = Stage.query.filter_by(name='Stage 4').first()
    stage4.status = 'Disabled'
    stage5 = Stage.query.filter_by(name='Stage 5').first()
    stage5.status = 'Disabled'
    stage6 = Stage.query.filter_by(name='Stage 6').first()
    stage6.status = 'Disabled'
    db.session.commit()

    # Reset Flight Controller
    ########################################################
    client = docker.from_env()
    container = client.containers.get('flight-controller')
    kill_command_1 = "pkill -f sim_vehicle.py"
    container.exec_run(kill_command_1)
    kill_command_2 = "pkill -f arducopter"
    container.exec_run(kill_command_2)

    output = 'Reset'
    return render_template('pages/simulator.html', output=output, current_page='home')

@main.route('/stage1', methods=['POST', ])
def stage1():
    """
    Stage 1: Initial Boot
    """
    stage1 = Stage.query.filter_by(name='Stage 1').first()
    stage2 = Stage.query.filter_by(name='Stage 2').first()
    stage1.status = 'Active'
    stage2.status = 'Enabled'
    db.session.commit()

    client = docker.from_env()
    container = client.containers.get('flight-controller')
    logging.info('Triggering Stage 1...')
    command = "Tools/autotest/sim_vehicle.py -v ArduCopter -f gazebo-iris --no-rebuild --no-mavproxy --sim-address=10.13.0.5 -A '--serial0=uart:/dev/ttyACM0:57600'"
    
    # Log the command before executing it
    logging.info("Executing command: %s", command)

    # Execute the command and capture the output in real-time
    output_stream = []
    for line in container.exec_run(command, stream=True):
        if isinstance(line, bytes):
            line = line.decode()
        logging.info("Command output: %s", line)
        output_stream.append(line)
    
    return render_template('pages/simulator.html', output=output_stream, current_page='home')

@main.route('/stage2', methods=['POST', ])
def stage2():
    """
    Stage 2: Arm & Takeoff
    """
    stage2 = Stage.query.filter_by(name='Stage 2').first()
    stage3 = Stage.query.filter_by(name='Stage 3').first()
    stage2.status = 'Active'
    stage3.status = 'Enabled'
    db.session.commit()

    client = docker.from_env()
    container = client.containers.get('ground-control-station')
    logging.info('Triggering Stage 2...')
    command = "python3 /arm-and-takeoff.py"
    
    # Log the command before executing it
    logging.info("Executing command: %s", command)

    # Execute the command and capture the output in real-time
    try:
        exit_code, output = container.exec_run(command, stream=False)
        output = output.decode() if isinstance(output, bytes) else output
        logging.info("Command output: %s", output)
    except Exception as e:
        logging.error("Container execution error: %s", str(e))
        output = str(e)
    
    return render_template('pages/simulator.html', output=output, current_page='home')


@main.route('/stage3', methods=['POST', ])
def stage3():
    """
    Stage 3: Autopilot Flight
    """
    stage3 = Stage.query.filter_by(name='Stage 3').first()
    stage4 = Stage.query.filter_by(name='Stage 4').first()
    stage3.status = 'Active'
    stage4.status = 'Enabled'
    db.session.commit()

    client = docker.from_env()
    container = client.containers.get('ground-control-station')
    logging.info('Triggering Stage 3...')
    command = "python3 /autopilot-flight.py"
    
    # Log the command before executing it
    logging.info("Executing command: %s", command)

    # Execute the command and capture the output in real-time
    try:
        exit_code, output = container.exec_run(command, stream=False)
        output = output.decode() if isinstance(output, bytes) else output
        logging.info("Command output: %s", output)
    except Exception as e:
        logging.error("Container execution error: %s", str(e))
        output = str(e)
    
    return render_template('pages/simulator.html', output=output, current_page='home')

@main.route('/stage4', methods=['POST', ])
def stage4():
    """
    Stage 4: Return to Land
    """
    stage4 = Stage.query.filter_by(name='Stage 4').first()
    stage5 = Stage.query.filter_by(name='Stage 5').first()
    stage4.status = 'Active'
    stage5.status = 'Enabled'
    db.session.commit()

    client = docker.from_env()
    container = client.containers.get('ground-control-station')
    logging.info('Triggering Stage 4...')
    command = "python3 /return-to-land.py"
    
    # Log the command before executing it
    logging.info("Executing command: %s", command)

    # Execute the command and capture the output in real-time
    try:
        exit_code, output = container.exec_run(command, stream=False)
        output = output.decode() if isinstance(output, bytes) else output
        logging.info("Command output: %s", output)
    except Exception as e:
        logging.error("Container execution error: %s", str(e))
        output = str(e)
    
    return render_template('pages/simulator.html', output=output, current_page='home')

@main.route('/stage5', methods=['POST', ])
def stage5():
    """
    Stage 5: Post Flight Analysis
    """
    stage5 = Stage.query.filter_by(name='Stage 5').first()
    stage5.status = 'Active'
    db.session.commit()

    client = docker.from_env()
    container = client.containers.get('ground-control-station')
    logging.info('Triggering Stage 5...')
    command = "python3 /post-flight-analysis.py"
    
    # Log the command before executing it
    logging.info("Executing command: %s", command)

    # Execute the command and capture the output in real-time
    try:
        exit_code, output = container.exec_run(command, stream=False)
        output = output.decode() if isinstance(output, bytes) else output
        logging.info("Command output: %s", output)
    except Exception as e:
        logging.error("Container execution error: %s", str(e))
        output = str(e)
    
    return render_template('pages/simulator.html', output=output, current_page='home')


###############################
# Getting Started
###############################
@main.route('/getting-started')
def getting_started():
    return render_template('pages/getting-started.html', section=None, current_page='getting-started')

###############################
# Simulation Guide
###############################

@main.route('/guide/')
def guide_index():
    return render_template('pages/guide/index.html', section='guide')

@main.route('/guide/user-interface')
def guide_ui():
    return render_template('pages/guide/user-interface.html', section='guide', current_page='user-interface')

@main.route('/guide/basic-operations')
def guide_basics():
    return render_template('pages/guide/basic-operations.html', section='guide', current_page='basic-operations')

@main.route('/guide/system-health-check')
def guide_health():
    return render_template('pages/guide/system-health-check.html', section='guide', current_page='system-health-check')

@main.route('/guide/manual-testing')
def guide_manual_testing():
    return render_template('pages/guide/manual-testing.html', section='guide', current_page='manual-testing')

@main.route('/guide/troubleshooting')
def guide_troubleshooting():
    return render_template('pages/guide/troubleshooting.html', section='guide', current_page='troubleshooting')


###############################
# Learning Resouces
###############################

@main.route('/learning/')
def learning_index():
    return render_template('pages/learning/index.html', section='learning')

@main.route('/learning/aircrack-ng')
def learning_aircrackng():
    return render_template('pages/learning/aircrack-ng.html', section='learning', current_page='aircrack-ng')

@main.route('/learning/wireshark')
def learning_wireshark():
    return render_template('pages/learning/wireshark.html', section='learning', current_page='wireshark')

@main.route('/learning/mavlink')
def learning_mavlink():
    return render_template('pages/learning/mavlink.html', section='learning', current_page='mavlink')

@main.route('/learning/mavproxy')
def learning_mavproxy():
    return render_template('pages/learning/mavproxy.html', section='learning', current_page='mavproxy')

@main.route('/learning/ardupilot')
def learning_ardupilot():
    return render_template('pages/learning/ardupilot.html', section='learning', current_page='ardupilot')

@main.route('/learning/arducopter')
def learning_arducopter():
    return render_template('pages/learning/arducopter.html', section='learning', current_page='arducopter')

@main.route('/learning/sitl')
def learning_sitl():
    return render_template('pages/learning/sitl.html', section='learning', current_page='sitl')

@main.route('/learning/gazebo')
def learning_gazebo():
    return render_template('pages/learning/gazebo.html', section='learning', current_page='gazebo')

@main.route('/learning/swarmsec')
def learning_swarmsec():
    return render_template('pages/learning/swarmsec.html', section='learning', current_page='swarmsec')


###############################
# Attack Scenarios & Solutions
###############################
@main.route('/attacks/all')
@main.route('/attacks')
def attacks_index():
    return render_template('pages/attacks/list.html', section='attacks', sub_section='', current_page='attacks')

# RECON

@main.route('/attacks/recon')
def attacks_recon():
    return render_template('pages/attacks/recon/index.html', section='attacks', sub_section='recon')

@main.route('/attacks/recon/drone-discovery')
def attacks_recon_drone_discovery():
    return render_template('pages/attacks/recon/drone-discovery.html', section='attacks', sub_section='recon', current_page='drone-discovery')

@main.route('/attacks/recon/packet-sniffing')
def attacks_recon_packet_sniffing():
    return render_template('pages/attacks/recon/packet-sniffing.html', section='attacks', sub_section='recon', current_page='packet-sniffing')

@main.route('/attacks/recon/protocol-fingerprinting')
def attacks_recon_protocol_fingerprinting():
    return render_template('pages/attacks/recon/protocol-fingerprinting.html', section='attacks', sub_section='recon', current_page='protocol-fingerprinting')

@main.route('/attacks/recon/gps-telemetry-analysis')
def attacks_recon_gps_telemetry_analysis():
    return render_template('pages/attacks/recon/gps-telemetry-analysis.html', section='attacks', sub_section='recon', current_page='gps-telemetry-analysis')

@main.route('/attacks/recon/companion-computer-discovery')
def attacks_recon_companion_computer_discovery():
    return render_template('pages/attacks/recon/companion-computer-discovery.html', section='attacks', sub_section='recon', current_page='companion-computer-discovery')

@main.route('/attacks/recon/ground-control-station-discovery')
def attacks_recon_ground_control_station_discovery():
    return render_template('pages/attacks/recon/ground-control-station-discovery.html', section='attacks', sub_section='recon', current_page='ground-control-station-discovery')


# WIRELESS

@main.route('/attacks/wireless')
def attacks_wireless():
    return render_template('pages/attacks/wireless/index.html', section='attacks', sub_section='wireless')

@main.route('/attacks/wireless/wifi-authentication-cracking')
def attacks_wireless_wifi_authentication_cracking():
    return render_template('pages/attacks/wireless/wifi-authentication-cracking.html', section='attacks', sub_section='wireless', current_page='wifi-authentication-cracking')

@main.route('/attacks/wireless/evil-twin-drone')
def attacks_wireless_evil_twin_drone():
    return render_template('pages/attacks/wireless/evil-twin-drone.html', section='attacks', sub_section='wireless', current_page='evil-twin-drone')

@main.route('/attacks/wireless/wireless-deauthentication')
def attacks_wireless_wireless_deauthentication():
    return render_template('pages/attacks/wireless/wireless-deauthentication.html', section='attacks', sub_section='wireless', current_page='wireless-deauthentication')

@main.route('/attacks/wireless/wireless-client-data-leakage')
def attacks_wireless_wireless_client_data_leakage():
    return render_template('pages/attacks/wireless/wireless-client-data-leakage.html', section='attacks', sub_section='wireless', current_page='wireless-client-data-leakage')

# PROTOCOL TAMPERING

@main.route('/attacks/tampering')
def attacks_tampering():
    return render_template('pages/attacks/tampering/index.html', section='attacks', sub_section='tampering')

@main.route('/attacks/tampering/telemetry-spoofing')
def attacks_tampering_telemetry_spoofing():
    return render_template('pages/attacks/tampering/telemetry-spoofing.html', section='attacks', sub_section='tampering', current_page='telemetry-spoofing')

@main.route('/attacks/tampering/flight-mode-spoofing')
def attacks_tampering_flight_mode_spoofing():
    return render_template('pages/attacks/tampering/flight-mode-spoofing.html', section='attacks', sub_section='tampering', current_page='flight-mode-spoofing')

@main.route('/attacks/tampering/drone-state-spoofing')
def attacks_tampering_drone_state_spoofing():
    return render_template('pages/attacks/tampering/drone-state-spoofing.html', section='attacks', sub_section='tampering', current_page='drone-state-spoofing')

@main.route('/attacks/tampering/gps-spoofing')
def attacks_tampering_gps_spoofing():
    return render_template('pages/attacks/tampering/gps-spoofing.html', section='attacks', sub_section='tampering', current_page='gps-spoofing')


# DENAIL OF SERVICE

@main.route('/attacks/dos')
def attacks_dos():
    return render_template('pages/attacks/dos/index.html', section='attacks', sub_section='dos')

@main.route('/attacks/dos/battery-drain-attack')
def attacks_dos_battery_drain_attack():
    return render_template('pages/attacks/dos/battery-drain-attack.html', section='attacks', sub_section='dos', current_page='battery-drain-attack')

@main.route('/attacks/dos/communication-link-flooding')
def attacks_dos_communication_link_flooding():
    return render_template('pages/attacks/dos/communication-link-flooding.html', section='attacks', sub_section='dos', current_page='communication-link-flooding')

@main.route('/attacks/dos/denial-of-takeoff')
def attacks_dos_denial_of_takeoff():
    return render_template('pages/attacks/dos/denial-of-takeoff.html', section='attacks', sub_section='dos', current_page='denial-of-takeoff')

@main.route('/attacks/dos/geo-squeezing')
def attacks_dos_geo_squeezing():
    return render_template('pages/attacks/dos/geo-squeezing.html', section='attacks', sub_section='dos', current_page='geo-squeezing')

@main.route('/attacks/dos/altitude-limiting')
def attacks_dos_altitude_limiting():
    return render_template('pages/attacks/dos/altitude-limiting.html', section='attacks', sub_section='dos', current_page='altitude-limiting')

@main.route('/attacks/dos/camera-feed-disruption')
def attacks_dos_camera_feed_disruption():
    return render_template('pages/attacks/dos/camera-feed-disruption.html', section='attacks', sub_section='dos', current_page='camera-feed-disruption')

@main.route('/attacks/dos/gps-jamming')
def attacks_dos_gps_jamming():
    return render_template('pages/attacks/dos/gps-jamming.html', section='attacks', sub_section='dos', current_page='gps-jamming')


# INJECTION & HIJACKING

@main.route('/attacks/injection')
def attacks_injection():
    return render_template('pages/attacks/injection/index.html', section='attacks', sub_section='injection')

@main.route('/attacks/injection/mavlink-command-injection')
def attacks_injection_mavlink_command_injection():
    return render_template('pages/attacks/injection/mavlink-command-injection.html', section='attacks', sub_section='injection', current_page='mavlink-command-injection')

@main.route('/attacks/injection/camera-gimbal-command-injection')
def attacks_injection_camera_gimbal_command_injection():
    return render_template('pages/attacks/injection/camera-gimbal-command-injection.html', section='attacks', sub_section='injection', current_page='camera-gimbal-command-injection')

@main.route('/attacks/injection/waypoint-injection')
def attacks_injection_waypoint_injection():
    return render_template('pages/attacks/injection/waypoint-injection.html', section='attacks', sub_section='injection', current_page='waypoint-injection')

@main.route('/attacks/injection/sensor-data-injection')
def attacks_injection_sensor_data_injection():
    return render_template('pages/attacks/injection/sensor-data-injection.html', section='attacks', sub_section='injection', current_page='sensor-data-injection')

@main.route('/attacks/injection/flight-mode-injection')
def attacks_injection_flight_mode_injection():
    return render_template('pages/attacks/injection/flight-mode-injection.html', section='attacks', sub_section='injection', current_page='flight-mode-injection')

@main.route('/attacks/injection/ground-control-station-hijacking')
def attacks_injection_ground_control_station_hijacking():
    return render_template('pages/attacks/injection/ground-control-station-hijacking.html', section='attacks', sub_section='injection', current_page='ground-control-station-hijacking')

@main.route('/attacks/injection/companion-computer-explitation')
def attacks_injection_gps_jamming():
    return render_template('pages/attacks/injection/companion-computer-exploitation.html', section='attacks', sub_section='injection', current_page='companion-computer-exploitation')


# DATA EXFILTRATION

@main.route('/attacks/exfiltration')
def attacks_exfiltrationn():
    return render_template('pages/attacks/exfiltration/index.html', section='attacks', sub_section='exfiltration')

@main.route('/attacks/exfiltration/flight-log-collection')
def attacks_exfiltration_flight_log_collection():
    return render_template('pages/attacks/exfiltration/mavlink-command-injection.html', section='attacks', sub_section='exfiltration', current_page='flight-log-collection')

@main.route('/attacks/exfiltration/mission-plan-exfiltration')
def attacks_exfiltration_mission_plan_exfiltration():
    return render_template('pages/attacks/exfiltration/camera-gimbal-command-injection.html', section='attacks', sub_section='exfiltration', current_page='mission-plan-extraction')

@main.route('/attacks/exfiltration/ardupilot-parameter-collection')
def attacks_exfiltration_ardupilot_parameter_collection():
    return render_template('pages/attacks/exfiltration/ardupilot-parameter-collection.html', section='attacks', sub_section='exfiltration', current_page='ardupilot-parameter-collection')

@main.route('/attacks/exfiltration/ftp-eavesdropping')
def attacks_exfiltration_sensor_data_injection():
    return render_template('pages/attacks/exfiltration/ftp-eavesdropping.html', section='attacks', sub_section='exfiltration', current_page='ftp-eavesdropping')

@main.route('/attacks/exfiltration/camera-feed-eavesdropping')
def attacks_exfiltration_camera_feed_eavesdropping():
    return render_template('pages/attacks/exfiltration/camera_feed_eavesdropping.html', section='attacks', sub_section='exfiltration', current_page='camera-feed-eavesdropping')

# FIRMWARE ATTACKS

@main.route('/attacks/firmware')
def attacks_firmware():
    return render_template('pages/attacks/firmware/index.html', section='attacks', sub_section='firmware')

@main.route('/attacks/firmware/firmware-decompiling')
def attacks_firmware_firmware_decompiling():
    return render_template('pages/attacks/firmware/firmware-decompiling.html', section='attacks', sub_section='firmware', current_page='firmware-decompiling')

@main.route('/attacks/firmware/firmware-modding')
def attacks_firmware_firmware_modding():
    return render_template('pages/attacks/firmware/firmware-modding.html', section='attacks', sub_section='firmware', current_page='firmware-modding')


###############################
# Errors
###############################

@main.errorhandler(404)
def page_not_found(e):
    return render_template('pages/errors/404.html'), 404