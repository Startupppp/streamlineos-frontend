import { z } from "zod";

// NOTE: Backend sends all money amounts as strings (decimal columns).
// The frontend TypeScript types in types/payroll/reports.ts incorrectly type
// grossTotal, deductionTotal, netTotal etc. as `number`. Backend is source of truth.

const paginationContract = z.object({
  limit: z.number(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const summaryReportContract = z.object({
  provisional: z.boolean(),
  run: z
    .object({
      month: z.string(),
      status: z.string(),
      employeeCount: z.number().nullable(),
      grossTotal: z.string(),
      deductionTotal: z.string(),
      netTotal: z.string(),
      employerCostTotal: z.string(),
      exceptionCount: z.number().nullable(),
    })
    .nullable(),
});

export const registerReportContract = z.object({
  provisional: z.boolean(),
  columns: z.array(z.string()),
  rows: z.array(
    z.object({
      employeeId: z.string(),
      name: z.string().nullable(),
      department: z.string().nullable(),
      workerType: z.string(),
      paidDays: z.string(),
      gross: z.string(),
      totalDeductions: z.string(),
      net: z.string(),
      components: z.record(z.string(), z.string()),
    }),
  ),
  pagination: paginationContract,
});

export const deptCostReportContract = z.object({
  provisional: z.boolean(),
  rows: z.array(
    z.object({
      department: z.string().nullable(),
      employeeCount: z.number(),
      grossTotal: z.string(),
      netTotal: z.string(),
      employerCostTotal: z.string(),
    }),
  ),
  pagination: paginationContract,
});

export const costCenterReportContract = z.object({
  provisional: z.boolean(),
  rows: z.array(
    z.object({
      costCenter: z.string().nullable(),
      employeeCount: z.number(),
      grossTotal: z.string(),
      netTotal: z.string(),
    }),
  ),
  pagination: paginationContract,
});

export const componentPivotReportContract = z.object({
  provisional: z.boolean(),
  columns: z.array(z.string()),
  rows: z.array(
    z.object({
      employeeId: z.string(),
      name: z.string().nullable(),
      department: z.string().nullable(),
      workerType: z.string(),
      components: z.record(z.string(), z.string()),
    }),
  ),
  pagination: paginationContract,
});

export const bankPayoutReportContract = z.object({
  provisional: z.boolean(),
  batches: z.array(
    z.object({
      batchNumber: z.string(),
      format: z.string(),
      totalAmount: z.string(),
      itemCount: z.number(),
      status: z.string(),
      generatedAt: z.string().nullable(),
      items: z.array(
        z.object({
          userName: z.string().nullable(),
          accountMasked: z.string(),
          ifsc: z.string().nullable(),
          amount: z.string(),
          status: z.string(),
        }),
      ),
    }),
  ),
  pagination: paginationContract,
});

export const varianceReportContract = z.object({
  provisional: z.boolean(),
  current: z.object({ month: z.string(), gross: z.string(), net: z.string() }),
  previous: z.object({ month: z.string(), gross: z.string(), net: z.string() }),
  delta: z.object({ gross: z.string(), net: z.string() }),
  perEmployee: z.array(
    z.object({
      userId: z.string(),
      name: z.string().nullable(),
      prevGross: z.string(),
      currGross: z.string(),
      grossDelta: z.string(),
      prevNet: z.string(),
      currNet: z.string(),
      netDelta: z.string(),
    }),
  ),
  pagination: paginationContract,
});

export const journalReportContract = z.object({
  provisional: z.boolean(),
  month: z.string(),
  lines: z.array(
    z.object({
      account: z.string(),
      description: z.string(),
      debit: z.number(),
      credit: z.number(),
      costCenter: z.string().nullable(),
    }),
  ),
  unmappedCodes: z.array(z.string()),
  totalDebits: z.number(),
  totalCredits: z.number(),
});

export type SummaryReport = z.infer<typeof summaryReportContract>;
export type RegisterReport = z.infer<typeof registerReportContract>;
export type VarianceReport = z.infer<typeof varianceReportContract>;
