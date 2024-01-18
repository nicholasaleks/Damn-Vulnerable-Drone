#!/bin/bash

sudo rm -rf /sockets/socket.sock
sudo socat pty,link=/dev/ttyACM0,raw,echo=0 unix-listen:/sockets/socket.sock,reuseaddr,fork &

sleep 5

sudo chmod a+rw /dev/ttyACM0
sudo chmod a+rw /sockets/socket.sock
echo 'Initializing Flight Controller...'
#Tools/autotest/sim_vehicle.py --vehicle $VEHICLE -I $INSTANCE --custom-location=$LAT,$LON,$ALT,$DIR -w --frame $MODEL --no-rebuild --no-mavproxy --speedup $SPEEDUP --sim-address=10.13.0.5 -A '--uartA=uart:/dev/ttyACM0:57600'
#Tools/autotest/sim_vehicle.py -v ArduCopter -f gazebo-iris --no-mavproxy -A '--uartA=uart:/dev/ttyACM0:57600 --sim-address=10.13.0.5 --out=udp:10.13.0.5:14550'

#Tools/autotest/sim_vehicle.py -v ArduCopter -f gazebo-iris --no-rebuild --no-mavproxy --sim-address=10.13.0.5 -A '--uartA=uart:/dev/ttyACM0:57600'



#Tools/autotest/sim_vehicle.py --vehicle $VEHICLE -I $INSTANCE --custom-location=$LAT,$LON,$ALT,$DIR -w --frame $MODEL --no-rebuild --no-mavproxy --speedup $SPEEDUP --sim-address=10.13.0.5 -A '--out=udp:10.13.0.5:14550 --uartA=uart:/dev/ttyACM0:57600'



tail -f /dev/null