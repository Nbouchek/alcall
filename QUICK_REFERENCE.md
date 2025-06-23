# UnifiedChat MVP - Quick Reference

## 🚀 Get Started in 5 Minutes

```bash
# 1. Run automated setup
./scripts/mvp-setup.sh

# 2. Start all services
make dev-up

# 3. Open the application
open http://localhost:3000
```

## 📋 Essential Commands

### Development

```bash
make dev-up          # Start development environment
make dev-down        # Stop development environment
make status          # Check service status
make logs            # View all logs
make restart         # Restart all services
make clean           # Clean everything
```

### Database

```bash
make db-reset        # Reset database
docker logs postgres-mvp  # PostgreSQL logs
docker logs redis-mvp     # Redis logs
```

### Services

```bash
# Check specific service
docker-compose -f docker-compose.mvp.yml logs user-service
docker-compose -f docker-compose.mvp.yml logs auth-service
docker-compose -f docker-compose.mvp.yml logs message-service
docker-compose -f docker-compose.mvp.yml logs frontend
```

## 🌐 Service URLs

| Service              | URL                   | Port | Purpose         |
| -------------------- | --------------------- | ---- | --------------- |
| **Frontend**         | http://localhost:3000 | 3000 | Web interface   |
| **Gateway**          | http://localhost:8080 | 8080 | API Gateway     |
| **User Service**     | http://localhost:8081 | 8081 | User management |
| **Auth Service**     | http://localhost:8082 | 8082 | Authentication  |
| **Message Service**  | http://localhost:8083 | 8083 | Messaging       |
| **Realtime Service** | ws://localhost:8084   | 8084 | WebSocket       |

## 🔑 Test Credentials

```
Username: admin
Password: password123
```

## 🧪 API Testing

### Authentication

```bash
# Login
curl -X POST http://localhost:8082/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

### Users

```bash
# Get user
curl http://localhost:8081/users/1

# Health check
curl http://localhost:8081/health
```

### Messages

```bash
# Get messages
curl http://localhost:8083/messages/1

# Send message
curl -X POST http://localhost:8083/messages \
  -H "Content-Type: application/json" \
  -d '{"sender_id":1,"receiver_id":1,"content":"Hello World"}'
```

## 📁 Key Files

| File                     | Purpose                       |
| ------------------------ | ----------------------------- |
| `MVP_IMPLEMENTATION.md`  | Detailed implementation guide |
| `STEP_BY_STEP_MVP.md`    | Manual step-by-step guide     |
| `MVP_README.md`          | Quick start guide             |
| `scripts/mvp-setup.sh`   | Automated setup script        |
| `docker-compose.mvp.yml` | Service orchestration         |
| `Makefile`               | Development commands          |

## 🏗️ Architecture

```
Frontend (3000) → Gateway (8080) → Services (8081-8084)
                                    ↓
                                Databases (5432, 6379)
```

## 🔧 Troubleshooting

### Port Conflicts

```bash
# Check what's using ports
lsof -i :3000
lsof -i :8080
lsof -i :8081
lsof -i :8082
lsof -i :8083
lsof -i :8084
```

### Service Issues

```bash
# Check service health
make status

# View specific service logs
docker-compose -f docker-compose.mvp.yml logs -f user-service

# Restart specific service
docker-compose -f docker-compose.mvp.yml restart user-service
```

### Database Issues

```bash
# Check database status
docker ps | grep postgres
docker ps | grep redis

# Check database logs
docker logs postgres-mvp
docker logs redis-mvp

# Reset database
make db-reset
```

### Frontend Issues

```bash
# Check frontend logs
docker-compose -f docker-compose.mvp.yml logs -f frontend

# Rebuild frontend
docker-compose -f docker-compose.mvp.yml build frontend
```

## 🎯 Success Checklist

- [ ] All services start without errors
- [ ] Can access http://localhost:3000
- [ ] Can login with admin/password123
- [ ] Can send messages
- [ ] Messages appear in chat
- [ ] No errors in browser console
- [ ] All health checks pass

## 🚀 Next Steps

1. **Implement WebSocket**: Replace polling with real-time updates
2. **Add User Registration**: Complete user management
3. **Improve UI**: Better styling and UX
4. **Add Security**: Input validation, rate limiting
5. **Add Tests**: Unit and integration tests

## 📞 Quick Help

### Reset Everything

```bash
make clean
./scripts/mvp-setup.sh
make dev-up
```

### View All Logs

```bash
make logs
```

### Check Everything

```bash
make status
```

---

**Need more details?** See the full documentation:

- `MVP_IMPLEMENTATION.md` - Technical details
- `STEP_BY_STEP_MVP.md` - Manual guide
- `MVP_README.md` - Usage guide
