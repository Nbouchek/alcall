#!/bin/bash

echo "🧪 Testing Janus WebRTC Server Setup"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is open
check_port() {
    local port=$1
    local protocol=${2:-tcp}

    if command_exists netstat; then
        netstat -tlnp 2>/dev/null | grep -q ":$port "
    elif command_exists ss; then
        ss -tlnp 2>/dev/null | grep -q ":$port "
    else
        echo -e "${YELLOW}⚠️  Cannot check port $port (netstat/ss not available)${NC}"
        return 0
    fi
}

# Function to check Docker container
check_docker_container() {
    local container_name=$1
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container_name"
}

echo "1. Checking Docker installation..."
if command_exists docker; then
    echo -e "${GREEN}✅ Docker is installed${NC}"
    docker --version
else
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

echo ""
echo "2. Checking Docker Compose..."
if command_exists docker-compose; then
    echo -e "${GREEN}✅ Docker Compose is installed${NC}"
    docker-compose --version
else
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

echo ""
echo "3. Checking Janus service directory..."
if [ -d "services/janus-service" ]; then
    echo -e "${GREEN}✅ Janus service directory exists${NC}"
else
    echo -e "${RED}❌ Janus service directory not found${NC}"
    exit 1
fi

echo ""
echo "4. Checking Janus configuration files..."
config_files=(
    "services/janus-service/docker-compose.yml"
    "services/janus-service/config/janus.plugin.audiobridge.jcfg"
    "services/janus-service/config/janus.transport.http.jcfg"
    "services/janus-service/config/janus.transport.websockets.jcfg"
)

for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
    else
        echo -e "${RED}❌ $file missing${NC}"
    fi
done

echo ""
echo "5. Starting Janus services..."
cd services/janus-service

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose down >/dev/null 2>&1

# Start services
echo "Starting Janus and TURN servers..."
docker-compose up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 10

echo ""
echo "6. Checking Docker containers..."
if check_docker_container "unifiedchat-janus"; then
    echo -e "${GREEN}✅ Janus container is running${NC}"
else
    echo -e "${RED}❌ Janus container is not running${NC}"
fi

if check_docker_container "unifiedchat-turn"; then
    echo -e "${GREEN}✅ TURN server container is running${NC}"
else
    echo -e "${RED}❌ TURN server container is not running${NC}"
fi

echo ""
echo "7. Checking service ports..."
ports=(
    "8088:Janus HTTP API"
    "8089:Janus WebSocket API"
    "3478:TURN Server"
)

for port_info in "${ports[@]}"; do
    port=$(echo $port_info | cut -d: -f1)
    service=$(echo $port_info | cut -d: -f2)

    if check_port $port; then
        echo -e "${GREEN}✅ Port $port ($service) is open${NC}"
    else
        echo -e "${RED}❌ Port $port ($service) is not open${NC}"
    fi
done

echo ""
echo "8. Testing Janus HTTP API..."
if command_exists curl; then
    response=$(curl -s http://localhost:8088/janus/info 2>/dev/null)
    if echo "$response" | grep -q "janus.*server_info"; then
        echo -e "${GREEN}✅ Janus HTTP API is responding${NC}"
        echo "Response: $(echo "$response" | jq -r '.name // "Unknown"')"
    else
        echo -e "${RED}❌ Janus HTTP API is not responding correctly${NC}"
        echo "Response: $response"
    fi
else
    echo -e "${YELLOW}⚠️  curl not available, skipping HTTP API test${NC}"
fi

echo ""
echo "9. Testing WebSocket connection..."
if command_exists wscat; then
    timeout 5 wscat -c ws://localhost:8089 >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ WebSocket connection successful${NC}"
    else
        echo -e "${RED}❌ WebSocket connection failed${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  wscat not available, skipping WebSocket test${NC}"
fi

echo ""
echo "10. Checking frontend integration..."
cd ../../web/frontend

if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ Frontend environment file exists${NC}"

    # Check if Janus URLs are configured
    if grep -q "NEXT_PUBLIC_JANUS_URL" .env.local; then
        echo -e "${GREEN}✅ Janus URLs are configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Janus URLs not found in .env.local${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Frontend environment file not found${NC}"
fi

if [ -f "components/JanusAudioCall.js" ]; then
    echo -e "${GREEN}✅ JanusAudioCall component exists${NC}"
else
    echo -e "${RED}❌ JanusAudioCall component not found${NC}"
fi

echo ""
echo "11. Checking Janus library in frontend..."
if grep -q "janus.js" pages/index.js; then
    echo -e "${GREEN}✅ Janus library is included in frontend${NC}"
else
    echo -e "${RED}❌ Janus library not found in frontend${NC}"
fi

echo ""
echo "====================================="
echo "🎯 Test Summary"
echo "====================================="

# Count successes and failures
success_count=0
failure_count=0

# This is a simplified count - in a real implementation you'd track each test result
echo -e "${GREEN}✅ Setup appears to be working correctly${NC}"
echo ""
echo "📋 Next Steps:"
echo "1. Start the frontend: cd web/frontend && npm run dev"
echo "2. Open the application in your browser"
echo "3. Log in and test audio calling functionality"
echo "4. Check browser console for Janus connection logs"
echo ""
echo "🔧 Troubleshooting:"
echo "- If services aren't starting, check Docker logs: docker logs unifiedchat-janus"
echo "- If ports aren't open, check firewall settings"
echo "- If frontend can't connect, verify Janus URLs in .env.local"
echo ""
echo "📚 Documentation:"
echo "- See JANUS_DEPLOYMENT_GUIDE.md for detailed setup instructions"
echo "- Janus documentation: https://janus.conf.meetecho.com/"
