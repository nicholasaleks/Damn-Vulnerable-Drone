# GROUND CONTROL STATION CONTAINER
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    apt-utils \
    curl \
    iproute2 \
    nano \
    net-tools \
    iputils-ping \
    python3 \
    python3-pip \
    expect \
    && pip3 install future pymavlink MAVProxy mavsdk \
    && rm -rf /var/lib/apt/lists/*

COPY ground-control-station/stages/arm-and-takeoff.py /arm-and-takeoff.py
COPY ground-control-station/stages/autopilot-flight.py /autopilot-flight.py
COPY ground-control-station/stages/return-to-land.py /return-to-land.py
COPY ground-control-station/stages/post-flight-analysis.py /post-flight-analysis.py
COPY ground-control-station/missions /missions

CMD echo "Ground Control Online..." && tail -f /dev/null