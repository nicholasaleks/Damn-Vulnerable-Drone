# GROUND CONTROL STATION
FROM ubuntu:22.04

# Avoid prompts during package installations
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    apt-utils \
    curl \
    isc-dhcp-client \
    iproute2 \
    dhcpd \
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

COPY ground-control-station/wpa_supplicant.conf /etc/wpa_supplicant/wpa_supplicant.conf
COPY ground-control-station/start.sh /start.sh

# Get vwifi
RUN git clone https://github.com/Raizo62/vwifi.git
WORKDIR /vwifi
RUN make
RUN make tools
RUN make install

WORKDIR /

ENTRYPOINT /start.sh