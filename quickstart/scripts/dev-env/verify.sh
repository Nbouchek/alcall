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
NC='\033[0m'

# Setup logging
LOG_DIR="$PROJECT_ROOT/logs/dev-env"
LOG_FILE="$LOG_DIR/dev_env_verify_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

REPORT_PATH="$SCRIPT_DIR/verify_report.txt"
REPORT_STATUS=0

# Function to check if a Makefile target exists and run it
check_make_target() {
    local dir=$1
    local target=$2
    if [ ! -f "$dir/Makefile" ]; then
        log "ERROR" "No Makefile found in $dir"
        handle_error "No Makefile found in $dir"
    fi
    if ! grep -qE "^$target:|^$target " "$dir/Makefile"; then
        log "ERROR" "Makefile target '$target' missing in $dir"
        handle_error "Makefile target '$target' missing in $dir"
    fi
    log "INFO" "Running make $target in $dir..."
    if ! make -C "$dir" "$target"; then
        log "ERROR" "make $target failed in $dir"
        handle_error "make $target failed in $dir"
    fi
}

generate_console_summary() {
    echo -e "\n\033[1;34m==== Development Environment Verification Summary ====\033[0m"
    if grep -q '\[ERROR\]' "$LOG_FILE"; then
        echo -e "\033[0;31mErrors:\033[0m"
        grep '\[ERROR\]' "$LOG_FILE"
    else
        echo -e "\033[0;32mNo errors found.\033[0m"
    fi
    if grep -q '\[WARN\]' "$LOG_FILE"; then
        echo -e "\033[1;33mWarnings:\033[0m"
        grep '\[WARN\]' "$LOG_FILE"
    else
        echo -e "\033[0;32mNo warnings found.\033[0m"
    fi
    echo -e "\nFull log: $LOG_FILE"
    echo -e "Verification completed at $(date)"
}

generate_report() {
    echo "Development Environment Verification Report" > "$REPORT_PATH"
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

log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log "INFO" "Starting development environment verification"
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

# Function to check version
check_version() {
    local tool=$1
    local min_version=$2
    local version

    case $tool in
        go)
            version=$(go version | awk '{print $3}' | sed 's/go//')
            ;;
        docker)
            if ! command_exists "$tool"; then
                handle_error "$tool is not installed"
            fi
            version=$($tool --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
            ;;
        node)
            if ! command_exists "$tool"; then
                handle_error "$tool is not installed"
            fi
            version=$($tool --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
            ;;
        rustc)
            if ! command_exists "$tool"; then
                handle_error "$tool is not installed"
            fi
            version=$($tool --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
            ;;
        kubectl)
            if ! command_exists "$tool"; then
                handle_error "$tool is not installed"
            fi
            version=$($tool version --client | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
            ;;
        helm)
            if ! command_exists "$tool"; then
                handle_error "$tool is not installed"
            fi
            version=$($tool version --client | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
            ;;
    esac

    if [ -z "$version" ]; then
        log "ERROR" "$tool version could not be determined"
        return 1
    fi

    # Compare versions using sort -V for proper semantic version comparison
    if ! printf "%s\n%s" "$min_version" "$version" | sort -V | head -n1 | grep -q "^$min_version$"; then
        log "ERROR" "$tool version $version is below minimum required version $min_version"
        return 1
    fi

    log "INFO" "$tool version $version is compatible"
    return 0
}

# Required tool versions from README
REQUIRED_TOOLS="
docker:4.36.0
node:22.0.0
go:1.23.0
rustc:1.84.0
kubectl:1.31.0
helm:3.16.0
"

# Check system requirements
log "INFO" "Checking system requirements..."

# Check CPU cores
CPU_CORES=$(sysctl -n hw.ncpu)
if [ "$CPU_CORES" -lt 2 ]; then
    handle_error "Insufficient CPU cores: $CPU_CORES (minimum: 2)"
fi
log "INFO" "CPU cores: $CPU_CORES"

