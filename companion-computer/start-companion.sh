#!/bin/bash
# Source the ROS environment (Humble on this branch)
source /opt/ros/humble/setup.bash

# Start the socat command in the background
socat pty,link=/dev/ttyUSB0,raw,echo=0 unix-connect:/sockets/socket.sock &

# Optional: sleep if necessary
sleep 5

# Echo starting message
echo "Starting Companion Computer..."

# Start RTSP Stream interface/rtsp.py
python3 /interface/rtsp.py &

# ROS 2 <-> ArduPilot bridge (mavros, APM profile).
#   * fcu_url binds local 14560 with NO fixed remote (udp://:14560@). The
#     router's `-e 127.0.0.1:14560` endpoint (seeded as a UdpDestination in
#     app.py) pushes FCU telemetry here; mavros learns the router's address
#     from those packets and sends commands back through the same endpoint, so
#     the path is fully bidirectional (arming/setpoints work, not just reads).
#     Using a fixed remote (e.g. @127.0.0.1:14550) was wrong: Stage 1 starts
#     the router with the UDP *server* disabled, so nothing listens on 14550.
#   * config_yaml overrides only the MAVLink identities: system_id:=2 (NOT 1 —
#     the autopilot owns sysid 1 and reusing it corrupts the Flask listener's
#     per-sysid type cache; see conf/mavros/apm_config.yaml).
#   * Stays harmlessly disconnected until telemetry is started from the web UI
#     (mavlink-routerd is on-demand).
ros2 launch mavros apm.launch \
    fcu_url:="udp://:14560@" \
    config_yaml:="/etc/mavros/apm_config.yaml" \
    > /var/log/mavros.log 2>&1 &

# Start the Python application
exec python3 /interface/app.py