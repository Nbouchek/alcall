#!/bin/bash

# Exit on error
set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Load configuration
source "$(dirname "$0")/../../config/cicd.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Setup logging
LOG_DIR="$PROJECT_ROOT/logs/cicd"
LOG_FILE="$LOG_DIR/cicd_test_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

# Logging function
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Start logging
log "INFO" "Starting CI/CD test suite"
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

# Test setup script
log "INFO" "Testing setup script..."
run_test "Setup script exists" "[ -f \"$(dirname \"$0\")/setup.sh\" ]"
run_test "Setup script is executable" "[ -x \"$(dirname \"$0\")/setup.sh\" ]"
run_test "Setup script creates required directories" "$(dirname \"$0\")/setup.sh && [ -d \".github/workflows\" ] && [ -d \".github/actions\" ]"

# Test teardown script
log "INFO" "Testing teardown script..."
run_test "Teardown script exists" "[ -f \"$(dirname \"$0\")/teardown.sh\" ]"
run_test "Teardown script is executable" "[ -x \"$(dirname \"$0\")/teardown.sh\" ]"
run_test "Teardown script removes GitHub Actions" "$(dirname \"$0\")/teardown.sh && [ ! -d \".github/workflows\" ]"

# Test verify script
log "INFO" "Testing verify script..."
run_test "Verify script exists" "[ -f \"$(dirname \"$0\")/verify.sh\" ]"
run_test "Verify script is executable" "[ -x \"$(dirname \"$0\")/verify.sh\" ]"
run_test "Verify script checks GitHub Actions" "$(dirname \"$0\")/verify.sh"

# Test Docker setup
log "INFO" "Testing Docker setup..."
run_test "Docker is installed" "docker --version"
run_test "Docker daemon is running" "docker info"

# Test Kubernetes setup
log "INFO" "Testing Kubernetes setup..."
run_test "kubectl is installed" "kubectl version --client"
run_test "Kubernetes cluster is accessible" "kubectl cluster-info"

# Test GitHub CLI
log "INFO" "Testing GitHub CLI..."
run_test "GitHub CLI is installed" "gh --version"
run_test "GitHub authentication" "gh auth status"

# Test workflow files
log "INFO" "Testing workflow files..."
run_test "CI workflow exists" "[ -f \".github/workflows/ci.yml\" ]"
run_test "CD workflow exists" "[ -f \".github/workflows/cd.yml\" ]"

# Test Docker Compose
log "INFO" "Testing Docker Compose..."
run_test "Docker Compose file exists" "[ -f \"docker-compose.yml\" ]"
run_test "Docker Compose is valid" "docker-compose config"

# Summary
log "INFO" "CI/CD test suite completed"
echo -e "${GREEN}CI/CD test suite completed successfully!${NC}"
echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
echo -e "${YELLOW}Note:${NC}"
echo "1. Review the log file for detailed test results"
echo "2. Some tests may require manual verification"
echo "3. Ensure all required credentials are properly configured"
echo "4. Check GitHub repository settings and permissions"