# Check RAM
TOTAL_RAM=$(sysctl -n hw.memsize | awk '{print $0/1024/1024/1024}')
if (( $(echo "$TOTAL_RAM < 8" | bc -l) )); then
    handle_error "Insufficient RAM: ${TOTAL_RAM}GB (minimum: 8GB)"
fi
log "INFO" "Total RAM: ${TOTAL_RAM}GB"

# Check storage
# Use 'df -k /' and parse available storage in GB
TOTAL_STORAGE_KB=$(df -k / | awk 'NR==2 {print $2}')
TOTAL_STORAGE_GB=$((TOTAL_STORAGE_KB / 1024 / 1024))
if [ "$TOTAL_STORAGE_GB" -lt 50 ]; then
    handle_error "Insufficient storage: ${TOTAL_STORAGE_GB}GB (minimum: 50GB)"
fi
log "INFO" "Total storage: ${TOTAL_STORAGE_GB}GB"

# Check network
# Use 'networkQuality' without '-I' and parse Download value, or skip with a warning if not available
if command_exists networkQuality; then
    NETWORK_SPEED=$(networkQuality 2>/dev/null | grep "Download" | awk '{print $2}')
    if [ -z "$NETWORK_SPEED" ]; then
        log "WARN" "Could not determine network speed. Skipping check."
    elif (( $(echo "$NETWORK_SPEED < 100" | bc -l) )); then
        log "WARN" "Network speed may be insufficient: ${NETWORK_SPEED}Mbps (recommended: 100Mbps)"
    else
        log "INFO" "Network speed: ${NETWORK_SPEED}Mbps"
    fi
else
    log "WARN" "networkQuality tool not found. Skipping network speed check."
fi

# Check required tools
log "INFO" "Checking required tools..."
echo "$REQUIRED_TOOLS" | while IFS=: read -r tool min_version; do
    [ -z "$tool" ] && continue
    check_version "$tool" "$min_version"
done

# Check Python environment
log "INFO" "Checking Python environment..."
if ! command_exists conda; then
    handle_error "Conda is not installed"
fi

# Check conda environment
if ! conda env list | grep -q "^alcall "; then
    handle_error "Conda environment 'alcall' not found"
fi
log "INFO" "Conda environment 'alcall' exists"

# Check Python version
PYTHON_VERSION=$(conda run -n alcall python --version 2>&1 | awk '{print $2}')
if [ "$(printf '%s\n' "3.12.0" "$PYTHON_VERSION" | sort -V | head -n1)" != "3.12.0" ]; then
    handle_error "Python version $PYTHON_VERSION is below minimum required version 3.12.0"
fi
log "INFO" "Python version $PYTHON_VERSION is compatible"

# Check Docker Desktop (not just CLI)
log "INFO" "Checking Docker Desktop installation and status..."
DOCKER_DESKTOP_APP="/Applications/Docker.app"
if [ ! -d "$DOCKER_DESKTOP_APP" ]; then
    handle_error "Docker Desktop is not installed at $DOCKER_DESKTOP_APP"
fi
if ! pgrep -f "Docker Desktop" >/dev/null 2>&1; then
    log "WARN" "Docker Desktop is installed but not running. Attempting to start..."
    open -a Docker || handle_error "Failed to start Docker Desktop. Please start it manually."
    # Wait for Docker to start
    SECONDS=0
    TIMEOUT=60
    while ! docker system info >/dev/null 2>&1; do
        if [ $SECONDS -ge $TIMEOUT ]; then
            handle_error "Docker Desktop did not start within $TIMEOUT seconds."
        fi
        sleep 2
    done
    log "INFO" "Docker Desktop started successfully."
else
    log "INFO" "Docker Desktop is running."
fi

# Check Python packages from environment.yml
log "INFO" "Checking Python packages from environment.yml..."
ENV_YML="$PROJECT_ROOT/quickstart/config/environment.yml"
if [ ! -f "$ENV_YML" ]; then
    handle_error "environment.yml not found at $ENV_YML"
