import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";

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
        if (typeof val === "object" && val !== null && "conversationId" in val && "content" in val) {
          return val as { conversationId: number; content: string; type?: string };
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
        });
      }),
  }),
  contacts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getUserContacts } = await import("./db");
      return getUserContacts(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
