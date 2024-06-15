from pymavlink import mavutil
from flask_socketio import SocketIO, emit
import serial

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

def listen_to_mavlink():
    global mav_connection, telemetry_status
    packets_received = 0

    print("Listening to MAVLink messages")

    mav_connection = create_mavlink_connection()

    while True:
        if mav_connection:
            try:
                msg = mav_connection.recv_match(blocking=True)
                if msg:
                    packets_received += 1
                    vehicle_type = mav_connection.vehicle_type if hasattr(mav_connection, 'vehicle_type') else 'Unknown'
                    firmware_version = mav_connection.version if hasattr(mav_connection, 'version') else 'Unknown'
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