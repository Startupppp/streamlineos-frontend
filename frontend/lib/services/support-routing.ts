import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { supportRoutingRules, type RoutingRuleCondition } from "@/lib/db/schema";

export interface RoutableTicket {
  title?: string | null;
  category?: string | null;
  description?: string | null;
  priority?: string | null;
}

export interface RoutingOutcome {
  assigneeId?: string;
  setPriority?: string;
}

function resolveField(ticket: RoutableTicket, field: string): string | null {
  switch (field) {
    case "title":
    case "subject":
      return ticket.title ?? null;
    case "category":
      return ticket.category ?? null;
    case "description":
      return ticket.description ?? null;
    case "priority":
      return ticket.priority ?? null;
    default:
      return null;
  }
}

function matchesCondition(ticket: RoutableTicket, condition: RoutingRuleCondition): boolean {
  const fieldValue = resolveField(ticket, condition.field);
  const actual = (fieldValue ?? "").toLowerCase();
  const expected = (condition.value ?? "").toLowerCase();

  switch (condition.op) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "contains":
      return actual.includes(expected);
    default:
      return false;
  }
}

export async function applyRoutingRules(
  orgId: string,
  ticket: RoutableTicket,
): Promise<RoutingOutcome> {
  const rules = await db.query.supportRoutingRules.findMany({
    where: and(
      eq(supportRoutingRules.orgId, orgId),
      eq(supportRoutingRules.isEnabled, true),
    ),
    orderBy: [asc(supportRoutingRules.sortOrder), asc(supportRoutingRules.id)],
  });

  for (const rule of rules) {
    const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
    if (conditions.length === 0) continue;

    const allMatch = conditions.every((condition) => matchesCondition(ticket, condition));
    if (!allMatch) continue;

    const outcome: RoutingOutcome = {};
    if (rule.assigneeId) outcome.assigneeId = rule.assigneeId;
    if (rule.setPriority) outcome.setPriority = rule.setPriority;
    return outcome;
  }

  return {};
}
