import "server-only";
import { unstable_cache } from "next/cache";
import { sql, gte, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { platformVisits } from "@/lib/db/schema";

const DAY_MS = 24 * 60 * 60 * 1000;

async function loadVisitorAnalytics() {
  const since30d = new Date(Date.now() - 30 * DAY_MS);

  const [byDay, topPaths, topReferrers, recent] = await Promise.all([
    db
      .select({
        date: sql<string>`to_char(${platformVisits.createdAt}, 'YYYY-MM-DD')`,
        visits: sql<number>`count(*)::int`,
        unique: sql<number>`count(distinct ${platformVisits.sessionToken})::int`,
      })
      .from(platformVisits)
      .where(gte(platformVisits.createdAt, since30d))
      .groupBy(sql`to_char(${platformVisits.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${platformVisits.createdAt}, 'YYYY-MM-DD')`),
    db
      .select({
        path: platformVisits.path,
        visits: sql<number>`count(*)::int`,
      })
      .from(platformVisits)
      .where(gte(platformVisits.createdAt, since30d))
      .groupBy(platformVisits.path)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
    db
      .select({
        referrer: platformVisits.referrer,
        visits: sql<number>`count(*)::int`,
      })
      .from(platformVisits)
      .where(gte(platformVisits.createdAt, since30d))
      .groupBy(platformVisits.referrer)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
    db
      .select({
        path: platformVisits.path,
        referrer: platformVisits.referrer,
        country: platformVisits.country,
        userAgent: platformVisits.userAgent,
        createdAt: platformVisits.createdAt,
      })
      .from(platformVisits)
      .orderBy(desc(platformVisits.createdAt))
      .limit(50),
  ]);

  return { byDay, topPaths, topReferrers, recent };
}

export const getVisitorAnalytics = unstable_cache(loadVisitorAnalytics, ["owner:visitors"], {
  revalidate: 30,
  tags: ["owner-visitors"],
});
