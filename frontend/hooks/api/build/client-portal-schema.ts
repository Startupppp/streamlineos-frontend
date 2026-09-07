import { z } from "zod";

export const portalProjectItemContract = z.object({
  id: z.number().int(),
  name: z.string(),
  key: z.string(),
  status: z.string(),
  startDate: z.string().nullable(),
  targetEndDate: z.string().nullable(),
});

export const portalProjectListContract = z.array(portalProjectItemContract);

export const portalProjectOverviewContract = z.object({
  project: portalProjectItemContract,
  milestones: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    dueDate: z.string().nullable(),
    status: z.string(),
  })),
  tasks: z.array(z.object({
    id: z.number().int(),
    ticketNumber: z.number().int(),
    title: z.string(),
    status: z.string(),
    dueDate: z.string().nullable(),
  })),
  attachments: z.array(z.object({
    id: z.number().int(),
    filename: z.string(),
    url: z.string(),
  })),
  comments: z.array(z.object({
    id: z.number().int(),
    body: z.string(),
    authorName: z.string().nullable(),
    createdAt: z.string(),
  })),
});

export const portalChangeRequestItemContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  crNumber: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  impact: z.string().nullable(),
  status: z.string(),
  estimateMinutes: z.number().int().nullable(),
  budgetImpactCents: z.number().int().nullable(),
  timelineImpactDays: z.number().int().nullable(),
  decisionComment: z.string().nullable(),
  requestedById: z.string().nullable(),
  approvalOwnerId: z.string().nullable(),
  decidedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const portalChangeRequestListContract = z.array(portalChangeRequestItemContract);

export const visibilitySummaryContract = z.object({
  tickets: z.array(z.object({
    id: z.number().int(),
    ticketNumber: z.number().int(),
    title: z.string(),
    type: z.string(),
    clientVisible: z.boolean(),
  })),
  milestones: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    clientVisible: z.boolean(),
  })),
});

export const toggleVisibilityContract = z.object({
  success: z.boolean(),
});

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
  status: z.string(),
  requestedById: z.string().nullable(),
  approvalOwnerId: z.string().nullable(),
  approvalOwnerMembershipId: z.number().int().nullable(),
  decisionComment: z.string().nullable(),
  decidedAt: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const changeRequestListContract = z.array(changeRequestRowContract);

export const clientPortalSuccessContract = z.object({ success: z.literal(true) });
