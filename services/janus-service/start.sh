#!/bin/bash

echo "Starting Janus with PORT: $PORT"

# Update the port in the HTTP transport config
if [ ! -z "$PORT" ]; then
    echo "Updating port from 8088 to $PORT"
    sed -i "s/port = 8088/port = $PORT/" /opt/janus/etc/janus/janus.transport.http.jcfg
    echo "Updated config file:"
    cat /opt/janus/etc/janus/janus.transport.http.jcfg
else
    echo "No PORT environment variable set, using default port 8088"
fi

# Start Janus
echo "Starting Janus..."
exec /opt/janus/bin/janus -F /opt/janus/etc/janus -L 4 -d 5
