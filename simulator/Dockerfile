# SIMULATOR CONTAINER — Gazebo Classic 11 + ROS 2 Foxy on Ubuntu 20.04
#
# This container is the ONE container in the lab that runs ROS 2 Foxy
# instead of Humble. The reason is purely infrastructural: OSRF removed
# Gazebo Classic 11 from its Jammy apt channel post-EOL (the metadata
# remains but the binaries are gone for both amd64 and arm64), and
# Ubuntu's universe build is also amd64-only on Jammy. There is no
# working apt-accessible Gazebo Classic 11 install for Jammy on either
# architecture in 2026.
#
# Focal still has working OSRF packages for both amd64 AND arm64, so we
# stay on Focal here and use ROS 2 Foxy (the Tier-1 ROS 2 distribution
# for Focal). Foxy reached EOL in May 2023 but its packages still
# install fine, and DVD is intentionally vulnerable — we're not relying
# on Foxy for security patches.
#
# The companion-computer container stays on Ubuntu 22.04 + ROS 2 Humble.
# Cross-version interop between Foxy and Humble is handled by Cyclone
# DDS with a shared ROS_DOMAIN_ID=42 — sensor_msgs/msg/Image and the
# other message types we use are wire-compatible across both releases.
#
# From an attacker's perspective the graph looks like a single ROS 2
# deployment; the attack walkthroughs all work unchanged.
#
# Gazebo Classic stays per Phase 1 constraint #1 (gzweb depends on it).
# ArduPilot SITL still talks to Gazebo over the native libArduPilotPlugin
# UDP channel, not through ROS.
FROM ubuntu:20.04

EXPOSE 8000 8080 9002

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# ---------------------------------------------------------------------------
# Base OS packages
# ---------------------------------------------------------------------------
RUN apt update -y && apt install -y --no-install-recommends \
        lsb-release wget curl gnupg2 ca-certificates \
        docker.io git npm net-tools nano cmake build-essential \
        rapidjson-dev libjansson-dev imagemagick libboost-dev libtinyxml-dev \
        python3 python3-pip xvfb ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Gazebo Classic 11 from OSRF (Focal channel — multi-arch).
# OSRF's focal/main has gazebo11 binaries for both amd64 and arm64.
# ---------------------------------------------------------------------------
RUN wget https://packages.osrfoundation.org/gazebo.gpg \
        -O /usr/share/keyrings/pkgs-osrf-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/pkgs-osrf-archive-keyring.gpg] http://packages.osrfoundation.org/gazebo/ubuntu-stable $(lsb_release -cs) main" \
        | tee /etc/apt/sources.list.d/gazebo-stable.list > /dev/null && \
    apt update -y && apt install -y --no-install-recommends \
        gazebo11 libgazebo11-dev \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# ROS 2 Foxy (on focal).
#
# Why Foxy and not Humble: Humble is jammy-only, and we can't be on
# jammy in this container (see header comment). Foxy is the Tier-1 ROS 2
# distribution for focal and is multi-arch. DDS interop with the
# companion-computer's Humble nodes is handled by Cyclone DDS — the wire
# protocol (RTPS) is stable across ROS 2 versions.
# ---------------------------------------------------------------------------
RUN curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key \
        -o /usr/share/keyrings/ros-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu focal main" \
        > /etc/apt/sources.list.d/ros2.list && \
    apt update -y && apt install -y --no-install-recommends \
        ros-foxy-ros-base \
        ros-foxy-gazebo-ros-pkgs \
        ros-foxy-image-transport \
        ros-foxy-rmw-cyclonedds-cpp \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# DDS config — explicit unicast peers (no multicast over Docker bridge)
# ---------------------------------------------------------------------------
COPY dds/cyclonedds.xml /etc/cyclonedds.xml
ENV RMW_IMPLEMENTATION=rmw_cyclonedds_cpp \
    CYCLONEDDS_URI=file:///etc/cyclonedds.xml \
    ROS_DOMAIN_ID=42

# ---------------------------------------------------------------------------
# ArduPilot Gazebo plugin — pure Gazebo Classic, no ROS dependency
# ---------------------------------------------------------------------------
WORKDIR /Simulator

RUN git clone https://github.com/nicholasaleks/ardupilot_gazebo.git

COPY simulator/assets/models /Simulator/ardupilot_gazebo/models
COPY simulator/assets/worlds /Simulator/ardupilot_gazebo/worlds

RUN cd ardupilot_gazebo && \
    mkdir build && cd build && \
    cmake .. && \
    make -j4
WORKDIR /Simulator

# Gazebo env. /opt/ros/foxy/lib is on GAZEBO_PLUGIN_PATH so Foxy's
# libgazebo_ros_camera.so (the ROS 2 build of the plugin) is
# discoverable when the iris model's camera sensor loads it.
ENV GAZEBO_MODEL_PATH=/Simulator/ardupilot_gazebo/models:/usr/share/gazebo-11/models:${GAZEBO_MODEL_PATH}
ENV GAZEBO_RESOURCE_PATH=/Simulator/ardupilot_gazebo/worlds:/usr/share/gazebo-11:${GAZEBO_RESOURCE_PATH}
ENV GAZEBO_PLUGIN_PATH=/Simulator/ardupilot_gazebo/build:/usr/lib/aarch64-linux-gnu/gazebo-11/plugins:/usr/lib/x86_64-linux-gnu/gazebo-11/plugins:/opt/ros/foxy/lib:${GAZEBO_PLUGIN_PATH}
ENV GAZEBO_MODEL_DATABASE_URI=''
ENV DISPLAY=:100

# ---------------------------------------------------------------------------
# gzweb — UNCHANGED per migration constraint #1
# ---------------------------------------------------------------------------
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash \
    && export NVM_DIR="$HOME/.nvm" \
    && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" \
    && nvm install 10 \
    && nvm use 10 \
    && npm install -g npm@6

RUN git config --global advice.detachedHead false

COPY simulator/gzweb /Simulator/gzweb
WORKDIR /Simulator/gzweb
RUN apt-get update && apt-get install -y dos2unix
RUN find . -type f -exec dos2unix {} \; && chmod +x deploy.sh
RUN npm install v8flags grunt-cli
RUN npm install
RUN /bin/bash -c "source /usr/share/gazebo/setup.sh && npm run deploy -- -m local"

# ---------------------------------------------------------------------------
# DVD mgmt web app
# ---------------------------------------------------------------------------
RUN pip3 install --no-cache-dir \
    Flask \
    flask-cors \
    Flask-SQLAlchemy \
    requests \
    flask-sock \
    "python-socketio[client]==5.11.2" \
    docker

COPY simulator/mgmt /Simulator/mgmt

RUN rm -rf /Simulator/mgmt/instance/stages.db

RUN rm -rf /tmp/.X*

# ROS 2 Python launch file. Launch file syntax is identical between
# Foxy and Humble (LaunchDescription / IncludeLaunchDescription /
# PythonLaunchDescriptionSource / FindPackageShare are all stable since
# Dashing), so the same file works without modification.
COPY simulator/damn-vulnerable-drone.launch.py /Simulator/damn-vulnerable-drone.launch.py

CMD rm -rf /tmp/.X100-lock; \
    Xvfb :100 -screen 0 1600x1200x16 & \
    bash -c "source /opt/ros/foxy/setup.bash && \
             ros2 launch /Simulator/damn-vulnerable-drone.launch.py & \
             cd /Simulator/gzweb && sleep 15 && npm start > /dev/null 2>&1 & \
             cd /Simulator/mgmt && sleep 15 && python3 app.py"
