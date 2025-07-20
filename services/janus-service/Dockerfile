FROM canyan/janus-gateway:master

# Copy required plugin configurations
COPY config/janus.plugin.audiobridge.jcfg /usr/local/etc/janus/
COPY config/janus.plugin.echotest.jcfg /usr/local/etc/janus/
COPY config/janus.plugin.recordplay.jcfg /usr/local/etc/janus/
COPY config/janus.plugin.sip.jcfg /usr/local/etc/janus/
COPY config/janus.plugin.streaming.jcfg /usr/local/etc/janus/
COPY config/janus.plugin.textroom.jcfg /usr/local/etc/janus/
COPY config/janus.plugin.videocall.jcfg /usr/local/etc/janus/
COPY config/janus.plugin.videoroom.jcfg /usr/local/etc/janus/
COPY config/turnserver.conf /usr/local/etc/janus/

# Create a clean main configuration file
RUN echo 'general: {' > /usr/local/etc/janus/janus.jcfg && \
    echo '  configs_folder = "/usr/local/etc/janus"' >> /usr/local/etc/janus/janus.jcfg && \
    echo '}' >> /usr/local/etc/janus/janus.jcfg && \
    echo 'transports: {' >> /usr/local/etc/janus/janus.jcfg && \
    echo '  janus.transport.http.jcfg: {}' >> /usr/local/etc/janus/janus.jcfg && \
    echo '}' >> /usr/local/etc/janus/janus.jcfg

# Create a unified transport configuration for HTTP and WebSockets
RUN echo 'general: {' > /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '  json = "indented"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '  base_path = "/janus"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '}' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo 'http: {' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '  port = 8088' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '  interface = "0.0.0.0"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '}' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo 'websockets: {' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '  port = 8088' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '  interface = "0.0.0.0"' >> /usr/local/etc/janus/janus.transport.http.jcfg && \
    echo '}' >> /usr/local/etc/janus/janus.transport.http.jcfg

# Expose the single port Janus will use
EXPOSE 8088

# Start Janus
CMD ["/usr/local/bin/janus"]
