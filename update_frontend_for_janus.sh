#!/bin/bash

# Check if Janus URL is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide the Janus service URL"
    echo "Usage: ./update_frontend_for_janus.sh <JANUS_URL>"
    echo "Example: ./update_frontend_for_janus.sh https://unifiedchat-janus-service.onrender.com"
    exit 1
fi

JANUS_URL=$1
OLD_AUDIO_URL="https://unifiedchat-audio-service.onrender.com"

echo "🔄 Updating frontend to use Janus WebRTC Server..."
echo "📡 Janus URL: $JANUS_URL"
echo "🗑️  Old Audio URL: $OLD_AUDIO_URL"

# Update index.js
echo "📝 Updating pages/index.js..."
sed -i.bak "s|$OLD_AUDIO_URL|$JANUS_URL|g" web/frontend/pages/index.js

# Update AudioCall.js (JanusAudioCall.js)
echo "📝 Updating components/JanusAudioCall.js..."
sed -i.bak "s|$OLD_AUDIO_URL|$JANUS_URL|g" web/frontend/components/JanusAudioCall.js

# Remove backup files
rm -f web/frontend/pages/index.js.bak
rm -f web/frontend/components/JanusAudioCall.js.bak

echo "✅ Frontend updated successfully!"
echo ""
echo "🔧 Next steps:"
echo "1. Commit and push the changes:"
echo "   git add ."
echo "   git commit -m 'Update frontend to use Janus WebRTC Server'"
echo "   git push origin repo-setup-fixes"
echo ""
echo "2. Redeploy the frontend to Render"
echo ""
echo "3. Test audio calling with Janus"
echo ""
echo "🎯 The frontend will now use Janus for audio calling instead of the old audio service!"
