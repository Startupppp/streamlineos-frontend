
export const DECISION_KINDS = [
  "task.extracted",
  "stage.advanced",
  "party.created",
  "activity.logged",
  "quote.sent",
  "outbound.sent",
  "cold_outbound.sent",
  "field.repaired",
] as const;
export type DecisionKind = (typeof DECISION_KINDS)[number];

export const DECISION_OUTCOMES = ["applied", "held", "skipped", "reversed", "failed"] as const;
export type DecisionOutcome = (typeof DECISION_OUTCOMES)[number];

export type ReversibilityClass = "instant" | "hold" | "irreversible";


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
  model: string | null;
  promptVersion: string | null;
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

export const KIND_LABELS: Record<DecisionKind, string> = {
  "task.extracted": "Created a task",
  "stage.advanced": "Moved a deal",
  "party.created": "Added a contact",
  "activity.logged": "Filed a message",
  "quote.sent": "Sent a quote",
  "outbound.sent": "Sent a follow-up",
  "cold_outbound.sent": "Sent cold outreach",
  "field.repaired": "Repaired a field",
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
  correctionRate: number | null;
  shadowScored: number;
  shadowDisagreed: number;
  shadowDisagreementRate: number | null;
}

export const DATA_QUALITY_CLASSES = [
  "duplicate",
  "contradiction",
  "reachability",
  "staleness",
  "import-uncertainty",
] as const;
export type DataQualityClass = (typeof DATA_QUALITY_CLASSES)[number];

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
  weight: number;
}

export interface DatasetHealth {
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

export interface DatasetHealthTrend {
  windowDays: number;
  current: DatasetHealth;
  series: DatasetHealthPoint[];
  baseline: DatasetHealthPoint | null;
  delta: number | null;
  direction: "improving" | "worsening" | "unchanged" | null;
}

export interface Scoreboard {
  since: string;
  days: number;
  perKind: ScoreboardKindRow[];
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
  autoQuoteEnabled: boolean;
}

export interface LiveHold {
  autonomyHoldId: string;
  autonomousDecisionId: string;
  quoteId: number | null;
  holdUntil: string;
  createdAt: string;
  quoteSubject: string | null;
  summary: string | null;
  secondsRemaining: number;
}

export interface LiveClassStop {
  outboundClassStopId: string;
  partyId: string;
  outboundClass: string;
  outboundMessageId: string | null;
  reason: string | null;
  stoppedByUserId: string | null;
  stoppedAt: string;
}

export const REPAIR_CLASSES = [
  "email.whitespace",
  "email.domain-dot-edge",
  "phone.non-ascii-characters",
] as const;
export type RepairClass = (typeof REPAIR_CLASSES)[number];

export interface EffectiveRepairPolicy {
  repairClass: RepairClass;
  findingKind: string;
  field: string;
  conservative: boolean;
  reversibility: ReversibilityClass;
  description: string;
  enabled: boolean;
  source: "tenant" | "default";
  reason: string | null;
  effective: boolean;
}

export interface RepairPoliciesResponse {
  autonomy: { allowed: boolean; decidedBy: string; reason: string | null };
  classes: EffectiveRepairPolicy[];
}

export const SENDING_DOMAIN_PURPOSES = ["transactional", "cold"] as const;
export type SendingDomainPurpose = (typeof SENDING_DOMAIN_PURPOSES)[number];

export interface SendingDomain {
  sendingDomainId: string;
  domain: string;
  purpose: SendingDomainPurpose;
  verifiedAt: string | null;
  warmupStartedAt: string | null;
  verificationRecord: { name: string; value: string } | null;
}

export interface ColdOutboundOverview {
  enabled: boolean;
  enabledAt: string | null;
  pausedAt: string | null;
  pauseReason: string | null;
  domains: SendingDomain[];
}

export interface AutonomyRepair {
  autonomyRepairId: string;
  autonomousDecisionId: string | null;
  repairClass: RepairClass;
  findingId: string | null;
  partyId: string | null;
  partyName: string | null;
  field: string;
  previousValue: string | null;
  repairedValue: string | null;
  appliedAt: string;
  revertedAt: string | null;
  revertedByUserId: string | null;
  revertedReason: string | null;
}

export interface AutonomyRepairPage {
  items: AutonomyRepair[];
  nextCursor: string | null;
}

export interface RepairMeasure {
  windowDays: number;
  resolution: {
    automated: number;
    manual: number;
    automatedShare: number | null;
  };
  repairs: {
    byClass: { repairClass: RepairClass; applied: number; reverted: number }[];
    applied: number;
    reverted: number;
  };
  remaining: {
    total: number;
    weighted: number;
    byProducer: { producer: string; open: number }[];
    oldestOpenAgeDays: number | null;
  };
}

export const OUTBOUND_CLASSES = [
  "follow_up",
  "nudge",
  "check_in",
  "meeting_request",
  "cold_outreach",
] as const;
export type OutboundClass = (typeof OUTBOUND_CLASSES)[number];

export type ComposeOutboundOutcome =
  | {
      readonly held: false;
      readonly stage: "eligibility" | "draft" | "confidence";
      readonly reason: string;
    }
  | {
      readonly held: true;
      readonly outboundMessageId: string;
      readonly autonomyHoldId: string;
      readonly decisionId: string;
      readonly outboundClass: OutboundClass;
      readonly holdUntil: string;
      readonly windowSeconds: number;
    };

export interface ComposeOutboundInput {
  readonly partyId: string;
  readonly dealId?: string;
}
