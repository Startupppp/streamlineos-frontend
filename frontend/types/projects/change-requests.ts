import type { z } from "zod";
import type {
  changeRequestRowContract,
  changeRequestListContract,
  portalChangeRequestItemContract,
} from "@/hooks/api/build/client-portal-schema";

export type ChangeRequest = z.infer<typeof changeRequestRowContract>;
export type ChangeRequestPage = z.infer<typeof changeRequestListContract>;

export type ChangeRequestStatus = ChangeRequest["status"];

export type PortalChangeRequest = z.infer<typeof portalChangeRequestItemContract>;

export interface CreateChangeRequestInput {
  title: string;
  description?: string;
  impact?: string;
  releaseId?: number;
  clientVisible?: boolean;
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
  releaseId?: number | null;
  clientVisible?: boolean;
}
