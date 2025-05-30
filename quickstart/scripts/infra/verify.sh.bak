#!/bin/bash

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Setup logging
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs/infra"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/infra_verify_$(date +%Y%m%d_%H%M%S).log"
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Load configuration using yq
CONFIG_FILE="$PROJECT_ROOT/config/infra.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Configuration file not found at $CONFIG_FILE"
    exit 1
fi

# Load cloud provider and other variables
cloud_provider=$(yq -r '.infrastructure.provider' "$CONFIG_FILE")
region=$(yq -r '.infrastructure.region' "$CONFIG_FILE")
environment=$(yq -r '.infrastructure.environment' "$CONFIG_FILE")

# Log the value of cloud_provider
log "INFO" "cloud_provider value: $cloud_provider"

# Allow skipping cloud authentication for local/dev
if [ "$cloud_provider" = "local" ] || [ "$cloud_provider" = "mock" ]; then
    log "INFO" "Skipping cloud authentication checks (provider: $cloud_provider). This is for local/dev use only. Remove or change this for production deployments."
    exit 0
fi

# Validate cloud provider
if [ -z "$cloud_provider" ]; then
    echo "Error: cloud_provider not set in $CONFIG_FILE"
    exit 1
fi

# Setup logging
log "INFO" "Starting infrastructure verification"
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
for cmd in terraform kubectl helm aws az gcloud; do
    if ! command_exists $cmd; then
        handle_error "$cmd is not installed"
    fi
    log "INFO" "$cmd is installed"
done

# Check cloud provider authentication
log "INFO" "Checking cloud provider authentication..."
if [ "$cloud_provider" = "aws" ]; then
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        handle_error "Not authenticated with AWS"
    fi
    log "INFO" "AWS authentication verified"
elif [ "$cloud_provider" = "azure" ]; then
    if ! az account show >/dev/null 2>&1; then
        handle_error "Not authenticated with Azure"
    fi
    log "INFO" "Azure authentication verified"
elif [ "$cloud_provider" = "gcp" ]; then
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" >/dev/null 2>&1; then
        handle_error "Not authenticated with GCP"
    fi
    log "INFO" "GCP authentication verified"
else
    handle_error "Unsupported cloud provider: $cloud_provider"
fi

# Verify Terraform setup
log "INFO" "Verifying Terraform setup..."
if [ -d "infrastructure/terraform" ]; then
    cd infrastructure/terraform
    terraform init
    terraform validate
    log "INFO" "Terraform configuration is valid"
    cd - > /dev/null
else
    handle_error "Terraform directory not found"
fi

# Verify Kubernetes setup
log "INFO" "Verifying Kubernetes setup..."
for env in dev staging prod; do
    if kubectl get namespace "unified-chat-$env" >/dev/null 2>&1; then
        log "INFO" "Kubernetes namespace unified-chat-$env exists"

        # Check deployments
        if kubectl get deployments -n "unified-chat-$env" >/dev/null 2>&1; then
            log "INFO" "Deployments in unified-chat-$env namespace are running"
        else
            log "WARN" "No deployments found in unified-chat-$env namespace"
        fi

        # Check services
        if kubectl get services -n "unified-chat-$env" >/dev/null 2>&1; then
            log "INFO" "Services in unified-chat-$env namespace are running"
        else
            log "WARN" "No services found in unified-chat-$env namespace"
        fi
    else
        log "WARN" "Kubernetes namespace unified-chat-$env not found"
    fi
done

# Verify monitoring setup
log "INFO" "Verifying monitoring setup..."
if kubectl get namespace monitoring >/dev/null 2>&1; then
    log "INFO" "Monitoring namespace exists"

    # Check Prometheus
    if kubectl get pods -n monitoring -l app=prometheus >/dev/null 2>&1; then
        log "INFO" "Prometheus is running"
    else
        log "WARN" "Prometheus not found"
    fi

    # Check Grafana
    if kubectl get pods -n monitoring -l app=grafana >/dev/null 2>&1; then
        log "INFO" "Grafana is running"
    else
        log "WARN" "Grafana not found"
    fi
else
    log "WARN" "Monitoring namespace not found"
fi

# Verify infrastructure directories
log "INFO" "Verifying infrastructure directories..."
for dir in infrastructure/{terraform,kubernetes,monitoring}/{dev,staging,prod}; do
    if [ -d "$dir" ]; then
        log "INFO" "Directory $dir exists"
    else
        log "WARN" "Directory $dir not found"
    fi
done

log "INFO" "Infrastructure verification completed successfully"
echo -e "${GREEN}Infrastructure verification completed successfully!${NC}"
echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
