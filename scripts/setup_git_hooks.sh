#!/usr/bin/env bash

# Source the logging utility
source "$(dirname "$0")/logging_utils.sh"

# setup_git_hooks.sh
# Sets up a pre-commit git hook (using functions) for code formatting, linting, testing, and security checks.
# Supports Go, Node.js, and Python projects.
# Usage: ./scripts/setup_git_hooks.sh

set -euo pipefail

# Create logs directory (if it does not exist) so that log messages are saved (appended) into a log file (for example, “./logs/setup_git_hooks.log”).
mkdir -p logs

# Logging functions (using echo) for modular logging (and tee (append) into a log file).
log_info() { echo "[INFO] $*" | tee -a ./logs/setup_git_hooks.log; }
log_error() { echo "[ERROR] $*" | tee -a ./logs/setup_git_hooks.log >&2; }

# Function to generate (or overwrite) the pre-commit hook (at .git/hooks/pre-commit) and make it executable.
setup_pre_commit_hook() {
  local HOOK_FILE=".git/hooks/pre-commit"
  log_info "Generating (or overwriting) pre-commit hook at $HOOK_FILE ..."
  cat > "$HOOK_FILE" << 'EOF'
#!/usr/bin/env bash

RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

fail=0

step() {
  echo -e "${YELLOW}==> $1${NC}"
}
success() {
  echo -e "${GREEN}✓ $1${NC}"
}
fail_msg() {
  echo -e "${RED}✗ $1${NC}"
}

# Code formatting
step "Running code formatters..."
if command -v gofmt >/dev/null 2>&1; then
  gofmt -l -w . || fail=1
fi
if command -v prettier >/dev/null 2>&1; then
  prettier --write "**/*.{js,jsx,ts,tsx,json,md}" || fail=1
fi
if command -v black >/dev/null 2>&1; then
  black . || fail=1
fi

# Linting
step "Running linters..."
if command -v golangci-lint >/dev/null 2>&1; then
  golangci-lint run || fail=1
fi
if command -v eslint >/dev/null 2>&1; then
  eslint . || fail=1
fi
if command -v flake8 >/dev/null 2>&1; then
  flake8 . || fail=1
fi

# Test execution
step "Running tests..."
if command -v go >/dev/null 2>&1; then
  go test ./... || fail=1
fi
if command -v npm >/dev/null 2>&1; then
  npm test || fail=1
fi
if command -v pytest >/dev/null 2>&1; then
  pytest || fail=1
fi

# Security checks
step "Running security checks..."
if command -v gosec >/dev/null 2>&1; then
  gosec ./... || fail=1
fi
if command -v npm >/dev/null 2>&1; then
  npm audit || fail=1
fi
if command -v safety >/dev/null 2>&1; then
  safety scan || fail=1
fi

if [ "$fail" -eq 0 ]; then
  success "All pre-commit checks passed."
  exit 0
else
  fail_msg "Pre-commit checks failed. Commit aborted."
  exit 1
fi
EOF

  chmod +x "$HOOK_FILE"
  log_info "Pre-commit hook (at $HOOK_FILE) installed (and made executable)."
}

# Call the function (or log an error if it fails).
if ! setup_pre_commit_hook; then
  log_error "Failed to set up pre-commit hook."
  exit 1
fi

# Update the main function to use log_summary
main() {
    log_summary "Git hooks setup" "Started"
    
    # ... existing setup steps ...
    
    if [ $? -eq 0 ]; then
        log_summary "Git hooks setup" "Completed successfully"
    else
        log_summary "Git hooks setup" "Failed"
    fi
}

# ... rest of the script ... 