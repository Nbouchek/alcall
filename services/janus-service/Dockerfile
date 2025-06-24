FROM ubuntu:20.04

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
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Clone and build Janus
WORKDIR /opt
RUN git clone https://github.com/meetecho/janus-gateway.git
WORKDIR /opt/janus-gateway
RUN sh autogen.sh && \
    ./configure --prefix=/opt/janus && \
    make && \
    make install

# Create necessary directories
RUN mkdir -p /opt/janus/etc/janus /opt/janus/logs

# Copy configuration files
COPY config/janus.plugin.audiobridge.jcfg /opt/janus/etc/janus/
COPY config/janus.transport.http.jcfg /opt/janus/etc/janus/
COPY config/janus.transport.websockets.jcfg /opt/janus/etc/janus/

# Expose ports
EXPOSE 8088 8089 8000 10000-10200/udp

# Start Janus
CMD ["/opt/janus/bin/janus", "-F", "/opt/janus/etc/janus", "-L", "4", "-d", "5"]
