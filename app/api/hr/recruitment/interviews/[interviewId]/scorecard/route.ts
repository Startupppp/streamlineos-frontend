import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviewScorecards, interviews, candidates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { inngest } from "@/lib/inngest/client";

const submitScorecardSchema = z.object({
  ratings: z.record(z.string(), z.number().min(0).max(10)),
  recommendation: z.enum(["HIRE", "NO_HIRE", "MAYBE"]),
  notes: z.string().optional(),
  templateId: z.number().int().positive().optional(),
  isBlindMode: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  return withAuth(async (session) => {
    const { interviewId: idParam } = await params;
    const interviewId = Number(idParam);
    if (!interviewId) return err("Invalid interview ID.", 400);

    const interview = await db.query.interviews.findFirst({
      where: and(eq(interviews.id, interviewId), eq(interviews.orgId, session.orgId)),
    });
    if (!interview) return err("Interview not found.", 404);

    const scorecard = await db.query.interviewScorecards.findFirst({
      where: and(
        eq(interviewScorecards.interviewId, interviewId),
        eq(interviewScorecards.interviewerId, session.user.id)
      ),
    });

    if (!scorecard) {
      return ok(null);
    }

    return ok(scorecard);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  return withAuth(async (session) => {
    const { interviewId: idParam } = await params;
    const interviewId = Number(idParam);
    if (!interviewId) return err("Invalid interview ID.", 400);

    const interview = await db.query.interviews.findFirst({
      where: and(eq(interviews.id, interviewId), eq(interviews.orgId, session.orgId)),
    });
    if (!interview) return err("Interview not found.", 404);

    const existing = await db.query.interviewScorecards.findFirst({
      where: and(
        eq(interviewScorecards.interviewId, interviewId),
        eq(interviewScorecards.interviewerId, session.user.id)
      ),
    });
    if (existing?.submittedAt) {
      return err("Scorecard already submitted.", 403);
    }

    const body = await parseBody(req, submitScorecardSchema);

    if (existing) {
      const [updated] = await db
        .update(interviewScorecards)
        .set({
          ratings: body.ratings,
          recommendation: body.recommendation,
          notes: body.notes ?? null,
          ...(body.templateId !== undefined && { templateId: body.templateId }),
          ...(body.isBlindMode !== undefined && { isBlindMode: body.isBlindMode }),
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(interviewScorecards.id, existing.id))
        .returning();

      void inngest
        .send({
          name: "hr/interview.scorecard.submitted",
          data: { interviewId, orgId: session.orgId, candidateId: interview.candidateId },
        })
        .catch(() => {});

      void import("@/lib/services/automation/engine").then(async ({ runAutomationsForEvent }) => {
        const interviewCandidate = await db.query.candidates.findFirst({
          where: and(eq(candidates.id, interview.candidateId), eq(candidates.orgId, session.orgId)),
          columns: { firstName: true, lastName: true },
        });
        await runAutomationsForEvent(session.orgId, "scorecard.submitted", {
          interviewId,
          candidateId: interview.candidateId,
          candidateName: interviewCandidate ? `${interviewCandidate.firstName} ${interviewCandidate.lastName}` : "",
          interviewerName: session.user.name ?? "",
          recommendation: body.recommendation,
          submittedAt: new Date().toISOString(),
        });
      });

      return ok(updated);
    }

    const [scorecard] = await db
      .insert(interviewScorecards)
      .values({
        interviewId,
        interviewerId: session.user.id,
        templateId: body.templateId ?? null,
        ratings: body.ratings,
        recommendation: body.recommendation,
        notes: body.notes ?? null,
        isBlindMode: body.isBlindMode ?? false,
        submittedAt: new Date(),
      })
      .returning();

    void inngest
      .send({
        name: "hr/interview.scorecard.submitted",
        data: { interviewId, orgId: session.orgId, candidateId: interview.candidateId },
      })
      .catch(() => {});

    void import("@/lib/services/automation/engine").then(async ({ runAutomationsForEvent }) => {
      const interviewCandidate = await db.query.candidates.findFirst({
        where: and(eq(candidates.id, interview.candidateId), eq(candidates.orgId, session.orgId)),
        columns: { firstName: true, lastName: true },
      });
      await runAutomationsForEvent(session.orgId, "scorecard.submitted", {
        interviewId,
        candidateId: interview.candidateId,
        candidateName: interviewCandidate ? `${interviewCandidate.firstName} ${interviewCandidate.lastName}` : "",
        interviewerName: session.user.name ?? "",
        recommendation: body.recommendation,
        submittedAt: new Date().toISOString(),
      });
    });

    return ok(scorecard, 201);
  });
}
