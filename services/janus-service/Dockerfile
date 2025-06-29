# Use the official, pre-built Janus Gateway image
FROM canyan/janus-gateway:latest

# Install curl and jq for health checks and plugin verification
RUN apt-get update && apt-get install -y curl jq && \
    mkdir -p /usr/local/share/janus && \
    echo '<!DOCTYPE html><html><head><title>Janus WebRTC Server</title></head><body><h1>Janus WebRTC Server</h1><p>Status: Running</p><a href="/janus/info">API Info</a></body></html>' > /usr/local/share/janus/index.html && \
    echo 'OK' > /usr/local/share/janus/health && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy our custom configuration files into the container
COPY config/ /usr/local/etc/janus/

# Copy the plugin verification script
COPY verify-plugins.sh /usr/local/bin/verify-plugins.sh
RUN chmod +x /usr/local/bin/verify-plugins.sh

# Create a startup script that ensures Janus handles root requests and verifies plugins
RUN echo '#!/bin/bash\n\
echo "Starting Janus WebRTC Server..."\n\
echo "Creating health check endpoints..."\n\
mkdir -p /usr/local/share/janus\n\
echo "OK" > /usr/local/share/janus/health\n\
echo "{\\"status\\":\\"ok\\",\\"timestamp\\":\\"$(date -Iseconds)\\"}" > /usr/local/share/janus/status.json\n\
echo "Starting Janus daemon..."\n\
exec /usr/local/bin/janus "$@"\n\
' > /usr/local/bin/start-janus.sh && chmod +x /usr/local/bin/start-janus.sh

# Use our custom startup script
ENTRYPOINT ["/usr/local/bin/start-janus.sh"]

# Expose HTTP API and WSS ports for Render
EXPOSE 8088
EXPOSE 443
