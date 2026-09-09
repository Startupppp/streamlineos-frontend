export type EntryStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PeriodStatus =
  | "OPEN"
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "LOCKED"
  | "REOPENED";
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
export type ApprovalMode = "MANAGER" | "AUTO" | "MULTI_LEVEL";

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

export interface TimesheetEntry {
  id: number;
  orgId: string;
  userId: string;
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
  userId: string;
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
  currentApproverId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string | null; email: string };
}

export interface PeriodDetail {
  period: TimesheetPeriod;
  entries: TimesheetEntry[];
}

export interface TimerSession {
  id: number;
  userId: string;
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
  ticket: { id: number; title: string; ticketNumber: number | null } | null;
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
  approvalMode: ApprovalMode;
  clientApprovalEnabled: boolean;
  lockAfterApproval: boolean;
  lockAfterInvoice: boolean;
  reminderRules: Record<string, unknown> | null;
  allowFutureEntries: boolean;
  expectedDailyHours: string | null;
  expectedWeeklyHours: string | null;
  submissionGraceDays: number | null;
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
  clientApprovalEnabled?: boolean;
  lockAfterApproval?: boolean;
  lockAfterInvoice?: boolean;
  allowFutureEntries?: boolean;
  expectedDailyHours?: number | null;
  expectedWeeklyHours?: number | null;
  submissionGraceDays?: number | null;
  changeReason?: string;
}

