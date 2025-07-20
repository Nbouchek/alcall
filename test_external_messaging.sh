#!/bin/bash

# Test script for external messaging between machines
echo "=== UnifiedChat MVP External Message Testing ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server IP (change this to your server's IP)
SERVER_IP="192.168.1.249"

echo -e "${BLUE}Server IP: ${SERVER_IP}${NC}"
echo -e "${YELLOW}Make sure both machines can reach this IP address${NC}"
echo ""

# Test connectivity
echo -e "${YELLOW}Testing connectivity to server...${NC}"
if curl -s --connect-timeout 5 http://${SERVER_IP}:8082/health > /dev/null; then
    echo -e "${GREEN}✓ Server is reachable${NC}"
else
    echo -e "${RED}✗ Cannot reach server at ${SERVER_IP}${NC}"
    echo "Please check:"
    echo "1. Server IP is correct"
    echo "2. Both machines are on the same network"
    echo "3. Firewall allows connections on ports 8082, 8083, 3000"
    exit 1
fi

# Test credentials
USER1="admin"
PASS1="password123"
USER2="user2"
PASS2="password123"

echo -e "${YELLOW}Step 1: Login as User 1 (admin)${NC}"
TOKEN1=$(curl -s -X POST http://${SERVER_IP}:8082/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER1\",\"password\":\"$PASS1\"}" | jq -r '.token')

if [ "$TOKEN1" = "null" ] || [ -z "$TOKEN1" ]; then
    echo -e "${RED}Failed to login as User 1${NC}"
    exit 1
fi
echo -e "${GREEN}✓ User 1 logged in successfully${NC}"

echo -e "${YELLOW}Step 2: Login as User 2 (user2)${NC}"
TOKEN2=$(curl -s -X POST http://${SERVER_IP}:8082/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER2\",\"password\":\"$PASS2\"}" | jq -r '.token')

if [ "$TOKEN2" = "null" ] || [ -z "$TOKEN2" ]; then
    echo -e "${RED}Failed to login as User 2${NC}"
    exit 1
fi
echo -e "${GREEN}✓ User 2 logged in successfully${NC}"

echo -e "${YELLOW}Step 3: User 1 sends a message to User 2${NC}"
MESSAGE1="Hello from Machine 1! This is a cross-machine test message."
RESPONSE1=$(curl -s -X POST http://${SERVER_IP}:8083/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d "{\"sender_id\":1,\"receiver_id\":2,\"content\":\"$MESSAGE1\"}")

if echo "$RESPONSE1" | jq -e '.id' > /dev/null; then
    echo -e "${GREEN}✓ Message sent successfully${NC}"
    echo "   Content: $MESSAGE1"
else
    echo -e "${RED}✗ Failed to send message${NC}"
    echo "   Response: $RESPONSE1"
fi

echo -e "${YELLOW}Step 4: User 2 sends a reply to User 1${NC}"
MESSAGE2="Hi from Machine 2! Cross-machine messaging is working!"
RESPONSE2=$(curl -s -X POST http://${SERVER_IP}:8083/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d "{\"sender_id\":2,\"receiver_id\":1,\"content\":\"$MESSAGE2\"}")

if echo "$RESPONSE2" | jq -e '.id' > /dev/null; then
    echo -e "${GREEN}✓ Reply sent successfully${NC}"
    echo "   Content: $MESSAGE2"
else
    echo -e "${RED}✗ Failed to send reply${NC}"
    echo "   Response: $RESPONSE2"
fi

echo -e "${YELLOW}Step 5: User 1 retrieves their messages${NC}"
MESSAGES1=$(curl -s -X GET http://${SERVER_IP}:8083/messages/1 \
  -H "Authorization: Bearer $TOKEN1")

echo "Messages for User 1:"
echo "$MESSAGES1" | jq -r '.[] | "\(.created_at): \(.content) (from: \(.sender_id), to: \(.receiver_id))"'

echo -e "${YELLOW}Step 6: User 2 retrieves their messages${NC}"
MESSAGES2=$(curl -s -X GET http://${SERVER_IP}:8083/messages/2 \
  -H "Authorization: Bearer $TOKEN2")

echo "Messages for User 2:"
echo "$MESSAGES2" | jq -r '.[] | "\(.created_at): \(.content) (from: \(.sender_id), to: \(.receiver_id))"'

echo ""
echo -e "${GREEN}=== External Message Testing Complete ===${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Open http://${SERVER_IP}:3000 in Machine 1"
echo "2. Open http://${SERVER_IP}:3000 in Machine 2"
echo "3. Login as different users and start chatting!"
echo ""
echo -e "${YELLOW}Test Accounts:${NC}"
echo "• admin / password123"
echo "• user2 / password123"
echo "• user3 / password123"
