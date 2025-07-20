#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    local level=$1
    local msg=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $msg"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to clean up Docker resources
cleanup_docker() {
    log "INFO" "Cleaning up Docker resources..."
    if command_exists docker; then
        # Stop all running containers
        if docker ps -q | grep -q .; then
            docker stop $(docker ps -q) || true
        fi

        # Remove all containers
        docker rm -f $(docker ps -aq) 2>/dev/null || true

        # Remove all images
        docker rmi -f $(docker images -q) 2>/dev/null || true

        # Remove all volumes
        docker volume rm $(docker volume ls -q) 2>/dev/null || true

        # Remove all networks
        docker network prune -f || true

        # Clean up system
        docker system prune -af --volumes || true
    fi
    log "INFO" "Docker cleanup completed"
}

# Function to clean up GitHub resources
cleanup_github() {
    log "INFO" "Cleaning up GitHub resources..."
    if command_exists gh; then
        # Get repository name
        local repo_name=$(git config --get remote.origin.url 2>/dev/null | sed 's/.*github.com[:/]//' | sed 's/\.git$//')

        if [ -n "$repo_name" ]; then
            # Remove branch protection rules
            gh api repos/$repo_name/branches/main/protection -X DELETE 2>/dev/null || true
            gh api repos/$repo_name/branches/develop/protection -X DELETE 2>/dev/null || true

            # Remove environments
            for env in development staging production; do
                gh api repos/$repo_name/environments/$env -X DELETE 2>/dev/null || true
            done

            # Remove secrets
            for secret in $(gh secret list 2>/dev/null | awk '{print $1}'); do
                gh secret delete "$secret" 2>/dev/null || true
            done
        fi
    fi

    # Remove GitHub directories
    rm -rf "$PROJECT_ROOT/.github" 2>/dev/null || true
    log "INFO" "GitHub cleanup completed"
}

# Function to clean up development environment
cleanup_dev_env() {
    log "INFO" "Cleaning up development environment..."

    # Remove conda environment
    if command_exists conda; then
        if conda env list | grep -q "alcall"; then
            ACTIVE_ENV=$(conda info --envs | awk '/\*/ {print $1}')
            if [ "$ACTIVE_ENV" = "alcall" ]; then
                conda deactivate 2>/dev/null || true
            fi
            conda remove --name alcall --all -y 2>/dev/null || true
        fi
    fi

    # Remove Python cache
    find "$PROJECT_ROOT" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find "$PROJECT_ROOT" -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
    find "$PROJECT_ROOT" -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true

    # Remove Node.js artifacts
    find "$PROJECT_ROOT" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
    find "$PROJECT_ROOT" -name "package-lock.json" -type f -delete 2>/dev/null || true

    # Remove Go artifacts
    find "$PROJECT_ROOT" -name "vendor" -type d -exec rm -rf {} + 2>/dev/null || true
    if command_exists go; then
        go clean -cache -modcache -i -r 2>/dev/null || true
    fi

    # Remove Rust artifacts
    find "$PROJECT_ROOT" -name "target" -type d -exec rm -rf {} + 2>/dev/null || true
    if command_exists cargo; then
        cargo clean 2>/dev/null || true
    fi

    log "INFO" "Development environment cleanup completed"
}

# Define paths to remove
REMOVE_PATHS=(
    "services"
    "web"
    "mobile"
    "desktop"
    "infrastructure"
    "docs"
    "documentation"
    ".github"
    "scripts/cicd"
    "reports"
    ".pytest_cache"
)

# PROTECTED FILES AND DIRECTORIES (never delete or modify)
PROTECTED_PATHS=(
    "$PROJECT_ROOT/IMPLEMENTATION.md"
    "$PROJECT_ROOT/README.md"
    "$PROJECT_ROOT/ROADMAP.md"
    "$PROJECT_ROOT/CONTRIBUTING.md"
    "$PROJECT_ROOT/quickstart"
    "$PROJECT_ROOT/.cursor"
    "$PROJECT_ROOT/.gitkeep"
    "$PROJECT_ROOT/.gitmodules"
    "$PROJECT_ROOT/.gitignore"
    "$PROJECT_ROOT/.gitkeep"
    "$PROJECT_ROOT/.gitmodules"
    "$PROJECT_ROOT/.gitignore"
    "$PROJECT_ROOT/.cursor/rules/alcall.mdc"
)

# Function to check if a path is protected
is_protected() {
    local path="$1"
    for protected in "${PROTECTED_PATHS[@]}"; do
        if [[ "$path" == "$protected" ]]; then
            return 0
        fi
    done
    return 1
}

