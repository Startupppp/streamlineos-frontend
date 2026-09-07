import { z } from "zod";
import type {
  HrWorkflowObjectType,
  HrWorkflowStatus,
  HrWorkflowInstanceStatus,
} from "@/types/hr/workflows";

const cursorPagination = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

const workflowObjectTypeContract = z.custom<HrWorkflowObjectType>((v) => typeof v === "string");
const workflowStatusContract = z.custom<HrWorkflowStatus>((v) => typeof v === "string");
const workflowInstanceStatusContract = z.custom<HrWorkflowInstanceStatus>((v) => typeof v === "string");

const workflowSettingsContract = z.object({
  rejectionCommentRequired: z.boolean().optional(),
  allowDelegation: z.boolean().optional(),
  allowReopen: z.boolean().optional(),
});

const workflowStepContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  definitionId: z.number().int(),
  stepOrder: z.number().int(),
  name: z.string(),
  approverType: z.string(),
  approverValue: z.string().nullable(),
  mode: z.string(),
  slaHours: z.number().int().nullable(),
  escalationApproverType: z.string().nullable(),
  escalationApproverValue: z.string().nullable(),
  condition: z.unknown().nullable(),
});

const workflowDefinitionContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  objectType: workflowObjectTypeContract,
  name: z.string(),
  status: workflowStatusContract,
  version: z.number().int(),
  isDefault: z.boolean(),
  settings: workflowSettingsContract,
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const workflowDefinitionWithStepsContract = workflowDefinitionContract.extend({
  steps: z.array(workflowStepContract),
});

export const workflowDefinitionListContract = z.object({
  data: z.array(workflowDefinitionContract.extend({ stepCount: z.number().int().optional() })),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int().optional(),
});

const simulateStepContract = z.object({
  stepOrder: z.number().int(),
  name: z.string(),
  mode: z.string(),
  approverType: z.string(),
  conditionPasses: z.boolean(),
  resolvedApproverUserIds: z.array(z.string()),
  slaHours: z.number().int().nullable(),
});

export const workflowSimulateContract = z.object({
  workflowId: z.number().int(),
  name: z.string(),
  objectType: z.string(),
  status: z.string(),
  version: z.number().int(),
  subjectEmployeeId: z.string(),
  steps: z.array(simulateStepContract),
  explanation: z.string(),
});

const workflowUserContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});

const workflowInstanceContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  definitionId: z.number().int(),
  objectType: workflowObjectTypeContract,
  objectId: z.string(),
  requestedBy: z.string(),
  subjectEmployeeId: z.string(),
  context: z.record(z.string(), z.unknown()),
  status: workflowInstanceStatusContract,
  currentStepOrder: z.number().int(),
  dueAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  requesterName: z.string().nullable().optional(),
  requesterEmail: z.string().optional(),
  requester: workflowUserContract.optional(),
  subjectEmployee: workflowUserContract.optional(),
  timeline: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const workflowInstanceDetailContract = workflowInstanceContract;

export const workflowInboxContract = z.object({
  data: z.array(workflowInstanceContract),
  total: z.number().int().optional(),
  page: z.number().int(),
  limit: z.number().int(),
});

export const workflowInstancePagedContract = z.object({
  data: z.array(workflowInstanceContract),
  pagination: cursorPagination,
});

export const workflowInstanceRowContract = workflowInstanceContract;

const workflowDelegationWithUserContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  delegatorUserId: z.string(),
  delegateUserId: z.string(),
  objectType: workflowObjectTypeContract.nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  reason: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string(),
  delegateName: z.string().nullable(),
  delegateEmail: z.string().nullable(),
});

export const workflowDelegationListContract = z.array(workflowDelegationWithUserContract);

const workflowDelegationRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  delegatorUserId: z.string(),
  delegatorMembershipId: z.number().int().nullable(),
  delegateUserId: z.string(),
  delegateMembershipId: z.number().int().nullable(),
  objectType: workflowObjectTypeContract.nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  reason: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workflowDelegationRowSingleContract = workflowDelegationRowContract;
