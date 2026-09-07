import { z } from "zod";

export const payrollFilingContract = z.object({
  id: z.number(),
  orgId: z.string(),
  entityId: z.number().nullable(),
  periodId: z.number().nullable(),
  fiscalYear: z.string().nullable(),
  filingType: z.string(),
  ruleVersion: z.string().nullable(),
  status: z.string(),
  payload: z.record(z.string(), z.unknown()).nullable(),
  artifactKey: z.string().nullable(),
  challanRef: z.string().nullable(),
  acknowledgementRef: z.string().nullable(),
  externalFilingRequired: z.boolean(),
  statusLabel: z.string().nullable(),
  submittedAt: z.string().nullable(),
  reconciledAt: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const payrollFilingListContract = z.object({
  data: z.array(payrollFilingContract),
  pagination: z.object({
    limit: z.number(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

const filingCapabilityContract = z.object({
  mode: z.string(),
  automaticFiling: z.boolean(),
  automaticRemittance: z.boolean(),
  providerDependent: z.boolean(),
  honestyLabel: z.string(),
  supportedTypes: z.array(z.string()),
  ruleBundleVersion: z.string(),
  artifactFormat: z.string(),
  form16Certificate: z.object({
    mode: z.string(),
    officialForm16: z.boolean(),
    honestyLabel: z.string(),
  }),
  note: z.string(),
});

export const filingCapabilitiesResponseContract = z.object({
  mode: z.literal("export_only"),
  automaticFiling: z.boolean(),
  automaticRemittance: z.boolean(),
  providerDependent: z.boolean(),
  honestyLabel: z.string(),
  supportedTypes: z.array(z.string()),
  ruleBundleVersion: z.string(),
  artifactFormat: z.literal("csv"),
  form16Certificate: z.object({
    mode: z.literal("period_summary_pdf"),
    officialForm16: z.boolean(),
    honestyLabel: z.string(),
  }),
  note: z.string(),
  ruleEffectiveFrom: z.string(),
  formLabels: z.object({
    quarterlyReturn: z.string(),
    annualCertificate: z.string(),
  }),
});

export const filingExportJobContract = z.object({
  jobId: z.number(),
  status: z.enum(["PENDING", "RUNNING", "SUCCEEDED", "FAILED", "DEAD_LETTER"]),
  progress: z.number(),
  filingId: z.number().nullable(),
  correlationId: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  finishedAt: z.string().nullable(),
  capability: filingCapabilityContract,
  statusLabel: z.string(),
});

export const filingDetailContract = payrollFilingContract.extend({
  capability: filingCapabilityContract,
});

export const listForm16EmployeesResponseContract = z.object({
  filingId: z.number(),
  honestyLabel: z.string(),
  employees: z.array(
    z.object({
      userId: z.string(),
      employeeName: z.string(),
      employeeNumber: z.string().nullable(),
      pan: z.string().nullable(),
      periodGross: z.string(),
      periodTds: z.string(),
    }),
  ),
});

export type PayrollFiling = z.infer<typeof payrollFilingContract>;
export type FilingExportJob = z.infer<typeof filingExportJobContract>;
