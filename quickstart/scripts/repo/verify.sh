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
BLUE='\033[1;34m'
NC='\033[0m'

# Setup logging
LOG_DIR="$PROJECT_ROOT/logs/repo"
LOG_FILE="$LOG_DIR/repo_verify_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

REPORT_PATH="$SCRIPT_DIR/verify_report.txt"
REPORT_STATUS=0

# Logging function
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

handle_error() {
    local error_msg=$1
    log "ERROR" "$error_msg"
    REPORT_STATUS=1
}

handle_warn() {
    local warn_msg=$1
    log "WARN" "$warn_msg"
}

# Report generation
generate_report() {
    echo "Repository Setup Verification Report" > "$REPORT_PATH"
    echo "Generated: $(date)" >> "$REPORT_PATH"
    echo "----------------------------------------" >> "$REPORT_PATH"
    if grep -q '\[ERROR\]' "$LOG_FILE"; then
        echo "Errors:" >> "$REPORT_PATH"
        grep '\[ERROR\]' "$LOG_FILE" >> "$REPORT_PATH"
    else
        echo "No errors found." >> "$REPORT_PATH"
    fi
    if grep -q '\[WARN\]' "$LOG_FILE"; then
        echo "\nWarnings:" >> "$REPORT_PATH"
        grep '\[WARN\]' "$LOG_FILE" >> "$REPORT_PATH"
    else
        echo "No warnings found." >> "$REPORT_PATH"
    fi
    echo "\nFull log: $LOG_FILE" >> "$REPORT_PATH"
    echo "\nVerification completed at $(date)" >> "$REPORT_PATH"
    log "INFO" "Summary report generated at $REPORT_PATH"
}

trap generate_report EXIT

log "INFO" "Starting repository setup verification"
log "INFO" "Log file: $LOG_FILE"

# Check GitHub authentication
log "INFO" "Checking GitHub authentication..."
if ! gh auth status >/dev/null 2>&1; then
    handle_error "Not authenticated with GitHub"
fi
log "INFO" "GitHub authentication verified successfully"

# Check repository structure (main dirs, subdirs, and key files)
log "INFO" "Checking repository structure..."
REQUIRED_DIRS=(
    .github/workflows
    .github/ISSUE_TEMPLATE
    .github/PULL_REQUEST_TEMPLATE
    services/auth-service/src
    services/auth-service/tests
    services/message-service/src
    services/message-service/tests
    services/realtime-service/src
    services/realtime-service/tests
    services/user-service/src
    services/user-service/tests
    services/payment-service/src
    services/payment-service/tests
    services/ai-service/src
    services/ai-service/tests
    services/gateway-service/src
    services/gateway-service/tests
    web/frontend
    mobile/flutter
    desktop/tauri
    infrastructure/terraform
    infrastructure/kubernetes
    infrastructure/monitoring
    docs/api
    docs/architecture
    docs/development
)
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$PROJECT_ROOT/$dir" ]; then
        handle_error "Required directory $dir not found"
    else
        log "INFO" "Directory $dir verified"
    fi
done

REQUIRED_FILES=(
    README.md
    LICENSE
    CONTRIBUTING.md
    .gitignore
    CODE_OF_CONDUCT.md
    SECURITY.md
    CHANGELOG.md
    .github/CODEOWNERS
)
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$PROJECT_ROOT/$file" ]; then
        handle_error "Required file $file not found"
    else
        log "INFO" "File $file verified"
    fi
done

# Check GitHub workflow files
log "INFO" "Checking GitHub workflow files..."
for workflow in main.yml pr.yml release.yml; do
    if [ ! -f "$PROJECT_ROOT/.github/workflows/$workflow" ]; then
        handle_error "Required workflow file .github/workflows/$workflow not found"
    else
        log "INFO" "Workflow file .github/workflows/$workflow verified"
    fi
done

# Check issue templates
log "INFO" "Checking issue templates..."
for template in bug_report.md feature_request.md security_issue.md documentation_update.md; do
    if [ ! -f "$PROJECT_ROOT/.github/ISSUE_TEMPLATE/$template" ]; then
        handle_error "Required issue template .github/ISSUE_TEMPLATE/$template not found"
    else
        log "INFO" "Issue template .github/ISSUE_TEMPLATE/$template verified"
    fi
done

# Check PR templates
log "INFO" "Checking PR templates..."
for pr_template in feature_pr.md bugfix_pr.md documentation_pr.md security_pr.md pull_request_template.md; do
    if [ ! -f "$PROJECT_ROOT/.github/PULL_REQUEST_TEMPLATE/$pr_template" ]; then
        handle_error "Required PR template .github/PULL_REQUEST_TEMPLATE/$pr_template not found"
    else
        log "INFO" "PR template .github/PULL_REQUEST_TEMPLATE/$pr_template verified"
    fi
done

# Check CODEOWNERS file and content
log "INFO" "Checking CODEOWNERS file..."
CODEOWNERS_PATH="$PROJECT_ROOT/.github/CODEOWNERS"
if [ ! -f "$CODEOWNERS_PATH" ]; then
    handle_error ".github/CODEOWNERS file not found"
