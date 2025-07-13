FROM canyan/janus-gateway:master

# Copy configuration files
COPY config/*.jcfg /usr/local/etc/janus/
COPY config/turnserver.conf /usr/local/etc/janus/

# Disable unused plugins to prevent startup errors
RUN echo '[events]' >> /usr/local/etc/janus/janus.jcfg && \
    echo 'gelfevh = false' >> /usr/local/etc/janus/janus.jcfg && \
    echo 'mqttevh = false' >> /usr/local/etc/janus/janus.jcfg && \
    echo 'nanomsgevh = false' >> /usr/local/etc/janus/janus.jcfg && \
    echo 'rabbitmqevh = false' >> /usr/local/etc/janus/janus.jcfg && \
    echo 'wsevh = false' >> /usr/local/etc/janus/janus.jcfg && \
    echo '[transports]' >> /usr/local/etc/janus/janus.jcfg && \
    echo 'janus.transport.mqtt.jcfg = false' >> /usr/local/etc/janus/janus.jcfg && \
    echo 'janus.transport.nanomsg.jcfg = false' >> /usr/local/etc/janus/janus.jcfg && \
    echo 'janus.transport.pfunix.jcfg = false' >> /usr/local/etc/janus/janus.jcfg && \
    echo 'janus.transport.rabbitmq.jcfg = false' >> /usr/local/etc/janus/janus.jcfg

# Create a unified transport configuration file for HTTP and WebSockets
RUN echo 'general: {' > /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '  json = "indented"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '  base_path = "/janus"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '}' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo 'admin: {' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '  admin_base_path = "/admin"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '}' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo 'cors: {' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '  allow_origin = "*"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '}' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo 'http: {' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '  port = 8088' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '  interface = "0.0.0.0"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '}' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo 'ws: {' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '  port = 8088' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '  interface = "0.0.0.0"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '}' >> /usr/local/etc/janus/janus.transport.http.jcfg

# Expose the single port Janus will use
EXPOSE 8088

# Override any existing configuration to ensure proper startup
CMD ["/usr/local/bin/janus", "--interface=0.0.0.0", "--debug-level=4"]
