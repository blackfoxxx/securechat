#!/bin/bash

# Secure Chat Web - One-Click Production Installation Script
# This script automates the complete installation and setup process for production deployment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root or with sudo"
    print_info "The script will request sudo permissions when needed"
    exit 1
fi

print_header "Secure Chat Web - Production Installation"
echo ""
print_info "This script will install and configure Secure Chat Web on your server"
echo ""

# Check system requirements
print_header "Checking System Requirements"

# Check OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
    print_info "Operating System: $OS $VER"
else
    print_error "Cannot determine OS. This script supports Ubuntu 20.04+ and Debian 11+"
    exit 1
fi

# Check if Ubuntu or Debian
if [[ ! "$OS" =~ "Ubuntu" ]] && [[ ! "$OS" =~ "Debian" ]]; then
    print_error "This script only supports Ubuntu 20.04+ and Debian 11+"
    exit 1
fi

# Update system packages
print_info "Updating system packages..."
sudo apt-get update -qq

# Check Docker
print_info "Checking for Docker..."
if ! command -v docker &> /dev/null; then
    print_warning "Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_success "Docker installed"
    print_warning "You may need to log out and back in for Docker permissions to take effect"
else
    print_success "Docker is already installed"
fi

# Check Docker Compose
print_info "Checking for Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    print_warning "Docker Compose not found. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed"
else
    print_success "Docker Compose is already installed"
fi

# Check Node.js
print_info "Checking for Node.js..."
if ! command -v node &> /dev/null; then
    print_warning "Node.js not found. Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js installed"
else
    NODE_VERSION=$(node -v)
    print_success "Node.js is already installed ($NODE_VERSION)"
fi

# Check pnpm
print_info "Checking for pnpm..."
if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm not found. Installing pnpm..."
    npm install -g pnpm
    print_success "pnpm installed"
else
    print_success "pnpm is already installed"
fi

# Get installation directory
INSTALL_DIR=$(pwd)
print_info "Installation directory: $INSTALL_DIR"

# Configuration wizard
print_header "Configuration Wizard"
echo ""

# Domain configuration
read -p "Enter your domain name (e.g., chat.example.com): " DOMAIN
while [ -z "$DOMAIN" ]; then
    print_error "Domain name cannot be empty"
    read -p "Enter your domain name: " DOMAIN
done

# Email for SSL
read -p "Enter your email for SSL certificate (Let's Encrypt): " EMAIL
while [ -z "$EMAIL" ]; then
    print_error "Email cannot be empty"
    read -p "Enter your email: " EMAIL
done

# Database password
print_info "Generating secure database password..."
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# JWT Secret
print_info "Generating JWT secret..."
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)

# Admin credentials
read -p "Enter admin username (default: admin): " ADMIN_USERNAME
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}

read -sp "Enter admin password: " ADMIN_PASSWORD
echo ""
while [ -z "$ADMIN_PASSWORD" ]; then
    print_error "Admin password cannot be empty"
    read -sp "Enter admin password: " ADMIN_PASSWORD
    echo ""
done

# Jitsi Meet domain
JITSI_DOMAIN="meet.$DOMAIN"
print_info "Jitsi Meet will be configured at: $JITSI_DOMAIN"

# Create .env file
print_header "Creating Environment Configuration"

cat > .env << EOF
# Database Configuration
DATABASE_URL=mysql://chatuser:${DB_PASSWORD}@mysql:3306/secure_chat

# Application Configuration
NODE_ENV=production
PORT=3000
VITE_APP_TITLE=Secure Chat Web
VITE_APP_ID=secure-chat-$(openssl rand -hex 8)

# JWT Configuration
JWT_SECRET=${JWT_SECRET}

# Admin Configuration
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD=${ADMIN_PASSWORD}

# OAuth Configuration (Manus - can be disabled for self-hosted)
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=self-hosted
OWNER_NAME=Administrator

# Jitsi Meet Configuration
VITE_JITSI_DOMAIN=${JITSI_DOMAIN}
JITSI_MEET_URL=https://${JITSI_DOMAIN}

# Storage Configuration (S3 compatible - MinIO will be used)
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=$(openssl rand -hex 16)
S3_SECRET_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-40)
S3_BUCKET=secure-chat-files
S3_REGION=us-east-1

# Built-in Forge API (for LLM features - optional)
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=

# Logo
VITE_APP_LOGO=/logo.svg

# Jitsi Secrets
JICOFO_SECRET=$(openssl rand -hex 16)
JICOFO_AUTH_PASSWORD=$(openssl rand -base64 24)
JVB_AUTH_PASSWORD=$(openssl rand -base64 24)
JIGASI_PASSWORD=$(openssl rand -base64 24)
JITSI_DOMAIN=${JITSI_DOMAIN}
DOMAIN=${DOMAIN}
EOF

print_success "Environment configuration created"

# Install dependencies
print_header "Installing Dependencies"
pnpm install
print_success "Dependencies installed"

# Build application
print_header "Building Application"
pnpm run build
print_success "Application built successfully"

# Create Docker Compose file
print_header "Creating Docker Compose Configuration"

cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  # MySQL Database
  mysql:
    image: mysql:8.0
    container_name: secure-chat-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: secure_chat
      MYSQL_USER: chatuser
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - chat-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Secure Chat Web Application
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    container_name: secure-chat-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - chat-network
    volumes:
      - ./uploads:/app/uploads

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: secure-chat-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx-rate-limit.conf:/etc/nginx/nginx.conf:ro
      - certbot_data:/var/www/certbot:ro
      - certbot_conf:/etc/letsencrypt:ro
    depends_on:
      - app
    networks:
      - chat-network

  # Certbot for SSL
  certbot:
    image: certbot/certbot:latest
    container_name: secure-chat-certbot
    volumes:
      - certbot_data:/var/www/certbot
      - certbot_conf:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

