/**
 * The call-intelligence wire shapes, as `crm/calls` returns them.
 *
 * Two things about this surface shape every type below.
 *
 * Every ratio is basis points of 10000 and never a percentage, because the
 * backend counts them from the transcript and a UI that divided by 100 on the
 * way in would be the second place that arithmetic happened. Format at the edge.
 *
 * An analysis can be absent for reasons that are not "it does not exist": the
 * rep who made the call gets a private window first, and `visibility` carries
 * that answer alongside a null `data`. A screen that treated null as empty would
 * tell a manager nobody has analysed a call that has in fact been analysed —
 * the same denial-is-not-emptiness mistake ticket 26 exists to prevent, arriving
 * through the payload rather than through a permission.
 */

export const OBJECTION_HANDLINGS = [
  "answered",
  "acknowledged",
  "deflected",
  "unaddressed",
] as const;

export type ObjectionHandling = (typeof OBJECTION_HANDLINGS)[number];

/** One objection in the customer's own words. Never a paraphrase. */
export interface CallObjection {
  quote: string;
  handling: ObjectionHandling;
  /** The rep's reply, verbatim. Null exactly when `handling` is `unaddressed`. */
  response: string | null;
}

/** A rival named on the call, and the line that named them. */
export interface CompetitorMention {
  name: string;
  quote: string;
}

export interface CallAnalysis {
  activityId: string;
  transcriptHash: string;
  analyzerVersion: number;
  /** Basis points of 10000. Null when the transcript is not speaker-attributed. */
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

/**
 * Why the analysis is or is not readable by this viewer.
 *
 * `rep-window` is the only reason that carries an `opensAt`, and it is the only
 * one where waiting changes the answer.
 */
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

/** `data` is null whenever `visibility.visible` is false. Never conflate them. */
export interface CallAnalysisResponse {
  data: CallAnalysis | null;
  /** False means this request spent an AI credit. */
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

/**
 * The team digest. Every metric is null together when `suppressed` is true.
 *
 * `embargoed` is a bare count on purpose — broken down by anything it would
 * become the per-rep leaderboard the private window exists to prevent. It is
 * here so a manager knows the cohort is partial rather than concluding from it.
 */
export interface CoachingDigest {
  cohort: number;
  embargoed: number;
  /** True when the cohort is too small to summarise. Not a failure. */
  suppressed: boolean;
  withoutSpeakerMetrics: number;
  talkRatio: CoachingBand[] | null;
  questionRate: CoachingBand[] | null;
  objectionHandling: Record<ObjectionHandling, number> | null;
  competitors: CoachingCompetitor[] | null;
  /** Share of visible calls ending with a named commitment, in basis points. */
  nextStepCommittedBps: number | null;
}

export interface CoachingDigestResponse {
  data: CoachingDigest;
  meta: {
    sinceDays: number;
    since: string;
    truncated: boolean;
    /** Below this cohort size the digest suppresses rather than identifies. */
    minimumCohort: number;
    privateWindowHours: number;
  };
}
