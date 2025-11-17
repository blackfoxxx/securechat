import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  /** Unique username for user identification and adding contacts */
  username: varchar("username", { length: 50 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  /** Hashed password for local authentication */
  passwordHash: text("passwordHash"),
  /** Avatar URL */
  avatar: text("avatar"),
  /** User bio/status */
  bio: text("bio"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** Notification preferences stored as JSON */
  notificationPreferences: text("notificationPreferences"),
  /** Public key for E2EE (base64 encoded) */
  publicKey: text("publicKey"),
  /** Encrypted private key for E2EE (base64 encoded, encrypted with user's password-derived key) */
  encryptedPrivateKey: text("encryptedPrivateKey"),
  /** Salt for key derivation (base64 encoded) */
  keySalt: text("keySalt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Chat-related tables
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["direct", "group"]).notNull(),
  name: varchar("name", { length: 255 }),
  avatarUrl: text("avatarUrl"),
  createdBy: int("createdBy"), // User ID of group creator
  wallpaper: text("wallpaper"), // URL to custom wallpaper image
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const conversationMembers = mysqlTable("conversation_members", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  userId: int("userId").notNull(),
  isArchived: int("isArchived").default(0).notNull(), // 1 if archived by this user
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  senderId: int("senderId").notNull(),
  content: text("content"),
  fileUrl: text("fileUrl"),
  fileName: varchar("fileName", { length: 255 }),
  fileType: varchar("fileType", { length: 100 }),
  fileSize: int("fileSize"),
  thumbnailUrl: text("thumbnailUrl"),
  audioDuration: int("audioDuration"), // Duration in seconds for voice messages
  readBy: text("readBy"), // JSON array of user IDs who have read the message
  reactions: text("reactions"), // JSON object mapping emoji to user IDs: {"👍": [1, 2], "❤️": [3]}
  replyToId: int("replyToId"), // ID of the message being replied to
  isStarred: int("isStarred").default(0).notNull(), // 1 if starred
  /** Encrypted content (replaces plaintext content for E2EE messages) */
  encryptedContent: text("encryptedContent"),
  /** Initialization vector for encryption (base64 encoded) */
  iv: text("iv"),
  /** Encrypted symmetric key for this message (base64 encoded) */
  encryptedKey: text("encryptedKey"),
  /** Sender's public key fingerprint for verification */
  senderKeyFingerprint: varchar("senderKeyFingerprint", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contactUserId: int("contactUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Contact = typeof contacts.$inferSelect;

export const blockedUsers = mysqlTable("blocked_users", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // User who blocked
  blockedUserId: int("blockedUserId").notNull(), // User who was blocked
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlockedUser = typeof blockedUsers.$inferSelect;
export type InsertBlockedUser = typeof blockedUsers.$inferInsert;

export const keyVerifications = mysqlTable("key_verifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // User who verified
  contactUserId: int("contactUserId").notNull(), // Contact being verified
  verifiedKeyFingerprint: varchar("verifiedKeyFingerprint", { length: 64 }).notNull(), // Fingerprint at time of verification
  isVerified: int("isVerified").default(1).notNull(), // 1 if verified, 0 if key changed
  verifiedAt: timestamp("verifiedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KeyVerification = typeof keyVerifications.$inferSelect;
export type InsertKeyVerification = typeof keyVerifications.$inferInsert;

// Activity logs table for audit trail
export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  activityType: mysqlEnum("activityType", [
    "login",
    "logout",
    "register",
    "message_sent",
    "message_deleted",
    "file_uploaded",
    "contact_added",
    "contact_blocked",
    "contact_unblocked",
    "group_created",
    "group_joined",
    "group_left",
    "profile_updated",
    "password_changed",
  ]).notNull(),
  details: text("details"), // JSON string with additional context
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 or IPv6
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
// Call history table for tracking video/audio calls
export const callHistory = mysqlTable("call_history", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  callType: mysqlEnum("callType", ["video", "audio"]).notNull().default("video"),
  initiatedBy: int("initiatedBy").notNull(), // User ID who started the call
  startedAt: timestamp("startedAt").notNull().defaultNow(),
  endedAt: timestamp("endedAt"),
  duration: int("duration"), // Duration in seconds, calculated when call ends
  roomName: varchar("roomName", { length: 255 }).notNull(), // Jitsi room name
  status: mysqlEnum("status", ["ongoing", "completed", "missed", "failed"]).notNull().default("ongoing"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Call participants junction table
export const callParticipants = mysqlTable("call_participants", {
  id: int("id").autoincrement().primaryKey(),
  callId: int("callId").notNull(),
  userId: int("userId").notNull(),
  joinedAt: timestamp("joinedAt").notNull().defaultNow(),
  leftAt: timestamp("leftAt"),
  duration: int("duration"), // Individual participant duration in seconds
});

export type CallHistory = typeof callHistory.$inferSelect;
export type InsertCallHistory = typeof callHistory.$inferInsert;
export type CallParticipant = typeof callParticipants.$inferSelect;
export type InsertCallParticipant = typeof callParticipants.$inferInsert;
