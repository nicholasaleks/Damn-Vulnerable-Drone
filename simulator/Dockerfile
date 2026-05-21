# SIMULATOR CONTAINER — Gazebo Classic 11 + ROS 2 Humble on Ubuntu 22.04
#
# Per the migration constraints, Gazebo Classic stays (NOT Gazebo Sim /
# Ignition) because gzweb is wired to Gazebo Classic. ROS 2 Humble's
# gazebo_ros_pkgs ships Humble bindings for Gazebo Classic 11, so the
# bridge works without changing the simulator's plugin model.
#
# ArduPilot SITL still talks to Gazebo over the native libArduPilotPlugin
# UDP channel (10.13.0.2 -> 10.13.0.5), not through ROS. That's why the
# flight-controller container is untouched by this migration.
#
# PLATFORM PIN: this container is hard-pinned to linux/amd64 at the FROM
# line because Gazebo Classic 11 has no apt-accessible build for arm64
# on Jammy (OSRF dropped arm64, Ubuntu universe is amd64-only, Noble
# replaced Classic with Gazebo Sim). We pin at the Dockerfile level
# rather than only in docker-compose because `docker compose up --build`
# does not reliably honour `build.platforms` from the compose file —
# buildkit silently falls back to the host platform. The Dockerfile pin
# is bulletproof: buildkit must pull the amd64 base image. On Apple
# Silicon hosts the simulator then runs under Docker Desktop's Rosetta 2
# emulation. The other three containers (companion-computer, GCS,
# flight-controller) remain multi-arch so they run natively on arm64.
FROM --platform=linux/amd64 ubuntu:22.04

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
# Gazebo Classic 11 from OSRF (Jammy / amd64).
#
# IMPORTANT: this container is pinned to linux/amd64 in docker-compose
# (see docker-compose.yaml `simulator.platform`). There is no apt-
# accessible Gazebo Classic 11 build for arm64/Jammy from any source:
# OSRF stopped publishing arm64 packages around Gazebo Classic 11 EOL,
# Ubuntu's own universe build is amd64-only on Jammy, and Noble has
# dropped Classic entirely in favour of Gazebo Sim. On Apple Silicon
# hosts the container runs under Docker Desktop's Rosetta 2 amd64
# emulation, which is fast enough for the simulator workload.
#
# We use OSRF rather than Ubuntu universe so that the gazebo version
# (11.10.x via OSRF vs 11.10.2 via Ubuntu) matches the version
# ros-humble-gazebo-ros-pkgs targets in OSRF's reference packaging.
# ---------------------------------------------------------------------------
RUN wget https://packages.osrfoundation.org/gazebo.gpg \
        -O /usr/share/keyrings/pkgs-osrf-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/pkgs-osrf-archive-keyring.gpg] http://packages.osrfoundation.org/gazebo/ubuntu-stable $(lsb_release -cs) main" \
        | tee /etc/apt/sources.list.d/gazebo-stable.list > /dev/null && \
    apt update -y && apt install -y --no-install-recommends \
        gazebo11 libgazebo11-dev \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# ROS 2 Humble (on ubuntu-jammy)
#
# Note: ROS 2 lives at packages.ros.org/ros2/ubuntu (not /ros/ubuntu, which
# is the legacy ROS 1 channel). The apt-key tool used by the master branch
# is deprecated on Jammy, so we use a signed-by keyring file instead.
# ---------------------------------------------------------------------------
RUN curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key \
        -o /usr/share/keyrings/ros-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu jammy main" \
        > /etc/apt/sources.list.d/ros2.list && \
    apt update -y && apt install -y --no-install-recommends \
        ros-humble-ros-base \
        ros-humble-gazebo-ros-pkgs \
        ros-humble-image-transport \
        ros-humble-rmw-cyclonedds-cpp \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# DDS config — explicit unicast peers list (no multicast over Docker bridge)
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

# Gazebo env. Note: /opt/ros/humble/lib remains on GAZEBO_PLUGIN_PATH so
# Humble's libgazebo_ros_camera.so (the ROS 2 build of the plugin) is
# discoverable when the iris model's camera sensor loads it.
ENV GAZEBO_MODEL_PATH=/Simulator/ardupilot_gazebo/models:/usr/share/gazebo-11/models:${GAZEBO_MODEL_PATH}
ENV GAZEBO_RESOURCE_PATH=/Simulator/ardupilot_gazebo/worlds:/usr/share/gazebo-11:${GAZEBO_RESOURCE_PATH}
ENV GAZEBO_PLUGIN_PATH=/Simulator/ardupilot_gazebo/build:/usr/lib/aarch64-linux-gnu/gazebo-11/plugins:/usr/lib/x86_64-linux-gnu/gazebo-11/plugins:/opt/ros/humble/lib:${GAZEBO_PLUGIN_PATH}
ENV GAZEBO_MODEL_DATABASE_URI=''
ENV DISPLAY=:100

# ---------------------------------------------------------------------------
# gzweb — UNCHANGED per migration constraint #1 (Gazebo Classic stays;
# gzweb integration is out of scope)
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

# ROS 2 Python launch file (replaces the ROS 1 XML .launch)
COPY simulator/damn-vulnerable-drone.launch.py /Simulator/damn-vulnerable-drone.launch.py

# `ros2 launch` replaces `roslaunch`. There is no roscore in ROS 2 —
# discovery is peer-to-peer via DDS, so we just launch the gazebo_ros
# wrapper and the camera plugin self-publishes /webcam/image_raw.
CMD rm -rf /tmp/.X100-lock; \
    Xvfb :100 -screen 0 1600x1200x16 & \
    bash -c "source /opt/ros/humble/setup.bash && \
             ros2 launch /Simulator/damn-vulnerable-drone.launch.py & \
             cd /Simulator/gzweb && sleep 15 && npm start > /dev/null 2>&1 & \
             cd /Simulator/mgmt && sleep 15 && python3 app.py"
