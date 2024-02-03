from pymavlink import mavutil
import time
import math

def get_location_metres(original_location, dNorth, dEast):
    """
    Returns a LocationGlobal object containing the latitude/longitude `dNorth` and `dEast` metres from the 
    specified `original_location`. The returned LocationGlobal has the same `alt` value as `original_location`.
    """
    earth_radius = 63  # Radius of "spherical" earth
    # Coordinate offsets in radians
    dLat = dNorth / earth_radius
    dLon = dEast / (earth_radius * math.cos(math.pi * original_location.lat / 180))

    # New position in decimal degrees
    newlat = original_location.lat + (dLat * 180 / math.pi)
    newlon = original_location.lng + (dLon * 180 / math.pi)
    return mavutil.mavlink.MAVLink_mission_item_message(master.target_system, master.target_component, 0, 
                                                        mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT, 
                                                        mavutil.mavlink.MAV_CMD_NAV_WAYPOINT, 
                                                        2, 0, 0, 0, 0, 0, 
                                                        newlat, newlon, original_location.alt)

# Connect to the drone
connection_string = "udp:10.13.0.4:14550"
master = mavutil.mavlink_connection(connection_string)
master.wait_heartbeat()
print("Connected to drone")

# Wait for takeoff to complete
time.sleep(5)
print("Takeoff complete")

# Define the parameters for the circle
radius = 10  # meters
points = 20  # number of waypoints
center_location = master.location()

# Calculate waypoints around the circle
waypoints = []
for i in range(points):
    angle = math.radians(360 * (i / points))
    dNorth = radius * math.cos(angle)
    dEast = radius * math.sin(angle)
    waypoint = get_location_metres(center_location, dNorth, dEast)
    waypoints.append(waypoint)

# Send waypoints to drone
for i, waypoint in enumerate(waypoints):
    master.mav.send(waypoint)
    print(f"Waypoint {i+1}/{points} sent")
    time.sleep(1)  # Adjust as necessary

print("All waypoints sent")

# Wait for the drone to complete the circle
# Adjust the time as needed based on your drone's speed and the size of the circle
time.sleep(points * 10) 

print("Circle flight complete")
