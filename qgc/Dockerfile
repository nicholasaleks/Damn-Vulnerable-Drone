ARG BASEIMAGE=ubuntu
ARG BASETAG=22.04
FROM ${BASEIMAGE}:${BASETAG} AS stage_apt

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ENV \
    DEBIAN_FRONTEND=noninteractive \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8

RUN \
    rm -rf /etc/apt/apt.conf.d/docker-clean \
    && echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache \
    && sed -i 's/archive.ubuntu.com/mirror.kakao.com/g' /etc/apt/sources.list \
    && apt-get update

RUN \
    apt install -y \
        ca-certificates \
        curl \
        software-properties-common \
        wget

RUN \
    add-apt-repository ppa:kisak/kisak-mesa -y

# ------------------------------------------------------------------------- #
# FINAL STAGE
# ------------------------------------------------------------------------- #
FROM ${BASEIMAGE}:${BASETAG} AS stage_final

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# 1) Set up environment variables
ENV \
    DEBIAN_FRONTEND=noninteractive \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    LANGUAGE=en_US:en

# 2) Adjust apt sources
RUN sed -i 's/archive.ubuntu.com/mirror.kakao.com/g' /etc/apt/sources.list

# 3) Copy your aptDeps
COPY ./qgc/aptDeps.txt /tmp/aptDeps.txt

# 4) Upgrade environment, install locales, generate en_US.UTF-8
RUN \
    --mount=type=cache,target=/var/cache/apt,from=stage_apt,source=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt,from=stage_apt,source=/var/lib/apt \
    --mount=type=cache,target=/etc/apt/sources.list.d,from=stage_apt,source=/etc/apt/sources.list.d \
    apt-get update && apt-get upgrade -y && \
    apt-get install --no-install-recommends -y locales && \
    locale-gen en_US.UTF-8

# 5) Install ca-certificates 
RUN \
    --mount=type=cache,target=/var/cache/apt,from=stage_apt,source=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt,from=stage_apt,source=/var/lib/apt \
    --mount=type=cache,target=/etc/apt/sources.list.d,from=stage_apt,source=/etc/apt/sources.list.d \
    apt-get install --no-install-recommends -y ca-certificates

# 6) Install everything in aptDeps.txt
RUN \
    --mount=type=cache,target=/var/cache/apt,from=stage_apt,source=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt,from=stage_apt,source=/var/lib/apt \
    --mount=type=cache,target=/etc/apt/sources.list.d,from=stage_apt,source=/etc/apt/sources.list.d \
    apt-get install --no-install-recommends -y $(cat /tmp/aptDeps.txt) && \
    rm -rf /tmp/*

# 7) Create user and groups
RUN groupadd user \
 && useradd -ms /bin/bash user -g user \
 && usermod -a -G dialout user

# 8) Download QGroundControl
RUN \
    wget -P /home/user https://d176tv9ibo4jno.cloudfront.net/latest/QGroundControl.AppImage \
    && chmod +x /home/user/QGroundControl.AppImage \
    && chown -R user:user /home/user

USER user
WORKDIR /home/user

# 9) Entry-point scripts
COPY --chown=user:user ./qgc/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN \
    mkdir /home/user/scripts \
    && ln -s /usr/local/bin/entrypoint.sh /home/user/scripts/entrypoint.sh

# 10) QGC config
COPY ./qgc/config /home/user/.config/QGroundControl.org

CMD tail -f /dev/null
