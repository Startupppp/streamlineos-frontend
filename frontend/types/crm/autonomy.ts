/** What the system decided on its own, as the review feed reads it. */

export const DECISION_KINDS = [
  "task.extracted",
  "stage.advanced",
  "party.created",
  "activity.logged",
  "quote.sent",
] as const;
export type DecisionKind = (typeof DECISION_KINDS)[number];

export const DECISION_OUTCOMES = ["applied", "held", "skipped", "reversed", "failed"] as const;
export type DecisionOutcome = (typeof DECISION_OUTCOMES)[number];

export type ReversibilityClass = "instant" | "hold" | "irreversible";

/**
 * Filing a communication is deterministic and effectively always right, so the
 * feed hides it unless asked. Recorded all the same: the audit trail is meant to
 * be complete rather than interesting.
 */
export const ROUTINE_KINDS: readonly DecisionKind[] = ["activity.logged"];

export interface AutonomousDecision {
  autonomousDecisionId: string;
  kind: DecisionKind;
  outcome: DecisionOutcome;
  summary: string | null;
  confidence: number | null;
  reversibility: ReversibilityClass;
  triggerType: string;
  triggerId: string | null;
  partyId: string | null;
  dealId: string | null;
  activityId: string | null;
  decidedAt: string;
  reversedAt: string | null;
  reversedByUserId: string | null;
  reversedReason: string | null;
  /** The operator's columns — shown behind a disclosure, not in the default view. */
  model: string | null;
  promptVersion: string | null;
  /** Resolved names, so a reader sees the record rather than an identifier. */
  dealName: string | null;
  partyName: string | null;
}

export interface DecisionPage {
  data: AutonomousDecision[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export interface DecisionFilters {
  kind?: DecisionKind;
  outcome?: DecisionOutcome;
  partyId?: string;
  dealId?: string;
  assignedToId?: string;
  reversedOnly?: boolean;
  includeRoutine?: boolean;
}

export interface AutonomySwitch {
  organizationId: string | null;
  kind: string;
  enabled: boolean;
  reason: string | null;
  updatedAt: string;
}

export interface EffectiveSwitch {
  kind: DecisionKind;
  allowed: boolean;
  decidedBy: "platform-all" | "platform-kind" | "org-all" | "org-kind" | "default";
  reason: string | null;
}

export interface SwitchesResponse {
  switches: AutonomySwitch[];
  effective: EffectiveSwitch[];
}

/** Plain-language labels. The feed is read by managers, not operators. */
export const KIND_LABELS: Record<DecisionKind, string> = {
  "task.extracted": "Created a task",
  "stage.advanced": "Moved a deal",
  "party.created": "Added a contact",
  "activity.logged": "Filed a message",
  "quote.sent": "Sent a quote",
};

export const OUTCOME_LABELS: Record<DecisionOutcome, string> = {
  applied: "Done",
  held: "Waiting to send",
  skipped: "Chose not to",
  reversed: "Undone",
  failed: "Failed",
};
