# M2M Network Configuration Guide

Complete guide for deploying Secure Chat on isolated M2M (Machine-to-Machine) networks without internet connectivity.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Socket.IO Configuration](#socketio-configuration)
- [E2EE Configuration](#e2ee-configuration)
- [Network Requirements](#network-requirements)
- [Deployment Steps](#deployment-steps)
- [Verification & Testing](#verification--testing)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The Secure Chat application is designed to work completely offline with the following components:

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
│         │   WebSocket/HTTP       │                       │
│         └────────┬───────────────┘                       │
│                  │                                       │
│         ┌────────▼────────┐                              │
│         │  Node.js Server │                              │
│         │  ┌────────────┐ │                              │
│         │  │ Socket.IO  │ │ ◄─ Real-time messaging      │
│         │  ├────────────┤ │                              │
│         │  │   tRPC     │ │ ◄─ API endpoints            │
│         │  ├────────────┤ │                              │
│         │  │  Express   │ │ ◄─ HTTP server              │
│         │  └────────────┘ │                              │
│         └────────┬────────┘                              │
│                  │                                       │
│         ┌────────▼────────┐                              │
│         │  MySQL Database │                              │
│         │  (Self-hosted)  │                              │
│         └─────────────────┘                              │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Key Components

1. **Socket.IO** - Real-time bidirectional communication
2. **Web Crypto API** - Client-side E2EE (built into browsers)
3. **MySQL** - Local database storage
4. **Express** - HTTP server
5. **tRPC** - Type-safe API layer

**All components run locally - NO external services required!**

---

## Socket.IO Configuration

### Current Implementation ✅

The Socket.IO implementation is **already configured for offline M2M networks**:

#### Server Configuration (`server/presence.ts`)

```typescript
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",  // Allows all local network clients
    methods: ["GET", "POST"],
  },
});
```

**Key Features:**
- ✅ No external dependencies
- ✅ Pure WebSocket/polling transport
- ✅ In-memory user presence tracking
- ✅ Broadcast to all connected clients
- ✅ Automatic reconnection handling

#### Client Configuration (`client/src/contexts/SocketContext.tsx`)

```typescript
const newSocket = io(window.location.origin, {
  path: "/socket.io",
  transports: ["websocket", "polling"],
});
```

**Key Features:**
- ✅ Connects to same origin (no external URLs)
- ✅ Uses relative paths (works on any IP/hostname)
- ✅ Fallback from WebSocket to polling
- ✅ Automatic reconnection on network interruption

### Network Configuration

#### 1. Server Binding

The server binds to all network interfaces by default:

```typescript
// In server/_core/index.ts
server.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${port}/`);
});
```

**For M2M deployment**, clients access via:
- `http://192.168.1.100:3000` (server's local IP)
- `http://server-hostname.local:3000` (mDNS hostname)
- `http://10.0.0.5:3000` (any local network IP)

#### 2. CORS Configuration

Current CORS allows all origins (`*`), which is perfect for M2M networks where clients may have various IPs.

**For stricter security**, you can limit to your network range:

```typescript
// server/presence.ts
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ["http://192.168.1.*", "http://10.0.0.*"],
    methods: ["GET", "POST"],
  },
});
```

#### 3. Transport Protocols

Socket.IO uses two transport protocols:

1. **WebSocket** (preferred) - Full-duplex communication
2. **HTTP Long Polling** (fallback) - Works through proxies/firewalls

Both work entirely over local network without internet.

### Real-Time Features

All real-time features work offline:

| Feature | Event | Description |
|---------|-------|-------------|
| **Online Presence** | `user:online`, `user:offline` | Track who's online |
| **Typing Indicators** | `typing:start`, `typing:stop` | Show when users type |
| **Message Read Receipts** | `message:read` | Mark messages as read |
| **New Messages** | Broadcast via tRPC | Instant message delivery |

### Configuration for Different Network Topologies

#### Peer-to-Peer Network
```
Client 1 (192.168.1.10) ──┐
Client 2 (192.168.1.11) ──┼── Server (192.168.1.100:3000)
Client 3 (192.168.1.12) ──┘
```

**No configuration changes needed** - works out of the box!

#### Star Topology with Switch
```
       ┌─── Client 1
Switch ├─── Client 2
       ├─── Server
       └─── Client 3
```

**No configuration changes needed** - works out of the box!

#### Mesh Network
```
Client 1 ←→ Client 2
   ↕          ↕
Client 3 ←→ Server
```

**Requires**: Proper routing tables on each node. Socket.IO will work as long as clients can reach the server IP.

---

## E2EE Configuration

### Current Implementation ✅

The E2EE system is **100% client-side and requires NO external services**:

#### Encryption Stack

```
┌─────────────────────────────────────────┐
│         Client-Side Only (Browser)       │
├─────────────────────────────────────────┤
│  Web Crypto API (Built into Browser)    │
│  ├─ RSA-OAEP (2048-bit)                 │
│  │  └─ Key exchange                     │
│  ├─ AES-GCM (256-bit)                   │
│  │  └─ Message encryption               │
│  ├─ PBKDF2 (100,000 iterations)         │
│  │  └─ Password-based key derivation    │
│  └─ SHA-256                              │
│     └─ Hashing & fingerprints           │
└─────────────────────────────────────────┘
```

**All cryptographic operations happen in the browser - NO server-side encryption!**

#### Key Generation (`client/src/lib/crypto.ts`)

```typescript
// Generate RSA-2048 key pair
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );
}
```

**Uses**: Browser's built-in `crypto.subtle` API (works offline)

#### Message Encryption Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Sender's Browser                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. Generate random AES-256 key                          │
│  2. Encrypt message with AES-GCM                         │
│  3. Encrypt AES key with recipient's RSA public key      │
│  4. Send encrypted message + encrypted key to server     │
│                                                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │     Server     │  ◄─ Stores encrypted data only
            │  (No decryption │     Cannot read messages!
            │   capability)   │
            └────────┬───────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Recipient's Browser                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. Receive encrypted message + encrypted key            │
│  2. Decrypt AES key with own RSA private key             │
│  3. Decrypt message with AES key                         │
│  4. Display plaintext message                            │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Zero External Dependencies

The E2EE implementation uses **only browser-native APIs**:

| API | Purpose | Availability |
|-----|---------|--------------|
| `crypto.subtle.generateKey()` | Generate RSA/AES keys | All modern browsers |
| `crypto.subtle.encrypt()` | Encrypt data | All modern browsers |
| `crypto.subtle.decrypt()` | Decrypt data | All modern browsers |
| `crypto.subtle.deriveKey()` | PBKDF2 key derivation | All modern browsers |
| `crypto.getRandomValues()` | Generate random bytes | All modern browsers |

**No external libraries, no CDN dependencies, no internet required!**

### Key Storage

Keys are stored in the MySQL database (encrypted):

```sql
-- users table
publicKey TEXT,                    -- Base64-encoded RSA public key
encryptedPrivateKey TEXT,          -- RSA private key encrypted with user's password
keySalt TEXT                       -- Salt for password-based key derivation
```

**Security Model:**
- Public keys stored in plaintext (needed for encryption)
- Private keys encrypted with user's password (only user can decrypt)
- Server never has access to unencrypted private keys
- Password never sent to server (used only client-side)

### Key Verification

Security codes prevent man-in-the-middle attacks:

```typescript
// Generate 60-digit security code from key fingerprints
export async function generateSecurityCode(
  publicKey1: string,
  publicKey2: string
): Promise<string> {
  // Combine and hash both public keys
  const combined = publicKey1 + publicKey2;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to 60-digit code
  // ... (pure client-side computation)
}
```

**Works offline** - no external verification service needed!

---

## Network Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **Network Type** | Any IP network (Ethernet, WiFi, etc.) |
| **Bandwidth** | 1 Mbps minimum (10 Mbps recommended) |
| **Latency** | < 100ms for good UX |
| **IP Addressing** | Static or DHCP (static recommended) |
| **DNS** | Optional (can use IP addresses) |
| **Internet** | **NOT REQUIRED** |

### Network Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 3000 | TCP | HTTP/WebSocket server |
| 3306 | TCP | MySQL database (if remote) |

### Firewall Configuration

If using firewalls, allow:

```bash
# On server machine
sudo ufw allow 3000/tcp   # Application server
sudo ufw allow 3306/tcp   # MySQL (if remote access needed)

# On client machines
# No incoming ports needed (clients initiate connections)
```

### Network Isolation Testing

To verify the application works without internet:

```bash
# Disable all internet routes (Linux)
sudo ip route del default

# Or disable network adapter connected to internet
sudo ifconfig eth0 down  # Replace eth0 with internet-facing interface

# Keep local network adapter up
sudo ifconfig eth1 up    # Replace eth1 with local network interface
```

---

## Deployment Steps

### Option 1: Single Server Deployment

**Recommended for small M2M networks (< 50 users)**

1. **Install on one machine**:
```bash
cd secure-chat-web
./install.sh
```

2. **Configure for network access**:
```bash
# Edit .env
DATABASE_URL="mysql://chatuser:password@localhost:3306/secure_chat"
JWT_SECRET="$(openssl rand -base64 32)"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="$(openssl rand -base64 24)"
NODE_ENV="production"
PORT=3000
```

3. **Start the server**:
```bash
pnpm build
pm2 start server/_core/index.ts --name secure-chat --interpreter tsx
```

4. **Access from clients**:
```
http://192.168.1.100:3000  (replace with server's IP)
```

### Option 2: Docker Deployment

**Recommended for easy deployment and isolation**

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
      - DATABASE_URL=mysql://chatuser:password@db:3306/secure_chat
      - JWT_SECRET=${JWT_SECRET}
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    depends_on:
      - db
    restart: unless-stopped
    networks:
      - m2m-network

  db:
    image: mysql:8
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=secure_chat
      - MYSQL_USER=chatuser
      - MYSQL_PASSWORD=password
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped
    networks:
      - m2m-network

volumes:
  mysql_data:

networks:
  m2m-network:
    driver: bridge
```

Deploy:

```bash
# Generate secrets
export JWT_SECRET=$(openssl rand -base64 32)
export ADMIN_PASSWORD=$(openssl rand -base64 24)
export MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)

# Start services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f app
```

### Option 3: Distributed Deployment

**For larger M2M networks with separate database server**

```
┌─────────────┐         ┌─────────────┐
│  App Server │────────►│  DB Server  │
│  (Node.js)  │         │   (MySQL)   │
│ 192.168.1.10│         │192.168.1.20 │
└─────────────┘         └─────────────┘
       ▲
       │
   ┌───┴───┐
   │       │
Client1  Client2
```

**App Server** (192.168.1.10):
```env
DATABASE_URL="mysql://chatuser:password@192.168.1.20:3306/secure_chat"
```

**DB Server** (192.168.1.20):
```sql
-- Allow remote connections
CREATE USER 'chatuser'@'192.168.1.%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON secure_chat.* TO 'chatuser'@'192.168.1.%';
FLUSH PRIVILEGES;
```

---

## Verification & Testing

### 1. Network Connectivity Test

```bash
# From client machine, test server reachability
ping 192.168.1.100

# Test HTTP port
curl http://192.168.1.100:3000

# Test WebSocket (using wscat)
npm install -g wscat
wscat -c ws://192.168.1.100:3000/socket.io/?EIO=4&transport=websocket
```

### 2. Socket.IO Connection Test

Open browser console on client:

```javascript
// Check Socket.IO connection
const socket = io('http://192.168.1.100:3000');

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### 3. E2EE Functionality Test

```javascript
// Test Web Crypto API availability
if (window.crypto && window.crypto.subtle) {
  console.log('✅ Web Crypto API available');
  
  // Test key generation
  crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt']
  ).then(() => {
    console.log('✅ RSA key generation works');
  }).catch(err => {
    console.error('❌ RSA key generation failed:', err);
  });
} else {
  console.error('❌ Web Crypto API not available');
}
```

### 4. End-to-End Test

1. **Register two users** on different client machines
2. **Add each other as contacts**
3. **Send encrypted message** from User 1 to User 2
4. **Verify message received** and decrypted on User 2's machine
5. **Verify security code** matches on both machines
6. **Disconnect internet** (if any) and repeat steps 3-5

### 5. Network Isolation Test

```bash
# On server machine, disable internet
sudo ip route del default

# Verify no internet
ping 8.8.8.8  # Should fail

# Verify local network works
ping 192.168.1.11  # Should succeed

# Test application
# - Register new user ✅
# - Send message ✅
# - Make video call ❌ (requires Jitsi setup)
```

---

## Troubleshooting

### Socket.IO Connection Issues

#### Problem: "Connection refused" or "ERR_CONNECTION_REFUSED"

**Cause**: Server not reachable or firewall blocking

**Solution**:
```bash
# Check server is running
sudo netstat -tulpn | grep 3000

# Check firewall
sudo ufw status
sudo ufw allow 3000/tcp

# Test from server itself
curl http://localhost:3000

# Test from client
curl http://192.168.1.100:3000
```

#### Problem: "WebSocket connection failed, falling back to polling"

**Cause**: Proxy or firewall blocking WebSocket

**Solution**:
- HTTP polling will work as fallback (no action needed)
- To fix WebSocket, ensure no proxy between client and server
- Check nginx/apache configuration if using reverse proxy

#### Problem: "CORS error" in browser console

**Cause**: Browser blocking cross-origin requests

**Solution**:
```typescript
// server/presence.ts - Update CORS config
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",  // Or specify your client IPs
    methods: ["GET", "POST"],
    credentials: true,
  },
});
```

### E2EE Issues

#### Problem: "Web Crypto API not available"

**Cause**: Using HTTP instead of HTTPS, or old browser

**Solution**:
- Web Crypto API requires HTTPS or localhost
- For M2M networks, use self-signed certificate:

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Update server to use HTTPS
# In server/_core/index.ts
import https from 'https';
import fs from 'fs';

const server = https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}, app);
```

- Or use localhost/127.0.0.1 (Web Crypto works without HTTPS)

#### Problem: "Key generation fails"

**Cause**: Browser doesn't support RSA-OAEP or AES-GCM

**Solution**:
- Update browser to latest version
- Supported browsers: Chrome 37+, Firefox 34+, Safari 11+, Edge 79+

#### Problem: "Cannot decrypt message"

**Cause**: Wrong private key or corrupted data

**Solution**:
1. Check user has unlocked their private key (entered password)
2. Verify key fingerprints match between sender and recipient
3. Check database for corrupted encrypted data

### Database Connection Issues

#### Problem: "connect ECONNREFUSED" to MySQL

**Cause**: MySQL not running or wrong connection string

**Solution**:
```bash
# Check MySQL is running
sudo systemctl status mysql

