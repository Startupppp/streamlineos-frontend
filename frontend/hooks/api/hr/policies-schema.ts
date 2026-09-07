import { z } from "zod";

const HR_POLICY_TYPE_ENUM = [
  "leave",
  "attendance",
  "shift_roster",
  "overtime",
  "comp_off",
  "probation",
  "notice_period",
  "document_requirement",
  "approval",
  "expense",
  "travel",
  "asset",
  "wfh",
  "remote_work",
  "payroll_eligibility",
] as const;

const HR_SCOPE_TYPE_ENUM = [
  "organization",
  "country",
  "state",
  "location",
  "department",
  "team",
  "role",
  "job_level",
  "employment_type",
  "employee",
] as const;

const hrPolicyScopeRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  policyId: z.number().int(),
  scopeType: z.enum(HR_SCOPE_TYPE_ENUM),
  scopeValue: z.string(),
  createdAt: z.string(),
});

export const hrPolicyRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  policyType: z.enum(HR_POLICY_TYPE_ENUM),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(["draft", "active", "archived"]),
  version: z.number().int(),
  parentPolicyId: z.number().int().nullable(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  rules: z.record(z.string(), z.unknown()),
  priority: z.number().int(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  scopes: z.array(hrPolicyScopeRowSchema),
});

export const hrPolicyListContract = z.object({
  data: z.array(hrPolicyRowContract),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export const createHrPolicyContract = hrPolicyRowContract;

export const updateHrPolicyContract = hrPolicyRowContract;

export const createPolicyVersionContract = hrPolicyRowContract;

export const activatePolicyContract = hrPolicyRowContract;

const policyConflictSchema = z.object({
  severity: z.enum(["blocking", "warning"]),
  reason: z.string(),
  policyId: z.number().int(),
  policyName: z.string(),
  otherPolicyId: z.number().int(),
  otherPolicyName: z.string(),
  scopeOverlap: z.array(z.object({ scopeType: z.string(), scopeValue: z.string() })),
});

export const policyConflictsContract = z.object({
  conflicts: z.array(policyConflictSchema),
  canActivate: z.boolean(),
});

export const policyOrgConflictsContract = z.object({
  conflicts: z.array(policyConflictSchema),
});

export const archivePolicyContract = z.object({ success: z.literal(true) });

const policyEvaluationResultSchema = z.object({
  policy: z.object({
    id: z.number().int(),
    name: z.string(),
    policyType: z.string(),
    version: z.number().int(),
    status: z.string(),
    effectiveFrom: z.string(),
    effectiveTo: z.string().nullable(),
    priority: z.number().int(),
    rules: z.record(z.string(), z.unknown()),
  }),
  rules: z.record(z.string(), z.unknown()),
  trace: z.object({
    policyId: z.number().int(),
    policyName: z.string(),
    version: z.number().int(),
    matchedScopes: z.array(
      z.object({ scopeType: z.string(), scopeValue: z.string(), specificity: z.number() }),
    ),
    maxSpecificity: z.number(),
    priority: z.number().int(),
  }),
});

export const policyPreviewContract = policyEvaluationResultSchema.nullable();

export const seedPoliciesContract = z.object({
  seeded: z.boolean(),
  count: z.number().int().optional(),
  message: z.string().optional(),
});
