#!/bin/bash

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check GitHub CLI
if ! command_exists gh; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    exit 1
fi

# Check if user is authenticated with GitHub
if ! gh auth status >/dev/null 2>&1; then
    echo -e "${RED}Error: Not authenticated with GitHub${NC}"
    exit 1
fi

# Get repository name from git config
REPO_NAME=$(git config --get remote.origin.url | sed 's/.*github.com[:/]//' | sed 's/\.git$//')

# Confirmation prompt
echo -e "${YELLOW}This will remove the following:${NC}"
echo "1. GitHub workflow files (.github/workflows/)"
echo "2. Issue templates (.github/ISSUE_TEMPLATE/)"
echo "3. PR templates (.github/PULL_REQUEST_TEMPLATE/)"
echo "4. CODEOWNERS file (.github/CODEOWNERS)"
echo "5. Branch protection rules for main and develop branches"
echo
echo -e "${RED}WARNING: This action cannot be undone!${NC}"
read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Teardown cancelled${NC}"
    exit 1
fi

# Remove GitHub workflow files
echo -e "${YELLOW}Removing GitHub workflow files...${NC}"
rm -rf .github/workflows/*

# Remove issue templates
echo -e "${YELLOW}Removing issue templates...${NC}"
rm -rf .github/ISSUE_TEMPLATE/*

# Remove PR templates
echo -e "${YELLOW}Removing PR templates...${NC}"
rm -rf .github/PULL_REQUEST_TEMPLATE/*

# Remove CODEOWNERS file
echo -e "${YELLOW}Removing CODEOWNERS file...${NC}"
rm -f .github/CODEOWNERS

# Remove branch protection rules
echo -e "${YELLOW}Removing branch protection rules...${NC}"

# Remove protection from main branch
gh api repos/$REPO_NAME/branches/main/protection \
  -X DELETE \
  -H "Accept: application/vnd.github.v3+json"

# Remove protection from develop branch
gh api repos/$REPO_NAME/branches/develop/protection \
  -X DELETE \
  -H "Accept: application/vnd.github.v3+json"

# Optional: Remove .github directory completely
read -p "Do you want to remove the entire .github directory? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Removing .github directory...${NC}"
    rm -rf .github
fi

# Only remove allowed directories
ALLOWED_DIRS=(
  ".github"
  "services"
  "web"
  "mobile"
  "desktop"
  "infrastructure"
  "docs"
)
for path in "${ALLOWED_DIRS[@]}"; do
  if [ -e "$path" ]; then
    echo -e "${YELLOW}Removing $path...${NC}"
    rm -rf "$path"
  fi
done

# Additional teardown: Remove main project directories and .env
EXTRA_PATHS=(
  ".github"
  "config"
  "desktop"
  "docs"
  "documentation"
  "infrastructure"
  "logs"
  "mobile"
  "reports"
  "scripts"
  "services"
  "web"
  ".env"
)

echo -e "${RED}WARNING: This will also delete all main project directories and .env!${NC}"
echo "The following will be deleted:"
for path in "${EXTRA_PATHS[@]}"; do
  echo "  - $path"
done
read -p "Are you sure you want to delete ALL these directories and files? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  for path in "${EXTRA_PATHS[@]}"; do
    if [ -e "$path" ]; then
      echo -e "${YELLOW}Removing $path...${NC}"
      rm -rf "$path"
    fi
  done
  echo -e "${GREEN}All specified directories and files have been deleted.${NC}"
else
  echo -e "${YELLOW}Skipped deleting main project directories and .env.${NC}"
fi

echo -e "${GREEN}Repository teardown completed successfully!${NC}"
echo -e "${YELLOW}Note:${NC}"
echo "1. The repository structure (services/, web/, etc.) has been preserved"
echo "2. You may need to manually clean up any remaining GitHub settings in the repository web interface"
echo "3. Consider running 'git status' to check for any untracked files"
