import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users, jobRecruiters, recruiterActivityLog, candidates, interviews } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const hrRoles = ["CEO", "HR", "ADMIN", "HR_MANAGER", "RECRUITER"];

    const members = await db
      .select({
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.orgId, session.orgId),
          sql`${organizationMembers.role} = ANY(ARRAY[${sql.join(hrRoles.map(r => sql`${r}`), sql`, `)}])`
        )
      );

    const recruiterIds = members.map((m) => m.userId);
    if (!recruiterIds.length) return ok([]);

    const assignmentCounts = await db
      .select({
        userId: jobRecruiters.userId,
        jobCount: count(jobRecruiters.id),
      })
      .from(jobRecruiters)
      .where(sql`${jobRecruiters.userId} = ANY(ARRAY[${sql.join(recruiterIds.map(id => sql`${id}`), sql`, `)}])`)
      .groupBy(jobRecruiters.userId);

    const activityCounts = await db
      .select({
        recruiterId: recruiterActivityLog.recruiterId,
        action: recruiterActivityLog.action,
        cnt: count(recruiterActivityLog.id),
      })
      .from(recruiterActivityLog)
      .where(
        and(
          eq(recruiterActivityLog.orgId, session.orgId),
          sql`${recruiterActivityLog.recruiterId} = ANY(ARRAY[${sql.join(recruiterIds.map(id => sql`${id}`), sql`, `)}])`
        )
      )
      .groupBy(recruiterActivityLog.recruiterId, recruiterActivityLog.action);

    const jobCountMap = new Map(assignmentCounts.map((r) => [r.userId, Number(r.jobCount)]));
    const activityMap = new Map<string, Record<string, number>>();
    for (const row of activityCounts) {
      const existing = activityMap.get(row.recruiterId) ?? {};
      existing[row.action] = Number(row.cnt);
      activityMap.set(row.recruiterId, existing);
    }

    const result = members.map((m) => ({
      userId: m.userId,
      name: m.name,
      email: m.email,
      image: m.image,
      role: m.role,
      assignedJobsCount: jobCountMap.get(m.userId) ?? 0,
      activitySummary: activityMap.get(m.userId) ?? {},
    }));

    return ok(result);
  });
}
