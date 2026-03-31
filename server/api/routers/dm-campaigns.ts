import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { crmCampaigns, dmLeads } from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";

export const dmCampaignsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(10).max(100).default(25),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const filters: ReturnType<typeof eq>[] = [eq(crmCampaigns.orgId, orgId)];
      if (input?.status) filters.push(eq(crmCampaigns.status, input.status as "active" | "paused" | "completed"));

      const page = input?.page ?? 1;
      const limit = input?.limit ?? 25;

      const [items, [countResult]] = await Promise.all([
        ctx.db.query.crmCampaigns.findMany({
          where: and(...filters),
          orderBy: [desc(crmCampaigns.createdAt)],
          limit,
          offset: (page - 1) * limit,
        }),
        ctx.db.select({ count: count() }).from(crmCampaigns).where(and(...filters)),
      ]);

      // Get leads count per campaign
      const leadsPerCampaign = await ctx.db.select({
        campaignId: dmLeads.campaignId,
        count: count(),
      }).from(dmLeads).where(eq(dmLeads.orgId, orgId)).groupBy(dmLeads.campaignId);

      const leadsMap = new Map(leadsPerCampaign.map(l => [l.campaignId, l.count]));

      const enriched = items.map(c => ({
        ...c,
        leadsGenerated: leadsMap.get(c.id) || 0,
        costPerLead: (leadsMap.get(c.id) || 0) > 0 && c.budgetSpent
          ? parseFloat(c.budgetSpent) / (leadsMap.get(c.id) || 1)
          : null,
      }));

      return {
        campaigns: enriched,
        totalCount: countResult?.count ?? 0,
        page,
        totalPages: Math.ceil((countResult?.count ?? 0) / limit),
      };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      status: z.enum(["active", "paused", "completed"]).default("active"),
      budgetAllocated: z.string().optional(),
      budgetSpent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [campaign] = await ctx.db.insert(crmCampaigns).values({
        orgId: ctx.session.orgId,
        ...input,
      }).returning();
      return campaign;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      status: z.enum(["active", "paused", "completed"]).optional(),
      budgetAllocated: z.string().optional(),
      budgetSpent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db.update(crmCampaigns)
        .set(data)
        .where(and(eq(crmCampaigns.id, id), eq(crmCampaigns.orgId, ctx.session.orgId)))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const orgId = ctx.session.orgId;
      const campaigns = await ctx.db.query.crmCampaigns.findMany({
        where: eq(crmCampaigns.orgId, orgId),
      });

      const active = campaigns.filter(c => c.status === "active").length;
      const totalBudget = campaigns.reduce((s, c) => s + parseFloat(c.budgetAllocated || "0"), 0);
      const totalSpent = campaigns.reduce((s, c) => s + parseFloat(c.budgetSpent || c.spend || "0"), 0);

      const leadsCount = await ctx.db.select({ count: count() }).from(dmLeads).where(eq(dmLeads.orgId, orgId));

      return {
        total: campaigns.length,
        active,
        totalBudget,
        totalSpent,
        totalLeads: leadsCount[0]?.count ?? 0,
        avgCpl: (leadsCount[0]?.count ?? 0) > 0 ? totalSpent / (leadsCount[0]?.count ?? 1) : 0,
      };
    }),
});
