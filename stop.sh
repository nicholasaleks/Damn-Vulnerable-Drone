#!/bin/bash

# Stop Damn Vulnerable Drone simulator

if [ "$EUID" -ne 0 ]; then
    echo "This script must be run with sudo privileges."
    echo "Please run it again with 'sudo ./stop.sh'"
    exit 1
fi

LOG_FILE="dvd.log"

{
    echo "[+] Stopping Damn Vulnerable Drone Lab Environment - $(date)"

    # Stop Docker Compose services
    echo "[+] Stopping Docker Compose services..."
    docker compose down

    # Remove virtual wifi interfaces
    echo "[+] Removing virtual wifi interfaces..."
    sudo iw dev wlan0 del
    sudo iw dev wlan1 del
    sudo iw dev wlan2 del

    # Unload mac80211_hwsim kernel module
    echo "[+] Unloading kernel module mac80211_hwsim..."
    sudo modprobe -r mac80211_hwsim

    # Reloading Network
    sudo service networking start
    sudo service NetworkManager start

    echo "[+] Damn Vulnerable Drone Lab Environment stopped."

} |& tee -a "$LOG_FILE"