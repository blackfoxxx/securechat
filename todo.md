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


## Typing Indicators

- [x] Backend: Add Socket.IO events for typing start/stop
- [x] Backend: Broadcast typing events to conversation participants
- [x] Frontend: Emit typing events when user types in message input
- [x] Frontend: Display "User is typing..." indicator in chat room
- [x] Frontend: Auto-clear typing indicator after timeout
- [x] Frontend: Debounce typing events to reduce network traffic


## File and Image Sharing

- [x] Update database schema to support file attachments in messages
- [x] Backend: Add file upload endpoint with S3 storage
- [x] Backend: Generate thumbnails for image files
- [x] Backend: Store file metadata (name, size, type, URL)
- [x] Frontend: Add file picker button to chat input
- [x] Frontend: Implement drag-and-drop file upload
- [x] Frontend: Show file upload progress indicator
- [x] Frontend: Display image thumbnails in chat messages
- [x] Frontend: Display file icons and download buttons for documents
- [x] Frontend: Add image preview/lightbox on click
- [x] Frontend: Validate file size and type before upload


## Voice Messages

- [x] Frontend: Add microphone button to chat input
- [x] Frontend: Implement audio recording with MediaRecorder API
- [x] Frontend: Show recording indicator with timer
- [x] Frontend: Add cancel and send buttons during recording
- [x] Frontend: Display voice message waveform in chat bubbles
- [x] Frontend: Add play/pause controls for voice messages
- [x] Backend: Accept audio file uploads (WebM/MP3 format)
- [x] Backend: Store voice messages in S3
- [x] Backend: Track audio duration metadata

## Group Chat Functionality

- [x] Update database schema for group conversations
- [x] Backend: Create group conversation endpoint
- [x] Backend: Add/remove group members endpoints
- [ ] Backend: Update group name and avatar endpoints
- [x] Frontend: Create new group dialog
- [x] Frontend: Select multiple contacts for group
- [x] Frontend: Set group name and avatar
- [ ] Frontend: Group chat UI with member list
- [ ] Frontend: Add members to existing group
- [ ] Frontend: Remove members from group (admin only)
- [ ] Frontend: Leave group functionality
- [ ] Frontend: Show group member count in chat list
