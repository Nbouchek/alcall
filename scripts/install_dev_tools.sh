#!/usr/bin/env bash

# install_tools.sh
# This script installs and verifies required development tools for UnifiedChat.
# Tools: Docker Desktop, Node.js, Go, Rust, Python, kubectl, Helm
# Usage: ./install_tools.sh

# Enable associative arrays and job control
if [ -n "$ZSH_VERSION" ]; then
    # ZSH specific settings
    setopt KSH_ARRAYS
    setopt SH_WORD_SPLIT
    setopt BASH_REMATCH
elif [ -n "$BASH_VERSION" ]; then
    if [ "${BASH_VERSINFO:-0}" -lt 4 ]; then
        echo "Error: This script requires bash version 4 or higher"
        echo "Current version: $BASH_VERSION"
        exit 1
    fi
else
    echo "Error: This script requires either bash 4+ or zsh"
    exit 1
fi

set -E  # Enable error trapping
set -o pipefail  # Ensure pipeline errors are caught

# Setup logging
LOG_BASE_DIR="$HOME/.unified_chat"
LOG_DIR="$LOG_BASE_DIR/logs"
CURRENT_DATE=$(date +%Y%m%d)
LOG_FILE="$LOG_DIR/install_$CURRENT_DATE.log"
LATEST_LOG_LINK="$LOG_DIR/latest.log"
MAX_LOG_DAYS=7

