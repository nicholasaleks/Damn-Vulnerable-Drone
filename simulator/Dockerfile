# SIMULATOR CONTAINER GAZEBO 11
# Use a lightweight base image like Ubuntu
FROM ubuntu:20.04

EXPOSE 8000 8080 9002

# Set environment variable to avoid prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

RUN apt update -y && apt install lsb-release wget gnupg -y

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
    python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Create Symbolic link for python2.7
RUN ln -s /usr/bin/python2.7 /usr/bin/python

# Install ArduPilot Gazebo Plugin
WORKDIR /Simulator

RUN git clone https://github.com/khancyr/ardupilot_gazebo.git
COPY simulator/assets/model.sdf /Simulator/ardupilot_gazebo/models/iris_with_ardupilot/model.sdf

RUN cd ardupilot_gazebo && \
    mkdir build && cd build && \
    cmake .. && \
    make -j4
WORKDIR /Simulator

# Setup gazebo environment variables
ENV GAZEBO_MODEL_PATH /Simulator/ardupilot_gazebo/models:/usr/share/gazebo-11/models:${GAZEBO_MODEL_PATH}
ENV GAZEBO_RESOURCE_PATH /Simulator/ardupilot_gazebo/worlds:/usr/share/gazebo-11:/usr/share/gazebo-11:${GAZEBO_RESOURCE_PATH}
ENV GAZEBO_PLUGIN_PATH /Simulator/ardupilot_gazebo/build:/usr/lib/aarch64-linux-gnu/gazebo-11/plugins:${GAZEBO_PLUGIN_PATH}
ENV GAZEBO_MODEL_DATABASE_URI ''

RUN npm install -g n
RUN n 8.14.0

# Ignore git warnings
RUN git config --global advice.detachedHead false

# Clone GzWeb
RUN git clone https://github.com/osrf/gzweb && \
    cd gzweb && \
    git checkout gzweb_1.4.1

# Build GzWeb
RUN cd /Simulator/gzweb && /bin/bash -c "source /usr/share/gazebo/setup.sh && npm run deploy --- -m local"

# Modify GzWeb CSS
COPY simulator/assets/gz3d.css /Simulator/gzweb/http/client/style/gz3d.css

# Install Damn Vulnerable Drone Sim Mgmt Web App
RUN pip3 install flask
COPY simulator/mgmt /Simulator/mgmt

# Run the Gazebo Server and Web App
CMD gzserver --verbose /Simulator/ardupilot_gazebo/worlds/iris_arducopter_runway.world & \
    cd /Simulator/gzweb && sleep 15 && npm start & \
    cd /Simulator/mgmt && sleep 15 && python3 app.py