#!/bin/bash
set -Eeuo pipefail

# Always run from this script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Stable Compose project name (defaults to folder name)
export COMPOSE_PROJECT_NAME="damn-vulnerable-drone"

# Allow ground-control-station QGC app GUI
xhost +local:docker >/dev/null 2>&1 || true

# Colors
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

print_banner() {
  [[ -f "$SCRIPT_DIR/banner.txt" ]] && cat "$SCRIPT_DIR/banner.txt"
}

show_help() {
  print_banner
  cat <<EOF
Usage: sudo $0 [OPTIONS]

Start the Damn Vulnerable Drone simulator.

Options:
  --mode [full|lite]     Choose simulator mode:
                           - full: 3D environment (GPU + drivers required)
                           - lite: no GPU, minimal requirements
  --wifi [wpa2|wep]      Start with virtual drone Wi-Fi network
  --no-wifi              Start without virtual Wi-Fi (instant access)
  -h, --help             Show this help and exit
EOF
}

# --- Root check ---
if [[ "$EUID" -ne 0 ]]; then
  echo "This script must be run with sudo privileges."
  echo "Please run it again with 'sudo ./start.sh'"
  exit 1
fi

# --- Args ---
wifi_simulation=""
wifi_mode=""
sim_mode=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      sim_mode="${2:-}"
      if [[ -z "${sim_mode}" || ! "${sim_mode}" =~ ^(lite|full)$ ]]; then
        echo "Error: --mode must be 'lite' or 'full'"; exit 1
      fi
      shift 2
      ;;
    --wifi)
      wifi_simulation="y"
      wifi_mode="${2:-}"
      if [[ -z "$wifi_mode" || ! "$wifi_mode" =~ ^(wpa2|wep)$ ]]; then
        echo "Error: --wifi requires 'wpa2' or 'wep'"; exit 1
      fi
      shift 2
      ;;
    --no-wifi)
      wifi_simulation="n"
      shift
      ;;
    -h|--help)
      show_help; exit 0
      ;;
    *)
      echo "Unknown option: $1"; show_help; exit 1
      ;;
  esac
done

# --- Helpers ---
# Returns 1 if GPU is Ok, returns 0 if GPU fails
gpu_ok() {
  command -v nvidia-smi >/dev/null 2>&1 || return 0
  docker info --format '{{json .Runtimes}}' 2>/dev/null | grep -q '"nvidia"' || return 0
  return 1
}

check_virtual_interface() {
  local interface="$1"
  local phy_device
  phy_device=$(readlink -f "/sys/class/net/$interface/device/ieee80211" 2>/dev/null || true)
  if [[ -n "$phy_device" && "$phy_device" =~ "mac80211_hwsim" ]]; then
    return 1
  else
    return 0
  fi
}

first_virtual_card() {
  local int
  while read -r int; do
    if ! check_virtual_interface "$int"; then
      echo "$int"; return
    fi
  done < <(iw dev | awk '$1=="Interface"{print $2}' | tac)
}

increment_interface_number() {
  local interface="$1"
  local number; number=$(echo "$interface" | grep -o '[0-9]*$')
  local prefix; prefix=$(echo "$interface" | sed 's/[0-9]*$//')
  echo "${prefix}$((number + 1))"
}

