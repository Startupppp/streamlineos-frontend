import { withAuth, ok, err, parseQuery, parseBody } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { interviews } from "@/lib/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const listSchema = z.object({
  candidateId: z.coerce.number().int().positive().optional(),
  upcoming: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const createInterviewSchema = z.object({
  candidateId: z.number(),
  jobPostingId: z.number().optional(),
  interviewerId: z.string().optional(),
  type: z.string().optional(),
  scheduledAt: z.string(),
  duration: z.number().optional(),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { candidateId, upcoming, limit } = parseQuery(req, listSchema);
    const orgId = session.orgId;

    const key = `hr:interviews:list:${orgId}:${candidateId ?? ""}:${upcoming ?? ""}:${limit}`;
    const data = await cached(
      key,
      () => {
        const conditions = [eq(interviews.orgId, orgId)];
        if (candidateId) conditions.push(eq(interviews.candidateId, candidateId));
        if (upcoming === "true") conditions.push(gte(interviews.scheduledAt, new Date()));
        return db.query.interviews.findMany({
          where: and(...conditions),
          with: { candidate: true, interviewer: true },
          orderBy: [desc(interviews.scheduledAt)],
          limit,
        });
      },
      { ttlSeconds: CACHE_TTL.SHORT },
    );

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createInterviewSchema);

    if (!body.candidateId || !body.scheduledAt) {
      return err("candidateId and scheduledAt are required.", 400);
    }

    const [interview] = await db
      .insert(interviews)
      .values({
        orgId: session.orgId,
        candidateId: body.candidateId,
        jobPostingId: body.jobPostingId,
        interviewerId: body.interviewerId,
        type: (body.type as "PHONE" | "VIDEO" | "ONSITE" | "TECHNICAL" | "HR" | "FINAL") || "VIDEO",
        scheduledAt: new Date(body.scheduledAt),
        duration: body.duration || 60,
        location: body.location,
        meetingLink: body.meetingLink,
        notes: body.notes,
        result: "PENDING",
      })
      .returning();

    await invalidateCachePattern(`hr:interviews:list:${session.orgId}:*`);

    return ok(interview);
  });
}
