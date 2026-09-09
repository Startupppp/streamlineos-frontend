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

/**
 * CRM-P2-05: one rep's calls over a window, and the trend behind them.
 *
 * Two things about this shape are worth stating rather than inferring.
 *
 * `scope` is the response telling the client which surface it is looking at. A
 * rep holding only `crm:call-analysis:view` gets `own` and exactly one row —
 * their own — because the server never had anybody else's calls to group. A
 * holder of `crm:call-analysis:view-team` gets `team`. Rendering the same
 * heading for both would tell a rep their team made two calls this month.
 *
 * `embargoed` counts only calls inside this reader's scope that have not opened
 * yet. A colleague's call, seen by somebody without the team key, is not counted
 * anywhere — a total would say how many calls the rest of the team made, which
 * is the leaderboard arriving as bookkeeping.
 */
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
  /** Null when the rep has left. Render a fallback; never render the id. */
  repName: string | null;
  callsAnalysed: number;
  /** This rep's calls in the window still inside their private window. */
  embargoed: number;
  withoutSpeakerMetrics: number;
  /** Basis points. Median, never a mean — one bad transcript must not move it. */
  medianTalkRatioBps: number | null;
  medianQuestionRateBps: number | null;
  nextStepCommittedBps: number | null;
  /** Every bucket in the window, oldest first, including the empty ones. */
  trend: RepTrendPoint[];
}

export interface RepCallMetricsResponse {
  data: RepCallMetrics[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  meta: {
    sinceDays: number;
    since: string;
    /** Chosen by the server from the window; a chart labels its axis from this. */
    bucket: "day" | "week";
    truncated: boolean;
    scope: "own" | "team";
    /** Visible calls with nobody attributed. Counted, never given a rep row. */
    unattributed: number;
    embargoed: number;
    /** Calls the consent rule refuses. They count towards nothing at all. */
    consentBlocked: number;
    privateWindowHours: number;
  };
}

/**
 * CRM-P2-06: the calls worth listening to, for one metric.
 *
 * A row is a pointer, never content. There is no quote, no next-step sentence
 * and no objection here by design — the reader follows `activityId` to the
 * analysis route, which applies the visibility rule again on its own terms.
 */
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
  /** The value this call was ranked on. Null for `next-step`, which has none. */
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
    /**
     * The three reasons a call is not on the list, kept apart because they lead
     * to three different actions: it could not be measured, it is not yours to
     * read yet, or it may never be processed at all.
     */
    ineligible: number;
    embargoed: number;
    consentBlocked: number;
    /** The talk ratio the ranking aims at, so a short list can be explained. */
    talkRatioTargetBps: number;
    minimumRepTurns: number;
    privateWindowHours: number;
  };
}
