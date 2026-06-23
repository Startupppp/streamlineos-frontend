import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq, sql, and, isNotNull, gte, lte, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const deptParam = url.searchParams.get("departmentIds");
    const departmentIds = deptParam
      ? deptParam.split(",").map(Number).filter((n) => !isNaN(n) && n > 0)
      : [];

    const conditions = [eq(candidates.orgId, session.orgId)];

    if (jobId) {
      conditions.push(
        sql`${candidates.id} IN (SELECT candidate_id FROM candidate_applications WHERE job_posting_id = ${Number(jobId)})`
      );
    }
    if (from) {
      conditions.push(gte(candidates.createdAt, new Date(from)));
    }
    if (to) {
      conditions.push(lte(candidates.createdAt, new Date(to)));
    }
    if (departmentIds.length > 0) {
      conditions.push(
        sql`${candidates.id} IN (SELECT candidate_id FROM candidate_applications ca JOIN job_postings jp ON jp.id = ca.job_posting_id WHERE jp.department_id = ANY(ARRAY[${sql.join(departmentIds.map((id) => sql`${id}`), sql`, `)}]::int[]))`
      );
    }

    const baseWhere = and(...conditions);

    const [genderRows, locationRows, sourceRows, stageRows, totalRow] = await Promise.all([
      db
        .select({ gender: candidates.gender, count: sql<number>`count(*)::int` })
        .from(candidates)
        .where(and(baseWhere, isNotNull(candidates.gender)))
        .groupBy(candidates.gender),

      db
        .select({ location: candidates.location, count: sql<number>`count(*)::int` })
        .from(candidates)
        .where(and(baseWhere, isNotNull(candidates.location)))
        .groupBy(candidates.location)
        .orderBy(sql`count(*) DESC`)
        .limit(20),

      db
        .select({ source: candidates.source, count: sql<number>`count(*)::int` })
        .from(candidates)
        .where(baseWhere)
        .groupBy(candidates.source)
        .orderBy(sql`count(*) DESC`),

      db
        .select({ status: candidates.status, count: sql<number>`count(*)::int` })
        .from(candidates)
        .where(baseWhere)
        .groupBy(candidates.status),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(candidates)
        .where(baseWhere),
    ]);

    return ok({
      total: totalRow[0]?.count ?? 0,
      genderBreakdown: genderRows.map((r) => ({ gender: r.gender ?? "Unknown", count: r.count })),
      locationBreakdown: locationRows.map((r) => ({ location: r.location ?? "Unknown", count: r.count })),
      sourceBreakdown: sourceRows.map((r) => ({ source: r.source ?? "Unknown", count: r.count })),
      stageBreakdown: stageRows.map((r) => ({ stage: r.status ?? "Unknown", count: r.count })),
    });
  });
}