stop_all_stacks() {
  echo "[+] Stopping any previous stacks..."
  docker compose -f "$SCRIPT_DIR/docker-compose.yaml" down --remove-orphans -v || true
  docker compose -f "$SCRIPT_DIR/docker-compose-lite.yaml" down --remove-orphans -v || true

  # Extra safety: remove stray containers by service label
  local services=(
    simulator simulator-lite
    companion-computer companion-computer-lite
    ground-control-station ground-control-station-lite
  )
  for s in "${services[@]}"; do
    mapfile -t ids < <(docker ps -aq -f "label=com.docker.compose.service=${s}")
    ((${#ids[@]})) && docker rm -f "${ids[@]}" >/dev/null 2>&1 || true
  done
}

clean_up_and_setup() {
  echo -e "${CYAN}[+] Running system clean up...${NC}"
  stop_all_stacks

  # Delete virtual wireless interfaces
  while read -r iface; do
    if ! check_virtual_interface "$iface"; then
      echo "Removing $iface..."
      iw dev "$iface" del >/dev/null 2>&1 || true
    fi
  done < <(iw dev | awk '$1=="Interface"{print $2}' | tac)

  modprobe -r mac80211_hwsim 2>/dev/null || true
  service networking start >/dev/null 2>&1 || true
  service NetworkManager start >/dev/null 2>&1 || true
  echo -e "${CYAN}[+] System ready...${NC}"
}

# --- Start ---
print_banner
clean_up_and_setup

# OS detection (only used for interactive Wi-Fi question)
OS_ID=$(grep ^ID= /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"')

# Ask for mode if not provided
if [[ -z "${sim_mode}" ]]; then
  echo "Select simulator mode:"
  echo "  [1] Lite (no GPU, minimal requirements)"
  echo "  [2] Full (3D, GPU required)"
  read -rp "Enter 1 or 2 [default: 1]: " choice
  case "${choice:-1}" in
    2) sim_mode="full" ;;
    *) sim_mode="lite" ;;
  esac
fi

# FULL mode GPU check

if [[ "${sim_mode}" == "full" ]] && ! gpu_ok; then
  echo "GPU runtime not detected (need NVIDIA drivers + nvidia-container-runtime)."
  read -rp "Fall back to Lite mode? [Y/n]: " fb
  fb="${fb:-Y}"
  if [[ "$fb" =~ ^[Yy]$ ]]; then
    sim_mode="lite"
    echo "Switching to Lite mode."
  else
    echo "Continuing in Full mode without GPU (may fail or be slow)."
  fi
fi

# Select compose file & service names
if [[ "${sim_mode}" == "lite" ]]; then
  DOCKER_COMPOSE_FILE="$SCRIPT_DIR/docker-compose-lite.yaml"
  CC_SVC="companion-computer-lite"
  GCS_SVC="ground-control-station-lite"
  SIM_SVC="simulator-lite"
else
  DOCKER_COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yaml"
  CC_SVC="companion-computer"
  GCS_SVC="ground-control-station"
  SIM_SVC="simulator"
fi

# Compose wrapper (for the selected file)
compose() { docker compose -f "$DOCKER_COMPOSE_FILE" "$@"; }

# Ask Wi-Fi if not set via args (only on Kali, to match original behavior)
if [[ -z "$wifi_simulation" ]]; then
  if [[ "$OS_ID" == "kali" ]]; then
    read -rp "Start with virtual drone Wi-Fi network? [y/N]: " wifi_simulation
    if [[ "$wifi_simulation" =~ ^[Yy]$ ]]; then
      read -rp "Wi-Fi mode (wep|wpa2): " wifi_mode
      wifi_mode="$(echo "$wifi_mode" | tr '[:upper:]' '[:lower:]')"
      [[ "$wifi_mode" =~ ^(wep|wpa2)$ ]] || { echo "Invalid Wi-Fi mode."; exit 1; }
    else
      wifi_simulation="n"
    fi
  else
    echo -e "${RED}Warning: Non-Kali systems not tested for virtual Wi-Fi setup."
    echo -e "${RED}Use 'docker compose -f docker-compose[-lite].yaml up --build' if needed.${NC}"
    exit 1
  fi
fi

# Version
get_version() {
  local vf="$SCRIPT_DIR/version.txt"
  [[ -f "$vf" ]] && cat "$vf" || echo "Version file not found"
}
version="$(get_version)"

# --- Launch paths ---
if [[ "$wifi_simulation" == "y" ]]; then
  echo -e "${CYAN}[+] Starting simulation with a virtual Wi-Fi network...${NC}"
  LOG_FILE="dvd.log"
  {
    echo -e "${CYAN}[+] Starting Docker Lab Environment - $(date)${NC}"

    # Build/pull Docker images BEFORE touching the host wireless stack.
    # airmon-ng below kills NetworkManager/wpa_supplicant/dhclient, which
    # breaks DNS and any in-flight image pulls.
    stop_all_stacks
    echo -e "${CYAN}[+] Starting Docker Compose (mode: ${sim_mode})...${NC}"
    compose up -d --build

    # Container IDs via compose (robust even without container_name)
    CC_CID="$(compose ps -q "$CC_SVC" || true)"
    GCS_CID="$(compose ps -q "$GCS_SVC" || true)"
    [[ -n "$CC_CID" && -n "$GCS_CID" ]] || { echo "Containers not up yet."; }

    # Readiness
    MAX_RETRIES=100; RETRY_INTERVAL=10; RETRY_COUNT=0
    while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
      echo -e "${CYAN}[+] Checking containers ready (attempt $((RETRY_COUNT+1))/$MAX_RETRIES)...${NC}"
      if compose ps | grep -q "$CC_SVC" && compose ps | grep -q "$GCS_SVC"; then
        echo -e "${CYAN}[+] Docker containers are ready.${NC}"; break
      fi
      ((RETRY_COUNT++)); sleep "$RETRY_INTERVAL"
    done
    [[ $RETRY_COUNT -eq $MAX_RETRIES ]] && { echo -e "${RED}Containers not ready in time.${NC}"; exit 1; }

    echo -e "${CYAN}[+] Loading kernel modules...${NC}"
    modprobe mac80211_hwsim radios=4

    first_virtual_card_name="$(first_virtual_card || true)"
    echo "First virtual card: ${first_virtual_card_name:-<none>}"
    if [[ -z "$first_virtual_card_name" ]]; then
      echo "Error: No virtual card found. Is 'mac80211_hwsim' available?"
      exit 1
    fi

    # Put first card in monitor mode & kill interfering PIDs
    output="$(airmon-ng start "$first_virtual_card_name" 2>&1 || true)"
    while read -r pid; do
      echo "Killing process $pid"; kill "$pid" || true
    done < <(echo "$output" | grep -oP '^\s*\K[0-9]+(?=\s+\S)')

    DOCKER_BRIDGE_IP="$(ip -4 addr show docker0 | grep -Po 'inet \K[\d.]+' || true)"
    echo -e "${CYAN}[+] Docker bridge IP: ${DOCKER_BRIDGE_IP:-unknown}${NC}"

    echo -e "${CYAN}[+] Moving interfaces to Docker containers...${NC}"
    companion_computer_interface="$(increment_interface_number "$first_virtual_card_name")"
    gcs_interface="$(increment_interface_number "$companion_computer_interface")"
    kali_interface="$(increment_interface_number "$gcs_interface")"

    # Get PIDs using container IDs
    CC_PID="$(docker inspect --format '{{ .State.Pid }}' "$CC_CID")"
    GCS_PID="$(docker inspect --format '{{ .State.Pid }}' "$GCS_CID")"

    CC_PHY_INTERFACE="$(iw dev | awk '/phy#/{phy=$0} /Interface '"$companion_computer_interface"'/{print phy; exit}' | awk -F'#' '{print "phy"$2}')"
    GCS_PHY_INTERFACE="$(iw dev | awk '/phy#/{phy=$0} /Interface '"$gcs_interface"'/{print phy; exit}' | awk -F'#' '{print "phy"$2}')"

    iw phy "$CC_PHY_INTERFACE" set netns "$CC_PID"
    iw phy "$GCS_PHY_INTERFACE" set netns "$GCS_PID"

    echo -e "${CYAN}[+] Setting up Access Point on Companion Computer...${NC}"
    if [[ "$wifi_mode" == "wpa2" ]]; then
      export WIFI_MODE="wpa2"
      docker cp "$SCRIPT_DIR/companion-computer/conf/hostapd_wpa2.conf" "$CC_CID":/etc/hostapd.conf
      docker cp "$SCRIPT_DIR/ground-control-station/conf/wpa_supplicant_wpa2.conf" "$GCS_CID":/etc/wpa_supplicant/wpa_supplicant.conf
    elif [[ "$wifi_mode" == "wep" ]]; then
      unset WIFI_MODE
      docker cp "$SCRIPT_DIR/companion-computer/conf/hostapd_wep.conf" "$CC_CID":/etc/hostapd.conf
    else
      echo "[!] Invalid Wi-Fi mode: $wifi_mode"; exit 1
    fi

    docker exec "$CC_CID" sh -c '
      ip a a 192.168.13.1/24 dev '"$companion_computer_interface"' &&
      sed -i "s/wlan1/'"$companion_computer_interface"'/" /etc/dnsmasq.conf &&
      sed -i "s/wlan1/'"$companion_computer_interface"'/" /etc/hostapd.conf &&
      : > /var/lib/dhcp/dhcpd.leases &&
      chmod 644 /var/lib/dhcp/dhcpd.leases &&
      nohup hostapd /etc/hostapd.conf > /var/log/hostapd.log 2>&1 & sleep 5 &&
      rm -f /var/run/dhcpd.pid &&
      service isc-dhcp-server start &&
      service dnsmasq start &&
      service isc-dhcp-server stop &&
      service dnsmasq stop &&
      dhcpd -d &
    '

    service NetworkManager start >/dev/null 2>&1 || true

    echo -e "${CYAN}[+] Setting up Ground Control Station Wi-Fi client...${NC}"
    docker exec "$GCS_CID" sh -c "
      wpa_supplicant -B -i '$gcs_interface' -c /etc/wpa_supplicant/wpa_supplicant.conf -D nl80211;
      ip addr add 192.168.13.14/24 dev '$gcs_interface';
      ip route add default via 192.168.13.1 dev '$gcs_interface';
    "

    echo -e "${CYAN}------------------------------------------------------"
    echo -e "${CYAN}[+] Build Complete."
    echo -e "${CYAN}[+] Version: ${version}"
    echo -e "${CYAN}[+] Mode: ${sim_mode^^}"
    echo -e "${CYAN}------------------------------------------------------"
    echo -e "${CYAN}[+] - Virtual interface ${first_virtual_card_name}mon put into monitoring mode."
    echo -e "${CYAN}[+] - Virtual interface ${kali_interface} is available for regular wifi networking."
    echo -e "${CYAN}------------------------------------------------------"
    echo -e "${CYAN}[+] Damn Vulnerable Drone Lab Environment is running..."
    echo -e "${CYAN}[+] Log file: dvd.log"
    echo -e "${CYAN}[+] Simulator: http://localhost:8000"
    echo -e "${CYAN}------------------------------------------------------${NC}"

    echo -e "${CYAN}[+] Fetching Docker Compose logs...${NC}"
    compose logs -f "$SIM_SVC" "$CC_SVC" "$GCS_SVC"
  } 2>&1 | tee -a "$LOG_FILE"

elif [[ "$wifi_simulation" == "n" ]]; then
  LOG_FILE="dvd.log"
  {
    echo -e "${CYAN}Starting simulation without virtual Wi-Fi..."
    stop_all_stacks
    echo -e "${CYAN}[+] Starting Docker Compose (mode: ${sim_mode})...${NC}"
    compose up -d --build

    echo -e "${CYAN}------------------------------------------------------"
    echo -e "${CYAN}[+] Build Complete."
    echo -e "${CYAN}[+] Version: ${version}"
    echo -e "${CYAN}[+] Mode: ${sim_mode^^}"
    echo -e "${CYAN}------------------------------------------------------"
    echo -e "${CYAN}[+] Damn Vulnerable Drone Lab Environment is running..."
    echo -e "${CYAN}[+] Log file: dvd.log"
    echo -e "${CYAN}[+] Simulator: http://localhost:8000"
    echo -e "${CYAN}------------------------------------------------------${NC}"

    echo -e "${CYAN}[+] Fetching Docker Compose logs...${NC}"
    compose logs -f "$SIM_SVC" "$CC_SVC" "$GCS_SVC"
  } 2>&1 | tee -a "$LOG_FILE"
else
  echo "Invalid input for Wi-Fi selection."
  exit 1
fi
