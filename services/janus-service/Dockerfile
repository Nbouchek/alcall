# Use the official, pre-built Janus Gateway image
FROM canyan/janus-gateway:latest

# Copy our custom configuration files into the container
COPY config/ /usr/local/etc/janus/

# The canyan/janus-gateway image has its own entrypoint.
# We just need to ensure our config is in the right place.
# The default command will pick up the config automatically.
