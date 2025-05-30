#!/bin/bash

# Exit on any error
set -e

# Source common functions
source "$(dirname "$0")/../common/functions.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs/cicd"
LOG_FILE="$LOG_DIR/cicd_setup_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

# Logging functions
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" | tee -a "$LOG_FILE"
    exit 1
}

# Load configuration
CONFIG_FILE="$SCRIPT_DIR/../../config/cicd.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    log_error "Configuration file not found: $CONFIG_FILE"
fi

# Check prerequisites
log_info "Checking prerequisites..."
if ! yq -e '.tools' "$CONFIG_FILE" >/dev/null 2>&1; then
    log_warn "Config key '.tools' is missing or null; skipping prerequisites check."
else
    # Check required tools
    for tool in $(yq -r '.tools[]' "$CONFIG_FILE"); do
        if ! command -v "$tool" >/dev/null 2>&1; then
            log_error "Required tool not found: $tool"
        fi
    done
fi

# Create GitHub Actions workflows
log_info "Creating GitHub Actions workflows..."
WORKFLOWS_DIR="$SCRIPT_DIR/../../.github/workflows"
mkdir -p "$WORKFLOWS_DIR" || log_error "Failed to create workflows directory"

# Main workflow
cat > "$WORKFLOWS_DIR/main.yml" << 'EOF'
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.23'
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.13'
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '23'
      - name: Install dependencies
        run: |
          go mod download
          pip install -r requirements.txt
          npm ci
      - name: Run tests
        run: |
          go test ./...
          pytest
          npm test
      - name: Build
        run: |
          go build ./...
          npm run build

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run security scan
        uses: snyk/actions/golang@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      - name: Run container scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'app:latest'
          format: 'table'
          exit-code: '1'
          ignore-unfixed: true
          vuln-type: 'os,library'
          severity: 'CRITICAL,HIGH'

  deploy:
    needs: [build-and-test, security-scan]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # Add deployment steps here
EOF

# Pull request workflow
cat > "$WORKFLOWS_DIR/pr.yml" << 'EOF'
name: Pull Request Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate PR
        run: |
          echo "Validating pull request..."
          # Add validation steps here
EOF

# Release workflow
cat > "$WORKFLOWS_DIR/release.yml" << 'EOF'
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
EOF

# Create pull request template
log_info "Creating pull request template..."
PR_TEMPLATE_DIR="$SCRIPT_DIR/../../.github/PULL_REQUEST_TEMPLATE"
mkdir -p "$PR_TEMPLATE_DIR" || log_error "Failed to create PR template directory"

cat > "$PR_TEMPLATE_DIR/pull_request_template.md" << 'EOF'
# Pull Request

## Description
<!-- Provide a brief description of the changes in this PR -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Other (please describe):

## Related Issues
Fixes #

## Checklist
- [ ] Code follows project style guidelines
- [ ] Documentation has been updated
- [ ] All tests pass
- [ ] No new linting errors
- [ ] No security vulnerabilities introduced
- [ ] Dependencies are up to date
- [ ] Commit messages follow conventional commits format

## Testing Instructions
1.
2.
3.

## Additional Notes
<!-- Add any other information about the PR here -->
EOF

# Create issue templates
log_info "Creating issue templates..."
ISSUE_TEMPLATE_DIR="$SCRIPT_DIR/../../.github/ISSUE_TEMPLATE"
mkdir -p "$ISSUE_TEMPLATE_DIR" || log_error "Failed to create issue template directory"

# Bug report template
cat > "$ISSUE_TEMPLATE_DIR/bug_report.md" << 'EOF'
---
name: Bug Report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. iOS]
 - Browser [e.g. chrome, safari]
 - Version [e.g. 22]

**Additional context**
Add any other context about the problem here.
EOF

# Feature request template
cat > "$ISSUE_TEMPLATE_DIR/feature_request.md" << 'EOF'
---
name: Feature Request
about: Suggest an idea for this project
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
EOF

log_info "CI/CD setup completed successfully"
log_info "Next steps:"
log_info "1. Review the created workflows in .github/workflows/"
log_info "2. Configure repository secrets for CI/CD"
log_info "3. Set up branch protection rules"
log_info "4. Test the CI/CD pipeline with a test commit"

if [ -z "$SKIP_K8S_CHECK" ]; then
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Kubernetes cluster check failed (cluster-info returned non-zero)."
        exit 1
    fi
else
    log_info "Skipping Kubernetes cluster check (SKIP_K8S_CHECK is set)."
fi

# Only create allowed directories
ALLOWED_DIRS=(
  ".github/workflows"
)
for dir in "${ALLOWED_DIRS[@]}"; do
  mkdir -p "$PROJECT_ROOT/$dir" || log_error "Failed to create $dir directory"
  log_info "Created directory: $dir"
done

exit 0
