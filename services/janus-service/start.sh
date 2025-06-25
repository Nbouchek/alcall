#!/bin/bash

echo "=== Janus Startup Script ==="
echo "Current directory: $(pwd)"
echo "PORT environment variable: $PORT"
echo "All environment variables:"
env | grep -E "(PORT|JANUS)" || echo "No PORT or JANUS env vars found"

# Update port in HTTP config based on PORT environment variable
if [ ! -z "$PORT" ]; then
    echo "Updating port from 8088 to $PORT"
    sed -i "s/port = 8088/port = $PORT/" /opt/janus/etc/janus/janus.transport.http.jcfg
    echo "Port updated in configuration"
    echo "Updated config file content:"
    cat /opt/janus/etc/janus/janus.transport.http.jcfg
else
    echo "PORT environment variable not set, using default port 8088"
fi

# Start Janus
echo "Starting Janus WebRTC Server..."
echo "Janus binary location: $(which janus)"
echo "Janus binary exists: $(ls -la /opt/janus/bin/janus)"
exec /opt/janus/bin/janus -F /opt/janus/etc/janus -L 4 -d 5
