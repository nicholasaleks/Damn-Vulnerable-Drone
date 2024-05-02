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

check_virtual_interface() {
    interface=$1
    phy_device=$(readlink -f "/sys/class/net/$interface/device/ieee80211" 2>/dev/null)
    if [[ -n "$phy_device" && "$phy_device" =~ "mac80211_hwsim" ]]; then
        return 1
    else
        return 0
    fi
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


# Get the first virtual card
first_virtual_card() {
    # Get a list of all wireless interfaces
    wireless_interfaces=$(iw dev | awk '$1=="Interface"{print $2}' | tac)

    # Iterate over each wireless interface and delete if check_virtual_interface returns 1
    for int in $wireless_interfaces; do
        if ! check_virtual_interface "$int"; then
            echo "$int"
            return  # Exit the loop once the first virtual card is found
        fi
    done
}

# Get next virtual card number
increment_interface_number() {
    local interface="$1"
    local number=$(echo "$interface" | grep -o '[0-9]*$')
    local incremented_number=$((number + 1))
    local interface_prefix=$(echo "$interface" | sed 's/[0-9]*$//')
    echo "${interface_prefix}${incremented_number}"
}


clean_up_and_setup

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

        # Start Docker Compose
        echo -e "${CYAN}[+] Starting Docker Pull...${NC}"
        docker compose pull

        echo -e "${CYAN}[+] Starting Docker Build...${NC}"
        docker compose build

        # Print current time
        echo -e "${CYAN}[+] Starting Docker Lab Environment - $(date)${NC}"

        # Load necessary kernel modules
        echo -e "${CYAN}[+] Loading kernel modules...${NC}"
        sudo modprobe mac80211_hwsim radios=4

        # Set the first virtual card into monitor mode
        first_virtual_card_name=$(first_virtual_card)
        echo "First virtual Card: ${first_virtual_card_name}"

        # Check if a virtual card was found
        if [ -n "$first_virtual_card_name" ]; then
            # Set the first virtual card into monitor mode
            output=$(sudo airmon-ng start "$first_virtual_card_name" 2>&1)
        else
            echo "Error: No virtual card found. Check that modprobe mac80211_hwsim is working..."
            exit 1
        fi

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
        docker compose up -d

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

        # Companion Computer gets the next interface
        companion_computer_interface=$(increment_interface_number "$first_virtual_card_name")
        CC_PID=$(docker inspect --format '{{ .State.Pid }}' companion-computer)
        CC_PHY_INTERFACE=$(iw dev | awk '/phy#/{phy=$0} /Interface '"$companion_computer_interface"'/{print phy; exit}')
        CC_PHY_INTERFACE=$(echo "$CC_PHY_INTERFACE" | awk -F'#' '{print "phy"$2}')
        sudo iw phy "$CC_PHY_INTERFACE" set netns "$CC_PID"

        # Ground Control Station gets the next interface
        gcs_interface=$(increment_interface_number "$companion_computer_interface")
        GCS_PID=$(docker inspect --format '{{ .State.Pid }}' ground-control-station)
        GCS_PHY_INTERFACE=$(iw dev | awk '/phy#/{phy=$0} /Interface '"$gcs_interface"'/{print phy; exit}')
        GCS_PHY_INTERFACE=$(echo $GCS_PHY_INTERFACE | awk -F'#' '{print "phy"$2}')
        sudo iw phy $GCS_PHY_INTERFACE set netns $GCS_PID

        # CC Access Point Setup
        echo -e "${CYAN}[+] Setting up Access Point on Companion Computer...${NC}"
        
        # Execute multiple commands in the companion-computer container
        docker exec companion-computer sh -c '
        # Set IP address for companion computer
        ip a a 192.168.13.1/24 dev '"$companion_computer_interface"' &&
        echo "[companion-computer] IP address set for '"$companion_computer_interface"'" ||
        { echo "[companion-computer] Failed to set IP address for '"$companion_computer_interface"'."; exit 1; }

        # Update interface name in dnsmasq.conf
        sed -i "s/wlan1/'"${companion_computer_interface}"'/" /etc/dnsmasq.conf &&
        echo "[companion-computer] Interface name updated in dnsmasq.conf." ||
        { echo "[companion-computer] Failed to update interface name in dnsmasq.conf."; exit 1; }

        # Update interface name in hostapd.conf
        sed -i "s/wlan1/'"${companion_computer_interface}"'/" /etc/hostapd.conf &&
        echo "[companion-computer] Interface name updated in hostapd.conf." ||
        { echo "[companion-computer] Failed to update interface name in hostapd.conf."; exit 1; }

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

        kali_interface=$(increment_interface_number "$gcs_interface")
        
        # Ground Control Station Access Point Setup
        echo -e "${CYAN}[+] Setting up Ground Control Station Access Point...${NC}"

        # Execute commands in the ground-control-station container
        docker exec ground-control-station sh -c "
            wpa_supplicant -B -i '"$gcs_interface"' -c /etc/wpa_supplicant/wpa_supplicant.conf -D nl80211;
            ip addr add 192.168.13.14/24 dev '"$gcs_interface"';
            ip route add default via 192.168.13.1 dev '"$gcs_interface"';
            echo '${CYAN}[ground-control-station] IP address set for '"$gcs_interface"'.${NC}' ||
            { echo '${RED}[ground-control-station] Failed to set IP address for '"$gcs_interface"'.${NC}'; exit 1; }
        "

        echo -e "${CYAN}------------------------------------------------------"
        echo -e "${CYAN}[+] Build Complete."
        echo -e "${CYAN}------------------------------------------------------"
        echo -e "${CYAN}[+] - Virtual interface ${first_virtual_card_name}mon put into monitoring mode."
        echo -e "${CYAN}[+] - Virtual interface ${kali_interface} is available for regular wifi networking."
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