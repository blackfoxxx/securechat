#!/bin/bash

# GitHub Upload Script for Secure Chat Web
# This script automates the process of creating a GitHub repository and pushing code

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Repository configuration
GITHUB_USERNAME="blackfoxxx"
REPO_NAME="securechat"
REPO_DESCRIPTION="A modern, secure chat application with end-to-end encryption, real-time messaging, and voice/video calls"
REPO_VISIBILITY="public"  # or "private"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Secure Chat Web - GitHub Upload Script           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

echo -e "${YELLOW}Repository Details:${NC}"
echo -e "  Username: ${GREEN}${GITHUB_USERNAME}${NC}"
echo -e "  Repository: ${GREEN}${REPO_NAME}${NC}"
echo -e "  Visibility: ${GREEN}${REPO_VISIBILITY}${NC}"
echo -e "  URL: ${BLUE}https://github.com/${GITHUB_USERNAME}/${REPO_NAME}${NC}"
echo ""

# Prompt for GitHub token
echo -e "${YELLOW}Please enter your GitHub Personal Access Token:${NC}"
echo -e "${BLUE}(Create one at: https://github.com/settings/tokens)${NC}"
echo -e "${BLUE}Required scope: 'repo'${NC}"
echo ""
read -s GITHUB_TOKEN
echo ""

if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}Error: GitHub token is required.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Token received"
echo ""

# Step 1: Create repository on GitHub
echo -e "${YELLOW}Step 1: Creating repository on GitHub...${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/user/repos \
    -d "{
        \"name\": \"${REPO_NAME}\",
        \"description\": \"${REPO_DESCRIPTION}\",
        \"private\": $([ "$REPO_VISIBILITY" = "private" ] && echo "true" || echo "false"),
        \"has_issues\": true,
        \"has_projects\": true,
        \"has_wiki\": true
    }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✓${NC} Repository created successfully!"
elif [ "$HTTP_CODE" = "422" ]; then
    echo -e "${YELLOW}⚠${NC} Repository already exists. Continuing with push..."
else
    echo -e "${RED}✗${NC} Failed to create repository (HTTP $HTTP_CODE)"
    echo -e "${RED}Response: $BODY${NC}"
    echo ""
    echo -e "${YELLOW}You can create the repository manually at:${NC}"
    echo -e "${BLUE}https://github.com/new${NC}"
    echo ""
    read -p "Press Enter to continue with push anyway, or Ctrl+C to cancel..."
fi

echo ""

# Step 2: Check current git status
echo -e "${YELLOW}Step 2: Checking Git status...${NC}"

if [ ! -d ".git" ]; then
    echo -e "${RED}Error: Not a git repository. Initializing...${NC}"
    git init
    git add .
    git commit -m "Initial commit: Secure Chat Web application"
fi

echo -e "${GREEN}✓${NC} Git repository ready"
echo ""

# Step 3: Configure remote
echo -e "${YELLOW}Step 3: Configuring GitHub remote...${NC}"

# Check if 'github' remote already exists
if git remote | grep -q "^github$"; then
    echo -e "${YELLOW}⚠${NC} Remote 'github' already exists. Removing..."
    git remote remove github
fi

# Add remote with token for authentication
git remote add github "https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"

echo -e "${GREEN}✓${NC} Remote configured"
echo ""

# Step 4: Push code
echo -e "${YELLOW}Step 4: Pushing code to GitHub...${NC}"
echo -e "${BLUE}This may take a few minutes depending on repository size...${NC}"
echo ""

if git push -u github main --tags 2>&1; then
    echo ""
    echo -e "${GREEN}✓${NC} Code pushed successfully!"
else
    echo ""
    echo -e "${YELLOW}⚠${NC} Push failed. Trying with force push..."
    if git push -u github main --force --tags 2>&1; then
        echo ""
        echo -e "${GREEN}✓${NC} Code force-pushed successfully!"
    else
        echo ""
        echo -e "${RED}✗${NC} Push failed. Please check the errors above."
        exit 1
    fi
fi

echo ""

# Step 5: Clean up (remove token from remote URL)
echo -e "${YELLOW}Step 5: Securing remote URL...${NC}"

git remote set-url github "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"

echo -e "${GREEN}✓${NC} Remote URL secured (token removed)"
echo ""

# Success message
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  Upload Successful! 🎉                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Your repository is now available at:${NC}"
echo -e "${BLUE}https://github.com/${GITHUB_USERNAME}/${REPO_NAME}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Visit your repository and verify the upload"
echo -e "  2. Update README.md with your specific information"
echo -e "  3. Add topics/tags to your repository"
echo -e "  4. Configure repository settings (if needed)"
echo -e "  5. Set up GitHub Actions for CI/CD (optional)"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
