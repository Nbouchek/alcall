# UnifiedChat MVP - Message Testing Guide

## Overview

This guide explains how to test the message exchange functionality between multiple users in the UnifiedChat MVP.

## Prerequisites

- All services are running (check with `docker-compose -f docker-compose.mvp.yml ps`)
- Frontend is accessible at http://localhost:3000

## Test Accounts

The system includes three pre-configured test accounts:

| Username | Password    | User ID |
| -------- | ----------- | ------- |
| admin    | password123 | 1       |
| user2    | password123 | 2       |
| user3    | password123 | 3       |

## Testing Methods

### Method 1: Automated Testing (Recommended)

Run the automated test script:

```bash
./test_messaging.sh
```

This script will:

1. Login as admin and user2
2. Send messages between users
3. Retrieve and display all messages
4. Show the results in a formatted output

### Method 2: Manual Testing via Frontend

#### Step 1: Open Multiple Browser Windows

1. Open http://localhost:3000 in your main browser
2. Open http://localhost:3000 in an incognito/private window
3. Or use different browsers (Chrome, Firefox, Safari)

#### Step 2: Login as Different Users

1. **Window 1**: Login as `admin` with password `password123`
2. **Window 2**: Login as `user2` with password `password123`

#### Step 3: Exchange Messages

1. In the admin window, select "user2" from the user list on the left
2. Type a message and click "Send"
3. In the user2 window, you should see the message appear
4. Reply from user2 to admin
5. Continue the conversation

#### Step 4: Test Real-time Updates

- Messages should appear automatically every 3 seconds
- Try sending messages from both users simultaneously
- Test the logout functionality

### Method 3: API Testing with curl

#### Login as admin:

```bash
curl -X POST http://localhost:8082/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

#### Login as user2:

```bash
curl -X POST http://localhost:8082/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user2","password":"password123"}'
```

#### Send a message (replace TOKEN with actual token):

```bash
curl -X POST http://localhost:8083/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"sender_id":1,"receiver_id":2,"content":"Hello from API!"}'
```

#### Get messages for a user:

```bash
curl -X GET http://localhost:8083/messages/1 \
  -H "Authorization: Bearer TOKEN"
```

## Expected Behavior

### Frontend Features

- ✅ User authentication with multiple accounts
- ✅ User selection for sending messages
- ✅ Real-time message polling (every 3 seconds)
- ✅ Message bubbles with sender name and timestamp
- ✅ Different styling for own vs. other messages
- ✅ Logout functionality
- ✅ Responsive design

### Backend Features

- ✅ JWT-based authentication
- ✅ Message persistence in PostgreSQL
- ✅ CORS support for frontend integration
- ✅ RESTful API endpoints
- ✅ Health checks for all services

### Message Flow

1. User A selects User B from the user list
2. User A types and sends a message
3. Message is stored in the database
4. User B's frontend polls for new messages
5. Message appears in User B's chat window
6. User B can reply to User A

## Troubleshooting

### Common Issues

#### "Login failed: undefined"

- Check if auth service is running: `docker-compose -f docker-compose.mvp.yml logs auth-service`
- Verify CORS is configured properly
- Check browser console for errors

#### Messages not appearing

- Check message service logs: `docker-compose -f docker-compose.mvp.yml logs message-service`
- Verify database connection
- Check if frontend is polling correctly

#### CORS errors

- Ensure auth and message services have CORS configured
- Check that frontend is running on localhost:3000

### Service Status Check

```bash
# Check all services
docker-compose -f docker-compose.mvp.yml ps

# Check specific service logs
docker-compose -f docker-compose.mvp.yml logs auth-service
docker-compose -f docker-compose.mvp.yml logs message-service
docker-compose -f docker-compose.mvp.yml logs frontend
```

### Restart Services

```bash
# Restart all services
docker-compose -f docker-compose.mvp.yml restart

# Restart specific service
docker-compose -f docker-compose.mvp.yml restart auth-service
```

## Next Steps

Once basic messaging is working, you can test:

1. **Real-time WebSocket integration** (realtime-service)
2. **User management** (user-service)
3. **API Gateway** (gateway-service)
4. **Payment processing** (payment-service)
5. **AI features** (ai-service)

## Architecture Notes

- **Frontend**: Next.js with React, Tailwind CSS
- **Backend**: Go with Gin framework
- **Database**: PostgreSQL
- **Authentication**: JWT tokens
- **Real-time**: WebSocket support (ready for integration)
- **Containerization**: Docker with docker-compose
