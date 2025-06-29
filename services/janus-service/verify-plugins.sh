#!/bin/bash

# Janus Plugin Verification Script
# This script verifies that all required plugins are enabled and accessible

echo "🔍 Verifying Janus WebRTC Gateway Plugin Configuration"
echo "=================================================="

JANUS_URL="${JANUS_HTTP_URL:-http://localhost:8088}"
REQUIRED_PLUGINS=(
    "janus.plugin.videoroom"
    "janus.plugin.audiobridge"
    "janus.plugin.echotest"
    "janus.plugin.streaming"
    "janus.plugin.videocall"
    "janus.plugin.textroom"
)

echo "📡 Testing Janus server connectivity at: $JANUS_URL"

# Test basic connectivity
if curl -s -f "$JANUS_URL/janus/info" > /dev/null 2>&1; then
    echo "✅ Janus server is accessible"

    # Get server info
    echo "📊 Server Information:"
    curl -s "$JANUS_URL/janus/info" | jq -r '.data.plugins[]' 2>/dev/null || echo "Unable to parse plugin list"

else
    echo "❌ Janus server is not accessible at $JANUS_URL"
    exit 1
fi

echo ""
echo "🔌 Verifying Required Plugins:"
echo "================================"

all_plugins_available=true

for plugin in "${REQUIRED_PLUGINS[@]}"; do
    echo -n "Checking $plugin... "

    if curl -s "$JANUS_URL/janus/info" | jq -e ".data.plugins[] | select(. == \"$plugin\")" > /dev/null 2>&1; then
        echo "✅ ENABLED"
    else
        echo "❌ NOT FOUND"
        all_plugins_available=false
    fi
done

echo ""
echo "📋 Configuration Files:"
echo "========================"

config_files=(
    "/usr/local/etc/janus/janus.plugin.videoroom.jcfg"
    "/usr/local/etc/janus/janus.plugin.audiobridge.jcfg"
    "/usr/local/etc/janus/janus.plugin.echotest.jcfg"
    "/usr/local/etc/janus/janus.plugin.streaming.jcfg"
    "/usr/local/etc/janus/janus.plugin.videocall.jcfg"
    "/usr/local/etc/janus/janus.plugin.textroom.jcfg"
)

for config in "${config_files[@]}"; do
    if [ -f "$config" ]; then
        echo "✅ $config exists"
        # Check if enabled
        if grep -q "enabled = true" "$config" 2>/dev/null; then
            echo "   ✅ Plugin is explicitly enabled"
        else
            echo "   ⚠️  Plugin enabled status not explicitly set"
        fi
    else
        echo "❌ $config missing"
        all_plugins_available=false
    fi
done

echo ""
echo "🏁 Summary:"
echo "==========="

if [ "$all_plugins_available" = true ]; then
    echo "✅ ALL REQUIRED PLUGINS ARE PROPERLY CONFIGURED!"
    echo ""
    echo "Available test features:"
    echo "• 🎵 Audio Call Test (AudioBridge)"
    echo "• 📹 Video Call Test (VideoRoom)"
    echo "• 🔄 Echo Test (EchoTest)"
    echo "• 📺 Media Streaming (Streaming)"
    echo "• 📞 P2P Video Call (VideoCall)"
    echo "• 💬 Text Room (TextRoom)"
    echo "• 🖥️ Screen Sharing (VideoRoom)"
    echo "• 🎛️ Device Testing (EchoTest)"
    exit 0
else
    echo "❌ SOME PLUGINS ARE MISSING OR NOT CONFIGURED!"
    echo "Please check the configuration and try again."
    exit 1
fi
