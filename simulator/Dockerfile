# SIMULATOR CONTAINER GAZEBO 11
# Use a lightweight base image like Ubuntu
FROM ubuntu:20.04

EXPOSE 8000 8080 9002

# Set environment variable to avoid prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

RUN apt update -y && apt install lsb-release wget gnupg docker.io -y

RUN wget https://packages.osrfoundation.org/gazebo.gpg -O /usr/share/keyrings/pkgs-osrf-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/pkgs-osrf-archive-keyring.gpg] http://packages.osrfoundation.org/gazebo/ubuntu-stable $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/gazebo-stable.list > /dev/null && \
    apt update -y && \
    apt install -y gazebo11 \
    libgazebo11-dev \
    git \
    npm \
    net-tools \
    nano \
    cmake \
    build-essential \
    rapidjson-dev \
    mercurial \
    libjansson-dev \
    imagemagick \
    libboost-dev \
    libtinyxml-dev \
    python3 \
    xvfb \
    curl \
    gnupg2 \
    lsb-release \
    ffmpeg \
    python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Create Symbolic link for python2.7
RUN ln -s /usr/bin/python2.7 /usr/bin/python

# Install ROS
RUN curl -s https://raw.githubusercontent.com/ros/rosdistro/master/ros.asc | apt-key add -
RUN sh -c 'echo "deb http://packages.ros.org/ros/ubuntu `lsb_release -cs` main" > /etc/apt/sources.list.d/ros-latest.list'
RUN apt update -y && apt install -y ros-noetic-ros-base ros-noetic-gazebo-ros-pkgs ros-noetic-image-transport

# Install ArduPilot Gazebo Plugin
WORKDIR /Simulator

RUN git clone https://github.com/khancyr/ardupilot_gazebo.git

# Move assets to the right place
# 3D Models
COPY simulator/assets/models /Simulator/ardupilot_gazebo/models

# 3D World
COPY simulator/assets/worlds /Simulator/ardupilot_gazebo/worlds

RUN cd ardupilot_gazebo && \
    mkdir build && cd build && \
    cmake .. && \
    make -j4
WORKDIR /Simulator

# Setup gazebo environment variables
ENV GAZEBO_MODEL_PATH /Simulator/ardupilot_gazebo/models:/usr/share/gazebo-11/models:${GAZEBO_MODEL_PATH}
ENV GAZEBO_RESOURCE_PATH /Simulator/ardupilot_gazebo/worlds:/usr/share/gazebo-11:/usr/share/gazebo-11:${GAZEBO_RESOURCE_PATH}
ENV GAZEBO_PLUGIN_PATH /Simulator/ardupilot_gazebo/build:/usr/lib/aarch64-linux-gnu/gazebo-11/plugins:/usr/lib/x86_64-linux-gnu/gazebo-11/plugins:/opt/ros/noetic/lib:${GAZEBO_PLUGIN_PATH}
ENV GAZEBO_MODEL_DATABASE_URI ''
ENV DISPLAY :100

RUN npm install -g n
RUN n 8.14.0

# Ignore git warnings
RUN git config --global advice.detachedHead false

# Pull & build gzweb
COPY simulator/gzweb /Simulator/gzweb
WORKDIR /Simulator/gzweb
RUN apt-get update && apt-get install -y dos2unix
RUN find . -type f -exec dos2unix {} \; && chmod +x deploy.sh
RUN npm install
RUN /bin/bash -c "source /usr/share/gazebo/setup.sh && npm run deploy -- -m local"


# Install Damn Vulnerable Drone Sim Mgmt Web App
RUN pip3 install flask docker flask-cors Flask-SQLAlchemy markdown
COPY simulator/mgmt /Simulator/mgmt

RUN rm -rf /Simulator/mgmt/instance/stages.db

RUN rm -rf /tmp/.X*
RUN export DISPLAY=:100

# Move launch file
COPY simulator/damn-vulnerable-drone.launch /Simulator/damn-vulnerable-drone.launch

CMD rm -rf /tmp/.X100-lock; \
    Xvfb :100 -screen 0 1600x1200x16 & \
    bash -c "source /opt/ros/noetic/setup.bash && \
             roslaunch /Simulator/damn-vulnerable-drone.launch & \
             cd /Simulator/gzweb && sleep 15 && npm start > /dev/null 2>&1 & \
             cd /Simulator/mgmt && sleep 15 && python3 app.py"