#!/bin/bash

# Test script for messaging between two users
echo "=== UnifiedChat MVP Message Testing ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test credentials
USER1="admin"
PASS1="password123"
USER2="user2"
PASS2="password123"

echo -e "${YELLOW}Step 1: Login as User 1 (admin)${NC}"
TOKEN1=$(curl -s -X POST http://localhost:8082/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER1\",\"password\":\"$PASS1\"}" | jq -r '.token')

if [ "$TOKEN1" = "null" ] || [ -z "$TOKEN1" ]; then
    echo -e "${RED}Failed to login as User 1${NC}"
    exit 1
fi
echo -e "${GREEN}✓ User 1 logged in successfully${NC}"

echo -e "${YELLOW}Step 2: Login as User 2 (user2)${NC}"
TOKEN2=$(curl -s -X POST http://localhost:8082/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER2\",\"password\":\"$PASS2\"}" | jq -r '.token')

if [ "$TOKEN2" = "null" ] || [ -z "$TOKEN2" ]; then
    echo -e "${RED}Failed to login as User 2${NC}"
    exit 1
fi
echo -e "${GREEN}✓ User 2 logged in successfully${NC}"

echo -e "${YELLOW}Step 3: User 1 sends a message to User 2${NC}"
MESSAGE1="Hello User 2! This is a test message from admin."
RESPONSE1=$(curl -s -X POST http://localhost:8083/messages \
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
MESSAGE2="Hi admin! Thanks for the message. This is my reply."
RESPONSE2=$(curl -s -X POST http://localhost:8083/messages \
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
MESSAGES1=$(curl -s -X GET http://localhost:8083/messages/1 \
  -H "Authorization: Bearer $TOKEN1")

echo "Messages for User 1:"
echo "$MESSAGES1" | jq -r '.[] | "\(.created_at): \(.content) (from: \(.sender_id), to: \(.receiver_id))"'

echo -e "${YELLOW}Step 6: User 2 retrieves their messages${NC}"
MESSAGES2=$(curl -s -X GET http://localhost:8083/messages/2 \
  -H "Authorization: Bearer $TOKEN2")

echo "Messages for User 2:"
echo "$MESSAGES2" | jq -r '.[] | "\(.created_at): \(.content) (from: \(.sender_id), to: \(.receiver_id))"'

echo -e "${GREEN}=== Message Testing Complete ===${NC}"
