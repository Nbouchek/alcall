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
  - type: web
    name: unifiedchat-frontend
    env: docker
    dockerfilePath: ./web/frontend/Dockerfile
    dockerContext: .
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_API_URL
        value: https://unifiedchat-api.onrender.com
    routes:
      - type: rewrite
        source: /
        destination: /index.html

  - type: web
    name: unifiedchat-auth
    env: docker
    dockerfilePath: ./services/auth-service/Dockerfile
    dockerContext: .
    envVars:
      - key: JWT_SECRET
        generateValue: true
      - key: PORT
        value: 8082

  - type: web
    name: unifiedchat-message
    env: docker
    dockerfilePath: ./services/message-service/Dockerfile
    dockerContext: .
    envVars:
      - key: DB_HOST
        value: unifiedchat-postgres
      - key: DB_PORT
        value: 5432
      - key: DB_NAME
        value: unifiedchat
      - key: DB_USER
        value: unifiedchat
      - key: DB_PASSWORD
        generateValue: true
      - key: PORT
        value: 8083

  - type: pserv
    name: unifiedchat-postgres
    env: docker
    image: postgres:15
    envVars:
      - key: POSTGRES_DB
        value: unifiedchat
      - key: POSTGRES_USER
        value: unifiedchat
      - key: POSTGRES_PASSWORD
        generateValue: true
EOF

echo -e "${GREEN}✓ Render configuration created${NC}"

echo -e "${BLUE}Step 2: Creating deployment instructions${NC}"

cat > RENDER_DEPLOYMENT.md << 'EOF'
# Render Deployment Instructions

## Quick Deploy to Render

### Step 1: Go to Render
1. Visit [render.com](https://render.com)
2. Sign up or sign in with GitHub

### Step 2: Create New Web Service
1. Click "New +"
2. Select "Web Service"
3. Connect your GitHub repository (alcall)

### Step 3: Configure Service
- **Name**: unifiedchat-frontend
- **Environment**: Docker
- **Branch**: main
- **Root Directory**: web/frontend
- **Build Command**: (leave empty, uses Dockerfile)
- **Start Command**: (leave empty, uses Dockerfile)

### Step 4: Set Environment Variables
Add these environment variables:
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-auth-service-url.onrender.com
```

### Step 5: Deploy
1. Click "Create Web Service"
2. Wait for build to complete (5-10 minutes)
3. Get your public URL

### Step 6: Deploy Backend Services
Repeat the process for:
- unifiedchat-auth (auth service)
- unifiedchat-message (message service)
- unifiedchat-postgres (database)

## Your URLs will be:
- Frontend: https://unifiedchat-frontend.onrender.com
- Auth Service: https://unifiedchat-auth.onrender.com
- Message Service: https://unifiedchat-message.onrender.com

## Test Accounts:
- admin / password123
- user2 / password123
- user3 / password123
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
