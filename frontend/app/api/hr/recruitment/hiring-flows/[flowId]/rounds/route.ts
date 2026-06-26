import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { invalidateCachePattern } from "@/lib/cache";
import { db } from "@/lib/db";
import { hiringFlows, hiringFlowRounds } from "@/lib/db/schema";
import { eq, and, max } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createRoundSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  roundType: z.enum(["HR_SCREENING", "TECHNICAL", "MANAGER", "CULTURAL_FIT", "FINAL", "CUSTOM"]).default("CUSTOM"),
  mode: z.enum(["VIDEO", "PHONE", "ONSITE"]).default("VIDEO"),
  durationMinutes: z.coerce.number().int().min(15).max(480).default(60),
  slaDays: z.coerce.number().int().min(1).max(30).optional(),
  questionBankTag: z.string().max(100).optional(),
  scorecardTemplateId: z.coerce.number().int().optional(),
  interviewerRoleRestriction: z.string().max(100).optional(),
  autoAdvanceThreshold: z.coerce.number().int().min(0).max(100).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ flowId: string }> },
) {
  return withAuth(async (session) => {
    const { flowId } = await params;
    const id = Number(flowId);
    if (isNaN(id)) return err("Invalid flow ID", 400);

    const flow = await db.query.hiringFlows.findFirst({
      where: and(eq(hiringFlows.id, id), eq(hiringFlows.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!flow) return err("Hiring flow not found", 404);

    const rounds = await db.query.hiringFlowRounds.findMany({
      where: eq(hiringFlowRounds.flowId, id),
      orderBy: (r, { asc }) => [asc(r.orderIndex)],
    });

    return ok(rounds);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ flowId: string }> },
) {
  return withAuth(async (session) => {
    const { flowId } = await params;
    const id = Number(flowId);
    if (isNaN(id)) return err("Invalid flow ID", 400);

    const flow = await db.query.hiringFlows.findFirst({
      where: and(eq(hiringFlows.id, id), eq(hiringFlows.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!flow) return err("Hiring flow not found", 404);

    const body = await parseBody(req, createRoundSchema);

    const maxResult = await db
      .select({ maxOrder: max(hiringFlowRounds.orderIndex) })
      .from(hiringFlowRounds)
      .where(eq(hiringFlowRounds.flowId, id));

    const nextOrder = (maxResult[0]?.maxOrder ?? -1) + 1;

    const [round] = await db
      .insert(hiringFlowRounds)
      .values({
        flowId: id,
        orgId: session.orgId,
        name: body.name.trim(),
        roundType: body.roundType,
        mode: body.mode,
        durationMinutes: body.durationMinutes,
        slaDays: body.slaDays,
        questionBankTag: body.questionBankTag,
        scorecardTemplateId: body.scorecardTemplateId,
        interviewerRoleRestriction: body.interviewerRoleRestriction,
        autoAdvanceThreshold: body.autoAdvanceThreshold,
        orderIndex: nextOrder,
      })
      .returning();

    await invalidateCachePattern(`hr:hiring-flows:list:${session.orgId}:*`);
    await invalidateCachePattern(`hr:hiring-flow:${session.orgId}:${id}`);
    return ok(round, 201);
  });
}

export const dynamic = "force-dynamic";
