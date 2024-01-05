# FLIGHT CONTROL UNIT CONTAINER
FROM ubuntu:22.04

ARG COPTER_TAG=Copter-4.4
ARG DEBIAN_FRONTEND=noninteractive
ARG USER_NAME=ardupilot
ARG USER_UID=1000
ARG USER_GID=1000
ARG SKIP_AP_EXT_ENV=1
ARG SKIP_AP_GRAPHIC_ENV=1
ARG SKIP_AP_COV_ENV=1
ARG SKIP_AP_GIT_CHECK=1

# Create User & Group
RUN groupadd ${USER_NAME} --gid ${USER_GID}\
    && useradd -l -m ${USER_NAME} -u ${USER_UID} -g ${USER_GID} -s /bin/bash

# Install prerequisites 
RUN apt-get update && apt-get install -y sudo socat lsb-release tzdata git; git config --global url."https://github.com/".insteadOf git://github.com/

# Clone ArduPilot from GitHub
RUN git clone https://github.com/ArduPilot/ardupilot.git ardupilot
WORKDIR /ardupilot

# Create non root user for pip
ENV USER=${USER_NAME}

RUN echo "ardupilot ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/${USER_NAME}
RUN chmod 0440 /etc/sudoers.d/${USER_NAME}

RUN chown -R ${USER_NAME}:${USER_NAME} /${USER_NAME}

USER ${USER_NAME}

# Checkout ArduCopter...
RUN git checkout ${COPTER_TAG}

# Update submodules
RUN git submodule update --init --recursive

# Build ArduPilot
ENV SKIP_AP_EXT_ENV=$SKIP_AP_EXT_ENV SKIP_AP_GRAPHIC_ENV=$SKIP_AP_GRAPHIC_ENV SKIP_AP_COV_ENV=$SKIP_AP_COV_ENV SKIP_AP_GIT_CHECK=$SKIP_AP_GIT_CHECK
RUN Tools/environment_install/install-prereqs-ubuntu.sh -y

RUN ./waf distclean
RUN ./waf configure --board sitl
RUN ./waf copter

EXPOSE 5760/tcp

# Variables for simulator
ENV INSTANCE 0
ENV LAT 42.3898
ENV LON -71.1476
ENV ALT 14
ENV DIR 270
ENV MODEL +
ENV SPEEDUP 1
ENV VEHICLE ArduCopter

COPY ./flight-controller/init.sh /ardupilot/mgmt/init.sh
RUN sudo chmod +x /ardupilot/mgmt/init.sh

ENTRYPOINT mgmt/init.sh