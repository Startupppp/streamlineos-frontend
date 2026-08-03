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
  createdAt: string;
  updatedAt: string;
}

export interface IncidentUpdate {
  id: number;
  incidentId: number;
  message: string;
  newStatus: IncidentStatus | null;
  createdBy: string | null;
  createdAt: string;
  createdByName: string | null;
  createdByEmail: string | null;
}

export interface IncidentDetail extends Incident {
  updates: IncidentUpdate[];
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
}

export type UpdateIncidentInput = Partial<CreateIncidentInput>;

export interface AddIncidentUpdateInput {
  message: string;
  newStatus?: IncidentStatus;
}
