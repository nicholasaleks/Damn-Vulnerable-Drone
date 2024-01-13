# SIMULATOR CONTAINER
# Use a lightweight base image like Ubuntu
FROM ubuntu:20.04

# Avoid prompts during package installation
ENV DEBIAN_FRONTEND noninteractive

# Add the OSRF repository for Gazebo
RUN apt-get update && apt-get install -y gnupg2 lsb-release wget
RUN sh -c 'echo "deb http://packages.osrfoundation.org/gazebo/ubuntu-stable `lsb_release -cs` main" > /etc/apt/sources.list.d/gazebo-stable.list'
RUN wget https://packages.osrfoundation.org/gazebo.key -O - | apt-key add -

# Install Gazebo 11 and dependencies
RUN apt-get update && apt-get install -y \
    gazebo11 \
    libgazebo11-dev \
    libjansson-dev \
    libboost-dev \
    imagemagick \
    libtinyxml-dev \
    mercurial \
    cmake \
    git \
    nodejs \ 
    npm \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js using Node Version Manager (NVM)
RUN apt-get update && apt-get install -y curl
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
ENV NVM_DIR /root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install 8

# Clone GzWeb and build it
USER root
WORKDIR /root
RUN git clone https://github.com/osrf/gzweb
WORKDIR /root/gzweb
RUN git checkout gzweb_1.4.1
RUN /bin/bash -c "source /usr/share/gazebo/setup.sh && npm run deploy --- -m"

# Set up a user environment, replace '1000' with your user / group id
RUN useradd -m gazebo -u 1000 && \
    echo "gazebo:gazebo" | chpasswd && \
    usermod --shell /bin/bash gazebo && \
    usermod -aG sudo gazebo && \
    mkdir -p /etc/sudoers.d/ && \
    echo "gazebo ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/gazebo && \
    chmod 0440 /etc/sudoers.d/gazebo && \
    usermod  --uid 1000 gazebo && \
    groupmod --gid 1000 gazebo

USER gazebo
WORKDIR /home/gazebo

# Clone and build GzWeb
RUN git clone https://github.com/osrf/gzweb && \
    cd gzweb && \
    git checkout gzweb_1.4.1 && \
    /bin/bash -c "source /usr/share/gazebo/setup.sh && npm run deploy --- -m"

CMD ["/bin/bash", "-c", "cd /home/gazebo/gzweb && npm start"]