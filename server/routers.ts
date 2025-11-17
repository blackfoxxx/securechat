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
          };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
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
  }),
  
  // Admin router
  admin: router({
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
});

export type AppRouter = typeof appRouter;
