import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { targets } from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";

export const targetsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      userId: z.string().optional(),
      period: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const filters = [eq(targets.orgId, orgId)];

      if (input?.userId) filters.push(eq(targets.userId, input.userId));
      if (input?.period) filters.push(eq(targets.period, input.period));

      return ctx.db.query.targets.findMany({
        where: and(...filters),
        with: { user: { columns: { id: true, name: true, image: true } } },
        orderBy: [desc(targets.createdAt)],
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
      });
    }),

  getMyTargets: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.targets.findMany({
      where: and(
        eq(targets.orgId, ctx.session.orgId),
        eq(targets.userId, ctx.session.userId)
      ),
      orderBy: [desc(targets.startDate)],
    });
  }),

  create: adminProcedure
    .input(z.object({
      userId: z.string(),
      metricType: z.string(),
      targetValue: z.string(),
      period: z.string().default("daily"),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [target] = await ctx.db.insert(targets).values({
        orgId: ctx.session.orgId,
        userId: input.userId,
        metricType: input.metricType,
        targetValue: input.targetValue,
        period: input.period,
        startDate: input.startDate,
        endDate: input.endDate,
        setById: ctx.session.userId,
      }).returning();

      return target;
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      targetValue: z.string().optional(),
      currentValue: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db.update(targets)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(targets.id, id), eq(targets.orgId, ctx.session.orgId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(targets)
        .where(and(eq(targets.id, input.id), eq(targets.orgId, ctx.session.orgId)));
      return { success: true };
    }),

  getLeaderboard: protectedProcedure
    .input(z.object({ metricType: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const filters = [eq(targets.orgId, orgId)];
      if (input?.metricType) filters.push(eq(targets.metricType, input.metricType));

      const allTargets = await ctx.db.query.targets.findMany({
        where: and(...filters),
        with: { user: { columns: { id: true, name: true, image: true } } },
        orderBy: [desc(targets.currentValue)],
      });

      const userMap = new Map<string, { name: string; image: string | null; totalTarget: number; totalCurrent: number }>();
      for (const t of allTargets) {
        if (!t.user) continue;
        const existing = userMap.get(t.userId) || { name: t.user.name ?? "", image: t.user.image, totalTarget: 0, totalCurrent: 0 };
        existing.totalTarget += Number(t.targetValue);
        existing.totalCurrent += Number(t.currentValue ?? 0);
        userMap.set(t.userId, existing);
      }

      return Array.from(userMap.entries())
        .map(([userId, data]) => ({
          userId,
          ...data,
          progress: data.totalTarget > 0 ? Math.round((data.totalCurrent / data.totalTarget) * 100) : 0,
        }))
        .sort((a, b) => b.progress - a.progress);
    }),
});
