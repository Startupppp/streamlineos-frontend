import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { emailSequences, emailSequenceSteps } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const stepSchema = z.object({
  stepOrder: z.number().int().min(0),
  delayDays: z.number().int().min(0).default(0),
  subject: z.string().min(1).max(500).trim(),
  htmlBody: z.string().min(1),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
  triggerType: z.enum(["MANUAL", "CANDIDATE_ADDED", "APPLICATION_RECEIVED", "STAGE_CHANGED", "OFFER_SENT"]).optional(),
  targetAudience: z.record(z.string(), z.unknown()).optional(),
  steps: z.array(stepSchema).optional(),
});

type RouteContext = { params: Promise<{ sequenceId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const { sequenceId } = await params;
    const id = Number(sequenceId);
    if (!Number.isFinite(id)) return err("Invalid sequence ID", 400);

    const sequence = await db.query.emailSequences.findFirst({
      where: and(eq(emailSequences.id, id), eq(emailSequences.orgId, session.orgId)),
      with: {
        steps: { orderBy: (s, { asc }) => [asc(s.stepOrder)] },
        enrollments: { columns: { id: true, status: true, candidateId: true, nextSendAt: true } },
        creator: { columns: { id: true, name: true } },
      },
    });

    if (!sequence) return err("Sequence not found", 404);
    return ok(sequence);
  });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN" && role !== "HR_MANAGER") {
      return err("Forbidden", 403);
    }

    const { sequenceId } = await params;
    const id = Number(sequenceId);
    if (!Number.isFinite(id)) return err("Invalid sequence ID", 400);

    const body = await parseBody(req, updateSchema);
    const { steps, ...sequenceFields } = body;

    const [updated] = await db
      .update(emailSequences)
      .set({ ...sequenceFields, updatedAt: new Date() })
      .where(and(eq(emailSequences.id, id), eq(emailSequences.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Sequence not found", 404);

    if (steps !== undefined) {
      await db.delete(emailSequenceSteps).where(eq(emailSequenceSteps.sequenceId, id));
      if (steps.length > 0) {
        await db.insert(emailSequenceSteps).values(
          steps.map((step) => ({
            sequenceId: id,
            stepOrder: step.stepOrder,
            delayDays: step.delayDays,
            subject: step.subject,
            htmlBody: step.htmlBody,
          }))
        );
      }
    }

    const result = await db.query.emailSequences.findFirst({
      where: eq(emailSequences.id, id),
      with: { steps: { orderBy: (s, { asc }) => [asc(s.stepOrder)] } },
    });

    return ok(result);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN" && role !== "HR_MANAGER") {
      return err("Forbidden", 403);
    }

    const { sequenceId } = await params;
    const id = Number(sequenceId);
    if (!Number.isFinite(id)) return err("Invalid sequence ID", 400);

    const [deleted] = await db
      .delete(emailSequences)
      .where(and(eq(emailSequences.id, id), eq(emailSequences.orgId, session.orgId)))
      .returning({ id: emailSequences.id });

    if (!deleted) return err("Sequence not found", 404);
    return ok({ success: true });
  });
}
