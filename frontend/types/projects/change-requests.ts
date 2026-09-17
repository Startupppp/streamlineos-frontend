import type { z } from "zod";
import type {
  changeRequestRowContract,
  portalChangeRequestItemContract,
} from "@/hooks/api/build/client-portal-schema";

export type ChangeRequestStatus =
  | "submitted"
  | "under_review"
  | "estimated"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "in_progress"
  | "completed";

export type ChangeRequest = z.infer<typeof changeRequestRowContract>;

export type PortalChangeRequest = z.infer<typeof portalChangeRequestItemContract>;

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
