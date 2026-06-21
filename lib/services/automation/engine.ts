import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { automationRules, automationRuns, tasks } from "@/lib/db/schema";
import type { AutomationCondition, AutomationAction } from "@/lib/db/schema/automation/rules";
import { notifyByRoles, notifyAllMembers } from "@/server/actions/create-notification";
import { sendEmail } from "@/lib/email/sender";
import { logger } from "@/lib/logger";

export type Condition = AutomationCondition;
export type Action = AutomationAction;

export type AutomationTrigger =
  | "lead.created"
  | "deal.stage_changed"
  | "ticket.created"
  | "invoice.overdue"
  | "candidate.application_created"
  | "candidate.stage_changed"
  | "interview.scheduled"
  | "interview.completed"
  | "scorecard.submitted"
  | "offer.sent"
  | "offer.accepted"
  | "offer.rejected"
  | "candidate.bgv_status_changed"
  | "sla.breached"
  | "onboarding.started"
  | "onboarding.task_overdue"
  | "onboarding.document_submitted"
  | "onboarding.completed"
  | "leave.requested"
  | "leave.approved"
  | "leave.rejected"
  | "attendance.anomaly"
  | "resignation.submitted"
  | "resignation.approved"
  | "employee.terminated"
  | "certification.expiring"
  | "document.review_requested"
  | "performance.review_cycle_started"
  | "expense.submitted"
  | "reimbursement.approved"
  | "reimbursement.rejected";

export type EventPayload = Record<string, unknown>;

interface ActionResult {
  type: Action["type"];
  ok: boolean;
  error?: string;
}

interface EvaluationResult {
  matched: boolean;
  actionResults: ActionResult[];
}

function getFieldValue(payload: EventPayload, field: string): unknown {
  return Object.prototype.hasOwnProperty.call(payload, field) ? payload[field] : undefined;
}

function toComparable(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function evaluateCondition(condition: Condition, payload: EventPayload): boolean {
  const actual = getFieldValue(payload, condition.field);

  switch (condition.op) {
    case "exists":
      return actual !== undefined && actual !== null && actual !== "";
    case "eq":
      return toComparable(actual) === toComparable(condition.value);
    case "neq":
      return toComparable(actual) !== toComparable(condition.value);
    case "contains":
      return toComparable(actual).toLowerCase().includes(toComparable(condition.value).toLowerCase());
    case "gt": {
      const a = toNumber(actual);
      const b = toNumber(condition.value);
      return a !== null && b !== null && a > b;
    }
    case "lt": {
      const a = toNumber(actual);
      const b = toNumber(condition.value);
      return a !== null && b !== null && a < b;
    }
    default:
      return false;
  }
}

export function evaluateConditions(conditions: Condition[], payload: EventPayload): boolean {
  if (!Array.isArray(conditions) || conditions.length === 0) return true;
  return conditions.every((condition) => evaluateCondition(condition, payload));
}

export async function executeAction(
  orgId: string,
  action: Action,
  payload: EventPayload,
): Promise<ActionResult> {
  try {
    switch (action.type) {
      case "notify_roles": {
        await notifyByRoles(orgId, action.config.roles, {
          title: action.config.title,
          message: action.config.message,
          link: action.config.link,
        });
        return { type: action.type, ok: true };
      }
      case "notify_all": {
        await notifyAllMembers(orgId, {
          title: action.config.title,
          message: action.config.message,
          link: action.config.link,
        });
        return { type: action.type, ok: true };
      }
      case "email": {
        await sendEmail({
          to: action.config.to,
          subject: action.config.subject,
          html: action.config.body,
        });
        return { type: action.type, ok: true };
      }
      case "create_task": {
        const dueDate =
          typeof action.config.dueInDays === "number"
            ? new Date(Date.now() + action.config.dueInDays * 24 * 60 * 60 * 1000)
            : null;
        await db.insert(tasks).values({
          orgId,
          title: action.config.title,
          assigneeId: action.config.assigneeId ?? null,
          dueDate,
        });
        return { type: action.type, ok: true };
      }
      case "webhook": {
        const { dispatchWebhook } = await import("@/lib/inngest/dispatch-webhook");
        await dispatchWebhook(orgId, action.config.event, payload);
        return { type: action.type, ok: true };
      }
      default:
        return { type: "webhook", ok: false, error: "Unknown action type" };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action execution failed";
    return { type: action.type, ok: false, error: message };
  }
}

export async function runRule(
  orgId: string,
  rule: { id: number; conditions: Condition[]; actions: Action[] },
  triggerEvent: string,
  payload: EventPayload,
): Promise<EvaluationResult> {
  const matched = evaluateConditions(rule.conditions, payload);
  if (!matched) {
    return { matched: false, actionResults: [] };
  }

  const actionResults: ActionResult[] = [];
  for (const action of rule.actions) {
    const result = await executeAction(orgId, action, payload);
    actionResults.push(result);
  }

  return { matched: true, actionResults };
}

export async function runAutomationsForEvent(
  orgId: string,
  triggerEvent: AutomationTrigger,
  payload: EventPayload,
): Promise<void> {
  try {
    const rules = await db.query.automationRules.findMany({
      where: and(
        eq(automationRules.orgId, orgId),
        eq(automationRules.triggerEvent, triggerEvent),
        eq(automationRules.isEnabled, true),
      ),
      columns: { id: true, conditions: true, actions: true },
    });

    if (rules.length === 0) return;

    for (const rule of rules) {
      try {
        const { matched, actionResults } = await runRule(orgId, rule, triggerEvent, payload);

        if (!matched) {
          await db.insert(automationRuns).values({
            orgId,
            ruleId: rule.id,
            triggerEvent,
            status: "skipped",
            payload,
          });
          continue;
        }

        const failures = actionResults.filter((r) => !r.ok);
        await db
          .update(automationRules)
          .set({ runCount: sql`${automationRules.runCount} + 1`, lastRunAt: new Date() })
          .where(eq(automationRules.id, rule.id));

        await db.insert(automationRuns).values({
          orgId,
          ruleId: rule.id,
          triggerEvent,
          status: failures.length === 0 ? "success" : "failed",
          payload,
          result: { actionResults },
          error: failures.length > 0 ? failures.map((f) => `${f.type}: ${f.error}`).join("; ") : null,
        });
      } catch (error) {
        logger.error("Automation rule execution failed", { orgId, ruleId: rule.id, triggerEvent, error });
      }
    }
  } catch (error) {
    logger.error("runAutomationsForEvent failed", { orgId, triggerEvent, error });
  }
}
