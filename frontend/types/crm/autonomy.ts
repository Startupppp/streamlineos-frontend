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

export interface ScoreboardKindRow {
  kind: DecisionKind;
  actions: number;
  corrections: number;
  /** Null when nothing has happened — distinct from a rate of zero. */
  correctionRate: number | null;
  shadowScored: number;
  shadowDisagreed: number;
  shadowDisagreementRate: number | null;
}

/**
 * The classes of data problem the queue files, mirroring
 * `DATA_QUALITY_PRODUCERS`. A producer is a class of evidence rather than a
 * check, because "the duplicate detector is noisy" and "our contact data is
 * unreachable" are different conversations with different owners.
 */
export const DATA_QUALITY_CLASSES = [
  "duplicate",
  "contradiction",
  "reachability",
  "staleness",
  "import-uncertainty",
] as const;
export type DataQualityClass = (typeof DATA_QUALITY_CLASSES)[number];

/** Plain language, for the same audience the rest of this scoreboard is written for. */
export const DATA_QUALITY_CLASS_LABELS: Record<DataQualityClass, string> = {
  duplicate: "Duplicate records",
  contradiction: "Contradictory details",
  reachability: "Nobody can be reached",
  staleness: "Nobody has been in touch",
  "import-uncertainty": "Imports needing a decision",
};

export interface DatasetHealthClass {
  producer: DataQualityClass;
  count: number;
  /** What this class contributes to the composite once severity is applied. */
  weight: number;
}

export interface DatasetHealth {
  /** The open queue weighted by severity. A penalty: lower is better. */
  composite: number;
  openTotal: number;
  bySeverity: { high: number; medium: number; low: number };
  byClass: DatasetHealthClass[];
}

export interface DatasetHealthPoint {
  capturedOn: string;
  composite: number;
  openTotal: number;
}

/**
 * Whether the dataset is getting better, and against what.
 *
 * `direction` and `delta` are null together, and only when there is no recorded
 * history to compare against. That is a different statement from "unchanged" —
 * the same distinction `correctionRate` makes by being null rather than zero.
 */
export interface DatasetHealthTrend {
  windowDays: number;
  current: DatasetHealth;
  series: DatasetHealthPoint[];
  baseline: DatasetHealthPoint | null;
  /** Negative is progress, because the composite is a penalty. */
  delta: number | null;
  direction: "improving" | "worsening" | "unchanged" | null;
}

export interface Scoreboard {
  since: string;
  days: number;
  perKind: ScoreboardKindRow[];
  /**
   * The state of the data every autonomous action is taken against.
   *
   * On this card rather than a data-quality one of its own, because a rising
   * correction rate and a rising dataset-health penalty are usually the same
   * story — and a manager who has to visit two screens to notice that will not.
   */
  dataset: DatasetHealthTrend;
  spend: { calls: number; totalTokens: number; estimatedCostUsd: string };
}

export interface ReviewQueueItem {
  autonomyShadowScoreId: string;
  autonomousDecisionId: string;
  kind: DecisionKind;
  verdict: "agrees" | "disagrees" | "uncertain" | "failed";
  score: number | null;
  rationale: string | null;
  createdAt: string;
  decisionSummary: string | null;
  decidedAt: string;
  confidence: number | null;
}

export interface AutonomySettings {
  shadowSampleRate: number;
  shadowDailyCap: number;
  holdWindowSeconds: number;
}

export interface LiveHold {
  autonomyHoldId: string;
  autonomousDecisionId: string;
  quoteId: number | null;
  holdUntil: string;
  createdAt: string;
  quoteSubject: string | null;
  summary: string | null;
  /** Server-computed at fetch time; the browser counts down from it. */
  secondsRemaining: number;
}
