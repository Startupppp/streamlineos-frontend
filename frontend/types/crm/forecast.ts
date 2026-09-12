/**
 * What the forecast on screen actually is.
 *
 * These mirror `deals-analytics.service.ts` and `forecast-cold-start.ts` on the
 * backend exactly, including the discriminated union. The union is the point: a
 * boolean and some optional fields would let a surface render a learned model's
 * accuracy next to a naive total by forgetting a check, and this is precisely
 * the number people plan a quarter around.
 */

export interface ForecastAccuracy {
  count: number;
  brier: number;
  logLoss: number;
  auc: number;
  calibrationError: number;
  baseRate: number;
}

export interface ForecastReadiness {
  ready: boolean;
  closedDeals: number;
  wonDeals: number;
  lostDeals: number;
  minimumClosedDeals: number;
  minimumPerOutcome: number;
  closedDealsNeeded: number;
  wonDealsNeeded: number;
  lostDealsNeeded: number;
}

/**
 * Why the tenant is on the weighted arithmetic rather than a model.
 *
 * `insufficient-history` and `not-trained-yet` are not the same message and must
 * not be collapsed: the first is the tenant's gap and readiness says how much is
 * missing, the second means they qualify and no model has earned acceptance yet.
 * The four rejection reasons say a fit ran and was refused, which is a different
 * and better thing to be told than silence.
 */
export type ForecastNaiveReason =
  | "insufficient-history"
  | "not-trained-yet"
  | "no-holdout"
  | "cannot-discriminate"
  | "no-better-than-naive"
  | "did-not-converge";

export interface LearnedForecastBasis {
  kind: "learned";
  modelId: string;
  trainedAt: string;
  featureSpecVersion: string;
  trainingDeals: number;
  holdoutDeals: number;
  holdout: ForecastAccuracy;
  naiveHoldout: ForecastAccuracy;
  becameAvailableAt: string;
}

export interface NaiveForecastBasis {
  kind: "naive-weighted";
  reason: ForecastNaiveReason;
  readiness: ForecastReadiness;
}

export type ForecastBasis = LearnedForecastBasis | NaiveForecastBasis;

export interface ForecastMonth {
  month: string;
  label: string;
  weighted: number;
  bestCase: number;
  dealCount: number;
}

export interface ForecastStageRow {
  stage: string;
  count: number;
  totalValue: number;
  weightedValue: number;
  avgProbability: number;
}

export interface DealForecastSummaryResponse {
  totalWeighted: number;
  totalBestCase: number;
  totalDeals: number;
  byMonth: ForecastMonth[];
  byStage: ForecastStageRow[];
  basis: ForecastBasis;
}

export interface DealForecastFactor {
  feature: string;
  value: number;
  contribution: number;
  direction: "increases" | "decreases";
}

export interface DealForecastScore {
  dealId: number;
  probability: number;
  intervalLower: number;
  intervalUpper: number;
  expectedValueMinor: number;
  asOf: string;
  scoredAt: string;
  factors: DealForecastFactor[];
}

export interface ForecastTrainingRejected {
  trained: false;
  reason: ForecastNaiveReason;
  readiness: ForecastReadiness;
  learned: ForecastAccuracy | null;
  naive: ForecastAccuracy | null;
}

export interface ForecastTrainingAccepted {
  trained: true;
  modelId: string;
  readiness: ForecastReadiness;
  trainingDeals: number;
  holdoutDeals: number;
  learned: ForecastAccuracy;
  naive: ForecastAccuracy;
  scored: number;
}

export type ForecastTrainingAttempt = ForecastTrainingAccepted | ForecastTrainingRejected;
