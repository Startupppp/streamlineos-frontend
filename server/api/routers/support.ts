import { z } from "zod";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { supportTickets, supportTicketMessages, clients, users } from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";

const SLA_HOURS: Record<string, number> = { LOW: 48, MEDIUM: 24, HIGH: 8, URGENT: 2 };

export const supportRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]).optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      assigneeId: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      page: z.number().min(1).default(1),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const limit = input?.limit ?? 50;
      const offset = ((input?.page ?? 1) - 1) * limit;

      const conditions = [eq(supportTickets.orgId, orgId)];
      if (input?.status) conditions.push(eq(supportTickets.status, input.status));
      if (input?.priority) conditions.push(eq(supportTickets.priority, input.priority));
      if (input?.assigneeId) conditions.push(eq(supportTickets.assigneeId, input.assigneeId));

      const [items, [countResult]] = await Promise.all([
        ctx.db.query.supportTickets.findMany({
          where: and(...conditions),
          orderBy: [desc(supportTickets.createdAt)],
          limit,
          offset,
          with: {
            client: { columns: { id: true, name: true } },
            assignee: { columns: { id: true, name: true, image: true } },
            creator: { columns: { id: true, name: true } },
          },
        }),
        ctx.db.select({ count: sql<number>`count(*)::int` })
          .from(supportTickets)
          .where(and(...conditions)),
      ]);

      return {
        items,
        total: countResult?.count ?? 0,
        page: input?.page ?? 1,
        totalPages: Math.ceil((countResult?.count ?? 0) / limit),
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const ticket = await ctx.db.query.supportTickets.findFirst({
        where: and(eq(supportTickets.id, input.id), eq(supportTickets.orgId, ctx.session.orgId)),
        with: {
          client: true,
          assignee: { columns: { id: true, name: true, image: true } },
          creator: { columns: { id: true, name: true } },
          messages: {
            with: { author: { columns: { id: true, name: true, image: true } } },
            orderBy: [desc(supportTicketMessages.createdAt)],
          },
        },
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      return ticket;
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      clientId: z.number().optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
      assigneeId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const slaHours = SLA_HOURS[input.priority];
      const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

      const [ticket] = await ctx.db.insert(supportTickets).values({
        orgId: ctx.session.orgId,
        title: input.title,
        description: input.description,
        clientId: input.clientId,
        priority: input.priority,
        assigneeId: input.assigneeId,
        slaDeadline,
        createdBy: ctx.session.userId,
      }).returning();

      return ticket;
    }),

  reply: protectedProcedure
    .input(z.object({
      ticketId: z.number(),
      body: z.string().min(1),
      isInternal: z.boolean().default(false),
      attachments: z.array(z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ticket = await ctx.db.query.supportTickets.findFirst({
        where: and(eq(supportTickets.id, input.ticketId), eq(supportTickets.orgId, ctx.session.orgId)),
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });

      const [message] = await ctx.db.insert(supportTicketMessages).values({
        ticketId: input.ticketId,
        authorId: ctx.session.userId,
        body: input.body,
        isInternal: input.isInternal,
        attachments: input.attachments ?? [],
      }).returning();

      if (ticket.status === "OPEN") {
        await ctx.db.update(supportTickets)
          .set({ status: "IN_PROGRESS", updatedAt: new Date() })
          .where(and(eq(supportTickets.id, input.ticketId), eq(supportTickets.orgId, ctx.session.orgId)));
      }

      return message;
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const ticket = await ctx.db.query.supportTickets.findFirst({
        where: and(eq(supportTickets.id, input.id), eq(supportTickets.orgId, ctx.session.orgId)),
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });

      const updateData: Record<string, unknown> = { status: input.status, updatedAt: new Date() };
      if (input.status === "RESOLVED") updateData.resolvedAt = new Date();
      if (input.status === "CLOSED") updateData.closedAt = new Date();

      await ctx.db.update(supportTickets).set(updateData).where(and(eq(supportTickets.id, input.id), eq(supportTickets.orgId, ctx.session.orgId)));
      return { success: true };
    }),

  assign: protectedProcedure
    .input(z.object({ id: z.number(), assigneeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ticket = await ctx.db.query.supportTickets.findFirst({
        where: and(eq(supportTickets.id, input.id), eq(supportTickets.orgId, ctx.session.orgId)),
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.update(supportTickets)
        .set({ assigneeId: input.assigneeId, updatedAt: new Date() })
        .where(and(eq(supportTickets.id, input.id), eq(supportTickets.orgId, ctx.session.orgId)));
      return { success: true };
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.orgId;
    const results = await ctx.db
      .select({
        status: supportTickets.status,
        count: sql<number>`count(*)::int`,
      })
      .from(supportTickets)
      .where(eq(supportTickets.orgId, orgId))
      .groupBy(supportTickets.status);

    const now = new Date();
    const [breachedResult] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(supportTickets)
      .where(and(
        eq(supportTickets.orgId, orgId),
        sql`${supportTickets.status} NOT IN ('RESOLVED', 'CLOSED')`,
        sql`${supportTickets.slaDeadline} < ${now}`,
      ));

    const stats: Record<string, number> = { open: 0, in_progress: 0, waiting: 0, resolved: 0, closed: 0, sla_breached: breachedResult?.count ?? 0 };
    for (const r of results) {
      stats[r.status.toLowerCase()] = r.count;
    }
    return stats;
  }),
});
