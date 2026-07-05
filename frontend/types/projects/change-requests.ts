export type ChangeRequestStatus =
  | "submitted"
  | "under_review"
  | "estimated"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "in_progress"
  | "completed";

export interface ChangeRequest {
  id: number;
  projectId: number;
  crNumber: number;
  title: string;
  description: string | null;
  impact: string | null;
  estimateMinutes: number | null;
  budgetImpactCents: number | null;
  timelineImpactDays: number | null;
  status: ChangeRequestStatus;
  requestedById: string | null;
  approvalOwnerId: string | null;
  decisionComment: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChangeRequestInput {
  title: string;
  description?: string;
  impact?: string;
}

export interface UpdateChangeRequestInput {
  title?: string;
  description?: string;
  impact?: string;
  estimateMinutes?: number;
  budgetImpactCents?: number;
  timelineImpactDays?: number;
  status?: ChangeRequestStatus;
  approvalOwnerId?: string;
  decisionComment?: string;
}
