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
LOG_DIR="$PROJECT_ROOT/logs/repo"
LOG_FILE="$LOG_DIR/repo_verify_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

# Logging function
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Start logging
log "INFO" "Starting repository verification"
log "INFO" "Log file: $LOG_FILE"

# Function to handle errors
handle_error() {
    local error_msg=$1
    log "ERROR" "$error_msg"
    exit 1
}

# Check GitHub authentication
log "INFO" "Checking GitHub authentication..."
if ! gh auth status >/dev/null 2>&1; then
    handle_error "Error: Not authenticated with GitHub"
fi
log "INFO" "GitHub authentication verified successfully"

# Check repository structure
log "INFO" "Checking repository structure..."
for dir in .github/{workflows,ISSUE_TEMPLATE,PULL_REQUEST_TEMPLATE} \
           services/{auth-service,message-service,realtime-service,user-service,payment-service,ai-service,gateway-service} \
           web/frontend \
           mobile/flutter \
           desktop/tauri \
           infrastructure/{terraform,kubernetes,monitoring} \
           docs/{api,architecture,development}; do
    if [ ! -d "$dir" ]; then
        handle_error "Error: Required directory $dir not found"
    fi
    log "INFO" "Directory $dir verified"
done

# Check GitHub workflow files
log "INFO" "Checking GitHub workflow files..."
for workflow in .github/workflows/{main.yml,pr.yml,release.yml}; do
    if [ ! -f "$workflow" ]; then
        handle_error "Error: Required workflow file $workflow not found"
    fi
    log "INFO" "Workflow file $workflow verified"
done

# Check issue templates
log "INFO" "Checking issue templates..."
for template in .github/ISSUE_TEMPLATE/{bug_report.md,feature_request.md}; do
    if [ ! -f "$template" ]; then
        handle_error "Error: Required issue template $template not found"
    fi
    log "INFO" "Issue template $template verified"
done

# Check PR templates
log "INFO" "Checking PR templates..."
if [ ! -f ".github/PULL_REQUEST_TEMPLATE/pull_request_template.md" ]; then
    handle_error "Error: Required PR template not found"
fi
log "INFO" "PR template verified"

# Check if repository is initialized with git
log "INFO" "Checking git repository..."
if [ ! -d ".git" ]; then
    handle_error "Error: Git repository not initialized"
fi
log "INFO" "Git repository verified"

# Check if remote repository is configured
log "INFO" "Checking git remote..."
if ! git remote get-url origin >/dev/null 2>&1; then
    handle_error "Error: Git remote 'origin' not configured"
fi
log "INFO" "Git remote verified"

# Check if main branch exists
log "INFO" "Checking main branch..."
if ! git show-ref --verify --quiet refs/heads/main; then
    handle_error "Error: Main branch not found"
fi
log "INFO" "Main branch verified"

log "INFO" "Repository setup verification completed successfully"
echo -e "${GREEN}Repository setup verification completed successfully!${NC}"
echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
