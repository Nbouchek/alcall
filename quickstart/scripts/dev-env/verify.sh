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
LOG_FILE="$LOG_DIR/dev_env_verify_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log "INFO" "Starting development environment verification"
log "INFO" "Log file: $LOG_FILE"

# Function to handle errors
handle_error() {
    local error_msg=$1
    log "ERROR" "$error_msg"
    exit 1
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check version
check_version() {
    local tool=$1
    local min_version=$2
    local version

    case $tool in
        go)
            version=$(go version | awk '{print $3}' | sed 's/go//')
            ;;
        docker)
            if ! command_exists "$tool"; then
                handle_error "$tool is not installed"
            fi
            version=$($tool --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
            ;;
        node)
            if ! command_exists "$tool"; then
                handle_error "$tool is not installed"
            fi
            version=$($tool --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
            ;;
        rustc)
            if ! command_exists "$tool"; then
                handle_error "$tool is not installed"
            fi
            version=$($tool --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
            ;;
        kubectl)
            if ! command_exists "$tool"; then
                handle_error "$tool is not installed"
            fi
            version=$($tool version --client | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
            ;;
        helm)
            if ! command_exists "$tool"; then
                handle_error "$tool is not installed"
            fi
            version=$($tool version --client | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
            ;;
    esac

    if [ -z "$version" ]; then
        log "ERROR" "$tool version could not be determined"
        return 1
    fi

    # Compare versions using sort -V for proper semantic version comparison
    if ! printf "%s\n%s" "$min_version" "$version" | sort -V | head -n1 | grep -q "^$min_version$"; then
        log "ERROR" "$tool version $version is below minimum required version $min_version"
        return 1
    fi

    log "INFO" "$tool version $version is compatible"
    return 0
}

# Required tool versions from README
REQUIRED_TOOLS="
docker:4.36.0
node:22.0.0
go:1.23.0
rustc:1.84.0
kubectl:1.31.0
helm:3.16.0
"

# Check system requirements
log "INFO" "Checking system requirements..."

# Check CPU cores
CPU_CORES=$(sysctl -n hw.ncpu)
if [ "$CPU_CORES" -lt 2 ]; then
    handle_error "Insufficient CPU cores: $CPU_CORES (minimum: 2)"
fi
log "INFO" "CPU cores: $CPU_CORES"

# Check RAM
TOTAL_RAM=$(sysctl -n hw.memsize | awk '{print $0/1024/1024/1024}')
if (( $(echo "$TOTAL_RAM < 8" | bc -l) )); then
    handle_error "Insufficient RAM: ${TOTAL_RAM}GB (minimum: 8GB)"
fi
log "INFO" "Total RAM: ${TOTAL_RAM}GB"

# Check storage
TOTAL_STORAGE=$(df -h / | awk 'NR==2 {print $2}' | sed 's/G//')
if (( $(echo "$TOTAL_STORAGE < 50" | bc -l) )); then
    handle_error "Insufficient storage: ${TOTAL_STORAGE}GB (minimum: 50GB)"
fi
log "INFO" "Total storage: ${TOTAL_STORAGE}GB"

# Check network
NETWORK_SPEED=$(networkQuality -I | grep "Download" | awk '{print $2}')
if (( $(echo "$NETWORK_SPEED < 100" | bc -l) )); then
    log "WARN" "Network speed may be insufficient: ${NETWORK_SPEED}Mbps (recommended: 100Mbps)"
else
    log "INFO" "Network speed: ${NETWORK_SPEED}Mbps"
fi

# Check required tools
log "INFO" "Checking required tools..."
echo "$REQUIRED_TOOLS" | while IFS=: read -r tool min_version; do
    [ -z "$tool" ] && continue
    check_version "$tool" "$min_version"
done

# Check Python environment
log "INFO" "Checking Python environment..."
if ! command_exists conda; then
    handle_error "Conda is not installed"
fi

# Check conda environment
if ! conda env list | grep -q "^alcall "; then
    handle_error "Conda environment 'alcall' not found"
fi
log "INFO" "Conda environment 'alcall' exists"

# Check Python version
PYTHON_VERSION=$(conda run -n alcall python --version 2>&1 | awk '{print $2}')
if [ "$(printf '%s\n' "3.12.0" "$PYTHON_VERSION" | sort -V | head -n1)" != "3.12.0" ]; then
    handle_error "Python version $PYTHON_VERSION is below minimum required version 3.12.0"
fi
log "INFO" "Python version $PYTHON_VERSION is compatible"

# Check Python packages
log "INFO" "Checking Python packages..."
REQUIRED_PACKAGES=("black" "pylint" "pytest" "pytest-cov" "mypy")
for package in "${REQUIRED_PACKAGES[@]}"; do
    if ! conda run -n alcall pip show "$package" >/dev/null 2>&1; then
        handle_error "Python package $package is not installed"
    fi
    log "INFO" "Python package $package is installed"
done

# Check IDE settings
log "INFO" "Checking IDE settings..."
if [ ! -f ~/.cursor/settings/settings.json ]; then
    handle_error "IDE settings not found"
fi
log "INFO" "IDE settings exist"

# Check git hooks
log "INFO" "Checking git hooks..."
if [ ! -f .git/hooks/pre-commit ]; then
    handle_error "Git pre-commit hook not found"
fi
if [ ! -x .git/hooks/pre-commit ]; then
    handle_error "Git pre-commit hook is not executable"
fi
log "INFO" "Git hooks are properly configured"

# Check SSL certificates
log "INFO" "Checking SSL certificates..."
if [ ! -f ~/.unified-chat/certs/dev.key ] || [ ! -f ~/.unified-chat/certs/dev.crt ]; then
    handle_error "Development SSL certificates not found"
fi
if [ ! -f ~/.unified-chat/ca/ca.key ] || [ ! -f ~/.unified-chat/ca/ca.crt ]; then
    handle_error "CA certificates not found"
fi
log "INFO" "SSL certificates are properly configured"

# Check environment variables
log "INFO" "Checking environment variables..."
if [ ! -f .env ]; then
    log "WARN" ".env file not found. Please copy .env.example to .env and configure your environment variables"
else
    REQUIRED_VARS=(
        "CORE_SERVICE_PORT"
        "CORE_SERVICE_HOST"
        "DB_HOST"
        "DB_PORT"
        "DB_NAME"
        "REDIS_HOST"
        "REDIS_PORT"
        "JWT_SECRET"
    )
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^$var=" .env; then
            log "WARN" "Required environment variable $var not found in .env"
        fi
    done
fi

echo -e "${GREEN}Development environment verification completed successfully!${NC}"
log "INFO" "Development environment verification completed successfully"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run 'make install-deps' to install additional dependencies"
echo "2. Configure your environment variables in .env"
echo "3. Run 'make dev-up' to start development services"
echo "4. Run 'make test' to verify everything is working"
