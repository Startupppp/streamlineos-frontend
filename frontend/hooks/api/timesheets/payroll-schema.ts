import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

const payrollSummaryRowContract = z.object({
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  regularHours: z.number(),
  overtimeHours: z.number(),
  holidayHours: z.number(),
  weekendHours: z.number(),
  breakHours: z.number(),
  leaveDays: z.number(),
  billableHours: z.number(),
  nonBillableHours: z.number(),
  totalPayableHours: z.number(),
  entryCount: z.number(),
  exportedHours: z.number(),
  hasPendingEntries: z.boolean(),
  pendingHours: z.number(),
});

export const payrollPeriodSummaryResponseContract = z.object({
  period: z.object({ start: z.string(), end: z.string() }),
  totals: z.object({
    payableHours: z.number(),
    regularHours: z.number(),
    overtimeHours: z.number(),
    holidayHours: z.number(),
    weekendHours: z.number(),
    breakHours: z.number(),
    billableHours: z.number(),
    nonBillableHours: z.number(),
    userCount: z.number(),
    entryCount: z.number(),
    exportedHours: z.number(),
    pendingApprovalHours: z.number(),
    pendingApprovalCount: z.number(),
    pendingUserCount: z.number(),
  }),
  rows: z.array(payrollSummaryRowContract),
  exceptions: z.object({
    pendingApprovals: z.array(
      z.object({
        userId: z.string(),
        userName: z.string(),
        entryCount: z.number(),
        hours: z.number(),
      }),
    ),
  }),
});

const timesheetExportDtoContract = z.object({
  id: z.number(),
  exportType: z.string(),
  status: z.string(),
  dateRangeStart: z.string(),
  dateRangeEnd: z.string(),
  format: z.string(),
  entryCount: z.number(),
  totalHours: z.number(),
  note: z.string().nullable(),
  ackStatus: z.string().nullable(),
  ackAt: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdByName: z.string().nullable(),
  createdAt: z.string(),
});

export const payrollExportListResponseContract = cursorPageContract(timesheetExportDtoContract);

const payrollExportRowContract = z.object({
  userId: z.string(),
  employeeName: z.string(),
  employeeEmail: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  regularHours: z.number(),
  overtimeHours: z.number(),
  holidayHours: z.number(),
  weekendHours: z.number(),
  breakHours: z.number(),
  leaveDays: z.number(),
  billableHours: z.number(),
  nonBillableHours: z.number(),
  totalPayableHours: z.number(),
  entryCount: z.number(),
});

const payrollMappingContract = z.object({
  provider: z.enum(["GENERIC", "ZOHO_PAYROLL", "RAZORPAYX", "ADP", "GUSTO"]),
  columns: z.array(
    z.object({
      key: z.string(),
      header: z.string(),
      enabled: z.boolean(),
    }),
  ),
});

export const payrollExportRowsResponseContract = z.object({
  export: timesheetExportDtoContract,
  rows: z.array(payrollExportRowContract),
  mapping: payrollMappingContract.nullable(),
});

export const payrollAckExportResponseContract = z.object({
  export: timesheetExportDtoContract,
});

export const payrollSettingsResponseContract = z.object({
  payPeriod: z.string(),
  overtimeDailyHours: z.number(),
  overtimeWeeklyHours: z.number(),
  includeNonBillable: z.boolean(),
  payrollMapping: payrollMappingContract,
});

export type TimesheetExportDto = z.infer<typeof timesheetExportDtoContract>;
export type PayrollSettings = z.infer<typeof payrollSettingsResponseContract>;
