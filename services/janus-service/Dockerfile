# Use the official, pre-built Janus Gateway image
FROM canyan/janus-gateway:latest

# Create directory for static files and add a simple index page
RUN mkdir -p /usr/local/share/janus && \
    echo '<!DOCTYPE html><html><head><title>Janus WebRTC Server</title></head><body><h1>Janus WebRTC Server</h1><p>Status: Running</p><a href="/janus/info">API Info</a></body></html>' > /usr/local/share/janus/index.html

# Copy our custom configuration files into the container
COPY config/ /usr/local/etc/janus/

# The canyan/janus-gateway image has its own entrypoint.
# We just need to ensure our config is in the right place.
# The default command will pick up the config automatically.
