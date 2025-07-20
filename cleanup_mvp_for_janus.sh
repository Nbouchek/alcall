#!/bin/bash

echo "🧹 Cleaning up MVP for Janus integration..."

# Remove old audio service files
echo "📁 Removing old audio service..."
rm -rf services/audio-service/

# Remove old audio call component
echo "📁 Removing old AudioCall component..."
rm -f web/frontend/components/AudioCall.js

# Remove old audio debugging scripts
echo "📁 Removing old audio debugging scripts..."
rm -f audio_emergency_fix.js
rm -f debug_audio_issue.js
rm -f debug_audio_issues.js
rm -f debug_presence_audio.js
rm -f test_audio_call_complete.sh
rm -f test_audio_connection.js
rm -f test_audio_diagnostic.js

# Remove old deployment scripts
echo "📁 Removing old deployment scripts..."
rm -f deploy_audio_service.sh

# Update environment variables
echo "🔧 Updating environment variables..."

# Create new .env.local file for frontend
cat > web/frontend/.env.local << EOF
# Janus WebRTC Server
NEXT_PUBLIC_JANUS_URL=ws://localhost:8089
NEXT_PUBLIC_JANUS_HTTP_URL=http://localhost:8088

# Existing services
NEXT_PUBLIC_AUTH_API_URL=https://unifiedchat-auth-service.onrender.com
NEXT_PUBLIC_MESSAGE_API_URL=https://unifiedchat-message-service.onrender.com
NEXT_PUBLIC_REALTIME_API_URL=https://unifiedchat-realtime-service.onrender.com
EOF

echo "✅ Cleanup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Start Janus server: cd services/janus-service && docker-compose up -d"
echo "2. Update frontend environment variables for production deployment"
echo "3. Test Janus audio calling functionality"
echo ""
echo "🚀 Janus integration ready!"
