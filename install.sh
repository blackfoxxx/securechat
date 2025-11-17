#!/bin/bash

# Secure Chat Web - Installation Script
# This script automates the setup process for the Secure Chat application
# Supports both cloud and M2M (offline) network deployments

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_warning "Please do not run this script as root"
    exit 1
fi

print_header "Secure Chat Web - Installation Script"
print_info "This script will guide you through the installation process"
echo ""

# Step 1: Check Node.js
print_header "Step 1: Checking Prerequisites"

print_info "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    print_info "Please install Node.js 18 or higher from: https://nodejs.org/"
    print_info "Or use nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version must be 18 or higher (current: $(node -v))"
    exit 1
fi

print_success "Node.js $(node -v) is installed"

# Step 2: Check/Install pnpm
print_info "Checking pnpm installation..."
if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm is not installed. Installing now..."
    npm install -g pnpm
    print_success "pnpm installed successfully"
else
    print_success "pnpm $(pnpm -v) is installed"
fi

# Step 3: Check Docker (optional but recommended for Jitsi)
print_info "Checking Docker installation (optional for Jitsi Meet)..."
if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed"
    print_info "Docker is recommended for running Jitsi Meet video conferencing"
    print_info "Install from: https://docs.docker.com/get-docker/"
    DOCKER_AVAILABLE=false
else
    print_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') is installed"
    DOCKER_AVAILABLE=true
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
        print_warning "Docker Compose is not installed"
        print_info "Install from: https://docs.docker.com/compose/install/"
        DOCKER_COMPOSE_AVAILABLE=false
    else
        print_success "Docker Compose is installed"
        DOCKER_COMPOSE_AVAILABLE=true
    fi
fi

# Step 4: Install dependencies
print_header "Step 2: Installing Dependencies"
print_info "Installing Node.js packages (this may take a few minutes)..."

if pnpm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 5: Environment setup
print_header "Step 3: Environment Configuration"

if [ ! -f ".env" ]; then
    print_info "Creating .env file from template..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success ".env file created"
    else
        print_warning ".env.example not found, creating minimal .env"
        cat > .env << EOF
# Database Configuration
DATABASE_URL=mysql://user:password@localhost:3306/secure_chat

# JWT Secret (change this!)
JWT_SECRET=$(openssl rand -base64 32)

# Application Configuration
VITE_APP_TITLE=Secure Chat Web
VITE_APP_LOGO=/logo.svg

# Jitsi Meet Configuration
# For M2M networks, set this to your local Jitsi server
# Example: jitsi.local:8443 or 192.168.1.100:8443
VITE_JITSI_DOMAIN=meet.jit.si

# Admin Credentials (change these!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme123

# Server Configuration
PORT=3000
NODE_ENV=production
EOF
        print_success "Minimal .env file created"
    fi
    
    print_warning "IMPORTANT: Please edit .env file and configure:"
    print_info "  1. DATABASE_URL - Your MySQL/TiDB connection string"
    print_info "  2. JWT_SECRET - A secure random string (already generated)"
    print_info "  3. ADMIN_PASSWORD - Change the default admin password"
    print_info "  4. VITE_JITSI_DOMAIN - Your Jitsi server (for M2M: local IP)"
    echo ""
    
    read -p "Do you want to edit .env now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .env
    fi
else
    print_success ".env file already exists"
fi

# Step 6: Database setup
print_header "Step 4: Database Setup"

print_info "The application requires a MySQL or TiDB database"
print_warning "Make sure your database is running and accessible"
echo ""

read -p "Do you want to run database migrations now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Running database migrations..."
    
    if pnpm db:push; then
        print_success "Database migrations completed successfully"
    else
        print_error "Database migration failed"
        print_info "Please check your DATABASE_URL in .env file"
        print_info "You can run 'pnpm db:push' manually later"
    fi
else
    print_warning "Skipping database migrations"
    print_info "Run 'pnpm db:push' when your database is ready"
fi

# Step 7: Jitsi Meet setup (optional)
if [ "$DOCKER_AVAILABLE" = true ] && [ "$DOCKER_COMPOSE_AVAILABLE" = true ]; then
    print_header "Step 5: Jitsi Meet Setup (Optional)"
    
    print_info "Jitsi Meet provides video conferencing for your chat application"
    print_info "For M2M networks, you can deploy Jitsi locally using Docker"
    echo ""
    
    read -p "Do you want to set up Jitsi Meet now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f "docker-compose-full.yml" ]; then
            print_info "Starting Jitsi Meet services..."
            print_warning "This will download several Docker images (may take 10-15 minutes)"
            echo ""
            
            read -p "Continue? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                # Create .env.docker if it doesn't exist
                if [ ! -f ".env.docker" ]; then
                    if [ -f ".env.docker.example" ]; then
                        cp .env.docker.example .env.docker
                        print_success ".env.docker created from template"
                    fi
                fi
                
                docker-compose -f docker-compose-full.yml up -d
                
                print_success "Jitsi Meet services started"
                print_info "Jitsi will be available at: https://localhost:8443"
                print_info "Update VITE_JITSI_DOMAIN in .env to: localhost:8443"
                print_warning "For M2M networks, use your server's IP address instead of localhost"
            fi
        else
            print_warning "docker-compose-full.yml not found"
            print_info "See JITSI_SETUP.md for manual installation instructions"
        fi
    else
        print_info "Skipping Jitsi setup"
        print_info "You can set it up later using docker-compose-full.yml"
        print_info "Or use a public Jitsi server (requires internet)"
    fi
fi

# Step 8: Build application
print_header "Step 6: Building Application"

read -p "Do you want to build the application for production now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Building application..."
    
    if pnpm build; then
        print_success "Application built successfully"
    else
        print_error "Build failed"
        print_info "You can run 'pnpm build' manually later"
    fi
else
    print_warning "Skipping build"
    print_info "Run 'pnpm build' to build for production"
    print_info "Or run 'pnpm dev' for development mode"
fi

# Step 9: Final instructions
print_header "Installation Complete!"

print_success "Secure Chat Web has been installed successfully"
echo ""
print_info "Next steps:"
echo ""
echo "  Development mode:"
echo "    ${GREEN}pnpm dev${NC}"
echo ""
echo "  Production mode:"
echo "    ${GREEN}pnpm build${NC}"
echo "    ${GREEN}pnpm start${NC}"
echo ""
echo "  Database migrations:"
echo "    ${GREEN}pnpm db:push${NC}"
echo ""

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "  Jitsi Meet (video calls):"
    echo "    ${GREEN}docker-compose -f docker-compose-full.yml up -d${NC}"
    echo ""
fi

print_info "Documentation:"
echo "  - README.md - Project overview and features"
echo "  - DEPLOYMENT.md - Deployment guide"
echo "  - JITSI_SETUP.md - Jitsi Meet setup for video calls"
echo "  - M2M_NETWORK_CONFIG.md - M2M network configuration"
echo "  - ENV_SETUP.md - Environment variables guide"
echo ""

print_warning "Security reminders:"
echo "  1. Change ADMIN_PASSWORD in .env"
echo "  2. Use a strong JWT_SECRET"
echo "  3. Enable SSL/TLS in production"
echo "  4. Keep your database credentials secure"
echo ""

print_success "Happy chatting! 🚀"
echo ""