# Test connection
mysql -u chatuser -p -h 192.168.1.20 secure_chat

# Check DATABASE_URL in .env
DATABASE_URL="mysql://chatuser:password@192.168.1.20:3306/secure_chat?ssl=false"
```

### Performance Issues

#### Problem: Slow message delivery

**Cause**: Network latency or server overload

**Solution**:
```bash
# Check network latency
ping -c 10 192.168.1.100

# Check server resources
top
htop

# Increase Node.js memory if needed
NODE_OPTIONS="--max-old-space-size=4096" pm2 restart secure-chat
```

#### Problem: High CPU usage

**Cause**: Too many encryption operations

**Solution**:
- E2EE is CPU-intensive, this is normal
- Use hardware with AES-NI support for faster encryption
- Limit concurrent operations (batch message sending)

---

## Advanced Configuration

### Static IP Assignment

For production M2M networks, use static IPs:

```bash
# /etc/netplan/01-netcfg.yaml (Ubuntu)
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 192.168.1.100/24
      nameservers:
        addresses: [192.168.1.1]
```

### mDNS for Easy Discovery

Use mDNS (Bonjour/Avahi) for hostname resolution:

```bash
# Install Avahi (Linux)
sudo apt-get install avahi-daemon

# Server will be accessible at
http://server-hostname.local:3000
```

### Load Balancing (Large Networks)

For > 100 concurrent users:

```
       ┌─── App Server 1 (192.168.1.10)
       │
