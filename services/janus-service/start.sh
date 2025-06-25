#!/bin/bash
set -e

echo "=== Janus Startup on Render ==="
echo "PORT environment variable: $PORT"
echo "Current time: $(date)"

# Render REQUIRES services to bind to $PORT
if [ -z "$PORT" ]; then
    echo "ERROR: PORT environment variable not set. Using fallback port 10000"
    JANUS_PORT=10000
else
    echo "Using Render-provided port: $PORT"
    JANUS_PORT=$PORT
fi

echo "Configuring Janus to bind to port: $JANUS_PORT"

# Update the HTTP transport config to use the correct port
sed -i "s/port = 10000/port = $JANUS_PORT/" /opt/janus/etc/janus/janus.transport.http.jcfg

echo "Updated Janus HTTP transport configuration:"
cat /opt/janus/etc/janus/janus.transport.http.jcfg

echo "Starting Janus Gateway..."
exec /opt/janus/bin/janus -F /opt/janus/etc/janus -L 4 -d 5
