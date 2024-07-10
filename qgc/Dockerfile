
ARG BASEIMAGE
ARG BASETAG

FROM ${BASEIMAGE}:${BASETAG} as stage_apt

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



FROM ${BASEIMAGE}:${BASETAG} as stage_final

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ENV \
    DEBIAN_FRONTEND=noninteractive \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8

RUN \
    sed -i 's/archive.ubuntu.com/mirror.kakao.com/g' /etc/apt/sources.list

COPY ./qgc/aptDeps.txt /tmp/aptDeps.txt

# UPGRADE THE BASIC ENVIRONMENT FIRST
RUN \
    --mount=type=cache,target=/var/cache/apt,from=stage_apt,source=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt,from=stage_apt,source=/var/lib/apt \
    --mount=type=cache,target=/etc/apt/sources.list.d,from=stage_apt,source=/etc/apt/sources.list.d \
    apt-get upgrade -y

# INSTALL ca-certificates TO AVOID CERTIFICATE ERROR FOR KISAK MESA DRIVERS
RUN \
    --mount=type=cache,target=/var/cache/apt,from=stage_apt,source=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt,from=stage_apt,source=/var/lib/apt \
    --mount=type=cache,target=/etc/apt/sources.list.d,from=stage_apt,source=/etc/apt/sources.list.d \
    apt-get install --no-install-recommends -y \
        ca-certificates

# INSTALL PACKAGES AVAILABLE BY APT REPOSITORY
RUN \
    --mount=type=cache,target=/var/cache/apt,from=stage_apt,source=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt,from=stage_apt,source=/var/lib/apt \
    --mount=type=cache,target=/etc/apt/sources.list.d,from=stage_apt,source=/etc/apt/sources.list.d \
    apt-get install --no-install-recommends -y $(cat /tmp/aptDeps.txt) \
    && rm -rf /tmp/*

RUN \
    groupadd user \
    && useradd -ms /bin/bash user -g user \
    && usermod -a -G dialout user

COPY ./qgc/config /home/user/.config/QGroundControl.org

RUN \
    wget -P /home/user https://d176tv9ibo4jno.cloudfront.net/latest/QGroundControl.AppImage \
    && chmod +x /home/user/QGroundControl.AppImage \
    && chown -R user:user /home/user

USER user
WORKDIR /home/user

# ENTRYPOINT SCRIPT
# SET PERMISSION SO THAT USER CAN EDIT INSIDE THE CONTAINER
COPY --chown=user:user ./qgc/entrypoint.sh /usr/local/bin/entrypoint.sh

# CREATE SYMBOLIC LINK FOR QUICK ACCESS
RUN \
    mkdir /home/user/scripts \
    && ln -s /usr/local/bin/entrypoint.sh /home/user/scripts/entrypoint.sh

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]
