# Janus WebRTC Server Deployment Guide

## Overview

This guide covers deploying Janus WebRTC Server for the UnifiedChat MVP, replacing the previous WebRTC implementation with a more robust, Slack-level audio calling solution.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Janus Server  │    │   TURN Server   │
│   (React)       │◄──►│   (WebRTC)      │◄──►│   (Coturn)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Auth Service  │    │  Message Service│    │ Realtime Service│
│   (Go)          │    │  (Go)           │    │ (Go)            │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Local Development Setup

### 1. Start Janus Server

```bash
cd services/janus-service
docker-compose up -d
```

This starts:

- Janus WebRTC Gateway (port 8088/8089)
- Coturn TURN Server (port 3478)

### 2. Verify Janus is Running

```bash
# Check Janus HTTP API
curl http://localhost:8088/janus/info

# Check Docker containers
docker ps | grep janus
```

### 3. Update Frontend Environment

The cleanup script has already created `web/frontend/.env.local`:

```env
# Janus WebRTC Server
NEXT_PUBLIC_JANUS_URL=ws://localhost:8089
NEXT_PUBLIC_JANUS_HTTP_URL=http://localhost:8088

# Existing services
NEXT_PUBLIC_AUTH_API_URL=https://unifiedchat-auth.onrender.com
NEXT_PUBLIC_MESSAGE_API_URL=https://unifiedchat-message-service.onrender.com
NEXT_PUBLIC_REALTIME_API_URL=https://realtime-service-onfn.onfn.onrender.com
```

### 4. Start Frontend

```bash
cd web/frontend
npm run dev
```

## Production Deployment

### Option 1: Render.com Deployment

#### 1. Deploy Janus to Render

Create a new Web Service in Render:

**Build Command:**

```bash
cd services/janus-service && docker-compose up -d
```

**Start Command:**

```bash
docker-compose up
```

**Environment Variables:**

```env
JANUS_LOG_LEVEL=4
JANUS_LOG_TIMESTAMPS=true
TURN_USERNAME=unifiedchat
TURN_PASSWORD=unifiedchat123
TURN_REALM=unifiedchat.com
```

#### 2. Update Frontend Environment

Update the frontend environment variables to point to your deployed Janus instance:

```env
NEXT_PUBLIC_JANUS_URL=wss://your-janus-service.onrender.com:8089
NEXT_PUBLIC_JANUS_HTTP_URL=https://your-janus-service.onrender.com:8088
```

### Option 2: Railway Deployment

#### 1. Deploy Janus to Railway

```bash
cd services/janus-service
railway login
railway init
railway up
```

#### 2. Configure Environment Variables

Set the same environment variables as in Render deployment.

### Option 3: Self-Hosted VPS

#### 1. Server Requirements

- Ubuntu 20.04+ or CentOS 8+
- Docker and Docker Compose
- 2GB RAM minimum, 4GB recommended
- Public IP address

#### 2. Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/alcall.git
cd alcall

# Start Janus
cd services/janus-service
docker-compose up -d

# Configure firewall
sudo ufw allow 8088/tcp
sudo ufw allow 8089/tcp
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 10000:10200/udp
```

## Configuration

### Janus Configuration Files

The Janus service includes optimized configuration files:

- `janus.plugin.audiobridge.jcfg` - Audio bridge plugin settings
- `janus.plugin.videoroom.jcfg` - Video room plugin (for future use)
- `janus.transport.http.jcfg` - HTTP transport settings
- `janus.transport.websockets.jcfg` - WebSocket transport settings

### TURN Server Configuration

The included Coturn server provides:

- STUN/TURN services for NAT traversal
- UDP and TCP support
- Configurable credentials

## Testing

### 1. Basic Connectivity Test

```bash
# Test Janus HTTP API
curl -X GET http://localhost:8088/janus/info

