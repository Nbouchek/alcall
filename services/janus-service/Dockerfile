FROM ubuntu:20.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Add Janus PPA and install Janus
RUN apt-get update && apt-get install -y \
    janus \
    && rm -rf /var/lib/apt/lists/*

# Create necessary directories
RUN mkdir -p /opt/janus/etc/janus /opt/janus/logs

# Copy configuration files
COPY config/janus.plugin.audiobridge.jcfg /opt/janus/etc/janus/
COPY config/janus.transport.http.jcfg /opt/janus/etc/janus/
COPY config/janus.transport.websockets.jcfg /opt/janus/etc/janus/

# Expose ports
EXPOSE 8088 8089 8000 10000-10200/udp

# Start Janus
CMD ["janus", "-F", "/opt/janus/etc/janus", "-L", "4", "-d", "5"]
