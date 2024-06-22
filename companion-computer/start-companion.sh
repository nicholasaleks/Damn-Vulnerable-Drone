#!/bin/bash
# Source the ROS environment
source /opt/ros/noetic/setup.bash

# Start the socat command in the background
socat pty,link=/dev/ttyUSB0,raw,echo=0 unix-connect:/sockets/socket.sock &

# Optional: sleep if necessary
sleep 5

# Echo starting message
echo "Starting Companion Computer..."

# Start the Python application
exec python3 /interface/app.py