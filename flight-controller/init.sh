#!/bin/bash

sudo rm -rf /sockets/socket.sock
sudo socat pty,link=/dev/ttyACM0,raw,echo=0 unix-listen:/sockets/socket.sock,reuseaddr,fork &

sleep 15

sudo chmod a+rw /dev/ttyACM0
sudo chmod a+rw /sockets/socket.sock
echo 'Initializing Flight Controller...'

Tools/autotest/sim_vehicle.py -v ArduCopter -f gazebo-iris --no-mavproxy --sim-address=10.13.0.5 -A '--uartA=uart:/dev/ttyACM0:57600'
#tail -f /dev/null