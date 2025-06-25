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
    sed \
    && rm -rf /var/lib/apt/lists/*

# Clone and build Janus WebRTC
RUN cd /tmp && \
    git clone https://github.com/meetecho/janus-gateway.git && \
    cd janus-gateway && \
    ./autogen.sh && \
    ./configure --prefix=/opt/janus --enable-plugin-lua && \
    make && \
    make install && \
    rm -rf /tmp/janus-gateway

# Create necessary directories and verify installation
RUN mkdir -p /opt/janus/etc/janus /opt/janus/lib/janus/plugins /opt/janus/lib/janus/transports && \
    ls -la /opt/janus/bin/ && \
    ls -la /opt/janus/lib/janus/ && \
    echo "Janus installation verification complete"

# Copy configuration files
COPY config/ /opt/janus/etc/janus/

# Expose port (Render will override this)
EXPOSE $PORT

# Use a simple inline script to debug and configure ports
CMD echo "=== DEBUG: Container starting ===" && \
    echo "DEBUG: PORT environment variable = '$PORT'" && \
    echo "DEBUG: Current working directory = $(pwd)" && \
    echo "DEBUG: Listing /opt/janus/etc/janus/" && \
    ls -la /opt/janus/etc/janus/ && \
    echo "DEBUG: Original config:" && \
    cat /opt/janus/etc/janus/janus.transport.http.jcfg && \
    JANUS_PORT=${PORT:-10000} && \
    WS_PORT=$((JANUS_PORT + 1)) && \
    echo "DEBUG: Using ports HTTP=$JANUS_PORT, WS=$WS_PORT" && \
    sed -i "s/RENDER_PORT_PLACEHOLDER/$JANUS_PORT/g" /opt/janus/etc/janus/janus.transport.http.jcfg && \
    sed -i "s/RENDER_WS_PORT_PLACEHOLDER/$WS_PORT/g" /opt/janus/etc/janus/janus.transport.http.jcfg && \
    echo "DEBUG: Updated config:" && \
    cat /opt/janus/etc/janus/janus.transport.http.jcfg && \
    echo "DEBUG: Starting Janus..." && \
    exec /opt/janus/bin/janus -F /opt/janus/etc/janus -L 4 -d 5
