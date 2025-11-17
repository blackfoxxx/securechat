# Secure Chat Web - Deployment Guide

Complete guide for deploying the Secure Chat application to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Production Deployment](#production-deployment)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js** 18+ (recommended: 20 LTS)
- **pnpm** 8+ (package manager)
- **MySQL** 8+ or **TiDB** (database)
- **Git** (for version control)

### Optional Tools

- **PM2** (process manager for production)
- **Nginx** (reverse proxy)
- **Docker** (containerization)

---

## Quick Start

### 1. Installation

Run the automated installation script:

```bash
chmod +x install.sh
./install.sh
```

Or install manually:

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Configure .env file with your settings
nano .env

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

### 2. Access the Application

- **Development**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin (login required)

---

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database
DATABASE_URL="mysql://user:password@host:port/database?ssl=true"

# Authentication
JWT_SECRET="your-secret-key-min-32-characters"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="secure-password-here"

# OAuth (if using Manus OAuth)
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://auth.manus.im"
VITE_APP_ID="your-app-id"

# Owner Information
OWNER_OPEN_ID="owner-open-id"
OWNER_NAME="Owner Name"

# Application
VITE_APP_TITLE="Secure Chat Web"
VITE_APP_LOGO="/logo.svg"

# API Keys (optional, for LLM/Storage features)
BUILT_IN_FORGE_API_URL="https://forge.manus.im"
BUILT_IN_FORGE_API_KEY="your-api-key"
VITE_FRONTEND_FORGE_API_KEY="your-frontend-api-key"
VITE_FRONTEND_FORGE_API_URL="https://forge.manus.im"

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT="https://analytics.example.com"
VITE_ANALYTICS_WEBSITE_ID="your-website-id"
```

### Environment-Specific Configuration

#### Development
```env
NODE_ENV=development
```

#### Production
```env
NODE_ENV=production
PORT=3000
```

---

## Database Setup

### MySQL/TiDB Configuration

1. **Create Database**:
```sql
CREATE DATABASE secure_chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. **Create User** (if needed):
```sql
CREATE USER 'chatuser'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON secure_chat.* TO 'chatuser'@'%';
FLUSH PRIVILEGES;
```

3. **Configure Connection String**:
```env
DATABASE_URL="mysql://chatuser:secure_password@localhost:3306/secure_chat?ssl=true"
```

4. **Run Migrations**:
```bash
pnpm db:push
```

### Database Schema

The application includes the following tables:
- `users` - User accounts and authentication
- `conversations` - Chat conversations (direct and group)
- `messages` - Chat messages with E2EE support
- `conversation_members` - Conversation participants
- `contacts` - User contact lists
- `blocked_users` - User blocking relationships
- `key_verifications` - E2EE key verification status
- `activity_logs` - Audit trail for admin dashboard

---

## Production Deployment

### Option 1: Manus Platform (Recommended)

1. Create a checkpoint in the Management UI
2. Click the **Publish** button
3. Configure custom domain (optional)
4. Done! Your app is live with automatic SSL and scaling

### Option 2: Traditional Hosting (VPS/Cloud)

#### Build for Production

```bash
# Build the application
pnpm build

# The build output will be in the dist/ directory
```

#### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start server/_core/index.ts --name secure-chat --interpreter tsx

# Configure auto-restart on system reboot
pm2 startup
pm2 save

# Monitor logs
pm2 logs secure-chat

# Restart application
pm2 restart secure-chat
```

#### Using systemd

Create a systemd service file `/etc/systemd/system/secure-chat.service`:

```ini
[Unit]
Description=Secure Chat Web Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/secure-chat-web
Environment="NODE_ENV=production"
ExecStart=/usr/bin/pnpm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable secure-chat
sudo systemctl start secure-chat
sudo systemctl status secure-chat
```

#### Nginx Reverse Proxy

Create Nginx configuration `/etc/nginx/sites-available/secure-chat`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/secure-chat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 3: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application files
COPY . .

# Build application
RUN pnpm build

# Expose port
EXPOSE 3000

# Start application
CMD ["pnpm", "start"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=secure_chat
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
```

Deploy with Docker:

```bash
docker-compose up -d
```

---

## Security Considerations

### 1. Environment Variables

- **Never commit** `.env` files to version control
- Use secrets management tools (AWS Secrets Manager, Vault, etc.)
- Rotate JWT_SECRET regularly
- Use strong, unique passwords for admin accounts

### 2. Database Security

- Enable SSL/TLS for database connections
- Use strong database passwords
- Implement regular backups
- Restrict database access by IP
- Keep database software updated

### 3. Application Security

- **HTTPS Only**: Always use SSL/TLS in production
- **Rate Limiting**: Implement rate limiting to prevent abuse
- **CORS**: Configure CORS to allow only trusted domains
- **Security Headers**: Use helmet.js for security headers
- **Input Validation**: All user inputs are validated server-side
- **SQL Injection**: Using Drizzle ORM with parameterized queries

### 4. E2EE Security

- Private keys are encrypted with user passwords
- Key verification prevents man-in-the-middle attacks
- Messages are encrypted client-side before transmission
- Server never has access to unencrypted message content

### 5. Monitoring

- Set up error tracking (Sentry, Rollbar)
- Monitor server resources (CPU, memory, disk)
- Review audit trail logs regularly
- Set up alerts for suspicious activity

---

## Troubleshooting

### Common Issues

#### Database Connection Errors

```
Error: connect ECONNREFUSED
```

**Solution**: Check DATABASE_URL, ensure database is running, verify network access

#### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**: Change PORT in .env or kill process using the port:
```bash
lsof -ti:3000 | xargs kill -9
```

#### Migration Errors

```
Error: Table already exists
```

**Solution**: Reset database or manually drop conflicting tables:
```bash
pnpm db:push --force
```

#### Build Errors

```
Error: Cannot find module
```

**Solution**: Clear cache and reinstall dependencies:
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Performance Optimization

1. **Enable Caching**: Use Redis for session storage
2. **Database Indexing**: Ensure proper indexes on frequently queried columns
3. **CDN**: Serve static assets from CDN
4. **Compression**: Enable gzip/brotli compression in Nginx
5. **Load Balancing**: Use multiple instances behind a load balancer

### Logs

- **Application Logs**: `pm2 logs secure-chat`
- **System Logs**: `journalctl -u secure-chat -f`
- **Nginx Logs**: `/var/log/nginx/error.log`

---

## Support

For issues or questions:
- Check the [GitHub Issues](https://github.com/your-repo/issues)
- Review the [API Documentation](./API.md)
- Contact support at support@example.com

---

## License

[Your License Here]
