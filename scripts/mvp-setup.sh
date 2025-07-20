#!/bin/bash

# UnifiedChat MVP Setup Script
# This script helps you implement the MVP step by step

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    local missing_tools=()

    if ! command_exists docker; then
        missing_tools+=("Docker")
    fi

    if ! command_exists node; then
        missing_tools+=("Node.js")
    fi

    if ! command_exists go; then
        missing_tools+=("Go")
    fi

    if ! command_exists conda; then
        missing_tools+=("Miniconda")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_status "Please install the missing tools and run this script again."
        exit 1
    fi

    print_success "All prerequisites are installed!"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up development environment..."

    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=unifiedchat
DB_USER=unifiedchat
DB_PASSWORD=password123

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Service Ports
GATEWAY_PORT=8080
USER_SERVICE_PORT=8081
AUTH_SERVICE_PORT=8082
MESSAGE_SERVICE_PORT=8083
REALTIME_SERVICE_PORT=8084
FRONTEND_PORT=3000

# Development Configuration
NODE_ENV=development
GO_ENV=development
EOF
        print_success "Created .env file"
    else
        print_warning ".env file already exists"
    fi
}

# Function to start databases
start_databases() {
    print_status "Starting databases..."

    # Stop existing containers if they exist
    docker stop postgres-mvp redis-mvp 2>/dev/null || true
    docker rm postgres-mvp redis-mvp 2>/dev/null || true

    # Start PostgreSQL
    docker run --name postgres-mvp \
        -e POSTGRES_DB=unifiedchat \
        -e POSTGRES_USER=unifiedchat \
        -e POSTGRES_PASSWORD=password123 \
        -p 5432:5432 \
        -d postgres:15

    # Start Redis
    docker run --name redis-mvp \
        -p 6379:6379 \
        -d redis:7-alpine

    # Wait for databases to be ready
    print_status "Waiting for databases to be ready..."
    sleep 10

    print_success "Databases started successfully!"
}

# Function to create service directories
create_service_structure() {
    print_status "Creating service directory structure..."

    # Create service directories
    mkdir -p services/{user-service,auth-service,message-service,realtime-service,gateway-service}/src
    mkdir -p services/{user-service,auth-service,message-service,realtime-service,gateway-service}/tests
    mkdir -p web/frontend/{components,pages,styles,utils}
    mkdir -p infrastructure/{docker,kubernetes}

    print_success "Service directory structure created!"
}

# Function to create Go module files
create_go_modules() {
    print_status "Creating Go module files..."

    # User Service
    cat > services/user-service/go.mod << EOF
module unifiedchat/user-service

go 1.23

require (
    github.com/gin-gonic/gin v1.9.1
    gorm.io/gorm v1.25.5
    gorm.io/driver/postgres v1.5.4
    golang.org/x/crypto v0.17.0
)
EOF

    # Auth Service
    cat > services/auth-service/go.mod << EOF
module unifiedchat/auth-service

go 1.23

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/golang-jwt/jwt/v5 v5.2.0
    golang.org/x/crypto v0.17.0
)
EOF

    # Message Service
    cat > services/message-service/go.mod << EOF
module unifiedchat/message-service

go 1.23

require (
    github.com/gin-gonic/gin v1.9.1
    gorm.io/gorm v1.25.5
    gorm.io/driver/postgres v1.5.4
)
EOF

    # Realtime Service
    cat > services/realtime-service/go.mod << EOF
module unifiedchat/realtime-service

go 1.23

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/gorilla/websocket v1.5.1
)
EOF

    # Gateway Service
    cat > services/gateway-service/go.mod << EOF
module unifiedchat/gateway-service

go 1.23

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/gin-contrib/cors v1.5.0
)
EOF

    print_success "Go module files created!"
}

# Function to create Dockerfiles
create_dockerfiles() {
    print_status "Creating Dockerfiles..."

    # User Service Dockerfile
    cat > services/user-service/Dockerfile << EOF
FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o main ./src

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8081
CMD ["./main"]
EOF

    # Auth Service Dockerfile
    cat > services/auth-service/Dockerfile << EOF
FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o main ./src

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8082
CMD ["./main"]
EOF

    # Message Service Dockerfile
    cat > services/message-service/Dockerfile << EOF
FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o main ./src

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8083
CMD ["./main"]
EOF

    # Realtime Service Dockerfile
    cat > services/realtime-service/Dockerfile << EOF
FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o main ./src

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8084
CMD ["./main"]
EOF

    # Gateway Service Dockerfile
    cat > services/gateway-service/Dockerfile << EOF
FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o main ./src

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
EOF

    # Frontend Dockerfile
    cat > web/frontend/Dockerfile << EOF
FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
EOF

    print_success "Dockerfiles created!"
}

