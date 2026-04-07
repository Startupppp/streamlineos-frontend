import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { socialMediaStats } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const platformValues = [
  "instagram",
  "twitter",
  "linkedin",
  "facebook",
  "youtube",
] as const;

const upsertSchema = z.object({
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
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await req.json();
      const input = upsertSchema.parse(body);
      const orgId = session.orgId;

      const existing = await db.query.socialMediaStats.findFirst({
        where: and(
          eq(socialMediaStats.orgId, orgId),
          eq(socialMediaStats.platform, input.platform),
          eq(socialMediaStats.date, input.date)
        ),
      });

      if (existing) {
        const [updated] = await db
          .update(socialMediaStats)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(socialMediaStats.id, existing.id))
          .returning();
        return ok(updated);
      }

      const [created] = await db
        .insert(socialMediaStats)
        .values({
          orgId,
          ...input,
          enteredBy: session.user.id,
        })
        .returning();

      return ok(created, 201);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to upsert social media stats",
        500
      );
    }
  });
}