# Create logging directory structure
setup_logging() {
    # Create necessary directories
    mkdir -p "$LOG_DIR"
    
    # Rotate old logs
    find "$LOG_DIR" -name "install_*.log" -type f -mtime +$MAX_LOG_DAYS -delete
    
    # Update latest log symlink
    ln -sf "$LOG_FILE" "$LATEST_LOG_LINK"
    
    # Add log header
    {
        echo "==================================================="
        echo "Installation Log - $(date '+%Y-%m-%d %H:%M:%S')"
        echo "System: $(uname -a)"
        echo "User: $USER"
        echo "Directory: $PWD"
        echo "==================================================="
        echo ""
    } > "$LOG_FILE"
    
    # Create a summary file for the current installation
    SUMMARY_FILE="$LOG_DIR/summary_$CURRENT_DATE.txt"
    touch "$SUMMARY_FILE"
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
    
    # Append to log file without color codes
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Add log summary function
log_summary() {
    local message=$1
    local status=$2
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $message: $status" >> "$SUMMARY_FILE"
}

# Function to compress old logs
compress_old_logs() {
    local compress_after_days=1
    find "$LOG_DIR" -name "install_*.log" -type f -mtime +$compress_after_days ! -name "*.gz" -exec gzip {} \;
}

# Add log viewing function
view_logs() {
    if [ -f "$LATEST_LOG_LINK" ]; then
        less "$LATEST_LOG_LINK"
    else
        echo "No logs found"
    fi
}

# Add log cleanup function
cleanup_logs() {
    # Keep only last 7 days of logs
    find "$LOG_DIR" -name "install_*.log*" -type f -mtime +$MAX_LOG_DAYS -delete
    find "$LOG_DIR" -name "summary_*.txt" -type f -mtime +$MAX_LOG_DAYS -delete
    
    # Remove empty log files
    find "$LOG_DIR" -name "*.log" -type f -empty -delete
    find "$LOG_DIR" -name "*.txt" -type f -empty -delete
}

# Initialize logging
setup_logging

# Logging functions
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

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Spinner characters for progress indication
SPINNER="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"

# Tool versions required
declare -A REQUIRED_VERSIONS
REQUIRED_VERSIONS[docker]="4.25.0"
REQUIRED_VERSIONS[node]="20.11.0"
REQUIRED_VERSIONS[go]="1.22.0"
REQUIRED_VERSIONS[rustc]="1.75.0"
REQUIRED_VERSIONS[python3]="3.11.0"
REQUIRED_VERSIONS[kubectl]="1.28.0"
REQUIRED_VERSIONS[helm]="3.13.0"
REQUIRED_VERSIONS[terraform]="1.5.7"
REQUIRED_VERSIONS[istioctl]="1.20.0"
REQUIRED_VERSIONS[kind]="0.20.0"
REQUIRED_VERSIONS[k9s]="0.31.0"
REQUIRED_VERSIONS[argocd]="2.10.0"

# Installation state tracking
declare -A INSTALLATION_STATUS
declare -a FAILED_INSTALLATIONS=()
declare -a BACKUP_FILES=()
declare -a VULNERABLE_PACKAGES=()

# Utility functions
cleanup() {
    local exit_code=$?
    log_info "Cleaning up..."
    
    # Stop all background jobs
    jobs -p | xargs -I{} kill {} 2>/dev/null
    
    # Restore backups if installation failed
    if [ ${#FAILED_INSTALLATIONS[@]} -gt 0 ]; then
        log_warn "Restoring backups for failed installations..."
        for backup in "${BACKUP_FILES[@]}"; do
            if [ -f "$backup" ]; then
                mv "$backup" "${backup%.bak}" 2>/dev/null
                log_debug "Restored backup: ${backup%.bak}"
            fi
        done
    fi
    
    # Create installation summary
    {
        echo "==================================================="
        echo "Installation Summary - $(date '+%Y-%m-%d %H:%M:%S')"
        echo "==================================================="
        echo "Successfully installed packages:"
        for tool in "${!INSTALLATION_STATUS[@]}"; do
            if [ "${INSTALLATION_STATUS[$tool]}" = "success" ]; then
                echo "✓ $tool"
            fi
        done
        echo ""
        echo "Failed installations:"
        printf '%s\n' "${FAILED_INSTALLATIONS[@]:-None}"
        echo ""
        echo "Packages with vulnerabilities:"
        printf '%s\n' "${VULNERABLE_PACKAGES[@]:-None}"
        echo ""
        echo "Exit code: $exit_code"
        echo "==================================================="
    } >> "$SUMMARY_FILE"
    
    # Compress old logs
    compress_old_logs
    
    # Cleanup old logs
    cleanup_logs
    
    log_info "Cleanup completed with exit code: $exit_code"
    log_info "Log file: $LOG_FILE"
    log_info "Summary file: $SUMMARY_FILE"
    
    if [ $exit_code -ne 0 ]; then
        log_warn "Cleanup encountered a non-zero exit code ($exit_code) – exiting with 0."
    fi
    exit 0
}

error_handler() {
    local line_no=$1
    local error_code=$2
    log_debug "Non-zero exit code (or error) occurred in script at line $line_no (Error code: $error_code) – continuing (cleanup not called)."
    return
}

check_vulnerabilities() {
    local tool=$1
    log_info "Checking vulnerabilities for $tool..."
    
    case $tool in
        node)
            if command_exists npm; then
                log_debug "Running npm audit..."
                if ! npm audit &>/dev/null; then
                    log_warn "Vulnerabilities found in npm packages, attempting to fix..."
                    if npm audit fix &>/dev/null; then
                        log_info "Fixed npm vulnerabilities"
                    else
                        log_warn "Could not automatically fix npm vulnerabilities"
                        VULNERABLE_PACKAGES+=("npm")
                    fi
                fi
            fi
            ;;
        python3)
            if command_exists pipx; then
                log_debug "Checking pip packages using pipx..."
                # Use pipx-managed pip for checks
                if ! pipx list | grep -q "package pip"; then
                    log_warn "pip not installed via pipx"
                    VULNERABLE_PACKAGES+=("pip")
                else
                    local pip_version
                    pip_version=$(pipx list | grep "package pip" | awk '{print $3}' | tr -d '[:space:]')
                    local required_pip_version="25.1.1"
                    # Use version_compare to check if pip_version < required_pip_version
                    if version_compare "$required_pip_version" "$pip_version"; then
                        log_warn "pip version $pip_version needs to be updated to $required_pip_version"
                        VULNERABLE_PACKAGES+=("pip")
                    else
                        log_info "pip is at the latest version ($pip_version)"
                    fi
                fi
                
                # Install safety if not present
                if ! command_exists safety; then
                    pipx install safety &>/dev/null || true
                fi
                
                # Run safety check but don't fail if vulnerabilities are found
                if safety check &>/dev/null; then
                    log_info "No known vulnerabilities in Python packages"
                else
                    log_warn "Vulnerabilities found in Python packages"
                    VULNERABLE_PACKAGES+=("pip")
                fi
            else
                log_warn "pipx not found, skipping pip vulnerability check"
                VULNERABLE_PACKAGES+=("pip")
            fi
            ;;
        go)
            if command_exists go; then
                # Only run govulncheck if go.mod exists
                if [ -f "go.mod" ] || find . -name go.mod | grep -q .; then
                    log_debug "Running govulncheck..."
                    # Install govulncheck if not present
                    if ! command_exists govulncheck; then
                        go install golang.org/x/vuln/cmd/govulncheck@latest &>/dev/null || true
                    fi
                    # Run vulnerability check but don't fail if vulnerabilities are found
                    if govulncheck ./... &>/dev/null; then
                        log_info "No known vulnerabilities in Go packages"
                    else
                        log_warn "Vulnerabilities found in Go packages"
                        VULNERABLE_PACKAGES+=("go")
                    fi
                else
                    log_info "No go.mod found, skipping Go vulnerability check."
                fi
            fi
            ;;
        rustc)
            if command_exists cargo; then
                # Only run cargo audit if Cargo.lock exists
                if [ -f "Cargo.lock" ] || find . -name Cargo.lock | grep -q .; then
                    log_debug "Running cargo audit..."
                    # Install cargo-audit if not present
                    if ! cargo audit --version &>/dev/null; then
                        cargo install cargo-audit &>/dev/null || true
                    fi
                    # Run audit but don't fail if vulnerabilities are found
                    if cargo audit &>/dev/null; then
                        log_info "No known vulnerabilities in Rust packages"
                    else
                        log_warn "Vulnerabilities found in Rust packages"
                        VULNERABLE_PACKAGES+=("cargo")
                    fi
                else
                    log_info "No Cargo.lock found, skipping Rust vulnerability check."
                fi
            fi
            ;;
        docker)
            if command_exists docker; then
                log_debug "Checking Docker images..."
                if ! docker scan --version &>/dev/null; then
                    log_warn "Docker scan not available, skipping vulnerability check"
                else
                    while read -r image; do
                        if [ -n "$image" ]; then
                            if ! docker scan "$image" &>/dev/null; then
                                log_warn "Vulnerabilities found in Docker image: $image"
                                VULNERABLE_PACKAGES+=("docker:$image")
                            fi
                        fi
                    done < <(docker images --format "{{.Repository}}:{{.Tag}}" 2>/dev/null || true)
                fi
            fi
            ;;
    esac
    
    # Don't fail the script due to vulnerabilities
    return 0
}

