#!/bin/bash

# Start Damn Vulnerable Drone simulator

# ANSI color codes
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to display help/usage information
show_help() {
    echo "Usage: sudo $0 [OPTION]"
    echo "Start the Damn Vulnerable Drone simulator."
    echo ""
    echo "Options:"
    echo "  --wifi      Start the simulation with a virtual drone Wi-Fi network."
    echo "  --no-wifi   Start the simulation with instant access to the drone network (default)."
    echo "  -h, --help  Display this help and exit."
    echo ""
    echo "Example:"
    echo "  sudo $0 --wifi      # Starts with virtual Wi-Fi"
    echo "  sudo $0 --no-wifi   # Starts without virtual Wi-Fi"
}


if [ "$EUID" -ne 0 ]; then
    echo "This script must be run with sudo privileges."
    echo "Please run it again with 'sudo ./stop.sh'"
    exit 1
fi

# Default value for wifi_simulation if no argument is provided
wifi_simulation=""

# Process command-line arguments
for arg in "$@"
do
    case $arg in
        --wifi)
        wifi_simulation="y"
        shift # Remove --wifi from processing
        ;;
        --no-wifi)
        wifi_simulation="n"
        shift # Remove --no-wifi from processing
        ;;
        -h|--help)
        show_help
        exit 0
        ;;
        *)
        # Unknown option
        echo "Unknown option: $arg"
        show_help
        exit 1
        ;;
    esac
done

echo -e "${CYAN}[+] Running System clean up...${NC}"
docker compose down
sudo iw dev wlan0 del >/dev/null 2>&1
sudo iw dev wlan1 del >/dev/null 2>&1
sudo iw dev wlan2 del >/dev/null 2>&1
sudo iw dev wlan3 del >/dev/null 2>&1
sudo modprobe -r mac80211_hwsim
sudo service networking start
sudo service NetworkManager start
echo -e "${CYAN}[+] System Ready...${NC}"

# Read the ID line from /etc/os-release
OS_ID=$(grep ^ID= /etc/os-release 2>/dev/null | cut -d= -f2)

