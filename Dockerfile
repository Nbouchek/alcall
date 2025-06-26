# Use the official, pre-built Janus Gateway image
FROM canyan/janus-gateway:latest

# Copy our custom Janus configuration files
COPY config/ /usr/local/etc/janus/

# Use the default Janus entrypoint - no custom scripts needed
# Janus will start normally and Render.com will detect it's running
