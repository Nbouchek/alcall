# Render Deployment Instructions

## Manual Deployment to Render (Recommended)

Since the Blueprint format had compatibility issues, here's the reliable manual deployment process:

### Step 1: Go to Render

1. Visit [render.com](https://render.com)
2. Sign up or sign in with GitHub

### Step 2: Deploy PostgreSQL Database First

1. Click "New +" → "PostgreSQL"
2. **Name**: `unifiedchat-postgres`
3. **Database**: `unifiedchat`
4. **User**: `unifiedchat`
5. **Plan**: Free
6. **Region**: Choose closest to your users
7. Click "Create Database"
8. **Save the connection details** (you'll need them for other services)

### Step 3: Deploy Auth Service

1. Click "New +" → "Web Service"
2. **Connect Repository**: `Nbouchek/alcall`
3. **Name**: `unifiedchat-auth`
4. **Environment**: Docker
5. **Branch**: `repo-setup-fixes`
6. **Root Directory**: `services/auth-service`
7. **Build Command**: (leave empty)
8. **Start Command**: (leave empty)
9. **Plan**: Free

#### Environment Variables:

```
JWT_SECRET=your-secret-key-here
PORT=8082
```

10. Click "Create Web Service"

### Step 4: Deploy Message Service

1. Click "New +" → "Web Service"
2. **Connect Repository**: `Nbouchek/alcall`
3. **Name**: `unifiedchat-message`
4. **Environment**: Docker
5. **Branch**: `repo-setup-fixes`
6. **Root Directory**: `services/message-service`
7. **Build Command**: (leave empty)
8. **Start Command**: (leave empty)
9. **Plan**: Free

#### Environment Variables:

```
DB_HOST=your-postgres-host.onrender.com
DB_PORT=5432
DB_NAME=unifiedchat
DB_USER=unifiedchat
DB_PASSWORD=your-postgres-password
PORT=8083
```

10. Click "Create Web Service"

### Step 5: Deploy Frontend

1. Click "New +" → "Web Service"
2. **Connect Repository**: `Nbouchek/alcall`
3. **Name**: `unifiedchat-frontend`
4. **Environment**: Docker
5. **Branch**: `repo-setup-fixes`
6. **Root Directory**: `web/frontend`
7. **Build Command**: (leave empty)
8. **Start Command**: (leave empty)
9. **Plan**: Free

#### Environment Variables:

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-auth-service-url.onrender.com
```

10. Click "Create Web Service"

### Step 6: Wait for Deployments

- Each service takes 5-10 minutes to build and deploy
- Monitor the build logs for any errors
- All services should show "Live" status when ready

### Step 7: Test Your Application

1. Visit your frontend URL: `https://unifiedchat-frontend.onrender.com`
2. Test login with these accounts:
   - Username: `admin`, Password: `password123`
   - Username: `user2`, Password: `password123`
   - Username: `user3`, Password: `password123`
3. Send messages between users

## Your Service URLs

After deployment, you'll have:

- **Frontend**: `https://unifiedchat-frontend.onrender.com`
- **Auth Service**: `https://unifiedchat-auth.onrender.com`
- **Message Service**: `https://unifiedchat-message.onrender.com`
- **Database**: `unifiedchat-postgres.onrender.com`

## Troubleshooting

- **Build Failures**: Check the build logs for missing dependencies
- **Connection Issues**: Verify environment variables are correct
- **Database Connection**: Ensure the database is fully provisioned before deploying services that depend on it

## Benefits

- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Easy environment variable management
- ✅ Automatic deployments from GitHub
- ✅ Reliable and tested deployment process