# Main cleanup function
cleanup() {
    log "INFO" "Starting comprehensive cleanup..."

    # Clean up Docker resources
    cleanup_docker

    # Clean up GitHub resources
    cleanup_github

    # Clean up development environment
    cleanup_dev_env

    # Remove specified paths, but skip protected ones and .cursor
    for path in "${REMOVE_PATHS[@]}"; do
        full_path="$PROJECT_ROOT/$path"
        # Check if this path is protected or is .cursor
        if is_protected "$full_path" || [[ "$full_path" == "$PROJECT_ROOT/.cursor" ]]; then
            log "INFO" "Skipping protected path: $full_path"
            continue
        fi
        if [ -e "$full_path" ]; then
            log "INFO" "Removing: $path"
            rm -rf "$full_path"
        fi
    done

    # Explicitly remove .pytest_cache and all its contents, even if it contains hidden files
    PYTEST_CACHE="$PROJECT_ROOT/.pytest_cache"
    if [ -d "$PYTEST_CACHE" ]; then
        rm -rf "$PYTEST_CACHE"
        log "INFO" ".pytest_cache and all its contents removed."
    fi

    # Remove any remaining empty directories, but skip .cursor
    find "$PROJECT_ROOT" -type d -empty -not -path "$PROJECT_ROOT/.cursor" -not -path "$PROJECT_ROOT/.cursor/*" -delete 2>/dev/null || true

    # Clean up git untracked files, always exclude .cursor
    log "INFO" "Cleaning up git untracked files..."
    if [ -d "$PROJECT_ROOT/.git" ]; then
        git clean -fdx -e .cursor 2>/dev/null || true
        log "INFO" "Git cleanup completed"
    fi

    # Remove all files in the config directory, but not the directory itself
    CONFIG_DIR="$PROJECT_ROOT/config"
    if [ -d "$CONFIG_DIR" ]; then
        find "$CONFIG_DIR" -type f -exec rm -f {} +
        echo "[INFO] Removed all files in $CONFIG_DIR, but kept the directory."
    fi

    # Protect .cursor/rules/alcall.mdc from git clean by force-adding and committing if it exists
    ALCALL_MDC="$PROJECT_ROOT/.cursor/rules/alcall.mdc"
    if [ -f "$ALCALL_MDC" ]; then
        git add -f "$ALCALL_MDC"
        git commit -m "Protect .cursor/rules/alcall.mdc from git clean by tracking it in git" --allow-empty 2>/dev/null || true
        log "INFO" "Protected .cursor/rules/alcall.mdc by force-adding and committing."
    fi

    log "INFO" "Cleanup completed"
}

# Parse command line arguments
FORCE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force)
            FORCE=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Confirm unless forced
if [ "$FORCE" = false ]; then
    echo -e "${YELLOW}Warning: This will remove all generated files and directories${NC}"
    echo "The following will be removed:"
    echo "1. All service directories"
    echo "2. Infrastructure and configuration"
    echo "3. Development environment"
    echo "4. GitHub resources"
    echo "5. Docker resources"
    echo "6. All logs and reports"
    echo "7. All git untracked files"
    echo
    echo -e "${RED}WARNING: This action cannot be undone!${NC}"
    read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Cleanup cancelled${NC}"
        exit 1
    fi
fi

# Run cleanup
cleanup

echo -e "${GREEN}Cleanup completed successfully!${NC}"
echo -e "${YELLOW}Note:${NC}"
echo "1. Some system-level resources may need manual cleanup"
echo "2. Review your IDE settings if needed"
echo "3. Check Docker and GitHub for any remaining resources"
echo "4. Consider running 'git clean -fdx' to remove untracked files"

# Add a comment at the top of the script for future maintainers
# NOTE: The following files and directories, and their content, must NEVER be deleted or modified by this script:
#   - IMPLEMENTATION.md
#   - README.md
#   - ROADMAP.md
#   - CONTRIBUTING.md
#   - quickstart/

# Remove IDE settings
# log "INFO" "Removing IDE settings..."
# if [ -f ~/.cursor/settings/settings.json ]; then
#     rm -f ~/.cursor/settings/settings.json
#     log "INFO" "IDE settings removed"
# fi

# At the end, if running git clean, exclude .cursor
if command -v git >/dev/null 2>&1; then
    echo "[INFO] Running 'git clean -fdx -e .cursor' to ensure a completely clean git state, but preserving .cursor..."
    git clean -fdx -e .cursor
    log "INFO" "Ran 'git clean -fdx -e .cursor' to ensure a completely clean git state, but preserved .cursor."
fi
