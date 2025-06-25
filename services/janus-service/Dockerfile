FROM ubuntu:20.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libmicrohttpd-dev \
    libjansson-dev \
    libssl-dev \
    libsrtp2-dev \
    libsofia-sip-ua-dev \
    libglib2.0-dev \
    libopus-dev \
    libogg-dev \
    libcurl4-openssl-dev \
    liblua5.3-dev \
    libconfig-dev \
    libnice-dev \
    libssl-dev \
    zlib1g-dev \
    pkg-config \
    gengetopt \
    libtool \
    automake \
    git \
    wget \
    sed \
    && rm -rf /var/lib/apt/lists/*

# Clone and build Janus WebRTC
RUN cd /tmp && \
    git clone https://github.com/meetecho/janus-gateway.git && \
    cd janus-gateway && \
    ./autogen.sh && \
    ./configure --prefix=/opt/janus && \
    make && \
    make install && \
    rm -rf /tmp/janus-gateway

# Create necessary directories
RUN mkdir -p /opt/janus/etc/janus

# Copy configuration files
COPY config/janus.plugin.audiobridge.jcfg /opt/janus/etc/janus/
COPY config/janus.plugin.videoroom.jcfg /opt/janus/etc/janus/
COPY config/janus.plugin.videocall.jcfg /opt/janus/etc/janus/
COPY config/janus.plugin.recordplay.jcfg /opt/janus/etc/janus/
COPY config/janus.plugin.sip.jcfg /opt/janus/etc/janus/
COPY config/janus.plugin.textroom.jcfg /opt/janus/etc/janus/
COPY config/janus.transport.http.jcfg /opt/janus/etc/janus/
COPY config/janus.transport.websockets.jcfg /opt/janus/etc/janus/

# Copy startup script
COPY start.sh /opt/janus/start.sh
RUN chmod +x /opt/janus/start.sh

# Expose ports
EXPOSE 8088 8089 8000 10000-10200/udp

# Start Janus with port configuration
ENTRYPOINT ["/opt/janus/start.sh"]
