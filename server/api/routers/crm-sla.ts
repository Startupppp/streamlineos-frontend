import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { crmSla, leads, deals } from "@/lib/db/schema";
import { eq, and, lt, sql, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const crmSlaRouter = createTRPCRouter({
  getPolicies: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(crmSla)
      .where(eq(crmSla.orgId, ctx.session.orgId))
      .orderBy(crmSla.priority);
  }),

  createPolicy: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        appliesTo: z.enum(["lead", "deal", "both"]),
        priority: z.enum(["low", "medium", "high", "urgent"]),
        firstResponseHours: z.number().int().positive(),
        resolutionHours: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [policy] = await ctx.db
        .insert(crmSla)
        .values({
          name: input.name,
          appliesTo: input.appliesTo,
          priority: input.priority,
          firstResponseHours: input.firstResponseHours,
          resolutionHours: input.resolutionHours,
          orgId: ctx.session.orgId,
        })
        .returning();
      return policy;
    }),

  updatePolicy: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        appliesTo: z.enum(["lead", "deal", "both"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        firstResponseHours: z.number().int().positive().optional(),
        resolutionHours: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(crmSla)
        .set(data)
        .where(and(eq(crmSla.id, id), eq(crmSla.orgId, ctx.session.orgId)))
        .returning();
      return updated;
    }),

  deletePolicy: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(crmSla)
        .where(and(eq(crmSla.id, input.id), eq(crmSla.orgId, ctx.session.orgId)));
    }),

  applySlaToLead: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [lead] = await ctx.db
        .select()
        .from(leads)
        .where(and(eq(leads.id, input.leadId), eq(leads.orgId, ctx.session.orgId)));

      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });

      const priorityMap: Record<string, "low" | "medium" | "high" | "urgent"> = {
        COLD: "low",
        WARM: "medium",
        HOT: "high",
      };
      const slaPriority = priorityMap[lead.priority ?? "WARM"] ?? "medium";

      const policies = await ctx.db
        .select()
        .from(crmSla)
        .where(
          and(
            eq(crmSla.orgId, ctx.session.orgId),
            eq(crmSla.priority, slaPriority),
            sql`${crmSla.appliesTo} IN ('lead', 'both')`
          )
        )
        .limit(1);

      if (policies.length === 0) return { slaApplied: false };

      const policy = policies[0];
      const deadline = new Date(lead.createdAt!);
      deadline.setHours(deadline.getHours() + policy.firstResponseHours);

      await ctx.db
        .update(leads)
        .set({ slaDeadline: deadline, updatedAt: new Date() })
        .where(and(eq(leads.id, input.leadId), eq(leads.orgId, ctx.session.orgId)));

      return { slaApplied: true, deadline };
    }),

  getBreachedLeads: protectedProcedure
    .input(z.object({ limit: z.number().max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.orgId, ctx.session.orgId),
            lt(leads.slaDeadline, new Date()),
            sql`${leads.status} NOT IN ('CONVERTED', 'LOST')`
          )
        )
        .orderBy(leads.slaDeadline)
        .limit(input.limit);
    }),

  getSlaReport: protectedProcedure.query(async ({ ctx }) => {
    const [total] = await ctx.db
      .select({ count: count() })
      .from(leads)
      .where(
        and(
          eq(leads.orgId, ctx.session.orgId),
          sql`${leads.slaDeadline} IS NOT NULL`
        )
      );

    const [breached] = await ctx.db
      .select({ count: count() })
      .from(leads)
      .where(
        and(
          eq(leads.orgId, ctx.session.orgId),
          lt(leads.slaDeadline, new Date()),
          sql`${leads.status} NOT IN ('CONVERTED', 'LOST')`
        )
      );

    const compliance =
      total && total.count > 0
        ? Math.round(((total.count - (breached?.count ?? 0)) / total.count) * 100)
        : 100;

    return {
      total: total?.count ?? 0,
      breached: breached?.count ?? 0,
      compliant: (total?.count ?? 0) - (breached?.count ?? 0),
      complianceRate: compliance,
    };
  }),
});
