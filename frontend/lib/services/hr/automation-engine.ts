import "server-only";
import { db } from "@/lib/db";
import { pipelineAutomations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { PipelineTrigger } from "@/lib/db/schema/hr/hiring";

export interface AutomationContext {
  candidateId?: number;
  jobPostingId?: number;
  orgId: string;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

export async function triggerAutomations(
  orgId: string,
  trigger: PipelineTrigger,
  context: AutomationContext,
): Promise<void> {
  const automations = await db.query.pipelineAutomations.findMany({
    where: and(
      eq(pipelineAutomations.orgId, orgId),
      eq(pipelineAutomations.trigger, trigger),
      eq(pipelineAutomations.isActive, true),
    ),
  });

  for (const automation of automations) {
    try {
      await executeAutomation(automation, context);
    } catch {
    }
  }
}

async function executeAutomation(
  automation: typeof pipelineAutomations.$inferSelect,
  context: AutomationContext,
): Promise<void> {
  const payload = automation.actionPayload as Record<string, unknown>;

  switch (automation.action) {
    case "SEND_NOTIFICATION": {
      break;
    }
    case "NOTIFY_HIRING_MANAGER": {
      break;
    }
    case "SEND_EMAIL": {
      break;
    }
    case "MOVE_TO_STAGE": {
      break;
    }
    case "CREATE_INTERVIEW": {
      break;
    }
  }
}
