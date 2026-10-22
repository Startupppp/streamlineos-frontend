
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
