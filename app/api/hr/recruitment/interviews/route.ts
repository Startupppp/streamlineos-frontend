import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviews } from "@/lib/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const candidateId = searchParams.get("candidateId");
    const upcoming = searchParams.get("upcoming");

    const conditions = [eq(interviews.orgId, session.orgId)];
    if (candidateId) conditions.push(eq(interviews.candidateId, Number(candidateId)));
    if (upcoming === "true") conditions.push(gte(interviews.scheduledAt, new Date()));

    const data = await db.query.interviews.findMany({
      where: and(...conditions),
      with: { candidate: true, interviewer: true },
      orderBy: [desc(interviews.scheduledAt)],
    });

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await req.json() as {
      candidateId: number;
      jobPostingId?: number;
      interviewerId?: string;
      type?: string;
      scheduledAt: string;
      duration?: number;
      location?: string;
      meetingLink?: string;
      notes?: string;
    };

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

    return ok(interview);
  });
}
