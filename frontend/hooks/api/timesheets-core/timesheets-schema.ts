import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

export const timesheetPeriodContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userMembershipId: z.number().nullable(),
  periodStart: z.string(),
  periodEnd: z.string(),
  status: z.enum(["OPEN", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "LOCKED", "REOPENED"]),
  totalHours: z.string(),
  billableHours: z.string(),
  nonBillableHours: z.string(),
  submittedAt: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  lockedAt: z.string().nullable(),
  currentApproverMembershipId: z.number().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: z
    .object({
      membershipId: z.number().nullable(),
      name: z.string().nullable(),
      email: z.string().nullable(),
    })
    .optional(),
});

export const timesheetApprovalItemContract = timesheetPeriodContract.extend({
  approvedBy: z.string().nullable(),
  user: z.object({
    membershipId: z.number().nullable(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  }),
});

export const approvalsListResponseContract = cursorPageContract(timesheetApprovalItemContract);

export const bulkApproveResponseContract = z.object({
  approved: z.number(),
  skipped: z.number(),
});

export const bulkRejectResponseContract = z.object({ rejected: z.number() });

const timesheetAuditEventContract = z.object({
  id: z.number(),
  actorMembershipId: z.number().nullable(),
  actorName: z.string().nullable(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.string(),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
  reason: z.string().nullable(),
  createdAt: z.string(),
});

export const auditListResponseContract = cursorPageContract(timesheetAuditEventContract);

export const auditVerifyResponseContract = z.union([
  z.object({
    valid: z.literal(true),
    checked: z.number(),
    verified: z.number(),
    legacyRows: z.number(),
  }),
  z.object({
    valid: z.literal(false),
    brokenAtId: z.number(),
    checked: z.number(),
    legacyRows: z.number(),
  }),
]);

const convertedTotalsContract = z
  .object({
    baseCurrency: z.string(),
    convertedTotal: z.number(),
    conversions: z.array(
      z.object({
        currency: z.string(),
        amount: z.number(),
        rate: z.number(),
        rateDate: z.string().nullable(),
        converted: z.number(),
      }),
    ),
    missingRates: z.array(z.string()),
  })
  .nullable();

export const billingUninvoicedResponseContract = z.object({
  groups: z.array(
    z.object({
      projectId: z.number(),
      projectName: z.string(),
      totalHours: z.number(),
      billableAmount: z.number(),
      currency: z.string(),
      entryCount: z.number(),
      missingRate: z.boolean(),
    }),
  ),
  totals: z.object({
    hours: z.number(),
    amount: z.number().nullable(),
    currency: z.string().nullable(),
    mixed: z.boolean(),
    byCurrency: z.array(z.object({ currency: z.string(), amount: z.number(), hours: z.number() })),
    converted: convertedTotalsContract,
  }),
});

export const billingExportResponseContract = z.object({
  exportId: z.number(),
  entryCount: z.number(),
  totalHours: z.number(),
  totalAmount: z.number(),
  duplicate: z.boolean().optional(),
});

export const billingInvoiceDraftResponseContract = z.object({
  exportId: z.number(),
  entryCount: z.number(),
  amount: z.number(),
});

export const billingRatePreviewResponseContract = z.object({
  billRate: z.number().nullable(),
  costRate: z.number().nullable(),
  currency: z.string(),
  source: z.enum(["RATE_CARD", "PROJECT_MEMBER"]).nullable(),
});

const burnResultContract = z.object({
  budget: z.number(),
  consumed: z.number(),
  percentUsed: z.number(),
  remaining: z.number(),
  alertLevel: z.number(),
  over: z.boolean(),
});

export const budgetItemContract = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number().nullable(),
  projectName: z.string().nullable(),
  clientId: z.number().nullable(),
  budgetType: z.enum(["HOURS", "AMOUNT"]),
  budgetHours: z.string().nullable(),
  budgetAmount: z.string().nullable(),
  currency: z.string(),
  alertThresholds: z.array(z.number()),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  burn: burnResultContract,
});

export const budgetListResponseContract = z.array(budgetItemContract);

export const entryContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userMembershipId: z.number().nullable(),
  ticketId: z.number().nullable(),
  projectId: z.number().nullable(),
  date: z.string(),
  hours: z.string(),
  description: z.string().nullable(),
  isBillable: z.boolean(),
  billingType: z.enum(["BILLABLE", "NON_BILLABLE", "FIXED"]),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  submittedAt: z.string().nullable(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  lockedAt: z.string().nullable(),
  voidedAt: z.string().nullable(),
  invoicingStatus: z.enum(["UNINVOICED", "INVOICE_DRAFTED", "INVOICED"]),
  billRate: z.string().nullable(),
  currency: z.string().nullable(),
  rateSource: z.string().nullable(),
  source: z.enum(["MANUAL", "TIMER", "API", "IMPORT"]),
  workLink: z.string().nullable(),
  timesheetPeriodId: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ id: z.number(), name: z.string() }).nullable(),
  ticket: z
    .object({
      id: z.number(),
      title: z.string(),
      ticketNumber: z.number(),
      project: z.object({ id: z.number(), name: z.string() }).nullable(),
    })
    .nullable(),
});

