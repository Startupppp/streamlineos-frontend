import type { TimesheetApprovalRoute } from "@/hooks/api/timesheets-core/timesheets-period-schema";

export type EntryStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PeriodStatus =
  | "OPEN"
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "LOCKED";
export type TimerStatus = "RUNNING" | "PAUSED" | "STOPPED" | "DISCARDED" | "CONVERTED";
export type BillingType = "BILLABLE" | "NON_BILLABLE" | "FIXED";
export type InvoicingStatus = "UNINVOICED" | "INVOICE_DRAFTED" | "INVOICED";
export type EntrySource = "MANUAL" | "TIMER" | "API" | "IMPORT";
export type RoundingRule =
  | "NONE"
  | "NEAREST_5"
  | "NEAREST_6"
  | "NEAREST_10"
  | "NEAREST_15"
  | "ROUND_UP"
  | "ROUND_DOWN";
export type ApprovalMode = "MANAGER" | "AUTO";
export type ApproverSource = "REPORTING_MANAGER" | "PROJECT_MANAGER";

export interface ProjectRef {
  id: number;
  name: string;
}

export interface TicketRef {
  id: number;
  title: string;
  ticketNumber: number;
  project: ProjectRef | null;
}

export interface AttendanceDraftResult {
  enabled: boolean;
  segmentsFound: number;
  entriesCreated: number;
  skippedExisting: number;
  skippedEmpty: number;
  periodIds: number[];
}

export interface TimesheetEntry {
  id: number;
  orgId: string;
  userMembershipId: number | null;
  ticketId: number | null;
  projectId: number | null;
  timesheetPeriodId: number | null;
  date: string;
  hours: string;
  description: string | null;
  isBillable: boolean;
  billingType: BillingType;
  status: EntryStatus;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  lockedAt: string | null;
  voidedAt: string | null;
  invoicingStatus: InvoicingStatus;
  billRate: string | null;
  currency: string | null;
  rateSource: string | null;
  source: EntrySource;
  workLink: string | null;
  createdAt: string;
  updatedAt: string;
  project: ProjectRef | null;
  ticket: TicketRef | null;
}

export interface TimesheetPeriod {
  id: number;
  orgId: string;
  userMembershipId: number | null;
  periodStart: string;
  periodEnd: string;
  status: PeriodStatus;
  totalHours: string;
  billableHours: string;
  nonBillableHours: string;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  lockedAt: string | null;
  currentApproverMembershipId: number | null;
  approvalRoute: TimesheetApprovalRoute | null;
  approvalDueAt: string | null;
  approvalEscalatedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { membershipId: number | null; name: string | null; email: string | null };
}

export interface PeriodEntry {
  id: number;
  orgId: string;
  userMembershipId: number | null;
  ticketId: number | null;
  projectId: number | null;
  date: string;
  hours: string;
  description: string | null;
  isBillable: boolean;
  billingType: BillingType;
  status: EntryStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedByMembershipId: number | null;
  rejectionReason: string | null;
  voidedAt: string | null;
  invoicingStatus: InvoicingStatus;
  billRate: string | null;
  currency: string | null;
  timesheetPeriodId: number | null;
  createdAt: string;
  updatedAt: string;
  project: ProjectRef | null;
}

export interface PeriodDetail {
  period: TimesheetPeriod;
  entries: PeriodEntry[];
}

export interface TimerSession {
  id: number;
  userMembershipId: number | null;
  projectId: number | null;
  ticketId: number | null;
  description: string | null;
  billable: boolean;
  startedAt: string;
  lastResumedAt: string | null;
  accumulatedSeconds: number;
  status: TimerStatus;
  elapsedSeconds: number;
  project: ProjectRef | null;
  ticket: { id: number; title: string } | null;
}