# Function to create docker-compose file
create_docker_compose() {
    print_status "Creating docker-compose file..."

    cat > docker-compose.mvp.yml << EOF
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: unifiedchat
      POSTGRES_USER: unifiedchat
      POSTGRES_PASSWORD: password123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U unifiedchat"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  user-service:
    build: ./services/user-service
    ports:
      - "8081:8081"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: unifiedchat
      DB_USER: unifiedchat
      DB_PASSWORD: password123
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8081/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  auth-service:
    build: ./services/auth-service
    ports:
      - "8082:8082"
    depends_on:
      user-service:
        condition: service_healthy
    environment:
      JWT_SECRET: your-super-secret-jwt-key-change-in-production
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8082/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  message-service:
    build: ./services/message-service
    ports:
      - "8083:8083"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: unifiedchat
      DB_USER: unifiedchat
      DB_PASSWORD: password123
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8083/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  realtime-service:
    build: ./services/realtime-service
    ports:
      - "8084:8084"
    depends_on:
      message-service:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8084/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  gateway-service:
    build: ./services/gateway-service
    ports:
      - "8080:8080"
    depends_on:
      auth-service:
        condition: service_healthy
      user-service:
        condition: service_healthy
      message-service:
        condition: service_healthy
    environment:
      AUTH_SERVICE_URL: http://auth-service:8082
      USER_SERVICE_URL: http://user-service:8081
      MESSAGE_SERVICE_URL: http://message-service:8083
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./web/frontend
    ports:
      - "3000:3000"
    depends_on:
      gateway-service:
        condition: service_healthy
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8080/api/v1
      NEXT_PUBLIC_WS_URL: ws://localhost:8084

volumes:
  postgres_data:
EOF

    print_success "Docker Compose file created!"
}

# Function to create frontend package.json
create_frontend_package() {
    print_status "Creating frontend package.json..."

    cat > web/frontend/package.json << EOF
{
  "name": "unifiedchat-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "axios": "^1.6.0",
    "socket.io-client": "^4.7.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "typescript": "^5.0.0"
  }
}
EOF

    print_success "Frontend package.json created!"
}

# Function to create Makefile
create_makefile() {
    print_status "Creating Makefile..."

    cat > Makefile << EOF
.PHONY: help install build test clean dev-up dev-down logs

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	@echo "Installing dependencies..."
	cd web/frontend && npm install

build: ## Build all services
	@echo "Building services..."
	docker-compose -f docker-compose.mvp.yml build

test: ## Run tests
	@echo "Running tests..."
	# Add test commands here

clean: ## Clean up containers and volumes
	@echo "Cleaning up..."
	docker-compose -f docker-compose.mvp.yml down -v
	docker system prune -f

dev-up: ## Start development environment
	@echo "Starting development environment..."
	docker-compose -f docker-compose.mvp.yml up -d

dev-down: ## Stop development environment
	@echo "Stopping development environment..."
	docker-compose -f docker-compose.mvp.yml down

logs: ## Show logs
	@echo "Showing logs..."
	docker-compose -f docker-compose.mvp.yml logs -f

status: ## Show service status
	@echo "Service status:"
	docker-compose -f docker-compose.mvp.yml ps

restart: ## Restart all services
	@echo "Restarting services..."
	docker-compose -f docker-compose.mvp.yml restart

db-reset: ## Reset database
	@echo "Resetting database..."
	docker-compose -f docker-compose.mvp.yml down -v
	docker-compose -f docker-compose.mvp.yml up -d postgres redis
	sleep 10
	docker-compose -f docker-compose.mvp.yml up -d

setup: ## Initial setup
	@echo "Running initial setup..."
	./scripts/mvp-setup.sh
EOF

    print_success "Makefile created!"
}

# Function to create README for MVP
create_mvp_readme() {
    print_status "Creating MVP README..."

    cat > MVP_README.md << EOF
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
   \`\`\`bash
   make setup
   \`\`\`

2. **Start Services**
   \`\`\`bash
   make dev-up
   \`\`\`

3. **Access Application**
   - Web Interface: http://localhost:3000
   - API Gateway: http://localhost:8080
   - User Service: http://localhost:8081
   - Auth Service: http://localhost:8082
   - Message Service: http://localhost:8083
   - Realtime Service: ws://localhost:8084

## Development Commands

\`\`\`bash
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
\`\`\`

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

\`\`\`
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
\`\`\`

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
2. **Database connection**: Wait for PostgreSQL to fully start (check with \`make status\`)
3. **Service health**: Check service health with \`make status\`

### Logs

View logs for specific services:
\`\`\`bash
# All services
make logs

# Specific service
docker-compose -f docker-compose.mvp.yml logs -f user-service
\`\`\`
EOF

    print_success "MVP README created!"
}

# Main execution
main() {
    print_status "Starting UnifiedChat MVP setup..."

    check_prerequisites
    setup_environment
    start_databases
    create_service_structure
    create_go_modules
    create_dockerfiles
    create_docker_compose
    create_frontend_package
    create_makefile
    create_mvp_readme

    print_success "MVP setup completed successfully!"
    print_status ""
    print_status "Next steps:"
    print_status "1. Implement the service code (see MVP_IMPLEMENTATION.md)"
    print_status "2. Run 'make dev-up' to start services"
    print_status "3. Access the application at http://localhost:3000"
    print_status ""
    print_status "For detailed implementation guide, see MVP_IMPLEMENTATION.md"
}

# Run main function
main "$@"
