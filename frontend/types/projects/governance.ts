export type RiskProbability = "low" | "medium" | "high";
export type RiskImpact = "low" | "medium" | "high";
export type RiskStatus = "open" | "mitigating" | "monitoring" | "accepted" | "closed";
export type DecisionStatus = "proposed" | "accepted" | "superseded" | "revisit";

export interface Risk {
  id: number;
  orgId: string;
  projectId: number;
  riskNumber: number;
  title: string;
  description: string | null;
  probability: string;
  impact: string;
  status: string;
  ownerId: string | null;
  mitigation: string | null;
  linkedTicketId: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Decision {
  id: number;
  orgId: string;
  projectId: number;
  decisionNumber: number;
  title: string;
  context: string | null;
  decision: string | null;
  optionsConsidered: string | null;
  status: string;
  ownerId: string | null;
  decidedAt: string | null;
  revisitAt: string | null;
  linkedTicketId: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRiskInput {
  title: string;
  description?: string;
  probability: RiskProbability;
  impact: RiskImpact;
  status: RiskStatus;
  ownerId?: string;
  mitigation?: string;
  linkedTicketId?: number;
}

export interface UpdateRiskInput {
  title?: string;
  description?: string | null;
  probability?: RiskProbability;
  impact?: RiskImpact;
  status?: RiskStatus;
  ownerId?: string | null;
  mitigation?: string | null;
  linkedTicketId?: number | null;
}

export interface CreateDecisionInput {
  title: string;
  context?: string;
  decision?: string;
  optionsConsidered?: string;
  status: DecisionStatus;
  ownerId?: string;
  decidedAt?: string;
  revisitAt?: string;
  linkedTicketId?: number;
}

export interface UpdateDecisionInput {
  title?: string;
  context?: string | null;
  decision?: string | null;
  optionsConsidered?: string | null;
  status?: DecisionStatus;
  ownerId?: string | null;
  decidedAt?: string | null;
  revisitAt?: string | null;
  linkedTicketId?: number | null;
}