Nginx ─┼─── App Server 2 (192.168.1.11)
       │
       └─── App Server 3 (192.168.1.12)
              │
              └─── MySQL (192.168.1.20)
```

**Note**: Socket.IO requires sticky sessions for load balancing!

---

## Security Considerations

### Network Security

1. **Isolate M2M network** from internet-connected networks
2. **Use VLANs** to segment traffic
3. **Enable MAC address filtering** on switches
4. **Disable unused network services**
5. **Use strong passwords** for all accounts

### Application Security

1. **Change default admin password** immediately
2. **Use strong JWT_SECRET** (minimum 32 characters)
3. **Enable HTTPS** with self-signed certificates
4. **Regular security audits** of audit trail logs
5. **Keep software updated** (Node.js, MySQL, OS)

### Physical Security

For air-gapped M2M networks:

1. **Restrict physical access** to server hardware
2. **Disable USB ports** to prevent data exfiltration
3. **Use encrypted storage** for database files
4. **Implement access logs** for server room

---

## Summary

### ✅ What Works Offline

- ✅ Real-time messaging (Socket.IO)
- ✅ End-to-end encryption (Web Crypto API)
- ✅ User authentication (local database)
- ✅ File uploads (local storage)
- ✅ Online presence tracking
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Message reactions
- ✅ Group chats
- ✅ User blocking
- ✅ Key verification
- ✅ Admin dashboard
- ✅ Audit trail

### ❌ What Requires Additional Setup

- ❌ Video calls (requires self-hosted Jitsi Meet)
- ❌ Push notifications (requires FCM or self-hosted solution)
- ❌ Email notifications (requires local SMTP server)

### 🎯 Key Takeaways

1. **Socket.IO is already configured for M2M networks** - no changes needed
2. **E2EE uses only browser APIs** - works 100% offline
3. **All data stored locally** - MySQL database on local network
4. **No external dependencies** - completely self-contained
5. **Easy deployment** - single command installation

Your Secure Chat application is **ready for M2M deployment out of the box!**

---

## Support

For M2M-specific questions:
- Review this guide thoroughly
- Test in isolated network environment
- Check troubleshooting section
- Verify all components are self-hosted

For general deployment help, see [DEPLOYMENT.md](./DEPLOYMENT.md)
