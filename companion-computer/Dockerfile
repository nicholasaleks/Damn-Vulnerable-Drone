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
    && rm -rf /var/lib/apt/lists/*


COPY companion-computer/dhcpd.conf /etc/dhcp/dhcpd.conf
COPY companion-computer/hostapd.conf /etc/hostapd.conf
COPY companion-computer/isc-dhcp-server /etc/default/isc-dhcp-server
COPY companion-computer/start-server.sh /start-server.sh

# Get vwifi
RUN git clone https://github.com/Raizo62/vwifi.git
WORKDIR /vwifi
RUN make
RUN make tools
RUN make install

WORKDIR /

ENTRYPOINT /start-server.sh