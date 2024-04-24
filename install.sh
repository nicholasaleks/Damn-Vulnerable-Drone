#!/bin/bash

# Install required docker packages
printf '%s\n' "deb https://download.docker.com/linux/debian bullseye stable" | sudo tee /etc/apt/sources.list.d/docker-ce.list

curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/docker-ce-archive-keyring.gpg

sudo apt update -y

sudo apt install docker-ce docker-ce-cli containerd.io -y

sudo systemctl enable docker --now

sudo usermod -aG docker $USER

echo "Docker installation is complete. Please log out and then log back in for the changes to take effect, or run 'newgrp docker' in this terminal to use Docker without relogging."