# DVD Simulator (Lite): mgmt web app only — no Gazebo, no gz_web, no ROS.
#
# This branch drops the ROS install entirely. The master branch installed
# ros-noetic-ros-base and ran roscore here, but lite mode has no Gazebo
# (so no /webcam/image_raw publisher) and no ROS subscribers. The roscore
# was a no-op. In ROS 2 there is no roscore concept either (DDS is
# peer-to-peer), so this layer was removed.
FROM ubuntu:22.04

EXPOSE 8000

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    LC_ALL=C.UTF-8 \
    LANG=C.UTF-8 \
    LITE=1 \
    MAV2REST_URL=http://companion-computer:3000

# Base OS + Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates \
    python3 python3-pip python3-venv python3-setuptools \
    sqlite3 \
 && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir \
    Flask \
    flask-cors \
    Flask-SQLAlchemy \
    requests \
    flask-sock \
    "python-socketio[client]==5.11.2" \
    docker

# Copy ONLY the mgmt app from the full project.
# IMPORTANT: build context is the repo root so this path is valid.
WORKDIR /app
COPY simulator/mgmt /app/simulator/mgmt

# Fresh DB each boot (optional: remove if you mount a volume for persistence)
RUN mkdir -p /app/simulator/mgmt/instance && \
    rm -f /app/simulator/mgmt/instance/stages.db || true

# Environment for Flask app
ENV FLASK_APP=simulator.mgmt.app \
    FLASK_RUN_HOST=0.0.0.0 \
    FLASK_RUN_PORT=8000

CMD ["python3", "/app/simulator/mgmt/app.py"]