export interface TimesheetRate {
  id: number;
  orgId: string;
  rateCardId: number | null;
  projectId: number | null;
  userId: string | null;
  clientId: number | null;
  taskId: number | null;
  billingType: BillingType;
  billRate: string;
  costRate: string | null;
  currency: string;
  priority: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetRateCard {
  id: number;
  orgId: string;
  name: string;
  currency: string;
  isDefault: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RatesResponse {
  rates: TimesheetRate[];
  rateCards: TimesheetRateCard[];
}

export type BudgetType = "HOURS" | "AMOUNT";

export interface BudgetBurn {
  budget: number;
  consumed: number;
  percentUsed: number;
  remaining: number;
  alertLevel: number;
  over: boolean;
}

export interface TimesheetBudget {
  id: number;
  orgId: string;
  projectId: number | null;
  projectName: string | null;
  clientId: number | null;
  budgetType: BudgetType;
  budgetHours: string | null;
  budgetAmount: string | null;
  currency: string;
  alertThresholds: number[];
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  burn: BudgetBurn;
}

export interface CreateBudgetInput {
  projectId?: number;
  clientId?: number;
  budgetType?: BudgetType;
  budgetHours?: number;
  budgetAmount?: number;
  currency?: string;
  alertThresholds?: number[];
  startsAt?: string;
  endsAt?: string;
  status?: "ACTIVE" | "ARCHIVED";
}

/**
 * One row per (project, currency), not per project. A project billed in two
 * currencies arrives as two rows: the API will not sum across currencies, so
 * `billableAmount` is always money in exactly the `currency` beside it.
 */
export interface BillingGroup {
  projectId: number | null;
  projectName: string;
  totalHours: number;
  billableAmount: number;
  currency: string;
  entryCount: number;
  missingRate: boolean;
}

export interface BillingCurrencyTotal {
  currency: string;
  amount: number;
  hours: number;
}

export interface BillingConvertedTotals {
  baseCurrency: string;
  convertedTotal: number;
  conversions: {
    currency: string;
    amount: number;
    rate: number;
    rateDate: string | null;
    converted: number;
  }[];
  missingRates: string[];
}

export interface BillingUninvoiced {
  groups: BillingGroup[];
  totals: {
    hours: number;
    amount: number | null;
    currency: string | null;
    mixed: boolean;
    byCurrency: BillingCurrencyTotal[];
    converted?: BillingConvertedTotals | null;
  };
}

export interface ReportOverview {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billableRatio: number;
  approvedHours: number;
  pendingApprovalHours: number;
  pendingPeriods: number;
  activeUsers: number;
  byDay: { date: string; hours: number }[];
  byProject: { projectId: number | null; projectName: string; hours: number }[];
}

export interface AuditEvent {
  id: number;
  actorUserId: string | null;
  actorName: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
}

export interface AuditResponse {
  data: AuditEvent[];
  total: number;
}

export interface EntriesQuery {
  userId?: string;
  projectId?: number;
  ticketId?: number;
  status?: EntryStatus;
  startDate?: string;
  endDate?: string;
  billable?: boolean;
  page?: number;
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

export interface CreateRateInput {
  projectId?: number;
  userId?: string;
  taskId?: number;
  clientId?: number;
  billingType?: BillingType;
  billRate: number;
  costRate?: number;
  currency?: string;
  priority?: number;
  rateCardId?: number;
}

export interface BillingExportInput {
  startDate: string;
  endDate: string;
  format: "CSV" | "XLSX";
  projectId?: number;
  idempotencyKey?: string;
}

export interface InvoiceDraftInput {
  startDate: string;
  endDate: string;
  projectId?: number;
}

export const PERIOD_STATUS_BADGE: Record<PeriodStatus, string> = {
  OPEN: "bg-muted text-foreground border-border",
  DRAFT: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  SUBMITTED: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  APPROVED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  REJECTED: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  LOCKED: "bg-muted text-foreground border-border",
  REOPENED: "bg-status-info-surface text-status-info-ink border-status-info-rule",
};

export const PERIOD_STATUS_LABEL: Record<PeriodStatus, string> = {
  OPEN: "Open",
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  LOCKED: "Locked",
  REOPENED: "Reopened",
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

export type ExceptionSeverity = "ERROR" | "WARNING";
export type ExceptionStatus = "OPEN" | "RESOLVED" | "DISMISSED";
export type ExceptionRule =
  | "MISSING_TIMESHEET"
  | "UNDER_HOURS"
  | "OVER_MAX_DAILY"
  | "UNRESOLVED_TIMER"
  | "MISSING_RATE";

export interface TimesheetExceptionRecord {
  id: number;
  orgId: string;
  userId: string;
  periodId: number | null;
  entryId: number | null;
  rule: ExceptionRule;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  message: string;
  details: Record<string, unknown> | null;
  ownerUserId: string | null;
  dueDate: string | null;
  resolutionReason: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetException extends TimesheetExceptionRecord {
  user: { id: string; name: string | null; email: string | null };
}

export interface ExceptionsSummary {
  total: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  openBySeverity: Record<string, number>;
}

export interface ExceptionsQueryInput {
  status?: ExceptionStatus;
  severity?: ExceptionSeverity;
  rule?: ExceptionRule;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface RunDetectionResult {
  week: { start: string; end: string };
  candidates: number;
  created: number;
}

export const EXCEPTION_RULE_LABEL: Record<ExceptionRule, string> = {
  MISSING_TIMESHEET: "Missing timesheet",
  UNDER_HOURS: "Under hours",
  OVER_MAX_DAILY: "Over max daily",
  UNRESOLVED_TIMER: "Unresolved timer",
  MISSING_RATE: "Missing rate",
};

export const EXCEPTION_SEVERITY_LABEL: Record<ExceptionSeverity, string> = {
  ERROR: "Error",
  WARNING: "Warning",
};

export const EXCEPTION_SEVERITY_BADGE: Record<ExceptionSeverity, string> = {
  ERROR:
    "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  WARNING:
    "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
};

export const EXCEPTION_STATUS_LABEL: Record<ExceptionStatus, string> = {
  OPEN: "Open",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

export const EXCEPTION_STATUS_BADGE: Record<ExceptionStatus, string> = {
  OPEN: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  RESOLVED:
    "bg-status-success-surface text-status-success-ink border-status-success-rule",
  DISMISSED:
    "bg-muted text-foreground border-border",
};

/**
 * TS-11. One period that is late, and how late.
 *
 * Mirrors `OverduePeriodRow` in `overdue.service.ts`. `dueDate` is derived on
 * the server from `period_end + submissionGraceDays` rather than stored, so it
 * always reflects the policy as it stands right now — raise the grace from two
 * days to five and the whole queue is correct on the next read.
 */
export interface OverduePeriod {
  periodId: number;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  periodStart: string;
  periodEnd: string;
  /**
   * Only ever `OPEN`, `DRAFT` or `REJECTED` — the endpoint's `UNSETTLED` set,
   * which is deliberately a status test rather than `submitted_at IS NULL`: a
   * rejected period has been submitted once and is owed again.
   */
  status: Extract<PeriodStatus, "OPEN" | "DRAFT" | "REJECTED">;
  totalHours: string;
  dueDate: string;
  daysOverdue: number;
  /**
   * How many configured reminder thresholds this period has passed.
   *
   * **Zero is ambiguous on its own** and the server says so: it means "passed
   * none" for an organisation that configured thresholds, and it also means
   * "there are none to pass" for one that did not. `escalationThresholds` on
   * the response is what separates the two, and any surface rendering this
   * number has to read both or it will tell half its tenants something false.
   */
  escalationLevel: number;
}

export interface OverdueQueueResult {
  /** The org's `remindAfterDueDays`, ascending. Empty when reminders are off. */
  escalationThresholds: number[];
  /** The grace added to every period end to get its due date. */
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
