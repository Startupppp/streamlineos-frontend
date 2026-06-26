import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { invalidateCachePattern } from "@/lib/cache";
import { db } from "@/lib/db";
import { hiringFlows, hiringFlowRounds } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateRoundSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  roundType: z.enum(["HR_SCREENING", "TECHNICAL", "MANAGER", "CULTURAL_FIT", "FINAL", "CUSTOM"]).optional(),
  mode: z.enum(["VIDEO", "PHONE", "ONSITE"]).optional(),
  durationMinutes: z.coerce.number().int().min(15).max(480).optional(),
  slaDays: z.coerce.number().int().min(1).max(30).nullable().optional(),
  questionBankTag: z.string().max(100).nullable().optional(),
  scorecardTemplateId: z.coerce.number().int().nullable().optional(),
  interviewerRoleRestriction: z.string().max(100).nullable().optional(),
  autoAdvanceThreshold: z.coerce.number().int().min(0).max(100).nullable().optional(),
  orderIndex: z.coerce.number().int().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ flowId: string; roundId: string }> },
) {
  return withAuth(async (session) => {
    const { flowId, roundId } = await params;
    const fId = Number(flowId);
    const rId = Number(roundId);
    if (isNaN(fId) || isNaN(rId)) return err("Invalid ID", 400);

    const flow = await db.query.hiringFlows.findFirst({
      where: and(eq(hiringFlows.id, fId), eq(hiringFlows.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!flow) return err("Hiring flow not found", 404);

    const existing = await db.query.hiringFlowRounds.findFirst({
      where: and(eq(hiringFlowRounds.id, rId), eq(hiringFlowRounds.flowId, fId)),
      columns: { id: true },
    });
    if (!existing) return err("Round not found", 404);

    const body = await parseBody(req, updateRoundSchema);

    const [updated] = await db
      .update(hiringFlowRounds)
      .set({
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.roundType !== undefined && { roundType: body.roundType }),
        ...(body.mode !== undefined && { mode: body.mode }),
        ...(body.durationMinutes !== undefined && { durationMinutes: body.durationMinutes }),
        ...(body.slaDays !== undefined && { slaDays: body.slaDays }),
        ...(body.questionBankTag !== undefined && { questionBankTag: body.questionBankTag }),
        ...(body.scorecardTemplateId !== undefined && { scorecardTemplateId: body.scorecardTemplateId }),
        ...(body.interviewerRoleRestriction !== undefined && { interviewerRoleRestriction: body.interviewerRoleRestriction }),
        ...(body.autoAdvanceThreshold !== undefined && { autoAdvanceThreshold: body.autoAdvanceThreshold }),
        ...(body.orderIndex !== undefined && { orderIndex: body.orderIndex }),
      })
      .where(and(eq(hiringFlowRounds.id, rId), eq(hiringFlowRounds.flowId, fId)))
      .returning();

    await invalidateCachePattern(`hr:hiring-flows:list:${session.orgId}:*`);
    await invalidateCachePattern(`hr:hiring-flow:${session.orgId}:${fId}`);
    return ok(updated);
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ flowId: string; roundId: string }> },
) {
  return withAuth(async (session) => {
    const { flowId, roundId } = await params;
    const fId = Number(flowId);
    const rId = Number(roundId);
    if (isNaN(fId) || isNaN(rId)) return err("Invalid ID", 400);

    const flow = await db.query.hiringFlows.findFirst({
      where: and(eq(hiringFlows.id, fId), eq(hiringFlows.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!flow) return err("Hiring flow not found", 404);

    await db
      .delete(hiringFlowRounds)
      .where(and(eq(hiringFlowRounds.id, rId), eq(hiringFlowRounds.flowId, fId)));

    await invalidateCachePattern(`hr:hiring-flows:list:${session.orgId}:*`);
    await invalidateCachePattern(`hr:hiring-flow:${session.orgId}:${fId}`);
    return ok({ success: true });
  });
}

export const dynamic = "force-dynamic";
