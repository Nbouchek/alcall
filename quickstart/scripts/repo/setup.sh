#!/bin/bash

# Exit on error
set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Load configuration using yq
CONFIG_DIR="$PROJECT_ROOT/config"
CONFIG_FILE="$PROJECT_ROOT/quickstart/config/repo.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Configuration file not found at $CONFIG_FILE"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Setup logging
LOG_DIR="$PROJECT_ROOT/logs/repo"
LOG_FILE="$LOG_DIR/repo_setup_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log "INFO" "Starting repository setup"
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
    local cmd=$1
    local min_version=$(yq ".tools.$cmd" "$CONFIG_FILE" | tr -d '"')
    # Remove any leading ">=" and whitespace from min_version
    min_version=$(echo "$min_version" | sed 's/^\s*>=\s*//')
    local version

    if ! command_exists "$cmd"; then
        handle_error "$cmd is not installed"
    fi

    # Special handling for Docker version check
    if [ "$cmd" = "docker" ]; then
        version=$(docker version --format '{{.Server.Version}}' 2>/dev/null || docker version --format '{{.Version}}' 2>/dev/null)
        local version_clean=$(echo "$version" | tr -cd '0-9.')
        local min_version_clean=$(echo "$min_version" | tr -cd '0-9.')
        # Compare versions using sort -V for proper semantic version comparison
        if [ "$(printf '%s\n' "$min_version_clean" "$version_clean" | sort -V | head -n1)" = "$min_version_clean" ]; then
            log "INFO" "$cmd version $version is compatible"
            return 0
        else
            handle_error "$cmd version $version is below minimum required version $min_version"
        fi
    fi

    # Robust version extraction for kubectl, helm, go
    if [ "$cmd" = "kubectl" ]; then
        # Handle both client-only and full version output
        version=$(kubectl version --client -o json 2>/dev/null | jq -r '.clientVersion.gitVersion' 2>/dev/null | sed 's/^v//') || \
        version=$(kubectl version --client 2>&1 | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1 | sed 's/^v//')
    elif [ "$cmd" = "helm" ]; then
        # Handle both v2 and v3 output formats
        version=$(helm version --template='{{.Version}}' 2>/dev/null | sed 's/^v//') || \
        version=$(helm version 2>&1 | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1 | sed 's/^v//')
    elif [ "$cmd" = "go" ]; then
        # Handle go version output with optional build info
        version=$(go version 2>&1 | grep -oE 'go[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1 | sed 's/^go//')
    elif [ "$cmd" = "rust" ]; then
        # Handle Rust version (check both rustc and cargo)
        if ! command_exists rustc || ! command_exists cargo; then
            handle_error "Rust is not installed (both rustc and cargo are required)"
        fi
        version=$(rustc --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
    else
        version=$($cmd --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
    fi

    # Additional validation for version format
    if ! [[ "$version" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]]; then
        handle_error "Invalid version format for $cmd: $version"
    fi

    if [ -z "$version" ]; then
        handle_error "Could not determine $cmd version"
    fi

    # Compare versions using sort -V for proper semantic version comparison
    if [ "$(printf '%s\n' "$min_version" "$version" | sort -V | head -n1)" != "$min_version" ]; then
        handle_error "$cmd version $version is below minimum required version $min_version"
    fi

    log "INFO" "$cmd version $version is compatible"
    return 0
}

# Function to install Rust
install_rust() {
    log "INFO" "Installing Rust..."
    if ! command_exists rustup; then
        # Install rustup
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        # Source the cargo environment
        source "$HOME/.cargo/env"
    fi

    # Update Rust to latest stable version
    rustup update stable -y
    rustup default stable

    # Install common Rust components
    rustup component add rustfmt
    rustup component add clippy
    rustup component add rust-src

    # Verify installation
    if command_exists rustc && command_exists cargo; then
        log "INFO" "Rust installed successfully: $(rustc --version)"
        return 0
    else
        log "ERROR" "Rust installation failed"
        return 1
    fi
}

# Check if ".tools" is defined (and not null) before proceeding
if ! yq -e '.tools' "$CONFIG_FILE" > /dev/null 2>&1; then
  log "WARN" "Config key '.tools' is missing or null; skipping prerequisites check."
  REQUIRED_TOOLS_LIST=""
else
  REQUIRED_TOOLS_LIST=$(yq '.tools | keys | join(" ")' "$CONFIG_FILE")
fi

# Check if ".directories" is defined (and not null) before proceeding
if ! yq -e '.directories' "$CONFIG_FILE" > /dev/null 2>&1; then
  log "WARN" "Config key '.directories' is missing or null; skipping directory creation."
  exit 1
fi

# Check prerequisites
log "INFO" "Checking prerequisites..."

# Check required tools (skip 'required' if present)
for tool in $REQUIRED_TOOLS_LIST; do
    if [ "$tool" = "required" ]; then
        continue
    fi
    if [ "$tool" = "rust" ] || [ "$tool" = "rustc" ] || [ "$tool" = "cargo" ]; then
        if ! command_exists rustc || ! command_exists cargo; then
            log "WARN" "Rust not found, attempting to install..."
            if ! install_rust; then
                handle_error "Rust installation failed"
            fi
        fi
        # Only check version once for Rust tools
        if [ "$tool" = "rust" ]; then
            check_version "rustc"
        else
            check_version "$tool"
        fi
    else
        check_version "$tool"
    fi
done

# Check GitHub authentication
log "INFO" "Checking GitHub authentication..."
if ! gh auth status >/dev/null 2>&1; then
    handle_error "Not authenticated with GitHub"
fi
log "INFO" "GitHub authentication verified"

# Create repository structure
log "INFO" "Creating repository structure..."

# Only create allowed directories
ALLOWED_DIRS=(
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
for dir in "${ALLOWED_DIRS[@]}"; do
  mkdir -p "$dir"
  log "INFO" "Created directory: $dir"
done

# Create documentation files (if defined in config)
log "INFO" "Creating documentation files (if defined)..."

# Create main README (if defined)
if yq -e '.documentation.readme' "$CONFIG_FILE" > /dev/null 2>&1; then
  yq -o=json '.documentation.readme' "$CONFIG_FILE" | jq -r . > README.md
  log "INFO" "Created README.md from config."
else
  log "WARN" "Config key '.documentation.readme' is missing or null; skipping README.md creation."
fi

# Create contributing guide (if defined)
if yq -e '.documentation.contributing' "$CONFIG_FILE" > /dev/null 2>&1; then
  yq -o=json '.documentation.contributing' "$CONFIG_FILE" | jq -r . > CONTRIBUTING.md
  log "INFO" "Created CONTRIBUTING.md from config."
else
  log "WARN" "Config key '.documentation.contributing' is missing or null; skipping CONTRIBUTING.md creation."
fi

# Create issue templates (if defined)
if yq -e '.documentation.issue_templates' "$CONFIG_FILE" > /dev/null 2>&1; then
  log "INFO" "Creating issue templates (if defined) ..."
  mkdir -p .github/ISSUE_TEMPLATE
  for template in $(yq '.documentation.issue_templates[].name' "$CONFIG_FILE" 2>/dev/null | tr -d '"'); do
    if yq -e ".documentation.issue_templates[] | select(.name == \"$template\") | .content" "$CONFIG_FILE" > /dev/null 2>&1; then
      yq -o=json ".documentation.issue_templates[] | select(.name == \"$template\") | .content" "$CONFIG_FILE" | jq -r . > ".github/ISSUE_TEMPLATE/${template}.md"
      log "INFO" "Created issue template: .github/ISSUE_TEMPLATE/${template}.md."
    else
      log "WARN" "Config key '.documentation.issue_templates[] | select(.name == \"$template\") | .content' is missing or null; skipping issue template creation for $template."
    fi
  done
else
  log "WARN" "Config key '.documentation.issue_templates' is missing or null; skipping issue templates creation."
fi

# Create PR template (if defined)
if yq -e '.documentation.pr_template' "$CONFIG_FILE" > /dev/null 2>&1; then
  yq -o=json '.documentation.pr_template' "$CONFIG_FILE" | jq -r . > .github/PULL_REQUEST_TEMPLATE.md
  log "INFO" "Created PR template (.github/PULL_REQUEST_TEMPLATE.md) from config."
else
  log "WARN" "Config key '.documentation.pr_template' is missing or null; skipping PR template creation."
fi

# Create GitHub Actions workflows (if defined)
if yq -e '.github.workflows' "$CONFIG_FILE" > /dev/null 2>&1; then
  log "INFO" "Creating GitHub Actions workflows (if defined) ..."
  mkdir -p .github/workflows
  for workflow in $(yq '.github.workflows[].name' "$CONFIG_FILE" 2>/dev/null | tr -d '"'); do
    if yq -e ".github.workflows[] | select(.name == \"$workflow\") | .content" "$CONFIG_FILE" > /dev/null 2>&1; then
      yq -o=json ".github.workflows[] | select(.name == \"$workflow\") | .content" "$CONFIG_FILE" | jq -r . > ".github/workflows/${workflow}.yml"
      log "INFO" "Created workflow: .github/workflows/${workflow}.yml."
    else
      log "WARN" "Config key '.github.workflows[] | select(.name == \"$workflow\") | .content' is missing or null; skipping workflow creation for $workflow."
    fi
  done
else
  log "WARN" "Config key '.github.workflows' is missing or null; skipping GitHub Actions workflows creation."
fi

# Create GitHub Actions (if defined)
if yq -e '.github.actions' "$CONFIG_FILE" > /dev/null 2>&1; then
  log "INFO" "Creating GitHub Actions (if defined) ..."
  mkdir -p .github/actions
  for action in $(yq '.github.actions[].name' "$CONFIG_FILE" 2>/dev/null | tr -d '"'); do
    if yq -e ".github.actions[] | select(.name == \"$action\") | .action_yml" "$CONFIG_FILE" > /dev/null 2>&1; then
      action_path=".github/actions/${action}"
      mkdir -p "$action_path"
      yq -o=json ".github.actions[] | select(.name == \"$action\") | .action_yml" "$CONFIG_FILE" | jq -r . > "$action_path/action.yml"
      log "INFO" "Created GitHub Action: $action_path/action.yml."
    else
      log "WARN" "Config key '.github.actions[] | select(.name == \"$action\") | .action_yml' is missing or null; skipping GitHub Action creation for $action."
    fi
  done
else
  log "WARN" "Config key '.github.actions' is missing or null; skipping GitHub Actions creation."
fi

# Create GitHub Environments (if defined)
if yq -e '.github.environments' "$CONFIG_FILE" > /dev/null 2>&1; then
  log "INFO" "Creating GitHub Environments (if defined) ..."
  mkdir -p .github/environments
  for env in $(yq '.github.environments[].name' "$CONFIG_FILE" 2>/dev/null | tr -d '"'); do
    if yq -e ".github.environments[] | select(.name == \"$env\") | .content" "$CONFIG_FILE" > /dev/null 2>&1; then
      yq -o=json ".github.environments[] | select(.name == \"$env\") | .content" "$CONFIG_FILE" | jq -r . > ".github/environments/${env}.yml"
      log "INFO" "Created GitHub Environment: .github/environments/${env}.yml."
    else
      log "WARN" "Config key '.github.environments[] | select(.name == \"$env\") | .content' is missing or null; skipping GitHub Environment creation for $env."
    fi
  done
else
  log "WARN" "Config key '.github.environments' is missing or null; skipping GitHub Environments creation."
fi

# Create initial git repository
log "INFO" "Checking git repository status..."
if [ ! -d ".git" ]; then
    log "INFO" "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit: Repository structure setup"
else
    log "INFO" "Git repository already exists, skipping initialization"
    # Add any untracked files
    if git status --porcelain | grep -q '^??'; then
        log "INFO" "Adding untracked files..."
        git add .
    fi
    # Commit if there are changes
    if git status --porcelain | grep -q '^[MAD]'; then
        log "INFO" "Committing changes..."
        git commit -m "Update: Repository structure and configuration" || log "WARN" "No changes to commit"
    fi
fi

# Create development branch
if ! git show-ref --quiet refs/heads/develop; then
    log "INFO" "Creating development branch..."
    git checkout -b develop
else
    log "INFO" "Branch 'develop' already exists, ensuring we're on it..."
    git checkout develop || log "WARN" "Could not switch to develop branch"
fi

# Create service subdirectories (src, tests)
SERVICES=(auth-service message-service realtime-service user-service payment-service ai-service gateway-service)
for svc in "${SERVICES[@]}"; do
  for sub in src tests; do
    dir="services/$svc/$sub"
    if [ ! -d "$dir" ]; then
      mkdir -p "$dir"
      log "INFO" "Created directory: $dir"
    else
      log "INFO" "Directory already exists: $dir"
    fi
  done
done

# Create key files if missing
# LICENSE (MIT)
if [ ! -f LICENSE ]; then
  cat > LICENSE <<'EOF'
MIT License

Copyright (c) $(date +%Y) UnifiedChat

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
  log "INFO" "Created LICENSE (MIT)"
else
  log "INFO" "LICENSE already exists"
fi

# CODE_OF_CONDUCT.md
if [ ! -f CODE_OF_CONDUCT.md ]; then
  cat > CODE_OF_CONDUCT.md <<'EOF'
# Contributor Covenant Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in our
community a harassment-free experience for everyone, regardless of age, body
size, visible or invisible disability, ethnicity, sex characteristics, gender
identity and expression, level of experience, education, socio-economic status,
nationality, personal appearance, race, religion, or sexual identity
and orientation.

We pledge to act and interact in ways that contribute to an open, welcoming,
diverse, inclusive, and healthy community.

## Our Standards

Examples of behavior that contributes to a positive environment for our
community include:

- Demonstrating empathy and kindness toward other people
- Being respectful of differing opinions, viewpoints, and experiences
- Giving and gracefully accepting constructive feedback
- Accepting responsibility and apologizing to those affected by our mistakes,
  and learning from the experience
- Focusing on what is best not just for us as individuals, but for the
  overall community

Examples of unacceptable behavior include:

- The use of sexualized language or imagery, and sexual attention or advances
  of any kind
- Trolling, insulting or derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information, such as a physical or email address,
  without their explicit permission
- Other conduct which could reasonably be considered inappropriate in a
  professional setting

## Enforcement Responsibilities

Community leaders are responsible for clarifying and enforcing our standards of
acceptable behavior and will take appropriate and fair corrective action in
response to any behavior that they deem inappropriate, threatening, offensive,
or harmful.

## Scope

This Code of Conduct applies within all community spaces, and also applies when
an individual is officially representing the community in public spaces.

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported to the community leaders responsible for enforcement at
[INSERT CONTACT EMAIL].
All complaints will be reviewed and investigated promptly and fairly.

All community leaders are obligated to respect the privacy and security of the
reporter of any incident.

## Attribution

This Code of Conduct is adapted from the [Contributor Covenant][homepage],
version 2.1, available at
https://www.contributor-covenant.org/version/2/1/code_of_conduct.html.

[homepage]: https://www.contributor-covenant.org
EOF
  log "INFO" "Created CODE_OF_CONDUCT.md"
else
  log "INFO" "CODE_OF_CONDUCT.md already exists"
fi

# SECURITY.md
if [ ! -f SECURITY.md ]; then
  cat > SECURITY.md <<'EOF'
# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by emailing [INSERT SECURITY CONTACT EMAIL].
We will respond as quickly as possible to your report. Please do not disclose security issues publicly until they have been addressed.

## Supported Versions

We will address security issues in the latest release. Older versions may not be supported.
EOF
  log "INFO" "Created SECURITY.md"
else
  log "INFO" "SECURITY.md already exists"
fi

# CHANGELOG.md
if [ ! -f CHANGELOG.md ]; then
  cat > CHANGELOG.md <<'EOF'
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Initial project structure
EOF
  log "INFO" "Created CHANGELOG.md"
else
  log "INFO" "CHANGELOG.md already exists"
fi

# Create release/0.1.0 branch if no release/* branch exists
if ! git branch -r | grep -q 'origin/release/'; then
  if git show-ref --verify --quiet refs/heads/main; then
    git checkout main
  elif git show-ref --verify --quiet refs/heads/develop; then
    git checkout develop
  fi
  git checkout -b release/0.1.0 || log "WARN" "release/0.1.0 branch already exists"
  git push origin release/0.1.0 || log "WARN" "Could not push release/0.1.0 to origin"
  log "INFO" "Created release/0.1.0 branch"
else
  log "INFO" "At least one release/* branch already exists"
fi

# Apply branch protection rules (call apply_branch_protection.sh if exists)
if [ -f "$PROJECT_ROOT/scripts/repo/apply_branch_protection.sh" ]; then
  bash "$PROJECT_ROOT/scripts/repo/apply_branch_protection.sh"
  log "INFO" "Applied branch protection rules"
else
  log "WARN" "apply_branch_protection.sh not found, skipping branch protection setup"
fi

echo -e "${GREEN}Repository setup completed successfully!${NC}"
log "INFO" "Repository setup completed successfully"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the created repository structure"
echo "2. Configure git hooks in .git/hooks/"
echo "3. Set up branch protection rules in GitHub"
echo "4. Configure GitHub Actions secrets"
echo "5. Review and customize documentation"
echo "6. Push the repository to GitHub"
