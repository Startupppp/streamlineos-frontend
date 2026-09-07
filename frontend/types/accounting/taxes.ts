export type TaxType =
  | "GST"
  | "CGST_SGST"
  | "IGST"
  | "VAT"
  | "TDS"
  | "TCS"
  | "EXEMPT"
  | "ZERO_RATED";

export interface TaxCode {
  id: number;
  name: string;
  code: string;
  rate: string;
  taxType: string;
  isReverseCharge: boolean;
  collectedAccountId: number | null;
  paidAccountId: number | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TaxRateGroup {
  rate: string;
  taxableValue: string;
  cgst: string;
  sgst: string;
  igst: string;
  total: string;
  docCount: number;
}

export interface TaxPayment {
  id: number;
  taxType: string;
  periodStart: string;
  periodEnd: string;
  amount: string;
  paidDate: string;
  reference: string | null;
  notes: string | null;
  journalEntryId: number | null;
  createdBy: string;
  createdAt: string | null;
}

export interface RecentTaxPayment {
  id: number;
  taxType: string;
  amount: string;
  paidDate: string;
  reference: string | null;
  periodStart: string;
  periodEnd: string;
}

export interface TaxDashboard {
  period: { from: string; to: string };
  outputTaxByRate: TaxRateGroup[];
  inputTaxByRate: TaxRateGroup[];
  summary: {
    totalOutputTax: string;
    totalInputTax: string;
    netLiability: string;
    unpaidLiability: string;
    taxPayableBalance: string;
    taxReceivableBalance: string;
  };
  recentPayments: RecentTaxPayment[];
  nextDue: { gstr1: string; gstr3b: string };
}

export interface TaxReportLine {
  id: number;
  sourceType: string;
  sourceId: number;
  docNumber: string;
  partyName: string;
  taxableAmount: string;
  rate: string;
  cgst: string;
  sgst: string;
  igst: string;
  total: string;
  date: string;
}

export interface LiabilitySummaryMonth {
  month: string;
  outputTax: string;
  inputTax: string;
  netLiability: string;
  cumulativeUnpaid: string;
}

export interface LiabilitySummaryResponse {
  period: { from: string; to: string };
  months: LiabilitySummaryMonth[];
  totalOutputTax: string;
  totalInputTax: string;
  totalNetLiability: string;
  taxPayableBalance: string;
}

export interface TaxPaymentInput {
  taxType: TaxType;
  periodStart: string;
  periodEnd: string;
  amount: string;
  paidDate: string;
  reference: string;
  notes?: string;
}

export interface AdjustmentLine {
  systemPurpose?: "TAX_PAYABLE" | "TAX_RECEIVABLE";
  accountId?: number;
  debit?: string;
  credit?: string;
  description?: string;
}

export interface CreateTaxAdjustmentInput {
  entryDate: string;
  description: string;
  lines: AdjustmentLine[];
}

export type ApprovalRecordType =
  | "MANUAL_JOURNAL"
  | "PURCHASE_BILL"
  | "VENDOR_PAYMENT"
  | "EXPENSE"
  | "CREDIT_NOTE"
  | "PERIOD_REOPEN"
  | "BANK_ADJUSTMENT";

export interface ApprovalPolicy {
  id: number;
  recordType: ApprovalRecordType;
  minAmount: string | null;
  approverRole: string | null;
  approverUserId: string | null;
  isActive: boolean;
  createdAt: string;
}

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApprovalRequest {
  id: number;
  recordType: string;
  recordId: number;
  status: ApprovalStatus;
  requestedBy: string;
  requesterDisplayName: string;
  recordLabel: string | null;
  recordAmount: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionComment: string | null;
  createdAt: string;
}

export interface ExchangeRate {
  id: number;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  asOfDate: string;
  createdAt: string;
}