fi
log "INFO" "DEBUG: About to parse CONDA_DEPS and PIP_DEPS"
set +e
CONDA_DEPS=$(awk '/dependencies:/,0' "$ENV_YML" | grep -v 'pip:' | grep -v 'dependencies:' | sed 's/^ *- *//' | grep -v '^$')
log "INFO" "DEBUG: CONDA_DEPS='$CONDA_DEPS'"
PIP_DEPS=$(awk '/pip:/,0' "$ENV_YML" | grep -v 'pip:' | sed 's/^- *//g' | grep -v '^$')
log "INFO" "DEBUG: PIP_DEPS='$PIP_DEPS'"
set -e
# Check conda dependencies
while read -r dep; do
    [ -z "$dep" ] && continue
    pkg=$(echo "$dep" | cut -d'=' -f1)
    [ "$pkg" = "python" ] && continue
    if ! conda run -n alcall python -c "import $pkg" 2>/dev/null && ! conda run -n alcall pip show "$pkg" >/dev/null 2>&1; then
        handle_error "Python package $pkg (from environment.yml) is not installed in 'alcall' environment"
    fi
    log "INFO" "Python package $pkg (from environment.yml) is installed"
done <<< "$CONDA_DEPS"
# Check pip dependencies if any
if [ -n "$PIP_DEPS" ]; then
    while read -r dep; do
        [ -z "$dep" ] && continue
        pkg=$(echo "$dep" | cut -d'=' -f1)
        if ! conda run -n alcall pip show "$pkg" >/dev/null 2>&1; then
            handle_error "Python pip package $pkg (from environment.yml) is not installed in 'alcall' environment"
        fi
        log "INFO" "Python pip package $pkg (from environment.yml) is installed"
    done <<< "$PIP_DEPS"
fi

log "INFO" "Finished Python package checks, continuing to IDE, git hooks, and SSL checks..."

# Check IDE settings
log "INFO" "Checking IDE settings..."
if [ ! -f ~/.cursor/settings/settings.json ]; then
    handle_error "IDE settings not found"
fi
log "INFO" "IDE settings exist"

# Check git hooks
log "INFO" "Checking git hooks..."
if [ ! -f .git/hooks/pre-commit ]; then
    handle_error "Git pre-commit hook not found"
fi
if [ ! -x .git/hooks/pre-commit ]; then
    handle_error "Git pre-commit hook is not executable"
fi
REQUIRED_HOOK_CMD="make precommit"
if ! grep -q "$REQUIRED_HOOK_CMD" .git/hooks/pre-commit; then
    handle_error "pre-commit hook does not call '$REQUIRED_HOOK_CMD'."
fi
log "INFO" "Git hooks are properly configured and pre-commit calls 'make precommit'"

# Check SSL certificates
log "INFO" "Checking SSL certificates..."
if [ ! -f ~/.unified-chat/certs/dev.key ] || [ ! -f ~/.unified-chat/certs/dev.crt ]; then
    handle_error "Development SSL certificates not found"
fi
if [ ! -f ~/.unified-chat/ca/ca.key ] || [ ! -f ~/.unified-chat/ca/ca.crt ]; then
    handle_error "CA certificates not found"
fi
log "INFO" "SSL certificates are properly configured"

# Check environment variables
log "INFO" "Checking environment variables..."
if [ ! -f .env ]; then
    log "WARN" ".env file not found. Please copy .env.example to .env and configure your environment variables"
else
    REQUIRED_VARS=(
        "CORE_SERVICE_PORT"
        "CORE_SERVICE_HOST"
        "DB_HOST"
        "DB_PORT"
        "DB_NAME"
        "REDIS_HOST"
        "REDIS_PORT"
        "JWT_SECRET"
    )
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^$var=" .env; then
            log "WARN" "Required environment variable $var not found in .env"
        fi
    done
fi

# --- Enhanced IDE verification ---

# Path to config file for required extensions and settings
CONFIG_FILE="$PROJECT_ROOT/quickstart/config/dev-env.yaml"

# Extract required extensions from config (IDs only)
REQUIRED_EXTENSIONS=(
  "ms-kubernetes-tools.vscode-kubernetes-tools"
  "golang.go"
  "dbaeumer.vscode-eslint"
  "esbenp.prettier-vscode"
)

