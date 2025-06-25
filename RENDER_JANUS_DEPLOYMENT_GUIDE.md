# 🚀 Render Deployment Guide: UnifiedChat Janus WebRTC Service

This guide will help you deploy the UnifiedChat Janus WebRTC service to Render for enterprise-grade audio calling.

## 📋 Prerequisites

1. **Render Account**: Sign up at [https://dashboard.render.com/](https://dashboard.render.com/)
2. **GitHub Repository**: Your UnifiedChat code should be in a GitHub repository
3. **Docker Knowledge**: Basic understanding of Docker containers

## 🎯 What We're Deploying

- **Janus WebRTC Server**: Enterprise-grade audio calling service
- **Audio Bridge Plugin**: Multi-user audio conferencing
- **WebSocket Support**: Real-time signaling
- **TURN Server Integration**: NAT traversal support

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Repository

Ensure your repository has the following structure:

```
services/janus-service/
├── Dockerfile
├── render.yaml
└── config/
    ├── janus.plugin.audiobridge.jcfg
    ├── janus.plugin.videoroom.jcfg
    ├── janus.transport.http.jcfg
    └── janus.transport.websockets.jcfg
```

### Step 2: Access Render Dashboard

1. Go to [https://dashboard.render.com/](https://dashboard.render.com/)
2. Sign in to your Render account
3. Click **"New +"** button
4. Select **"Web Service"**

### Step 3: Connect Your Repository

1. **Connect Repository**:

   - Choose **"Connect a repository"**
   - Select your GitHub account
   - Find and select your `alcall` repository
   - Click **"Connect"**

2. **Configure Service**:
   - **Name**: `unifiedchat-janus-service`
   - **Region**: Choose closest to your users (e.g., Oregon)
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `services/janus-service`
   - **Runtime**: `Docker`
   - **Instance Type**: `Starter` (free tier)

### Step 4: Configure Environment Variables

Add these environment variables in the Render dashboard:

| Key                    | Value  | Description       |
| ---------------------- | ------ | ----------------- |
| `PORT`                 | `8088` | HTTP API port     |
| `JANUS_LOG_LEVEL`      | `4`    | Logging level     |
| `JANUS_LOG_TIMESTAMPS` | `true` | Enable timestamps |

### Step 5: Configure Build Settings

1. **Build Command**: `docker build -t janus .`
2. **Start Command**: `docker run -p $PORT:8088 -p 8089:8089 -p 8000:8000 janus`
3. **Health Check Path**: `/janus/info`

### Step 6: Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Build your Docker image
   - Deploy the service
   - Run health checks
   - Provide a public URL

## 🔧 Configuration Details

### Port Configuration

The Janus service uses multiple ports:

- **8088**: HTTP API (main service port)
- **8089**: WebSocket API
- **8000**: WebRTC media
- **10000-10200**: RTP/RTCP (UDP)

### Health Check

The service health check endpoint `/janus/info` returns:

```json
{
  "janus": "server_info",
  "version": "1.0.0",
  "version_string": "1.0.0",
  "plugins": ["janus.plugin.audiobridge", "janus.plugin.videoroom"]
}
```

## 🌐 Accessing Your Service

After deployment, you'll get:

- **HTTP API**: `https://your-service-name.onrender.com`
- **WebSocket**: `wss://your-service-name.onrender.com:8089`
- **Health Check**: `https://your-service-name.onrender.com/janus/info`

## 🔗 Update Frontend Configuration

Update your frontend environment variables:

```javascript
// In your frontend .env file
NEXT_PUBLIC_JANUS_URL=wss://your-service-name.onrender.com:8089
NEXT_PUBLIC_JANUS_HTTP_URL=https://your-service-name.onrender.com
```

## 🧪 Testing Your Deployment

### 1. Health Check

```bash
curl https://your-service-name.onrender.com/janus/info
```

### 2. WebSocket Connection

```javascript
// Test WebSocket connection
const ws = new WebSocket("wss://your-service-name.onrender.com:8089");
ws.onopen = () => console.log("Connected to Janus");
ws.onmessage = (event) => console.log("Message:", event.data);
```

### 3. Audio Call Test

1. Open your frontend application
2. Login and select a user
3. Click the phone button to start a call
4. Grant microphone permissions
5. Verify audio quality

## 🔍 Monitoring and Logs

### View Logs

1. Go to your service in Render dashboard
2. Click **"Logs"** tab
3. Monitor for any errors or issues

### Common Log Messages

- `Janus WebRTC Server started`
- `AudioBridge plugin loaded`
- `WebSocket transport enabled`
- `HTTP transport enabled`

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**

   - Check Dockerfile syntax
   - Verify all config files exist
   - Ensure repository is public or connected properly

2. **Service Not Starting**

   - Check logs for error messages
   - Verify port configuration
   - Ensure health check endpoint is accessible

3. **WebRTC Connection Issues**

   - Check WebSocket URL configuration
   - Verify TURN server settings
   - Test with different browsers

4. **Audio Quality Problems**
   - Check Opus codec configuration
   - Verify echo cancellation settings
   - Monitor network connectivity

### Debug Commands

```bash
# Check service status
curl -I https://your-service-name.onrender.com/janus/info

# Test WebSocket
wscat -c wss://your-service-name.onrender.com:8089

# Check logs
# Use Render dashboard logs tab
```

## 🔄 Updating Your Service

### Automatic Deployments

- Render automatically deploys when you push to your main branch
- No manual intervention required

### Manual Deployments

1. Go to your service in Render dashboard
2. Click **"Manual Deploy"**
3. Select branch and commit
4. Click **"Deploy latest commit"**

## 💰 Cost Considerations

### Free Tier (Starter)

- **$0/month** for basic usage
- **512 MB RAM**
- **0.1 CPU**
- **750 hours/month**
- **Sleeps after 15 minutes of inactivity**

### Paid Plans

- **Standard**: $7/month for always-on service
- **Pro**: $25/month for higher performance
- **Custom**: Enterprise-grade resources

## 🔐 Security Considerations

1. **HTTPS**: Render provides automatic SSL certificates
2. **Environment Variables**: Keep sensitive data in Render's env vars
3. **Access Control**: Consider implementing authentication for Janus API
4. **Rate Limiting**: Monitor usage to prevent abuse

## 📊 Performance Optimization

### For Production Use

1. **Upgrade to Standard Plan**: Prevents sleep mode
2. **Monitor Resources**: Watch CPU and memory usage
3. **Optimize Config**: Tune Janus settings for your use case
4. **CDN Integration**: Consider using a CDN for global distribution

## 🎯 Next Steps

After successful deployment:

1. **Test Audio Calls**: Verify call quality and connectivity
2. **Update Frontend**: Point your frontend to the new Janus URL
3. **Monitor Performance**: Watch logs and metrics
4. **Scale as Needed**: Upgrade plan if usage increases

## 📞 Support

- **Render Documentation**: [https://render.com/docs](https://render.com/docs)
- **Janus Documentation**: [https://janus.conf.meetecho.com/](https://janus.conf.meetecho.com/)
- **Community Forums**: Render and Janus community support

---

## 🎉 Success!

Your UnifiedChat Janus WebRTC service is now deployed on Render and ready to provide enterprise-grade audio calling capabilities to your users!

**Service URL**: `https://your-service-name.onrender.com`
**WebSocket URL**: `wss://your-service-name.onrender.com:8089`

The service will automatically handle:

- ✅ High-quality audio with Opus codec
- ✅ Echo cancellation and noise suppression
- ✅ Automatic NAT traversal
- ✅ Multi-user audio conferencing
- ✅ Real-time WebSocket signaling
