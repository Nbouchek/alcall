FROM ubuntu:20.04

# Avoid interactive prompts during package installation
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
    pkg-config \
    gengetopt \
    libtool \
    automake \
    git \
    wget \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Clone and build Janus
WORKDIR /opt
RUN git clone https://github.com/meetecho/janus-gateway.git
WORKDIR /opt/janus-gateway

# Build Janus
RUN sh autogen.sh && \
    ./configure --prefix=/opt/janus && \
    make && \
    make install

# Create configuration directory
RUN mkdir -p /opt/janus/etc/janus

# Copy configuration files
COPY janus.plugin.audiobridge.jcfg /opt/janus/etc/janus/
COPY janus.transport.http.jcfg /opt/janus/etc/janus/
COPY janus.transport.websockets.jcfg /opt/janus/etc/janus/

# Create startup script
RUN echo '#!/bin/bash\n\
cd /opt/janus\n\
./bin/janus --configs-folder=/opt/janus/etc/janus\n\
' > /opt/janus/start.sh && chmod +x /opt/janus/start.sh

# Expose ports
EXPOSE 8088 8089 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8088/janus/info || exit 1

# Start Janus
CMD ["/opt/janus/start.sh"]
