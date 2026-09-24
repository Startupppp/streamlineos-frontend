export type IncidentSeverity = "critical" | "high" | "medium" | "low";
export type IncidentStatus =
  | "detected"
  | "investigating"
  | "mitigating"
  | "resolved"
  | "postmortem"
  | "closed";

export interface Incident {
  id: number;
  orgId: string;
  projectId: number;
  incidentNumber: number;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  impact: string | null;
  ownerId: string | null;
  rootCause: string | null;
  customerComms: string | null;
  detectedAt: string | null;
  respondedAt: string | null;
  resolvedAt: string | null;
  responseDueAt: string | null;
  resolutionDueAt: string | null;
  linkedTicketId: number | null;
  releaseId: number | null;
  createdBy: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentUpdate {
  id: number;
  orgId: string;
  incidentId: number;
  message: string;
  newStatus: IncidentStatus | null;
  createdBy: string | null;
  createdAt: string;
}

export type IncidentFollowUpStatus = "open" | "in_progress" | "done" | "cancelled";

export interface IncidentDecision {
  id: number;
  orgId: string;
  incidentId: number;
  decision: string;
  rationale: string | null;
  decidedBy: string | null;
  createdAt: string;
}

export interface IncidentFollowUpAction {
  id: number;
  orgId: string;
  incidentId: number;
  title: string;
  description: string | null;
  ownerId: string | null;
  status: IncidentFollowUpStatus;
  dueAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentDetail extends Incident {
  updates: IncidentUpdate[];
  decisions: IncidentDecision[];
  followUpActions: IncidentFollowUpAction[];
}

export interface CreateIncidentInput {
  title: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  impact?: string;
  ownerId?: string;
  rootCause?: string;
  customerComms?: string;
  detectedAt?: string;
  responseDueAt?: string;
  resolutionDueAt?: string;
  linkedTicketId?: number;
  releaseId?: number;
}

export type UpdateIncidentInput = Partial<CreateIncidentInput> & {
  followUpWaiverReason?: string;
};

export interface AddIncidentUpdateInput {
  message: string;
  newStatus?: IncidentStatus;
}

export interface AddIncidentDecisionInput {
  decision: string;
  rationale?: string;
}

export interface CreateIncidentFollowUpActionInput {
  title: string;
  description?: string;
  ownerId?: string;
  dueAt?: string;
}

export interface UpdateIncidentFollowUpActionInput {
  title?: string;
  description?: string | null;
  ownerId?: string | null;
  status?: IncidentFollowUpStatus;
  dueAt?: string | null;
}
