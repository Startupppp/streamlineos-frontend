import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { socialMediaStats } from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";

const platformValues = ["instagram", "twitter", "linkedin", "facebook", "youtube"] as const;

export const socialMediaRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      platform: z.enum(platformValues).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().min(10).max(200).default(90),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const filters: ReturnType<typeof eq>[] = [eq(socialMediaStats.orgId, orgId)];
      if (input?.platform) filters.push(eq(socialMediaStats.platform, input.platform));
      if (input?.dateFrom) filters.push(gte(socialMediaStats.date, input.dateFrom));
      if (input?.dateTo) filters.push(lte(socialMediaStats.date, input.dateTo));

      return ctx.db.query.socialMediaStats.findMany({
        where: and(...filters),
        orderBy: [desc(socialMediaStats.date)],
        limit: input?.limit ?? 90,
      });
    }),

  upsert: protectedProcedure
    .input(z.object({
      platform: z.enum(platformValues),
      date: z.string(),
      postsPublished: z.number().default(0),
      storiesReels: z.number().default(0),
      followersTotal: z.number().default(0),
      engagementRate: z.string().optional(),
      impressions: z.number().default(0),
      reach: z.number().default(0),
      linkClicks: z.number().default(0),
      profileVisits: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;

      // Check if entry exists
      const existing = await ctx.db.query.socialMediaStats.findFirst({
        where: and(
          eq(socialMediaStats.orgId, orgId),
          eq(socialMediaStats.platform, input.platform),
          eq(socialMediaStats.date, input.date),
        ),
      });

      if (existing) {
        const [updated] = await ctx.db.update(socialMediaStats)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(socialMediaStats.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await ctx.db.insert(socialMediaStats).values({
        orgId,
        ...input,
        enteredBy: ctx.session.userId,
      }).returning();

      return created;
    }),

  getLatest: protectedProcedure
    .query(async ({ ctx }) => {
      const orgId = ctx.session.orgId;
      const platforms: Record<string, { latest: typeof socialMediaStats.$inferSelect | null; previous: typeof socialMediaStats.$inferSelect | null }> = {};

      for (const platform of platformValues) {
        const entries = await ctx.db.query.socialMediaStats.findMany({
          where: and(
            eq(socialMediaStats.orgId, orgId),
            eq(socialMediaStats.platform, platform),
          ),
          orderBy: [desc(socialMediaStats.date)],
          limit: 2,
        });
        platforms[platform] = {
          latest: entries[0] || null,
          previous: entries[1] || null,
        };
      }

      return platforms;
    }),
});
