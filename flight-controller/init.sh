#!/bin/bash

sudo rm -rf /sockets/socket.sock
sudo socat pty,link=/dev/ttyACM0,raw,echo=0 unix-listen:/sockets/socket.sock,reuseaddr,fork &

sleep 5

sudo chmod a+rw /dev/ttyACM0
sudo chmod a+rw /sockets/socket.sock
echo 'Initializing Flight Controller...'
Tools/autotest/sim_vehicle.py --vehicle $VEHICLE -I$INSTANCE --custom-location=$LAT,$LON,$ALT,$DIR -w --frame $MODEL --no-rebuild --no-mavproxy --speedup $SPEEDUP -A '--uartA=uart:/dev/ttyACM0:57600'