# Check installed extensions
log "INFO" "Checking required VSCode/Cursor extensions..."
INSTALLED_EXTENSIONS=$(code --list-extensions 2>/dev/null || cursor --list-extensions 2>/dev/null)
MISSING_EXTENSIONS=()
for ext in "${REQUIRED_EXTENSIONS[@]}"; do
  if ! echo "$INSTALLED_EXTENSIONS" | grep -q "^$ext$"; then
    MISSING_EXTENSIONS+=("$ext")
  fi
  log "INFO" "Extension $ext: $(if echo "$INSTALLED_EXTENSIONS" | grep -q "^$ext$"; then echo 'installed'; else echo 'MISSING'; fi)"
done
if [ ${#MISSING_EXTENSIONS[@]} -eq 0 ]; then
  log "INFO" "All required extensions are installed."
else
  log "ERROR" "Missing extensions: ${MISSING_EXTENSIONS[*]}"
fi

# Check required settings in settings.json
SETTINGS_PATH="$HOME/.cursor/settings/settings.json"
REQUIRED_SETTINGS=(
  '.editor.formatOnSave:true'
  '.editor.codeActionsOnSave["source.fixAll"]:true'
)
log "INFO" "Checking required IDE settings in $SETTINGS_PATH..."
if [ ! -f "$SETTINGS_PATH" ]; then
  handle_error "IDE settings file $SETTINGS_PATH not found"
fi
MISSING_SETTINGS=()
for setting in "${REQUIRED_SETTINGS[@]}"; do
  JQ_FILTER="$(echo $setting | cut -d: -f1)"
  VALUE="$(echo $setting | cut -d: -f2)"
  # Handle boolean vs string values for jq
  if [ "$VALUE" = "true" ] || [ "$VALUE" = "false" ]; then
    JQ_VALUE=$VALUE
  else
    JQ_VALUE="\"$VALUE\""
  fi
  # Use jq to check the setting
  if ! jq -e "$JQ_FILTER == $JQ_VALUE" "$SETTINGS_PATH" >/dev/null 2>&1; then
    MISSING_SETTINGS+=("$JQ_FILTER")
    log "ERROR" "Missing or incorrect setting: $JQ_FILTER (should be $VALUE)"
  else
    log "INFO" "Setting $JQ_FILTER is correctly set to $VALUE"
  fi
done
if [ ${#MISSING_SETTINGS[@]} -eq 0 ]; then
  log "INFO" "All required IDE settings are present."
else
  log "ERROR" "Missing or incorrect IDE settings: ${MISSING_SETTINGS[*]}"
fi

# --- Code Quality and Security Checks ---

log "INFO" "Running code formatting check (make format)..."
SERVICES=(auth-service message-service user-service realtime-service payment-service ai-service gateway-service)
for svc in "${SERVICES[@]}"; do
    check_make_target "services/$svc" "format"
done
log "INFO" "Code formatting check passed."

log "INFO" "Running linting check (make lint)..."
for svc in "${SERVICES[@]}"; do
    check_make_target "services/$svc" "lint"
done
log "INFO" "Linting check passed."

log "INFO" "Running test execution (make test)..."
for svc in "${SERVICES[@]}"; do
    check_make_target "services/$svc" "test"
done
log "INFO" "All tests passed."

log "INFO" "Running security checks (make security)..."
if ! command_exists trivy; then
    log "ERROR" "Security tool 'trivy' is not installed"
    handle_error "Security tool 'trivy' is not installed"
else
    trivy fs . || handle_error "Security scan failed"
fi
log "INFO" "Security checks passed."

echo -e "${GREEN}Development environment verification completed successfully!${NC}"
log "INFO" "Development environment verification completed successfully"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run 'make install-deps' to install additional dependencies"
echo "2. Configure your environment variables in .env"
echo "3. Run 'make dev-up' to start development services"
echo "4. Run 'make test' to verify everything is working"

# Print summary to console at the end
trap generate_console_summary EXIT
