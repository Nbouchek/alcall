#!/bin/bash

echo "🔧 Janus URL Update Script"
echo "=========================="

# Check if .env.local exists
if [ ! -f "web/frontend/.env.local" ]; then
    echo "❌ .env.local not found. Creating it..."
    cat > web/frontend/.env.local << EOF
# Janus WebRTC Server (Update with your actual Render service URL)
NEXT_PUBLIC_JANUS_URL=wss://janus-service-xxxx.onrender.com:8089
NEXT_PUBLIC_JANUS_HTTP_URL=https://janus-service-xxxx.onrender.com:8088

# Existing services
NEXT_PUBLIC_AUTH_API_URL=https://unifiedchat-auth.onrender.com
NEXT_PUBLIC_MESSAGE_API_URL=https://unifiedchat-message-service.onrender.com
NEXT_PUBLIC_REALTIME_API_URL=https://realtime-service-onfn.onrender.com
EOF
    echo "✅ Created .env.local with placeholder URLs"
else
    echo "✅ .env.local exists"
fi

echo ""
echo "📋 Manual Steps Required:"
echo "1. Get your Janus service URL from Render dashboard"
echo "2. Update web/frontend/.env.local with your actual URLs:"
echo ""
echo "   Replace:"
echo "   NEXT_PUBLIC_JANUS_URL=wss://janus-service-xxxx.onrender.com:8089"
echo "   NEXT_PUBLIC_JANUS_HTTP_URL=https://janus-service-xxxx.onrender.com:8088"
echo ""
echo "   With your actual URLs (e.g.,):"
echo "   NEXT_PUBLIC_JANUS_URL=wss://janus-service-abc123.onrender.com:8089"
echo "   NEXT_PUBLIC_JANUS_HTTP_URL=https://janus-service-abc123.onrender.com:8088"
echo ""
echo "3. Save the file and restart your frontend"
echo ""
echo "🚀 After updating URLs, test the audio calling feature!"