# Expected response:
{
  "janus": "server_info",
  "name": "Janus WebRTC Server",
  "version": "1.0.0",
  "version_string": "1.0.0",
  "author": "Meetecho",
  "data_structures": "json",
  "plugins": {
    "janus.plugin.audiobridge": {
      "name": "Audio Bridge",
      "version": "1.0.0",
      "description": "Audio Bridge plugin"
    }
  }
}
```

### 2. Frontend Integration Test

1. Open the frontend application
2. Log in with any user
3. Select another user from the sidebar
4. Click the call button
5. Check browser console for Janus connection logs

### 3. Audio Call Test

1. Open two browser windows/tabs
2. Log in with different users in each
3. Start a call from one user to another
4. Verify audio is transmitted between users

## Troubleshooting

### Common Issues

#### 1. Janus Connection Failed

**Symptoms:** "Janus library not loaded" error

**Solution:** Ensure the Janus script is loaded in the HTML head:

```html
<script src="https://unpkg.com/janus-gateway@1.0.0/html/janus.js"></script>
```

#### 2. WebSocket Connection Error

**Symptoms:** WebSocket connection timeout

**Solution:**

- Check if Janus server is running: `docker ps | grep janus`
- Verify ports are open: `netstat -tlnp | grep 8089`
- Check firewall settings

#### 3. Audio Not Working

**Symptoms:** No audio heard during calls

**Solution:**

- Check browser permissions for microphone access
- Verify AudioContext is not suspended
- Check browser console for WebRTC errors

#### 4. TURN Server Issues

**Symptoms:** Calls fail in restrictive networks

**Solution:**

- Verify TURN server is running: `docker ps | grep coturn`
- Check TURN credentials in configuration
- Test TURN server: `turnutils_uclient -v -t -u username -w password your-turn-server.com`

### Debug Commands

```bash
# Check Janus logs
docker logs unifiedchat-janus

# Check TURN server logs
docker logs unifiedchat-turn

# Test WebSocket connection
wscat -c ws://localhost:8089

# Monitor network connections
netstat -tlnp | grep -E "(8088|8089|3478)"
```

## Performance Optimization

### 1. Janus Configuration

Optimize for your use case:

```json
{
  "general": {
    "enabled": true,
    "sampling_rate": 48000,
    "opus_bitrate": 32000,
    "opus_complexity": 10,
    "opus_vbr": true
  }
}
```

### 2. TURN Server Optimization

For high-traffic scenarios:

```bash
# Increase UDP buffer size
echo 'net.core.rmem_max=26214400' >> /etc/sysctl.conf
echo 'net.core.wmem_max=26214400' >> /etc/sysctl.conf
sysctl -p
```

### 3. Frontend Optimization

- Use WebRTC adapter for browser compatibility
- Implement connection pooling for multiple calls
- Add reconnection logic for network issues

## Security Considerations

### 1. TURN Server Security

- Use strong, unique passwords
- Enable TLS for TURN server
- Restrict TURN server access to your domain

### 2. Janus Security

- Configure authentication for Janus API
- Use HTTPS/WSS in production
- Implement rate limiting

### 3. Frontend Security

- Validate all user inputs
- Implement proper CORS policies
- Use secure WebRTC constraints

## Monitoring and Logging

### 1. Janus Logs

```bash
# Follow Janus logs
docker logs -f unifiedchat-janus

# Check for errors
docker logs unifiedchat-janus | grep ERROR
```

### 2. TURN Server Logs

```bash
# Follow TURN logs
docker logs -f unifiedchat-turn

# Monitor TURN usage
docker logs unifiedchat-turn | grep "session"
```

### 3. Frontend Monitoring

Add monitoring to the frontend:

```javascript
// Monitor Janus connection health
setInterval(() => {
  if (!janusConnected) {
    console.warn("Janus connection lost, attempting reconnect...");
    initializeJanus();
  }
}, 30000);
```

## Future Enhancements

### 1. Video Support

The Janus configuration includes video room plugin for future video calling:

```javascript
// Future video call implementation
janusRef.current.attach({
  plugin: "janus.plugin.videoroom",
  // ... video configuration
});
```

### 2. Screen Sharing

Add screen sharing capability:

```javascript
// Screen sharing implementation
navigator.mediaDevices
  .getDisplayMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    // Handle screen sharing stream
  });
```

### 3. Recording

Implement call recording:

```javascript
// Recording implementation
const mediaRecorder = new MediaRecorder(stream);
mediaRecorder.start();
// ... recording logic
```

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review Janus documentation: https://janus.conf.meetecho.com/
3. Check browser console for detailed error messages
4. Verify all services are running and accessible

## Conclusion

Janus WebRTC Server provides a robust, scalable solution for audio calling in UnifiedChat. The integration replaces the previous WebRTC implementation with enterprise-grade reliability and performance.

The setup includes:

- ✅ Janus WebRTC Gateway
- ✅ TURN server for NAT traversal
- ✅ Optimized audio configuration
- ✅ Production-ready deployment options
- ✅ Comprehensive monitoring and debugging
- ✅ Future-ready for video calling
