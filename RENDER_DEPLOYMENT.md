# Render Deployment Instructions

## Quick Deploy to Render

### Step 1: Go to Render
1. Visit [render.com](https://render.com)
2. Sign up or sign in with GitHub

### Step 2: Create New Web Service
1. Click "New +"
2. Select "Web Service"
3. Connect your GitHub repository (alcall)

### Step 3: Configure Service
- **Name**: unifiedchat-frontend
- **Environment**: Docker
- **Branch**: main
- **Root Directory**: web/frontend
- **Build Command**: (leave empty, uses Dockerfile)
- **Start Command**: (leave empty, uses Dockerfile)

### Step 4: Set Environment Variables
Add these environment variables:
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-auth-service-url.onrender.com
```

### Step 5: Deploy
1. Click "Create Web Service"
2. Wait for build to complete (5-10 minutes)
3. Get your public URL

### Step 6: Deploy Backend Services
Repeat the process for:
- unifiedchat-auth (auth service)
- unifiedchat-message (message service)
- unifiedchat-postgres (database)

## Your URLs will be:
- Frontend: https://unifiedchat-frontend.onrender.com
- Auth Service: https://unifiedchat-auth.onrender.com
- Message Service: https://unifiedchat-message.onrender.com

## Test Accounts:
- admin / password123
- user2 / password123
- user3 / password123
