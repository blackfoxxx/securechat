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
- [x] Complete E2EE message encryption flow in ChatRoom
- [x] Complete E2EE message decryption flow in ChatRoom
- [ ] Handle key rotation and rekeying
- [x] Add E2EE unlock dialog for entering password


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


## Offline/Self-Hosted Conversion (M2M Deployment)

- [ ] Remove Manus OAuth dependency
- [ ] Implement local username/password authentication
- [ ] Update login/register pages for local auth
- [ ] Remove OAuth callback routes
- [ ] Replace LiveKit with self-hosted Jitsi Meet
- [ ] Update video call components for Jitsi
- [ ] Add Jitsi Meet server setup instructions
- [ ] Replace S3 storage with local filesystem
- [ ] Update file upload/download to use local storage
- [ ] Create uploads directory structure
- [ ] Remove external API dependencies (LLM, Forge API)
- [ ] Remove analytics dependencies
- [ ] Update environment configuration for offline mode
- [ ] Create Docker Compose for full stack deployment
- [ ] Add Jitsi Meet to Docker Compose
- [ ] Add MySQL to Docker Compose
- [ ] Create offline deployment guide
- [ ] Create network isolation testing guide
- [ ] Update installation script for offline mode


## Android Mobile App Development

- [ ] Initialize React Native project
- [ ] Configure Android build settings
- [ ] Set up React Navigation for mobile
- [ ] Create authentication screens (Login, Register)
- [ ] Create chat list screen
- [ ] Create chat room screen
- [ ] Implement Socket.IO client for React Native
- [ ] Port E2EE crypto utilities (react-native-crypto)
- [ ] Implement message encryption/decryption
- [ ] Add key verification feature
- [ ] Integrate camera for photos
- [ ] Add file picker for attachments
- [ ] Implement local notifications
- [ ] Add contact management screens
- [ ] Create user profile screen
- [ ] Add settings screen
- [ ] Configure M2M network connectivity
- [ ] Test offline functionality
- [ ] Generate release APK
- [ ] Create installation guide
- [ ] Document API endpoint configuration


## Jitsi Meet Video Call Integration

- [x] Remove LiveKit dependency from package.json
- [x] Update VideoCall component for Jitsi Meet
- [x] Add Jitsi Meet iframe integration
- [x] Configure Jitsi server URL (environment variable)
- [x] Add call initiation button in ChatRoom
- [x] Generate unique room names for calls
- [x] Create Docker Compose for Jitsi Meet
- [x] Configure Jitsi for M2M network
- [x] Add Jitsi setup documentation
- [x] Document offline deployment process
- [ ] Add call notification system
- [ ] Test video calls on local network


## Call History Feature

- [x] Create call_history database table
- [x] Add call participants junction table
- [x] Create API endpoint to start call session
- [x] Create API endpoint to end call session
- [x] Create API endpoint to get call history
- [x] Add call logging to VideoCall component
- [x] Track call start time automatically
- [x] Track call end time and calculate duration
- [x] Create CallHistory UI component
- [x] Display call history in chat rooms
- [x] Show call duration in human-readable format
- [x] Add call statistics (total calls, average duration)
- [x] Add call type indicator (video/audio)
- [x] Add History button in chat header
- [x] Display call history in dialog
- [ ] Implement call history filtering


## Call Notification System

- [x] Add Socket.IO call events (call:initiate, call:accept, call:decline, call:cancel)
- [x] Create IncomingCallModal component
- [x] Add caller information display (name, avatar)
- [x] Add accept/decline buttons
- [x] Add ringtone audio for incoming calls
- [x] Implement call timeout (30 seconds)
- [x] Add call notification state to SocketContext
- [x] Update ChatRoom to send call request via Socket.IO
- [x] Handle call acceptance and navigation
- [x] Handle call decline notification
- [x] Handle recipient offline notification
- [x] Add call cancellation after timeout
- [x] Create ringtone setup guide
- [ ] Add actual ringtone.mp3 file
- [ ] Prevent duplicate simultaneous calls
- [ ] Add call busy state handling


## Group Video Calls Feature

- [x] Update call_history table to support group calls
- [x] Add isGroupCall flag to call records
- [x] Update Socket.IO events for multiple recipients
- [x] Create group call initiation logic
- [x] Add "Start Group Call" button in group chats
- [x] Create ParticipantsList UI component
- [x] Show active participants in video call
- [x] Update VideoCall page with participants tracking
- [x] Track all participants in call history
- [x] Add participant count display
- [x] Handle participant audio/video mute states display
- [x] Add toggle participants panel button
- [ ] Implement real-time participant join/leave tracking
- [ ] Test group calls with multiple users


## Installation Script & Documentation Updates

- [x] Update install.sh with Jitsi Meet setup
- [x] Add Docker and Docker Compose checks
- [x] Create .env.template with all new variables
- [x] Add Jitsi configuration to install script
- [x] Update README.md with complete feature list
- [ ] Update DEPLOYMENT.md with group calls info
- [ ] Create quick start guide for M2M deployment
- [ ] Test installation script on fresh system


## File Management & Storage Quotas

- [x] Add storage quota fields to users table
- [x] Create system_settings table for global configuration
- [x] Add file size tracking to messages table (already existed)
- [x] Create API endpoint for global file settings
- [x] Create API endpoint for user quota management
- [x] Create API endpoint for storage statistics
- [x] Build File Management tab in admin dashboard
- [x] Add global settings UI (max file size, allowed types)
- [x] Add user quota management UI with usage bars
- [x] Add storage statistics dashboard
- [x] Implement quota check before file upload
- [x] Add file type validation
- [x] Add quota exceeded error handling
- [x] Track storage usage on upload
- [x] Track storage usage on file deletion
- [ ] Show quota usage to regular users (not just admin)
- [ ] Add file management documentation


