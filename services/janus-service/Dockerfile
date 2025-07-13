FROM canyan/janus-gateway:master

# Create directory for config files if it doesn't exist
RUN mkdir -p /usr/local/etc/janus/

# Copy configuration files
COPY config/*.jcfg /usr/local/etc/janus/
COPY config/turnserver.conf /usr/local/etc/janus/

# Create HTTP transport config if it doesn't exist
RUN if [ ! -f /usr/local/etc/janus/janus.transport.http.jcfg ]; then \
    echo '{\n\
    general: {\n\
        json = "indented"\n\
        base_path = "/janus"\n\
        http = true\n\
        port = 8088\n\
        interface = "0.0.0.0"\n\
    }\n\
}' > /usr/local/etc/janus/janus.transport.http.jcfg; \
    fi

# Create WebSockets transport config if it doesn't exist
RUN if [ ! -f /usr/local/etc/janus/janus.transport.websockets.jcfg ]; then \
    echo '{\n\
    general: {\n\
        json = "indented"\n\
        ws = true\n\
        ws_port = 8188\n\
        ws_interface = "0.0.0.0"\n\
    }\n\
}' > /usr/local/etc/janus/janus.transport.websockets.jcfg; \
    fi

# Expose necessary ports
EXPOSE 8088 8188 8089 8090

# Start Janus with explicit interface and port bindings
CMD ["/usr/local/bin/janus", \
     "-i", "0.0.0.0", \
     "-p", "8088", \
     "-P", "8089", \
     "-H", "8188", \
     "-S", "8090", \
     "-d", "7"]
