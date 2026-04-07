"server-only";

import { db } from "@/lib/db";
import { socialMediaStats } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

const platformValues = [
  "instagram",
  "twitter",
  "linkedin",
  "facebook",
  "youtube",
] as const;

export async function getLatestSocialMediaStats(orgId: string) {
  const platforms: Record<
    string,
    {
      latest: typeof socialMediaStats.$inferSelect | null;
      previous: typeof socialMediaStats.$inferSelect | null;
    }
  > = {};

  for (const platform of platformValues) {
    const entries = await db.query.socialMediaStats.findMany({
      where: and(
        eq(socialMediaStats.orgId, orgId),
        eq(socialMediaStats.platform, platform)
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
}