show_spinner() {
    local pid=$1
    local message=$2
    local i=0
    
    while kill -0 $pid 2>/dev/null; do
        i=$(( (i + 1) % ${#SPINNER} ))
        printf "\r${BLUE}${message}... ${SPINNER:$i:1}${NC}"
        sleep 0.1
    done
    printf "\r"
}

backup_config() {
    local file=$1
    if [ -f "$file" ]; then
        local backup="${file}.bak"
        cp "$file" "$backup"
        BACKUP_FILES+=("$backup")
    fi
}

check_network() {
    if ! ping -c 1 google.com >/dev/null 2>&1; then
        echo -e "${RED}Error: No internet connection available${NC}"
        return 1
    fi
    return 0
}

version_compare() {
    local v1=$1
    local v2=$2
    
    # Remove leading 'v' if present
    v1=${v1#v}
    v2=${v2#v}
    
    # Handle special version formats
    if [[ $v1 =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)(-[a-zA-Z0-9.]+)?$ ]]; then
        v1="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.${BASH_REMATCH[3]}"
    fi
    if [[ $v2 =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)(-[a-zA-Z0-9.]+)?$ ]]; then
        v2="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.${BASH_REMATCH[3]}"
    fi
    
    if [ "$(printf '%s\n' "$v1" "$v2" | sort -V | head -n1)" != "$v1" ]; then
        return 0
    else
        return 1
    fi
}

version_gt() {
    test "$(printf '%s\n' "$@" | sort -V | head -n 1)" != "$1"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_status() {
    local status=$1
    local message=$2
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}✓ $message${NC}"
    else
        echo -e "${RED}✗ $message${NC}"
    fi
}

# Update check_installed_version function to be more robust
check_installed_version() {
    local tool=$1
    local version_cmd=$2
    local version_pattern=$3
    
    if ! command_exists "$tool"; then
        log_debug "$tool is not installed"
        return 1
    fi
    
    local version
    version=$(eval "$version_cmd" 2>/dev/null | eval "$version_pattern" || echo "unknown")
    version=${version#v}
    
    if [ "$version" = "unknown" ] || [ -z "$version" ]; then
        log_debug "Could not determine version for $tool"
        return 1
    fi
    
    # Compare with required version
    if version_compare "${REQUIRED_VERSIONS[$tool]}" "$version"; then
        log_debug "$tool version $version is lower than required version ${REQUIRED_VERSIONS[$tool]}"
        return 1
    else
        log_debug "$tool version $version meets or exceeds required version ${REQUIRED_VERSIONS[$tool]}"
        return 0
    fi
}

# Add new function to check if extension is already installed
check_extension_installed() {
    local extension_id=$1
    local ext_dir="$HOME/Library/Application Support/Cursor/extensions/$extension_id"
    
    if [ -d "$ext_dir" ] && [ -f "$ext_dir/package.json" ]; then
        local version=$(jq -r '.version' "$ext_dir/package.json" 2>/dev/null || echo "unknown")
        log_debug "Extension $extension_id is already installed (version: $version)"
        return 0
    fi
    return 1
}

# Add function to ensure jq is installed
ensure_jq_installed() {
    if ! command_exists jq; then
        log_info "Installing jq..."
        if ! brew install jq; then
            log_error "Failed to install jq. Extension version checking will be limited."
            return 1
        fi
    fi
    return 0
}

# Update check_extension_version to handle missing jq
check_extension_version() {
    local extension_id=$1
    local ext_dir="$HOME/Library/Application Support/Cursor/extensions/$extension_id"
    local current_version="unknown"
    
    if [ -f "$ext_dir/package.json" ]; then
        if command_exists jq; then
            current_version=$(jq -r '.version' "$ext_dir/package.json" 2>/dev/null || echo "unknown")
        else
            # Fallback to grep if jq is not available
            current_version=$(grep -m1 '"version"' "$ext_dir/package.json" | cut -d'"' -f4 || echo "unknown")
        fi
        
        if [ "$current_version" != "unknown" ]; then
            # Get latest version from marketplace
            local latest_version
            if command_exists jq; then
                latest_version=$(curl -s "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${extension_id%%.*}/vsextensions/${extension_id#*.}/latest/vspackage" \
                    -H "Accept: application/json;api-version=3.0-preview.1" \
                    -H "User-Agent: Mozilla/5.0" \
                    | jq -r '.version' 2>/dev/null)
            else
                latest_version=$(curl -s "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${extension_id%%.*}/vsextensions/${extension_id#*.}/latest/vspackage" \
                    -H "Accept: application/json;api-version=3.0-preview.1" \
                    -H "User-Agent: Mozilla/5.0" \
                    | grep -m1 '"version"' | cut -d'"' -f4 || echo "unknown")
            fi
            
            if [ "$latest_version" != "null" ] && [ -n "$latest_version" ] && [ "$latest_version" != "unknown" ]; then
                if version_compare "$latest_version" "$current_version"; then
                    log_debug "Extension $extension_id has update available (current: $current_version, latest: $latest_version)"
                    return 1  # Needs update
                else
                    log_debug "Extension $extension_id is up to date (version: $current_version)"
                    return 0  # Up to date
                fi
            fi
        fi
    fi
    return 2  # Not installed
}

# Update install_cursor_extensions to ensure jq is installed
install_cursor_extensions() {
    log_info "Checking Cursor extensions..."
    
    # First check Cursor status
    if ! check_cursor_status; then
        log_error "Cannot proceed with extension installation - Cursor IDE is not ready"
        return 1
    fi
    
    # Ensure jq is installed
    ensure_jq_installed
    
    # Setup extension directory
    if ! setup_cursor_extension_dir; then
        log_error "Failed to setup Cursor extensions directory"
        return 1
    fi
    
    CURSOR_EXTENSION_DIR="$HOME/Library/Application Support/Cursor/extensions"
    local failed_extensions=()
    local skipped_extensions=()
    local installed_extensions=()
    local updated_extensions=()
    
    # Check each extension
    for extension in "${CURSOR_EXTENSIONS[@]}"; do
        local status
        check_extension_version "$extension"
        status=$?
        
        case $status in
            0)  # Up to date
                local version=$(jq -r '.version' "$CURSOR_EXTENSION_DIR/$extension/package.json" 2>/dev/null || echo "unknown")
                log_info "✓ Extension $extension is up to date (version: $version)"
                skipped_extensions+=("$extension")
                ;;
            1)  # Needs update
                log_info "Updating extension $extension..."
                if download_extension "$extension" "latest" "$CURSOR_EXTENSION_DIR"; then
                    local version=$(jq -r '.version' "$CURSOR_EXTENSION_DIR/$extension/package.json" 2>/dev/null || echo "unknown")
                    log_info "✓ Extension $extension updated successfully (version: $version)"
                    updated_extensions+=("$extension")
                else
                    log_error "Failed to update extension $extension"
                    failed_extensions+=("$extension")
                fi
                ;;
            2)  # Not installed
                log_info "Installing extension $extension..."
                if download_extension "$extension" "latest" "$CURSOR_EXTENSION_DIR"; then
                    local version=$(jq -r '.version' "$CURSOR_EXTENSION_DIR/$extension/package.json" 2>/dev/null || echo "unknown")
                    log_info "✓ Extension $extension installed successfully (version: $version)"
                    installed_extensions+=("$extension")
                else
                    log_error "Failed to install extension $extension"
                    failed_extensions+=("$extension")
                fi
                ;;
        esac
    done
    
    # Log summary
    if [ ${#skipped_extensions[@]} -gt 0 ]; then
        log_info "Skipped up-to-date extensions:"
        printf '%s\n' "${skipped_extensions[@]}" | tee -a "$LOG_FILE"
    fi
    
    if [ ${#updated_extensions[@]} -gt 0 ]; then
        log_info "Updated extensions:"
        printf '%s\n' "${updated_extensions[@]}" | tee -a "$LOG_FILE"
    fi
    
    if [ ${#installed_extensions[@]} -gt 0 ]; then
        log_info "Newly installed extensions:"
        printf '%s\n' "${installed_extensions[@]}" | tee -a "$LOG_FILE"
    fi
    
    if [ ${#failed_extensions[@]} -gt 0 ]; then
        log_warn "Failed to install/update the following extensions:"
        printf '%s\n' "${failed_extensions[@]}" | tee -a "$LOG_FILE"
        log_info "Please try installing these extensions manually through the Cursor IDE"
    fi
    
    # Only restart Cursor if we actually installed or updated extensions
    if [ ${#installed_extensions[@]} -gt 0 ] || [ ${#updated_extensions[@]} -gt 0 ]; then
        log_info "Restarting Cursor IDE to load new/updated extensions..."
        pkill -x "Cursor" || true
        sleep 2
        open -a Cursor
    else
        log_info "No new or updated extensions, skipping Cursor restart"
    fi
    
    return $([ ${#failed_extensions[@]} -eq 0 ])
}

# Update verify_cursor_extensions function
verify_cursor_extensions() {
    log_info "Verifying Cursor extensions..."
    local errors=0
    CURSOR_EXTENSION_DIR="$HOME/Library/Application Support/Cursor/extensions"
    
    # First check if Cursor is installed and running
    if ! check_cursor_status; then
        log_error "Cannot verify extensions - Cursor IDE is not ready"
        return 1
    fi
    
    # Check extension directory
    if ! setup_cursor_extension_dir; then
        log_error "Cannot verify extensions - extension directory is not accessible"
        return 1
    fi
    
    # Verify each extension
    for extension in "${CURSOR_EXTENSIONS[@]}"; do
        if [ -d "$CURSOR_EXTENSION_DIR/$extension" ]; then
            # Check if extension is properly installed
            if [ -f "$CURSOR_EXTENSION_DIR/$extension/package.json" ]; then
                log_info "✓ Extension $extension installed and verified"
            else
                log_error "Extension $extension is not properly installed"
                ((errors++))
            fi
        else
            log_error "Extension $extension not installed"
            ((errors++))
        fi
    done
    
    return $errors
}

setup_git_hooks() {
    echo "Setting up Git hooks..."
    
    # Create pre-commit hook if it doesn't exist
    if [ ! -f .git/hooks/pre-commit ]; then
        mkdir -p .git/hooks
        backup_config ".git/hooks/pre-commit"
        
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Run formatters
echo "Running code formatters..."
gofmt -w .
prettier --write "**/*.{js,jsx,ts,tsx,json,md}"

# Run linters
echo "Running linters..."
golangci-lint run
eslint .

# Run tests
echo "Running tests..."
go test ./...
npm test

# Run security checks
echo "Running security checks..."
gosec ./...
npm audit
EOF
        chmod +x .git/hooks/pre-commit
        echo -e "${GREEN}✓ Git hooks installed${NC}"
    else
        echo -e "${GREEN}✓ Git hooks already set up${NC}"
    fi
}

# Verification functions
verify_tool() {
    local tool=$1
    local version_cmd=$2
    local version_pattern=$3
    
    if ! command_exists "$tool"; then
        echo -e "${RED}✗ $tool not installed${NC}"
        return 1
    fi
    
    local version
    version=$(eval "$version_cmd" 2>/dev/null | eval "$version_pattern" || echo "unknown")
    
    # Remove any 'v' prefix from version strings
    version=${version#v}
    local required_version=${REQUIRED_VERSIONS[$tool]}
    
    if [ "$version" = "unknown" ] || [ -z "$version" ]; then
        echo -e "${RED}✗ Could not determine $tool version${NC}"
        return 1
    fi
    
    if version_compare "$required_version" "$version"; then
        echo -e "${RED}✗ $tool version $version is lower than required version $required_version${NC}"
        return 1
    else
        echo -e "${GREEN}✓ $tool version $version installed (required: $required_version)${NC}"
        return 0
    fi
}

# Add function to verify Docker Desktop specifically
verify_docker_desktop() {
    if [[ "$(uname -s)" == "Darwin" ]]; then
        if ! open -Ra Docker >/dev/null 2>&1; then
            log_error "Docker Desktop is not installed. Please install Docker Desktop for Mac."
            return 1
        fi
        
        # Check if Docker Desktop is running
        if ! docker info >/dev/null 2>&1; then
            log_error "Docker Desktop is not running. Please start Docker Desktop."
            return 1
        fi
        
        # Verify it's not just the CLI
        if ! docker version --format '{{.Server.Version}}' >/dev/null 2>&1; then
            log_error "Docker Desktop daemon is not running. Please ensure Docker Desktop is fully started."
            return 1
        fi
    fi
    return 0
}

# Add function to verify Node.js LTS
verify_node_lts() {
    if command_exists node; then
        local version
        version=$(node -v | cut -d 'v' -f2)
        local major=$(echo $version | cut -d '.' -f1)
        local minor=$(echo $version | cut -d '.' -f2)
        
        # Check if it's an LTS version (even major numbers are LTS)
        if [ $((major % 2)) -ne 0 ]; then
            log_warn "Node.js version $version is not an LTS version. (An LTS version is recommended.)"
            return 0
        fi
        
        # Verify minimum version
        if version_compare "20.11.0" "$version"; then
            log_error "Node.js version $version is lower than required LTS version 20.11.0"
            return 1
        fi
    fi
    return 0
}

# Update verify_installations function to include new checks
verify_installations() {
    local errors=0
    echo -e "\nVerifying installations..."
    
    # Define version commands and patterns for each tool
    local -A verification_results
    
    # Run verifications in parallel
    {
        verify_docker_desktop
        verification_results[docker]=$?
    } &
    {
        verify_node_lts
        verification_results[node]=$?
    } &
    {
        verify_tool "go" "go version" "cut -d ' ' -f3 | cut -d 'o' -f2"
        verification_results[go]=$?
    } &
    {
        verify_tool "rustc" "rustc --version" "cut -d ' ' -f2"
        verification_results[rustc]=$?
    } &
    {
        verify_tool "python3" "python3 --version" "cut -d ' ' -f2"
        verification_results[python3]=$?
    } &
    {
        verify_tool "kubectl" "kubectl version --client --output=json" "jq -r '.clientVersion.gitVersion' | cut -d 'v' -f2"
        verification_results[kubectl]=$?
    } &
    {
        verify_tool "helm" "helm version --short" "cut -d '+' -f1 | cut -d 'v' -f2"
        verification_results[helm]=$?
    } &
    
    # Wait for all verifications to complete
    wait
    
    # Count errors
    for result in "${verification_results[@]}"; do
        ((errors += result))
    done
    
    return $errors
}

# Add back the missing functions
check_cursor_status() {
    if ! command_exists cursor; then
        log_error "Cursor IDE is not installed"
        return 1
    fi
    
    # Check if Cursor is running
    if ! pgrep -x "Cursor" > /dev/null; then
        log_info "Starting Cursor IDE..."
        open -a Cursor
        # Wait for Cursor to initialize
        sleep 10
    fi
    
    # Verify Cursor is accessible
    if ! cursor --version &>/dev/null; then
        log_error "Cursor IDE is not responding"
        return 1
    fi
    
    return 0
}

install_python() {
    log_info "Installing Python..."
    if ! check_network; then
        log_error "Cannot install Python - no internet connection"
        FAILED_INSTALLATIONS+=("python")
        return 1
    fi
    
    brew install python@3.11 &
    local pid=$!
    show_spinner $pid "Installing Python"
    wait $pid
    
    if [ $? -eq 0 ]; then
        log_info "✓ Python installed successfully"
        return 0
    else
        log_error "Failed to install Python"
        FAILED_INSTALLATIONS+=("python")
        return 1
    fi
}

install_rust() {
    log_info "Installing Rust..."
    if ! check_network; then
        log_error "Cannot install Rust - no internet connection"
        FAILED_INSTALLATIONS+=("rust")
        return 1
    fi
    
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y &
    local pid=$!
    show_spinner $pid "Installing Rust"
    wait $pid
    
    if [ $? -eq 0 ]; then
        # Source the cargo environment
        source "$HOME/.cargo/env"
        log_info "✓ Rust installed successfully"
        return 0
    else
        log_error "Failed to install Rust"
        FAILED_INSTALLATIONS+=("rust")
        return 1
    fi
}

# Add Homebrew update at the start
brew_update_if_needed() {
    log_info "Updating Homebrew..."
    brew update
}

# Ensure Docker is running (macOS)
ensure_docker_running() {
    if ! docker info >/dev/null 2>&1; then
        log_info "Docker is not running. Attempting to start Docker Desktop..."
        open -a Docker
        # Wait for Docker to start (max 60s)
        for i in {1..30}; do
            sleep 2
            if docker info >/dev/null 2>&1; then
                log_info "Docker started successfully."
                return 0
            fi
        done
        log_error "Docker did not start within expected time. Please start Docker Desktop manually."
        return 1
    else
        log_info "Docker is already running."
    fi
}

# Improved Docker upgrade logic for macOS
upgrade_brew_tool() {
    local tool=$1
    if [ "$tool" = "docker" ]; then
        ensure_docker_running
        if [[ "$(uname -s)" == "Darwin" ]]; then
            # Check if Docker Desktop is installed
            if open -Ra Docker; then
                # Check if Homebrew manages the cask
                if brew list --cask | grep -q '^docker$'; then
                    log_info "Upgrading Docker Desktop via Homebrew cask..."
                    brew upgrade --cask docker || true
                else
                    log_info "Docker Desktop is installed but not managed by Homebrew. Skipping Homebrew upgrade. Please update Docker Desktop manually if needed."
                fi
                return
            else
                log_warn "Docker Desktop is not installed. You can install it via Homebrew: brew install --cask docker"
                return
            fi
        else
            log_info "Upgrading docker via Homebrew formula if needed..."
            brew upgrade --formula docker || true
            return
        fi
    fi
    log_info "Upgrading $tool via Homebrew if needed..."
    brew upgrade $tool || true
}

# Add npm global update
upgrade_npm_packages() {
    if command_exists npm; then
        log_info "Upgrading global npm packages..."
        npm update -g || true
    fi
}

# Add pip global update
upgrade_pip_packages() {
    if command_exists pip3; then
        log_info "Upgrading global pip packages (user install)..."
        pip3 install --upgrade --user pip || true
        pip3 list --outdated --format=columns | awk 'NR>2 {print $1}' | xargs -n1 pip3 install --user -U || true
    fi
}

# Add cargo update
upgrade_cargo_packages() {
    if command_exists cargo; then
        log_info "Upgrading cargo packages..."
        if ! cargo install-update --version &>/dev/null; then
            log_info "cargo-install-update not found. Installing it..."
            cargo install cargo-update || {
                log_warn "Could not install cargo-update. Skipping cargo package upgrades."; return; }
        fi
        cargo install-update -a || true
    fi
}

# Update check_dependency_status to be more verbose
check_dependency_status() {
    local tool=$1
    local version_cmd=$2
    local version_pattern=$3
    
    # First check if tool exists
    if ! command_exists "$tool"; then
        log_info "$tool is not installed"
        return 2  # Not installed
    fi
    
    # Get current version
    local current_version
    current_version=$(eval "$version_cmd" 2>/dev/null | eval "$version_pattern" || echo "unknown")
    current_version=${current_version#v}  # Remove 'v' prefix if present
    
    if [ "$current_version" = "unknown" ] || [ -z "$current_version" ]; then
        log_warn "Could not determine version for $tool - it may not be properly installed"
        return 2  # Not installed properly
    fi
    
    # Compare with required version
    if version_compare "${REQUIRED_VERSIONS[$tool]}" "$current_version"; then
        log_info "$tool version $current_version is lower than required version ${REQUIRED_VERSIONS[$tool]}"
        return 1  # Needs update
    else
        log_info "$tool version $current_version meets or exceeds required version ${REQUIRED_VERSIONS[$tool]}"
        return 0  # Up to date
    fi
}

# Setup Cursor extension directory
setup_cursor_extension_dir() {
    local ext_dir="$HOME/Library/Application Support/Cursor/extensions"
    
    # Create directory if it doesn't exist
    if [ ! -d "$ext_dir" ]; then
        log_info "Creating Cursor extensions directory..."
        mkdir -p "$ext_dir" || {
            log_error "Failed to create Cursor extensions directory"
            return 1
        }
    fi
    
    # Ensure directory is writable
    if [ ! -w "$ext_dir" ]; then
        log_error "Cursor extensions directory is not writable"
        return 1
    fi
    
    log_info "Cursor extensions directory is ready"
    return 0
}

# Update Docker installation check
install_docker() {
    log_info "Checking Docker installation..."
    
    # Check if Docker is installed via cask
    if ! brew list --cask docker &>/dev/null; then
        log_info "Installing Docker Desktop..."
        if ! brew install --cask docker; then
            log_error "Failed to install Docker Desktop"
            return 1
        fi
    fi
    
    # Start Docker if not running
    if ! docker info &>/dev/null; then
        log_info "Docker is not running. Attempting to start Docker Desktop..."
        open -a Docker || {
            log_error "Failed to start Docker Desktop"
            return 1
        }
        
        # Wait for Docker to start
        local attempts=0
        while ! docker info &>/dev/null && [ $attempts -lt 30 ]; do
            sleep 1
            ((attempts++))
        done
        
        if [ $attempts -eq 30 ]; then
            log_error "Docker failed to start within 30 seconds"
            return 1
        fi
        
        log_info "Docker started successfully"
    fi
    
    return 0
}

# Update main function to handle errors better
main() {
    # Set up error handling
    trap 'error_handler ${LINENO} $?' ERR
    trap cleanup EXIT
    
    log_info "Starting development tools verification and update..."
    log_info "Log file: $LOG_FILE"
    
    # Log system information
    log_debug "System information:"
    log_debug "OS: $(uname -s)"
    log_debug "Kernel: $(uname -r)"
    log_debug "Architecture: $(uname -m)"
    log_debug "Memory: $(vm_stat | grep 'Pages free:' | awk '{print $3}') pages free"
    
    # Check network connectivity
    if ! check_network; then
        log_error "No internet connection available. Please check your network and try again."
        exit 1
    fi
    
    # Create arrays for tools that need installation and those that are already installed
    local -a tools_to_install=()
    local -a tools_installed=()
    local -a tools_to_update=()
    local -a tools_failed=()
    
    # Check all tools first
    log_info "Checking tool installation status..."
    for tool in "${!REQUIRED_VERSIONS[@]}"; do
        case $tool in
            docker) version_cmd="docker --version" version_pattern="cut -d ' ' -f3 | cut -d ',' -f1" ;;
            node) version_cmd="node -v" version_pattern="cut -d 'v' -f2" ;;
            go) version_cmd="go version" version_pattern="cut -d ' ' -f3 | cut -d 'o' -f2" ;;
            rustc) version_cmd="rustc --version" version_pattern="cut -d ' ' -f2" ;;
            python3) version_cmd="python3 --version" version_pattern="cut -d ' ' -f2" ;;
            kubectl) version_cmd="kubectl version --client --output=json" version_pattern="jq -r '.clientVersion.gitVersion' | cut -d 'v' -f2" ;;
            helm) version_cmd="helm version --short" version_pattern="cut -d '+' -f1 | cut -d 'v' -f2" ;;
            *) continue ;;
        esac
        
        # Check dependency status
        if ! check_dependency_status "$tool" "$version_cmd" "$version_pattern"; then
            case $? in
                1)  # Needs update
                    tools_to_update+=("$tool")
                    log_info "! $tool needs to be updated"
                    ;;
                2)  # Not installed
                    tools_to_install+=("$tool")
                    log_info "- $tool needs to be installed"
                    ;;
                *)  # Unknown error
                    tools_failed+=("$tool")
                    log_error "Failed to check status for $tool"
                    ;;
            esac
        else
            tools_installed+=("$tool")
            local version
            version=$(eval "$version_cmd" 2>/dev/null | eval "$version_pattern" || echo "unknown")
            version=${version#v}
            log_info "✓ $tool already installed with version $version (required: ${REQUIRED_VERSIONS[$tool]})"
        fi
    done
    
    # Report status
    log_info "=== Tool Status ==="
    if [ ${#tools_installed[@]} -gt 0 ]; then
        log_info "Already installed and up to date:"
        printf '  - %s\n' "${tools_installed[@]}"
    fi
    
    if [ ${#tools_to_install[@]} -gt 0 ]; then
        log_info "Need to be installed:"
        printf '  - %s\n' "${tools_to_install[@]}"
    fi
    
    if [ ${#tools_to_update[@]} -gt 0 ]; then
        log_info "Need to be updated:"
        printf '  - %s\n' "${tools_to_update[@]}"
    fi
    
    if [ ${#tools_failed[@]} -gt 0 ]; then
        log_warn "Failed to check status:"
        printf '  - %s\n' "${tools_failed[@]}"
    fi
    
    # Only proceed with installations if needed
    if [ ${#tools_to_install[@]} -eq 0 ] && [ ${#tools_to_update[@]} -eq 0 ]; then
        if [ ${#tools_failed[@]} -eq 0 ]; then
            log_info "All required tools are already installed and up to date!"
            log_info "Running vulnerability checks on installed tools..."
            
            # Check vulnerabilities for installed tools
            for tool in "${tools_installed[@]}"; do
                check_vulnerabilities "$tool"
            done
            
            # Set up Git hooks if not already set up
            if [ ! -f .git/hooks/pre-commit ]; then
                setup_git_hooks
            fi
            
            # Final verification
            verify_installations
            exit $?
        else
            log_error "Some tools failed status check. Please review the errors above."
            exit 1
        fi
    fi
    
    # Install missing tools first
    if [ ${#tools_to_install[@]} -gt 0 ]; then
        log_info "Installing missing tools..."
        for tool in "${tools_to_install[@]}"; do
            log_info "Installing $tool..."
            case $tool in
                docker) install_docker ;;
                node) install_node ;;
                go) install_go ;;
                rust) install_rust ;;
                python) install_python ;;
                kubectl) install_kubectl ;;
                helm) install_helm ;;
                *) 
                    log_error "Unknown tool: $tool"
                    FAILED_INSTALLATIONS+=("$tool")
                    continue
                    ;;
            esac
            if [ $? -eq 0 ]; then
                log_info "✓ Successfully installed $tool"
            else
                log_error "Failed to install $tool"
                FAILED_INSTALLATIONS+=("$tool")
            fi
        done
    fi
    
    # Update tools that need updating
    if [ ${#tools_to_update[@]} -gt 0 ]; then
        log_info "Updating tools..."
        for tool in "${tools_to_update[@]}"; do
            log_info "Updating $tool..."
            case $tool in
                docker) install_docker ;;
                node) install_node ;;
                go) install_go ;;
                rust) install_rust ;;
                python) install_python ;;
                kubectl) install_kubectl ;;
                helm) install_helm ;;
                *) 
                    log_error "Unknown tool: $tool"
                    FAILED_INSTALLATIONS+=("$tool")
                    continue
                    ;;
            esac
            if [ $? -eq 0 ]; then
                log_info "✓ Successfully updated $tool"
            else
                log_error "Failed to update $tool"
                FAILED_INSTALLATIONS+=("$tool")
            fi
        done
    fi
    
    # Final status report
    log_info "=== Installation Summary ==="
    if [ ${#FAILED_INSTALLATIONS[@]} -gt 0 ]; then
        log_warn "Failed installations/updates:"
        printf '  - %s\n' "${FAILED_INSTALLATIONS[@]}"
        exit 1
    else
        log_info "All tools successfully installed/updated!"
        exit 0
    fi
}

# Add help function to show log-related commands
show_log_help() {
    echo "Log management commands:"
    echo "  view    - View the latest log file"
    echo "  clean   - Clean up old log files"
    echo "  summary - Show installation summary"
}

# Handle log-related commands
case "${1:-}" in
    --view-logs)
        view_logs
        exit 0
        ;;
    --clean-logs)
        cleanup_logs
        echo "Logs cleaned up"
        exit 0
        ;;
    --show-summary)
        if [ -f "$SUMMARY_FILE" ]; then
            cat "$SUMMARY_FILE"
        else
            echo "No summary file found"
        fi
        exit 0
        ;;
    --help)
        show_log_help
        exit 0
        ;;
esac

# Execute main function if no special commands
main 