FROM meetecho/janus-gateway:latest

# Copy configuration files
COPY config/janus.plugin.audiobridge.jcfg /opt/janus/etc/janus/
COPY config/janus.plugin.videoroom.jcfg /opt/janus/etc/janus/
COPY config/janus.transport.http.jcfg /opt/janus/etc/janus/
COPY config/janus.transport.websockets.jcfg /opt/janus/etc/janus/

# Expose ports
EXPOSE 8088 8089 8000 10000-10200/udp

# Start Janus
CMD ["janus", "-F", "/opt/janus/etc/janus", "-L", "4", "-d", "5"]
