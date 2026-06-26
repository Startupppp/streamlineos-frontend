import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const jobs = await db.query.jobPostings.findMany({
      where: and(
        eq(jobPostings.orgId, session.orgId),
        eq(jobPostings.isInternal, true),
        eq(jobPostings.status, "OPEN")
      ),
      with: {
        department: { columns: { id: true, name: true } },
        postedByUser: { columns: { id: true, name: true } },
      },
      columns: {
        id: true,
        title: true,
        departmentId: true,
        location: true,
        type: true,
        experience: true,
        description: true,
        requirements: true,
        openings: true,
        applicationDeadline: true,
        createdAt: true,
      },
    });
    return ok(jobs);
  });
}
