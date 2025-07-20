# UnifiedChat Microservices Deployment Guide

## Overview

This Docker Compose configuration provides a complete microservices architecture for UnifiedChat with the following services:

- **PostgreSQL**: Primary database
- **Redis**: Caching and session storage
- **Janus WebRTC**: Real-time communication server
- **TURN Server**: NAT traversal for WebRTC
- **User Service**: User management (Port 8081)
- **Auth Service**: Authentication and authorization (Port 8082)
- **Message Service**: Message handling (Port 8083)
- **Realtime Service**: WebSocket connections (Port 8084)
- **Gateway Service**: API gateway (Port 8080)
- **Frontend**: Next.js web application (Port 3000)

## Key Improvements Made

### 1. **Environment Variables**

- All configuration moved to `.env` files
- Separate production configuration
- No hardcoded values in docker-compose.yml

### 2. **Security Enhancements**

- Added `no-new-privileges:true` to all services
- Implemented proper network segmentation
- Read-only volume mounts where appropriate
- Removed platform-specific configurations

### 3. **Networking**

- **Backend network**: Internal-only for service communication
- **Frontend network**: Public-facing services
- Services only expose necessary ports

### 4. **Health Checks**

- Comprehensive health checks for all services
- Proper dependency management with `condition: service_healthy`
- Realistic timeout and retry configurations

### 5. **Resource Management**

- Added container names for better management
- Proper restart policies
- Volume management for persistent data

### 6. **Monitoring & Logging**

- Separate log volumes for Janus and TURN
- Configurable log levels
- Structured logging configuration

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- At least 4GB RAM
- At least 10GB free disk space

## Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo>
cd unifiedchat
```

### 2. Environment Configuration

```bash
# Copy environment file
cp .env.example .env

# Edit configuration (optional for development)
nano .env
```

### 3. Create Required Directories

```bash
mkdir -p config init-scripts services/janus-service/config
```

### 4. Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 5. Verify Deployment

```bash
# Check health of all services
docker-compose ps --filter "health=healthy"

# Test frontend
curl http://localhost:3000

# Test API gateway
curl http://localhost:8080/health
```

## Service Dependencies

```
Frontend → Gateway → (Auth, User, Message, Realtime)
                 ↓
            PostgreSQL + Redis
                 ↓
         Janus ← TURN Server
```

## Port Usage

| Service          | Internal Port | External Port | Purpose          |
| ---------------- | ------------- | ------------- | ---------------- |
| Frontend         | 3000          | 3000          | Web interface    |
| Gateway          | 8080          | 8080          | API gateway      |
| Auth Service     | 8082          | 8082          | Authentication   |
| User Service     | 8081          | 8081          | User management  |
| Message Service  | 8083          | 8083          | Message handling |
| Realtime Service | 8084          | 8084          | WebSocket server |
| Janus HTTP       | 8088          | 8088          | WebRTC HTTP API  |
| Janus WebSocket  | 8188          | 8188          | WebRTC WebSocket |
| PostgreSQL       | 5432          | 5432          | Database         |
| Redis            | 6379          | 6379          | Cache            |
| TURN Server      | 3478          | 3478          | NAT traversal    |

## Configuration Files

### Required Configuration Files

1. **config/redis.conf** - Redis configuration
2. **config/turnserver.conf** - TURN server configuration
3. **services/janus-service/config/** - Janus configuration files

### Environment Files

- `.env` - Development environment
- `.env.production` - Production environment

## Production Deployment

### 1. Use Production Environment

```bash
cp .env.production .env
```

### 2. Update Configuration

Edit `.env` and replace all placeholder values:

```bash
# Critical security updates
POSTGRES_PASSWORD=your-strong-password
JWT_SECRET=your-jwt-secret-at-least-32-chars
TURN_PASSWORD=your-turn-password

# Domain configuration
TURN_REALM=your-domain.com
TURN_EXTERNAL_IP=your-server-public-ip

# Frontend URLs
NEXT_PUBLIC_AUTH_API_URL=https://your-domain.com/api/v1
NEXT_PUBLIC_REALTIME_API_URL=wss://your-domain.com/ws
```

### 3. SSL/TLS Configuration

For production, configure SSL certificates:

```bash
# Generate certificates for TURN server
openssl req -x509 -newkey rsa:4096 -keyout turn_server_pkey.pem -out turn_server_cert.pem -days 365 -nodes

# Move certificates
sudo mkdir -p /etc/ssl/certs /etc/ssl/private
sudo mv turn_server_cert.pem /etc/ssl/certs/
sudo mv turn_server_pkey.pem /etc/ssl/private/
```

### 4. Firewall Configuration

```bash
# Allow required ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp
sudo ufw allow 10000:10200/udp
```

## Troubleshooting

### Common Issues

1. **Services not starting**

   ```bash
   # Check logs
   docker-compose logs <service-name>

   # Check health
   docker-compose ps
   ```

2. **Database connection issues**

   ```bash
   # Check PostgreSQL logs
   docker-compose logs postgres

   # Test connection
   docker-compose exec postgres psql -U unifiedchat -d unifiedchat
   ```

3. **WebRTC not working**

   ```bash
   # Check Janus logs
   docker-compose logs unifiedchat-janus-service

   # Check TURN server
   docker-compose logs unifiedchat-turn
   ```

### Health Check Commands

```bash
# Check all services health
docker-compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"

