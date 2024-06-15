from pymavlink import mavutil
from flask_socketio import SocketIO, emit
import serial
import time

mav_connection = None
socketio = None

def create_mavlink_connection():
    global mav_connection
    if mav_connection is None:
        mav_connection = mavutil.mavlink_connection('udp:0.0.0.0:14540')
        mav_connection.wait_heartbeat()
    return mav_connection

def close_mavlink_connection():
    global mav_connection
    if mav_connection:
        mav_connection.close()
        mav_connection = None

def get_vehicle_type_and_firmware():
    vehicle_type = 'Unknown'
    firmware_version = 'Unknown'

    # Request AUTOPILOT_VERSION
    mav_connection.mav.command_long_send(
        mav_connection.target_system, mav_connection.target_component,
        mavutil.mavlink.MAV_CMD_REQUEST_AUTOPILOT_CAPABILITIES,
        0, 1, 0, 0, 0, 0, 0, 0
    )

    start = time.time()
    while time.time() - start < 5:
        msg = mav_connection.recv_match(type='AUTOPILOT_VERSION', blocking=True, timeout=1)
        if msg:
            firmware_version = f"{msg.flight_sw_version >> 8 & 0xFF}.{msg.flight_sw_version >> 16 & 0xFF}.{msg.flight_sw_version >> 24 & 0xFF}"
            break

    # Request HEARTBEAT
    mav_connection.mav.heartbeat_send(mavutil.mavlink.MAV_TYPE_GENERIC, mavutil.mavlink.MAV_AUTOPILOT_GENERIC, 0, 0, 0)

    start = time.time()
    while time.time() - start < 5:
        msg = mav_connection.recv_match(type='HEARTBEAT', blocking=True, timeout=1)
        if msg:
            vehicle_type = mavutil.mavlink.enums['MAV_TYPE'][msg.type].name
            break

    return vehicle_type, firmware_version


def listen_to_mavlink():
    global mav_connection, telemetry_status
    packets_received = 0

    print("Listening to MAVLink messages")

    mav_connection = create_mavlink_connection()

    vehicle_type, firmware_version = get_vehicle_type_and_firmware()

    while True:
        if mav_connection:
            try:
                msg = mav_connection.recv_match(blocking=True)
                if msg:
                    packets_received += 1

                    telemetry_status = "Connected"

                    socketio.emit('telemetry_status', {
                        'status': telemetry_status,
                        'packets_received': packets_received,
                        'vehicle_type': vehicle_type,
                        'firmware_version': firmware_version
                    })
            except serial.serialutil.PortNotOpenError:
                print("Port not open error. Stopping telemetry.")
                telemetry_status = "Not connected"
                break
            except Exception as e:
                print(f"Error receiving MAVLink message: {e}")
                break

def initialize_socketio(socket_io_instance):
    global socketio
    socketio = socket_io_instance