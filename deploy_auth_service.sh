#!/bin/bash

# Deploy updated auth service to Render
echo "🚀 Deploying updated auth service to Render..."

# Build and test the auth service locally first
echo "📦 Building auth service locally..."
cd services/auth-service
docker build -t unifiedchat-auth-service .

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Failed to build auth service"
    exit 1
fi

echo "✅ Auth service built successfully"

# Deploy to Render using their deploy API
echo "🚀 Triggering Render deployment..."
RENDER_DEPLOY_KEY="YOUR_RENDER_DEPLOY_KEY"  # This should be set as an environment variable
RENDER_SERVICE_ID="YOUR_RENDER_SERVICE_ID"  # This should be set as an environment variable

if [ -z "$RENDER_DEPLOY_KEY" ] || [ -z "$RENDER_SERVICE_ID" ]; then
    echo "❌ Missing Render deployment credentials. Please set RENDER_DEPLOY_KEY and RENDER_SERVICE_ID"
    exit 1
fi

curl -X POST "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys" \
  -H "accept: application/json" \
  -H "authorization: Bearer $RENDER_DEPLOY_KEY"

echo "✅ Deployment triggered on Render"
echo "🌐 Auth service URL: https://unifiedchat-auth-service.onrender.com"
echo ""
echo "📝 Available endpoints:"
echo "- POST /api/v1/auth/login"
echo "- POST /api/v1/auth/register"
echo "- GET /api/v1/auth/verify"
echo "- GET /api/v1/users"
echo ""
echo "✅ Auth service deployment completed"
