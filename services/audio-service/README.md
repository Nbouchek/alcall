# Audio Call Service

A WebRTC-based audio call service for the UnifiedChat MVP.

## Features

- **WebRTC Audio Calls**: Peer-to-peer audio communication
- **WebSocket Signaling**: Real-time call signaling and notifications
- **Call Management**: Start, answer, and end calls
- **User Notifications**: Real-time notifications for incoming calls

## API Endpoints

### REST API

- `POST /call/start` - Start a new call
- `POST /call/answer` - Answer or reject a call
- `POST /call/end` - End an active call
- `GET /call/status/:call_id` - Get call status
- `GET /health` - Health check

### WebSocket

- `GET /ws/:user_id` - WebSocket connection for real-time signaling

## Call Flow

1. **Call Initiation**: User A calls User B
2. **Notification**: User B receives incoming call notification
3. **Answer/Reject**: User B can answer or reject the call
4. **WebRTC Connection**: If answered, WebRTC connection is established
5. **Audio Communication**: Peer-to-peer audio streaming
6. **Call End**: Either user can end the call

## WebSocket Message Types

- `incoming_call` - Notify user of incoming call
- `call_answered` - Notify caller that call was answered
- `call_rejected` - Notify caller that call was rejected
- `call_ended` - Notify participants that call ended
- `offer` - WebRTC offer
- `answer` - WebRTC answer
- `ice_candidate` - ICE candidate for WebRTC

## Environment Variables

- `PORT` - Service port (default: 8084)

## Development

```bash
# Install dependencies
go mod tidy

# Run locally
go run src/main.go

# Build Docker image
docker build -t audio-service .
```

## Integration

This service integrates with the main chat application to provide audio calling capabilities alongside text messaging.
