#!/bin/bash

# Start the Docker lab environment

if [ "$EUID" -ne 0 ]; then
    echo "This script must be run with sudo privileges."
    echo "Please run it again with 'sudo ./install-ubuntu.sh'"
    exit 1
fi

apt install net-tools iw make g++ libnl-3-dev libnl-genl-3-dev -y

# Install vwifi in a subshell
(
    vwifi-server -v

    # Check the exit status
    if [ $? -ne 0 ]; then
        cd ~
        git clone https://github.com/Raizo62/vwifi.git
        cd ~/vwifi
        makemodprobe mac80211_hwsim radios=
        make tools
        make install
    fi
)

LOG_FILE="dvd.log"

{
    # Print current time
    echo "Starting Docker Lab Environment - $(date)"

    # Load necessary kernel modules
    echo "Loading kernel modules..."
    sudo modprobe mac80211_hwsim radios=0

    # Start vwifi server
    echo "Starting vwifi server..."
    vwifi-server &

    # Add vwifi interfaces
    echo "Adding vwifi interfaces..."
    sudo vwifi-add-interfaces 3

    # Start Docker Compose
    echo "Starting Docker Compose..."
    docker compose up --build &

    # Wait for Docker containers to start up
    # Check for Docker containers readiness
    MAX_RETRIES=60
    RETRY_INTERVAL=6
    RETRY_COUNT=0

    while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
        echo "Checking if Docker containers are ready (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)..."
        if docker ps | grep -q 'companion-computer' && docker ps | grep -q 'ground-control-station'; then
            echo "Docker containers are ready."
            break
        else
            ((RETRY_COUNT++))
            sleep $RETRY_INTERVAL
        fi
    done

    if [[ $RETRY_COUNT -eq $MAX_RETRIES ]]; then
        echo "Docker containers did not become ready in time."
        exit 1
    fi

    # Determine Docker bridge network IP address
    DOCKER_BRIDGE_IP=$(ip -4 addr show docker0 | grep -Po 'inet \K[\d.]+')
    echo "Docker bridge network IP: $DOCKER_BRIDGE_IP"

    # Get PIDs of Docker containers and move interfaces
    echo "Moving interfaces to Docker containers..."
    CC_PID=$(docker inspect --format '{{ .State.Pid }}' companion-computer)
    
    sudo iw phy phy1 set netns $CC_PID

    GCS_PID=$(docker inspect --format '{{ .State.Pid }}' ground-control-station)
    
    sudo iw phy phy2 set netns $GCS_PID

    # CC vwifi-client connect
    echo "Connecting Companion Computer vwifi-client..."
    docker exec -d companion-computer vwifi-client $DOCKER_BRIDGE_IP

    # GCS vwifi-client connect
    echo "Connecting Ground Control Station vwifi-client..."
    docker exec -d ground-control-station vwifi-client $DOCKER_BRIDGE_IP

    # CC Access Point Setup
    echo "Setting up Access Point on Companion Computer..."
    
    # Execute multiple commands in the companion-computer container
    docker exec companion-computer sh -c '
    # Set IP address for wlan1
    ip a a 192.168.13.1/24 dev wlan1 &&
    echo "IP address set for wlan1." ||
    { echo "Failed to set IP address for wlan1."; exit 1; }

    # Create dhcpd.leases file if it doesnt exist
    if [ ! -f /var/lib/dhcp/dhcpd.leases ]; then
        touch /var/lib/dhcp/dhcpd.leases &&
        echo "Created dhcpd.leases file." ||
        { echo "Failed to create dhcpd.leases file."; exit 1; }
    fi

    # Set permissions for dhcpd.leases file
    chmod 644 /var/lib/dhcp/dhcpd.leases &&
    echo "Permissions set for dhcpd.leases." ||
    { echo "Failed to set permissions for dhcpd.leases."; exit 1; }

    # Start hostapd in the background with nohup
    nohup hostapd /etc/hostapd.conf > /var/log/hostapd.log 2>&1 &
    echo "hostapd started."

    # Pause for a few seconds to allow hostapd to initialize
    sleep 5

    # Clean up previous dhcpd PID file if it exists
    rm /var/run/dhcpd.pid

    service isc-dhcp-server start
    service dnsmasq start
    service isc-dhcp-server stop
    service dnsmasq stop

    # Start dhcpd in debug mode
    dhcpd -d &
    echo "dhcpd started in debug mode."
    '
    
    # Ground Control Station Access Point Setup
    echo "Setting up Ground Control Station Access Point..."

    # Execute commands in the ground-control-station container
    docker exec ground-control-station sh -c "
        sudo wpa_supplicant -B -i wlan2 -c /etc/wpa_supplicant/wpa_supplicant.conf -D nl80211;
        sudo dhclient wlan2 &
    "

    # Capture vwifi status
    echo "Capturing vwifi status..."
    vwifi-ctrl ls

    echo "Docker Lab Environment setup complete."

} |& tee "$LOG_FILE"

