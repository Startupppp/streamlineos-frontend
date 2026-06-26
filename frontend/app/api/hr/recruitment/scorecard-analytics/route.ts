import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviewScorecards, interviews, users, candidateApplications } from "@/lib/db/schema";
import { eq, and, gte, lte, avg, count, sql } from "drizzle-orm";
import { z } from "zod";
import { subDays } from "date-fns";
import type { NextRequest } from "next/server";

const INTERVIEW_TYPES = ["HR", "PHONE", "VIDEO", "ONSITE", "TECHNICAL", "FINAL"] as const;

const querySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(90),
  jobId: z.coerce.number().int().positive().optional(),
  roundType: z.enum(INTERVIEW_TYPES).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { days, jobId, roundType } = parseQuery(req, querySchema);
    const since = subDays(new Date(), days);

    const baseConditions = [
      eq(interviewScorecards.interviewerId, interviewScorecards.interviewerId),
      gte(interviewScorecards.createdAt, since),
    ];

    const scorecardRows = await db
      .select({
        interviewerId: interviewScorecards.interviewerId,
        interviewerName: users.name,
        interviewerEmail: users.email,
        recommendation: interviewScorecards.recommendation,
        interviewResult: interviews.result,
        jobPostingId: interviews.jobPostingId,
        interviewType: interviews.type,
        createdAt: interviewScorecards.createdAt,
        ratings: interviewScorecards.ratings,
      })
      .from(interviewScorecards)
      .innerJoin(interviews, eq(interviewScorecards.interviewId, interviews.id))
      .innerJoin(users, eq(interviewScorecards.interviewerId, users.id))
      .where(
        and(
          eq(interviews.orgId, session.orgId),
          gte(interviewScorecards.createdAt, since),
          ...(jobId ? [eq(interviews.jobPostingId, jobId)] : []),
          ...(roundType ? [eq(interviews.type, roundType)] : []),
        )
      );

    const byInterviewer = new Map<
      string,
      {
        interviewerId: string;
        name: string | null;
        email: string;
        totalScorecards: number;
        avgRating: number;
        recommendations: Record<string, number>;
        hireRate: number;
        hiresAfterPositive: number;
        positiveScorecards: number;
      }
    >();

    for (const row of scorecardRows) {
      const existing = byInterviewer.get(row.interviewerId) ?? {
        interviewerId: row.interviewerId,
        name: row.interviewerName,
        email: row.interviewerEmail ?? "",
        totalScorecards: 0,
        avgRating: 0,
        recommendations: {},
        hireRate: 0,
        hiresAfterPositive: 0,
        positiveScorecards: 0,
      };
      existing.totalScorecards += 1;

      const ratingsObj = (row.ratings ?? {}) as Record<string, number>;
      const ratingValues = Object.values(ratingsObj);
      const avgR = ratingValues.length > 0 ? ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length : 0;
      existing.avgRating = (existing.avgRating * (existing.totalScorecards - 1) + avgR) / existing.totalScorecards;

      const rec = row.recommendation;
      existing.recommendations[rec] = (existing.recommendations[rec] ?? 0) + 1;

      if (rec === "HIRE" || rec === "STRONG_HIRE") {
        existing.positiveScorecards += 1;
        if (row.interviewResult === "PASSED") existing.hiresAfterPositive += 1;
      }

      existing.hireRate = existing.positiveScorecards > 0
        ? (existing.hiresAfterPositive / existing.positiveScorecards) * 100
        : 0;

      byInterviewer.set(row.interviewerId, existing);
    }

    const interviewerStats = Array.from(byInterviewer.values()).map((s) => ({
      ...s,
      avgRating: Math.round(s.avgRating * 10) / 10,
      hireRate: Math.round(s.hireRate),
    }));

    const orgAvgRating = interviewerStats.length
      ? interviewerStats.reduce((s, r) => s + r.avgRating, 0) / interviewerStats.length
      : 0;

    const scoreDistribution = [
      { range: "0–2", count: 0 },
      { range: "2–4", count: 0 },
      { range: "4–6", count: 0 },
      { range: "6–8", count: 0 },
      { range: "8–10", count: 0 },
    ];
    for (const row of scorecardRows) {
      const ratingsObj = (row.ratings ?? {}) as Record<string, number>;
      const vals = Object.values(ratingsObj);
      if (!vals.length) continue;
      const avg2 = vals.reduce((s, v) => s + v, 0) / vals.length;
      const bucketIdx = Math.min(4, Math.floor(avg2 / 2));
      scoreDistribution[bucketIdx].count += 1;
    }

    return ok({
      interviewerStats,
      orgAvgRating: Math.round(orgAvgRating * 10) / 10,
      totalScorecards: scorecardRows.length,
      scoreDistribution,
      period: { days, since: since.toISOString() },
    });
  });
}