export interface TimesheetSettings {
  id: number;
  orgId: string;
  workWeekStart: number;
  requiredFields: string[] | null;
  roundingRule: RoundingRule;
  maxHoursPerDay: string;
  allowOverlappingEntries: boolean;
  allowBackdatedEntries: boolean;
  backdateLimitDays: number | null;
  approvalMode: ApprovalMode | "MULTI_LEVEL";
  approverSource: ApproverSource;
  clientApprovalEnabled: boolean;
  lockAfterApproval: boolean;
  lockAfterInvoice: boolean;
  reminderRules: unknown;
  payPeriod: string;
  allowFutureEntries: boolean;
  expectedDailyHours: string | null;
  expectedWeeklyHours: string | null;
  submissionGraceDays: number | null;
  overtimeDailyHours: string;
  overtimeWeeklyHours: string;
  includeNonBillable: boolean;
  payrollMapping: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTimesheetSettingsInput {
  workWeekStart?: number;
  requiredFields?: string[];
  roundingRule?: RoundingRule;
  maxHoursPerDay?: number;
  allowOverlappingEntries?: boolean;
  allowBackdatedEntries?: boolean;
  backdateLimitDays?: number | null;
  approvalMode?: ApprovalMode;
  approverSource?: ApproverSource;
  clientApprovalEnabled?: boolean;
  lockAfterApproval?: boolean;
  lockAfterInvoice?: boolean;
  allowFutureEntries?: boolean;
  expectedDailyHours?: number | null;
  expectedWeeklyHours?: number | null;
  submissionGraceDays?: number | null;
  changeReason?: string;
}

export interface CursorPage<T> {
  data: T[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface EntriesQuery {
  userId?: string;
  projectId?: number;
  ticketId?: number;
  status?: EntryStatus;
  startDate?: string;
  endDate?: string;
  billable?: boolean;
  cursor?: string;
  limit?: number;
}

export interface CreateEntryInput {
  date: string;
  hours: number;
  projectId?: number;
  ticketId?: number;
  description?: string;
  isBillable?: boolean;
  billingType?: BillingType;
  workLink?: string;
  source?: EntrySource;
}

export interface UpdateEntryInput {
  hours?: number;
  description?: string;
  isBillable?: boolean;
  billingType?: BillingType;
  projectId?: number;
  workLink?: string;
}

export interface StartTimerInput {
  projectId?: number;
  ticketId?: number;
  description?: string;
  billable?: boolean;
}

export interface ConvertTimerInput {
  date?: string;
  hours?: number;
  isBillable?: boolean;
  description?: string;
}

export const PERIOD_STATUS_BADGE: Record<PeriodStatus, string> = {
  OPEN: "bg-muted text-foreground border-border",
  DRAFT: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  SUBMITTED: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  APPROVED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  REJECTED: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  LOCKED: "bg-muted text-foreground border-border",
};

export const PERIOD_STATUS_LABEL: Record<PeriodStatus, string> = {
  OPEN: "Open",
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  LOCKED: "Locked",
};

export const ENTRY_STATUS_BADGE: Record<EntryStatus, string> = {
  PENDING: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  APPROVED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  REJECTED: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

export const BILLING_TYPE_LABEL: Record<BillingType, string> = {
  BILLABLE: "Billable",
  NON_BILLABLE: "Non-billable",
  FIXED: "Fixed",
};

export interface OverduePeriod {
  periodId: number;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  periodStart: string;
  periodEnd: string;
  status: Extract<PeriodStatus, "OPEN" | "DRAFT" | "REJECTED">;
  totalHours: string;
  dueDate: string;
  daysOverdue: number;
  escalationLevel: number;
}

export interface OverdueQueueResult {
  escalationThresholds: number[];
  graceDays: number;
  asOf: string;
  items: OverduePeriod[];
  total: number;
}

export interface OverdueQueryInput {
  userId?: string;
  asOf?: string;
  page?: number;
  limit?: number;
}

export interface AuditChainVerification {
  valid: boolean;
  brokenAtId?: number;
  checked: number;
  verified: number;
  legacyRows: number;
  total: number;
  truncated: boolean;
}

export interface SettingsHistoryEntry {
  id: number;
  orgId: string;
  version: number;
  settings: Record<string, unknown>;
  changedBy: string | null;
  changeReason: string | null;
  createdAt: string;
}

export interface ResolvedRatePreview {
  billRate: number | null;
  costRate: number | null;
  currency: string;
  source: "RATE_CARD" | "PROJECT_MEMBER" | null;
}