# Individual service health checks
curl http://localhost:8080/health  # Gateway
curl http://localhost:8081/health  # User Service
curl http://localhost:8082/health  # Auth Service
curl http://localhost:8083/health  # Message Service
curl http://localhost:8084/health  # Realtime Service
curl http://localhost:8088/janus/info  # Janus

# Database connectivity
docker-compose exec postgres pg_isready -U unifiedchat

# Redis connectivity
docker-compose exec redis redis-cli ping
```

## Monitoring

### Docker Stats

```bash
# Resource usage
docker-compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
docker stats

# Service-specific monitoring
docker-compose logs -f --tail=100 <service-name>
```

### Log Locations

```bash
# Application logs
docker-compose logs <service-name>

# Persistent logs
ls -la /var/lib/docker/volumes/unifiedchat_janus_logs/_data/
ls -la /var/lib/docker/volumes/unifiedchat_turn_logs/_data/
```

## Scaling

### Horizontal Scaling

```bash
# Scale specific services
docker-compose up -d --scale unifiedchat-message-service=3
docker-compose up -d --scale unifiedchat-user-service=2

# Note: Services with exposed ports cannot be scaled directly
# Use a load balancer (nginx, traefik) in front of scaled services
```

### Vertical Scaling

Add resource limits to docker-compose.yml:

```yaml
services:
  unifiedchat-message-service:
    # ... existing config
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G
        reservations:
          cpus: "1.0"
          memory: 1G
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U unifiedchat -d unifiedchat > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose exec -T postgres psql -U unifiedchat -d unifiedchat < backup_file.sql
```

### Redis Backup

```bash
# Create Redis backup
docker-compose exec redis redis-cli BGSAVE
docker-compose exec redis cp /data/dump.rdb /data/dump_$(date +%Y%m%d_%H%M%S).rdb
```

### Volume Backup

```bash
# Backup volumes
docker run --rm -v unifiedchat_postgres_data:/data -v $(pwd):/backup ubuntu tar czf /backup/postgres_backup_$(date +%Y%m%d_%H%M%S).tar.gz /data

docker run --rm -v unifiedchat_redis_data:/data -v $(pwd):/backup ubuntu tar czf /backup/redis_backup_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

## Security Best Practices

### 1. Environment Variables

- Never commit `.env` files to version control
- Use Docker secrets in production
- Rotate passwords regularly

### 2. Network Security

- Use internal networks for service communication
- Implement proper firewall rules
- Use SSL/TLS for all external communications

### 3. Container Security

- Regularly update base images
- Use non-root users in containers
- Implement resource limits

### 4. Monitoring

- Set up centralized logging
- Implement health monitoring
- Configure alerting

## Performance Optimization

### 1. Database Optimization

```sql
-- PostgreSQL tuning
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
```

### 2. Redis Optimization

```bash
# In redis.conf
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### 3. Application Optimization

- Use connection pooling
- Implement caching strategies
- Optimize database queries
- Use CDN for static assets

## Maintenance

### Regular Maintenance Tasks

```bash
# Update images
docker-compose pull
docker-compose up -d

# Clean up unused resources
docker system prune -a
docker volume prune

# Check disk usage
docker system df

# Rotate logs
docker-compose logs --tail=1000 > logs_$(date +%Y%m%d).log
```

### Weekly Maintenance

```bash
# Database maintenance
docker-compose exec postgres psql -U unifiedchat -d unifiedchat -c "VACUUM ANALYZE;"

# Redis maintenance
docker-compose exec redis redis-cli FLUSHDB
```

## API Documentation

### Service Endpoints

| Service          | Endpoint                         | Purpose         |
| ---------------- | -------------------------------- | --------------- |
| Gateway          | `http://localhost:8080/api/v1`   | Main API        |
| User Service     | `http://localhost:8081/users`    | User management |
| Auth Service     | `http://localhost:8082/auth`     | Authentication  |
| Message Service  | `http://localhost:8083/messages` | Messages        |
| Realtime Service | `ws://localhost:8084/ws`         | WebSocket       |

### Health Endpoints

All services provide health endpoints at `/health` for monitoring.

## Development Workflow

### 1. Local Development

```bash
# Start services for development
docker-compose up -d postgres redis

# Run services individually for debugging
cd services/user-service
go run main.go
```

### 2. Testing

```bash
# Run tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Integration tests
docker-compose exec unifiedchat-gateway-service go test ./...
```

### 3. Hot Reload

For development, mount source code as volumes:

```yaml
volumes:
  - ./services/user-service:/app
  - /app/vendor # Exclude vendor directory
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:

- Create an issue in the repository
- Check the troubleshooting section
- Review logs for error messages

---

**Note**: This configuration is optimized for production use with proper security, monitoring, and scalability considerations. Always review and adapt the configuration to your specific requirements and infrastructure.
