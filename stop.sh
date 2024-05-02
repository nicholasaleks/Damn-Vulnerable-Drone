#!/bin/bash

# Stop Damn Vulnerable Drone simulator

if [ "$EUID" -ne 0 ]; then
    echo "This script must be run with sudo privileges."
    echo "Please run it again with 'sudo ./stop.sh'"
    exit 1
fi


echo "[+] Stopping Damn Vulnerable Drone Lab Environment - $(date)"

# Check if a card is virtual
check_virtual_interface() {
    interface=$1
    phy_device=$(readlink -f "/sys/class/net/$interface/device/ieee80211" 2>/dev/null)
    if [[ -n "$phy_device" && "$phy_device" =~ "mac80211_hwsim" ]]; then
        return 1
    else
        return 0
    fi
}

# Clean up
clean_up_and_setup() {
    echo -e "${CYAN}[+] Running System clean up...${NC}"

    # Stop Docker Compose services
    echo "[+] Stopping Docker Compose services..."
    docker compose down

    # Function to delete wireless interfaces
    delete_wireless_interface() {
        sudo iw dev "$1" del >/dev/null 2>&1
    }

    # Get a list of all wireless interfaces
    wireless_interfaces=$(iw dev | awk '$1=="Interface"{print $2}' | tac)

    # Iterate over each wireless interface and delete if check_virtual_interface returns 1
    for interface in $wireless_interfaces; do
        if ! check_virtual_interface "$interface"; then
            echo "Removing $interface..."
            delete_wireless_interface "$interface"
        fi
    done

    # Start services
    sudo modprobe -r mac80211_hwsim
    sudo service networking start
    sudo service NetworkManager start

    echo -e "${CYAN}[+] System Ready...${NC}"
}

clean_up_and_setup