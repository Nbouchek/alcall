#!/bin/bash
set -e

echo "=== JANUS STARTUP SCRIPT EXECUTING ==="
echo "Script path: $0"
echo "Working directory: $(pwd)"
echo "Current time: $(date)"
echo "User: $(whoami)"
echo "Environment PORT: '$PORT'"

# Determine the port to use
if [ -z "$PORT" ]; then
    echo "WARNING: PORT environment variable not set, using fallback 10000"
    JANUS_PORT=10000
else
    echo "SUCCESS: Using Render-provided PORT: $PORT"
    JANUS_PORT=$PORT
fi

# Calculate WebSocket port
WS_PORT=$((JANUS_PORT + 1))

echo "Configuration: HTTP Port=$JANUS_PORT, WebSocket Port=$WS_PORT"

# Check config file before modification
echo "=== BEFORE MODIFICATION ==="
cat /opt/janus/etc/janus/janus.transport.http.jcfg

# Replace placeholders with actual port values
echo "=== UPDATING CONFIGURATION ==="
echo "Replacing RENDER_PORT_PLACEHOLDER with $JANUS_PORT"
sed -i "s/RENDER_PORT_PLACEHOLDER/$JANUS_PORT/g" /opt/janus/etc/janus/janus.transport.http.jcfg

echo "Replacing RENDER_WS_PORT_PLACEHOLDER with $WS_PORT"
sed -i "s/RENDER_WS_PORT_PLACEHOLDER/$WS_PORT/g" /opt/janus/etc/janus/janus.transport.http.jcfg

# Check config file after modification
echo "=== AFTER MODIFICATION ==="
cat /opt/janus/etc/janus/janus.transport.http.jcfg

# Verify the changes
echo "=== VERIFICATION ==="
if grep -q "$JANUS_PORT" /opt/janus/etc/janus/janus.transport.http.jcfg; then
    echo "SUCCESS: Port $JANUS_PORT found in config"
else
    echo "ERROR: Port $JANUS_PORT NOT found in config"
fi

if grep -q "$WS_PORT" /opt/janus/etc/janus/janus.transport.http.jcfg; then
    echo "SUCCESS: WebSocket port $WS_PORT found in config"
else
    echo "ERROR: WebSocket port $WS_PORT NOT found in config"
fi

echo "=== STARTING JANUS ==="
echo "Expected endpoints:"
echo "- HTTP API: http://0.0.0.0:$JANUS_PORT/janus"
echo "- Health check: http://0.0.0.0:$JANUS_PORT/admin/info"
echo "- WebSocket: ws://0.0.0.0:$WS_PORT"

echo "Executing: /opt/janus/bin/janus -F /opt/janus/etc/janus -L 4 -d 5"

# Start Janus
exec /opt/janus/bin/janus -F /opt/janus/etc/janus -L 4 -d 5
