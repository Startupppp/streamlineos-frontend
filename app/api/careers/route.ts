import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { CacheTag } from "@/lib/api/cache-tags";

const getCachedOpenJobs = unstable_cache(
  () =>
    db
      .select({
        id: jobPostings.id,
        title: jobPostings.title,
        location: jobPostings.location,
        type: jobPostings.type,
        experience: jobPostings.experience,
        description: jobPostings.description,
        requirements: jobPostings.requirements,
        benefits: jobPostings.benefits,
        openings: jobPostings.openings,
        applicationDeadline: jobPostings.applicationDeadline,
        createdAt: jobPostings.createdAt,
      })
      .from(jobPostings)
      .where(eq(jobPostings.status, "OPEN"))
      .orderBy(desc(jobPostings.createdAt)),
  [CacheTag.careers],
  { tags: [CacheTag.careers], revalidate: 300 },
);

export async function GET() {
  const data = await getCachedOpenJobs();
  return NextResponse.json(data, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
