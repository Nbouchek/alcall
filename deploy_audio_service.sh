#!/bin/bash

# Deploy Audio Service to Render.com
echo "🚀 Deploying Audio Service to Render.com..."

# Check if we're in the right directory
if [ ! -f "services/audio-service/Dockerfile" ]; then
    echo "❌ Error: Audio service Dockerfile not found. Make sure you're in the project root."
    exit 1
fi

# Navigate to audio service directory
cd services/audio-service

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo "❌ Error: render.yaml not found in audio service directory"
    exit 1
fi

echo "✅ Audio service files found"
echo "📋 Service configuration:"
echo "   - Name: unifiedchat-audio-service"
echo "   - Port: 8084"
echo "   - Health Check: /health"
echo "   - Plan: Free"

echo ""
echo "🌐 To deploy to Render.com:"
echo ""
echo "1. Go to https://render.com/dashboard"
echo "2. Click 'New +' and select 'Blueprint'"
echo "3. Connect your GitHub repository: https://github.com/Nbouchek/alcall"
echo "4. Render will detect the render.yaml file"
echo "5. Click 'Apply' to deploy the audio service"
echo ""
echo "🔧 Manual deployment steps:"
echo "1. Go to https://render.com/dashboard"
echo "2. Click 'New +' and select 'Web Service'"
echo "3. Connect your GitHub repository"
echo "4. Configure the service:"
echo "   - Name: unifiedchat-audio-service"
echo "   - Root Directory: services/audio-service"
echo "   - Runtime: Docker"
echo "   - Build Command: (leave empty, uses Dockerfile)"
echo "   - Start Command: (leave empty, uses Dockerfile)"
echo "5. Set environment variables:"
echo "   - PORT: 8084"
echo "6. Click 'Create Web Service'"
echo ""
echo "🔗 After deployment, your audio service will be available at:"
echo "   https://unifiedchat-audio-service.onrender.com"
echo ""
echo "📝 Don't forget to update your frontend environment variables:"
echo "   NEXT_PUBLIC_AUDIO_API_URL=https://unifiedchat-audio-service.onrender.com"
echo ""
echo "✅ Audio service deployment guide complete!"
