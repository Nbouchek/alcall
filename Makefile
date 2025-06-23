.PHONY: help install build test clean dev-up dev-down logs

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", 422411, 422412}' 

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
