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
export type BillingType = "BILLABLE" | "NON_BILLABLE" | "INTERNAL";
export type InvoicingStatus = "UNINVOICED" | "INVOICE_DRAFTED" | "INVOICED";
export type EntrySource = "MANUAL" | "TIMER" | "GRID" | "IMPORT";
export type RoundingRule =
  | "NONE"
  | "NEAREST_5"
  | "NEAREST_6"
  | "NEAREST_10"
  | "NEAREST_15"
  | "ROUND_UP"
  | "ROUND_DOWN";
export type ApprovalMode = "NONE" | "MANAGER" | "PROJECT" | "CLIENT";

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
  createdAt: string;
  updatedAt: string;
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

export interface RatePreview {
  billRate: number | null;
  currency: string;
  source: string | null;
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

export interface BillingGroup {
  projectId: number | null;
  projectName: string;
  totalHours: number;
  billableAmount: number;
  currency: string;
  entryCount: number;
  missingRate: boolean;
}

export interface BillingUninvoiced {
  groups: BillingGroup[];
  totals: { hours: number; amount: number; currency: string };
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
}

export interface InvoiceDraftInput {
  startDate: string;
  endDate: string;
  projectId?: number;
}

export const PERIOD_STATUS_BADGE: Record<PeriodStatus, string> = {
  OPEN: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
  DRAFT: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  SUBMITTED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  REJECTED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  LOCKED: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
  REOPENED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
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
  PENDING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  REJECTED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

export const BILLING_TYPE_LABEL: Record<BillingType, string> = {
  BILLABLE: "Billable",
  NON_BILLABLE: "Non-billable",
  INTERNAL: "Internal",
};
