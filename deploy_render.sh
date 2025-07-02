#!/bin/bash

# Render Deployment Script for UnifiedChat MVP
echo "🚀 Deploying UnifiedChat MVP to Render for International Access"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Creating Render configuration${NC}"

# Create render.yaml configuration
cat > render.yaml << 'EOF'
services:
  # Frontend Service
  - type: web
    name: unifiedchat-frontend
    runtime: node
    region: oregon
    plan: starter
    buildCommand: cd web/frontend && npm install && npm run build
    startCommand: cd web/frontend && npm start
    envVars:
      - key: PORT
        value: 3000
      - key: NEXT_PUBLIC_AUTH_API_URL
        value: "https://unifiedchat-auth-service.onrender.com/api/v1"
      - key: NEXT_PUBLIC_MESSAGE_API_URL
        value: "https://unifiedchat-message-service.onrender.com"
      - key: NEXT_PUBLIC_REALTIME_API_URL
        value: "https://unifiedchat-realtime-service.onrender.com"
      - key: NEXT_PUBLIC_JANUS_URL
        value: "wss://unifiedchat-janus-service.onrender.com/janus"
      - key: NEXT_PUBLIC_JANUS_HTTP_URL
        value: "https://unifiedchat-janus-service.onrender.com"
      - key: NEXT_PUBLIC_FORCE_NORMAL_MODE
        value: "true"
    healthCheckPath: /
    autoDeploy: true
    numInstances: 1

  # Auth Service
  - type: web
    name: unifiedchat-auth-service
    runtime: docker
    region: oregon
    plan: starter
    dockerfilePath: services/auth-service/Dockerfile
    dockerContext: services/auth-service
    envVars:
      - key: PORT
        value: 8082
      - key: JWT_SECRET
        value: "your-super-secret-jwt-key-change-in-production"
    healthCheckPath: /health
    autoDeploy: true
    numInstances: 1

  # Gateway Service
  - type: web
    name: unifiedchat-gateway-service
    runtime: docker
    region: oregon
    plan: starter
    dockerfilePath: services/gateway-service/Dockerfile
    dockerContext: services/gateway-service
    envVars:
      - key: PORT
        value: 8080
      - key: AUTH_SERVICE_URL
        value: "https://unifiedchat-auth-service.onrender.com"
      - key: USER_SERVICE_URL
        value: "https://unifiedchat-user-service.onrender.com"
      - key: MESSAGE_SERVICE_URL
        value: "https://unifiedchat-message-service.onrender.com"
    healthCheckPath: /health
    autoDeploy: true
    numInstances: 1

  # Message Service
  - type: web
    name: unifiedchat-message-service
    runtime: docker
    region: oregon
    plan: starter
    dockerfilePath: services/message-service/Dockerfile
    dockerContext: services/message-service
    envVars:
      - key: PORT
        value: 8083
    healthCheckPath: /health
    autoDeploy: true
    numInstances: 1

  # Realtime Service
  - type: web
    name: unifiedchat-realtime-service
    runtime: docker
    region: oregon
    plan: starter
    dockerfilePath: services/realtime-service/Dockerfile
    dockerContext: services/realtime-service
    envVars:
      - key: PORT
        value: 8084
      - key: MESSAGE_SERVICE_URL
        value: "https://unifiedchat-message-service.onrender.com"
    healthCheckPath: /health
    autoDeploy: true
    numInstances: 1
EOF

echo -e "${GREEN}✓ Render configuration created${NC}"

echo -e "${BLUE}Step 2: Creating deployment instructions${NC}"

cat > RENDER_DEPLOYMENT.md << 'EOF'
# Render Deployment Instructions

## Quick Deploy to Render

### Step 1: Go to Render
1. Visit [render.com](https://render.com)
2. Sign up or sign in with GitHub

### Step 2: Deploy Services
1. Click "New +"
2. Select "Blueprint"
3. Connect your GitHub repository
4. Select the repository and branch
5. Click "Apply"

This will deploy all services defined in render.yaml:
- Frontend (Next.js)
- Auth Service (Go)
- Gateway Service (Go)
- Message Service (Go)
- Realtime Service (Go)

### Step 3: Verify Deployment
1. Wait for all services to deploy (5-10 minutes)
2. Check the health endpoints:
   - Frontend: https://unifiedchat-frontend.onrender.com
   - Auth: https://unifiedchat-auth-service.onrender.com/health
   - Gateway: https://unifiedchat-gateway-service.onrender.com/health
   - Message: https://unifiedchat-message-service.onrender.com/health
   - Realtime: https://unifiedchat-realtime-service.onrender.com/health

## Test Accounts
- Username: admin, Password: password123
- Username: Linda, Password: Linda
- Username: Hana, Password: Hana
- Username: Adam, Password: Adam
- Username: Ahmed, Password: Ahmed
- Username: Hamid, Password: Hamid
- Username: Mueen, Password: Mueen
- Username: Nacer, Password: Nacer

## API Endpoints
Auth Service (/api/v1/auth/):
- POST /login - Login
- POST /register - Register
- GET /verify - Verify token
- GET /users - List users

Message Service:
- POST /messages - Send message
- GET /messages - Get messages

Realtime Service:
- WebSocket /ws - Real-time updates
EOF

echo -e "${GREEN}✓ Deployment instructions created${NC}"

echo ""
echo -e "${GREEN}🎉 Render deployment setup complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Go to https://render.com"
echo "2. Sign up with GitHub"
echo "3. Follow the instructions in RENDER_DEPLOYMENT.md"
echo "4. Deploy your services"
echo ""
echo -e "${YELLOW}Benefits of Render:${NC}"
echo "• Free tier available"
echo "• Automatic HTTPS"
echo "• Global CDN"
echo "• Easy environment variable management"
echo "• Automatic deployments from GitHub"
echo ""
echo -e "${GREEN}After deployment, users from any country can access your chat app!${NC}"
