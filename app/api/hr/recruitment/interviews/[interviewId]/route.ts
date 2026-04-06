import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviews } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  return withAuth(async (session) => {
    const { interviewId: id } = await params;
    const interviewId = Number(id);
    if (!interviewId) return err("Invalid interview ID.", 400);

    const existing = await db.query.interviews.findFirst({
      where: and(eq(interviews.id, interviewId), eq(interviews.orgId, session.orgId)),
    });
    if (!existing) return err("Interview not found.", 404);

    const body = await req.json() as Record<string, unknown>;

    await db
      .update(interviews)
      .set({
        ...(body.type !== undefined && { type: body.type as typeof existing.type }),
        ...(body.scheduledAt !== undefined && { scheduledAt: new Date(body.scheduledAt as string) }),
        ...(body.duration !== undefined && { duration: body.duration as number }),
        ...(body.location !== undefined && { location: body.location as string }),
        ...(body.meetingLink !== undefined && { meetingLink: body.meetingLink as string }),
        ...(body.result !== undefined && { result: body.result as typeof existing.result }),
        ...(body.feedback !== undefined && { feedback: body.feedback as string }),
        ...(body.rating !== undefined && { rating: body.rating as number }),
        ...(body.rubric !== undefined && { rubric: body.rubric as { category: string; score: number; maxScore: number; comment?: string }[] }),
        ...(body.notes !== undefined && { notes: body.notes as string }),
        updatedAt: new Date(),
      })
      .where(eq(interviews.id, interviewId));

    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  return withAuth(async (session) => {
    const { interviewId: id } = await params;
    const interviewId = Number(id);
    if (!interviewId) return err("Invalid interview ID.", 400);

    await db.delete(interviews).where(
      and(eq(interviews.id, interviewId), eq(interviews.orgId, session.orgId))
    );

    return ok({ success: true });
  });
}
