import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  leadNotes,
  leadTasks,
  leadEmails,
  leadActivities,
  leads,
  users,
} from "../../../lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendEmail } from "../../../lib/email";

export const leadDetailsRouter = createTRPCRouter({
  getNotes: protectedProcedure
    .input(z.object({ leadId: z.number(), limit: z.number().max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.leadNotes.findMany({
        where: and(eq(leadNotes.leadId, input.leadId), eq(leadNotes.orgId, ctx.session.orgId)),
        with: { author: { columns: { id: true, name: true, image: true } } },
        orderBy: desc(leadNotes.createdAt),
        limit: input.limit,
      });
    }),

  createNote: protectedProcedure
    .input(z.object({ leadId: z.number(), body: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [note] = await ctx.db
        .insert(leadNotes)
        .values({
          leadId: input.leadId,
          orgId: ctx.session.orgId,
          authorId: ctx.session.userId,
          body: input.body,
        })
        .returning();
      return note;
    }),

  getTasks: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.leadTasks.findMany({
        where: and(eq(leadTasks.leadId, input.leadId), eq(leadTasks.orgId, ctx.session.orgId)),
        with: { assignee: { columns: { id: true, name: true, image: true } } },
        orderBy: desc(leadTasks.createdAt),
      });
    }),

  createTask: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        title: z.string().min(1).max(200),
        dueDate: z.string().optional(),
        assigneeId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [task] = await ctx.db
        .insert(leadTasks)
        .values({
          leadId: input.leadId,
          orgId: ctx.session.orgId,
          title: input.title,
          dueDate: input.dueDate,
          assigneeId: input.assigneeId,
        })
        .returning();
      return task;
    }),

  updateTask: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["open", "done"]).optional(),
        title: z.string().optional(),
        dueDate: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(leadTasks)
        .set(data)
        .where(and(eq(leadTasks.id, id), eq(leadTasks.orgId, ctx.session.orgId)))
        .returning();
      return updated;
    }),

  getEmails: protectedProcedure
    .input(z.object({ leadId: z.number(), limit: z.number().max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(leadEmails)
        .where(and(eq(leadEmails.leadId, input.leadId), eq(leadEmails.orgId, ctx.session.orgId)))
        .orderBy(desc(leadEmails.sentAt))
        .limit(input.limit);
    }),

  sendEmail: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        to: z.string().email(),
        cc: z.string().email().optional(),
        subject: z.string().min(1),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, ctx.session.userId));

      if (!user?.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Sender email not configured." });

      await sendEmail({
        to: input.to,
        subject: input.subject,
        html: input.body,
      });

      const [emailRecord] = await ctx.db
        .insert(leadEmails)
        .values({
          leadId: input.leadId,
          orgId: ctx.session.orgId,
          direction: "sent",
          subject: input.subject,
          body: input.body,
          fromEmail: user.email,
          toEmail: input.to,
        })
        .returning();

      return emailRecord;
    }),

  getTimeline: protectedProcedure
    .input(z.object({ leadId: z.number(), limit: z.number().max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const [notes, tasks, emails, activities] = await Promise.all([
        ctx.db.query.leadNotes.findMany({
          where: and(eq(leadNotes.leadId, input.leadId), eq(leadNotes.orgId, ctx.session.orgId)),
          with: { author: { columns: { id: true, name: true } } },
          orderBy: desc(leadNotes.createdAt),
          limit: input.limit,
        }),
        ctx.db.query.leadTasks.findMany({
          where: and(eq(leadTasks.leadId, input.leadId), eq(leadTasks.orgId, ctx.session.orgId)),
          orderBy: desc(leadTasks.createdAt),
          limit: input.limit,
        }),
        ctx.db
          .select()
          .from(leadEmails)
          .where(and(eq(leadEmails.leadId, input.leadId), eq(leadEmails.orgId, ctx.session.orgId)))
          .orderBy(desc(leadEmails.sentAt))
          .limit(input.limit),
        ctx.db
          .select()
          .from(leadActivities)
          .where(and(eq(leadActivities.leadId, input.leadId), eq(leadActivities.orgId, ctx.session.orgId)))
          .orderBy(desc(leadActivities.createdAt))
          .limit(input.limit),
      ]);

      type TimelineItem = {
        id: number;
        type: "note" | "task" | "email" | "activity";
        timestamp: Date | null;
        data: Record<string, unknown>;
      };

      const timeline: TimelineItem[] = [
        ...notes.map((n) => ({ id: n.id, type: "note" as const, timestamp: n.createdAt, data: n as unknown as Record<string, unknown> })),
        ...tasks.map((t) => ({ id: t.id, type: "task" as const, timestamp: t.createdAt, data: t as unknown as Record<string, unknown> })),
        ...emails.map((e) => ({ id: e.id, type: "email" as const, timestamp: e.sentAt, data: e as unknown as Record<string, unknown> })),
        ...activities.map((a) => ({ id: a.id, type: "activity" as const, timestamp: a.createdAt, data: a as unknown as Record<string, unknown> })),
      ];

      timeline.sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return bTime - aTime;
      });

      return timeline.slice(0, input.limit);
    }),
});
