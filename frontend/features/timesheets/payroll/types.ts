import type { AckStatus } from "./ack-export-schema";

export type PayPeriod = "WEEKLY" | "BIWEEKLY" | "SEMIMONTHLY" | "MONTHLY";
export type ExportFormat = "CSV" | "XLSX";
export type PayrollProvider = "GENERIC" | "ZOHO_PAYROLL" | "RAZORPAYX" | "ADP" | "GUSTO";

export interface PayrollMappingColumn {
  key: string;
  header: string;
  enabled: boolean;
}

export interface PayrollMapping {
  provider: PayrollProvider;
  columns: PayrollMappingColumn[];
}

export interface PayrollSettings {
  payPeriod: PayPeriod;
  overtimeDailyHours: number;
  overtimeWeeklyHours: number;
  includeNonBillable: boolean;
  payrollMapping: PayrollMapping;
}

export interface PayrollPeriodTotals {
  payableHours: number;
  regularHours: number;
  overtimeHours: number;
  holidayHours: number;
  weekendHours: number;
  breakHours: number;
  billableHours: number;
  nonBillableHours: number;
  userCount: number;
  entryCount: number;
  exportedHours: number;
  pendingApprovalHours: number;
  pendingApprovalCount: number;
  pendingUserCount: number;
}

export interface PayrollSummaryRow {
  userId: string;
  userName: string;
  userEmail: string;
  regularHours: number;
  overtimeHours: number;
  holidayHours: number;
  weekendHours: number;
  breakHours: number;
  leaveDays: number;
  billableHours: number;
  nonBillableHours: number;
  totalPayableHours: number;
  entryCount: number;
  exportedHours: number;
  hasPendingEntries: boolean;
  pendingHours: number;
}

export interface PayrollSummaryResponse {
  period: { start: string; end: string };
  totals: PayrollPeriodTotals;
  rows: PayrollSummaryRow[];
  exceptions: {
    pendingApprovals: Array<{
      userId: string;
      userName: string;
      entryCount: number;
      hours: number;
    }>;
  };
}

export interface TimesheetExportDto {
  id: number;
  exportType: string;
  status: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  format: string;
  entryCount: number;
  totalHours: number;
  note: string | null;
  ackStatus: string | null;
  ackAt: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface AckExportResponse {
  export: TimesheetExportDto;
}

export const ACK_STATUS_LABEL: Record<AckStatus, string> = {
  RECEIVED: "Received",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  FAILED: "Failed",
};

export const ACK_STATUS_BADGE: Record<AckStatus, string> = {
  RECEIVED:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  ACCEPTED:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  REJECTED:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  FAILED:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

export function isAckStatus(value: string): value is AckStatus {
  return value in ACK_STATUS_LABEL;
}

export interface PayrollExportRow {
  userId: string;
  employeeName: string;
  employeeEmail: string;
  periodStart: string;
  periodEnd: string;
  regularHours: number;
  overtimeHours: number;
  holidayHours: number;
  weekendHours: number;
  breakHours: number;
  leaveDays: number;
  billableHours: number;
  nonBillableHours: number;
  totalPayableHours: number;
  entryCount: number;
}

export interface CreateExportBody {
  start: string;
  end: string;
  format: ExportFormat;
  userIds?: string[];
  includeExported?: boolean;
  note?: string;
}

export interface CreateExportResponse {
  export: TimesheetExportDto;
  rows: PayrollExportRow[];
}

export interface ExportHistoryResponse {
  items: TimesheetExportDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ExportRowsResponse {
  export: TimesheetExportDto;
  rows: PayrollExportRow[];
  mapping: PayrollMapping | null;
}

export const CANONICAL_COLUMN_KEYS = [
  "employeeName",
  "employeeEmail",
  "employeeId",
  "periodStart",
  "periodEnd",
  "regularHours",
  "overtimeHours",
  "holidayHours",
  "weekendHours",
  "breakHours",
  "leaveDays",
  "billableHours",
  "nonBillableHours",
  "totalPayableHours",
  "entryCount",
] as const;

export type CanonicalColumnKey = (typeof CANONICAL_COLUMN_KEYS)[number];

export const DEFAULT_PAYROLL_MAPPING: PayrollMapping = {
  provider: "GENERIC",
  columns: [
    { key: "employeeName", header: "Employee Name", enabled: true },
    { key: "employeeEmail", header: "Email", enabled: true },
    { key: "employeeId", header: "Employee ID", enabled: true },
    { key: "periodStart", header: "Period Start", enabled: true },
    { key: "periodEnd", header: "Period End", enabled: true },
    { key: "regularHours", header: "Regular Hours", enabled: true },
    { key: "overtimeHours", header: "Overtime Hours", enabled: true },
    { key: "holidayHours", header: "Holiday Hours", enabled: true },
    { key: "weekendHours", header: "Weekend Hours", enabled: true },
    { key: "breakHours", header: "Break Hours", enabled: true },
    { key: "leaveDays", header: "Leave Days", enabled: true },
    { key: "billableHours", header: "Billable Hours", enabled: true },
    { key: "nonBillableHours", header: "Non-Billable Hours", enabled: true },
    { key: "totalPayableHours", header: "Total Payable Hours", enabled: true },
    { key: "entryCount", header: "Entry Count", enabled: true },
  ],
};
