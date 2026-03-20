import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { customStates, tickets } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const customStatesRouter = createTRPCRouter({
  customStatesGetByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(customStates)
        .where(
          and(
            eq(customStates.projectId, input.projectId),
            eq(customStates.orgId, ctx.session.orgId)
          )
        )
        .orderBy(customStates.sequence);
    }),

  customStatesCreate: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        name: z.string().min(1).max(50),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        group: z.enum(["backlog", "unstarted", "started", "completed", "cancelled"]),
        sequence: z.number().int().min(0),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [state] = await ctx.db
        .insert(customStates)
        .values({
          projectId: input.projectId,
          orgId: ctx.session.orgId,
          name: input.name,
          color: input.color,
          group: input.group,
          sequence: input.sequence,
          isDefault: input.isDefault,
        })
        .returning();
      return state;
    }),

  customStatesUpdate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(50).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        group: z.enum(["backlog", "unstarted", "started", "completed", "cancelled"]).optional(),
        sequence: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(customStates)
        .set(data)
        .where(and(eq(customStates.id, id), eq(customStates.orgId, ctx.session.orgId)))
        .returning();
      return updated;
    }),

  customStatesReorder: protectedProcedure
    .input(
      z.object({
        states: z.array(z.object({ id: z.number(), sequence: z.number() })),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        for (const s of input.states) {
          await tx
            .update(customStates)
            .set({ sequence: s.sequence })
            .where(and(eq(customStates.id, s.id), eq(customStates.orgId, ctx.session.orgId)));
        }
      });
    }),

  customStatesDelete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [ticketCount] = await ctx.db
        .select({ count: count() })
        .from(tickets)
        .where(eq(tickets.stateId, input.id));

      if (ticketCount && ticketCount.count > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete state with existing work items. Move them first.",
        });
      }

      await ctx.db
        .delete(customStates)
        .where(and(eq(customStates.id, input.id), eq(customStates.orgId, ctx.session.orgId)));
    }),

  customStatesSeedDefaults: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: customStates.id })
        .from(customStates)
        .where(eq(customStates.projectId, input.projectId))
        .limit(1);

      if (existing.length > 0) return { seeded: false };

      const defaults = [
        { name: "Backlog", color: "#A3A3A3", group: "backlog" as const, sequence: 0, isDefault: true },
        { name: "Todo", color: "#F59E0B", group: "unstarted" as const, sequence: 1, isDefault: false },
        { name: "In Progress", color: "#3B82F6", group: "started" as const, sequence: 2, isDefault: false },
        { name: "Done", color: "#22C55E", group: "completed" as const, sequence: 3, isDefault: false },
        { name: "Cancelled", color: "#EF4444", group: "cancelled" as const, sequence: 4, isDefault: false },
      ];

      await ctx.db.insert(customStates).values(
        defaults.map((d) => ({
          ...d,
          projectId: input.projectId,
          orgId: ctx.session.orgId,
        }))
      );

      return { seeded: true };
    }),
});