export const entriesListResponseContract = cursorPageContract(entryContract);

const exceptionItemContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userMembershipId: z.number().nullable(),
  periodId: z.number().nullable(),
  entryId: z.number().nullable(),
  rule: z.enum(["MISSING_TIMESHEET", "UNDER_HOURS", "OVER_MAX_DAILY", "UNRESOLVED_TIMER", "MISSING_RATE"]),
  severity: z.enum(["ERROR", "WARNING"]),
  status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
  message: z.string(),
  details: z.unknown().nullable(),
  ownerMembershipId: z.number().nullable(),
  dueDate: z.string().nullable(),
  resolutionReason: z.string().nullable(),
  resolvedByMembershipId: z.number().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: z.object({
    membershipId: z.number().nullable(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  }),
});

export const exceptionsListResponseContract = cursorPageContract(exceptionItemContract);

export const exceptionsSummaryResponseContract = z.object({
  total: z.number(),
  byStatus: z.record(z.string(), z.number()),
  bySeverity: z.record(z.string(), z.number()),
  openBySeverity: z.record(z.string(), z.number()),
});

export const exceptionResolutionResponseContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userMembershipId: z.number().nullable(),
  periodId: z.number().nullable(),
  entryId: z.number().nullable(),
  rule: z.enum(["MISSING_TIMESHEET", "UNDER_HOURS", "OVER_MAX_DAILY", "UNRESOLVED_TIMER", "MISSING_RATE"]),
  severity: z.enum(["ERROR", "WARNING"]),
  status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
  message: z.string(),
  details: z.unknown().nullable(),
  ownerMembershipId: z.number().nullable(),
  dueDate: z.string().nullable(),
  resolutionReason: z.string().nullable(),
  resolvedByMembershipId: z.number().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const detectorResponseContract = z.object({
  week: z.object({ start: z.string(), end: z.string() }),
  candidates: z.number(),
  created: z.number(),
});

export const periodsListResponseContract = z.array(timesheetPeriodContract);

export const periodDetailResponseContract = z.object({
  period: timesheetPeriodContract,
  entries: z.array(
    z.object({
      id: z.number(),
      orgId: z.string(),
      userMembershipId: z.number().nullable(),
      ticketId: z.number().nullable(),
      projectId: z.number().nullable(),
      date: z.string(),
      hours: z.string(),
      description: z.string().nullable(),
      isBillable: z.boolean(),
      billingType: z.enum(["BILLABLE", "NON_BILLABLE", "FIXED"]),
      status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
      submittedAt: z.string().nullable(),
      approvedAt: z.string().nullable(),
      approvedByMembershipId: z.number().nullable(),
      rejectionReason: z.string().nullable(),
      voidedAt: z.string().nullable(),
      invoicingStatus: z.enum(["UNINVOICED", "INVOICE_DRAFTED", "INVOICED"]),
      billRate: z.string().nullable(),
      currency: z.string().nullable(),
      timesheetPeriodId: z.number().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      project: z.object({ id: z.number(), name: z.string() }).nullable(),
    }),
  ),
});

const rateCardContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  currency: z.string(),
  isDefault: z.boolean(),
  effectiveFrom: z.string().nullable(),
  effectiveTo: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const rateContract = z.object({
  id: z.number(),
  orgId: z.string(),
  rateCardId: z.number().nullable(),
  projectId: z.number().nullable(),
  userMembershipId: z.number().nullable(),
  clientId: z.number().nullable(),
  taskId: z.number().nullable(),
  billingType: z.enum(["BILLABLE", "NON_BILLABLE", "FIXED"]),
  billRate: z.string(),
  costRate: z.string().nullable(),
  currency: z.string(),
  priority: z.number(),
  effectiveFrom: z.string().nullable(),
  effectiveTo: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ratesListResponseContract = z.object({
  rates: z.array(rateContract),
  rateCards: z.array(rateCardContract),
});

export const reportsOverviewResponseContract = z.object({
  totalHours: z.number(),
  billableHours: z.number(),
  nonBillableHours: z.number(),
  billableRatio: z.number(),
  approvedHours: z.number(),
  pendingApprovalHours: z.number(),
  pendingPeriods: z.number(),
  activeUsers: z.number(),
  byDay: z.array(z.object({ date: z.string(), hours: z.number() })),
  byProject: z.array(
    z.object({
      projectId: z.number(),
      projectName: z.string(),
      hours: z.number(),
    }),
  ),
});

export const reportsUtilizationResponseContract = z.object({
  startDate: z.string(),
  endDate: z.string(),
  summary: z.object({
    totalHours: z.number(),
    billableHours: z.number(),
    nonBillableHours: z.number(),
    billableUtilization: z.number(),
    activeUsers: z.number(),
  }),
  users: z.array(
    z.object({
      userId: z.string().nullable(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      totalHours: z.number(),
      billableHours: z.number(),
      nonBillableHours: z.number(),
      billableUtilization: z.number(),
    }),
  ),
});

export const clientProfitabilityResponseContract = z.object({
  startDate: z.string(),
  endDate: z.string(),
  clients: z.array(
    z.object({
      clientId: z.number().nullable(),
      clientName: z.string(),
      hours: z.number(),
      missingRateHours: z.number(),
      amounts: z.array(z.object({ currency: z.string(), billableAmount: z.number(), costAmount: z.number().nullable(), margin: z.number().nullable() })),
    }),
  ),
});

export const complianceResponseContract = z.object({
  startDate: z.string(),
  endDate: z.string(),
  expectedWeeklyHours: z.number().nullable(),
  users: z.array(
    z.object({
      userId: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      expectedHours: z.number().nullable(),
      actualHours: z.number(),
      missingDays: z.number(),
      periodsSubmitted: z.number(),
      periodsApproved: z.number(),
      periodsOverdue: z.number(),
    }),
  ),
});

export const approvalSlaResponseContract = z.object({
  startDate: z.string(),
  endDate: z.string(),
  totalSubmitted: z.number(),
  byStatus: z.record(z.string(), z.number()),
  avgHoursToDecision: z.number().nullable(),
  oldestPending: z
    .object({
      periodId: z.number(),
      userId: z.string(),
      submittedAt: z.string(),
      daysWaiting: z.number(),
    })
    .nullable(),
  perApprover: z.array(
    z.object({
      approverId: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      pendingCount: z.number(),
      avgHoursToDecision: z.number().nullable(),
    }),
  ),
});

export const billingLeakageResponseContract = z.object({
  startDate: z.string(),
  endDate: z.string(),
  billableHours: z.number(),
  nonBillableHours: z.number(),
  writeOffRate: z.number(),
  approvedBillableUninvoiced: z.object({
    hours: z.number(),
    amounts: z.array(z.object({ currency: z.string(), amount: z.number() })),
  }),
  missingRateHours: z.number(),
  voidedHours: z.number(),
});

export const timesheetSettingsContract = z.object({
  id: z.number(),
  orgId: z.string(),
  workWeekStart: z.number(),
  requiredFields: z.array(z.string()).nullable(),
  roundingRule: z.enum(["NONE", "NEAREST_5", "NEAREST_6", "NEAREST_10", "NEAREST_15", "ROUND_UP", "ROUND_DOWN"]),
  maxHoursPerDay: z.string(),
  allowOverlappingEntries: z.boolean(),
  allowBackdatedEntries: z.boolean(),
  backdateLimitDays: z.number().nullable(),
  approvalMode: z.enum(["MANAGER", "AUTO", "MULTI_LEVEL"]),
  clientApprovalEnabled: z.boolean(),
  lockAfterApproval: z.boolean(),
  lockAfterInvoice: z.boolean(),
  reminderRules: z.unknown().nullable(),
  payPeriod: z.string(),
  allowFutureEntries: z.boolean(),
  expectedDailyHours: z.string().nullable(),
  expectedWeeklyHours: z.string().nullable(),
  submissionGraceDays: z.number().nullable(),
  overtimeDailyHours: z.string(),
  overtimeWeeklyHours: z.string(),
  includeNonBillable: z.boolean(),
  payrollMapping: z.unknown().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const teamSummaryResponseContract = z.object({
  summaries: z.array(
    z.object({
      userId: z.string(),
      period: timesheetPeriodContract.nullable(),
      dailyHours: z.record(z.string(), z.number()),
      totalHours: z.number(),
    }),
  ),
});

export const timerContract = z.object({
  id: z.number(),
  userMembershipId: z.number().nullable(),
  projectId: z.number().nullable(),
  ticketId: z.number().nullable(),
  description: z.string().nullable(),
  billable: z.boolean(),
  startedAt: z.string(),
  lastResumedAt: z.string().nullable(),
  accumulatedSeconds: z.number(),
  status: z.enum(["RUNNING", "PAUSED", "STOPPED", "DISCARDED", "CONVERTED"]),
  elapsedSeconds: z.number(),
  project: z.object({ id: z.number(), name: z.string() }).nullable(),
  ticket: z.object({ id: z.number(), title: z.string() }).nullable(),
});

export const timerNullableResponseContract = timerContract.nullable();

export const settingsHistoryListResponseContract = z.array(
  z.object({
    id: z.number(),
    orgId: z.string(),
    version: z.number(),
    settings: z.unknown(),
    changedByMembershipId: z.number().nullable(),
    changeReason: z.string().nullable(),
    createdAt: z.string(),
  }),
);

export type TimesheetPeriod = z.infer<typeof timesheetPeriodContract>;
export type TimesheetEntry = z.infer<typeof entryContract>;
export type TimesheetTimer = z.infer<typeof timerContract>;
