#!/bin/bash

# Exit on error
set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Load configuration (use yq to parse YAML as needed)
# source "$(dirname "$0")/../../config/cicd.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Setup logging
LOG_DIR="$PROJECT_ROOT/logs/cicd"
LOG_FILE="$LOG_DIR/cicd_verify_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

# Logging function
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Start logging
log "INFO" "Starting CI/CD verification"
log "INFO" "Log file: $LOG_FILE"

# Function to handle errors
handle_error() {
    local error_msg=$1
    log "ERROR" "$error_msg"
    exit 1
}

# Check GitHub Actions workflows
log "INFO" "Checking GitHub Actions workflows..."
if [ ! -d ".github/workflows" ]; then
    handle_error "Error: .github/workflows directory not found"
fi

if [ ! -f ".github/workflows/ci.yml" ]; then
    handle_error "Error: CI workflow file not found"
fi
log "INFO" "GitHub Actions workflows verified successfully"

# Check Docker setup
log "INFO" "Checking Docker setup..."
if ! docker info >/dev/null 2>&1; then
    handle_error "Error: Docker daemon is not running"
fi
log "INFO" "Docker setup verified successfully"

# Check Kubernetes setup
log "INFO" "Checking Kubernetes setup..."
if [ -z "$SKIP_K8S_CHECK" ]; then
    if ! kubectl cluster-info >/dev/null 2>&1; then
        handle_error "Error: Kubernetes cluster is not accessible"
    fi
    log "INFO" "Kubernetes setup verified successfully"
else
    log "INFO" "Skipping Kubernetes cluster check (SKIP_K8S_CHECK is set)."
fi

# Check GitHub CLI authentication
log "INFO" "Checking GitHub authentication..."
if ! gh auth status >/dev/null 2>&1; then
    handle_error "Error: Not authenticated with GitHub"
fi
log "INFO" "GitHub authentication verified successfully"

# Check required directories
log "INFO" "Checking required directories..."
for dir in scripts/cicd/{docker,kubernetes,github}; do
    if [ ! -d "$dir" ]; then
        handle_error "Error: Required directory $dir not found"
    fi
    log "INFO" "Directory $dir verified"
done

log "INFO" "CI/CD setup verification completed successfully"
echo -e "${GREEN}CI/CD setup verification completed successfully!${NC}"
echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
