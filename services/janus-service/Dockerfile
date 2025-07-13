# Alternative minimal approach - create this as a separate config file
FROM canyan/janus-gateway:master

# Create minimal HTTP transport config
RUN mkdir -p /usr/local/etc/janus && \
    echo 'general: { json = "indented"; base_path = "/janus"; http = true; port = 8088; interface = "0.0.0.0"; }' > /usr/local/etc/janus/janus.transport.http.jcfg

# Create simple startup script
RUN echo '#!/bin/bash' > /usr/local/bin/start.sh && \
    echo 'PORT=${PORT:-8088}' >> /usr/local/bin/start.sh && \
    echo 'sed -i "s/port = 8088/port = $PORT/" /usr/local/etc/janus/janus.transport.http.jcfg' >> /usr/local/bin/start.sh && \
    echo 'cat /usr/local/etc/janus/janus.transport.http.jcfg' >> /usr/local/bin/start.sh && \
    echo '/usr/local/bin/janus -d 7' >> /usr/local/bin/start.sh && \
    chmod +x /usr/local/bin/start.sh

EXPOSE 8088
CMD ["/usr/local/bin/start.sh"]
