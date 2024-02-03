from pymavlink import mavutil
import time

def wait_for_mode(master, mode):
    while True:
        msgs = master.recv_match(blocking=True)
        if msgs is not None and msgs.get_type() == 'HEARTBEAT' and msgs.custom_mode == mode:
            break
        time.sleep(0.1)

def is_armed(heartbeat):
    # Check if the base_mode has the MAV_STATE_STANDBY flag set
    return (heartbeat.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED) != 0

# Create a connection to the drone
connection_string = "udp:10.13.0.4:14550"
master = mavutil.mavlink_connection(connection_string)

# Wait for the first heartbeat
master.wait_heartbeat()
print("Heartbeat from system (system %u component %u)" % (master.target_system, master.target_component))

# Change to GUIDED mode
master.mav.set_mode_send(master.target_system, mavutil.mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED, mavutil.mavlink.COPTER_MODE_GUIDED)
wait_for_mode(master, mavutil.mavlink.COPTER_MODE_GUIDED)
print("GUIDED mode set")

# Arm the drone
master.arducopter_arm()
print("Arming motors")

# Wait for the drone to be armed with a timeout
arming_timeout = 10  # seconds
start_time = time.time()
while True:
    if time.time() - start_time > arming_timeout:
        print("Arming timeout reached")
        break

    # Fetching new messages
    heartbeat = master.recv_match(type='HEARTBEAT', blocking=True)
    if heartbeat is not None and is_armed(heartbeat):
        print("Drone is armed")
        break

if is_armed(heartbeat):
    # Takeoff command
    master.mav.command_long_send(
        master.target_system, master.target_component,
        mavutil.mavlink.MAV_CMD_NAV_TAKEOFF,
        0, 0, 0, 0, 0, 0, 0, 2.75)
    print("Takeoff command sent")

    # Monitoring the takeoff
    start_time = time.time()
    while time.time() - start_time < 20:
        time.sleep(1)
        print("Flying...")

    print("Takeoff complete")
else:
    print("Failed to arm motors within timeout")
