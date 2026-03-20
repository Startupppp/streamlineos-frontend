import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { leadAssignmentRules, assignmentRuleState, leads } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const leadAssignmentRouter = createTRPCRouter({
  getRules: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(leadAssignmentRules)
      .where(eq(leadAssignmentRules.orgId, ctx.session.orgId))
      .orderBy(asc(leadAssignmentRules.priority));
  }),

  createRule: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        conditions: z.array(
          z.object({
            field: z.string(),
            operator: z.string(),
            value: z.string(),
          })
        ),
        assignmentType: z.enum(["assign_user", "round_robin"]),
        assignToUserId: z.string().optional(),
        roundRobinUserIds: z.array(z.string()).optional(),
        priority: z.number().int().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [rule] = await ctx.db
        .insert(leadAssignmentRules)
        .values({
          orgId: ctx.session.orgId,
          name: input.name,
          conditions: input.conditions,
          assignmentType: input.assignmentType,
          assignToUserId: input.assignToUserId,
          roundRobinUserIds: input.roundRobinUserIds ?? [],
          priority: input.priority,
        })
        .returning();

      if (input.assignmentType === "round_robin") {
        await ctx.db.insert(assignmentRuleState).values({
          ruleId: rule.id,
          lastAssignedIndex: 0,
        });
      }

      return rule;
    }),

  updateRule: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        conditions: z
          .array(z.object({ field: z.string(), operator: z.string(), value: z.string() }))
          .optional(),
        assignmentType: z.enum(["assign_user", "round_robin"]).optional(),
        assignToUserId: z.string().nullable().optional(),
        roundRobinUserIds: z.array(z.string()).optional(),
        priority: z.number().int().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(leadAssignmentRules)
        .set(data)
        .where(and(eq(leadAssignmentRules.id, id), eq(leadAssignmentRules.orgId, ctx.session.orgId)))
        .returning();
      return updated;
    }),

  reorder: protectedProcedure
    .input(z.object({ rules: z.array(z.object({ id: z.number(), priority: z.number() })) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        for (const r of input.rules) {
          await tx
            .update(leadAssignmentRules)
            .set({ priority: r.priority })
            .where(and(eq(leadAssignmentRules.id, r.id), eq(leadAssignmentRules.orgId, ctx.session.orgId)));
        }
      });
    }),

  deleteRule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(leadAssignmentRules)
        .where(and(eq(leadAssignmentRules.id, input.id), eq(leadAssignmentRules.orgId, ctx.session.orgId)));
    }),

  evaluateAndAssign: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const rules = await ctx.db
        .select()
        .from(leadAssignmentRules)
        .where(
          and(
            eq(leadAssignmentRules.orgId, ctx.session.orgId),
            eq(leadAssignmentRules.isActive, true)
          )
        )
        .orderBy(asc(leadAssignmentRules.priority));

      const [lead] = await ctx.db
        .select()
        .from(leads)
        .where(and(eq(leads.id, input.leadId), eq(leads.orgId, ctx.session.orgId)));

      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });

      const leadRecord = lead as Record<string, unknown>;

      for (const rule of rules) {
        const conditions = rule.conditions as { field: string; operator: string; value: string }[];
        const allMatch = conditions.every((cond) => {
          const fieldVal = String(leadRecord[cond.field] ?? "");
          switch (cond.operator) {
            case "eq":
              return fieldVal === cond.value;
            case "contains":
              return fieldVal.toLowerCase().includes(cond.value.toLowerCase());
            case "gt":
              return Number(fieldVal) > Number(cond.value);
            case "lt":
              return Number(fieldVal) < Number(cond.value);
            case "in":
              return cond.value.split(",").map((v) => v.trim()).includes(fieldVal);
            default:
              return false;
          }
        });

        if (!allMatch) continue;

        let assignedUserId: string | null = null;

        if (rule.assignmentType === "assign_user" && rule.assignToUserId) {
          assignedUserId = rule.assignToUserId;
        } else if (rule.assignmentType === "round_robin") {
          const userIds = rule.roundRobinUserIds as string[];
          if (userIds.length === 0) continue;

          const [state] = await ctx.db
            .select()
            .from(assignmentRuleState)
            .where(eq(assignmentRuleState.ruleId, rule.id));

          const idx = state ? (state.lastAssignedIndex + 1) % userIds.length : 0;
          assignedUserId = userIds[idx];

          if (state) {
            await ctx.db
              .update(assignmentRuleState)
              .set({ lastAssignedIndex: idx })
              .where(eq(assignmentRuleState.ruleId, rule.id));
          } else {
            await ctx.db.insert(assignmentRuleState).values({
              ruleId: rule.id,
              lastAssignedIndex: idx,
            });
          }
        }

        if (assignedUserId) {
          await ctx.db
            .update(leads)
            .set({
              assignedToId: assignedUserId,
              assignedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(and(eq(leads.id, input.leadId), eq(leads.orgId, ctx.session.orgId)));

          return { assigned: true, userId: assignedUserId, ruleName: rule.name };
        }
      }

      return { assigned: false, userId: null, ruleName: null };
    }),
});
