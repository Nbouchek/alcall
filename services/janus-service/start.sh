#!/bin/bash
set -e

echo "=== Janus Startup on Render ==="
echo "PORT environment variable: $PORT"
echo "Current time: $(date)"
echo "Current user: $(whoami)"
echo "Working directory: $(pwd)"

# Render REQUIRES services to bind to $PORT
if [ -z "$PORT" ]; then
    echo "ERROR: PORT environment variable not set. Using fallback port 10000"
    JANUS_PORT=10000
else
    echo "Using Render-provided port: $PORT"
    JANUS_PORT=$PORT
fi

# Calculate WebSocket port (PORT + 1)
WS_PORT=$((JANUS_PORT + 1))

echo "Configuring Janus to bind to HTTP port: $JANUS_PORT"
echo "Configuring Janus to bind to WebSocket port: $WS_PORT"

# Ensure config directory exists and is readable
echo "Checking configuration directory..."
ls -la /opt/janus/etc/janus/

# Update the HTTP transport config to use the correct ports
echo "Updating HTTP transport configuration..."
sed -i "s/port = 10000/port = $JANUS_PORT/" /opt/janus/etc/janus/janus.transport.http.jcfg
sed -i "s/ws_port = 10001/ws_port = $WS_PORT/" /opt/janus/etc/janus/janus.transport.http.jcfg
sed -i "s/admin_port = 10000/admin_port = $JANUS_PORT/" /opt/janus/etc/janus/janus.transport.http.jcfg

echo "Updated Janus HTTP transport configuration:"
cat /opt/janus/etc/janus/janus.transport.http.jcfg

# Check if Janus binary exists and is executable
echo "Checking Janus binary..."
ls -la /opt/janus/bin/janus

# Test configuration syntax before starting
echo "Testing Janus configuration..."
/opt/janus/bin/janus --help > /dev/null 2>&1 || echo "Warning: Janus binary test failed"

echo "Starting Janus Gateway with configuration folder: /opt/janus/etc/janus"
echo "Command: /opt/janus/bin/janus -F /opt/janus/etc/janus -L 4 -d 5"

echo "Expected endpoints after startup:"
echo "- Health check: http://0.0.0.0:$JANUS_PORT/janus/info"
echo "- Admin API: http://0.0.0.0:$JANUS_PORT/admin/info"
echo "- Main API: http://0.0.0.0:$JANUS_PORT/janus"
echo "- WebSocket: ws://0.0.0.0:$WS_PORT/"

# Start Janus with verbose logging
exec /opt/janus/bin/janus -F /opt/janus/etc/janus -L 4 -d 5
