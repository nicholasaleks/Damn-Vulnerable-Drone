#!/bin/bash

# Remove existing socket
sudo rm -rf /sockets/socket.sock

# Set up socat for serial communication
sudo socat pty,link=/dev/ttyACM0,raw,echo=0 unix-listen:/sockets/socket.sock,reuseaddr,fork &

# Allow some time for socat to set up
sleep 15

# Adjust permissions for the serial port and socket
sudo chmod a+rw /dev/ttyACM0
sudo chmod a+rw /sockets/socket.sock
echo 'Flight Controller Build Complete.'

# Keep the script running (or handle post-build actions here)
tail -f /dev/null