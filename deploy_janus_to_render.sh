#!/bin/bash

# 🚀 UnifiedChat Janus Service - Render Deployment Script
# This script helps deploy the Janus WebRTC service to Render

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 UnifiedChat Janus Service - Render Deployment${NC}"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "services/janus-service/Dockerfile" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    echo "Expected: services/janus-service/Dockerfile"
    exit 1
fi

# Check if git is available
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Error: Git is not installed${NC}"
    exit 1
fi

# Check if repository is connected to GitHub
if ! git remote get-url origin &> /dev/null; then
    echo -e "${RED}❌ Error: No GitHub remote found${NC}"
    echo "Please add your GitHub repository as origin:"
    echo "git remote add origin https://github.com/yourusername/alcall.git"
    exit 1
fi

echo -e "${GREEN}✅ Repository check passed${NC}"
echo ""

# Get repository information
REPO_URL=$(git remote get-url origin)
REPO_NAME=$(basename -s .git "$REPO_URL")
CURRENT_BRANCH=$(git branch --show-current)

echo -e "${BLUE}📋 Repository Information:${NC}"
echo "Repository: $REPO_NAME"
echo "Branch: $CURRENT_BRANCH"
echo "URL: $REPO_URL"
echo ""

# Check if changes need to be committed
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
    echo "Please commit your changes before deploying:"
    echo ""
    echo "git add ."
    echo "git commit -m 'Update Janus service for Render deployment'"
    echo "git push origin $CURRENT_BRANCH"
    echo ""
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
fi

# Verify Janus service files
echo -e "${BLUE}🔍 Verifying Janus service files...${NC}"

REQUIRED_FILES=(
    "services/janus-service/Dockerfile"
    "services/janus-service/render.yaml"
    "services/janus-service/config/janus.plugin.audiobridge.jcfg"
    "services/janus-service/config/janus.plugin.videoroom.jcfg"
    "services/janus-service/config/janus.transport.http.jcfg"
    "services/janus-service/config/janus.transport.websockets.jcfg"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ Missing: $file${NC}"
        exit 1
    fi
done

echo ""
echo -e "${GREEN}✅ All required files found${NC}"
echo ""

# Display deployment instructions
echo -e "${BLUE}📋 Render Deployment Instructions:${NC}"
echo "=========================================="
echo ""
echo "1. Go to https://dashboard.render.com/"
echo "2. Click 'New +' and select 'Web Service'"
echo "3. Connect your GitHub repository: $REPO_NAME"
echo "4. Configure the service with these settings:"
echo ""
echo -e "${YELLOW}Service Configuration:${NC}"
echo "  • Name: unifiedchat-janus-service"
echo "  • Root Directory: services/janus-service"
echo "  • Runtime: Docker"
echo "  • Instance Type: Starter (free)"
echo "  • Region: Choose closest to your users"
echo ""
echo -e "${YELLOW}Environment Variables:${NC}"
echo "  • PORT = 8088"
echo "  • JANUS_LOG_LEVEL = 4"
echo "  • JANUS_LOG_TIMESTAMPS = true"
echo ""
echo -e "${YELLOW}Build Settings:${NC}"
echo "  • Build Command: docker build -t janus ."
echo "  • Start Command: docker run -p \$PORT:8088 -p 8089:8089 -p 8000:8000 janus"
echo "  • Health Check Path: /janus/info"
echo ""

# Check if render.yaml is properly configured
echo -e "${BLUE}🔧 Checking render.yaml configuration...${NC}"
if grep -q "healthCheckPath: /janus/info" services/janus-service/render.yaml; then
    echo -e "${GREEN}✅ render.yaml is properly configured${NC}"
else
    echo -e "${YELLOW}⚠️  render.yaml may need updates${NC}"
fi

echo ""

# Push changes if needed
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${BLUE}📤 Pushing changes to GitHub...${NC}"
    git add .
    git commit -m "Update Janus service for Render deployment" || true
    git push origin "$CURRENT_BRANCH" || true
    echo -e "${GREEN}✅ Changes pushed to GitHub${NC}"
    echo ""
fi

# Display post-deployment steps
echo -e "${BLUE}🎯 Post-Deployment Steps:${NC}"
echo "================================"
echo ""
echo "After deployment on Render:"
echo ""
echo "1. Get your service URL from Render dashboard"
echo "2. Test the health check:"
echo "   curl https://your-service-name.onrender.com/janus/info"
echo ""
echo "3. Update your frontend environment variables:"
echo "   NEXT_PUBLIC_JANUS_URL=wss://your-service-name.onrender.com:8089"
echo "   NEXT_PUBLIC_JANUS_HTTP_URL=https://your-service-name.onrender.com"
echo ""
echo "4. Test audio calling in your application"
echo ""

# Display service URLs template
echo -e "${BLUE}🌐 Expected Service URLs:${NC}"
echo "================================"
echo "HTTP API: https://unifiedchat-janus-service.onrender.com"
echo "WebSocket: wss://unifiedchat-janus-service.onrender.com:8089"
echo "Health Check: https://unifiedchat-janus-service.onrender.com/janus/info"
echo ""

# Display testing commands
echo -e "${BLUE}🧪 Testing Commands:${NC}"
echo "========================"
echo ""
echo "# Test health check"
echo "curl https://unifiedchat-janus-service.onrender.com/janus/info"
echo ""
echo "# Test WebSocket connection"
echo "wscat -c wss://unifiedchat-janus-service.onrender.com:8089"
echo ""

echo -e "${GREEN}🎉 Ready for Render deployment!${NC}"
echo ""
echo "Next steps:"
echo "1. Follow the deployment instructions above"
echo "2. Wait for the service to build and deploy"
echo "3. Test the service endpoints"
echo "4. Update your frontend configuration"
echo ""
echo -e "${BLUE}📚 For more information, see: RENDER_JANUS_DEPLOYMENT_GUIDE.md${NC}"
