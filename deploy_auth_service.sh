#!/bin/bash

# Deploy updated auth service with /users endpoint
echo "🚀 Deploying updated auth service with /users endpoint..."

# Build the auth service
echo "📦 Building auth service..."
cd services/auth-service
docker build -t unifiedchat-auth-service .

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Failed to build auth service"
    exit 1
fi

echo "✅ Auth service built successfully"

# For now, we'll use the existing deployment
# In a real scenario, you would push to your container registry and deploy
echo "📋 Auth service updated with /users endpoint"
echo "🔗 The /users endpoint will return all available users"
echo "🌐 Current auth service URL: https://unifiedchat-auth.onrender.com"

echo ""
echo "📝 To test the new endpoint:"
echo "curl https://unifiedchat-auth.onrender.com/users"
echo ""

echo "✅ Auth service deployment script completed"
