from flask import Blueprint, jsonify, request
import socketio
from extensions import db
from models import TelemetryStatus, UdpDestination
import subprocess
from pymavlink import mavutil
import threading
import serial.tools.list_ports
from flask import render_template
from mavlink_connection import close_mavlink_connection

telemetry_bp = Blueprint('telemetry', __name__)

# Add flight-controller template html render endpoint
@telemetry_bp.route('/flight-controller')
def flight_controller():
    return render_template('flightController.html')

@telemetry_bp.route('/start-telemetry', methods=['POST'])
def start_telemetry():

    data = request.json
    serial_device = data.get('serial_device')
    baud_rate = data.get('baud_rate')
    enable_udp_server = data.get('enable_udp_server', False)
    udp_server_port = data.get('udp_server_port', 14550)
    enable_tcp_server = data.get('enable_tcp_server', False)
    tcp_server_port = 5760 if enable_tcp_server else 0
    enable_datastream_requests = data.get('enable_datastream_requests', False)
    enable_heartbeat = data.get('enable_heartbeat', False)
    enable_tlogs = data.get('enable_tlogs', False)

    try:
        # Build the mavlink-routerd command
        cmd = [
            'mavlink-routerd',
            '-r',
            '-l', '/var/log/mavlink-router',
            '-e', '127.0.0.1:14540',
            '--tcp-port', str(tcp_server_port),
            serial_device + ':' + str(baud_rate)
        ]

        if enable_tlogs:
            cmd.extend(['-T'])

        if enable_udp_server:
            cmd.extend(['-p', f'0.0.0.0:{udp_server_port}'])

        udp_destinations = UdpDestination.query.all()
        for destination in udp_destinations:
            cmd.extend(['-e', f"{destination.ip}:{destination.port}"])

        subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        # If a telemtery status record already exists, update it. Otherwise, create a new record.
        telemetry_status_record = TelemetryStatus.query.first()
        if telemetry_status_record:
            telemetry_status_record.status = "Connecting"
        else:
            telemetry_status_record = TelemetryStatus(status="Connecting")
        db.session.add(telemetry_status_record)
        db.session.commit()

        return jsonify({'status': 'Telemetry started', 'cmd': ' '.join(cmd)})
    except Exception as e:
        telemetry_status = "Not connected"
        return jsonify({'error': str(e)}), 500

@telemetry_bp.route('/stop-telemetry', methods=['POST'])
def stop_telemetry():
    global telemetry_status
    try:
        close_mavlink_connection()

        subprocess.run(["pkill", "-f", "mavlink-routerd"], check=True)

        # If a telemtery status record already exists, update it. Otherwise, create a new record.
        telemetry_status_record = TelemetryStatus.query.first()
        if telemetry_status_record:
            telemetry_status_record.status = "Not Connected"
        else:
            telemetry_status_record = TelemetryStatus(status="Not Connected")

        db.session.add(telemetry_status_record)
        db.session.commit()

        telemetry_status = "Not Connected"
        return jsonify({'status': 'Telemetry stopped'})
    except subprocess.CalledProcessError as e:
        return jsonify({'error': f'Failed to stop mavlink-routerd processes: {e}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@telemetry_bp.route('/telemetry-status', methods=['GET'])
def get_telemetry_status():
    telemetry_status = TelemetryStatus.query.first()

    # Double check status by checking for mavlink-routerd process, if process is running keep status as connected else update status to not connected
    if telemetry_status and telemetry_status.status == "Connected":
        try:
            subprocess.run(["pgrep", "-f", "mavlink-routerd"], check=True)
        except subprocess.CalledProcessError:
            telemetry_status.status = "Not Connected"
            db.session.commit()
    # else if find "Connecting" status in db, check for mavlink-routerd process, if process is not running update status to not connected
    elif telemetry_status and telemetry_status.status == "Connecting":
        try:
            subprocess.run(["pgrep", "-f", "mavlink-routerd"], check=True)
        except subprocess.CalledProcessError:
            telemetry_status.status = "Not Connected"
            db.session.commit()
    else:
        telemetry_status = TelemetryStatus(status="Not Connected")
        db.session.add(telemetry_status)
        db.session.commit()

    return jsonify({'isTelemetryRunning': telemetry_status.status})


@telemetry_bp.route('/serial-devices', methods=['GET'])
def get_serial_devices():
    try:
        ports = list(serial.tools.list_ports.comports())
        devices = [{'value': port.device, 'label': port.description if port.description != 'n/a' else port.device} for port in ports]
        return jsonify(devices)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@telemetry_bp.route('/baud-rates', methods=['GET'])
def get_baud_rates():
    baud_rates = [
        {'value': 9600, 'label': '9600'},
        {'value': 19200, 'label': '19200'},
        {'value': 38400, 'label': '38400'},
        {'value': 57600, 'label': '57600'},
        {'value': 115200, 'label': '115200'},
        {'value': 230400, 'label': '230400'},
        {'value': 460800, 'label': '460800'},
        {'value': 921600, 'label': '921600'}
    ]
    return jsonify(baud_rates)

@telemetry_bp.route('/mavlink-versions', methods=['GET'])
def get_mavlink_versions():
    mavlink_versions = [
        {'value': 1, 'label': '1.0'},
        {'value': 2, 'label': '2.0'},
        {'value': 3, 'label': '3.0'}
    ]
    return jsonify(mavlink_versions)

@telemetry_bp.route('/udp-destinations', methods=['GET'])
def get_udp_destinations():
    destinations = UdpDestination.query.all()
    return jsonify([{'ip': dest.ip, 'port': dest.port} for dest in destinations])

@telemetry_bp.route('/add-udp-destination', methods=['POST'])
def add_udp_destination():
    data = request.json
    ip = data.get('ip')
    port = data.get('port')
    new_destination = UdpDestination(ip=ip, port=port)
    db.session.add(new_destination)
    db.session.commit()
    return jsonify({"status": "UDP destination added"})