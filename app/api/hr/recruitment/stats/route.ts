import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { jobPostings, candidates, interviews } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import type { RecruitmentStats } from "@/types/hr";

export async function GET() {
  return withAuth(async (session) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [jobs, cands, upcoming, hiredMonth] = await Promise.all([
      db
        .select({ status: jobPostings.status, count: sql<number>`count(*)` })
        .from(jobPostings)
        .where(eq(jobPostings.orgId, session.orgId))
        .groupBy(jobPostings.status),
      db
        .select({ status: candidates.status, count: sql<number>`count(*)` })
        .from(candidates)
        .where(eq(candidates.orgId, session.orgId))
        .groupBy(candidates.status),
      db
        .select({ count: sql<number>`count(*)` })
        .from(interviews)
        .where(and(eq(interviews.orgId, session.orgId), gte(interviews.scheduledAt, now))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(candidates)
        .where(
          and(
            eq(candidates.orgId, session.orgId),
            eq(candidates.status, "HIRED"),
            gte(candidates.updatedAt, monthStart)
          )
        ),
    ]);

    let totalJobs = 0;
    let openJobs = 0;
    for (const row of jobs) {
      const cnt = Number(row.count);
      totalJobs += cnt;
      if (row.status === "OPEN") openJobs += cnt;
    }

    let totalCandidates = 0;
    let newCandidates = 0;
    for (const row of cands) {
      const cnt = Number(row.count);
      totalCandidates += cnt;
      if (row.status === "NEW") newCandidates += cnt;
    }

    const stats: RecruitmentStats = {
      totalJobs,
      openJobs,
      totalCandidates,
      newCandidates,
      upcomingInterviews: Number(upcoming[0]?.count || 0),
      hiredThisMonth: Number(hiredMonth[0]?.count || 0),
    };

    return ok(stats);
  });
}
