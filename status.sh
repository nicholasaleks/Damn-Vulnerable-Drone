#!/bin/bash

# Define container names
CONTAINERS=("companion-computer" "ground-control-station" "flight-controller" "simulator")
ENVIRONMENT_STATUS="Stopped"

# Check if Docker is running
if ! command -v docker &> /dev/null
then
    echo "Docker is not installed or not in PATH."
    exit 1
fi

# Function to check the status of each container
check_container_status() {
    local container=$1
    local status=$(docker ps -a --filter "name=$container" --format "{{.Status}}" | head -n 1)

    if [[ $status == *"Up"* ]]; then
        ENVIRONMENT_STATUS="Running"
        echo "$container is running. Status: $status"
    elif [[ $status == *"Exited"* ]]; then
        echo "$container is stopped. Status: $status"
    else
        echo "$container not found."
    fi
}

echo "Checking the status of the Damn Vulnerable Drone environment..."

# Check the status of each container
for container in "${CONTAINERS[@]}"
do
    check_container_status $container
done