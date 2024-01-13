FROM ubuntu:22.04

# Avoid prompts during package installations
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    apt-utils \
    curl \
    iproute2 \
    kmod \
    socat \
    nano \
    hostapd \
    dnsmasq \
    isc-dhcp-server \
    wpasupplicant \
    git \
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
    && pip3 install future pymavlink MAVProxy \
    && rm -rf /var/lib/apt/lists/*

COPY companion-computer/conf/dhcpd.conf /etc/dhcp/dhcpd.conf
COPY companion-computer/conf/dnsmasq.conf /etc/dnsmasq.conf
COPY companion-computer/conf/hostapd.conf /etc/hostapd.conf
COPY companion-computer/conf/isc-dhcp-server /etc/default/isc-dhcp-server

# Get vwifi
RUN git clone https://github.com/Raizo62/vwifi.git
WORKDIR /vwifi
RUN make
RUN make tools
RUN make install

WORKDIR /

# mavproxy.py --master=/dev/ttyUSB0 --baudrate 57600

CMD /bin/bash -c "\
    socat pty,link=/dev/ttyUSB0,raw,echo=0 unix-connect:/sockets/socket.sock & \
    sleep 20 && \
    echo 'Starting Companion Computer...' && \
    tail -f /dev/null"