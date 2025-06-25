#!/bin/bash

echo "=== Janus Startup Script ==="
echo "PORT environment variable: $PORT"
echo "Current working directory: $(pwd)"

# Update the port in the config file
if [ ! -z "$PORT" ]; then
    echo "Updating port from 8088 to $PORT"
    sed -i "s/port = 8088/port = $PORT/" /opt/janus/etc/janus/janus.transport.http.jcfg
    echo "Config file updated:"
    cat /opt/janus/etc/janus/janus.transport.http.jcfg
else
    echo "No PORT environment variable found"
fi

echo "Starting Janus..."
exec /opt/janus/bin/janus -F /opt/janus/etc/janus -L 4 -d 5
