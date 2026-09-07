export interface ReportRangeParams {
  startDate?: string;
  endDate?: string;
}

export interface ReportCurrencyAmount {
  currency: string;
  billableAmount: number;
  costAmount: number | null;
  margin: number | null;
}

export interface UtilizationReportSummary {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billableUtilization: number;
  activeUsers: number;
}

export interface UtilizationReportUser {
  userId: string | null;
  name: string | null;
  email: string | null;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billableUtilization: number;
}

export interface UtilizationReport {
  startDate: string;
  endDate: string;
  summary: UtilizationReportSummary;
  users: UtilizationReportUser[];
}

export interface ClientProfitabilityClient {
  clientId: number | null;
  clientName: string;
  hours: number;
  missingRateHours: number;
  amounts: ReportCurrencyAmount[];
}

export interface ClientProfitabilityReport {
  startDate: string;
  endDate: string;
  clients: ClientProfitabilityClient[];
}

export interface ComplianceReportUser {
  userId: string;
  name: string | null;
  email: string | null;
  expectedHours: number | null;
  actualHours: number;
  missingDays: number;
  periodsSubmitted: number;
  periodsApproved: number;
  periodsOverdue: number;
}

export interface ComplianceReport {
  startDate: string;
  endDate: string;
  expectedWeeklyHours: number | null;
  users: ComplianceReportUser[];
}

export interface ApprovalSlaOldestPending {
  periodId: number;
  userId: string;
  submittedAt: string;
  daysWaiting: number;
}

export interface ApprovalSlaApprover {
  approverId: string;
  name: string | null;
  email: string | null;
  pendingCount: number;
  avgHoursToDecision: number | null;
}

export interface ApprovalSlaReport {
  startDate: string;
  endDate: string;
  totalSubmitted: number;
  byStatus: Record<string, number>;
  avgHoursToDecision: number | null;
  oldestPending: ApprovalSlaOldestPending | null;
  perApprover: ApprovalSlaApprover[];
}

export interface BillingLeakageUninvoiced {
  hours: number;
  amounts: { currency: string; amount: number }[];
}

export interface BillingLeakageReport {
  startDate: string;
  endDate: string;
  billableHours: number;
  nonBillableHours: number;
  writeOffRate: number;
  approvedBillableUninvoiced: BillingLeakageUninvoiced;
  missingRateHours: number;
  voidedHours: number;
}
