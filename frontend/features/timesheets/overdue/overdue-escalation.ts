import type { OverduePeriod } from "@/features/timesheets/types";

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
