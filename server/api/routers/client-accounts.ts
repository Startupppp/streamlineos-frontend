import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { eq, and, desc, sql, count, gte, lte, like, or } from "drizzle-orm";
import { clientAccounts, clientAccountActivities, notifications, users, leads, incentives, incentiveConfig, organizationMembers } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const statusValues = ["ACCOUNT_OPENING", "QUERIES", "PLAN_SELECTED", "INVESTED"] as const;

export const clientAccountsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      status: z.enum(statusValues).optional(),
      search: z.string().optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(10).max(100).default(25),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const role = ctx.session.user.role ?? "";
      const userId = ctx.session.userId;

      const filters: ReturnType<typeof eq>[] = [eq(clientAccounts.orgId, orgId)];

      // SALES: read-only view of own converted clients
      if (role === "SALES") {
        filters.push(eq(clientAccounts.salesRepId, userId));
      }
      // CUSTOMER_SUPPORT: sees clients assigned to them
      if (role === "CUSTOMER_SUPPORT") {
        filters.push(eq(clientAccounts.assignedCrmId, userId));
      }

      if (input?.status) filters.push(eq(clientAccounts.status, input.status));

      if (input?.search) {
        filters.push(
          or(
            like(clientAccounts.clientName, `%${input.search}%`),
            like(clientAccounts.clientEmail, `%${input.search}%`),
            like(clientAccounts.clientPhone, `%${input.search}%`),
          )!,
        );
      }

      const page = input?.page ?? 1;
      const limit = input?.limit ?? 25;
      const offset = (page - 1) * limit;

      const [items, [countResult]] = await Promise.all([
        ctx.db.query.clientAccounts.findMany({
          where: and(...filters),
          orderBy: [desc(clientAccounts.createdAt)],
          limit,
          offset,
          with: {
            salesRep: { columns: { id: true, name: true, image: true } },
            assignedCrm: { columns: { id: true, name: true, image: true } },
          },
        }),
        ctx.db.select({ count: count() }).from(clientAccounts).where(and(...filters)),
      ]);

      return {
        accounts: items,
        totalCount: countResult?.count ?? 0,
        page,
        totalPages: Math.ceil((countResult?.count ?? 0) / limit),
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const role = ctx.session.user.role ?? "";
      const userId = ctx.session.userId;

      const account = await ctx.db.query.clientAccounts.findFirst({
        where: and(eq(clientAccounts.id, input.id), eq(clientAccounts.orgId, orgId)),
        with: {
          salesRep: { columns: { id: true, name: true, image: true, email: true } },
          assignedCrm: { columns: { id: true, name: true, image: true, email: true } },
          lead: { columns: { id: true, name: true, source: true, priority: true } },
        },
      });

      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Client account not found" });

      // SALES: can only see own converted clients
      if (role === "SALES" && account.salesRepId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own converted clients" });
      }

      // Get activities
      const activities = await ctx.db.query.clientAccountActivities.findMany({
        where: eq(clientAccountActivities.clientAccountId, input.id),
        orderBy: [desc(clientAccountActivities.createdAt)],
        with: {
          user: { columns: { id: true, name: true, image: true } },
        },
      });

      return { ...account, activities };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(statusValues),
      investmentAmount: z.string().optional(),
      planName: z.string().optional(),
      investmentDate: z.string().optional(),
      transactionRef: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const role = ctx.session.user.role ?? "";

      // Only CUSTOMER_SUPPORT, HR, CEO can update status
      if (!["CUSTOMER_SUPPORT", "HR", "CEO"].includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only CRM team can update client status" });
      }

      const account = await ctx.db.query.clientAccounts.findFirst({
        where: and(eq(clientAccounts.id, input.id), eq(clientAccounts.orgId, orgId)),
      });

      if (!account) throw new TRPCError({ code: "NOT_FOUND" });

      const updateData: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date(),
      };

      // Handle INVESTED stage
      if (input.status === "INVESTED") {
        if (!input.investmentAmount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Investment amount is required for INVESTED status" });
        }
        updateData.investmentAmount = input.investmentAmount;
        updateData.planName = input.planName;
        updateData.investmentDate = input.investmentDate ? new Date(input.investmentDate) : new Date();
        updateData.transactionRef = input.transactionRef;
        updateData.investedAt = new Date();
      }

      const [updated] = await ctx.db.update(clientAccounts)
        .set(updateData)
        .where(and(eq(clientAccounts.id, input.id), eq(clientAccounts.orgId, orgId)))
        .returning();

      // Log activity
      await ctx.db.insert(clientAccountActivities).values({
        clientAccountId: input.id,
        userId: ctx.session.userId,
        activityType: "status_change",
        title: `Status changed to ${input.status}`,
        description: input.status === "INVESTED"
          ? `Investment: ${input.investmentAmount}, Plan: ${input.planName || "N/A"}`
          : undefined,
      });

      // If INVESTED, auto-create incentive
      if (input.status === "INVESTED" && input.investmentAmount) {
        const config = await ctx.db.query.incentiveConfig.findFirst({
          where: and(
            eq(incentiveConfig.orgId, orgId),
            eq(incentiveConfig.isActive, true),
          ),
          orderBy: [desc(incentiveConfig.effectiveFrom)],
        });

        if (config) {
          const amount = parseFloat(input.investmentAmount);
          const rate = parseFloat(config.incentiveRate);
          const calculated = (amount * rate) / 100;

          await ctx.db.insert(incentives).values({
            orgId,
            clientAccountId: input.id,
            salesRepId: account.salesRepId,
            investmentAmount: input.investmentAmount,
            incentiveRate: config.incentiveRate,
            calculatedAmount: String(calculated),
            branchId: account.branchId,
          });
        }

        // Notify sales rep
        await ctx.db.insert(notifications).values({
          orgId,
          userId: account.salesRepId,
          type: "SUCCESS",
          title: "Client Invested!",
          message: `${account.clientName} has invested ${input.investmentAmount}. Your incentive is being processed.`,
          link: `/crm/clients/${account.id}`,
        });
      }

      return updated;
    }),

  logActivity: protectedProcedure
    .input(z.object({
      clientAccountId: z.number(),
      activityType: z.string(),
      title: z.string().min(1),
      description: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const role = ctx.session.user.role ?? "";

      if (!["CUSTOMER_SUPPORT", "HR", "CEO"].includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Verify account belongs to org
      const account = await ctx.db.query.clientAccounts.findFirst({
        where: and(eq(clientAccounts.id, input.clientAccountId), eq(clientAccounts.orgId, orgId)),
        columns: { id: true },
      });
      if (!account) throw new TRPCError({ code: "NOT_FOUND" });

      const [activity] = await ctx.db.insert(clientAccountActivities).values({
        clientAccountId: input.clientAccountId,
        userId: ctx.session.userId,
        activityType: input.activityType,
        title: input.title,
        description: input.description,
        metadata: input.metadata,
      }).returning();

      return activity;
    }),

  assignCrm: protectedProcedure
    .input(z.object({
      id: z.number(),
      assignedCrmId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const role = ctx.session.user.role ?? "";

      if (!["HR", "CEO"].includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only HR/CEO can assign CRM reps" });
      }

      const [updated] = await ctx.db.update(clientAccounts)
        .set({ assignedCrmId: input.assignedCrmId, updatedAt: new Date() })
        .where(and(eq(clientAccounts.id, input.id), eq(clientAccounts.orgId, orgId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

      // Notify assigned CRM rep
      await ctx.db.insert(notifications).values({
        orgId,
        userId: input.assignedCrmId,
        type: "INFO",
        title: "Client Account Assigned",
        message: `You have been assigned to manage ${updated.clientName}`,
        link: `/crm/clients/${updated.id}`,
      });

      return updated;
    }),

  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const orgId = ctx.session.orgId;
      const role = ctx.session.user.role ?? "";
      const userId = ctx.session.userId;

      const baseFilter = [eq(clientAccounts.orgId, orgId)];
      if (role === "CUSTOMER_SUPPORT") baseFilter.push(eq(clientAccounts.assignedCrmId, userId));
      if (role === "SALES") baseFilter.push(eq(clientAccounts.salesRepId, userId));

      const results = await ctx.db
        .select({
          status: clientAccounts.status,
          count: count(),
        })
        .from(clientAccounts)
        .where(and(...baseFilter))
        .groupBy(clientAccounts.status);

      const byStatus: Record<string, number> = {};
      let total = 0;
      for (const r of results) {
        byStatus[r.status] = r.count;
        total += r.count;
      }

      return {
        total,
        accountOpening: byStatus["ACCOUNT_OPENING"] || 0,
        queries: byStatus["QUERIES"] || 0,
        planSelected: byStatus["PLAN_SELECTED"] || 0,
        invested: byStatus["INVESTED"] || 0,
      };
    }),

  getCrmTeam: protectedProcedure
    .query(async ({ ctx }) => {
      const orgId = ctx.session.orgId;
      const orgMembers = await ctx.db.query.organizationMembers.findMany({
        where: eq(organizationMembers.orgId, orgId),
        columns: { userId: true },
      });
      return ctx.db.query.users.findMany({
        where: and(
          inArray(users.id, orgMembers.map(m => m.userId)),
          eq(users.isActive, true),
          inArray(users.role, ["CUSTOMER_SUPPORT"]),
        ),
        columns: { id: true, name: true, image: true },
      });
    }),
});
