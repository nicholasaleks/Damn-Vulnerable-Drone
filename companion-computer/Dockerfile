FROM ubuntu:20.04

# Avoid prompts during package installations
ENV DEBIAN_FRONTEND=noninteractive

EXPOSE 3000 5000 22

RUN apt-get update && apt-get install -y \
    apt-utils \
    curl \
    iproute2 \
    kmod \
    socat \
    nano \
    hostapd \
    dnsmasq \
    npm \
    isc-dhcp-server \
    wpasupplicant \
    git \
    nmap \
    systemd \
    python3 \
    net-tools \
    iputils-ping \
    gnupg \
    lsb-release \
    sudo \
    wget \
    make \
    g++ \
    libnl-3-dev \
    libnl-genl-3-dev \
    python3 \
    python3-pip \
    openssh-server \
    && pip3 install future pymavlink MAVProxy \
    && rm -rf /var/lib/apt/lists/*

# Install ROS
RUN curl -s https://raw.githubusercontent.com/ros/rosdistro/master/ros.asc | apt-key add -
RUN sh -c 'echo "deb http://packages.ros.org/ros/ubuntu `lsb_release -cs` main" > /etc/apt/sources.list.d/ros-latest.list'
RUN apt update -y && apt install -y ros-noetic-ros-base ros-noetic-gazebo-ros-pkgs ros-noetic-cv-bridge ros-noetic-image-transport
RUN apt install -y gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-tools gstreamer1.0-rtsp
RUN apt install -y python3-gi python3-gst-1.0 gir1.2-gst-rtsp-server-1.0

ENV ROS_MASTER_URI=http://10.13.0.5:11311
ENV ROS_IP=10.13.0.3

# Add ros source to bashrc
RUN echo "source /opt/ros/noetic/setup.bash" >> ~/.bashrc

COPY companion-computer/conf/dhcpd.conf /etc/dhcp/dhcpd.conf
COPY companion-computer/conf/dnsmasq.conf /etc/dnsmasq.conf
COPY companion-computer/conf/hostapd.conf /etc/hostapd.conf
COPY companion-computer/conf/isc-dhcp-server /etc/default/isc-dhcp-server

WORKDIR /

# Define environment variable for architecture
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
        wget https://github.com/mavlink-router/mavlink-router/releases/download/v4/mavlink-routerd-glibc-x86_64 -O /usr/bin/mavlink-routerd; \
    elif [ "$ARCH" = "aarch64" ]; then \
        wget https://github.com/mavlink-router/mavlink-router/releases/download/v4/mavlink-routerd-glibc-aarch64 -O /usr/bin/mavlink-routerd; \
    else \
        echo "Unsupported architecture: $ARCH"; \
        exit 1; \
    fi && \
    chmod +x /usr/bin/mavlink-routerd

# Get Conf file
RUN mkdir -p /etc/mavlink-router
COPY companion-computer/conf/mavlink-router.conf /etc/mavlink-router/main.conf

# Web Interface Setup
###########################
RUN pip3 install flask docker flask-cors Flask-SQLAlchemy flask-socketio opencv-python-headless Flask-Login
COPY companion-computer/interface /interface
COPY companion-computer/interface/config.json /interface/config.json
RUN mkdir -p /var/log/mavlink-router
COPY companion-computer/start-companion.sh /start-companion.sh
RUN chmod +x /start-companion.sh
RUN mkdir -p /logs

# SSH Setup
###########################
RUN apt-get update && apt-get install -y openssh-server
RUN mkdir /var/run/sshd
RUN useradd -m admin && echo "admin:cyberdrone" | chpasswd && adduser admin sudo
RUN echo 'root:cyberdrone' | chpasswd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
RUN sed -i 's/Port 22/Port 3000/' /etc/ssh/sshd_config
RUN mkdir -p /home/admin/.ssh && chmod 700 /home/admin/.ssh
COPY companion-computer/conf/sshd_config /etc/ssh/sshd_config

# Generate SSH host keys
RUN ssh-keygen -A

# Create a script to run both the SSH server and the companion script
RUN echo '#!/bin/bash\n/usr/sbin/sshd &\n/start-companion.sh' > /start.sh
RUN chmod +x /start.sh

# Use the script as the CMD
CMD ["/start.sh"]