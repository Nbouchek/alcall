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

# Create startup script that handles dynamic port
RUN echo '#!/bin/bash' > /opt/janus/start.sh && \
    echo 'echo "Starting Janus with PORT: $PORT"' >> /opt/janus/start.sh && \
    echo 'if [ ! -z "$PORT" ]; then' >> /opt/janus/start.sh && \
    echo '  echo "Updating port from 8088 to $PORT"' >> /opt/janus/start.sh && \
    echo '  sed -i "s/port = 8088/port = $PORT/" /opt/janus/etc/janus/janus.transport.http.jcfg' >> /opt/janus/start.sh && \
    echo '  echo "Updated config:"' >> /opt/janus/start.sh && \
    echo '  cat /opt/janus/etc/janus/janus.transport.http.jcfg' >> /opt/janus/start.sh && \
    echo 'else' >> /opt/janus/start.sh && \
    echo '  echo "No PORT environment variable, using default 8088"' >> /opt/janus/start.sh && \
    echo 'fi' >> /opt/janus/start.sh && \
    echo 'echo "Starting Janus..."' >> /opt/janus/start.sh && \
    echo 'exec /opt/janus/bin/janus -F /opt/janus/etc/janus -L 4 -d 5' >> /opt/janus/start.sh && \
    chmod +x /opt/janus/start.sh

# Expose port (will be overridden by Render)
EXPOSE 8088

# Use startup script
ENTRYPOINT ["/opt/janus/start.sh"]