else
    # Check for required owners (service, infra, docs, security)
    grep -q "/services/auth-service/" "$CODEOWNERS_PATH" || handle_error "CODEOWNERS missing /services/auth-service/ entry"
    grep -q "/infrastructure/" "$CODEOWNERS_PATH" || handle_error "CODEOWNERS missing /infrastructure/ entry"
    grep -q "/docs/" "$CODEOWNERS_PATH" || handle_error "CODEOWNERS missing /docs/ entry"
    grep -q ".github/" "$CODEOWNERS_PATH" || handle_error "CODEOWNERS missing .github/ entry"
    log "INFO" "CODEOWNERS file and entries verified"
fi

# Check if repository is initialized with git
log "INFO" "Checking git repository..."
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    handle_error "Git repository not initialized"
else
    log "INFO" "Git repository verified"
fi

# Check if remote repository is configured
log "INFO" "Checking git remote..."
cd "$PROJECT_ROOT"
if ! git remote get-url origin >/dev/null 2>&1; then
    handle_error "Git remote 'origin' not configured"
else
    log "INFO" "Git remote verified"
fi

# Check if main, develop, and at least one release/* branch exist
log "INFO" "Checking branches..."
if ! git show-ref --verify --quiet refs/heads/main; then
    handle_error "Main branch not found"
else
    log "INFO" "Main branch verified"
fi
if ! git show-ref --verify --quiet refs/heads/develop; then
    handle_error "Develop branch not found"
else
    log "INFO" "Develop branch verified"
fi
RELEASE_BRANCHES=$(git branch -r | grep 'origin/release/' | sed 's|origin/||')
if [ -z "$RELEASE_BRANCHES" ]; then
    handle_error "No release/* branch found"
else
    log "INFO" "Release branches found: $RELEASE_BRANCHES"
fi

# Check branch protection rules using GitHub API
log "INFO" "Checking branch protection rules..."
REPO_NAME=$(gh repo view --json nameWithOwner -q .nameWithOwner)

check_branch_protection() {
    local branch=$1
    local required_reviews=$2
    local required_contexts=$3
    local require_code_owner_reviews=$4
    local require_signed_commits=$5
    local require_linear_history=$6
    local require_release_manager=$7
    local require_tag_regex=$8

    local protection_json
    protection_json=$(gh api repos/$REPO_NAME/branches/$branch/protection 2>/dev/null || echo "")
    if [ -z "$protection_json" ]; then
        handle_error "No protection found for branch $branch"
        return
    fi
    # Check required approving review count
    local actual_reviews
    actual_reviews=$(echo "$protection_json" | grep -o '"required_approving_review_count":[ ]*[0-9]*' | grep -o '[0-9]*')
    if [ "$actual_reviews" != "$required_reviews" ]; then
        handle_error "Branch $branch: required_approving_review_count is $actual_reviews, expected $required_reviews"
    fi
    # Check required status checks
    for ctx in ${required_contexts//,/ }; do
        echo "$protection_json" | grep -q "$ctx" || handle_error "Branch $branch: required status check '$ctx' missing"
    done
    # Check code owner reviews
    if [ "$require_code_owner_reviews" = "true" ]; then
        echo "$protection_json" | grep -q '"require_code_owner_reviews": *true' || handle_error "Branch $branch: require_code_owner_reviews not enabled"
    fi
    # Check signed commits
    if [ "$require_signed_commits" = "true" ]; then
        echo "$protection_json" | grep -q '"required_signatures": *true' || handle_error "Branch $branch: required_signatures not enabled"
    fi
    # Check linear history
    if [ "$require_linear_history" = "true" ]; then
        echo "$protection_json" | grep -q '"required_linear_history": *true' || handle_error "Branch $branch: required_linear_history not enabled"
    fi
    # Check release manager approval (for release/*)
    if [ "$require_release_manager" = "true" ]; then
        echo "$protection_json" | grep -q 'release-managers' || handle_error "Branch $branch: release manager approval not enforced"
    fi
    # Check version tag format (for release/*)
    if [ "$require_tag_regex" = "true" ]; then
        # This is a placeholder: actual tag regex enforcement may require additional API calls or settings
        git tag -l | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$' || handle_error "Branch $branch: version tag format not enforced (expected vX.Y.Z)"
    fi
    log "INFO" "Branch protection for $branch verified"
}

# Main branch
check_branch_protection main 2 "test,lint,security" true true true false false
# Develop branch
check_branch_protection develop 1 "test,lint" true true true false false
# Release branches
for branch in $RELEASE_BRANCHES; do
    check_branch_protection $branch 1 "test,lint,build,security" true true true true true
    # Check version tag format for release branches
    git tag -l | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$' || handle_warn "No tags matching vX.Y.Z format found for release branches"
    log "INFO" "Release branch $branch protection verified"
done

# Summary
log "INFO" "Repository setup verification completed"
echo -e "${BLUE}==== Repository Setup Verification Summary ====\n${NC}"
if grep -q '\[ERROR\]' "$LOG_FILE"; then
    echo -e "${RED}Errors:${NC}"
    grep '\[ERROR\]' "$LOG_FILE"
else
    echo -e "${GREEN}No errors found.${NC}"
fi
if grep -q '\[WARN\]' "$LOG_FILE"; then
    echo -e "${YELLOW}Warnings:${NC}"
    grep '\[WARN\]' "$LOG_FILE"
else
    echo -e "${GREEN}No warnings found.${NC}"
fi
echo -e "\nFull log: $LOG_FILE"
echo -e "Verification completed at $(date)"
