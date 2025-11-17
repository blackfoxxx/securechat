# Secure Chat Web - TODO

## Core Features

- [x] Database schema for users, conversations, messages
- [x] User authentication and profile management
- [x] Chat list view with conversations
- [ ] Real-time messaging with Socket.IO integration
- [ ] Message encryption/decryption (E2EE foundation)
- [ ] Typing indicators and presence status
- [x] Audio/video calling with LiveKit
- [ ] Contact management and user search
- [ ] Group chat functionality
- [x] RTL support for Arabic language
- [x] Internationalization (English and Arabic)
- [ ] File upload and media sharing
- [ ] Message read receipts and delivery status


## New Features - Admin Dashboard

- [x] Admin role-based access control
- [x] Admin dashboard layout with sidebar navigation
- [x] User management - view all users list
- [x] User management - add new users
- [ ] User management - edit user details
- [x] User management - delete/deactivate users
- [x] User analytics - last active timestamp
- [x] User analytics - storage used calculation
- [x] User analytics - message count statistics
- [x] User analytics - online/offline status
- [ ] Send notifications to specific users
- [ ] Send broadcast notifications to all users
- [x] User search and filtering
- [ ] Export user data to CSV
- [ ] User activity logs

## New Features - WhatsApp-like Features

- [ ] Status/Stories feature
- [ ] Voice message recording and playback
- [ ] Media gallery (photos, videos)
- [ ] Document sharing
- [ ] Contact sync
- [ ] Message forwarding
- [ ] Message reply/quote
- [ ] Message reactions (emoji)
- [ ] Archived chats
- [ ] Starred messages
- [ ] Chat wallpaper customization


## Bug Fixes

- [x] Fix /chats route returning 404 error


## New Features - User System & Profile

- [ ] User registration with email and password
- [ ] Username setup page (unique username validation)
- [x] Update database schema to include username field
- [x] Profile page with avatar upload
- [x] Profile page with notification preferences
- [x] Username-based contact search
- [ ] Add contacts by username functionality
- [x] Message search in chat list
- [x] Filter conversations by contact name or message content


## Implementation Tasks

- [x] Create username setup/onboarding page
- [x] Real-time username availability checking
- [x] Contact discovery modal with search
- [x] Add contact by username functionality
- [x] Registration page with email/password
- [x] Backend authentication for local registration
- [x] Password hashing with bcrypt


## Real-time Online Status

- [x] Backend: Track user online/offline status with Socket.IO
- [x] Backend: Emit presence events when users connect/disconnect
- [x] Frontend: Subscribe to presence events in SocketContext
- [x] Frontend: Display online indicators in chat list
- [x] Frontend: Display online indicators in contact modal
- [ ] Frontend: Update user's lastActive timestamp
