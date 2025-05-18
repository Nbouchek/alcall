#!/usr/bin/env bash

# init_repo.sh
# This script initializes the repository structure for the UnifiedChat platform
# following the specifications in IMPLEMENTATION.md
# Usage: ./init_repo.sh

set -euo pipefail

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ROOT_DIR="$(dirname "$SCRIPT_DIR")"
readonly LOG_FILE="${ROOT_DIR}/init_repo.log"

# Logging levels
readonly LOG_LEVEL_INFO="INFO"
readonly LOG_LEVEL_ERROR="ERROR"
readonly LOG_LEVEL_SUCCESS="SUCCESS"

# Repository structure
readonly REPO_STRUCTURE=(
    ".github/workflows"
    "services/auth-service"
    "services/message-service"
    "services/realtime-service"
    "services/user-service"
    "services/payment-service"
    "services/ai-service"
    "services/gateway-service"
    "web/frontend"
    "mobile/flutter"
    "desktop/tauri"
    "infrastructure/terraform"
    "infrastructure/kubernetes"
    "infrastructure/monitoring"
    "docs/api"
    "docs/architecture"
    "docs/development"
)

# Template files
readonly TEMPLATE_FILES=(
    ".github/workflows/main.yml"
    ".github/workflows/pr.yml"
    ".github/workflows/release.yml"
    ".github/ISSUE_TEMPLATE/bug_report.md"
    ".github/ISSUE_TEMPLATE/feature_request.md"
    ".github/ISSUE_TEMPLATE/security_issue.md"
    ".github/ISSUE_TEMPLATE/documentation_update.md"
    ".github/PULL_REQUEST_TEMPLATE/feature_pr.md"
    ".github/PULL_REQUEST_TEMPLATE/bugfix_pr.md"
    ".github/PULL_REQUEST_TEMPLATE/documentation_pr.md"
    ".github/PULL_REQUEST_TEMPLATE/security_pr.md"
)

# Logging function
log() {
    local level="$1"
    local message="$2"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Error handling
handle_error() {
    local line_no="$1"
    local error_code="$2"
    log "$LOG_LEVEL_ERROR" "Error occurred in line $line_no (exit code: $error_code)"
    exit "$error_code"
}

# Set up error handling
trap 'handle_error ${LINENO} $?' ERR

# Function to check if running in a git repository
check_git_repo() {
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        log "$LOG_LEVEL_ERROR" "Not a git repository. Please initialize git first."
        exit 1
    fi
}

# Function to create directory structure
create_directory_structure() {
    log "$LOG_LEVEL_INFO" "Creating directory structure..."
    
    for dir in "${REPO_STRUCTURE[@]}"; do
        local full_path="${ROOT_DIR}/${dir}"
        if [ ! -d "$full_path" ]; then
            mkdir -p "$full_path"
            log "$LOG_LEVEL_SUCCESS" "Created directory: $dir"
        else
            log "$LOG_LEVEL_INFO" "Directory already exists: $dir"
        fi
    done
}

# Function to create template files
create_template_files() {
    log "$LOG_LEVEL_INFO" "Creating template files..."
    
    for template in "${TEMPLATE_FILES[@]}"; do
        local full_path="${ROOT_DIR}/${template}"
        local dir_path
        dir_path=$(dirname "$full_path")
        
        # Create directory if it doesn't exist
        mkdir -p "$dir_path"
        
        # Create template file if it doesn't exist
        if [ ! -f "$full_path" ]; then
            touch "$full_path"
            log "$LOG_LEVEL_SUCCESS" "Created template file: $template"
        else
            log "$LOG_LEVEL_INFO" "Template file already exists: $template"
        fi
    done
}

# Function to create basic README files
create_readme_files() {
    log "$LOG_LEVEL_INFO" "Creating README files..."
    
    local readme_dirs=(
        "services"
        "web"
        "mobile"
        "desktop"
        "infrastructure"
        "docs"
    )
    
    for dir in "${readme_dirs[@]}"; do
        local readme_path="${ROOT_DIR}/${dir}/README.md"
        if [ ! -f "$readme_path" ]; then
            echo "# ${dir^} Directory" > "$readme_path"
            echo "This directory contains the ${dir} components of the UnifiedChat platform." >> "$readme_path"
            log "$LOG_LEVEL_SUCCESS" "Created README: $dir/README.md"
        else
            log "$LOG_LEVEL_INFO" "README already exists: $dir/README.md"
        fi
    done
}

# Function to create .gitignore
create_gitignore() {
    log "$LOG_LEVEL_INFO" "Creating .gitignore file..."
    
    local gitignore_path="${ROOT_DIR}/.gitignore"
    if [ ! -f "$gitignore_path" ]; then
        cat > "$gitignore_path" << EOL
# Dependencies
node_modules/
vendor/
.pnp/
.pnp.js

# Build outputs
dist/
build/
*.o
*.so
*.dylib

# Environment
.env
.env.local
.env.*.local
.env.development
.env.test
.env.production

# IDE
.idea/
.vscode/
*.swp
*.swo
.DS_Store

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/
.nyc_output/

# Temporary files
*.tmp
*.temp
.cache/

# System Files
.DS_Store
Thumbs.db
EOL
        log "$LOG_LEVEL_SUCCESS" "Created .gitignore file"
    else
        log "$LOG_LEVEL_INFO" ".gitignore file already exists"
    fi
}

# Function to initialize git hooks
init_git_hooks() {
    log "$LOG_LEVEL_INFO" "Initializing git hooks..."
    
    local hooks_dir="${ROOT_DIR}/.git/hooks"
    local pre_commit_hook="${hooks_dir}/pre-commit"
    
    if [ ! -f "$pre_commit_hook" ]; then
        cat > "$pre_commit_hook" << EOL
#!/bin/sh

# Run code formatting
echo "Running code formatting..."
# Add your formatting commands here

# Run linting
echo "Running linting..."
# Add your linting commands here

# Run tests
echo "Running tests..."
# Add your test commands here

# Run security checks
echo "Running security checks..."
# Add your security check commands here
EOL
        chmod +x "$pre_commit_hook"
        log "$LOG_LEVEL_SUCCESS" "Created pre-commit hook"
    else
        log "$LOG_LEVEL_INFO" "pre-commit hook already exists"
    fi
}

# Main function
main() {
    log "$LOG_LEVEL_INFO" "Starting repository initialization..."
    
    # Clear log file if it exists
    > "$LOG_FILE"
    
    # Check if we're in a git repository
    check_git_repo
    
    # Create directory structure
    create_directory_structure
    
    # Create template files
    create_template_files
    
    # Create README files
    create_readme_files
    
    # Create .gitignore
    create_gitignore
    
    # Initialize git hooks
    init_git_hooks
    
    log "$LOG_LEVEL_SUCCESS" "Repository initialization completed successfully!"
    log "$LOG_LEVEL_INFO" "Log file created at: $LOG_FILE"
}

# Run main function
main 