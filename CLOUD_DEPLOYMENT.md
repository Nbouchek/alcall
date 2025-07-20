# Cloud Deployment Guide for International Access

## Overview

This guide explains how to deploy the UnifiedChat MVP to the cloud so users from different countries can access it.

## Quick Deployment Options

### Option 1: Railway (Recommended - Free Tier)

Railway offers a simple way to deploy Docker applications with a free tier.

#### Step 1: Prepare for Railway

```bash
# Create a Railway-specific docker-compose file
cp docker-compose.external.yml docker-compose.railway.yml
```

#### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create new project
4. Connect your GitHub repository
5. Railway will automatically detect and deploy your Docker setup

#### Step 3: Get Public URL

Railway will provide a public URL like: `https://your-app-name.railway.app`

### Option 2: Render (Free Tier)

Render offers free hosting for web services.

#### Step 1: Prepare for Render

```bash
# Create render.yaml configuration
cat > render.yaml << 'EOF'
services:
  - type: web
    name: unifiedchat-frontend
    env: docker
    dockerfilePath: ./web/frontend/Dockerfile
    dockerContext: .
    envVars:
      - key: NODE_ENV
        value: production
    routes:
      - type: rewrite
        source: /
        destination: /index.html

  - type: web
    name: unifiedchat-auth
    env: docker
    dockerfilePath: ./services/auth-service/Dockerfile
    dockerContext: .
    envVars:
      - key: JWT_SECRET
        generateValue: true

  - type: web
    name: unifiedchat-message
    env: docker
    dockerfilePath: ./services/message-service/Dockerfile
    dockerContext: .
    envVars:
      - key: DB_HOST
        value: unifiedchat-postgres
      - key: DB_PORT
        value: 5432
      - key: DB_NAME
        value: unifiedchat
      - key: DB_USER
        value: unifiedchat
      - key: DB_PASSWORD
        generateValue: true

  - type: pserv
    name: unifiedchat-postgres
    env: docker
    image: postgres:15
    envVars:
      - key: POSTGRES_DB
        value: unifiedchat
      - key: POSTGRES_USER
        value: unifiedchat
      - key: POSTGRES_PASSWORD
        generateValue: true
EOF
```

### Option 3: DigitalOcean App Platform

DigitalOcean offers managed app hosting.

#### Step 1: Prepare for DigitalOcean

```bash
# Create app.yaml for DigitalOcean
cat > app.yaml << 'EOF'
name: unifiedchat
services:
- name: frontend
  source_dir: /web/frontend
  github:
    repo: your-username/alcall
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs

- name: auth-service
  source_dir: /services/auth-service
  github:
    repo: your-username/alcall
    branch: main
  run_command: ./main
  environment_slug: go
  instance_count: 1
  instance_size_slug: basic-xxs

- name: message-service
  source_dir: /services/message-service
  github:
    repo: your-username/alcall
    branch: main
  run_command: ./main
  environment_slug: go
  instance_count: 1
  instance_size_slug: basic-xxs

databases:
- name: postgres
  engine: PG
  version: "15"
EOF
```

### Option 4: AWS (Production Ready)

For production use, AWS offers comprehensive cloud services.

#### Step 1: AWS Setup

```bash
# Install AWS CLI
brew install awscli  # macOS
# or
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS
aws configure
```

#### Step 2: Deploy with ECS

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name unifiedchat

# Create task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service --cluster unifiedchat --service-name unifiedchat-service --task-definition unifiedchat:1
```

## Environment Configuration

### Update Frontend for Cloud

```javascript
// web/frontend/pages/index.js
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://your-domain.com";
```

### Update Services for Cloud

```go
// services/auth-service/src/main.go
func main() {
    port := os.Getenv("PORT")
    if port == "" {
        port = "8082"
    }
    r.Run(":" + port)
}
```

## Domain and SSL Setup

### Option 1: Custom Domain

1. Purchase domain (e.g., from Namecheap, GoDaddy)
2. Point DNS to your cloud provider
3. Configure SSL certificate

### Option 2: Cloud Provider Domain

Most cloud providers offer free subdomains with SSL:

- Railway: `https://your-app.railway.app`
- Render: `https://your-app.onrender.com`
- Vercel: `https://your-app.vercel.app`

