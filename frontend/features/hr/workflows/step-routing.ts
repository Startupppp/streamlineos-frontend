import { APPROVAL_RUNG_LABELS } from "@/components/shared/approval-route-panel";
import type { HrWorkflowInstance } from "@/types/hr/workflows";

export interface WorkflowStepRouting {
  rungLabel: string | null;
  explanation: string;
  escalationLabel: string | null;
  delegatedFromUserId: string | null;
}

function isRungKey(value: unknown): value is keyof typeof APPROVAL_RUNG_LABELS {
  return typeof value === "string" && value in APPROVAL_RUNG_LABELS;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function currentStepRouting(instance: Pick<HrWorkflowInstance, "context" | "currentStepOrder">): WorkflowStepRouting | null {
  const table = instance.context["approvalRouting"];
  if (!isRecord(table)) return null;
  const entry = table[String(instance.currentStepOrder)];
  if (!isRecord(entry) || typeof entry["explanation"] !== "string") return null;
  const delegation = entry["delegation"];
  const delegatedFromUserId =
    isRecord(delegation) && typeof delegation["fromUserId"] === "string" ? delegation["fromUserId"] : null;
  return {
    rungLabel: isRungKey(entry["rung"]) ? APPROVAL_RUNG_LABELS[entry["rung"]] : null,
    explanation: entry["explanation"],
    escalationLabel: isRungKey(entry["escalationRung"]) ? APPROVAL_RUNG_LABELS[entry["escalationRung"]].toLowerCase() : null,
    delegatedFromUserId,
  };
}
