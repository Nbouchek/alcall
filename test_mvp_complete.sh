#!/bin/bash

# UnifiedChat MVP Complete Test Script
# Tests all MVP features including Janus audio calling

set -e

echo "🚀 UnifiedChat MVP Complete Test Suite"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        ((TESTS_FAILED++))
    fi
}

# Function to check if service is running
check_service() {
    local service=$1
    local port=$2
    local endpoint=$3

    echo -e "${BLUE}Testing $service on port $port...${NC}"

    if curl -s -f "http://localhost:$port$endpoint" > /dev/null 2>&1; then
        print_result 0 "$service is running and responding"
        return 0
    else
        print_result 1 "$service is not responding on port $port"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    echo -e "${BLUE}Testing database connectivity...${NC}"

    if docker exec unifiedchat-postgres-1 pg_isready -U unifiedchat > /dev/null 2>&1; then
        print_result 0 "PostgreSQL database is accessible"
        return 0
    else
        print_result 1 "PostgreSQL database is not accessible"
        return 1
    fi
}

# Function to test authentication
test_auth() {
    echo -e "${BLUE}Testing authentication...${NC}"

    # Test login
    local login_response=$(curl -s -X POST http://localhost:8082/login \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"password123"}' 2>/dev/null)

    if echo "$login_response" | grep -q "token"; then
        print_result 0 "User authentication successful"
        local token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        echo "Token received: ${token:0:20}..."
        return 0
    else
        print_result 1 "User authentication failed"
        return 1
    fi
}

# Function to test messaging
test_messaging() {
    echo -e "${BLUE}Testing messaging functionality...${NC}"

    # Test message creation
    local message_response=$(curl -s -X POST http://localhost:8083/messages \
        -H "Content-Type: application/json" \
        -d '{"sender_id":1,"receiver_id":2,"content":"Test message from MVP"}' 2>/dev/null)

    if echo "$message_response" | grep -q "content"; then
        print_result 0 "Message creation successful"
        return 0
    else
        print_result 1 "Message creation failed"
        return 1
    fi
}

# Function to test Janus WebRTC server
test_janus() {
    echo -e "${BLUE}Testing Janus WebRTC server...${NC}"

    # Test Janus info endpoint
    if curl -s -f "http://localhost:8090/janus/info" > /dev/null 2>&1; then
        print_result 0 "Janus WebRTC server is running"

        # Test WebSocket connection
        if curl -s -f "http://localhost:8089" > /dev/null 2>&1; then
            print_result 0 "Janus WebSocket endpoint is accessible"
            return 0
        else
            print_result 1 "Janus WebSocket endpoint is not accessible"
            return 1
        fi
    else
        print_result 1 "Janus WebRTC server is not running"
        return 1
    fi
}

# Function to test frontend
test_frontend() {
    echo -e "${BLUE}Testing frontend...${NC}"

    if curl -s -f "http://localhost:3000" > /dev/null 2>&1; then
        print_result 0 "Frontend is accessible"
        return 0
    else
        print_result 1 "Frontend is not accessible"
        return 1
    fi
}

# Function to test realtime service
test_realtime() {
    echo -e "${BLUE}Testing realtime service...${NC}"

    if curl -s -f "http://localhost:8084/health" > /dev/null 2>&1; then
        print_result 0 "Realtime service is running"
        return 0
    else
        print_result 1 "Realtime service is not running"
        return 1
    fi
}

# Function to test TURN server
test_turn() {
    echo -e "${BLUE}Testing TURN server...${NC}"

    if docker ps | grep -q "unifiedchat-turn"; then
        print_result 0 "TURN server container is running"
        return 0
    else
        print_result 1 "TURN server container is not running"
        return 1
    fi
}

# Function to check service health
check_health() {
    echo -e "${BLUE}Checking service health...${NC}"

    local services=(
        "user-service:8081:/health"
        "auth-service:8082:/health"
        "message-service:8083:/health"
        "realtime-service:8084:/health"
        "gateway-service:8080:/health"
    )

    for service in "${services[@]}"; do
        IFS=':' read -r name port endpoint <<< "$service"
        check_service "$name" "$port" "$endpoint"
    done
}

# Function to test complete user flow
test_user_flow() {
    echo -e "${BLUE}Testing complete user flow...${NC}"

    # Test 1: User can access frontend
    if curl -s "http://localhost:3000" | grep -q "UnifiedChat"; then
        print_result 0 "Frontend loads correctly"
    else
        print_result 1 "Frontend does not load correctly"
        return 1
    fi

    # Test 2: User can authenticate
    if test_auth; then
        print_result 0 "Complete authentication flow works"
    else
        print_result 1 "Authentication flow failed"
        return 1
    fi

    # Test 3: User can send messages
    if test_messaging; then
        print_result 0 "Complete messaging flow works"
    else
        print_result 1 "Messaging flow failed"
        return 1
    fi

    print_result 0 "Complete user flow test passed"
    return 0
}

# Main test execution
main() {
    echo "Starting comprehensive MVP tests..."
    echo ""

    # Check if services are running
    echo "📋 Service Health Checks"
    echo "----------------------"
    check_health
    echo ""

    # Test databases
    echo "🗄️  Database Tests"
    echo "----------------"
    check_database
    echo ""

    # Test core services
    echo "🔧 Core Service Tests"
    echo "-------------------"
    test_auth
    test_messaging
    test_realtime
    echo ""

    # Test Janus audio calling
    echo "📞 Audio Calling Tests"
    echo "--------------------"
    test_janus
    test_turn
    echo ""

    # Test frontend
    echo "🌐 Frontend Tests"
    echo "---------------"
    test_frontend
    echo ""

    # Test complete user flow
    echo "👤 User Flow Tests"
    echo "----------------"
    test_user_flow
    echo ""

    # Summary
    echo "📊 Test Summary"
    echo "--------------"
    echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
    echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! MVP is ready for use.${NC}"
        echo ""
        echo "🚀 Next Steps:"
        echo "1. Open http://localhost:3000 in your browser"
        echo "2. Login with username: admin, password: password123"
        echo "3. Select a user to start chatting"
        echo "4. Click the phone button to start an audio call"
        echo ""
        echo "📞 Audio Calling Features:"
        echo "- High-quality audio using Janus WebRTC server"
        echo "- Automatic NAT traversal with TURN server"
        echo "- Mute/unmute functionality"
        echo "- Real-time connection status"
        echo ""
        return 0
    else
        echo -e "${RED}❌ Some tests failed. Please check the service logs:${NC}"
        echo "make logs"
        echo ""
        return 1
    fi
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if services are running
if ! docker-compose -f docker-compose.mvp.yml ps | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  Services are not running. Starting them now...${NC}"
    make dev-up
    echo "Waiting for services to start..."
    sleep 30
fi

# Run tests
main "$@"
