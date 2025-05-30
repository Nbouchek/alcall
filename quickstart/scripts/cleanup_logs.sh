#!/bin/bash

# Exit on error
set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Setup logging
LOG_DIR="$PROJECT_ROOT/logs"
REPORTS_DIR="$PROJECT_ROOT/reports"
LOG_FILE="$LOG_DIR/cleanup_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log "INFO" "Starting log cleanup (retain only last 2 logs per group)"
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

# Check for required tools
if ! command_exists find; then
    handle_error "find command is not available"
fi

if ! command_exists xargs; then
    handle_error "xargs command is not available"
fi

# Load configuration
CONFIG_FILE="$(dirname "$0")/../config/cleanup.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    handle_error "Configuration file not found: $CONFIG_FILE"
fi

# Default retention settings (log_type retention_days log_prefix)
LOG_TYPES="dev-env dev_env_ repo repo_ infra infra_ cicd cicd_"

# Try to load custom retention settings from yq if available
if command_exists yq; then
    # Overwrite LOG_TYPES if config is found
    CUSTOM_LOG_TYPES=""
    for log_type in dev-env repo infra cicd; do
        days=$(yq e ".retention.days.$log_type" "$CONFIG_FILE")
        if [ "$days" = "null" ] || [ -z "$days" ]; then
            case $log_type in
                dev-env) days=7; prefix=dev_env_ ;;
                repo) days=30; prefix=repo_ ;;
                infra) days=90; prefix=infra_ ;;
                cicd) days=30; prefix=cicd_ ;;
            esac
        else
            case $log_type in
                dev-env) prefix=dev_env_ ;;
                repo) prefix=repo_ ;;
                infra) prefix=infra_ ;;
                cicd) prefix=cicd_ ;;
            esac
        fi
        CUSTOM_LOG_TYPES="$CUSTOM_LOG_TYPES $log_type $days $prefix"
    done
    LOG_TYPES="$CUSTOM_LOG_TYPES"
else
    log "WARN" "yq not found, using default retention settings"
fi

# Function to clean up files in a directory, keeping only the last 2 files (generic, no prefix)
cleanup_files_generic() {
    local dir=$1
    if [ ! -d "$dir" ]; then
        log "WARN" "Directory not found: $dir"
        return
    fi
    log "INFO" "Cleaning up files in $dir (retain last 2 files)"
    local files=()
    while IFS= read -r file; do
        files+=("$file")
    done < <(find "$dir" -maxdepth 1 -type f -print0 | xargs -0 ls -1t 2>/dev/null)
    local count=${#files[@]}
    if [ $count -le 2 ]; then
        return
    fi
    for ((i=2; i<$count; i++)); do
        rm -f "${files[$i]}"
        log "INFO" "Deleted old file: ${files[$i]}"
    done
}

# Clean up logs and all subfolders, keeping only last 2 files in each
find "$LOG_DIR" -type d | while read -r subdir; do
    cleanup_files_generic "$subdir"
done

# Clean up reports and all subfolders
for subfolder in "$REPORTS_DIR" "$REPORTS_DIR"/*; do
  if [ -d "$subfolder" ]; then
    cleanup_files_generic "$subfolder"
  fi
done

# Calculate total disk usage
log "INFO" "Total log directory size: $(du -sh "$LOG_DIR" | cut -f1)"
log "INFO" "Total reports directory size: $(du -sh "$REPORTS_DIR" | cut -f1)"

echo -e "${GREEN}Log and report cleanup completed successfully!${NC}"
log "INFO" "Log and report cleanup completed successfully"
echo -e "${YELLOW}Summary:${NC}"
echo "1. Only the last 2 files per group (in every subfolder) have been retained in logs and reports"
echo "2. Total log directory size: $(du -sh "$LOG_DIR" | cut -f1)"
echo "3. Total reports directory size: $(du -sh "$REPORTS_DIR" | cut -f1)"
echo "4. See $LOG_FILE for detailed cleanup log"
