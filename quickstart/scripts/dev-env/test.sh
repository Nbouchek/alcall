#!/bin/bash

# Exit on error
set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Setup logging
LOG_DIR="$PROJECT_ROOT/logs/dev-env"
LOG_FILE="$LOG_DIR/dev_env_test_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log "INFO" "Starting development environment tests"
log "INFO" "Log file: $LOG_FILE"

# Function to handle errors
handle_error() {
    local error_msg=$1
    log "ERROR" "$error_msg"
    exit 1
}

# Function to run a test and log its result
run_test() {
    local test_name=$1
    local test_cmd=$2
    local timeout=${3:-30}  # Default timeout of 30 seconds

    log "INFO" "Running test: $test_name"
    echo -e "${YELLOW}Running: $test_name${NC}"

    if timeout "$timeout" bash -c "$test_cmd" >> "$LOG_FILE" 2>&1; then
        log "INFO" "Test passed: $test_name"
        echo -e "${GREEN}✓ $test_name passed${NC}"
        return 0
    else
        log "ERROR" "Test failed: $test_name"
        echo -e "${RED}✗ $test_name failed${NC}"
        return 1
    fi
}

# Test Docker
run_test "Docker daemon" "docker info" || handle_error "Docker daemon is not running"
run_test "Docker build" "docker build -t test-image - <<< 'FROM alpine:latest'" || handle_error "Docker build failed"
run_test "Docker network" "docker network create test-network && docker network rm test-network" || handle_error "Docker network operations failed"

# Test Node.js
run_test "Node.js version" "node --version" || handle_error "Node.js is not working"
run_test "npm version" "npm --version" || handle_error "npm is not working"
run_test "npm cache" "npm cache verify" || handle_error "npm cache verification failed"

# Test Go
run_test "Go version" "go version" || handle_error "Go is not working"
run_test "Go environment" "go env" || handle_error "Go environment is not properly configured"
run_test "Go modules" "go mod download" || handle_error "Go modules are not working"

# Test Rust
run_test "Rust version" "rustc --version" || handle_error "Rust is not working"
run_test "Cargo version" "cargo --version" || handle_error "Cargo is not working"
run_test "Rust toolchain" "rustup show" || handle_error "Rust toolchain is not properly configured"

# Test Python environment
run_test "Conda environment" "conda activate alcall && python --version" || handle_error "Conda environment is not working"
run_test "Python packages" "conda run -n alcall pip list" || handle_error "Python package management is not working"
run_test "Python linting" "conda run -n alcall black --check ." || handle_error "Python linting failed"
run_test "Python type checking" "conda run -n alcall mypy ." || handle_error "Python type checking failed"

# Test Kubernetes
run_test "kubectl version" "kubectl version --client" || handle_error "kubectl is not working"
run_test "kubectl config" "kubectl config view" || handle_error "kubectl configuration is not working"
run_test "Helm version" "helm version" || handle_error "Helm is not working"

# Test SSL certificates
run_test "SSL certificates" "openssl verify -CAfile ~/.unified-chat/ca/ca.crt ~/.unified-chat/certs/dev.crt" || handle_error "SSL certificates are not valid"

# Test environment variables
run_test "Environment variables" "[ -f .env ] && source .env && echo 'Environment variables loaded'" || handle_error "Environment variables are not properly configured"

# Test git hooks
run_test "Git hooks" "git config --get core.hooksPath" || handle_error "Git hooks are not properly configured"

# Test IDE settings
run_test "IDE settings" "[ -f ~/.cursor/settings/settings.json ]" || handle_error "IDE settings are not properly configured"

# Test network connectivity
run_test "Local network" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000" || log "WARN" "Local development server is not running"
run_test "Internet connectivity" "curl -s -o /dev/null -w '%{http_code}' https://api.github.com" || handle_error "Internet connectivity is not working"

# Test database connectivity
if [ -f .env ]; then
    source .env
    if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
        run_test "Database connectivity" "nc -z $DB_HOST $DB_PORT" || handle_error "Database is not accessible"
    fi
fi

# Test Redis connectivity
if [ -f .env ]; then
    source .env
    if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
        run_test "Redis connectivity" "nc -z $REDIS_HOST $REDIS_PORT" || handle_error "Redis is not accessible"
    fi
fi

# Test development services
run_test "Development services" "docker-compose ps" || handle_error "Development services are not running"

echo -e "${GREEN}All tests completed successfully!${NC}"
log "INFO" "All tests completed successfully"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the test log at: $LOG_FILE"
echo "2. Run 'make dev-up' to start all development services"
echo "3. Run 'make test' to run the application test suite"
echo "4. Check the application at http://localhost:3000"
