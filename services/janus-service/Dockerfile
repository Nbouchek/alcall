FROM canyan/janus-gateway:master

# Create directory for config files if it doesn't exist
RUN mkdir -p /usr/local/etc/janus/

# Copy configuration files
COPY config/*.jcfg /usr/local/etc/janus/
COPY config/turnserver.conf /usr/local/etc/janus/

# Create main Janus config if it doesn't exist
RUN if [ ! -f /usr/local/etc/janus/janus.jcfg ]; then \
    echo 'general: {\n\
    debug_level = 7\n\
    interface = "0.0.0.0"\n\
    plugins_folder = "/usr/local/lib/janus/plugins"\n\
    transports_folder = "/usr/local/lib/janus/transports"\n\
    events_folder = "/usr/local/lib/janus/events"\n\
    loggers_folder = "/usr/local/lib/janus/loggers"\n\
}\n\
nat: {\n\
    stun_server = "stun.l.google.com"\n\
    stun_port = 19302\n\
    nice_debug = false\n\
}\n\
media: {\n\
    ipv6 = false\n\
    max_nack_queue = 1000\n\
    rtp_port_range = "20000-40000"\n\
}' > /usr/local/etc/janus/janus.jcfg; \
    fi

# Create HTTP transport config if it doesn't exist
RUN if [ ! -f /usr/local/etc/janus/janus.transport.http.jcfg ]; then \
    echo 'general: {\n\
    json = "indented"\n\
    base_path = "/janus"\n\
    http = true\n\
    port = 8088\n\
    interface = "0.0.0.0"\n\
    ip = "0.0.0.0"\n\
    cors_origins = "*"\n\
    cors_methods = "GET, POST, PUT, DELETE, OPTIONS"\n\
    cors_headers = "Content-Type, Authorization, X-Requested-With"\n\
}' > /usr/local/etc/janus/janus.transport.http.jcfg; \
    fi

# Create a startup script to handle PORT environment variable
RUN echo '#!/bin/bash\n\
PORT=${PORT:-8088}\n\
sed -i "s/port = 8088/port = $PORT/g" /usr/local/etc/janus/janus.transport.http.jcfg\n\
exec /usr/local/bin/janus --config /usr/local/etc/janus/janus.jcfg\n\
' > /usr/local/bin/start-janus.sh && \
    chmod +x /usr/local/bin/start-janus.sh

# Create WebSockets transport config if it doesn't exist
RUN if [ ! -f /usr/local/etc/janus/janus.transport.websockets.jcfg ]; then \
    echo 'general: {\n\
    json = "indented"\n\
    ws = true\n\
    ws_port = 8188\n\
    ws_interface = "0.0.0.0"\n\
    ws_ip = "0.0.0.0"\n\
    wss = false\n\
}' > /usr/local/etc/janus/janus.transport.websockets.jcfg; \
    fi

# Expose necessary ports
EXPOSE 8088

# Start Janus with proper configuration
CMD ["/usr/local/bin/start-janus.sh"]
