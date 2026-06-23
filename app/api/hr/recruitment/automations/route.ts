import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { pipelineAutomations } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const triggerEnum = z.enum([
  "STAGE_CHANGED", "INTERVIEW_RESULT_SET", "SLA_BREACHED",
  "OFFER_SENT", "OFFER_ACCEPTED", "OFFER_REJECTED", "SCORECARD_SUBMITTED",
]);

const actionEnum = z.enum([
  "SEND_EMAIL", "MOVE_TO_STAGE", "CREATE_INTERVIEW", "SEND_NOTIFICATION", "NOTIFY_HIRING_MANAGER",
]);

const createSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  trigger: triggerEnum,
  triggerConditions: z.record(z.string(), z.unknown()).optional().default({}),
  action: actionEnum,
  actionPayload: z.record(z.string(), z.unknown()).optional().default({}),
  isActive: z.boolean().optional().default(true),
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const data = await db.query.pipelineAutomations.findMany({
      where: eq(pipelineAutomations.orgId, session.orgId),
      with: { creator: { columns: { id: true, name: true } } },
      orderBy: [desc(pipelineAutomations.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN" && role !== "HR_MANAGER") {
      return err("Forbidden", 403);
    }

    const body = await parseBody(req, createSchema);

    const [automation] = await db.insert(pipelineAutomations).values({
      orgId: session.orgId,
      name: body.name,
      trigger: body.trigger,
      triggerConditions: body.triggerConditions ?? {},
      action: body.action,
      actionPayload: body.actionPayload ?? {},
      isActive: body.isActive ?? true,
      createdBy: session.user.id,
    }).returning();

    return ok(automation, 201);
  });
}
