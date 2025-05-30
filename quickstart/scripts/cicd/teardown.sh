#!/bin/bash

# Exit on error
set -e

# Load configuration
source "$(dirname "$0")/../../config/cicd.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Setup logging
LOG_DIR="$(dirname "$0")/../../logs"
LOG_FILE="$LOG_DIR/cicd_teardown_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

# Logging function
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Start logging
log "INFO" "Starting CI/CD teardown"
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

# Check prerequisites
log "INFO" "Checking prerequisites..."

# Check required tools
for cmd in docker kubectl helm gh; do
    if ! command_exists $cmd; then
        handle_error "$cmd is not installed"
    fi
    log "INFO" "$cmd is installed"
done

# Check GitHub authentication
log "INFO" "Checking GitHub authentication..."
if ! gh auth status >/dev/null 2>&1; then
    handle_error "Not authenticated with GitHub"
fi
log "INFO" "GitHub authentication verified"

# Get repository name from git config
REPO_NAME=$(git config --get remote.origin.url | sed 's/.*github.com[:/]//' | sed 's/\.git$//')

# Confirmation prompt
echo -e "${YELLOW}This will remove the following:${NC}"
echo "1. GitHub Actions workflows"
echo "2. Reusable GitHub Actions"
echo "3. Docker images from Docker Hub"
echo "4. CI/CD configuration files"
echo
echo -e "${RED}WARNING: This action cannot be undone!${NC}"
read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Teardown cancelled${NC}"
    exit 1
fi

# Remove GitHub Actions workflows
log "INFO" "Removing GitHub Actions workflows..."
rm -rf .github/workflows/*
log "INFO" "GitHub Actions workflows removed"

# Remove reusable GitHub Actions
log "INFO" "Removing reusable GitHub Actions..."
rm -rf .github/actions/*
log "INFO" "GitHub Actions removed"

# Remove Docker images
log "INFO" "Removing Docker images..."

# Get Docker Hub credentials
if [ -z "$DOCKERHUB_USERNAME" ] || [ -z "$DOCKERHUB_TOKEN" ]; then
    echo -e "${YELLOW}Docker Hub credentials not found in environment.${NC}"
    echo "Please enter your Docker Hub credentials:"
    read -p "Docker Hub username: " DOCKERHUB_USERNAME
    read -s -p "Docker Hub token: " DOCKERHUB_TOKEN
    echo
fi

# Login to Docker Hub
echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin

# Remove images for each service
for service in auth message realtime user payment ai gateway; do
    echo -e "${YELLOW}Removing Docker image for $service service...${NC}"
    docker rmi "$DOCKERHUB_USERNAME/unifiedchat/$service:latest" || true
    docker rmi "$DOCKERHUB_USERNAME/unifiedchat/$service:$(git rev-parse HEAD)" || true
done

# Logout from Docker Hub
docker logout

# Remove CI/CD configuration files
log "INFO" "Removing CI/CD configuration files..."

# Optional: Remove entire CI/CD directory
read -p "Do you want to remove the entire CI/CD directory? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Removing CI/CD directory...${NC}"
    rm -rf scripts/cicd
else
    # Remove only generated files
    echo -e "${YELLOW}Removing generated files...${NC}"
    find scripts/cicd -type f -name "*.yaml" -delete
    find scripts/cicd -type f -name "*.yml" -delete
    find scripts/cicd -type f -name "*.json" -delete
fi

# Remove Docker Compose file
echo -e "${YELLOW}Removing Docker Compose file...${NC}"
rm -f docker-compose.yml

# Remove GitHub repository secrets
echo -e "${YELLOW}Removing GitHub repository secrets...${NC}"

# List of secrets to remove
SECRETS=(
    "DOCKERHUB_USERNAME"
    "DOCKERHUB_TOKEN"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_REGION"
    "SNYK_TOKEN"
    "KUBE_CONFIG"
)

# Remove each secret
for secret in "${SECRETS[@]}"; do
    if gh secret list | grep -q "$secret"; then
        echo -e "${YELLOW}Removing secret: $secret${NC}"
        gh secret delete "$secret"
    fi
done

# Remove GitHub environments
echo -e "${YELLOW}Removing GitHub environments...${NC}"

# List of environments to remove
ENVIRONMENTS=("development" "staging" "production")

# Remove each environment
for env in "${ENVIRONMENTS[@]}"; do
    if gh api repos/$REPO_NAME/environments/$env >/dev/null 2>&1; then
        echo -e "${YELLOW}Removing environment: $env${NC}"
        gh api repos/$REPO_NAME/environments/$env -X DELETE
    fi
done

# Only remove allowed directories
ALLOWED_DIRS=(
  ".github/workflows"
  ".github/actions"
)
for dir in "${ALLOWED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    rm -rf "$dir"
    log "INFO" "$dir directory removed"
  fi
done

log "INFO" "CI/CD teardown completed successfully"
echo -e "${GREEN}CI/CD teardown completed successfully!${NC}"
echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
echo -e "${YELLOW}Note:${NC}"
echo "1. Some Docker images may still exist in Docker Hub. Check and remove them manually if needed."
echo "2. Review and update any documentation that referenced the removed CI/CD setup."
echo "3. Consider cleaning up any remaining GitHub repository settings manually."
echo "4. If you plan to set up CI/CD again, make sure to update any references to the old configuration."
