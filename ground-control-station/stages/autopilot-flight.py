from pymavlink import mavutil
import time

def read_waypoints(filename):
    waypoints = []
    with open(filename, 'r') as file:
        for line in file:
            lat, lon, alt = map(float, line.strip().split(','))
            waypoints.append((lat, lon, alt))
    return waypoints

# Connect to the drone
connection_string = "udp:0.0.0.0:14550"  # Replace with your connection string
master = mavutil.mavlink_connection(connection_string)
master.wait_heartbeat()
print("Connected to drone")

# Read waypoints from file
waypoints = read_waypoints('/missions/waypoints_circle.txt')

# Start mission upload
master.waypoint_clear_all_send()
master.mav.mission_count_send(master.target_system, master.target_component, len(waypoints))

# Upload waypoints
for i, (lat, lon, alt) in enumerate(waypoints):
    msg = master.recv_match(type=['MISSION_REQUEST'], blocking=True)
    if msg is not None and msg.seq == i:
        master.mav.mission_item_int_send(
            master.target_system,
            master.target_component,
            i,
            mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT_INT,
            mavutil.mavlink.MAV_CMD_NAV_WAYPOINT,
            0, 0, 0, 0, 0, 0,
            int(lat * 1e7), int(lon * 1e7), alt
        )

# Check for mission acceptance
ack_msg = master.recv_match(type=['MISSION_ACK'], blocking=True)
if ack_msg is not None and ack_msg.type == mavutil.mavlink.MAV_MISSION_ACCEPTED:
    print("Mission uploaded successfully")
    # Proceed to set AUTO mode
else:
    print("Mission upload failed")

# Switch to AUTO mode
master.set_mode_auto()
print("AUTO mode set, mission started")

