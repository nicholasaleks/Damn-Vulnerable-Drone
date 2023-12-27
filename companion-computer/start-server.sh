#!/bin/bash

if [ "$EUID" -ne 0 ]; then
    echo "This script must be run with sudo privileges."
    echo "Please run it again with 'sudo ./start.sh'"
    exit 1
fi

# Check if wlan0 exists
if ip link show wlan0 > /dev/null 2>&1; then
    echo "Drone wlan0 exists."
else
    echo "Drone wlan0 does not exist. Creating vwifi virtual wlan0"
    sudo vwifi-add-interfaces 1 0a:0b:0c:03:02
fi

# Run vwifi-server if not already running
if ! pgrep -x "vwifi-server" > /dev/null; then
    vwifi-server & > /dev/null 2>&1
    echo "vwifi-server started."
else
    echo "vwifi-server is already running."
fi

# Run vwifi-client if not already running
if ! pgrep -x "vwifi-client" > /dev/null; then
    vwifi-client 127.0.0.1 & > /dev/null 2>&1
    echo "vwifi-client started."
else
    echo "vwifi-client is already running."
fi

# Setup Drone AP IP Address
ip a a 192.168.13.1/24 dev wlan0
service isc-dhcp-server start
hostapd /etc/hostapd.conf