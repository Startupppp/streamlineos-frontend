import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { workItemRelations, tickets } from "../../../../lib/db/schema";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const relationsRouter = createTRPCRouter({
  relationsGetByWorkItem: protectedProcedure
    .input(z.object({ workItemId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [workItem] = await ctx.db
        .select({ id: tickets.id })
        .from(tickets)
        .where(and(eq(tickets.id, input.workItemId), eq(tickets.orgId, ctx.session.orgId)));

      if (!workItem) throw new TRPCError({ code: "NOT_FOUND" });

      const relations = await ctx.db
        .select()
        .from(workItemRelations)
        .where(
          or(
            eq(workItemRelations.workItemId, input.workItemId),
            eq(workItemRelations.relatedWorkItemId, input.workItemId)
          )
        );

      if (relations.length === 0) return [];

      const relatedIds = relations.map((r) =>
        r.workItemId === input.workItemId ? r.relatedWorkItemId : r.workItemId
      );

      const relatedTickets = await ctx.db
        .select({
          id: tickets.id,
          title: tickets.title,
          status: tickets.status,
          priority: tickets.priority,
          sequenceId: tickets.sequenceId,
        })
        .from(tickets)
        .where(and(
          inArray(tickets.id, relatedIds),
          eq(tickets.orgId, ctx.session.orgId)
        ));

      const ticketMap = new Map(relatedTickets.map((t) => [t.id, t]));

      return relations.map((r) => {
        const isSource = r.workItemId === input.workItemId;
        const relatedId = isSource ? r.relatedWorkItemId : r.workItemId;
        return {
          id: r.id,
          relationType: isSource ? r.relationType : invertRelation(r.relationType),
          relatedWorkItem: ticketMap.get(relatedId),
        };
      });
    }),

  relationsCreate: protectedProcedure
    .input(
      z.object({
        workItemId: z.number(),
        relatedWorkItemId: z.number(),
        relationType: z.enum(["blocks", "blocked_by", "duplicate_of", "relates_to"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.workItemId === input.relatedWorkItemId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot create relation to self.",
        });
      }

      const bothExist = await ctx.db
        .select({ id: tickets.id })
        .from(tickets)
        .where(and(
          inArray(tickets.id, [input.workItemId, input.relatedWorkItemId]),
          eq(tickets.orgId, ctx.session.orgId)
        ));

      if (bothExist.length !== 2) {
        throw new TRPCError({ code: "NOT_FOUND", message: "One or both work items not found in your organization." });
      }

      const [relation] = await ctx.db
        .insert(workItemRelations)
        .values({
          workItemId: input.workItemId,
          relatedWorkItemId: input.relatedWorkItemId,
          relationType: input.relationType,
        })
        .returning();

      return relation;
    }),

  relationsDelete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [relation] = await ctx.db
        .select({
          id: workItemRelations.id,
          workItemId: workItemRelations.workItemId,
        })
        .from(workItemRelations)
        .where(eq(workItemRelations.id, input.id));

      if (!relation) throw new TRPCError({ code: "NOT_FOUND" });

      const [ownerCheck] = await ctx.db
        .select({ id: tickets.id })
        .from(tickets)
        .where(and(eq(tickets.id, relation.workItemId), eq(tickets.orgId, ctx.session.orgId)));

      if (!ownerCheck) throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.db
        .delete(workItemRelations)
        .where(eq(workItemRelations.id, input.id));
    }),
});

function invertRelation(type: string): string {
  switch (type) {
    case "blocks":
      return "blocked_by";
    case "blocked_by":
      return "blocks";
    default:
      return type;
  }
}
