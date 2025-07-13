FROM canyan/janus-gateway:master

# Copy configuration files
COPY config/*.jcfg /usr/local/etc/janus/
COPY config/turnserver.conf /usr/local/etc/janus/

# Create a minimal HTTP transport configuration if none exists
RUN echo '[general]' > /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo 'json = "indented"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo 'base_path = "/janus"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '[admin]' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo 'admin_base_path = "/admin"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '[cors]' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo 'allow_origin = "*"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '[certificates]' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo 'cert_pem = "/usr/local/share/janus/certs/mycert.pem"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo 'cert_key = "/usr/local/share/janus/certs/mycert.key"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '[http]' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo 'port = 8088' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo 'interface = "0.0.0.0"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '[https]' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo 'secure_port = 8089' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo 'secure_interface = "0.0.0.0"' >> /usr/local/etc/janus/janus.transport.http.jcfg

# Create a minimal WebSockets transport configuration if none exists
RUN echo '[general]' > /usr/local/etc/janus/janus.transport.websockets.jcfg && \
    echo 'json = "indented"' >> /usr/local/etc/janus/janus.transport.websockets.jcfg && \
    echo 'pingpong_trigger = 30' >> /usr/local/etc/janus/janus.transport.websockets.jcfg && \
    echo 'pingpong_timeout = 10' >> /usr/local/etc/janus/janus.transport.websockets.jcfg && \
    echo '[admin]' >> /usr/local/etc/janus/janus.transport.websockets.jcfg && \
    echo 'admin_ws = true' >> /usr/local/etc/janus/janus.transport.websockets.jcfg && \
    echo '[cors]' >> /usr/local/etc/janus/janus.transport.websockets.jcfg && \
    echo 'allow_origin = "*"' >> /usr/local/etc/janus/janus.transport.websockets.jcfg && \
    echo '[certificates]' >> /usr/local/etc/janus/janus.transport.websockets.jcfg && \
    echo 'cert_pem = "/usr/local/share/janus/certs/mycert.pem"' >> /usr/local/etc/janus/janus.transport.websockets.jcfg && \
    echo 'cert_key = "/usr/local/share/janus/certs/mycert.key"' >> /usr/local/etc/janus/janus.transport.websockets.jcfg && \
    echo '[ws]' >> /usr/local/etc/janus/janus.transport.websockets.jcfg && \
    echo 'port = 8188' >> /usr/local/etc/janus/janus.transport.websockets.jcfg && \
    echo 'interface = "0.0.0.0"' >> /usr/local/etc/janus/janus.transport.websockets.jcfg && \
    echo '[wss]' >> /usr/local/etc/janus/janus.transport.websockets.jcfg && \
    echo 'secure_port = 8989' >> /usr/local/etc/janus/janus.transport.websockets.jcfg && \
    echo 'secure_interface = "0.0.0.0"' >> /usr/local/etc/janus/janus.transport.websockets.jcfg

# Expose the ports that Janus will use
EXPOSE 8088 8188 8089 8989

# Override any existing configuration to ensure proper startup
CMD ["/usr/local/bin/janus", "--interface=0.0.0.0", "--debug-level=4"]
