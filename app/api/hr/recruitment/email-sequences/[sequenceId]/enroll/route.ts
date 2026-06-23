import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { emailSequences, emailSequenceEnrollments, emailSequenceSteps } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const enrollSchema = z.object({
  candidateIds: z.array(z.number().int().positive()).min(1).max(100),
});

type RouteContext = { params: Promise<{ sequenceId: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN" && role !== "HR_MANAGER") {
      return err("Forbidden", 403);
    }

    const { sequenceId } = await params;
    const id = Number(sequenceId);
    if (!Number.isFinite(id)) return err("Invalid sequence ID", 400);

    const sequence = await db.query.emailSequences.findFirst({
      where: and(eq(emailSequences.id, id), eq(emailSequences.orgId, session.orgId)),
    });
    if (!sequence) return err("Sequence not found", 404);
    if (!sequence.isActive) return err("Sequence is inactive", 400);

    const body = await parseBody(req, enrollSchema);

    const firstStep = await db.query.emailSequenceSteps.findFirst({
      where: eq(emailSequenceSteps.sequenceId, id),
      orderBy: (s, { asc }) => [asc(s.stepOrder)],
    });

    const nextSendAt = firstStep
      ? new Date(Date.now() + firstStep.delayDays * 86_400_000)
      : null;

    const rows = body.candidateIds.map((candidateId) => ({
      sequenceId: id,
      candidateId,
      currentStep: 0,
      status: "ACTIVE" as const,
      nextSendAt,
    }));

    await db.insert(emailSequenceEnrollments).values(rows).onConflictDoNothing();

    return ok({ enrolled: rows.length });
  });
}
