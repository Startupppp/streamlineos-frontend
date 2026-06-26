import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { recruiterActivityLog, candidates, jobPostings, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const logSchema = z.object({
  action: z.enum(["CALL_MADE", "EMAIL_SENT", "CANDIDATE_ADDED", "NOTE_ADDED", "INTERVIEW_SCHEDULED"]),
  candidateId: z.number().int().positive().optional(),
  jobPostingId: z.number().int().positive().optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const url = new URL(req.url);
    const recruiterId = url.searchParams.get("recruiterId");
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(Number(limitParam ?? "50"), 200);

    const conditions = [eq(recruiterActivityLog.orgId, session.orgId)];
    if (recruiterId) {
      conditions.push(eq(recruiterActivityLog.recruiterId, recruiterId));
    }

    const rows = await db
      .select({
        id: recruiterActivityLog.id,
        recruiterId: recruiterActivityLog.recruiterId,
        action: recruiterActivityLog.action,
        candidateId: recruiterActivityLog.candidateId,
        jobPostingId: recruiterActivityLog.jobPostingId,
        notes: recruiterActivityLog.notes,
        createdAt: recruiterActivityLog.createdAt,
        recruiterName: users.name,
        candidateFirstName: candidates.firstName,
        candidateLastName: candidates.lastName,
        jobTitle: jobPostings.title,
      })
      .from(recruiterActivityLog)
      .leftJoin(users, eq(recruiterActivityLog.recruiterId, users.id))
      .leftJoin(candidates, eq(recruiterActivityLog.candidateId, candidates.id))
      .leftJoin(jobPostings, eq(recruiterActivityLog.jobPostingId, jobPostings.id))
      .where(and(...conditions))
      .orderBy(desc(recruiterActivityLog.createdAt))
      .limit(limit);

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, logSchema);

    if (body.candidateId) {
      const cand = await db.query.candidates.findFirst({
        where: and(eq(candidates.id, body.candidateId), eq(candidates.orgId, session.orgId)),
        columns: { id: true },
      });
      if (!cand) return err("Candidate not found", 404);
    }

    const [row] = await db
      .insert(recruiterActivityLog)
      .values({
        orgId: session.orgId,
        recruiterId: session.user.id,
        action: body.action,
        candidateId: body.candidateId,
        jobPostingId: body.jobPostingId,
        notes: body.notes,
      })
      .returning();

    return ok(row, 201);
  });
}
