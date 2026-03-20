import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";
import { intakeItems, tickets, projects } from "../../../../lib/db/schema";
import { eq, and, sql, count, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const intakeRouter = createTRPCRouter({
  intakeGetByProject: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        status: z.enum(["pending", "accepted", "declined", "duplicate"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(intakeItems.projectId, input.projectId),
        eq(intakeItems.orgId, ctx.session.orgId),
      ];
      if (input.status) conditions.push(eq(intakeItems.status, input.status));

      const [totalResult] = await ctx.db
        .select({ count: count() })
        .from(intakeItems)
        .where(and(...conditions));

      const items = await ctx.db
        .select()
        .from(intakeItems)
        .where(and(...conditions))
        .orderBy(desc(intakeItems.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { items, total: totalResult?.count ?? 0 };
    }),

  intakeCreate: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        title: z.string().min(1).max(200),
        description: z.unknown().optional(),
        source: z.enum(["manual", "web_form", "email"]).default("manual"),
        submitterEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .insert(intakeItems)
        .values({
          projectId: input.projectId,
          orgId: ctx.session.orgId,
          title: input.title,
          description: input.description ?? null,
          source: input.source,
          submitterEmail: input.submitterEmail,
        })
        .returning();
      return item;
    }),

  intakeSubmitPublic: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        submitterEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select({ orgId: projects.orgId })
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });

      const [item] = await ctx.db
        .insert(intakeItems)
        .values({
          projectId: input.projectId,
          orgId: project.orgId,
          title: input.title,
          description: input.description ? { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: input.description }] }] } : null,
          source: "web_form",
          submitterEmail: input.submitterEmail,
        })
        .returning();
      return { id: item.id };
    }),

  intakeAccept: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        stateId: z.number().optional(),
        assigneeId: z.string().optional(),
        cycleId: z.number().optional(),
        moduleId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const [item] = await tx
          .select()
          .from(intakeItems)
          .where(and(eq(intakeItems.id, input.id), eq(intakeItems.orgId, ctx.session.orgId)));

        if (!item) throw new TRPCError({ code: "NOT_FOUND" });
        if (item.status !== "pending") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Item already processed." });
        }

        const [maxTicket] = await tx
          .select({ max: sql<number>`COALESCE(MAX(${tickets.ticketNumber}), 0)` })
          .from(tickets)
          .where(eq(tickets.projectId, item.projectId));

        const [ticket] = await tx
          .insert(tickets)
          .values({
            orgId: ctx.session.orgId,
            projectId: item.projectId,
            title: item.title,
            description: typeof item.description === "object" ? JSON.stringify(item.description) : (item.description as string) ?? "",
            ticketNumber: (maxTicket?.max ?? 0) + 1,
            stateId: input.stateId,
            assigneeId: input.assigneeId,
            cycleId: input.cycleId,
            moduleId: input.moduleId,
            reporterId: ctx.session.userId,
          })
          .returning();

        await tx
          .update(intakeItems)
          .set({
            status: "accepted",
            linkedWorkItemId: ticket.id,
            updatedAt: new Date(),
          })
          .where(eq(intakeItems.id, input.id));

        return ticket;
      });
    }),

  intakeDecline: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(intakeItems)
        .set({
          status: "declined",
          declineReason: input.reason,
          updatedAt: new Date(),
        })
        .where(and(eq(intakeItems.id, input.id), eq(intakeItems.orgId, ctx.session.orgId)));
    }),

  intakeMarkDuplicate: protectedProcedure
    .input(z.object({ id: z.number(), linkedWorkItemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(intakeItems)
        .set({
          status: "duplicate",
          linkedWorkItemId: input.linkedWorkItemId,
          updatedAt: new Date(),
        })
        .where(and(eq(intakeItems.id, input.id), eq(intakeItems.orgId, ctx.session.orgId)));
    }),
});
