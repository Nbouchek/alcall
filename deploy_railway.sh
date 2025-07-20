#!/bin/bash

# Railway Deployment Script for UnifiedChat MVP
echo "🚀 Deploying UnifiedChat MVP to Railway for International Access"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Installing Railway CLI${NC}"
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
else
    echo -e "${GREEN}✓ Railway CLI already installed${NC}"
fi

echo -e "${BLUE}Step 2: Creating Railway configuration${NC}"

# Create railway.toml configuration
cat > railway.toml << 'EOF'
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "docker-compose -f docker-compose.railway.yml up"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[[services]]
name = "unifiedchat"
EOF

# Create Railway-specific docker-compose file
cat > docker-compose.railway.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: unifiedchat
      POSTGRES_USER: unifiedchat
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U unifiedchat"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  user-service:
    build: ./services/user-service
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: unifiedchat
      DB_USER: unifiedchat
      DB_PASSWORD: ${DB_PASSWORD}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8081/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  auth-service:
    build: ./services/auth-service
    environment:
      JWT_SECRET: ${JWT_SECRET}
      PORT: 8082
    depends_on:
      user-service:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8082/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  message-service:
    build: ./services/message-service
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: unifiedchat
      DB_USER: unifiedchat
      DB_PASSWORD: ${DB_PASSWORD}
      PORT: 8083
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8083/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  realtime-service:
    build: ./services/realtime-service
    environment:
      PORT: 8084
    depends_on:
      message-service:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8084/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  gateway-service:
    build: ./services/gateway-service
    environment:
      AUTH_SERVICE_URL: http://auth-service:8082
      USER_SERVICE_URL: http://user-service:8081
      MESSAGE_SERVICE_URL: http://message-service:8083
      PORT: 8080
    depends_on:
      auth-service:
        condition: service_healthy
      user-service:
        condition: service_healthy
      message-service:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./web/frontend
    environment:
      NEXT_PUBLIC_API_URL: ${RAILWAY_PUBLIC_DOMAIN}/api/v1
      NEXT_PUBLIC_WS_URL: ws://${RAILWAY_PUBLIC_DOMAIN}:8084
      PORT: 3000
    depends_on:
      gateway-service:
        condition: service_healthy
    ports:
      - "3000:3000"

volumes:
  postgres_data:
EOF

echo -e "${GREEN}✓ Railway configuration created${NC}"

echo -e "${BLUE}Step 3: Updating services for cloud deployment${NC}"

# Update auth service to use environment PORT
sed -i.bak 's/r.Run(":8082")/port := os.Getenv("PORT"); if port == "" { port = "8082" }; r.Run(":" + port)/' services/auth-service/src/main.go

# Update message service to use environment PORT
sed -i.bak 's/r.Run(":8083")/port := os.Getenv("PORT"); if port == "" { port = "8083" }; r.Run(":" + port)/' services/message-service/src/main.go

# Update frontend to use environment variables
sed -i.bak 's|const API_BASE_URL = "http://192.168.1.249";|const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";|' web/frontend/pages/index.js

echo -e "${GREEN}✓ Services updated for cloud deployment${NC}"

echo -e "${BLUE}Step 4: Deploying to Railway${NC}"
echo -e "${YELLOW}Make sure you're logged into Railway:${NC}"
echo "1. Go to https://railway.app"
echo "2. Sign up/Sign in with GitHub"
echo "3. Create a new project"
echo "4. Connect this repository"

read -p "Press Enter when you're ready to deploy..."

# Deploy to Railway
echo "Deploying..."
railway up

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Get your public URL from Railway dashboard"
echo "2. Test the application from different countries"
echo "3. Share the URL with users worldwide"
echo ""
echo -e "${YELLOW}Test Accounts:${NC}"
echo "• admin / password123"
echo "• user2 / password123"
echo "• user3 / password123"
echo ""
echo -e "${BLUE}Your app will be available at:${NC}"
echo "https://your-app-name.railway.app"
echo ""
echo -e "${GREEN}Users from any country can now access your chat application!${NC}"
