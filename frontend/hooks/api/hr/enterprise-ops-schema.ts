import { z } from "zod";

const cursorPagination = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

const withCursorPage = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), pagination: cursorPagination });

const accommodationRequestContract = z.object({
  id: z.string(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  type: z.enum(["equipment", "schedule", "workspace", "medical_restriction", "other"]),
  description: z.string(),
  confidentialMedicalNote: z.string().nullable(),
  status: z.enum(["requested", "under_review", "approved", "denied", "implemented"]),
  reviewedBy: z.string().nullable(),
  reviewDate: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

const accommodationTaskContract = z.object({
  id: z.string(),
  orgId: z.string(),
  requestId: z.string(),
  title: z.string(),
  assigneeUserId: z.string().nullable(),
  assigneeMembershipId: z.number().int().nullable(),
  status: z.enum(["pending", "in_progress", "completed"]),
  dueDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listAccommodationsContract = withCursorPage(accommodationRequestContract);
export const getAccommodationContract = accommodationRequestContract;
export const listAccommodationTasksContract = z.array(accommodationTaskContract);
export const createAccommodationContract = accommodationRequestContract;
export const approveAccommodationContract = accommodationRequestContract;

const emergencyEventContract = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  type: z.enum(["office_closure", "disaster", "safety_check", "other"]),
  locationId: z.string().nullable(),
  status: z.enum(["active", "resolved"]),
  message: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullable(),
});

const emergencyResponseContract = z.object({
  id: z.string(),
  orgId: z.string(),
  eventId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  status: z.string(),
  location: z.string().nullable(),
  note: z.string().nullable(),
  respondedAt: z.string(),
  createdAt: z.string(),
});

export const listEmergencyEventsContract = withCursorPage(emergencyEventContract);
export const getEmergencyEventContract = emergencyEventContract;
export const createEmergencyEventContract = emergencyEventContract;
export const updateEmergencyEventContract = emergencyEventContract;

export const broadcastResponseContract = z.object({
  broadcasted: z.number().int(),
  eventId: z.string(),
});

export const getEventStatusContract = z.object({
  aggregate: z.record(z.string(), z.number().int()),
  total: z.number().int(),
});

export const respondToEventContract = emergencyResponseContract;

const hrEventContract = z.object({
  id: z.string(),
  orgId: z.string(),
  eventType: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  payload: z.record(z.string(), z.unknown()),
  actorUserId: z.string().nullable(),
  occurredAt: z.string(),
});

export const listHrEventsContract = withCursorPage(hrEventContract);

export const getDataDictionaryContract = z.object({
  catalog: z.array(z.object({
    eventType: z.string(),
    description: z.string(),
    entityTypes: z.array(z.string()),
  })),
  sanitizedFields: z.array(z.string()),
  immutable: z.boolean(),
  note: z.string(),
});

const accessProvisioningContract = z.object({
  id: z.string(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  systemName: z.string(),
  action: z.enum(["grant", "revoke", "review"]),
  status: z.enum(["pending", "completed", "verified", "failed"]),
  triggeredBy: z.enum(["joiner", "mover", "leaver", "manual"]),
  requestedAt: z.string(),
  completedAt: z.string().nullable(),
  verifiedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const accessTemplateContract = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  triggeredBy: z.enum(["joiner", "mover", "leaver", "manual"]),
  systemsConfig: z.array(z.object({
    systemName: z.string(),
    action: z.enum(["grant", "revoke", "review"]),
  })),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listProvisioningContract = withCursorPage(accessProvisioningContract);
export const createProvisioningContract = accessProvisioningContract;
export const listTemplatesContract = z.array(accessTemplateContract);
export const createTemplateContract = accessTemplateContract;

export const getExitVerificationContract = z.object({
  userId: z.string(),
  hasUnverifiedRevokes: z.boolean(),
  unverified: z.array(accessProvisioningContract),
  total: z.number().int(),
});

const simulationContract = z.object({
  id: z.string(),
  orgId: z.string(),
  type: z.enum(["policy", "leave", "attendance", "approval", "payroll"]),
  input: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()),
  createdBy: z.string(),
  createdAt: z.string(),
});

export const listSimulationsContract = withCursorPage(simulationContract);

export const simulatePolicyContract = z.object({
  simulation: z.string(),
  matchedPolicy: z.record(z.string(), z.unknown()).nullable(),
  hypotheticalContext: z.record(z.string(), z.unknown()).optional(),
});

export const simulateLeaveBalanceContract = z.object({
  simulation: z.string(),
  currentBalance: z.number(),
  hypotheticalAccrualRate: z.number(),
  projectionMonths: z.number().int(),
  projectedBalance: z.number(),
  projectionDate: z.string(),
});

export const simulateApprovalRoutingContract = z.object({
  simulation: z.string(),
  objectType: z.string(),
  employeeId: z.string(),
  matchedWorkflow: z.object({
    id: z.number().int(),
    name: z.string(),
    version: z.number().int(),
  }).nullable(),
  resolvedSteps: z.array(z.object({
    stepId: z.string(),
    stepOrder: z.number().int(),
    stepName: z.string(),
    approverType: z.string(),
    approverRef: z.string().nullable(),
    mode: z.string(),
    workflowName: z.string(),
    approvers: z.array(z.object({
      userId: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
    })),
  })),
  unresolvedSteps: z.array(z.number().int()),
  hypotheticalContext: z.record(z.string(), z.unknown()).optional(),
});

export const simulatePayrollImpactContract = z.object({
  simulation: z.string(),
  currentGross: z.number(),
  hypotheticalComponents: z.array(z.object({
    type: z.string(),
    amount: z.number(),
  })),
  totalEarningsDelta: z.number(),
  totalDeductionsDelta: z.number(),
  projectedGross: z.number(),
  effectiveDate: z.string(),
});

export const compareSimulationContract = z.object({
  simulation: z.string(),
  employeeId: z.string(),
  policyType: z.string(),
  oldPolicyId: z.string().nullable().optional(),
  newPolicyId: z.string().nullable().optional(),
  resolvedOldPolicy: z.record(z.string(), z.unknown()).nullable(),
  resolvedNewPolicy: z.record(z.string(), z.unknown()).nullable(),
});

export const voidContract = z.undefined();

export const hrMetricDefinitionsContract = z.object({
  metrics: z.array(z.object({
    name: z.string(),
    description: z.string(),
    aggregation: z.string(),
  })),
});

export const hrEventsExportContract = z.object({
  exportedAt: z.string(),
  data: z.array(z.object({
    id: z.string(),
    orgId: z.string(),
    source: z.string(),
    eventType: z.string(),
    payload: z.record(z.string(), z.unknown()),
    occurredAt: z.string(),
    correlationId: z.string().nullable(),
    createdAt: z.string(),
  })),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
