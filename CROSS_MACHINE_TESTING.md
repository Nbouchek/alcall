# Cross-Machine Testing Guide

## Overview

This guide explains how to test the UnifiedChat MVP messaging functionality between two different machines on the same network.

## Prerequisites

### Server Machine (Current Machine)

- ✅ All services are running with external access
- ✅ IP Address: `192.168.1.249`
- ✅ Ports open: 3000, 8082, 8083, 8084

### Client Machines

- Both machines must be on the same network
- Web browser (Chrome, Firefox, Safari, Edge)
- Network connectivity to server IP

## Quick Start

### Step 1: Verify Server is Running

On the server machine, run:

```bash
docker-compose -f docker-compose.external.yml ps
```

All services should show as "Up" or "Healthy".

### Step 2: Test Connectivity

On each client machine, test connectivity:

```bash
# Test if server is reachable
curl http://192.168.1.249:8082/health

# Or use the automated test script
./test_external_messaging.sh
```

### Step 3: Access the Web Interface

On both client machines, open:

```
http://192.168.1.249:3000
```

## Testing Scenarios

### Scenario 1: Two Different Machines

1. **Machine 1**: Open browser → http://192.168.1.249:3000
2. **Machine 2**: Open browser → http://192.168.1.249:3000
3. **Machine 1**: Login as `admin` / `password123`
4. **Machine 2**: Login as `user2` / `password123`
5. Start chatting between the two machines!

### Scenario 2: Multiple Users

1. **Machine 1**: Login as `admin`
2. **Machine 2**: Login as `user2`
3. **Machine 3** (or incognito window): Login as `user3`
4. Test group messaging between all three users

### Scenario 3: API Testing

Use curl commands from different machines:

```bash
# From Machine 1
curl -X POST http://192.168.1.249:8082/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# From Machine 2
curl -X POST http://192.168.1.249:8082/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user2","password":"password123"}'
```

## Test Accounts

| Username | Password    | User ID | Purpose              |
| -------- | ----------- | ------- | -------------------- |
| admin    | password123 | 1       | Primary test user    |
| user2    | password123 | 2       | Secondary test user  |
| user3    | password123 | 3       | Additional test user |

## Expected Behavior

### Real-time Messaging

- ✅ Messages appear automatically every 3 seconds
- ✅ No page refresh needed
- ✅ Messages are persistent across sessions

### User Interface

- ✅ Modern chat interface with message bubbles
- ✅ User selection sidebar
- ✅ Timestamps on messages
- ✅ Different styling for sent vs received messages

### Cross-Machine Features

- ✅ Messages sync between machines
- ✅ Real-time updates across network
- ✅ Session management with JWT tokens

## Troubleshooting

### Connection Issues

#### "Cannot reach server"

1. **Check Network**: Ensure both machines are on the same network
2. **Check IP**: Verify server IP is correct (`192.168.1.249`)
3. **Check Firewall**: Ensure ports 3000, 8082, 8083 are open
4. **Test Connectivity**: `ping 192.168.1.249`

#### "Login failed"

1. **Check Server Status**: `docker-compose -f docker-compose.external.yml ps`
2. **Check Service Logs**: `docker-compose -f docker-compose.external.yml logs auth-service`
3. **Verify CORS**: Services should allow all origins

#### "Messages not appearing"

1. **Check Message Service**: `docker-compose -f docker-compose.external.yml logs message-service`
2. **Check Database**: Ensure PostgreSQL is running
3. **Check Frontend**: Browser console for JavaScript errors

### Performance Issues

#### Slow Message Delivery

- Messages poll every 3 seconds by default
- Consider reducing polling interval for faster updates
- WebSocket integration available for real-time updates

#### High Network Usage

- Messages are cached locally
- Only new messages are fetched
- Consider implementing message pagination for large conversations

## Advanced Testing

### Load Testing

Test with multiple concurrent users:

```bash
# Simulate multiple users
for i in {1..5}; do
  curl -X POST http://192.168.1.249:8082/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"password123"}' &
done
```

### Stress Testing

Send many messages rapidly:

```bash
# Send 100 messages
for i in {1..100}; do
  curl -X POST http://192.168.1.249:8083/messages \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"sender_id\":1,\"receiver_id\":2,\"content\":\"Test message $i\"}" &
done
```

## Security Considerations

### For Production

- ✅ Change default passwords
- ✅ Use HTTPS/WSS for secure communication
- ✅ Implement proper CORS restrictions
- ✅ Add rate limiting
- ✅ Use environment variables for secrets

### For Testing

- ✅ CORS allows all origins (temporary)
- ✅ JWT secret is hardcoded (temporary)
- ✅ Database credentials are default (temporary)

## Next Steps

Once cross-machine testing is working:

1. **Real-time WebSocket Integration**

   - Enable WebSocket connections for instant messaging
   - Reduce polling frequency

2. **User Management**

   - Implement user registration
   - Add user profiles and avatars

3. **Advanced Features**

   - File sharing
   - Voice/video calls
   - Message encryption

4. **Production Deployment**
   - Use proper domain names
   - Implement SSL certificates
   - Set up monitoring and logging

## Architecture Notes

- **Frontend**: Next.js served on port 3000
- **Auth Service**: JWT authentication on port 8082
- **Message Service**: REST API on port 8083
- **Database**: PostgreSQL on port 5432
- **Real-time**: WebSocket ready on port 8084
- **Network**: All services accessible via server IP
