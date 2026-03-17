import { z } from "zod";
import { eq, and, desc, gt, ilike, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import {
  chatMessages,
  chatAttachments,
  chatChannels,
  chatChannelMembers,
} from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";

async function verifyMember(db: typeof import("@/lib/db").db, channelId: number, userId: string) {
  const m = await db.query.chatChannelMembers.findFirst({
    where: and(eq(chatChannelMembers.channelId, channelId), eq(chatChannelMembers.userId, userId)),
  });
  if (!m) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this channel" });
  return m;
}

export const messageRouter = createTRPCRouter({
  getMessages: protectedProcedure
    .input(
      z.object({
        channelId: z.number(),
        cursor: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyMember(ctx.db, input.channelId, ctx.session.userId);

      const conditions = [
        eq(chatMessages.channelId, input.channelId),
      ];

      if (input.cursor) {
        conditions.push(sql`${chatMessages.id} < ${input.cursor}`);
      }

      const messages = await ctx.db.query.chatMessages.findMany({
        where: and(...conditions),
        orderBy: [desc(chatMessages.createdAt)],
        limit: input.limit + 1,
        with: {
          sender: { columns: { id: true, name: true, image: true } },
          attachments: true,
          replyTo: {
            with: { sender: { columns: { id: true, name: true } } },
          },
        },
      });

      let nextCursor: number | undefined;
      if (messages.length > input.limit) {
        const next = messages.pop();
        nextCursor = next?.id;
      }

      return {
        messages: messages.reverse(), // oldest first for display
        nextCursor,
      };
    }),

  send: protectedProcedure
    .input(
      z.object({
        channelId: z.number(),
        content: z.string().optional(),
        replyToId: z.number().optional(),
        attachments: z
          .array(
            z.object({
              fileName: z.string(),
              fileUrl: z.string(),
              fileKey: z.string(),
              fileSize: z.number(),
              mimeType: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyMember(ctx.db, input.channelId, ctx.session.userId);

      if (!input.content?.trim() && (!input.attachments || input.attachments.length === 0)) {
        throw new Error("Message must have content or attachments");
      }

      const [message] = await ctx.db
        .insert(chatMessages)
        .values({
          channelId: input.channelId,
          senderId: ctx.session.userId,
          content: input.content?.trim() || null,
          replyToId: input.replyToId,
        })
        .returning();

      if (input.attachments && input.attachments.length > 0) {
        await ctx.db.insert(chatAttachments).values(
          input.attachments.map((a) => ({
            messageId: message.id,
            fileName: a.fileName,
            fileUrl: a.fileUrl,
            fileKey: a.fileKey,
            fileSize: a.fileSize,
            mimeType: a.mimeType,
          }))
        );
      }

      // Update channel lastMessageAt
      await ctx.db
        .update(chatChannels)
        .set({ lastMessageAt: new Date(), updatedAt: new Date() })
        .where(eq(chatChannels.id, input.channelId));

      return message;
    }),

  edit: protectedProcedure
    .input(z.object({ messageId: z.number(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(chatMessages)
        .set({
          content: input.content.trim(),
          isEdited: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(chatMessages.id, input.messageId),
            eq(chatMessages.senderId, ctx.session.userId)
          )
        );

      return { ok: true };
    }),

  delete: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Users can delete own messages, CEO/HR can delete any
      const role = ctx.session.user?.role;
      const isAdmin = role === "CEO" || role === "HR";

      const conditions = [eq(chatMessages.id, input.messageId)];
      if (!isAdmin) {
        conditions.push(eq(chatMessages.senderId, ctx.session.userId));
      }

      await ctx.db
        .update(chatMessages)
        .set({ isDeleted: true, content: null, updatedAt: new Date() })
        .where(and(...conditions));

      return { ok: true };
    }),

  markRead: protectedProcedure
    .input(z.object({ channelId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(chatChannelMembers)
        .set({ lastReadAt: new Date() })
        .where(
          and(
            eq(chatChannelMembers.channelId, input.channelId),
            eq(chatChannelMembers.userId, ctx.session.userId)
          )
        );

      return { ok: true };
    }),

  poll: protectedProcedure
    .input(
      z.object({
        channelId: z.number(),
        since: z.string(), // ISO timestamp
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyMember(ctx.db, input.channelId, ctx.session.userId);
      const sinceDate = new Date(input.since);

      const newMessages = await ctx.db.query.chatMessages.findMany({
        where: and(
          eq(chatMessages.channelId, input.channelId),
          gt(chatMessages.createdAt, sinceDate)
        ),
        orderBy: [desc(chatMessages.createdAt)],
        limit: 100,
        with: {
          sender: { columns: { id: true, name: true, image: true } },
          attachments: true,
          replyTo: {
            with: { sender: { columns: { id: true, name: true } } },
          },
        },
      });

      return newMessages.reverse();
    }),

  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        channelId: z.number().optional(),
        limit: z.number().max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        ilike(chatMessages.content, `%${input.query}%`),
        eq(chatMessages.isDeleted, false),
      ];

      if (input.channelId) {
        conditions.push(eq(chatMessages.channelId, input.channelId));
      }

      const results = await ctx.db.query.chatMessages.findMany({
        where: and(...conditions),
        orderBy: [desc(chatMessages.createdAt)],
        limit: input.limit,
        with: {
          sender: { columns: { id: true, name: true, image: true } },
          channel: { columns: { id: true, name: true, type: true } },
        },
      });

      return results;
    }),
});
