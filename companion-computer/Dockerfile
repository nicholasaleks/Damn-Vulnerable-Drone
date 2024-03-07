FROM ubuntu:22.04

# Avoid prompts during package installations
ENV DEBIAN_FRONTEND=noninteractive

EXPOSE 3000

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
    expect \
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

RUN git clone https://github.com/stephendade/Rpanion-server.git

RUN sed -i 's|sudo hostnamectl set-hostname rpanion --static|# &|' /Rpanion-server/deploy/RasPi-ubuntu22-deploy.sh
RUN sed -i 's|sudo systemctl stop unattended-upgrades.service|# &|' /Rpanion-server/deploy/RasPi-ubuntu22-deploy.sh
RUN sed -i 's|sudo apt -y remove needrestart|# &|' /Rpanion-server/deploy/RasPi-ubuntu22-deploy.sh

RUN chmod +x /Rpanion-server/deploy/RasPi-ubuntu22-deploy.sh

WORKDIR /Rpanion-server/deploy

RUN npm install react-scripts --save

RUN npm run build

RUN PORT=3000

RUN npm run server &

COPY companion-computer/init /init
RUN chmod +x /init

CMD /bin/bash -c "\
    socat pty,link=/dev/ttyUSB0,raw,echo=0 unix-connect:/sockets/socket.sock & \
    sleep 20 && \
    echo 'Starting Companion Computer...' && \
    /usr/bin/expect /init"

# To connect to the drone via MAVProxy:
# mavproxy.py --master=/dev/ttyUSB0 --baudrate 57600 --out=udp:10.13.0.4:14550