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
LOG_FILE="$LOG_DIR/dev_env_teardown_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log "INFO" "Starting development environment teardown"
log "INFO" "Log file: $LOG_FILE"

# Function to handle errors
handle_error() {
    local error_msg=$1
    log "ERROR" "$error_msg"
    exit 1
}

# Function to confirm action
confirm() {
    local message=$1
    local default=${2:-n}
    local prompt="[y/N]"
    if [ "$default" = "y" ]; then
        prompt="[Y/n]"
    fi
    read -p "$message $prompt " response
    if [ "$default" = "y" ]; then
        [[ "$response" =~ ^[Nn]$ ]] && return 1
    else
        [[ ! "$response" =~ ^[Yy]$ ]] && return 1
    fi
    return 0
}

# Parse command line arguments
FORCE=false
KEEP_DATA=false
KEEP_CERTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force)
            FORCE=true
            shift
            ;;
        -k|--keep-data)
            KEEP_DATA=true
            shift
            ;;
        -c|--keep-certs)
            KEEP_CERTS=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -f, --force       Force teardown without confirmation"
            echo "  -k, --keep-data   Keep data directories and databases"
            echo "  -c, --keep-certs  Keep SSL certificates"
            echo "  -h, --help        Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Confirm teardown unless forced
if [ "$FORCE" = false ]; then
    echo -e "${YELLOW}Warning: This will remove the development environment${NC}"
    echo "The following will be removed:"
    echo "1. Development services (Docker containers)"
    echo "2. Conda environment"
    echo "3. Development directories"
    if [ "$KEEP_DATA" = false ]; then
        echo "4. Data directories and databases"
    fi
    if [ "$KEEP_CERTS" = false ]; then
        echo "5. SSL certificates"
    fi
    echo "6. IDE settings"
    echo "7. Git hooks"

    if ! confirm "Are you sure you want to proceed?"; then
        echo "Teardown cancelled"
        exit 0
    fi
fi

# Stop development services
log "INFO" "Stopping development services..."
if docker-compose ps -q | grep -q .; then
    docker-compose down
    log "INFO" "Development services stopped"
else
    log "INFO" "No development services running"
fi

# Remove Docker resources
log "INFO" "Cleaning up Docker resources..."
docker system prune -f
docker volume prune -f
docker network prune -f
log "INFO" "Docker resources cleaned up"

# Remove Conda environment
log "INFO" "Removing Conda environment..."
if conda env list | grep -q "^alcall "; then
    conda env remove -n alcall
    log "INFO" "Conda environment removed"
else
    log "INFO" "Conda environment not found"
fi

# Remove development directories
log "INFO" "Removing development directories..."
# Only remove allowed directories
ALLOWED_DIRS=("services" "web" "mobile" "desktop" "infrastructure" "docs")
for dir in "${ALLOWED_DIRS[@]}"; do
  if [ -d "$PROJECT_ROOT/$dir" ]; then
    rm -rf "$PROJECT_ROOT/$dir"
    log "INFO" "$dir directory removed"
  fi
done

# Remove data directories if not keeping data
if [ "$KEEP_DATA" = false ]; then
    log "INFO" "Removing data directories..."
    if [ -d "data" ]; then
        rm -rf data
        log "INFO" "Data directory removed"
    fi
    if [ -d "$PROJECT_ROOT/logs/dev-env" ]; then
        rm -rf "$PROJECT_ROOT/logs/dev-env"
        log "INFO" "Development environment logs removed"
    fi
fi

# Remove SSL certificates if not keeping certs
if [ "$KEEP_CERTS" = false ]; then
    log "INFO" "Removing SSL certificates..."
    if [ -d ~/.unified-chat/certs ]; then
        rm -rf ~/.unified-chat/certs
        log "INFO" "SSL certificates removed"
    fi
    if [ -d ~/.unified-chat/ca ]; then
        rm -rf ~/.unified-chat/ca
        log "INFO" "CA certificates removed"
    fi
fi

# Remove IDE settings
log "INFO" "Removing IDE settings..."
if [ -f ~/.cursor/settings/settings.json ]; then
    rm -f ~/.cursor/settings/settings.json
    log "INFO" "IDE settings removed"
fi

# Remove git hooks
log "INFO" "Removing git hooks..."
if [ -f .git/hooks/pre-commit ]; then
rm -f .git/hooks/pre-commit
    log "INFO" "Git hooks removed"
fi

# Remove environment variables
log "INFO" "Removing environment variables..."
if [ -f .env ]; then
    mv .env .env.backup
    log "INFO" "Environment variables backed up to .env.backup"
fi

# Clean up Node.js
log "INFO" "Cleaning up Node.js..."
if [ -d "node_modules" ]; then
    rm -rf node_modules
    log "INFO" "Node modules removed"
fi
if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
    log "INFO" "Package lock file removed"
fi

# Clean up Go
log "INFO" "Cleaning up Go..."
if [ -d "vendor" ]; then
    rm -rf vendor
    log "INFO" "Go vendor directory removed"
fi
go clean -cache -modcache -i -r
log "INFO" "Go cache cleaned"

# Clean up Rust
log "INFO" "Cleaning up Rust..."
if [ -d "target" ]; then
    rm -rf target
    log "INFO" "Rust target directory removed"
fi
cargo clean
log "INFO" "Rust cache cleaned"

echo -e "${GREEN}Development environment teardown completed successfully!${NC}"
log "INFO" "Development environment teardown completed successfully"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the teardown log at: $LOG_FILE"
echo "2. Run 'make setup' to set up a fresh development environment"
echo "3. Run 'make verify' to verify the new environment"
echo "4. Run 'make test' to test the new environment"
