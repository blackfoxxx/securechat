# Secure Chat Web - Production Deployment Guide

This guide provides comprehensive instructions for deploying Secure Chat Web on your own servers using the one-click installation script.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation Steps](#installation-steps)
- [Post-Installation](#post-installation)
- [Management](#management)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)
- [Backup and Restore](#backup-and-restore)
- [Updating](#updating)

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04+ or Debian 11+
- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB minimum, 50GB+ recommended for media storage
- **Network**: Public IP address with open ports 80, 443

### Domain Requirements

- A registered domain name (e.g., chat.example.com)
- DNS A record pointing to your server's IP address
- Email address for SSL certificate registration

### Software (Auto-installed by script)

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 22+
- pnpm 8+

## Quick Start

The fastest way to get started is to use the one-click installation script:

```bash
# Clone or download the repository
git clone https://github.com/yourusername/secure-chat-web.git
cd secure-chat-web

# Run the installation script
./install-production.sh
```

The script will:
1. Check and install all prerequisites
2. Guide you through configuration
3. Set up the database
4. Obtain SSL certificates
5. Start all services

## Installation Steps

### Step 1: Prepare Your Server

1. **Update your system**:
   ```bash
   sudo apt-get update
   sudo apt-get upgrade -y
   ```

2. **Configure firewall** (if using UFW):
   ```bash
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   ```

3. **Set up DNS**:
   - Create an A record pointing your domain to your server's IP
   - Wait for DNS propagation (can take up to 48 hours)
   - Verify with: `dig +short your-domain.com`

### Step 2: Download and Prepare

```bash
# Download the application
git clone https://github.com/yourusername/secure-chat-web.git
cd secure-chat-web

# Make the installation script executable
chmod +x install-production.sh
```

### Step 3: Run Installation

```bash
./install-production.sh
```

The installation wizard will ask for:

1. **Domain Name**: Your fully qualified domain name (e.g., chat.example.com)
2. **Email Address**: For SSL certificate notifications
3. **Admin Username**: Administrator account username (default: admin)
4. **Admin Password**: Strong password for the administrator account

The script will automatically:
- Install Docker, Docker Compose, Node.js, and pnpm
- Generate secure random secrets for JWT and database
- Create and configure the `.env` file
- Build the application
- Set up MySQL database with migrations
- Obtain Let's Encrypt SSL certificates
- Start all services in Docker containers
- Create management scripts

### Step 4: Verify Installation

After installation completes, verify the services are running:

```bash
./status.sh
```

You should see all containers running:
- `secure-chat-mysql` - Database
- `secure-chat-app` - Application server
- `secure-chat-nginx` - Reverse proxy
- `secure-chat-certbot` - SSL certificate renewal

## Post-Installation

### Access Your Application

1. Open your browser and navigate to: `https://your-domain.com`
2. Log in with your admin credentials
3. Change the admin password in settings

### Configure Additional Settings

1. **Update Application Title**:
   - Edit `.env` file
   - Change `VITE_APP_TITLE` to your preferred name
   - Restart: `./restart.sh`

2. **Upload Custom Logo**:
   - Place your logo in `client/public/logo.svg`
   - Update `VITE_APP_LOGO` in `.env`
   - Rebuild and restart

3. **Configure Email Notifications** (optional):
   - Add SMTP settings to `.env`
   - Restart services

## Management

### Service Management Scripts

The installation creates several management scripts:

#### Start Services
```bash
./start.sh
```

#### Stop Services
```bash
./stop.sh
```

#### Restart Services
```bash
./restart.sh
```

#### Check Status
```bash
./status.sh
```

#### View Logs
```bash
# View all logs
./logs.sh

# View specific service logs
./logs.sh app
./logs.sh mysql
./logs.sh nginx
```

#### Create Backup
```bash
./backup.sh
```

### Manual Docker Commands

If you need more control:

```bash
# View all containers
docker-compose -f docker-compose.prod.yml ps

# Restart specific service
docker-compose -f docker-compose.prod.yml restart app

# View logs with follow
docker-compose -f docker-compose.prod.yml logs -f app

# Execute command in container
docker exec -it secure-chat-app sh

# Access MySQL
docker exec -it secure-chat-mysql mysql -u chatuser -p
```

## Troubleshooting

### SSL Certificate Issues

If SSL certificate generation fails:

1. **Check DNS propagation**:
   ```bash
   dig +short your-domain.com
   ```

2. **Verify ports are open**:
   ```bash
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :443
   ```

3. **Manually request certificate**:
   ```bash
   docker run --rm \
     -v "$(pwd)/certbot_conf:/etc/letsencrypt" \
     -v "$(pwd)/certbot_data:/var/www/certbot" \
     certbot/certbot certonly \
     --webroot \
     --webroot-path=/var/www/certbot \
     --email your-email@example.com \
     --agree-tos \
     -d your-domain.com
   ```

### Database Connection Issues

1. **Check MySQL is running**:
   ```bash
   docker ps | grep mysql
   ```

2. **View MySQL logs**:
   ```bash
   ./logs.sh mysql
   ```

3. **Test database connection**:
   ```bash
   docker exec -it secure-chat-mysql mysql -u chatuser -p
   ```

4. **Reset database** (⚠️ destroys all data):
   ```bash
   docker-compose -f docker-compose.prod.yml down -v
   docker-compose -f docker-compose.prod.yml up -d mysql
   sleep 30
   pnpm db:push
   ```

### Application Not Starting

1. **Check application logs**:
   ```bash
   ./logs.sh app
   ```

2. **Verify environment variables**:
   ```bash
   cat .env
   ```

3. **Rebuild application**:
   ```bash
   docker-compose -f docker-compose.prod.yml build app
   docker-compose -f docker-compose.prod.yml up -d app
   ```

### Port Already in Use

If ports 80 or 443 are already in use:

1. **Find the process**:
   ```bash
   sudo lsof -i :80
   sudo lsof -i :443
   ```

2. **Stop conflicting service**:
   ```bash
   sudo systemctl stop apache2  # or nginx, etc.
   sudo systemctl disable apache2
   ```

## Security Best Practices

### 1. Secure Your Server

```bash
# Keep system updated
sudo apt-get update && sudo apt-get upgrade -y

# Configure automatic security updates
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Use SSH keys instead of passwords
ssh-keygen -t ed25519
```

### 2. Protect Sensitive Files

```bash
# Secure .env file
chmod 600 .env

# Backup .env securely
cp .env .env.backup
chmod 600 .env.backup
```

### 3. Database Security

- Change default database passwords in `.env`
- Use strong passwords (20+ characters)
- Regularly backup database
- Limit database access to localhost only

### 4. Application Security

- Change admin password immediately after installation
- Enable two-factor authentication for admin account
- Regularly review user accounts
- Monitor application logs for suspicious activity

### 5. SSL/TLS Configuration

The default configuration uses strong SSL settings, but you can enhance further:

```nginx
# Add to nginx.conf
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;

# HSTS (uncomment after testing)
# add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

## Backup and Restore

### Automated Backups

The `backup.sh` script creates a timestamped backup containing:
- Database dump
- Uploaded files
- Environment configuration

```bash
# Create backup
./backup.sh

# Backups are stored in: backups/YYYYMMDD_HHMMSS/
```

### Schedule Automatic Backups

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/secure-chat-web && ./backup.sh

# Add weekly backup cleanup (keep last 4 weeks)
0 3 * * 0 find /path/to/secure-chat-web/backups -type d -mtime +28 -exec rm -rf {} +
```

### Restore from Backup

```bash
# Stop services
./stop.sh

# Restore database
docker exec -i secure-chat-mysql mysql -u chatuser -p${DB_PASSWORD} secure_chat < backups/20240117_020000/database.sql

# Restore uploads
rm -rf uploads
cp -r backups/20240117_020000/uploads .

# Restore environment (if needed)
cp backups/20240117_020000/.env .env

# Start services
./start.sh
```

### Off-site Backups

For production systems, store backups off-site:

```bash
# Using rsync to remote server
rsync -avz backups/ user@backup-server:/backups/secure-chat/

# Using AWS S3
aws s3 sync backups/ s3://your-bucket/secure-chat-backups/

# Using rclone (supports many cloud providers)
rclone sync backups/ remote:secure-chat-backups/
```

## Updating

### Update Application Code

```bash
# Backup first!
./backup.sh

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build app
docker-compose -f docker-compose.prod.yml up -d app

# Run database migrations if needed
pnpm db:push
```

### Update Dependencies

```bash
# Update Node.js packages
pnpm update

# Rebuild application
pnpm run build

# Restart services
./restart.sh
```

### Update Docker Images

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Restart with new images
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring

### Health Checks

Create a simple health check script:

```bash
#!/bin/bash
# health-check.sh

# Check if app is responding
if curl -f https://your-domain.com/api/health > /dev/null 2>&1; then
    echo "✓ Application is healthy"
else
    echo "✗ Application is down"
    # Send alert (email, Slack, etc.)
fi

# Check database
if docker exec secure-chat-mysql mysqladmin ping -h localhost > /dev/null 2>&1; then
    echo "✓ Database is healthy"
else
    echo "✗ Database is down"
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠ Disk usage is high: ${DISK_USAGE}%"
fi
```

### Log Monitoring

Monitor logs for errors:

```bash
# Watch for errors in real-time
./logs.sh app | grep -i error

# Count errors in last hour
docker logs secure-chat-app --since 1h 2>&1 | grep -i error | wc -l
```

## Performance Tuning

### Database Optimization

Add to MySQL configuration if needed:

```bash
# Create custom MySQL config
mkdir -p mysql-config
cat > mysql-config/my.cnf << EOF
[mysqld]
max_connections = 200
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
EOF

# Mount in docker-compose.prod.yml
# Add under mysql volumes:
# - ./mysql-config/my.cnf:/etc/mysql/conf.d/custom.cnf
```

### Application Scaling

For high traffic, consider:

1. **Horizontal Scaling**: Run multiple app containers behind a load balancer
2. **Caching**: Add Redis for session storage and caching
3. **CDN**: Use a CDN for static assets
4. **Database**: Use a managed database service or read replicas

## Support

For issues and questions:

- GitHub Issues: https://github.com/yourusername/secure-chat-web/issues
- Documentation: https://docs.your-domain.com
- Email: support@your-domain.com

## License

[Your License Here]

---

**Note**: This is a production deployment guide. For development setup, see `README.md`.
