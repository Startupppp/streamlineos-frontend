import { z } from "zod";
import type {
  HrWorkflowObjectType,
  HrWorkflowStatus,
  HrWorkflowDefinition,
  HrWorkflowInstance,
  HrWorkflowDelegation,
  PaginatedResult,
  CursorPaginatedResult,
} from "@/types/hr/workflows";
import { cursorPaginationContract } from "@/hooks/api/cursor-page-schema";

const workflowObjectTypeContract = z.custom<HrWorkflowObjectType>(
  (v) => typeof v === "string",
);
const workflowStatusContract = z.custom<HrWorkflowStatus>(
  (v) => typeof v === "string",
);

const workflowSettingsContract = z.object({
  rejectionCommentRequired: z.boolean().optional(),
  allowDelegation: z.boolean().optional(),
  allowReopen: z.boolean().optional(),
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

export const workflowDefinitionWithStepsContract =
  z.custom<HrWorkflowDefinition>((v) => typeof v === "object" && v !== null);

export const workflowDefinitionListContract = z.object({
  data: z.array(
    workflowDefinitionContract.extend({ stepCount: z.number().int() }),
  ),
  pagination: cursorPaginationContract,
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

export const workflowInstanceDetailContract = z.custom<HrWorkflowInstance>(
  (v) => typeof v === "object" && v !== null,
);

export const workflowInboxContract = z.custom<
  PaginatedResult<HrWorkflowInstance>
>((v) => typeof v === "object" && v !== null);

export const workflowInstancePagedContract = z.custom<
  CursorPaginatedResult<HrWorkflowInstance>
>((v) => typeof v === "object" && v !== null);

export const workflowInstanceRowContract = z.custom<HrWorkflowInstance>(
  (v) => typeof v === "object" && v !== null,
);

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

export const workflowDelegationListContract = z.array(
  workflowDelegationWithUserContract,
);

export const workflowDelegationRowSingleContract =
  z.custom<HrWorkflowDelegation>((v) => typeof v === "object" && v !== null);