## International Access Features

### CORS Configuration

```go
// Allow international access
config.AllowAllOrigins = true
config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
```

### Timezone Handling

```javascript
// Frontend timezone support
const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
};
```

### Multi-language Support (Future)

```javascript
// Add language detection
const userLanguage = navigator.language || "en";
const messages = {
  en: { login: "Login", send: "Send" },
  es: { login: "Iniciar sesión", send: "Enviar" },
  fr: { login: "Connexion", send: "Envoyer" },
};
```

## Testing International Access

### Test from Different Countries

```bash
# Test from different locations
curl -I https://your-app.railway.app/health

# Use online tools
# - https://www.webpagetest.org/
# - https://tools.keycdn.com/performance
# - https://www.gtmetrix.com/
```

### Latency Testing

```bash
# Test response times
time curl https://your-app.railway.app/health

# Test from different regions
# Use AWS CloudFront or similar CDN for global distribution
```

## Security for International Access

### Environment Variables

```bash
# Production secrets
JWT_SECRET=your-super-secret-jwt-key-change-in-production
DB_PASSWORD=your-secure-database-password
NODE_ENV=production
```

### Rate Limiting

```go
// Add rate limiting for international access
import "github.com/gin-contrib/ratelimit"

func main() {
    r := gin.Default()

    // Rate limiting: 100 requests per minute per IP
    r.Use(ratelimit.New(ratelimit.Config{
        Rate:     100,
        Burst:    100,
        Window:   time.Minute,
    }))
}
```

### CORS Security

```go
// Production CORS (replace with your domain)
config.AllowOrigins = []string{
    "https://your-domain.com",
    "https://www.your-domain.com",
}
```

## Monitoring and Analytics

### Health Checks

```bash
# Monitor service health
curl https://your-app.railway.app/health

# Set up monitoring
# - UptimeRobot for uptime monitoring
# - Sentry for error tracking
# - Google Analytics for usage analytics
```

### Performance Monitoring

```javascript
// Frontend performance monitoring
window.addEventListener("load", () => {
  const loadTime =
    performance.timing.loadEventEnd - performance.timing.navigationStart;
  console.log(`Page load time: ${loadTime}ms`);
});
```

## Cost Optimization

### Free Tier Limits

- **Railway**: $5/month after free tier
- **Render**: Free tier available
- **Vercel**: Generous free tier
- **Netlify**: Free tier available

### Scaling Considerations

- Start with free tiers
- Monitor usage and costs
- Scale up as needed
- Use CDN for global performance

## Quick Start Commands

### Deploy to Railway

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Initialize project
railway init

# 4. Deploy
railway up
```

### Deploy to Render

```bash
# 1. Connect GitHub repository
# 2. Create new Web Service
# 3. Select repository
# 4. Configure environment variables
# 5. Deploy automatically
```

## Next Steps After Deployment

1. **Test International Access**

   - Test from different countries
   - Monitor latency and performance
   - Verify all features work globally

2. **Add Advanced Features**

   - Real-time WebSocket connections
   - File sharing capabilities
   - Voice/video calling

3. **Production Optimization**

   - Database optimization
   - CDN implementation
   - Load balancing

4. **Monitoring Setup**
   - Error tracking
   - Performance monitoring
   - User analytics

## Support and Troubleshooting

### Common Issues

- **CORS errors**: Check CORS configuration
- **Database connection**: Verify environment variables
- **SSL issues**: Ensure HTTPS is properly configured
- **Performance**: Use CDN and optimize images

### Getting Help

- Cloud provider documentation
- Community forums
- Stack Overflow
- GitHub issues
