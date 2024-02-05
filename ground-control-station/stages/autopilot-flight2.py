from pymavlink import mavutil
import time
import math

def get_location_metres(original_location, dNorth, dEast, altitude):
    """
    Returns a LocationGlobal object containing the latitude/longitude `dNorth` and `dEast` metres from the 
    specified `original_location`. The altitude is specified separately.
    """
    earth_radius = 6378137.0  # Radius of "spherical" earth
    # Coordinate offsets in radians
    dLat = dNorth / earth_radius
    dLon = dEast / (earth_radius * math.cos(math.pi * original_location.lat / 180))

    # New position in decimal degrees
    newlat = original_location.lat + (dLat * 180 / math.pi)
    newlng = original_location.lng + (dLon * 180 / math.pi)
    return mavutil.mavlink.MAVLink_mission_item_message(
        master.target_system, master.target_component, 0, 
        mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT, 
        mavutil.mavlink.MAV_CMD_NAV_WAYPOINT, 
        2, 0, 0, 0, 0, 0, 
        newlat, newlng, altitude)

def generate_circular_path(center_location, radius, points, altitude):
    """
    Generates a list of waypoints in a circular path around the center_location.
    """
    waypoints = []
    for i in range(points):
        angle = math.radians(360 * (i / points))
        dNorth = radius * math.cos(angle)
        dEast = radius * math.sin(angle)
        waypoint = get_location_metres(center_location, dNorth, dEast, altitude)
        waypoints.append(waypoint)
    return waypoints

# Connect to the drone
connection_string = "udp:10.13.0.4:14550"
master = mavutil.mavlink_connection(connection_string)
master.wait_heartbeat()
print("Connected to drone")

# Define parameters for the circular path
radius = 5  # meters
points = 10  # number of waypoints in each circle
cruising_altitude = 2.75  # same altitude as the initial takeoff

# Get the current location as the center for the circle
center_location = master.location()

# Generate waypoints for the circular path
waypoints = generate_circular_path(center_location, radius, points, cruising_altitude)

# Loop to continuously send waypoints
try:
    while True:
        for i, waypoint in enumerate(waypoints):
            master.mav.send(waypoint)
            print(f"Waypoint {i+1}/{len(waypoints)} sent")
            time.sleep(1)  # Adjust as necessary
        print("One circle complete. Starting next circle.")

except KeyboardInterrupt:
    print("Cruising flight stopped by user.")
    # Add any cleanup or landing code here if desired

print("Cruising flight complete")