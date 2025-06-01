#!/bin/bash
set -e

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

# Create JSON payload for main branch
cat > /tmp/main_protection.json <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["test", "lint", "security"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 2
  },
  "restrictions": null,
  "required_linear_history": true,
  "required_signatures": true
}
EOF

# Create JSON payload for develop branch
cat > /tmp/develop_protection.json <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["test", "lint"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": true,
  "required_signatures": true
}
EOF

# Apply protection to main branch
gh api --method PUT repos/$REPO/branches/main/protection --input /tmp/main_protection.json

# Apply protection to develop branch
gh api --method PUT repos/$REPO/branches/develop/protection --input /tmp/develop_protection.json

# Find all release/* branches and apply best-practice protection
echo "Finding release/* branches..."
RELEASE_BRANCHES=$(git branch -r | grep 'origin/release/' | sed 's|origin/||')

for branch in $RELEASE_BRANCHES; do
  echo "Applying protection to $branch"
  cat > /tmp/release_protection.json <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["test", "lint", "build", "security"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": {
    "users": [],
    "teams": ["release-managers"]
  },
  "required_linear_history": true,
  "required_signatures": true,
  "required_conversation_resolution": true
}
EOF

  gh api --method PUT repos/$REPO/branches/$branch/protection --input /tmp/release_protection.json

done

echo "Branch protection rules applied to main, develop, and all release/* branches."
