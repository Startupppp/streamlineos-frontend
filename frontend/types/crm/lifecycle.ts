export type CustomerLifecycleStatus = "active" | "churned" | "cancelled";
export type LifecycleRiskBand = "healthy" | "watch" | "at-risk";
export type CustomerHealthBand = "healthy" | "at_risk" | "critical";

export interface CustomerLifecycle {
  customerLifecycleId: string;
  partyId: string;
  partyName: string | null;
  sourceDealId: number;
  status: CustomerLifecycleStatus;
  startedOn: string;
  termMonths: number;
  renewalOn: string;
  contractValueMinor: number;
  renewalCount: number;
  riskScore: number;
  lastSignalAt: string | null;
  band: LifecycleRiskBand;
}

export interface ListLifecyclesResponse {
  data: CustomerLifecycle[];
}

export interface ListLifecyclesParams {
  status?: CustomerLifecycleStatus;
  band?: LifecycleRiskBand;
  renewingWithinDays?: number;
  order?: "renewal" | "risk";
  limit?: number;
  offset?: number;
}

export interface CustomerHealthRosterItem {
  customerHealthAssessmentId: string;
  partyId: string;
  partyName: string | null;
  score: number | null;
  healthStatus: CustomerHealthBand | null;
  coverageBps: number;
  weightsVersion: number;
  computedAt: string;
}

export interface CustomerHealthRosterResponse {
  data: CustomerHealthRosterItem[];
}

export interface CustomerHealthRosterParams {
  band?: CustomerHealthBand;
  unscored?: boolean;
  limit?: number;
  offset?: number;
}
