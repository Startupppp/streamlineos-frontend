import { z } from "zod";

export const payrollPolicyRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  status: z.enum(["DRAFT", "ACTIVE", "SUPERSEDED", "ARCHIVED"]),
  country: z.string(),
  state: z.string().nullable(),
  legalEntityName: z.string().nullable(),
  currency: z.string(),
  payFrequency: z.enum(["MONTHLY", "SEMI_MONTHLY", "BI_WEEKLY", "WEEKLY"]),
  payDay: z.number(),
  employeeCount: z.number().nullable(),
  startMonth: z.string(),
  activeVersionId: z.number().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const payrollPolicyVersionRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  policyId: z.number(),
  version: z.number(),
  templateKey: z.string().nullable(),
  toggles: z.record(z.string(), z.unknown()),
  config: z.record(z.string(), z.unknown()),
  status: z.enum(["DRAFT", "ACTIVE", "SUPERSEDED", "ARCHIVED"]),
  effectiveFrom: z.string(),
  reason: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const getCurrentStatutoryPackContract = z.object({
  country: z.string(),
  items: z.array(
    z.object({
      key: z.string(),
      enabled: z.boolean(),
      percentOverride: z.string().optional(),
      label: z.string(),
      kind: z.string().nullable(),
    }),
  ),
  complianceChecklist: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      detail: z.string(),
    }),
  ),
});

export const policyCurrentResponseContract = z.object({
  policy: payrollPolicyRowContract.nullable(),
  activeVersion: payrollPolicyVersionRowContract.nullable().optional(),
  taxRegimeApplicable: z.boolean().optional(),
  statutoryPack: getCurrentStatutoryPackContract.nullable().optional(),
});

export const policyToggleImpactResponseContract = z.object({
  toggle: z.string(),
  affectedEmployeeCount: z.number(),
  affectedStatutoryCodes: z.array(z.string()),
});

export const policyVersionsListResponseContract = z.array(payrollPolicyVersionRowContract);

export const policyActivateResponseContract = z.object({
  policyVersion: payrollPolicyVersionRowContract.optional(),
  componentCount: z.number(),
  checklist: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      done: z.boolean(),
      href: z.string(),
      detail: z.string().nullable(),
    }),
  ),
});

export type PayrollPolicyRow = z.infer<typeof payrollPolicyRowContract>;
export type PolicyCurrentResponse = z.infer<typeof policyCurrentResponseContract>;
