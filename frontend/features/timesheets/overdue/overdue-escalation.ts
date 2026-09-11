import type { OverduePeriod } from "@/features/timesheets/types";

/**
 * TS-11. What an escalation level means, given what the organisation configured.
 *
 * `escalationLevel` is zero in two completely different situations — a period
 * that has passed none of the configured thresholds, and an organisation that
 * configured none at all. The server returns `escalationThresholds` precisely
 * so a caller can tell them apart, and a surface that renders the number alone
 * tells half its tenants something false: "level 0" reads as a system that is
 * watching and has decided this one is fine, when the truth may be that nobody
 * set up any reminders and nothing is watching at all.
 *
 * So "unconfigured" is a distinct state here rather than a zero.
 */
export type EscalationState =
  | { kind: "unconfigured" }
  | { kind: "within-thresholds"; nextAt: number; daysUntilNext: number }
  | { kind: "escalated"; level: number; of: number; passedAt: number };

export function describeEscalation(
  row: Pick<OverduePeriod, "daysOverdue" | "escalationLevel">,
  thresholds: readonly number[],
): EscalationState {
  if (thresholds.length === 0) return { kind: "unconfigured" };

  const ascending = [...thresholds].sort((a, b) => a - b);
  /**
   * Clamped, because the level counts thresholds passed and the list is read
   * from settings that can be edited between the count and this render.
   */
  const level = Math.min(Math.max(0, row.escalationLevel), ascending.length);

  if (level === 0) {
    const nextAt = ascending[0] ?? 0;
    return {
      kind: "within-thresholds",
      nextAt,
      daysUntilNext: Math.max(0, nextAt - row.daysOverdue),
    };
  }

  return {
    kind: "escalated",
    level,
    of: ascending.length,
    passedAt: ascending[level - 1] ?? 0,
  };
}

/** The label a reader sees, in words rather than a bare ordinal. */
export function escalationLabel(state: EscalationState): string {
  switch (state.kind) {
    case "unconfigured":
      return "No reminders configured";
    case "within-thresholds":
      return state.daysUntilNext === 0
        ? "First reminder due"
        : `First reminder in ${state.daysUntilNext}d`;
    case "escalated":
      return `Escalation ${state.level} of ${state.of}`;
  }
}

/** Which status tone the row carries. Escalated is the only one that alarms. */
export function escalationTone(
  state: EscalationState,
): "danger" | "warning" | "neutral" {
  switch (state.kind) {
    case "escalated":
      return "danger";
    case "within-thresholds":
      return "warning";
    case "unconfigured":
      return "neutral";
  }
}
