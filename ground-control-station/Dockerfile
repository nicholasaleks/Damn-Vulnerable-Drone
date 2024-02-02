# GROUND CONTROL STATION CONTAINER
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    apt-utils \
    curl \
    iproute2 \
    nano \
    net-tools \
    iputils-ping \
    python3 \
    python3-pip \
    && pip3 install future pymavlink MAVProxy mavsdk \
    && rm -rf /var/lib/apt/lists/*

CMD echo "Ground Control Online..." && tail -f /dev/null

# mavproxy.py --master=udp:10.13.0.4:14550