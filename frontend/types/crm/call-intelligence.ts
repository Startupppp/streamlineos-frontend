
export const OBJECTION_HANDLINGS = [
  "answered",
  "acknowledged",
  "deflected",
  "unaddressed",
] as const;

export type ObjectionHandling = (typeof OBJECTION_HANDLINGS)[number];

export interface CallObjection {
  quote: string;
  handling: ObjectionHandling;
  response: string | null;
}

export interface CompetitorMention {
  name: string;
  quote: string;
}

export interface CallAnalysis {
  activityId: string;
  transcriptHash: string;
  analyzerVersion: number;
  talkRatioBps: number | null;
  questionRateBps: number | null;
  repTurnCount: number | null;
  repQuestionCount: number | null;
  objections: CallObjection[];
  competitorMentions: CompetitorMention[];
  nextStepCommitted: boolean;
  nextStep: string | null;
  model: string | null;
  transcriptChars: number;
  analysedAt: string;
}

export type CallAnalysisVisibilityReason =
  | "own-call"
  | "released"
  | "window-elapsed"
  | "unattributed"
  | "rep-window"
  | "not-your-call";

export interface CallAnalysisVisibility {
  visible: boolean;
  reason: CallAnalysisVisibilityReason;
  opensAt: string | null;
  privateWindowHours: number;
}

export interface CallAnalysisResponse {
  data: CallAnalysis | null;
  cached: boolean;
  visibility: CallAnalysisVisibility;
}

export interface CallAnalysisReleaseResponse {
  data: {
    activityId: string;
    analyzerVersion: number;
    releasedAt: string;
    alreadyReleased: boolean;
  };
}

export interface CoachingBand {
  label: string;
  calls: number;
}

export interface CoachingCompetitor {
  name: string;
  calls: number;
}

export interface CoachingDigest {
  cohort: number;
  embargoed: number;
  suppressed: boolean;
  withoutSpeakerMetrics: number;
  talkRatio: CoachingBand[] | null;
  questionRate: CoachingBand[] | null;
  objectionHandling: Record<ObjectionHandling, number> | null;
  competitors: CoachingCompetitor[] | null;
  nextStepCommittedBps: number | null;
}

export interface CoachingDigestResponse {
  data: CoachingDigest;
  meta: {
    sinceDays: number;
    since: string;
    truncated: boolean;
    minimumCohort: number;
    privateWindowHours: number;
  };
}

export interface RepTrendPoint {
  bucketStart: string;
  bucketEnd: string;
  calls: number;
  medianTalkRatioBps: number | null;
  medianQuestionRateBps: number | null;
  nextStepCommittedBps: number | null;
}

export interface RepCallMetrics {
  repUserId: string;
  repName: string | null;
  callsAnalysed: number;
  embargoed: number;
  withoutSpeakerMetrics: number;
  medianTalkRatioBps: number | null;
  medianQuestionRateBps: number | null;
  nextStepCommittedBps: number | null;
  trend: RepTrendPoint[];
}

export interface RepCallMetricsResponse {
  data: RepCallMetrics[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  meta: {
    sinceDays: number;
    since: string;
    bucket: "day" | "week";
    truncated: boolean;
    scope: "own" | "team";
    unattributed: number;
    embargoed: number;
    consentBlocked: number;
    privateWindowHours: number;
  };
}

export const EXEMPLAR_METRICS = ["talk-ratio", "question-rate", "next-step"] as const;
export type ExemplarMetric = (typeof EXEMPLAR_METRICS)[number];

export interface CallExemplar {
  activityId: string;
  repUserId: string | null;
  repName: string | null;
  occurredAt: string | null;
  analysedAt: string;
  talkRatioBps: number | null;
  questionRateBps: number | null;
  repTurnCount: number | null;
  repQuestionCount: number | null;
  nextStepCommitted: boolean;
  metricValueBps: number | null;
}

export interface CallExemplarsResponse {
  data: CallExemplar[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  meta: {
    metric: ExemplarMetric;
    sinceDays: number;
    since: string;
    truncated: boolean;
    scope: "own" | "team";
    ineligible: number;
    embargoed: number;
    consentBlocked: number;
    talkRatioTargetBps: number;
    minimumRepTurns: number;
    privateWindowHours: number;
  };
}
