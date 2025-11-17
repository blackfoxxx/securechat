import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
        publicKey: z.string().optional(),
        encryptedPrivateKey: z.string().optional(),
        keySalt: z.string().optional(),
        keyIv: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { registerUser } = await import("./db");
        return registerUser(input);
      }),
  }),

  chat: router({
    conversations: protectedProcedure.query(async ({ ctx }) => {
      const { getUserConversations } = await import("./db");
      return getUserConversations(ctx.user.id);
    }),
    
    // Create or get existing direct conversation with a user
    createOrGetConversation: protectedProcedure
      .input(z.object({ otherUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { conversations, conversationMembers } = await import("../drizzle/schema");
        const { eq, and, inArray } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        
        // Check if conversation already exists between these two users
        // Find all direct conversations the current user is in
        const userConversations = await db
          .select({ conversationId: conversationMembers.conversationId })
          .from(conversationMembers)
          .where(eq(conversationMembers.userId, ctx.user.id));
        
        const conversationIds = userConversations.map(c => c.conversationId);
        
        if (conversationIds.length > 0) {
          // Check which of these conversations are direct (not group)
          const directConversations = await db
            .select({ id: conversations.id })
            .from(conversations)
            .where(
              and(
                inArray(conversations.id, conversationIds),
                eq(conversations.type, 'direct')
              )
            );
          
          // For each direct conversation, check if the other user is in it
          for (const conv of directConversations) {
            const members = await db
              .select({ userId: conversationMembers.userId })
              .from(conversationMembers)
              .where(eq(conversationMembers.conversationId, conv.id));
            
            const memberIds = members.map(m => m.userId);
            
            // If this conversation has exactly 2 members and includes both users
            if (memberIds.length === 2 && 
                memberIds.includes(ctx.user.id) && 
                memberIds.includes(input.otherUserId)) {
              return { conversationId: conv.id, isNew: false };
            }
          }
        }
        
        // No existing conversation found, create new one
        const [newConversation] = await db
          .insert(conversations)
          .values({
            type: 'direct',
            createdBy: ctx.user.id,
          });
        
        const conversationId = Number(newConversation.insertId);
        
        // Add both users as members
        await db.insert(conversationMembers).values([
          { conversationId, userId: ctx.user.id },
          { conversationId, userId: input.otherUserId },
        ]);
        
        return { conversationId, isNew: true };
      }),
    messages: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "conversationId" in val) {
          return val as { conversationId: number };
        }
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        const { getConversationMessages } = await import("./db");
        return getConversationMessages(input.conversationId);
      }),
    sendMessage: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "conversationId" in val) {
          return val as { 
            conversationId: number; 
            content?: string; 
            type?: string;
            fileUrl?: string;
            fileName?: string;
            fileType?: string;
            fileSize?: number;
            thumbnailUrl?: string;
            audioDuration?: number;
            replyToId?: number;
            encryptedContent?: string;
            iv?: string;
            encryptedKey?: string;
            senderKeyFingerprint?: string;
          };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        // Check if user is blocked before sending message
        const { getDb } = await import("./db");
        const db = await getDb();
        if (db) {
          const { blockedUsers, conversationMembers } = await import("../drizzle/schema");
          const { eq, and, or, inArray } = await import("drizzle-orm");
          
          // Get all members of the conversation
          const members = await db
            .select({ userId: conversationMembers.userId })
            .from(conversationMembers)
            .where(eq(conversationMembers.conversationId, input.conversationId));
          
          const memberIds = members.map(m => m.userId).filter(id => id !== ctx.user.id);
          
          // Check if current user is blocked by any member or has blocked any member
          if (memberIds.length > 0) {
            const blockExists = await db
              .select({ id: blockedUsers.id })
              .from(blockedUsers)
              .where(
                or(
                  and(
                    eq(blockedUsers.userId, ctx.user.id),
                    inArray(blockedUsers.blockedUserId, memberIds)
                  ),
                  and(
                    inArray(blockedUsers.userId, memberIds),
                    eq(blockedUsers.blockedUserId, ctx.user.id)
                  )
                )
              )
              .limit(1);
            
            if (blockExists.length > 0) {
              throw new TRPCError({ 
                code: "FORBIDDEN", 
                message: "Cannot send message: user is blocked" 
              });
            }
          }
        }
        
        const { createMessage } = await import("./db");
        const result = await createMessage({
          conversationId: input.conversationId,
          senderId: ctx.user.id,
          content: input.content,
          type: input.type,
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
          thumbnailUrl: input.thumbnailUrl,
          audioDuration: input.audioDuration,
          replyToId: input.replyToId,
        });
        
        // Log activity
        const { logMessageSent } = await import("./activity-logger");
        await logMessageSent(ctx.user.id, {
          conversationId: input.conversationId,
          messageType: input.type || "text",
        });
        
        return result;
      }),

    addReaction: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "messageId" in val && "emoji" in val) {
          return val as { messageId: number; emoji: string };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        const { addMessageReaction } = await import("./db");
        return addMessageReaction(input.messageId, ctx.user.id, input.emoji);
      }),

    removeReaction: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "messageId" in val && "emoji" in val) {
          return val as { messageId: number; emoji: string };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        const { removeMessageReaction } = await import("./db");
        return removeMessageReaction(input.messageId, ctx.user.id, input.emoji);
      }),

    deleteMessage: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "messageId" in val) {
          return val as { messageId: number };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { messages, users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        // Get message to check if it has a file
        const messageResult = await db.select().from(messages).where(eq(messages.id, input.messageId)).limit(1);
        if (messageResult.length > 0) {
          const message = messageResult[0];
          
          // If message has a file, update storage usage
          if (message.fileSize && message.fileSize > 0 && message.senderId === ctx.user.id) {
            const userResult = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
            if (userResult.length > 0) {
              const currentUsage = userResult[0].storageUsed || 0;
              const newUsage = Math.max(0, currentUsage - message.fileSize);
              await db.update(users)
                .set({ storageUsed: newUsage })
                .where(eq(users.id, ctx.user.id));
            }
          }
        }
        
        const { deleteMessage } = await import("./db");
        const result = await deleteMessage(input.messageId, ctx.user.id);
        
        // Log activity
        const { logMessageDeleted } = await import("./activity-logger");
        await logMessageDeleted(ctx.user.id, {
          messageId: input.messageId,
          conversationId: 0, // We don't have conversationId here, could be improved
        });
        
        return result;
      }),

    createGroup: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "name" in val && "memberIds" in val) {
          return val as { name: string; memberIds: number[] };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        const { createGroupConversation } = await import("./db");
        return createGroupConversation({
          name: input.name,
          createdBy: ctx.user.id,
          memberIds: [...input.memberIds, ctx.user.id], // Include creator
        });
      }),

    uploadFile: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "fileName" in val && "fileType" in val && "fileData" in val) {
          return val as { fileName: string; fileType: string; fileSize: number; fileData: string };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { users, systemSettings } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        // Get system settings
        const settings = await db.select().from(systemSettings);
        const settingsObj: Record<string, any> = {};
        settings.forEach(setting => {
          try {
            settingsObj[setting.key] = JSON.parse(setting.value);
          } catch {
            settingsObj[setting.key] = setting.value;
          }
        });
        
        const maxFileSize = settingsObj.maxFileSize || 10485760; // 10MB default
        const defaultStorageQuota = settingsObj.defaultStorageQuota || 1073741824; // 1GB default
        const allowedFileTypes = settingsObj.allowedFileTypes || ['image/*', 'video/*', 'audio/*', 'application/pdf', 'application/zip'];
        
        // Check file size limit
        if (input.fileSize > maxFileSize) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: `File size exceeds maximum allowed size of ${Math.round(maxFileSize / 1048576)}MB` 
          });
        }
        
        // Check file type
        const isAllowedType = allowedFileTypes.some((pattern: string) => {
          if (pattern.endsWith('/*')) {
            const prefix = pattern.slice(0, -2);
            return input.fileType.startsWith(prefix);
          }
          return input.fileType === pattern;
        });
        
        if (!isAllowedType) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "File type not allowed" 
          });
        }
        
        // Get user's current storage usage and quota
        const userResult = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
        if (userResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        
        const user = userResult[0];
        const userQuota = user.storageQuota || defaultStorageQuota;
        const currentUsage = user.storageUsed || 0;
        
        // Check if user has enough quota
        if (currentUsage + input.fileSize > userQuota) {
          const availableSpace = userQuota - currentUsage;
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: `Storage quota exceeded. Available: ${Math.round(availableSpace / 1048576)}MB, Required: ${Math.round(input.fileSize / 1048576)}MB` 
          });
        }
        
        const { storagePut } = await import("./storage");
        
        // Decode base64 file data
        const fileBuffer = Buffer.from(input.fileData, 'base64');
        
        // Generate unique file key
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileKey = `chat-files/${ctx.user.id}/${timestamp}-${randomSuffix}-${input.fileName}`;
        
        // Upload to S3
        const { url } = await storagePut(fileKey, fileBuffer, input.fileType);
        
        // Update user's storage usage
        await db.update(users)
          .set({ storageUsed: currentUsage + input.fileSize })
          .where(eq(users.id, ctx.user.id));
        
        // Generate thumbnail for images
        let thumbnailUrl = null;
        if (input.fileType.startsWith('image/')) {
          thumbnailUrl = url; // For now, use the same URL
        }
        
        return {
          fileUrl: url,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
          thumbnailUrl,
        };
      }),
  }),
  contacts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getUserContacts } = await import("./db");
      return getUserContacts(ctx.user.id);
    }),
    add: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { addUserContact } = await import("./db");
        return addUserContact(ctx.user.id, input.contactId);
      }),
  }),
  
  // User router
  user: router({    
    updateProfile: protectedProcedure
      .input(z.object({
        username: z.string().min(3).max(50).optional(),
        name: z.string().optional(),
        bio: z.string().optional(),
        avatar: z.string().url().optional().or(z.literal("")),
      }))
      .mutation(async ({ input, ctx }) => {
        const { updateUserProfile } = await import("./db");
        return updateUserProfile(ctx.user.id, input);
      }),
    
    updateNotifications: protectedProcedure
      .input(z.object({
        messageNotifications: z.boolean(),
        callNotifications: z.boolean(),
        groupNotifications: z.boolean(),
        soundEnabled: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { updateUserNotifications } = await import("./db");
        return updateUserNotifications(ctx.user.id, input);
      }),
    
    checkUsername: protectedProcedure
      .input(z.object({ username: z.string() }))
      .query(async ({ input }) => {
        const { checkUsernameAvailable } = await import("./db");
        return checkUsernameAvailable(input.username);
      }),
    
    searchByUsername: protectedProcedure
      .input(z.object({ username: z.string() }))
      .query(async ({ input }) => {
        const { searchUserByUsername } = await import("./db");
        return searchUserByUsername(input.username);
      }),
    
    // Enhanced search for auto-complete
    searchUsers: protectedProcedure
      .input(z.object({ 
        query: z.string().min(1),
        limit: z.number().default(10),
      }))
      .query(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const { users } = await import("../drizzle/schema");
        const { or, like, ne } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        
        // Search by username or name, exclude current user
        const results = await db
          .select({
            id: users.id,
            username: users.username,
            name: users.name,
            avatar: users.avatar,
            bio: users.bio,
          })
          .from(users)
          .where(
            or(
              like(users.username, `%${input.query}%`),
              like(users.name, `%${input.query}%`)
            )
          )
          .limit(input.limit);
        
        // Filter out current user from results
        return results.filter(u => u.id !== ctx.user.id);
      }),
    
    getPublicKeys: protectedProcedure
      .input(z.object({ userIds: z.array(z.number()) }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return [];
        const { users } = await import("../drizzle/schema");
        const { inArray } = await import("drizzle-orm");
        
        const result = await db
          .select({
            id: users.id,
            publicKey: users.publicKey,
          })
          .from(users)
          .where(inArray(users.id, input.userIds));
        
        return result;
      }),
    
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const bcrypt = await import("bcryptjs");
        
        // Get user's current password hash
        const userResult = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
        if (userResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        
        const user = userResult[0];
        if (!user.passwordHash) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No password set for this account" });
        }
        
        // Verify current password
        const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!isValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
        }
        
        // Hash new password
        const newPasswordHash = await bcrypt.hash(input.newPassword, 10);
        
        // Update password
        await db.update(users)
          .set({ passwordHash: newPasswordHash })
          .where(eq(users.id, ctx.user.id));
        
        return { success: true };
      }),
    
    setup2FA: protectedProcedure
      .mutation(async ({ ctx }) => {
        const speakeasy = await import("speakeasy");
        const QRCode = await import("qrcode");
        
        // Generate secret
        const secret = speakeasy.generateSecret({
          name: `Secure Chat (${ctx.user.username || ctx.user.email || ctx.user.name})`,
          length: 32,
        });
        
        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || "");
        
        // Store secret temporarily (will be confirmed on verification)
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        await db.update(users)
          .set({ twoFactorSecret: secret.base32 })
          .where(eq(users.id, ctx.user.id));
        
        return {
          secret: secret.base32,
          qrCode: qrCodeUrl,
        };
      }),
    
    verify2FA: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        // Get user's 2FA secret
        const userResult = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
        if (userResult.length === 0 || !userResult[0].twoFactorSecret) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "2FA not set up" });
        }
        
        const speakeasy = await import("speakeasy");
        
        // Verify token
        const verified = speakeasy.totp.verify({
          secret: userResult[0].twoFactorSecret,
          encoding: "base32",
          token: input.token,
          window: 2, // Allow 2 time steps before/after for clock drift
        });
        
        if (!verified) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid verification code" });
        }
        
        // Enable 2FA
        await db.update(users)
          .set({ twoFactorEnabled: 1 })
          .where(eq(users.id, ctx.user.id));
        
        return { success: true };
      }),
    
    disable2FA: protectedProcedure
      .input(z.object({ password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const bcrypt = await import("bcryptjs");
        
        // Get user
        const userResult = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
        if (userResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        
        const user = userResult[0];
        if (!user.passwordHash) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No password set for this account" });
        }
        
        // Verify password
        const isValid = await bcrypt.compare(input.password, user.passwordHash);
        if (!isValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Password is incorrect" });
        }
        
        // Disable 2FA
        await db.update(users)
          .set({ 
            twoFactorEnabled: 0,
            twoFactorSecret: null,
          })
          .where(eq(users.id, ctx.user.id));
        
        return { success: true };
      }),
  }),
  
  // Admin router
  admin: router({
    login: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "username" in val && "password" in val) {
          return val as { username: string; password: string };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input }) => {
        const { adminUsername, adminPassword } = (await import("./_core/env")).ENV;
        
        if (input.username === adminUsername && input.password === adminPassword) {
          return { success: true };
        }
        return { success: false };
      }),
    sendNotification: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "userId" in val && "title" in val && "message" in val) {
          return val as { userId: number; title: string; message: string };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }
        // TODO: Implement notification sending logic
        return { success: true, message: "Notification sent" };
      }),

    broadcastNotification: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "title" in val && "message" in val) {
          return val as { title: string; message: string };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }
        // TODO: Implement broadcast notification logic
        return { success: true, message: "Broadcast sent" };
      }),


    listUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { getAllUsers } = await import("./db");
      return getAllUsers();
    }),
    
    getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { getDashboardStats } = await import("./db");
      return getDashboardStats();
    }),
    
    updateUsername: protectedProcedure
      .input(z.object({
        userId: z.number(),
        username: z.string().min(3).max(50),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        // Check if username is already taken
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.username, input.username))
          .limit(1);
        
        if (existing.length > 0 && existing[0].id !== input.userId) {
          throw new TRPCError({ 
            code: "CONFLICT", 
            message: "Username already taken" 
          });
        }
        
        // Update username
        await db
          .update(users)
          .set({ username: input.username })
          .where(eq(users.id, input.userId));
        
        return { success: true };
      }),
    
    addUser: protectedProcedure
      .input(z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const { createUser } = await import("./db");
        return createUser(input);
      }),
    
    deleteUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { deleteUser } = await import("./db");
        return deleteUser(input.userId);
      }),
    
    getActivityLogs: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        activityType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return { logs: [], total: 0 };
        
        const { activityLogs, users } = await import("../drizzle/schema");
        const { eq, and, gte, lte, desc, sql } = await import("drizzle-orm");
        
        // Build where conditions
        const conditions = [];
        
        if (input.userId) {
          conditions.push(eq(activityLogs.userId, input.userId));
        }
        
        if (input.activityType) {
          conditions.push(eq(activityLogs.activityType, input.activityType as any));
        }
        
        if (input.startDate) {
          conditions.push(gte(activityLogs.createdAt, new Date(input.startDate)));
        }
        
        if (input.endDate) {
          conditions.push(lte(activityLogs.createdAt, new Date(input.endDate)));
        }
        
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        
        // Get total count
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(activityLogs)
          .where(whereClause);
        
        const total = Number(countResult[0]?.count || 0);
        
        // Get logs with user info
        const logs = await db
          .select({
            id: activityLogs.id,
            userId: activityLogs.userId,
            userName: users.name,
            userEmail: users.email,
            activityType: activityLogs.activityType,
            details: activityLogs.details,
            ipAddress: activityLogs.ipAddress,
            userAgent: activityLogs.userAgent,
            createdAt: activityLogs.createdAt,
          })
          .from(activityLogs)
          .leftJoin(users, eq(activityLogs.userId, users.id))
          .where(whereClause)
          .orderBy(desc(activityLogs.createdAt))
          .limit(input.limit)
          .offset(input.offset);
        
        return { logs, total };
      }),
    
    // File Management & Storage Quotas
    getSystemSettings: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { systemSettings } = await import("../drizzle/schema");
      const settings = await db.select().from(systemSettings);
      
      // Convert to key-value object
      const settingsObj: Record<string, any> = {};
      settings.forEach(setting => {
        try {
          settingsObj[setting.key] = JSON.parse(setting.value);
        } catch {
          settingsObj[setting.key] = setting.value;
        }
      });
      
      // Return defaults if not set
      return {
        maxFileSize: settingsObj.maxFileSize || 10485760, // 10MB default
        defaultStorageQuota: settingsObj.defaultStorageQuota || 1073741824, // 1GB default
        allowedFileTypes: settingsObj.allowedFileTypes || ['image/*', 'video/*', 'audio/*', 'application/pdf', 'application/zip'],
      };
    }),
    
    updateSystemSettings: protectedProcedure
      .input(z.object({
        maxFileSize: z.number().optional(),
        defaultStorageQuota: z.number().optional(),
        allowedFileTypes: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { systemSettings } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        // Update each setting
        for (const [key, value] of Object.entries(input)) {
          if (value !== undefined) {
            const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
            
            if (existing.length > 0) {
              await db.update(systemSettings)
                .set({ value: JSON.stringify(value), updatedAt: new Date() })
                .where(eq(systemSettings.key, key));
            } else {
              await db.insert(systemSettings).values({
                key,
                value: JSON.stringify(value),
                description: `System setting for ${key}`,
              });
            }
          }
        }
        
        return { success: true };
      }),
    
    getUserStorageStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { users } = await import("../drizzle/schema");
      const usersWithStorage = await db.select({
        id: users.id,
        username: users.username,
        name: users.name,
        storageUsed: users.storageUsed,
        storageQuota: users.storageQuota,
      }).from(users);
      
      return usersWithStorage;
    }),
    
    updateUserQuota: protectedProcedure
      .input(z.object({
        userId: z.number(),
        storageQuota: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        await db.update(users)
          .set({ storageQuota: input.storageQuota })
          .where(eq(users.id, input.userId));
        
        return { success: true };
      }),
  }),

  blocking: router({
    block: protectedProcedure
      .input(z.object({ blockedUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { blockedUsers } = await import("../drizzle/schema");
        await db.insert(blockedUsers).values({
          userId: ctx.user.id,
          blockedUserId: input.blockedUserId,
        });
        return { success: true };
      }),
    unblock: protectedProcedure
      .input(z.object({ blockedUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { blockedUsers } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        await db.delete(blockedUsers).where(
          and(
            eq(blockedUsers.userId, ctx.user.id),
            eq(blockedUsers.blockedUserId, input.blockedUserId)
          )
        );
        return { success: true };
      }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      const { blockedUsers, users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const blocked = await db
        .select({
          id: blockedUsers.id,
          blockedUserId: blockedUsers.blockedUserId,
          blockedUserName: users.name,
          blockedUserUsername: users.username,
          blockedUserAvatar: users.avatar,
          createdAt: blockedUsers.createdAt,
        })
        .from(blockedUsers)
        .leftJoin(users, eq(blockedUsers.blockedUserId, users.id))
        .where(eq(blockedUsers.userId, ctx.user.id));
      return blocked;
    }),
  }),
  
  // Key Verification router
  keyVerification: router({
    getStatus: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return { isVerified: false, keyChanged: false };
        
        const { keyVerifications, users } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        
        // Get verification record
        const verification = await db
          .select()
          .from(keyVerifications)
          .where(
            and(
              eq(keyVerifications.userId, ctx.user.id),
              eq(keyVerifications.contactUserId, input.contactId)
            )
          )
          .limit(1);
        
        if (verification.length === 0) {
          return { isVerified: false, keyChanged: false };
        }
        
        // Check if contact's key has changed
        const contact = await db
          .select({ publicKey: users.publicKey })
          .from(users)
          .where(eq(users.id, input.contactId))
          .limit(1);
        
        if (contact.length === 0) {
          return { isVerified: false, keyChanged: false };
        }
        
        // Generate current fingerprint and compare
        const { generateKeyFingerprint, importPublicKey } = await import("../client/src/lib/crypto");
        const currentKey = await importPublicKey(contact[0].publicKey!);
        const currentFingerprint = await generateKeyFingerprint(currentKey);
        
        const keyChanged = currentFingerprint !== verification[0].verifiedKeyFingerprint;
        
        return {
          isVerified: verification[0].isVerified === 1 && !keyChanged,
          keyChanged,
        };
      }),
    
    verify: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        keyFingerprint: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { keyVerifications } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        
        // Check if verification already exists
        const existing = await db
          .select()
          .from(keyVerifications)
          .where(
            and(
              eq(keyVerifications.userId, ctx.user.id),
              eq(keyVerifications.contactUserId, input.contactId)
            )
          )
          .limit(1);
        
        if (existing.length > 0) {
          // Update existing verification
          await db
            .update(keyVerifications)
            .set({
              verifiedKeyFingerprint: input.keyFingerprint,
              isVerified: 1,
              verifiedAt: new Date(),
            })
            .where(eq(keyVerifications.id, existing[0].id));
        } else {
          // Create new verification
          await db.insert(keyVerifications).values({
            userId: ctx.user.id,
            contactUserId: input.contactId,
            verifiedKeyFingerprint: input.keyFingerprint,
            isVerified: 1,
          });
        }
        
        return { success: true };
      }),
    
    unverify: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { keyVerifications } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        
        // Delete verification record
        await db
          .delete(keyVerifications)
          .where(
            and(
              eq(keyVerifications.userId, ctx.user.id),
              eq(keyVerifications.contactUserId, input.contactId)
            )
          );
        
        return { success: true };
      }),
  }),

  // Call history router
  calls: router({  
    // Start a new call session
    startCall: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        roomName: z.string(),
        callType: z.enum(["video", "audio"]).default("video"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const { callHistory, callParticipants } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Create call record
        const [call] = await db.insert(callHistory).values({
          conversationId: input.conversationId,
          callType: input.callType,
          initiatedBy: ctx.user.id,
          roomName: input.roomName,
          status: "ongoing",
        }).$returningId();

        // Add initiator as first participant
        await db.insert(callParticipants).values({
          callId: call.id,
          userId: ctx.user.id,
        });

        return { callId: call.id, roomName: input.roomName };
      }),

    // End a call session
    endCall: protectedProcedure
      .input(z.object({
        callId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const { callHistory, callParticipants } = await import("../drizzle/schema");
        const { eq, and, isNull } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const now = new Date();

        // Get call start time
        const [call] = await db.select().from(callHistory).where(eq(callHistory.id, input.callId));
        if (!call) throw new TRPCError({ code: "NOT_FOUND", message: "Call not found" });

        const duration = Math.floor((now.getTime() - call.startedAt.getTime()) / 1000);

        // Update call record
        await db.update(callHistory)
          .set({
            endedAt: now,
            duration: duration,
            status: "completed",
          })
          .where(eq(callHistory.id, input.callId));

        // Update all participants who haven't left yet
        const ongoingParticipants = await db.select()
          .from(callParticipants)
          .where(and(
            eq(callParticipants.callId, input.callId),
            isNull(callParticipants.leftAt)
          ));

        for (const participant of ongoingParticipants) {
          const participantDuration = Math.floor((now.getTime() - participant.joinedAt.getTime()) / 1000);
          await db.update(callParticipants)
            .set({
              leftAt: now,
              duration: participantDuration,
            })
            .where(eq(callParticipants.id, participant.id));
        }

        return { success: true, duration };
      }),

    // Join an ongoing call
    joinCall: protectedProcedure
      .input(z.object({
        callId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const { callParticipants } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        await db.insert(callParticipants).values({
          callId: input.callId,
          userId: ctx.user.id,
        });

        return { success: true };
      }),

    // Leave a call
    leaveCall: protectedProcedure
      .input(z.object({
        callId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const { callParticipants } = await import("../drizzle/schema");
        const { eq, and, isNull } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const now = new Date();

        // Find participant record
        const [participant] = await db.select()
          .from(callParticipants)
          .where(and(
            eq(callParticipants.callId, input.callId),
            eq(callParticipants.userId, ctx.user.id),
            isNull(callParticipants.leftAt)
          ));

        if (participant) {
          const duration = Math.floor((now.getTime() - participant.joinedAt.getTime()) / 1000);
          await db.update(callParticipants)
            .set({
              leftAt: now,
              duration: duration,
            })
            .where(eq(callParticipants.id, participant.id));
        }

        return { success: true };
      }),

    // Get call history for a conversation
    getHistory: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const { callHistory, callParticipants, users } = await import("../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Get all calls for this conversation
        const calls = await db.select()
          .from(callHistory)
          .where(eq(callHistory.conversationId, input.conversationId))
          .orderBy(desc(callHistory.startedAt));

        // Get participants for each call
        const callsWithParticipants = await Promise.all(
          calls.map(async (call) => {
            const participants = await db.select({
              userId: callParticipants.userId,
              userName: users.name,
              joinedAt: callParticipants.joinedAt,
              leftAt: callParticipants.leftAt,
              duration: callParticipants.duration,
            })
            .from(callParticipants)
            .leftJoin(users, eq(callParticipants.userId, users.id))
            .where(eq(callParticipants.callId, call.id));

            return {
              ...call,
              participants,
            };
          })
        );

        return callsWithParticipants;
      }),

    // Get call statistics
    getStatistics: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
      }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { callHistory } = await import("../drizzle/schema");
        const { eq, sql } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const [stats] = await db.select({
          totalCalls: sql<number>`COUNT(*)`,
          totalDuration: sql<number>`SUM(COALESCE(${callHistory.duration}, 0))`,
          avgDuration: sql<number>`AVG(COALESCE(${callHistory.duration}, 0))`,
        })
        .from(callHistory)
        .where(eq(callHistory.conversationId, input.conversationId));

        return stats || { totalCalls: 0, totalDuration: 0, avgDuration: 0 };
      }),
  }),

  e2ee: router({
    // Setup E2EE for current user
    setup: protectedProcedure
      .input(z.object({
        publicKey: z.string(),
        encryptedPrivateKey: z.string(),
        keySalt: z.string(),
        keyIv: z.string(),
        recoveryCodes: z.array(z.string()), // Hashed recovery codes
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Update user with E2EE keys
        await db.update(users)
          .set({
            publicKey: input.publicKey,
            encryptedPrivateKey: input.encryptedPrivateKey,
            keySalt: input.keySalt,
            recoveryCodes: JSON.stringify(input.recoveryCodes),
          })
          .where(eq(users.id, ctx.user.id));

        return { success: true };
      }),

    // Check if user has E2EE enabled
    isEnabled: protectedProcedure
      .query(async ({ ctx }) => {
        return {
          enabled: !!(ctx.user.publicKey && ctx.user.encryptedPrivateKey),
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
