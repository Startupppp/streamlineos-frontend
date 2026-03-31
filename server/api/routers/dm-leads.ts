import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { eq, and, desc, count, like, or } from "drizzle-orm";
import { dmLeads, leads, notifications } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const statusValues = ["pending_review", "verified", "sent_to_hr", "imported_to_pipeline"] as const;
const platforms = ["linkedin", "instagram", "facebook", "google_ads", "seo", "website", "whatsapp", "email_campaign"] as const;

export const dmLeadsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      status: z.enum(statusValues).optional(),
      platform: z.string().optional(),
      search: z.string().optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(10).max(100).default(25),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const filters: ReturnType<typeof eq>[] = [eq(dmLeads.orgId, orgId)];

      if (input?.status) filters.push(eq(dmLeads.status, input.status));
      if (input?.platform) filters.push(eq(dmLeads.sourcePlatform, input.platform));
      if (input?.search) {
        filters.push(or(
          like(dmLeads.name, `%${input.search}%`),
          like(dmLeads.email, `%${input.search}%`),
          like(dmLeads.phone, `%${input.search}%`),
        )!);
      }

      const page = input?.page ?? 1;
      const limit = input?.limit ?? 25;

      const [items, [countResult]] = await Promise.all([
        ctx.db.query.dmLeads.findMany({
          where: and(...filters),
          orderBy: [desc(dmLeads.dateCaptured)],
          limit,
          offset: (page - 1) * limit,
        }),
        ctx.db.select({ count: count() }).from(dmLeads).where(and(...filters)),
      ]);

      return {
        leads: items,
        totalCount: countResult?.count ?? 0,
        page,
        totalPages: Math.ceil((countResult?.count ?? 0) / limit),
      };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().optional(),
      whatsappNumber: z.string().optional(),
      sourcePlatform: z.string(),
      campaignId: z.number().optional(),
      campaignType: z.string().optional(),
      leadQuality: z.string().default("warm"),
      notes: z.string().optional(),
      landingPageUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const [lead] = await ctx.db.insert(dmLeads).values({
        orgId,
        ...input,
        createdBy: ctx.session.userId,
      }).returning();
      return lead;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      whatsappNumber: z.string().optional(),
      sourcePlatform: z.string().optional(),
      leadQuality: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const { id, ...data } = input;
      const [updated] = await ctx.db.update(dmLeads)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(dmLeads.id, id), eq(dmLeads.orgId, orgId)))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  verify: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const [updated] = await ctx.db.update(dmLeads)
        .set({ status: "verified", verifiedBy: ctx.session.userId, updatedAt: new Date() })
        .where(and(eq(dmLeads.id, input.id), eq(dmLeads.orgId, orgId)))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  bulkSendToHr: protectedProcedure
    .input(z.object({ ids: z.number().array().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      await ctx.db.update(dmLeads)
        .set({ status: "sent_to_hr", updatedAt: new Date() })
        .where(and(inArray(dmLeads.id, input.ids), eq(dmLeads.orgId, orgId)));
      return { count: input.ids.length };
    }),

  importToPipeline: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const role = ctx.session.user.role ?? "";

      if (!["HR", "CEO"].includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only HR/CEO can import to pipeline" });
      }

      const dmLead = await ctx.db.query.dmLeads.findFirst({
        where: and(eq(dmLeads.id, input.id), eq(dmLeads.orgId, orgId)),
      });
      if (!dmLead) throw new TRPCError({ code: "NOT_FOUND" });

      // Create lead in main pipeline
      const [newLead] = await ctx.db.insert(leads).values({
        orgId,
        name: dmLead.name,
        email: dmLead.email,
        phone: dmLead.phone,
        whatsappNumber: dmLead.whatsappNumber,
        source: "social_media",
        subSource: `${dmLead.sourcePlatform}${dmLead.campaignType ? ` - ${dmLead.campaignType}` : ""}`,
        dmLeadId: dmLead.id,
        priority: dmLead.leadQuality === "hot" ? "HOT" : dmLead.leadQuality === "cold" ? "COLD" : "WARM",
        notes: dmLead.notes,
        campaignId: dmLead.campaignId,
      }).returning();

      // Update DM lead
      await ctx.db.update(dmLeads)
        .set({ status: "imported_to_pipeline", importedLeadId: newLead.id, updatedAt: new Date() })
        .where(eq(dmLeads.id, input.id));

      return newLead;
    }),

  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const orgId = ctx.session.orgId;
      const results = await ctx.db.select({
        status: dmLeads.status,
        count: count(),
      }).from(dmLeads).where(eq(dmLeads.orgId, orgId)).groupBy(dmLeads.status);

      const byStatus: Record<string, number> = {};
      let total = 0;
      for (const r of results) {
        byStatus[r.status] = r.count;
        total += r.count;
      }

      // Platform breakdown
      const platformResults = await ctx.db.select({
        platform: dmLeads.sourcePlatform,
        count: count(),
      }).from(dmLeads).where(eq(dmLeads.orgId, orgId)).groupBy(dmLeads.sourcePlatform);

      return {
        total,
        pendingReview: byStatus["pending_review"] || 0,
        verified: byStatus["verified"] || 0,
        sentToHr: byStatus["sent_to_hr"] || 0,
        imported: byStatus["imported_to_pipeline"] || 0,
        byPlatform: platformResults.map(p => ({ platform: p.platform, count: p.count })),
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      await ctx.db.delete(dmLeads).where(and(eq(dmLeads.id, input.id), eq(dmLeads.orgId, orgId)));
      return { success: true };
    }),
});