networks:
  chat-network:
    driver: bridge

volumes:
  mysql_data:
  certbot_data:
  certbot_conf:
EOF

print_success "Docker Compose configuration created"

# Create Production Dockerfile
print_header "Creating Production Dockerfile"

cat > Dockerfile.prod << 'EOF'
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server/_core/index.js"]
EOF

print_success "Production Dockerfile created"

# Create Nginx configuration
print_header "Creating Nginx Configuration"

mkdir -p nginx

cat > nginx/nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # HTTP server - redirect to HTTPS
    server {
        listen 80;
        server_name ${DOMAIN};

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://\$host\$request_uri;
        }
    }

    # HTTPS server for main app
    server {
        listen 443 ssl http2;
        server_name ${DOMAIN};

        ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        client_max_body_size 100M;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }

        location /socket.io/ {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF

print_success "Nginx configuration created"

# Initialize database
print_header "Setting Up Database"
print_info "Starting MySQL container..."
docker-compose -f docker-compose.prod.yml up -d mysql

print_info "Waiting for MySQL to be ready..."
sleep 30

print_info "Running database migrations..."
pnpm db:push

print_success "Database setup complete"

# Obtain SSL certificates
print_header "Obtaining SSL Certificates"
print_info "Starting temporary nginx for certificate verification..."

# Start nginx temporarily for certbot
docker-compose -f docker-compose.prod.yml up -d nginx

print_info "Requesting SSL certificate..."
docker run --rm \
  -v "$(pwd)/certbot_conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot_data:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  -d $DOMAIN || {
    print_warning "SSL certificate generation failed."
    print_info "Please make sure:"
    print_info "  1. Your domain DNS points to this server"
    print_info "  2. Ports 80 and 443 are open"
    print_info "  3. No other web server is running"
    print_info ""
    print_info "You can retry later with: sudo certbot certonly --webroot -w /var/www/certbot -d $DOMAIN"
}

# Start all services
print_header "Starting All Services"
docker-compose -f docker-compose.prod.yml up -d

print_success "All services started"

# Create management scripts
print_header "Creating Management Scripts"

# Start script
cat > start.sh << 'SCRIPT_EOF'
#!/bin/bash
docker-compose -f docker-compose.prod.yml up -d
echo "Secure Chat Web started"
SCRIPT_EOF
chmod +x start.sh

# Stop script
cat > stop.sh << 'SCRIPT_EOF'
#!/bin/bash
docker-compose -f docker-compose.prod.yml down
echo "Secure Chat Web stopped"
SCRIPT_EOF
chmod +x stop.sh

# Restart script
cat > restart.sh << 'SCRIPT_EOF'
#!/bin/bash
docker-compose -f docker-compose.prod.yml restart
echo "Secure Chat Web restarted"
SCRIPT_EOF
chmod +x restart.sh

# Status script
cat > status.sh << 'SCRIPT_EOF'
#!/bin/bash
docker-compose -f docker-compose.prod.yml ps
SCRIPT_EOF
chmod +x status.sh

# Logs script
cat > logs.sh << 'SCRIPT_EOF'
#!/bin/bash
docker-compose -f docker-compose.prod.yml logs -f "$@"
SCRIPT_EOF
chmod +x logs.sh

# Backup script
cat > backup.sh << 'SCRIPT_EOF'
#!/bin/bash
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

echo "Backing up database..."
docker exec secure-chat-mysql mysqldump -u chatuser -p${DB_PASSWORD} secure_chat > $BACKUP_DIR/database.sql

echo "Backing up uploads..."
if [ -d "uploads" ]; then
    cp -r uploads $BACKUP_DIR/
fi

echo "Backing up environment..."
cp .env $BACKUP_DIR/

echo "Backup completed: $BACKUP_DIR"
SCRIPT_EOF
chmod +x backup.sh

print_success "Management scripts created"

# Print completion message
print_header "Installation Complete!"
echo ""
print_success "Secure Chat Web has been successfully installed!"
echo ""
print_info "Your application is now running at:"
echo "  🌐 Main App: https://$DOMAIN"
echo ""
print_info "Admin Credentials:"
echo "  👤 Username: $ADMIN_USERNAME"
echo "  🔑 Password: $ADMIN_PASSWORD"
echo ""
print_info "Management Commands:"
echo "  ▶️  Start:   ./start.sh"
echo "  ⏹️  Stop:    ./stop.sh"
echo "  🔄 Restart: ./restart.sh"
echo "  📊 Status:  ./status.sh"
echo "  📜 Logs:    ./logs.sh [service]"
echo "  💾 Backup:  ./backup.sh"
echo ""
print_warning "Important Notes:"
echo "  1. Make sure your DNS records point to this server"
echo "  2. Ports 80 and 443 must be open in your firewall"
echo "  3. SSL certificates will auto-renew every 12 hours"
echo "  4. Database backups should be scheduled regularly"
echo "  5. Keep your .env file secure and backed up"
echo ""
print_info "Troubleshooting:"
echo "  • View logs: ./logs.sh app"
echo "  • Check status: ./status.sh"
echo "  • Restart services: ./restart.sh"
echo ""
print_success "Happy chatting! 🚀"
echo ""
