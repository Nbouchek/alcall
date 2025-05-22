#!/usr/bin/env bash

# logging_utils.sh
# Provides consistent logging functions for all scripts in the project
# Usage: source ./scripts/logging_utils.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script name without path and extension
get_script_name() {
    # Get the actual script name from the command line
    if [ -n "${0:-}" ]; then
        basename "$0" .sh
    else
        # Fallback to the direct caller
        basename "${BASH_SOURCE[1]}" .sh
    fi
}

# Setup logging for the current script
setup_logging() {
    script_name=$(get_script_name)
    script_dir="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
    root_dir="$(dirname "$script_dir")"
    LOG_BASE_DIR="${root_dir}/logs"
    LOG_DIR="$LOG_BASE_DIR"
    CURRENT_DATE=$(date +%Y%m%d)
    LOG_FILE="$LOG_DIR/${script_name}_${CURRENT_DATE}.log"
    LATEST_LOG_LINK="$LOG_DIR/${script_name}_latest.log"
    MAX_LOG_DAYS=7

    # Create logging directory if it doesn't exist
    mkdir -p "$LOG_DIR" || {
        echo "Error: Failed to create log directory: $LOG_DIR" >&2
        return 1
    }
    
    # Rotate old logs
    find "$LOG_DIR" -name "${script_name}_*.log" -type f -mtime +$MAX_LOG_DAYS -delete 2>/dev/null || true
    
    # Update latest log symlink
    ln -sf "$LOG_FILE" "$LATEST_LOG_LINK" 2>/dev/null || true
    
    # Add log header if file doesn't exist, otherwise add a separator
    if [ ! -f "$LOG_FILE" ]; then
        {
            echo "==================================================="
            echo "Log for $script_name - $(date '+%Y-%m-%d %H:%M:%S')"
            echo "System: $(uname -a)"
            echo "User: $USER"
            echo "Directory: $PWD"
            echo "==================================================="
            echo ""
        } > "$LOG_FILE" || {
            echo "Error: Failed to create log file: $LOG_FILE" >&2
            return 1
        }
    else
        {
            echo ""
            echo "==================================================="
            echo "New run started at $(date '+%Y-%m-%d %H:%M:%S')"
            echo "Directory: $PWD"
            echo "==================================================="
            echo ""
        } >> "$LOG_FILE" || {
            echo "Error: Failed to append to log file: $LOG_FILE" >&2
            return 1
        }
    fi

    # Create or append to summary file
    SUMMARY_FILE="$LOG_DIR/${script_name}_summary_${CURRENT_DATE}.txt"
    if [ ! -f "$SUMMARY_FILE" ]; then
        touch "$SUMMARY_FILE" || {
            echo "Error: Failed to create summary file: $SUMMARY_FILE" >&2
            return 1
        }
    else
        echo "" >> "$SUMMARY_FILE"
    fi
    
    # Export variables for use in the script
    export LOG_FILE
    export SUMMARY_FILE
    export LOG_DIR
    export MAX_LOG_DAYS
}

# Enhanced logging functions
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local log_entry="[$timestamp] [$level] $message"
    
    # Use different colors for different log levels
    case $level in
        INFO)  echo -e "${GREEN}$log_entry${NC}" ;;
        WARN)  echo -e "${YELLOW}$log_entry${NC}" ;;
        ERROR) echo -e "${RED}$log_entry${NC}" ;;
        DEBUG) 
            if [ "${DEBUG_MODE:-false}" = "true" ]; then
                echo -e "${BLUE}$log_entry${NC}"
            fi
            ;;
    esac
    
    # Append to log file without color codes if LOG_FILE is set
    if [ -n "${LOG_FILE:-}" ] && [ -w "${LOG_FILE:-}" ]; then
        echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    fi
}

# Convenience logging functions
log_info() {
    log "INFO" "$*"
}

log_warn() {
    log "WARN" "$*"
}

log_error() {
    log "ERROR" "$*"
}

log_debug() {
    log "DEBUG" "$*"
}

# Add log summary function
log_summary() {
    local message=$1
    local status=$2
    if [ -n "${SUMMARY_FILE:-}" ] && [ -w "${SUMMARY_FILE:-}" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - $message: $status" >> "$SUMMARY_FILE"
    fi
}

# Function to compress old logs
compress_old_logs() {
    local script_name=$(get_script_name)
    local compress_after_days=1
    if [ -n "${LOG_DIR:-}" ] && [ -d "${LOG_DIR:-}" ]; then
        find "$LOG_DIR" -name "${script_name}_*.log" -type f -mtime +$compress_after_days ! -name "*.gz" -exec gzip {} \; 2>/dev/null || true
    fi
}

# Add log viewing function
view_logs() {
    local script_name=$(get_script_name)
    if [ -n "${LOG_DIR:-}" ] && [ -d "${LOG_DIR:-}" ]; then
        local latest_log="$LOG_DIR/${script_name}_latest.log"
        if [ -f "$latest_log" ]; then
            less "$latest_log"
        else
            echo "No logs found for $script_name"
        fi
    else
        echo "Log directory not found"
    fi
}

# Add log cleanup function
cleanup_logs() {
    local script_name=$(get_script_name)
    if [ -n "${LOG_DIR:-}" ] && [ -d "${LOG_DIR:-}" ]; then
        # Keep only last MAX_LOG_DAYS days of logs
        find "$LOG_DIR" -name "${script_name}_*.log*" -type f -mtime +${MAX_LOG_DAYS:-7} -delete 2>/dev/null || true
        find "$LOG_DIR" -name "${script_name}_summary_*.txt" -type f -mtime +${MAX_LOG_DAYS:-7} -delete 2>/dev/null || true
        
        # Remove empty log files
        find "$LOG_DIR" -name "${script_name}_*.log" -type f -empty -delete 2>/dev/null || true
        find "$LOG_DIR" -name "${script_name}_*.txt" -type f -empty -delete 2>/dev/null || true
    fi
}

# Function to create a cleanup trap
setup_logging_cleanup() {
    trap 'cleanup_logs; compress_old_logs' EXIT
}

# Initialize logging when sourced
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    setup_logging
    setup_logging_cleanup
fi 