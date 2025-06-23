# UnifiedChat MVP - Quick Start Guide

This is the Minimum Viable Product (MVP) implementation of UnifiedChat.

## What's Included

- ✅ User registration and authentication
- ✅ Real-time messaging between users
- ✅ Basic user profile management
- ✅ Simple web interface
- ✅ Message persistence
- ✅ Basic security (JWT authentication)

## Quick Start

1. **Setup Environment**
   ```bash
   make setup
   ```

2. **Start Services**
   ```bash
   make dev-up
   ```

3. **Access Application**
   - Web Interface: http://localhost:3000
   - API Gateway: http://localhost:8080
   - User Service: http://localhost:8081
   - Auth Service: http://localhost:8082
   - Message Service: http://localhost:8083
   - Realtime Service: ws://localhost:8084

## Development Commands

```bash
# View logs
make logs

# Check service status
make status

# Restart services
make restart

# Stop services
make dev-down

# Reset database
make db-reset

# Clean everything
make clean
```

## API Endpoints

### Authentication
- POST /api/v1/auth/register - Register new user
- POST /api/v1/auth/login - Login user

### Users
- GET /api/v1/users/:id - Get user profile
- PUT /api/v1/users/:id - Update user profile

### Messages
- GET /api/v1/messages - Get messages
- POST /api/v1/messages - Send message

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Gateway   │    │   Services  │
│  (Port 3000)│◄──►│  (Port 8080)│◄──►│ (Ports 8081-8084)
└─────────────┘    └─────────────┘    └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  Databases  │
                   │PostgreSQL   │
                   │Redis        │
                   └─────────────┘
```

## Next Steps

After the MVP is working, consider adding:

1. Enhanced security features
2. Better UI/UX
3. File attachments
4. Group chats
5. Mobile app
6. Advanced features

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000, 8080-8084, 5432, 6379 are available
2. **Database connection**: Wait for PostgreSQL to fully start (check with `make status`)
3. **Service health**: Check service health with `make status`

### Logs

View logs for specific services:
```bash
# All services
make logs

# Specific service
docker-compose -f docker-compose.mvp.yml logs -f user-service
```
