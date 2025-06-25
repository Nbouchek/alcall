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
COPY config/janus.transport.http.jcfg /opt/janus/etc/janus/
COPY config/janus.transport.websockets.jcfg /opt/janus/etc/janus/

# Create a startup script that sets the port dynamically
RUN echo '#!/bin/bash\n\
# Update port in HTTP config based on PORT environment variable\n\
if [ ! -z "$PORT" ]; then\n\
    sed -i "s/port = 8088/port = $PORT/" /opt/janus/etc/janus/janus.transport.http.jcfg\n\
fi\n\
\n\
# Start Janus\n\
exec /opt/janus/bin/janus -F /opt/janus/etc/janus -L 4 -d 5\n\
' > /opt/janus/start.sh && chmod +x /opt/janus/start.sh

# Expose ports
EXPOSE 8088 8089 8000 10000-10200/udp

# Start Janus using the startup script
CMD ["/opt/janus/start.sh"]
