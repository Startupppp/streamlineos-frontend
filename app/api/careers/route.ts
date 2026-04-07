import { ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const data = await db
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
    .orderBy(desc(jobPostings.createdAt));

  return ok(data);
}
