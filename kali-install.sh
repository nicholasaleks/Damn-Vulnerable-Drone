#!/bin/bash

if [ "$EUID" -ne 0 ]; then
    echo "This script must be run with sudo privileges."
    echo "Please run it again with 'sudo ./start.sh <IP_ADDRESS>'"
    exit 1
fi

if [ $# -eq 0 ]; then
    echo "Usage: sudo $0 <IP_ADDRESS>"
    exit 1
fi

# Store the first argument in a variable
IP_ADDR=$1

apt install net-tools make g++ libnl-3-dev libnl-genl-3-dev -y

# Install vwifi in a subshell
(
    vwifi-server -v

    # Check the exit status
    if [ $? -ne 0 ]; then
        cd ~
        git clone https://github.com/Raizo62/vwifi.git
        cd ~/vwifi
        make
        make tools
        make install
    fi
)

modprobe mac80211_hwsim radios=0

# Check if wlan0 exists
# Check if wlan0 exists
if ip link show wlan0 > /dev/null 2>&1; then
    echo "Interface wlan0 exists."
else
    echo "Interface wlan0 does not exist. Creating vwifi virtual wlan0"
    sudo vwifi-add-interfaces 1 0a:0b:0c:04:04
fi