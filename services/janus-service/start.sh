#!/bin/bash

# Update port in HTTP config based on PORT environment variable
if [ ! -z "$PORT" ]; then
    echo "Updating port from 8088 to $PORT"
    sed -i "s/port = 8088/port = $PORT/" /opt/janus/etc/janus/janus.transport.http.jcfg
    echo "Port updated in configuration"
else
    echo "PORT environment variable not set, using default port 8088"
fi

# Start Janus
echo "Starting Janus WebRTC Server..."
exec /opt/janus/bin/janus -F /opt/janus/etc/janus -L 4 -d 5
