# COMPANION COMPUTER CONTAINER — Ubuntu 22.04 + ROS 2 Humble
#
# Migrated from Noetic in this branch. ROS_MASTER_URI / ROS_IP are gone —
# discovery is now peer-to-peer DDS with an explicit unicast peers list
# (see /etc/cyclonedds.xml and the ROS_DOMAIN_ID env var).
FROM ubuntu:22.04

# Avoid prompts during package installations
ENV DEBIAN_FRONTEND=noninteractive

EXPOSE 3000 5000 22

# ---------------------------------------------------------------------------
# Base OS packages (largely unchanged from the master branch)
# ---------------------------------------------------------------------------
RUN apt-get update && apt-get install -y \
    apt-utils curl iproute2 kmod socat nano hostapd dnsmasq npm isc-dhcp-server \
    wpasupplicant git nmap systemd python3 net-tools iputils-ping gnupg lsb-release \
    sudo wget make g++ libnl-3-dev libnl-genl-3-dev python3 python3-pip openssh-server \
    libxml2-dev libxslt1-dev zlib1g-dev python3-dev pkg-config cython3 ca-certificates \
 && pip3 install --no-cache-dir future pymavlink MAVProxy \
 && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# ROS 2 Humble (on ubuntu-jammy)
#
# Note: ROS 2 lives at packages.ros.org/ros2/ubuntu (not /ros/ubuntu, which
# is the legacy ROS 1 channel). apt-key is deprecated on Jammy, so we use
# a signed-by keyring file instead.
# ---------------------------------------------------------------------------
RUN curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key \
        -o /usr/share/keyrings/ros-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu jammy main" \
        > /etc/apt/sources.list.d/ros2.list && \
    apt update -y && apt install -y --no-install-recommends \
        ros-humble-ros-base \
        ros-humble-cv-bridge \
        ros-humble-image-transport \
        ros-humble-vision-opencv \
        ros-humble-rmw-cyclonedds-cpp \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# mavros — ROS 2 <-> MAVLink bridge (APM/ArduPilot profile)
#
# Puts the flight-control surface on the DDS graph (/mavros/imu/data,
# /mavros/global_position/*, /mavros/setpoint_velocity/cmd_vel, the
# /mavros/cmd/* services, etc.). It connects to a dedicated mavlink-router
# endpoint (14560), so it never contends with the Flask pymavlink listener
# on 14540 and is idle until telemetry is started from the web UI.
#
# install_geographiclib_datasets.sh is REQUIRED: the global_position plugin
# aborts on launch without the GeographicLib geoid datasets. This is the #1
# mavros bring-up failure.
RUN apt update -y && apt install -y \
        ros-humble-mavros ros-humble-mavros-msgs ros-humble-mavros-extras \
    && /opt/ros/humble/lib/mavros/install_geographiclib_datasets.sh \
    && rm -rf /var/lib/apt/lists/*

RUN apt update -y && apt install -y \
    gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-tools gstreamer1.0-rtsp \
    python3-gi python3-gst-1.0 gir1.2-gst-rtsp-server-1.0 \
 && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# DDS config — explicit unicast peers (no multicast over Docker bridge)
# ---------------------------------------------------------------------------
COPY dds/cyclonedds.xml /etc/cyclonedds.xml
ENV RMW_IMPLEMENTATION=rmw_cyclonedds_cpp \
    CYCLONEDDS_URI=file:///etc/cyclonedds.xml \
    ROS_DOMAIN_ID=42

# Source ROS 2 for interactive shells (helpful for attackers and operators
# who shell in)
RUN echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc

COPY companion-computer/conf/dhcpd.conf /etc/dhcp/dhcpd.conf
COPY companion-computer/conf/dnsmasq.conf /etc/dnsmasq.conf
COPY companion-computer/conf/isc-dhcp-server /etc/default/isc-dhcp-server

WORKDIR /

# ---------------------------------------------------------------------------
# mavlink-router (unchanged)
# ---------------------------------------------------------------------------
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

RUN mkdir -p /etc/mavlink-router
COPY companion-computer/conf/mavlink-router.conf /etc/mavlink-router/main.conf

# mavros MAVLink-identity overrides (see the file's header for the sysid rationale)
COPY companion-computer/conf/mavros/apm_config.yaml /etc/mavros/apm_config.yaml

# ---------------------------------------------------------------------------
# Web Interface (Flask)
#
# numpy is pinned to <2 because ros-humble-cv-bridge's native module
# (cv_bridge_boost) is compiled against NumPy 1.x. With NumPy 2.x in
# the environment, `from cv_bridge import CvBridge` fails at import
# with `AttributeError: _ARRAY_API not found`, which kills rtsp.py and
# the camera HTTP route. opencv-python-headless itself supports both
# NumPy majors; cv_bridge is the limiter.
# ---------------------------------------------------------------------------
RUN pip3 install "numpy<2" flask docker flask-cors Flask-SQLAlchemy flask-socketio opencv-python-headless Flask-Login flask-sock simple-websocket
COPY companion-computer/interface /interface
COPY companion-computer/interface/config.json /interface/config.json
RUN mkdir -p /var/log/mavlink-router
COPY companion-computer/start-companion.sh /start-companion.sh
RUN chmod +x /start-companion.sh
RUN mkdir -p /logs

# ---------------------------------------------------------------------------
# SSH (unchanged)
# ---------------------------------------------------------------------------
RUN apt-get update && apt-get install -y openssh-server
RUN mkdir /var/run/sshd
RUN useradd -m admin && echo "admin:cyberdrone" | chpasswd && adduser admin sudo
RUN echo 'root:cyberdrone' | chpasswd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
RUN sed -i 's/Port 22/Port 3000/' /etc/ssh/sshd_config
RUN mkdir -p /home/admin/.ssh && chmod 700 /home/admin/.ssh
COPY companion-computer/conf/sshd_config /etc/ssh/sshd_config

RUN ssh-keygen -A

RUN echo '#!/bin/bash\n/usr/sbin/sshd &\n/start-companion.sh' > /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
