# GROUND CONTROL STATION CONTAINER
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    apt-utils \
    curl \
    iproute2 \
    nano \
    net-tools \
    wpasupplicant \
    isc-dhcp-client \
    iputils-ping \
    python3 \
    python3-pip \
    wget \
    git \
    make \
    g++ \
    expect \
    libnl-3-dev \
    libnl-genl-3-dev \
    expect \
    && pip3 install future pymavlink MAVProxy mavsdk \
    && rm -rf /var/lib/apt/lists/*

COPY ground-control-station/conf/wpa_supplicant.conf /etc/wpa_supplicant/wpa_supplicant.conf

COPY ground-control-station/stages/arm-and-takeoff.py /arm-and-takeoff.py
COPY ground-control-station/stages/autopilot-flight.py /autopilot-flight.py
COPY ground-control-station/stages/return-to-land.py /return-to-land.py
COPY ground-control-station/stages/post-flight-analysis.py /post-flight-analysis.py
COPY ground-control-station/missions /missions
COPY ground-control-station/init /init
RUN chmod +x /init

CMD echo "Ground Control Online..." && /usr/bin/expect /init