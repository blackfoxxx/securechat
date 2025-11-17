#!/bin/bash

# Secure Chat Web - Installation Script
# This script automates the setup process for the secure chat application

set -e  # Exit on any error

echo "=================================="
echo "Secure Chat Web - Installation"
echo "=================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js version must be 18 or higher${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm not found. Installing pnpm...${NC}"
    npm install -g pnpm
fi

echo -e "${GREEN}✓ pnpm $(pnpm -v) detected${NC}"

# Install dependencies
echo ""
echo "Installing dependencies..."
pnpm install

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo ""
    echo -e "${YELLOW}No .env file found. Creating from template...${NC}"
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ .env file created from template${NC}"
        echo -e "${YELLOW}⚠ Please edit .env file and configure your environment variables${NC}"
    else
        echo -e "${RED}Error: .env.example template not found${NC}"
        echo "Please create a .env file manually with required variables"
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Check database configuration
echo ""
echo "Checking database configuration..."
if grep -q "DATABASE_URL=" .env && ! grep -q "DATABASE_URL=$" .env; then
    echo -e "${GREEN}✓ Database URL configured${NC}"
    
    # Ask if user wants to run migrations
    read -p "Do you want to run database migrations now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Running database migrations..."
        pnpm db:push
        echo -e "${GREEN}✓ Database migrations completed${NC}"
    else
        echo -e "${YELLOW}⚠ Remember to run 'pnpm db:push' before starting the server${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Database URL not configured in .env${NC}"
    echo "Please configure DATABASE_URL in .env file"
fi

# Installation complete
echo ""
echo "=================================="
echo -e "${GREEN}Installation Complete!${NC}"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Configure environment variables in .env file"
echo "2. Run 'pnpm db:push' to set up the database (if not done)"
echo "3. Run 'pnpm dev' to start development server"
echo "4. Run 'pnpm build' to build for production"
echo ""
echo "For more information, see DEPLOYMENT.md"
echo ""