## Security Settings (Change Password & 2FA)

- [x] Investigate current security settings page implementation
- [x] Add password field to users table (already existed as passwordHash)
- [x] Create change password API endpoint
- [x] Implement password validation (old password check)
- [x] Add password strength requirements
- [x] Create change password UI component (ChangePasswordDialog)
- [x] Add 2FA fields to users table (twoFactorEnabled, twoFactorSecret)
- [x] Install speakeasy library for TOTP generation
- [x] Create 2FA setup API endpoint
- [x] Create 2FA verify API endpoint
- [x] Create 2FA disable API endpoint
- [x] Build 2FA setup UI with QR code (TwoFactorAuthDialog)
- [x] Connect security dialogs to Profile page buttons
- [ ] Add 2FA verification during login
- [ ] Test password change functionality
- [ ] Test 2FA setup and verification


## Bug Fix: CreateGroupDialog Error

- [x] Investigate CreateGroupDialog component error
- [x] Fix TypeError: Cannot read properties of undefined (reading 'id')
- [x] Add proper null checks for user data
- [ ] Test group creation functionality


## Voice Message Recording Feature

- [ ] Create useVoiceRecorder hook with MediaRecorder API
- [ ] Implement hold-to-record functionality
- [ ] Add recording timer and duration tracking
- [ ] Record audio in WebM format
- [ ] Create VoiceRecorder UI component
- [ ] Add microphone button in chat input
- [ ] Show recording UI with waveform visualization
- [ ] Add cancel and send recording options
- [ ] Create VoiceMessagePlayer component
- [ ] Add play/pause controls
- [ ] Add progress bar and duration display
- [ ] Integrate voice recording into ChatRoom
- [ ] Update message display for voice messages
- [ ] Add voice message type to database
- [ ] Test voice recording and playback


## Complete E2EE Implementation

- [x] Create E2EE unlock dialog component for password entry
- [x] Implement private key decryption with user password
- [x] Add E2EE toggle in chat room header
- [x] Complete message encryption flow in sendMessage
- [x] Implement automatic key exchange for new conversations
- [x] Complete message decryption flow in message display
- [x] Add E2EE status indicators in message bubbles
- [x] Handle encryption errors gracefully with fallback
- [x] Add E2EE setup wizard for first-time users
- [x] Store encrypted private key securely in localStorage
- [x] Implement key derivation from user password (PBKDF2)
- [ ] Add re-encryption on password change


## E2EE Setup Wizard

- [x] Create multi-step wizard component with progress indicator
- [x] Design welcome/introduction step explaining E2EE benefits
- [x] Implement password creation step with strength validator
- [x] Add password confirmation and matching validation
- [x] Create recovery code generation (12-word mnemonic or 8 codes)
- [x] Display recovery codes with copy and download options
- [x] Add recovery code confirmation step (verify user saved codes)
- [x] Implement key generation step with loading indicator
- [x] Store encrypted private key and recovery codes in database
- [x] Add completion step with success message
- [x] Integrate wizard into registration flow for new users
- [x] Add "Enable E2EE" button in profile/settings for existing users
- [x] Create skip option with warning about security implications
- [x] Add wizard re-trigger for users who skipped initial setup


## User Search with Auto-Complete and Direct Chat

- [x] Create user search API endpoint with username/name matching
- [x] Implement auto-complete dropdown component
- [x] Add debounced search input to prevent excessive API calls
- [x] Display user results with avatar, name, and username
- [x] Add "Start Chat" action on search results
- [x] Create or find existing conversation when starting chat
- [x] Navigate to chat room after conversation creation
- [x] Handle empty search states and no results
- [x] Add keyboard navigation for search results (arrow keys, enter)
- [x] Integrate search into ChatList page
- [x] Remove requirement to add contact before chatting


## Real-Time Typing Indicators and Enhanced Read Receipts

- [x] Add Socket.IO typing events (typing:start, typing:stop)
- [x] Implement typing indicator debounce logic on client
- [x] Create TypingIndicator UI component with animated dots
- [x] Add typing state management in ChatRoom
- [x] Broadcast typing events to conversation members
- [x] Display "User is typing..." indicator in chat
- [x] Handle multiple users typing simultaneously
- [x] Auto-stop typing indicator after timeout
- [x] Enhance read receipts with "seen by" user list
- [x] Add timestamps to read receipts
- [x] Display user avatars in group chat read receipts
- [x] Create ReadReceipts component for message footer
- [x] Show read receipt details on hover/click
- [x] Update message read status in real-time via Socket.IO


## Bug Fixes: User Search and Direct Chat

- [x] Debug user search endpoint - check if it's returning results
- [x] Fix auto-complete dropdown not showing results
- [x] Fix user selection from auto-complete
- [x] Debug createOrGetConversation endpoint
- [x] Fix direct chat creation without adding to contacts
- [x] Test search with different usernames
- [x] Verify conversation navigation after creation


## Debug Search Not Working

- [x] Check server logs for SQL errors
- [x] Test searchUsers endpoint with direct query
- [x] Fix SQL syntax in search query
- [x] Verify search results are returned
- [x] Check frontend is receiving results
- [x] Test auto-complete dropdown display


## Fix Search Not Finding "blackfoxxx"

- [x] Verify username "blackfoxxx" exists in database
- [x] Test search query with this specific username
- [x] Check if search is case-sensitive issue
- [x] Fix search to find all usernames correctly


## Fix E2EEProvider Missing Error

- [x] Locate E2EEProvider component
- [x] Add E2EEProvider to App.tsx provider hierarchy
- [x] Verify ChatRoom can access useE2EE hook
- [x] Test chat functionality works without errors
