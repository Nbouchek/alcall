# Render.com Janus Deployment Guide

## Quick Setup for Render

### 1. **Create New Web Service**

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Set **Root Directory** to: `services/janus-service`

### 2. **Configure Service Settings**

**Name:** `janus-service` (or any name you prefer)

**Environment:** `Docker`

**Region:** Choose closest to your users

**Branch:** `main` (or your default branch)

**Build Command:** (Leave blank)

**Start Command:**

```bash
docker-compose up
```

### 3. **Set Environment Variables**

Add these in the Render dashboard:

| Key                    | Value  |
| ---------------------- | ------ |
| `JANUS_LOG_LEVEL`      | `4`    |
| `JANUS_LOG_TIMESTAMPS` | `true` |

### 4. **Port Configuration**

- **Port:** `8088`
- **Auto-Deploy:** ✅ Enabled

### 5. **Deploy**

Click **"Create Web Service"** and wait for deployment (5-10 minutes).

---

## After Deployment

### 1. **Get Your Service URL**

Once deployed, copy your service URL from Render dashboard:

- Example: `https://janus-service-abc123.onrender.com`

### 2. **Update Frontend Environment**

Update your frontend `.env.local`:

```env
# Replace with your actual Render service URL
NEXT_PUBLIC_JANUS_URL=wss://janus-service-abc123.onrender.com:8089
NEXT_PUBLIC_JANUS_HTTP_URL=https://janus-service-abc123.onrender.com:8088
```

### 3. **Test the Service**

```bash
# Test HTTP API
curl https://janus-service-abc123.onrender.com:8088/janus/info

# Should return JSON with Janus info
```

---

## Troubleshooting

### **If deployment fails:**

1. **Check Render logs** for specific errors
2. **Verify root directory** is set to `services/janus-service`
3. **Ensure docker-compose.yml** exists in that directory

### **If service doesn't start:**

1. **Check environment variables** are set correctly
2. **Verify port 8088** is exposed
3. **Check service logs** in Render dashboard

### **If frontend can't connect:**

1. **Verify URLs** in `.env.local`
2. **Check WebSocket URL** uses `wss://` (not `ws://`)
3. **Ensure port numbers** are correct (8088/8089)

---

## Alternative: Simple Dockerfile Approach

If the docker-compose approach doesn't work, create a `Dockerfile` in `services/janus-service/`:

```dockerfile
FROM ubuntu:20.04

RUN apt-get update && apt-get install -y \
    janus \
    janus-plugins \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/janus/etc/janus

# Create minimal config files
RUN echo 'general: { enabled = true, sampling_rate = 48000, opus_bitrate = 32000 }' > /opt/janus/etc/janus/janus.plugin.audiobridge.jcfg
RUN echo 'general: { base_path = "/janus" }' > /opt/janus/etc/janus/janus.transport.http.jcfg
RUN echo 'general: { enabled = true }' > /opt/janus/etc/janus/janus.transport.websockets.jcfg

EXPOSE 8088 8089 8000

CMD ["janus", "-F", "/opt/janus/etc/janus", "-L", "4", "-d", "5"]
```

Then set **Start Command** to: `docker build -t janus . && docker run -p 8088:8088 -p 8089:8089 -p 8000:8000 janus`

---

## Success Indicators

✅ **Service deploys without errors**
✅ **Health check passes** (green status in Render)
✅ **HTTP API responds** to `/janus/info`
✅ **Frontend connects** to Janus WebSocket
✅ **Audio calls work** between users

---

## Next Steps

1. **Test audio calling** in your frontend
2. **Monitor logs** for any issues
3. **Scale up** if needed (Render allows scaling)
4. **Set up monitoring** for production use

---

**Need help?** Check the Render logs and let me know what errors you see!
