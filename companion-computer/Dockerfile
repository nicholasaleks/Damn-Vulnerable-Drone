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

WORKDIR /

# Define environment variable for architecture
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

# Get Conf file
RUN mkdir -p /etc/mavlink-router
#COPY companion-computer/conf/mavlink-router.conf /etc/mavlink-router/main.conf

#RUN /usr/bin/mavlink-routerd &

# Web Interface Setup
###########################
RUN pip3 install flask docker flask-cors Flask-SQLAlchemy flask-socketio
COPY companion-computer/interface /interface
COPY companion-computer/interface/config.json /interface/config.json
RUN mkdir -p /var/log/mavlink-router
COPY companion-computer/init /init
RUN chmod +x /init
RUN mkdir -p /logs

CMD /bin/bash -c "\
    socat pty,link=/dev/ttyUSB0,raw,echo=0 unix-connect:/sockets/socket.sock & \
    sleep 5 && \
    echo 'Starting Companion Computer...' && \
    python3 /interface/app.py"