# Remove quotes if they exist
OS_ID=${OS_ID//\"/}

# Only ask if wifi_simulation was not set by command-line arguments
if [ -z "$wifi_simulation" ]; then
    if [ "$OS_ID" = "kali" ]; then
        echo "Do you want to start the simulation with a virtual drone Wi-Fi network? By selecting 'No' you will start the simulation with instant access to the drone network. (Enter 'y (Yes)' or 'n (No)'): "
        read wifi_simulation
    else
        echo -e "${RED}Warning: You are not running on Kali Linux!"
        echo -e "${RED}Non-Kali Linux systems have not been tested with the start.sh script."
        echo ""
        echo -e "${RED}Instead use the provided Docker Compose file to start the environment."
        echo -e "${RED}i.e (docker compose up --build)"
        exit 1
    fi
fi

if [ "$wifi_simulation" = "y" ]; then
    # Make sure we are running as root
    WIFI_ENABLED="True"
    export WIFI_ENABLED
    if [ "$EUID" -ne 0 ]; then
        echo "To deploy virtual wifi you must run this script with sudo privileges."
        echo "Please run it again with 'sudo ./start.sh'"
        exit 1
    fi

    echo -e "${CYAN}[+] Starting simulation with a virtual Wi-Fi network..."

    LOG_FILE="dvd.log"

    {
        # Print current time
        echo -e "${CYAN}[+] Starting Docker Lab Environment - $(date)${NC}"

        # Load necessary kernel modules
        echo -e "${CYAN}[+] Loading kernel modules...${NC}"
        sudo modprobe mac80211_hwsim radios=4

        # # Set wlan0 to monitor mode
        output=$(sudo airmon-ng start wlan0 2>&1)

        # Look for lines with PIDs and extract them
        # This regex looks for lines that start with space(s), followed by numbers (PID), and then space/tab and text (process name)
        pids=($(echo "$output" | grep -oP '^\s*\K[0-9]+(?=\s+\S)'))

        # Kill the processes
        for pid in $pids; do
            echo "Killing process $pid"
            sudo kill $pid
        done

        # Start Docker Compose
        echo -e "${CYAN}[+] Starting Docker Compose...${NC}"
        docker compose up --build -d

        echo -e "${CYAN}[+] Fetching Docker Compose logs...${NC}"
        docker compose logs -f &

        # Wait for Docker containers to start up
        # Check for Docker containers readiness
        MAX_RETRIES=100
        RETRY_INTERVAL=10
        RETRY_COUNT=0

        while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
            echo -e "${CYAN}[+] Checking if Docker containers are ready (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)...${NC}"
            if docker ps | grep -q 'companion-computer' && docker ps | grep -q 'ground-control-station'; then
                echo -e "${CYAN}[+] Docker containers are ready.${NC}"
                break
            else
                ((RETRY_COUNT++))
                sleep $RETRY_INTERVAL
            fi
        done

        if [[ $RETRY_COUNT -eq $MAX_RETRIES ]]; then
            echo "${RED}[+] Docker containers did not become ready in time.${NC}"
            exit 1
        fi

        # Determine Docker bridge network IP address
        DOCKER_BRIDGE_IP=$(ip -4 addr show docker0 | grep -Po 'inet \K[\d.]+')
        echo -e "${CYAN}[+] Docker bridge network IP: $DOCKER_BRIDGE_IP${NC}"

        # Get PIDs of Docker containers and move interfaces
        echo -e "${CYAN}[+] Moving interfaces to Docker containers...${NC}"

        # Companion Computer gets wlan1 interface
        CC_PID=$(docker inspect --format '{{ .State.Pid }}' companion-computer)
        PHY_WLAN1=$(iw dev | awk '/phy#/{phy=$0} /Interface wlan1/{print phy; exit}')
        PHY_WLAN1=$(echo $PHY_WLAN1 | awk -F'#' '{print "phy"$2}')
        sudo iw phy $PHY_WLAN1 set netns $CC_PID

        # Ground Control Station gets wlan2 interface
        GCS_PID=$(docker inspect --format '{{ .State.Pid }}' ground-control-station)
        PHY_WLAN2=$(iw dev | awk '/phy#/{phy=$0} /Interface wlan2/{print phy; exit}')
        PHY_WLAN2=$(echo $PHY_WLAN2 | awk -F'#' '{print "phy"$2}')
        sudo iw phy $PHY_WLAN2 set netns $GCS_PID

        # CC Access Point Setup
        echo -e "${CYAN}[+] Setting up Access Point on Companion Computer...${NC}"
        
        # Execute multiple commands in the companion-computer container
        docker exec companion-computer sh -c '
        # Set IP address for wlan1
        ip a a 192.168.13.1/24 dev wlan1 &&
        echo "[companion-computer] IP address set for wlan1." ||
        { echo "[companion-computer] Failed to set IP address for wlan1."; exit 1; }

        # Create dhcpd.leases file if it doesnt exist
        if [ ! -f /var/lib/dhcp/dhcpd.leases ]; then
            touch /var/lib/dhcp/dhcpd.leases &&
            echo "[companion-computer] Created dhcpd.leases file." ||
            { echo "[companion-computer] Failed to create dhcpd.leases file."; exit 1; }
        fi

        # Set permissions for dhcpd.leases file
        chmod 644 /var/lib/dhcp/dhcpd.leases &&
        echo "[companion-computer] Permissions set for dhcpd.leases." ||
        { echo "[companion-computer] Failed to set permissions for dhcpd.leases."; exit 1; }

        # Start hostapd in the background with nohup
        nohup hostapd /etc/hostapd.conf > /var/log/hostapd.log 2>&1 &
        echo "[companion-computer] hostapd started."

        # Pause for a few seconds to allow hostapd to initialize
        sleep 5

        # Clean up previous dhcpd PID file if it exists
        rm -f /var/run/dhcpd.pid

        service isc-dhcp-server start
        service dnsmasq start
        service isc-dhcp-server stop
        service dnsmasq stop

        # Start dhcpd in debug mode
        dhcpd -d &
        echo "[companion-computer] dhcpd started in debug mode."
        '

        service NetworkManager start
        
        # Ground Control Station Access Point Setup
        echo -e "${CYAN}[+] Setting up Ground Control Station Access Point...${NC}"

        # Execute commands in the ground-control-station container
        docker exec ground-control-station sh -c "
            wpa_supplicant -B -i wlan2 -c /etc/wpa_supplicant/wpa_supplicant.conf -D nl80211;
            ip addr add 192.168.13.14/24 dev wlan2;
            ip route add default via 192.168.13.1 dev wlan2;
            echo '${CYAN}[ground-control-station] IP address set for wlan2.${NC}' ||
            { echo '${RED}[ground-control-station] Failed to set IP address for wlan2.${NC}'; exit 1; }
        "        output=$(sudo airmon-ng start wlan0 2>&1)

        # Look for lines with PIDs and extract them
        # This regex looks for lines that start with space(s), followed by numbers (PID), and then space/tab and text (process name)
        pids=($(echo "$output" | grep -oP '^\s*\K[0-9]+(?=\s+\S)'))

        # Kill the processes
        for pid in $pids; do
            echo "Killing process $pid"
            sudo kill $pid
        done

        echo -e "${CYAN}------------------------------------------------------"
        echo -e "${CYAN}[+] Build Complete."
        echo -e "${CYAN}------------------------------------------------------"
        echo -e "${CYAN}[+] - Virtual interface wlan0mon put into monitoring mode."
        echo -e "${CYAN}[+] - Virtual interface wlan3 is available for regular wifi networking."
        echo -e "${CYAN}------------------------------------------------------"
        echo -e "${CYAN}[+] Damn Vulnerable Drone Lab Environment is running..."
        echo -e "${CYAN}[+] Log file: dvd.log"
        echo -e "${CYAN}[+] Simulator: http://localhost:8000"
        echo -e "${CYAN}------------------------------------------------------${NC}"

    } 2>&1 | tee -a "$LOG_FILE"

elif [ "$wifi_simulation" = "n" ]; then
    WIFI_ENABLED="False"
    export WIFI_ENABLED
    LOG_FILE="dvd.log"
    {
        echo -e "${CYAN}Starting simulation assuming drone network connectivity access..."
        echo -e "${CYAN}[+] Starting Docker Compose...${NC}"
        docker compose up --build -d
        docker compose logs -f &
        
        echo -e "${CYAN}------------------------------------------------------"
        echo -e "${CYAN}[+] Build Complete."
        echo -e "${CYAN}------------------------------------------------------"
        echo -e "${CYAN}[+] Damn Vulnerable Drone Lab Environment is running..."
        echo -e "${CYAN}[+] Log file: dvd.log"
        echo -e "${CYAN}[+] Simulator: http://localhost:8000"
        echo -e "${CYAN}------------------------------------------------------"
    } 2>&1 | tee -a "$LOG_FILE"
else
    echo "Invalid input. Please start the script again and enter 'y' (Yes) or 'n' (No)."
    exit 1
fi