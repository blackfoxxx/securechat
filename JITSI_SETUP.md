# Jitsi Meet Setup Guide for M2M Networks

Complete guide for deploying self-hosted Jitsi Meet video conferencing with Secure Chat on isolated M2M networks.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Network Configuration](#network-configuration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)

---

## Overview

Jitsi Meet is an open-source video conferencing solution that runs completely offline once deployed. This guide shows you how to integrate it with Secure Chat for M2M networks.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    M2M Local Network                     │
│                   (No Internet Access)                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐         ┌──────────────┐              │
│  │   Client 1   │◄───────►│   Client 2   │              │
│  │  (Browser)   │         │  (Browser)   │              │
│  └──────┬───────┘         └──────┬───────┘              │
│         │                        │                       │
│         │   HTTPS/WebRTC         │                       │
│         └────────┬───────────────┘                       │
│                  │                                       │
│         ┌────────▼────────┐                              │
│         │  Secure Chat    │                              │
│         │  Application    │                              │
│         │  (Port 3000)    │                              │
│         └────────┬────────┘                              │
│                  │                                       │
│         ┌────────▼────────┐                              │
│         │  Jitsi Meet     │                              │
│         │  ┌────────────┐ │                              │
│         │  │ Jitsi Web  │ │ ◄─ Port 8443 (HTTPS)        │
│         │  ├────────────┤ │                              │
│         │  │  Prosody   │ │ ◄─ XMPP Server              │
│         │  ├────────────┤ │                              │
│         │  │  Jicofo    │ │ ◄─ Conference Focus         │
│         │  ├────────────┤ │                              │
│         │  │    JVB     │ │ ◄─ Video Bridge             │
│         │  └────────────┘ │    Port 10000 (UDP)         │
│         └─────────────────┘                              │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Software

- **Docker** 20.10+ and **Docker Compose** 2.0+
- **Linux server** (Ubuntu 20.04+ recommended) or any Docker-capable OS
- **2 GB RAM** minimum (4 GB recommended)
- **10 GB disk space**

### Network Requirements

| Port | Protocol | Purpose |
|------|----------|---------|
| 3000 | TCP | Secure Chat application |
| 8443 | TCP | Jitsi Meet HTTPS |
| 8080 | TCP | Jitsi Meet HTTP (redirects to HTTPS) |
| 10000 | UDP | Jitsi Video Bridge (WebRTC) |
| 4443 | TCP | Jitsi Video Bridge (TCP fallback) |

### Installation

```bash
# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

---

## Quick Start

### 1. Generate Secrets

```bash
cd secure-chat-web

# Copy environment template
cp .env.docker.example .env.docker

# Generate secrets
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.docker
echo "ADMIN_PASSWORD=$(openssl rand -base64 24)" >> .env.docker
echo "MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)" >> .env.docker
echo "DB_PASSWORD=$(openssl rand -base64 32)" >> .env.docker
echo "JICOFO_COMPONENT_SECRET=$(openssl rand -hex 16)" >> .env.docker
echo "JICOFO_AUTH_PASSWORD=$(openssl rand -hex 16)" >> .env.docker
echo "JVB_AUTH_PASSWORD=$(openssl rand -hex 16)" >> .env.docker

# Set owner info
echo "ADMIN_USERNAME=admin" >> .env.docker
echo "OWNER_OPEN_ID=owner-1" >> .env.docker
echo "OWNER_NAME=Admin" >> .env.docker
```

### 2. Build and Start Services

```bash
# Build the application
docker-compose -f docker-compose-full.yml build

# Start all services
docker-compose -f docker-compose-full.yml --env-file .env.docker up -d

# Check status
docker-compose -f docker-compose-full.yml ps

# View logs
docker-compose -f docker-compose-full.yml logs -f
```

### 3. Access the Application

**From any device on the local network:**

- **Secure Chat**: `http://192.168.1.100:3000` (replace with your server IP)
- **Jitsi Meet**: `https://192.168.1.100:8443` (direct access, optional)

**Note**: Replace `192.168.1.100` with your server's actual IP address.

---

## Detailed Setup

### Step 1: Configure DNS (Optional but Recommended)

For easier access, set up local DNS resolution:

#### Option A: Edit /etc/hosts on Each Client

```bash
# On each client machine
sudo nano /etc/hosts

# Add these lines (replace IP with your server)
192.168.1.100  chat.local
192.168.1.100  jitsi.local
```

Now you can access:
- Secure Chat: `http://chat.local:3000`
- Jitsi Meet: `https://jitsi.local:8443`

#### Option B: Set Up Local DNS Server

Use dnsmasq or bind9 on your network for automatic resolution.

### Step 2: SSL Certificate Setup

Jitsi Meet requires HTTPS. For M2M networks, use self-signed certificates:

#### Generate Self-Signed Certificate

```bash
# Create certificates directory
mkdir -p ~/jitsi-certs
cd ~/jitsi-certs

# Generate certificate (valid for 365 days)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=jitsi.local"

# Copy to Jitsi web config volume
docker cp cert.pem jitsi-web:/config/keys/cert.crt
docker cp key.pem jitsi-web:/config/keys/cert.key

# Restart Jitsi web
docker-compose -f docker-compose-full.yml restart jitsi-web
```

#### Trust Certificate on Clients

**Linux:**
```bash
sudo cp cert.pem /usr/local/share/ca-certificates/jitsi.crt
sudo update-ca-certificates
```

**Windows:**
1. Double-click `cert.pem`
2. Click "Install Certificate"
3. Select "Local Machine"
4. Place in "Trusted Root Certification Authorities"

**macOS:**
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain cert.pem
```

**Android:**
1. Settings → Security → Install from storage
2. Select `cert.pem`

### Step 3: Configure Application

Update the Secure Chat application to use your Jitsi server:

```bash
# Edit docker-compose-full.yml
nano docker-compose-full.yml

# Find this line under 'app' service:
# - VITE_JITSI_DOMAIN=jitsi.local:8443

# Change to your server IP or hostname:
# - VITE_JITSI_DOMAIN=192.168.1.100:8443
# or
# - VITE_JITSI_DOMAIN=jitsi.local:8443

# Restart application
docker-compose -f docker-compose-full.yml restart app
```

### Step 4: Verify Services

```bash
# Check all containers are running
docker-compose -f docker-compose-full.yml ps

# Should show:
# secure-chat-app    running   0.0.0.0:3000->3000/tcp
# secure-chat-db     running   3306/tcp
# jitsi-web          running   0.0.0.0:8080->80/tcp, 0.0.0.0:8443->443/tcp
# jitsi-prosody      running   5222/tcp, 5280/tcp, 5347/tcp
# jitsi-jicofo       running   
# jitsi-jvb          running   0.0.0.0:4443->4443/tcp, 0.0.0.0:10000->10000/udp

# Check logs for errors
docker-compose -f docker-compose-full.yml logs jitsi-web
docker-compose -f docker-compose-full.yml logs jvb
```

---

## Network Configuration

### Firewall Rules

If using a firewall, allow these ports:

```bash
# UFW (Ubuntu)
sudo ufw allow 3000/tcp   # Secure Chat
sudo ufw allow 8443/tcp   # Jitsi HTTPS
sudo ufw allow 8080/tcp   # Jitsi HTTP
sudo ufw allow 10000/udp  # Jitsi Video Bridge
sudo ufw allow 4443/tcp   # Jitsi TCP fallback

# iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8443 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 10000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 4443 -j ACCEPT
```

### Network Isolation

To ensure no internet connectivity:

```bash
# Block all outbound traffic except local network
sudo iptables -A OUTPUT -d 192.168.0.0/16 -j ACCEPT
sudo iptables -A OUTPUT -d 10.0.0.0/8 -j ACCEPT
sudo iptables -A OUTPUT -d 172.16.0.0/12 -j ACCEPT
sudo iptables -A OUTPUT -d 127.0.0.0/8 -j ACCEPT
sudo iptables -A OUTPUT -j DROP

# Verify no internet
ping 8.8.8.8  # Should fail
ping 192.168.1.1  # Should succeed
```

---

## Testing

### Test 1: Access Secure Chat

```bash
# From a client browser
http://192.168.1.100:3000

# You should see the login page
# Register a new account
# Login successfully
```

### Test 2: Access Jitsi Meet Directly

```bash
# From a client browser
https://192.168.1.100:8443

# You should see Jitsi Meet interface
# Accept self-signed certificate warning
# Enter a room name and test
```

### Test 3: Video Call from Chat

1. **Login to Secure Chat** on two different devices/browsers
2. **Add each other as contacts**
3. **Start a conversation**
4. **Click "Video Call" button** in the chat header
5. **Verify video/audio works** on both sides

### Test 4: Network Isolation

```bash
# On server, disable internet
sudo ip route del default

# Verify no internet
ping 8.8.8.8  # Should fail

# Test video call still works
# Open Secure Chat → Start video call
# Should work without internet!
```

---

## Troubleshooting

### Issue: "Failed to load Jitsi Meet"

**Cause**: Cannot reach Jitsi server or certificate not trusted

**Solution**:
```bash
# Check Jitsi web is running
docker ps | grep jitsi-web

# Check logs
docker logs jitsi-web

# Verify port is accessible
curl -k https://192.168.1.100:8443

# Trust self-signed certificate (see Step 2)
```

### Issue: "No video/audio in call"

**Cause**: UDP port 10000 blocked or WebRTC issues

**Solution**:
```bash
# Check JVB is running
docker logs jitsi-jvb

# Verify UDP port
sudo netstat -ulpn | grep 10000

# Allow UDP port in firewall
sudo ufw allow 10000/udp

# Check browser permissions
# - Allow camera/microphone access
# - Check browser console for errors
```

### Issue: "Connection refused" to Jitsi

**Cause**: Jitsi services not started or wrong domain

**Solution**:
```bash
# Restart all Jitsi services
docker-compose -f docker-compose-full.yml restart jitsi-web prosody jicofo jvb

# Wait 30 seconds for services to initialize
sleep 30

# Check all services are healthy
docker-compose -f docker-compose-full.yml ps

# Verify VITE_JITSI_DOMAIN matches your setup
docker-compose -f docker-compose-full.yml exec app env | grep JITSI
```

### Issue: "Certificate error" in browser

**Cause**: Self-signed certificate not trusted

**Solution**:
- Click "Advanced" → "Proceed anyway" (for testing)
- Or install certificate as trusted (see Step 2)

### Issue: "One-way audio/video"

**Cause**: NAT or firewall blocking return traffic

**Solution**:
```bash
# Ensure both UDP and TCP ports are open
sudo ufw allow 10000/udp
sudo ufw allow 4443/tcp

# Check JVB configuration
docker-compose -f docker-compose-full.yml exec jvb cat /config/sip-communicator.properties | grep HARVESTER

# If behind NAT, set public IP
# Edit docker-compose-full.yml, add to jvb environment:
# - JVB_ADVERTISE_IPS=192.168.1.100
```

### Issue: High CPU usage

**Cause**: Video encoding/decoding is CPU-intensive

**Solution**:
- Use lower resolution (720p instead of 1080p)
- Limit number of participants
- Use hardware with better CPU
- Enable hardware acceleration in browsers

---

## Advanced Configuration

### Customize Jitsi Interface

```bash
# Access Jitsi web config
docker exec -it jitsi-web /bin/bash

# Edit interface config
nano /config/interface_config.js

# Common customizations:
# - APP_NAME: 'Secure Chat Video'
# - DEFAULT_BACKGROUND: '#1a1a1a'
# - DISABLE_VIDEO_BACKGROUND: true
# - TOOLBAR_BUTTONS: (remove unwanted buttons)

# Restart to apply
docker-compose -f docker-compose-full.yml restart jitsi-web
```

### Enable Recording (Optional)

```bash
# Add Jibri service to docker-compose-full.yml
# See Jitsi documentation for full Jibri setup
```

### Limit Bandwidth

```bash
# Edit JVB config
docker exec -it jitsi-jvb /bin/bash
nano /config/sip-communicator.properties

# Add bandwidth limits (in kbps)
org.jitsi.videobridge.BANDWIDTH_ESTIMATOR_MAX_BITRATE=2000
org.jitsi.videobridge.BANDWIDTH_ESTIMATOR_MIN_BITRATE=200

# Restart JVB
docker-compose -f docker-compose-full.yml restart jvb
```

### Multi-Server Deployment

For large M2M networks (100+ users):

```
                    ┌─── JVB 1 (192.168.1.101)
                    │
Load Balancer ──────┼─── JVB 2 (192.168.1.102)
                    │
                    └─── JVB 3 (192.168.1.103)
                           │
                           └─── Prosody + Jicofo (192.168.1.100)
```

See Jitsi documentation for clustering setup.

---

## Performance Tuning

### Recommended Settings for M2M Networks

| Participants | Resolution | Bandwidth | CPU | RAM |
|--------------|------------|-----------|-----|-----|
| 2-4 | 720p | 2 Mbps | 2 cores | 2 GB |
| 5-10 | 720p | 5 Mbps | 4 cores | 4 GB |
| 10-20 | 480p | 10 Mbps | 8 cores | 8 GB |
| 20+ | 360p | 20 Mbps | 16 cores | 16 GB |

### Optimize for Low Bandwidth

```javascript
// Edit client/src/pages/VideoCall.tsx
configOverwrite: {
  resolution: 480,
  constraints: {
    video: {
      height: { ideal: 480, max: 720, min: 240 }
    }
  },
  disableSimulcast: false,
  startVideoMuted: 10, // Start muted after 10 participants
}
```

---

## Maintenance

### Backup

```bash
# Backup volumes
docker run --rm -v secure-chat-web_mysql_data:/data -v $(pwd):/backup ubuntu tar czf /backup/mysql-backup.tar.gz /data
docker run --rm -v secure-chat-web_jitsi_web_config:/data -v $(pwd):/backup ubuntu tar czf /backup/jitsi-backup.tar.gz /data

# Backup environment
cp .env.docker .env.docker.backup
```

### Update

```bash
# Pull latest images
docker-compose -f docker-compose-full.yml pull

# Restart services
docker-compose -f docker-compose-full.yml down
docker-compose -f docker-compose-full.yml --env-file .env.docker up -d
```

### Monitor

```bash
# Resource usage
docker stats

# Logs
docker-compose -f docker-compose-full.yml logs -f --tail=100

# Health check
curl -k https://192.168.1.100:8443
curl http://192.168.1.100:3000
```

---

## Security Considerations

### Production Hardening

1. **Change default passwords** - Never use default credentials
2. **Enable authentication** - Set `ENABLE_AUTH=1` in Jitsi for private rooms
3. **Use strong certificates** - Generate proper SSL certificates
4. **Limit access** - Use firewall rules to restrict access
5. **Regular updates** - Keep Docker images updated
6. **Monitor logs** - Watch for suspicious activity
7. **Backup regularly** - Automate backups

### Authentication (Optional)

To require login for video calls:

```bash
# Edit docker-compose-full.yml
# Under jitsi-web environment:
- ENABLE_AUTH=1
- ENABLE_GUESTS=0

# Create users
docker-compose -f docker-compose-full.yml exec prosody prosodyctl register user1 meet.jitsi password123

# Restart services
docker-compose -f docker-compose-full.yml restart
```

---

## Summary

### ✅ What You Get

- ✅ Self-hosted video conferencing
- ✅ Works completely offline
- ✅ Integrated with Secure Chat
- ✅ Group video calls (up to 75 participants)
- ✅ Screen sharing
- ✅ Chat during calls
- ✅ No external dependencies
- ✅ Open source and free

### 📊 Quick Reference

| Component | URL | Purpose |
|-----------|-----|---------|
| Secure Chat | http://192.168.1.100:3000 | Main application |
| Jitsi Meet | https://192.168.1.100:8443 | Video conferencing |
| MySQL | 192.168.1.100:3306 | Database |

### 🎯 Key Commands

```bash
# Start all services
docker-compose -f docker-compose-full.yml --env-file .env.docker up -d

# Stop all services
docker-compose -f docker-compose-full.yml down

# View logs
docker-compose -f docker-compose-full.yml logs -f

# Restart a service
docker-compose -f docker-compose-full.yml restart jitsi-web

# Check status
docker-compose -f docker-compose-full.yml ps
```

---

## Support

For issues:
- Check logs: `docker-compose logs`
- Review [Troubleshooting](#troubleshooting) section
- Verify [Network Configuration](#network-configuration)
- Test with [Testing](#testing) procedures

For Jitsi-specific issues, see: https://jitsi.github.io/handbook/docs/devops-guide/

---

**Your Secure Chat application now has fully functional, self-hosted video calling for M2M networks!** 🎉
