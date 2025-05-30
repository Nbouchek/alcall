#!/bin/bash

# Exit on error
set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Load configuration
source "$PROJECT_ROOT/quickstart/config/repo.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Setup logging
LOG_DIR="$PROJECT_ROOT/logs/repo"
LOG_FILE="$LOG_DIR/repo_test_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

# Logging function
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Start logging
log "INFO" "Starting repository test suite"
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
run_test "Setup script creates repository structure" "$(dirname \"$0\")/setup.sh && [ -d \".github\" ] && [ -d \"docs\" ]"

# Test teardown script
log "INFO" "Testing teardown script..."
run_test "Teardown script exists" "[ -f \"$(dirname \"$0\")/teardown.sh\" ]"
run_test "Teardown script is executable" "[ -x \"$(dirname \"$0\")/teardown.sh\" ]"
run_test "Teardown script removes repository files" "$(dirname \"$0\")/teardown.sh && [ ! -d \".github\" ]"

# Test verify script
log "INFO" "Testing verify script..."
run_test "Verify script exists" "[ -f \"$(dirname \"$0\")/verify.sh\" ]"
run_test "Verify script is executable" "[ -x \"$(dirname \"$0\")/verify.sh\" ]"
run_test "Verify script checks repository" "$(dirname \"$0\")/verify.sh"

# Test Git setup
log "INFO" "Testing Git setup..."
run_test "Git is installed" "git --version"
run_test "Git repository is initialized" "git rev-parse --is-inside-work-tree"
run_test "Git remote is configured" "git remote -v | grep -q 'origin'"

# Test GitHub CLI
log "INFO" "Testing GitHub CLI..."
run_test "GitHub CLI is installed" "gh --version"
run_test "GitHub authentication" "gh auth status"
run_test "GitHub repository exists" "gh repo view"

# Test repository structure
log "INFO" "Testing repository structure..."
run_test "README exists" "[ -f \"README.md\" ]"
run_test "LICENSE exists" "[ -f \"LICENSE\" ]"
run_test "CONTRIBUTING exists" "[ -f \"CONTRIBUTING.md\" ]"
run_test "Issue templates exist" "[ -d \".github/ISSUE_TEMPLATE\" ]"
run_test "Pull request template exists" "[ -f \".github/pull_request_template.md\" ]"

# Test documentation
log "INFO" "Testing documentation..."
run_test "Documentation directory exists" "[ -d \"docs\" ]"
run_test "API documentation exists" "[ -d \"docs/api\" ]"
run_test "Architecture documentation exists" "[ -d \"docs/architecture\" ]"
run_test "Development guide exists" "[ -f \"docs/development.md\" ]"
run_test "Deployment guide exists" "[ -f \"docs/deployment.md\" ]"

# Test branch protection
log "INFO" "Testing branch protection..."
run_test "Main branch exists" "git show-ref --verify --quiet refs/heads/main"
run_test "Develop branch exists" "git show-ref --verify --quiet refs/heads/develop"
run_test "Branch protection is enabled" "gh api repos/\$(gh repo view --json nameWithOwner -q .nameWithOwner)/branches/main/protection"

# Test repository settings
log "INFO" "Testing repository settings..."
run_test "Repository description is set" "gh repo view --json description -q .description"
run_test "Repository topics are set" "gh repo view --json repositoryTopics -q .repositoryTopics"
run_test "Repository visibility is set" "gh repo view --json visibility -q .visibility"

# Test repository files
log "INFO" "Testing repository files..."
run_test ".gitignore exists" "[ -f \".gitignore\" ]"
run_test "Code of conduct exists" "[ -f \"CODE_OF_CONDUCT.md\" ]"
run_test "Security policy exists" "[ -f \"SECURITY.md\" ]"
run_test "Changelog exists" "[ -f \"CHANGELOG.md\" ]"

# Summary
log "INFO" "Repository test suite completed"
echo -e "${GREEN}Repository test suite completed successfully!${NC}"
echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
echo -e "${YELLOW}Note:${NC}"
echo "1. Review the log file for detailed test results"
echo "2. Some tests may require manual verification"
echo "3. Ensure GitHub repository settings are properly configured"
echo "4. Check branch protection rules and repository permissions"
echo "5. Verify all documentation is up to date"
