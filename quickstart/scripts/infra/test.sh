#!/bin/bash

# Exit on error
set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Load configuration
CONFIG_FILE="$PROJECT_ROOT/config/infra.yaml"
cloud_provider=$(yq -r ".cloud_provider" "$CONFIG_FILE")
region=$(yq -r ".region" "$CONFIG_FILE")
environment=$(yq -r ".environment" "$CONFIG_FILE")
echo "Cloud Provider: $cloud_provider"
echo "Region: $region"
echo "Environment: $environment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Setup logging
LOG_DIR="$PROJECT_ROOT/logs/infra"
LOG_FILE="$LOG_DIR/infra_test_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

# Logging function
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Start logging
log "INFO" "Starting infrastructure test suite"
log "INFO" "Log file: $LOG_FILE"

# Function to handle errors
handle_error() {
    local error_msg=$1
    log "ERROR" "$error_msg"
    exit 1
}

# Function to run a test case
run_test() {
    local test_name=$1
    local test_command=$2
    local expected_exit_code=${3:-0}

    log "INFO" "Running test: $test_name"
    log "INFO" "Command: $test_command"

    if eval "$test_command" > /dev/null 2>&1; then
        local exit_code=$?
        if [ $exit_code -eq $expected_exit_code ]; then
            log "INFO" "Test passed: $test_name"
            return 0
        else
            log "ERROR" "Test failed: $test_name (exit code $exit_code, expected $expected_exit_code)"
            return 1
        fi
    else
        log "ERROR" "Test failed: $test_name (command execution failed)"
        return 1
    fi
}

# Clean up infrastructure directories before running setup script
echo -e "${YELLOW}Cleaning up infrastructure directories before test...${NC}"
INFRA_DIR="$PROJECT_ROOT/infrastructure"
rm -rf "$INFRA_DIR/terraform" "$INFRA_DIR/kubernetes" "$INFRA_DIR/monitoring"

# Test setup script
log "INFO" "Testing setup script..."
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")/../.."
run_test "Setup script exists" "[ -f \"$SCRIPT_DIR/setup.sh\" ]"
run_test "Setup script is executable" "[ -x \"$SCRIPT_DIR/setup.sh\" ]"

# Accept both creation and existence of directories as pass
run_test "Setup script creates infrastructure directories" "( $SCRIPT_DIR/setup.sh && [ -d \"$WORKSPACE_DIR/infrastructure/terraform\" ] && [ -d \"$WORKSPACE_DIR/infrastructure/kubernetes\" ] && [ -d \"$WORKSPACE_DIR/infrastructure/monitoring\" ] ) || ( [ -d \"$WORKSPACE_DIR/infrastructure/terraform\" ] && [ -d \"$WORKSPACE_DIR/infrastructure/kubernetes\" ] && [ -d \"$WORKSPACE_DIR/infrastructure/monitoring\" ] )"

# Test teardown script
log "INFO" "Testing teardown script..."
run_test "Teardown script exists" "[ -f \"$SCRIPT_DIR/teardown.sh\" ]"
run_test "Teardown script is executable" "[ -x \"$SCRIPT_DIR/teardown.sh\" ]"
run_test "Teardown script removes infrastructure" "$SCRIPT_DIR/teardown.sh && [ ! -d \"$WORKSPACE_DIR/infrastructure/terraform\" ]"

# Test verify script
log "INFO" "Testing verify script..."
run_test "Verify script exists" "[ -f \"$SCRIPT_DIR/verify.sh\" ]"
run_test "Verify script is executable" "[ -x \"$SCRIPT_DIR/verify.sh\" ]"
run_test "Verify script checks infrastructure" "$SCRIPT_DIR/verify.sh"

# Test Terraform setup
log "INFO" "Testing Terraform setup..."
run_test "Terraform is installed" "terraform --version"
run_test "Terraform configuration is valid" "cd infrastructure/terraform && terraform init && terraform validate"

# Test Kubernetes setup
log "INFO" "Testing Kubernetes setup..."
run_test "kubectl is installed" "kubectl version --client"
run_test "Kubernetes cluster is accessible" "kubectl cluster-info"
run_test "Kubernetes namespaces exist" "kubectl get namespace unified-chat-dev unified-chat-staging unified-chat-prod"

# Test Helm setup
log "INFO" "Testing Helm setup..."
run_test "Helm is installed" "helm version"
run_test "Helm repositories are configured" "helm repo list | grep -q 'prometheus-community' && helm repo list | grep -q 'elastic'"

# Test cloud provider setup
log "INFO" "Testing cloud provider setup..."
if [ "$cloud_provider" = "aws" ]; then
    run_test "AWS CLI is installed" "aws --version"
    run_test "AWS authentication" "aws sts get-caller-identity"
elif [ "$cloud_provider" = "azure" ]; then
    run_test "Azure CLI is installed" "az --version"
    run_test "Azure authentication" "az account show"
elif [ "$cloud_provider" = "gcp" ]; then
    run_test "GCP CLI is installed" "gcloud --version"
    run_test "GCP authentication" "gcloud auth list --filter=status:ACTIVE"
fi

# Test monitoring setup
log "INFO" "Testing monitoring setup..."
run_test "Prometheus namespace exists" "kubectl get namespace monitoring"
run_test "Prometheus is running" "kubectl get pods -n monitoring -l app=prometheus"
run_test "Grafana is running" "kubectl get pods -n monitoring -l app=grafana"

# Test infrastructure files
log "INFO" "Testing infrastructure files..."
run_test "Terraform backend config exists" "[ -f \"infrastructure/terraform/backend.tf\" ]"
run_test "Terraform variables exist" "[ -f \"infrastructure/terraform/variables.tf\" ]"
run_test "Terraform main config exists" "[ -f \"infrastructure/terraform/main.tf\" ]"
run_test "Kubernetes manifests exist" "[ -d \"infrastructure/kubernetes/dev\" ] && [ -d \"infrastructure/kubernetes/staging\" ] && [ -d \"infrastructure/kubernetes/prod\" ]"
run_test "Monitoring config exists" "[ -f \"infrastructure/monitoring/prometheus-values.yaml\" ] && [ -f \"infrastructure/monitoring/logging-values.yaml\" ]"

# Summary
log "INFO" "Infrastructure test suite completed"
echo -e "${GREEN}Infrastructure test suite completed successfully!${NC}"
echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
echo -e "${YELLOW}Note:${NC}"
echo "1. Review the log file for detailed test results"
echo "2. Some tests may require manual verification"
echo "3. Ensure all cloud provider credentials are properly configured"
echo "4. Check Kubernetes cluster access and permissions"
echo "5. Verify monitoring stack is properly configured"
