# Secure Chat Web 🔒

A modern, secure chat application with end-to-end encryption, real-time messaging, voice/video calls, and comprehensive admin controls.

## ✨ Features

### Core Messaging
- **Real-time Chat** - Instant messaging with Socket.IO
- **End-to-End Encryption (E2EE)** - RSA-2048 + AES-GCM encryption
- **Direct & Group Chats** - One-on-one and group conversations
- **Rich Media Support** - Send images, videos, audio, and files
- **Message Reactions** - React to messages with emojis
- **Reply & Forward** - Reply to specific messages and forward content
- **Voice Messages** - Record and send audio messages
- **Read Receipts** - See when messages are delivered and read
- **Typing Indicators** - Real-time typing status

### Voice & Video Calls
- **HD Video Calls** - Crystal clear video calling powered by Jitsi Meet
- **Voice Calls** - High-quality audio calls
- **Group Video Calls** - Multi-participant conferences (up to 75 users)
- **Call History** - Track all calls with duration and participants
- **Incoming Call Notifications** - Real-time call alerts with ringtone
- **Participants List** - See who's in the call with mute status
- **Self-Hosted** - Deploy Jitsi locally for M2M networks

### Security & Privacy
- **End-to-End Encryption** - Messages encrypted client-side
- **Key Verification** - Verify encryption keys with security codes
- **User Blocking** - Block unwanted contacts
- **Password-Protected Keys** - Private keys encrypted with user password
- **Audit Trail** - Complete activity logging for compliance

### User Experience
- **Modern UI** - Clean, responsive design with Tailwind CSS
- **Dark/Light Mode** - Theme switching support
- **Online Status** - See who's online in real-time
- **Contact Management** - Add contacts by username
- **Search** - Find users and messages quickly
- **Notifications** - Real-time push notifications
- **RTL Support** - Full support for Arabic and other RTL languages

### Admin Dashboard
- **User Management** - View, add, edit, and delete users
- **Username Management** - Edit user usernames with validation
- **Activity Logs** - Track all user activities with filtering
- **Dashboard Statistics** - View total users, messages, and storage
- **Audit Trail** - Filter logs by type, date, and user
- **Send Notifications** - Push notifications to users

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- MySQL 8+ or TiDB
- Docker & Docker Compose (optional, for Jitsi Meet video calls)

### Installation

1. **Clone or extract the project**:
```bash
cd secure-chat-web
```

2. **Run the installation script**:
```bash
chmod +x install.sh
./install.sh
```

Or install manually:
```bash
pnpm install
```

3. **Configure environment** (see [ENV_SETUP.md](./ENV_SETUP.md)):
```bash
# Edit .env file with your configuration
nano .env
```

4. **Set up database**:
```bash
pnpm db:push
```

5. **Start development server**:
```bash
pnpm dev
```

6. **Access the application**:
- App: http://localhost:3000
- Admin: http://localhost:3000/admin

## 📁 Project Structure

```
secure-chat-web/
├── client/                 # Frontend React application
│   ├── public/            # Static assets
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── contexts/      # React contexts
│       ├── hooks/         # Custom React hooks
│       ├── lib/           # Utilities and libraries
│       └── pages/         # Page components
├── server/                # Backend Node.js application
│   ├── _core/            # Core server functionality
│   ├── db.ts             # Database queries
│   ├── routers.ts        # tRPC API routes
│   ├── activity-logger.ts # Activity logging
│   └── storage.ts        # File storage
├── drizzle/              # Database schema and migrations
│   └── schema.ts         # Database tables
├── shared/               # Shared types and constants
├── install.sh            # Installation script
├── DEPLOYMENT.md         # Deployment guide
├── ENV_SETUP.md          # Environment configuration guide
└── README.md             # This file
```

## 🛠️ Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **shadcn/ui** - Component library
- **tRPC** - Type-safe API client
- **Socket.IO** - Real-time communication
- **LiveKit** - Video/audio calls
- **Web Crypto API** - Client-side encryption

### Backend
- **Node.js** - Runtime environment
- **Express 4** - Web framework
- **tRPC 11** - Type-safe API
- **Drizzle ORM** - Database ORM
- **Socket.IO** - WebSocket server
- **MySQL/TiDB** - Database

### Security
- **RSA-2048** - Asymmetric encryption for key exchange
- **AES-GCM** - Symmetric encryption for messages
- **JWT** - Session management
- **bcrypt** - Password hashing

## 📚 Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [ENV_SETUP.md](./ENV_SETUP.md) - Environment configuration
- [todo.md](./todo.md) - Feature tracking and roadmap

## 🔐 Security Features

### End-to-End Encryption

Messages are encrypted on the sender's device and can only be decrypted by the recipient:

1. **Key Generation** - RSA-2048 key pairs generated on registration
2. **Key Exchange** - Public keys exchanged via server
3. **Message Encryption** - Messages encrypted with AES-GCM
4. **Key Verification** - Security codes prevent MITM attacks

### Key Verification

Users can verify their encryption keys by comparing:
- **QR Codes** - Scan to verify automatically
- **60-digit codes** - Compare codes manually

### Privacy Controls

- **User Blocking** - Block unwanted contacts
- **Read Receipts** - Control message read status
- **Online Status** - Hide your online status
- **Message Deletion** - Delete messages for everyone

## 🎯 Use Cases

- **Enterprise Communication** - Secure internal messaging
- **Healthcare** - HIPAA-compliant patient communication
- **Legal** - Attorney-client privileged communications
- **Finance** - Secure financial discussions
- **Personal** - Private conversations with friends and family

## 📊 Admin Dashboard

Access the admin dashboard at `/admin` to:

- Manage users and permissions
- View activity logs and audit trail
- Monitor system statistics
- Send notifications to users
- Track message counts and storage usage

Default admin credentials (change immediately):
- Username: `admin`
- Password: `admin` (configured in .env)

## 🔧 Development

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:push          # Push schema changes to database
pnpm db:studio        # Open Drizzle Studio

# Code Quality
pnpm lint             # Lint code
pnpm type-check       # TypeScript type checking
pnpm test             # Run tests
```

### Environment Variables

See [ENV_SETUP.md](./ENV_SETUP.md) for complete environment configuration guide.

## 🚢 Deployment

### Manus Platform (Recommended)

1. Create a checkpoint in Management UI
2. Click **Publish** button
3. Configure custom domain (optional)
4. Done!

### Traditional Hosting

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including:
- VPS/Cloud deployment
- Docker deployment
- PM2 process management
- Nginx configuration
- SSL setup

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

[Your License Here]

## 🆘 Support

For issues or questions:
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for troubleshooting
- Review [ENV_SETUP.md](./ENV_SETUP.md) for configuration help
- Open an issue on GitHub
- Contact support

## 🙏 Acknowledgments

Built with:
- [React](https://react.dev/)
- [tRPC](https://trpc.io/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [LiveKit](https://livekit.io/)
- [Socket.IO](https://socket.io/)

---

**Made with ❤️ for secure communication**
