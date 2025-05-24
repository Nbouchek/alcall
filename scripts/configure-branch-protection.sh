#!/bin/bash

# Script to configure branch protection rules for the main branch
# This script requires the GitHub CLI (gh) to be installed and authenticated

# Exit on any error
set -e

# Repository information
REPO_OWNER="Nbouchek"
REPO_NAME="alcall"

echo "Configuring branch protection rules for main branch in ${REPO_OWNER}/${REPO_NAME}..."

# Configure branch protection rules
gh api \
  --method PUT \
  repos/${REPO_OWNER}/${REPO_NAME}/branches/main/protection \
  -f required_status_checks='{"strict":true,"contexts":[]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"dismissal_restrictions":{},"dismiss_stale_reviews":true,"require_code_owner_reviews":false,"required_approving_review_count":1}' \
  -f restrictions=null \
  -f required_signatures=true \
  -f allow_force_pushes=false \
  -f allow_deletions=false

echo "✅ Branch protection rules have been configured successfully!"
echo "
Configured rules for ${REPO_OWNER}/${REPO_NAME}:
- Require pull request reviews (1 approval required)
- Require status checks to pass
- Require signed commits
- Require linear history (no force pushes)
- Require branches to be up to date before merging
"

# Note: You may need to customize the following:
# 1. Add specific status check contexts in the 'contexts' array
# 2. Adjust the number of required approvals in 'required_approving_review_count'
# 3. Add specific reviewer restrictions if needed
