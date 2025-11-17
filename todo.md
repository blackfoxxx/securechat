# Secure Chat Web - TODO

## Core Features

- [x] Database schema for users, conversations, messages
- [x] User authentication and profile management
- [x] Chat list view with conversations
- [x] Real-time messaging with Socket.IO integration
- [ ] Message encryption/decryption (E2EE foundation)
- [x] Typing indicators and presence status
- [x] Audio/video calling with LiveKit
- [x] Contact management and user search
- [x] Group chat functionality
- [x] RTL support for Arabic language
- [x] Internationalization (English and Arabic)
- [x] File upload and media sharing
- [x] Message read receipts and delivery status


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
- [x] Send notifications to specific users
- [x] Send broadcast notifications to all users
- [x] User search and filtering
- [ ] Export user data to CSV
- [ ] User activity logs

## New Features - WhatsApp-like Features

- [ ] Status/Stories feature
- [x] Voice message recording and playback
- [ ] Media gallery (photos, videos)
- [x] Document sharing
- [ ] Contact sync
- [x] Message forwarding
- [x] Message reply/quote
- [x] Message reactions (emoji)
- [ ] Archived chats
- [ ] Starred messages
- [ ] Chat wallpaper customization


## Bug Fixes

- [x] Fix /chats route returning 404 error


## New Features - User System & Profile

- [x] User registration with email and password
- [x] Username setup page (unique username validation)
- [x] Update database schema to include username field
- [x] Profile page with avatar upload
- [x] Profile page with notification preferences
- [x] Username-based contact search
- [x] Add contacts by username functionality
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


## Message Read Receipts

- [x] Update database schema to track message read status
- [x] Backend: Add Socket.IO event for message read
- [x] Backend: Track which users have read which messages
- [x] Frontend: Emit read event when user views conversation
- [x] Frontend: Display single checkmark for sent messages
- [x] Frontend: Display double checkmark for delivered messages
- [x] Frontend: Display blue double checkmark for read messages
- [x] Frontend: Update checkmarks in real-time via Socket.IO

## Message Context Menu & Forwarding

- [x] Frontend: Add context menu component (right-click/long-press)
- [x] Frontend: Show context menu on message interaction
- [x] Frontend: Add "Forward" option to context menu
- [x] Frontend: Add "Copy" option to context menu
- [x] Frontend: Add "Delete" option to context menu
- [x] Frontend: Create forward dialog to select conversations
- [x] Backend: Add delete message endpoint
- [x] Frontend: Implement copy to clipboard functionality
- [x] Frontend: Handle message forwarding to multiple chats


## Bug Fixes

- [x] Fix SQL query error in getUserConversations function


## Remaining Features to Implement

- [ ] Status/Stories feature - post photos/videos that disappear after 24 hours
- [ ] Media gallery - view all photos and videos from a conversation
- [ ] Contact sync - sync contacts from device
- [x] Message reply/quote - reply to specific messages with context
- [ ] Archived chats - archive conversations to hide from main list
- [ ] Starred messages - bookmark important messages
- [ ] Chat wallpaper customization - set custom backgrounds for chats


## Admin Authentication

- [x] Add admin login page with username/password
- [x] Create admin authentication middleware
- [x] Protect /admin route with authentication
- [x] Store admin credentials securely
- [x] Add session management for admin users


## Security Improvements

- [x] Move admin credentials to environment variables
- [x] Update admin login to use environment variables
- [x] Document environment variables in README


## Bug Fixes

- [x] Fix setState during render error in AdminDashboard


## User Blocking Feature

- [x] Create blocked_users database table
- [x] Add block/unblock endpoints to backend
- [x] Add Block User option in contact modal
- [x] Create blocked users list page
- [x] Prevent blocked users from sending messages
- [x] Add unblock functionality in blocked users list
- [x] Add blocked users button in chat list


## End-to-End Encryption (E2EE) Implementation

- [x] Update database schema to store user encryption keys
- [x] Create crypto utility functions for key generation
- [x] Implement AES-GCM encryption/decryption functions
- [x] Generate key pairs on user registration/login
- [x] Store encryption keys securely in database
- [x] Implement key exchange for conversations (getPublicKeys endpoint)
- [x] Add E2EE fields to message schema (encryptedContent, iv, encryptedKey)
- [x] Update message display to show encryption status
- [x] Add encryption indicators in UI
- [ ] Complete E2EE message encryption flow in ChatRoom
- [ ] Complete E2EE message decryption flow in ChatRoom
- [ ] Handle key rotation and rekeying
- [ ] Add E2EE unlock dialog for entering password


## Key Verification Feature (Security Codes)

- [x] Add key verification table to database schema
- [x] Create security code generation utility
- [x] Generate QR codes from key fingerprints
- [x] Build KeyVerificationDialog component
- [x] Add verification button in chat/contact UI
- [x] Display verification status indicators
- [x] Track verified contacts in database
- [x] Show alerts when contact keys change
- [x] Add numeric security code display
- [ ] Implement QR code scanning (optional)


## Admin Dashboard Improvements

- [x] Add logout button to admin dashboard header
- [x] Add username column to user management table
- [x] Implement inline username editing in user management
- [x] Add username update API endpoint with validation
- [x] Ensure username uniqueness validation
- [x] Add success/error feedback for username updates


## Audit Trail Feature

- [x] Create activity_logs database table
- [x] Define activity types enum (login, logout, message_sent, file_upload, etc.)
- [x] Implement activity logging helper functions
- [x] Create API endpoint to fetch activity logs with filters
- [x] Add date range filtering for logs
- [x] Add user filtering for logs
- [x] Build Audit Trail tab UI in admin dashboard
- [x] Create activity logs table component
- [x] Add date picker for filtering
- [x] Integrate logging into message sending
- [x] Integrate logging into message deletion
- [x] Add activity type badges and icons
- [x] Implement pagination for large log datasets
- [ ] Integrate logging into login/logout flows (requires OAuth callback modification)
- [ ] Integrate logging into file uploads
- [ ] Integrate logging into contact operations
