import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { leadScoringRules, leads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const leadScoringRouter = createTRPCRouter({
  getRules: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(leadScoringRules)
      .where(eq(leadScoringRules.orgId, ctx.session.orgId))
      .orderBy(leadScoringRules.createdAt);
  }),

  createRule: protectedProcedure
    .input(
      z.object({
        field: z.string().min(1),
        operator: z.enum(["eq", "gt", "lt", "contains", "in"]),
        value: z.string(),
        points: z.number().int(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [rule] = await ctx.db
        .insert(leadScoringRules)
        .values({ ...input, orgId: ctx.session.orgId })
        .returning();
      return rule;
    }),

  updateRule: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        field: z.string().optional(),
        operator: z.enum(["eq", "gt", "lt", "contains", "in"]).optional(),
        value: z.string().optional(),
        points: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(leadScoringRules)
        .set(data)
        .where(and(eq(leadScoringRules.id, id), eq(leadScoringRules.orgId, ctx.session.orgId)))
        .returning();
      return updated;
    }),

  deleteRule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(leadScoringRules)
        .where(and(eq(leadScoringRules.id, input.id), eq(leadScoringRules.orgId, ctx.session.orgId)));
    }),

  recalculateScore: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const rules = await ctx.db
        .select()
        .from(leadScoringRules)
        .where(eq(leadScoringRules.orgId, ctx.session.orgId));

      const [lead] = await ctx.db
        .select()
        .from(leads)
        .where(and(eq(leads.id, input.leadId), eq(leads.orgId, ctx.session.orgId)));

      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });

      let score = 0;
      const leadRecord = lead as Record<string, unknown>;

      for (const rule of rules) {
        const fieldValue = leadRecord[rule.field];
        if (fieldValue === undefined || fieldValue === null) continue;

        const strValue = String(fieldValue);
        let match = false;

        switch (rule.operator) {
          case "eq":
            match = strValue === rule.value;
            break;
          case "gt":
            match = Number(strValue) > Number(rule.value);
            break;
          case "lt":
            match = Number(strValue) < Number(rule.value);
            break;
          case "contains":
            match = strValue.toLowerCase().includes(rule.value.toLowerCase());
            break;
          case "in":
            match = rule.value.split(",").map((v) => v.trim()).includes(strValue);
            break;
        }

        if (match) score += rule.points;
      }

      score = Math.max(0, Math.min(100, score));

      const [updated] = await ctx.db
        .update(leads)
        .set({ score, updatedAt: new Date() })
        .where(and(eq(leads.id, input.leadId), eq(leads.orgId, ctx.session.orgId)))
        .returning();

      return updated;
    }),

  previewScore: protectedProcedure
    .input(z.object({ leadData: z.record(z.string(), z.unknown()) }))
    .query(async ({ ctx, input }) => {
      const rules = await ctx.db
        .select()
        .from(leadScoringRules)
        .where(eq(leadScoringRules.orgId, ctx.session.orgId));

      let score = 0;
      const matchedRules: { id: number; field: string; points: number }[] = [];

      for (const rule of rules) {
        const fieldValue = input.leadData[rule.field];
        if (fieldValue === undefined || fieldValue === null) continue;

        const strValue = String(fieldValue);
        let match = false;

        switch (rule.operator) {
          case "eq":
            match = strValue === rule.value;
            break;
          case "gt":
            match = Number(strValue) > Number(rule.value);
            break;
          case "lt":
            match = Number(strValue) < Number(rule.value);
            break;
          case "contains":
            match = strValue.toLowerCase().includes(rule.value.toLowerCase());
            break;
          case "in":
            match = rule.value.split(",").map((v) => v.trim()).includes(strValue);
            break;
        }

        if (match) {
          score += rule.points;
          matchedRules.push({ id: rule.id, field: rule.field, points: rule.points });
        }
      }

      return { score: Math.max(0, Math.min(100, score)), matchedRules };
    }),
});
