import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { pipelineAutomations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  isActive: z.boolean().optional(),
  triggerConditions: z.record(z.string(), z.unknown()).optional(),
  action: z.enum(["SEND_EMAIL", "MOVE_TO_STAGE", "CREATE_INTERVIEW", "SEND_NOTIFICATION", "NOTIFY_HIRING_MANAGER"]).optional(),
  actionPayload: z.record(z.string(), z.unknown()).optional(),
});

type RouteContext = { params: Promise<{ automationId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN" && role !== "HR_MANAGER") {
      return err("Forbidden", 403);
    }

    const { automationId } = await params;
    const id = Number(automationId);
    if (!Number.isFinite(id)) return err("Invalid automation ID", 400);

    const body = await parseBody(req, updateSchema);

    const [updated] = await db
      .update(pipelineAutomations)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(pipelineAutomations.id, id), eq(pipelineAutomations.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Automation not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN" && role !== "HR_MANAGER") {
      return err("Forbidden", 403);
    }

    const { automationId } = await params;
    const id = Number(automationId);
    if (!Number.isFinite(id)) return err("Invalid automation ID", 400);

    const [deleted] = await db
      .delete(pipelineAutomations)
      .where(and(eq(pipelineAutomations.id, id), eq(pipelineAutomations.orgId, session.orgId)))
      .returning({ id: pipelineAutomations.id });

    if (!deleted) return err("Automation not found", 404);
    return ok({ success: true });
  });
}
