#!/bin/bash

if [ "$EUID" -ne 0 ]; then
    echo "This script must be run with sudo privileges."
    echo "Please run it again with 'sudo ./start.sh'"
    exit 1
fi

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

IP_ADDR=$(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1 | head -n 1)

echo ""
echo "Ubuntu Server Installation Complete"
echo "IP Address: $IP_ADDR"
echo "--------------------------------------------"
echo "On Kali Run: 'sudo ./kali-install.sh  $IP_ADDR'"
