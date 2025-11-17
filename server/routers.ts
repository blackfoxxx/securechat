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
        return createMessage({
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
        const { deleteMessage } = await import("./db");
        return deleteMessage(input.messageId, ctx.user.id);
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
        const { storagePut } = await import("./storage");
        
        // Decode base64 file data
        const fileBuffer = Buffer.from(input.fileData, 'base64');
        
        // Generate unique file key
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileKey = `chat-files/${ctx.user.id}/${timestamp}-${randomSuffix}-${input.fileName}`;
        
        // Upload to S3
        const { url } = await storagePut(fileKey, fileBuffer, input.fileType);
        
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
});

export type AppRouter = typeof appRouter;
