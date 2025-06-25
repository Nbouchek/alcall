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
    ./configure --prefix=/opt/janus && \
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

# Create startup script that MUST handle Render's PORT environment variable
COPY start.sh /opt/janus/start-janus.sh
RUN chmod +x /opt/janus/start-janus.sh

# Expose port (Render will override this)
EXPOSE $PORT

# Use the startup script
CMD ["/opt/janus/start-janus.sh"]
