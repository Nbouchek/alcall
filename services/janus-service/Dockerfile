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
    zlib1g-dev \
    pkg-config \
    gengetopt \
    libtool \
    automake \
    git \
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
COPY config/ /opt/janus/etc/janus/

# Expose port (will be overridden by Render)
EXPOSE 8088

# Use CMD with bash -c for port substitution
CMD bash -c "echo 'Starting Janus with PORT: $PORT' && if [ ! -z \"\$PORT\" ]; then echo 'Updating port from 8088 to $PORT' && sed -i 's/port = 8088/port = $PORT/' /opt/janus/etc/janus/janus.transport.http.jcfg && echo 'Updated config:' && cat /opt/janus/etc/janus/janus.transport.http.jcfg; else echo 'No PORT environment variable, using default 8088'; fi && echo 'Starting Janus...' && exec /opt/janus/bin/janus -F /opt/janus/etc/janus -L 4 -d 5"
