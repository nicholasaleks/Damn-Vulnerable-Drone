FROM ubuntu:22.04

# Avoid prompts during package installations
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    apt-utils \
    curl \
    iproute2 \
    kmod \
    nano \
    hostapd \
    wpasupplicant \
    git \
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
    && rm -rf /var/lib/apt/lists/*

COPY ground-control-station/start.sh /start.sh

ENTRYPOINT /start.sh