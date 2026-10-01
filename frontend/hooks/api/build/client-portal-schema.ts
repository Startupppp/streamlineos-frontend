import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";
import type { ResponseContract } from "@/lib/api-envelope";
import {
  genPortalProjectListSchema,
  genPortalProjectOverviewSchema,
  genPortalChangeRequestListSchema,
} from "@/contracts/build-contracts.generated";

export const portalProjectListContract = genPortalProjectListSchema;

export const portalProjectOverviewContract = genPortalProjectOverviewSchema;

export const portalChangeRequestListContract = genPortalChangeRequestListSchema;
export const portalChangeRequestItemContract = genPortalChangeRequestListSchema.element;

const ticketVisibilityItemContract = z.object({
  id: z.number().int(),
  ticketNumber: z.number().int(),
  title: z.string(),
  type: z.string(),
  clientVisible: z.boolean(),
  version: z.number().int().optional(),
});

const milestoneVisibilityItemContract = z.object({
  id: z.number().int(),
  name: z.string(),
  clientVisible: z.boolean(),
});

function visibilityPageContract<T>(rowContract: ResponseContract<T>) {
  return cursorPageContract(rowContract).or(
    z.array(rowContract).transform((rows) => ({
      data: rows,
      pagination: { limit: rows.length || 100, hasMore: false, nextCursor: null },
    })),
  );
}

export const visibilitySummaryContract = z.object({
  tickets: visibilityPageContract(ticketVisibilityItemContract),
  milestones: visibilityPageContract(milestoneVisibilityItemContract),
});

export const toggleVisibilityContract = z
  .object({
    id: z.number().int(),
    clientVisible: z.boolean(),
    success: z.boolean().optional(),
  })
  .transform((row) => ({ ...row, success: row.success ?? true }));

export const CHANGE_REQUEST_STATUSES = [
  "submitted",
  "under_review",
  "estimated",
  "awaiting_approval",
  "approved",
  "rejected",
  "in_progress",
  "completed",
] as const;

export const changeRequestRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  crNumber: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  impact: z.string().nullable(),
  estimateMinutes: z.number().int().nullable(),
  budgetImpactCents: z.number().int().nullable(),
  timelineImpactDays: z.number().int().nullable(),
  status: z.enum(CHANGE_REQUEST_STATUSES),
  requestedById: z.string().nullable(),
  approvalOwnerId: z.string().nullable(),
  approvalOwnerMembershipId: z.number().int().nullable(),
  decisionComment: z.string().nullable(),
  decidedAt: z.string().nullable(),
  releaseId: z.number().int().nullable(),
  clientVisible: z.boolean(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

const crPagePaginationContract = z.object({
  limit: z.number(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const changeRequestListContract = z.union([
  z.array(changeRequestRowContract).transform((rows) => ({
    data: rows,
    pagination: {
      limit: rows.length,
      hasMore: false,
      nextCursor: null,
    } satisfies z.infer<typeof crPagePaginationContract>,
  })),
  z.object({
    data: z.array(changeRequestRowContract),
    pagination: crPagePaginationContract,
  }),
]);

const changeRequestAffectedTicketSummaryContract = z.object({
  id: z.number().int(),
  title: z.string(),
  ticketNumber: z.number().int(),
  status: z.string(),
  priority: z.string(),
  type: z.string(),
});

export const changeRequestAffectedItemContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  changeRequestId: z.number().int(),
  ticketId: z.number().int(),
  createdAt: z.string(),
  createdBy: z.string().nullable(),
  ticket: changeRequestAffectedTicketSummaryContract,
});

export const changeRequestAffectedItemListContract = cursorPageContract(
  changeRequestAffectedItemContract,
);
