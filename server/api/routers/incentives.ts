import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { eq, and, desc, count, sql, gte, lte } from "drizzle-orm";
import { incentives, incentiveConfig, clientAccounts, notifications } from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";

const statusValues = ["PENDING", "APPROVED", "REJECTED", "ADDED_TO_PAYROLL"] as const;

export const incentivesRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      status: z.enum(statusValues).optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(10).max(100).default(25),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const role = ctx.session.user.role ?? "";
      const userId = ctx.session.userId;

      const filters: ReturnType<typeof eq>[] = [eq(incentives.orgId, orgId)];

      // SALES: only own incentives
      if (role === "SALES") filters.push(eq(incentives.salesRepId, userId));

      if (input?.status) filters.push(eq(incentives.status, input.status));

      const page = input?.page ?? 1;
      const limit = input?.limit ?? 25;

      const [items, [countResult]] = await Promise.all([
        ctx.db.query.incentives.findMany({
          where: and(...filters),
          orderBy: [desc(incentives.createdAt)],
          limit,
          offset: (page - 1) * limit,
          with: {
            salesRep: { columns: { id: true, name: true, image: true } },
            clientAccount: { columns: { id: true, clientName: true, status: true } },
            approver: { columns: { id: true, name: true } },
          },
        }),
        ctx.db.select({ count: count() }).from(incentives).where(and(...filters)),
      ]);

      return {
        incentives: items,
        totalCount: countResult?.count ?? 0,
        page,
        totalPages: Math.ceil((countResult?.count ?? 0) / limit),
      };
    }),

  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const orgId = ctx.session.orgId;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [allResults, monthResults] = await Promise.all([
        ctx.db.select({
          status: incentives.status,
          count: count(),
          total: sql<string>`COALESCE(SUM(${incentives.calculatedAmount}::numeric), 0)`,
        }).from(incentives).where(eq(incentives.orgId, orgId)).groupBy(incentives.status),
        ctx.db.select({
          total: sql<string>`COALESCE(SUM(${incentives.calculatedAmount}::numeric), 0)`,
          count: count(),
          totalInvestment: sql<string>`COALESCE(SUM(${incentives.investmentAmount}::numeric), 0)`,
        }).from(incentives).where(and(
          eq(incentives.orgId, orgId),
          gte(incentives.createdAt, monthStart),
        )),
      ]);

      const byStatus: Record<string, { count: number; total: number }> = {};
      let totalAmount = 0;
      let totalCount = 0;
      for (const r of allResults) {
        byStatus[r.status] = { count: r.count, total: parseFloat(r.total) || 0 };
        totalAmount += parseFloat(r.total) || 0;
        totalCount += r.count;
      }

      return {
        totalCount,
        totalAmount,
        pending: byStatus["PENDING"]?.count ?? 0,
        approved: byStatus["APPROVED"]?.count ?? 0,
        rejected: byStatus["REJECTED"]?.count ?? 0,
        thisMonth: parseFloat(monthResults[0]?.total ?? "0"),
        thisMonthCount: monthResults[0]?.count ?? 0,
        totalRevenue: parseFloat(monthResults[0]?.totalInvestment ?? "0"),
        avgPerConversion: totalCount > 0 ? totalAmount / totalCount : 0,
      };
    }),

  approve: protectedProcedure
    .input(z.object({
      id: z.number(),
      approvedAmount: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const role = ctx.session.user.role ?? "";

      if (!["HR", "CEO"].includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only HR/CEO can approve incentives" });
      }

      const incentive = await ctx.db.query.incentives.findFirst({
        where: and(eq(incentives.id, input.id), eq(incentives.orgId, orgId)),
      });
      if (!incentive) throw new TRPCError({ code: "NOT_FOUND" });
      if (incentive.status !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Incentive is not in PENDING status" });
      }

      const [updated] = await ctx.db.update(incentives)
        .set({
          status: "APPROVED",
          approvedAmount: input.approvedAmount || incentive.calculatedAmount,
          approvedBy: ctx.session.userId,
          approvedAt: new Date(),
          notes: input.notes,
          updatedAt: new Date(),
        })
        .where(and(eq(incentives.id, input.id), eq(incentives.orgId, orgId)))
        .returning();

      // Notify sales rep
      await ctx.db.insert(notifications).values({
        orgId,
        userId: incentive.salesRepId,
        type: "SUCCESS",
        title: "Incentive Approved",
        message: `Your incentive of ${input.approvedAmount || incentive.calculatedAmount} has been approved.`,
        link: "/hr/incentives",
      });

      return updated;
    }),

  reject: protectedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const role = ctx.session.user.role ?? "";

      if (!["HR", "CEO"].includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [updated] = await ctx.db.update(incentives)
        .set({
          status: "REJECTED",
          approvedBy: ctx.session.userId,
          approvedAt: new Date(),
          notes: input.notes,
          updatedAt: new Date(),
        })
        .where(and(eq(incentives.id, input.id), eq(incentives.orgId, orgId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  // Incentive Config
  getConfig: protectedProcedure
    .query(async ({ ctx }) => {
      const orgId = ctx.session.orgId;
      return ctx.db.query.incentiveConfig.findMany({
        where: eq(incentiveConfig.orgId, orgId),
        orderBy: [desc(incentiveConfig.effectiveFrom)],
        limit: 10,
      });
    }),

  setConfig: protectedProcedure
    .input(z.object({
      incentiveRate: z.string(),
      branchId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const role = ctx.session.user.role ?? "";

      if (!["HR", "CEO"].includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Deactivate current config
      await ctx.db.update(incentiveConfig)
        .set({ isActive: false })
        .where(and(eq(incentiveConfig.orgId, orgId), eq(incentiveConfig.isActive, true)));

      const [config] = await ctx.db.insert(incentiveConfig).values({
        orgId,
        incentiveRate: input.incentiveRate,
        branchId: input.branchId,
        createdBy: ctx.session.userId,
      }).returning();

      return config;
    }),
});
