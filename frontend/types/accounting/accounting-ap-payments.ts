import type {
  ApDocumentDetail,
  ApDocumentStatus,
  ApDocumentType,
  ApPaymentStatus,
  TaxCategory,
  TaxSupplyNature,
} from "./accounting-ap";

export interface ApPostResult {
  document: ApDocumentDetail;
  journalId: string;
  journalNumber: string;
  replayed: boolean;
  selfAssessedTaxMinor: number;
}

export interface ApDocumentLineInput {
  description: string;
  quantityMilli?: number;
  unit?: string | null;
  unitPriceMinor: number;
  discountMinor?: number;
  taxCategory?: TaxCategory;
  commodityCode?: string | null;
  expenseAccountId?: string | null;
  capitalize?: boolean;
  dimensionCostCenterId?: string | null;
}

export interface CreateApDocumentInput {
  documentType?: ApDocumentType;
  partyId: string;
  vendorDocumentNumber?: string | null;
  vendorDocumentDate?: string | null;
  issueDate: string;
  dueDate?: string | null;
  currency?: string;
  supplyNature?: TaxSupplyNature;
  reverseCharge?: boolean;
  blockedInputTax?: boolean;
  taxInclusive?: boolean;
  placeOfSupplyCode?: string | null;
  originalDocumentId?: string | null;
  memo?: string | null;
  reference?: string | null;
  lines: ApDocumentLineInput[];
}

export type UpdateApDocumentInput = Partial<Omit<CreateApDocumentInput, "documentType">>;

export interface ListApDocumentsParams {
  documentType?: ApDocumentType;
  status?: ApDocumentStatus;
  partyId?: string;
  from?: string;
  to?: string;
  openOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ApAllocation {
  id: string;
  documentId: string;
  documentNumber: string | null;
  vendorDocumentNumber: string | null;
  amountMinor: number;
  createdAt: string;
}

export interface ApWithholdingEntry {
  id: string;
  regime: string;
  legacySection: string | null;
  paymentCode: string | null;
  rateBp: number;
  baseMinor: number;
  withheldMinor: number;
  currency: string;
  glAccountId: string | null;
  remittanceReference: string | null;
}

export interface ApPayment {
  id: string;
  bookId: string;
  partyId: string;
  partyName: string;
  paymentNumber: string | null;
  paymentDate: string;
  paymentAccountId: string;
  currency: string;
  fxRate: string;
  grossMinor: number;
  withheldMinor: number;
  netPaidMinor: number;
  unappliedMinor: number;
  status: ApPaymentStatus;
  paymentMethod: string | null;
  reference: string | null;
  memo: string | null;
  postedJournalId: string | null;
  reversalJournalId: string | null;
  allocations: ApAllocation[];
  withholding: ApWithholdingEntry[];
}

export interface ApPaymentPage {
  items: ApPayment[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApPaymentPostResult {
  payment: ApPayment;
  journalId: string;
  journalNumber: string;
  replayed: boolean;
}

export type WithholdingMode = "auto" | "manual" | "none";

export interface WithholdingInstruction {
  mode: WithholdingMode;
  code?: string | null;
  rateBp?: number | null;
  withheldMinor?: number | null;
  baseMinor?: number | null;
  reason?: string | null;
}

export interface ApAllocationInput {
  documentId: string;
  amountMinor: number;
}

export interface PostApPaymentInput {
  partyId: string;
  paymentDate: string;
  paymentAccountId: string;
  currency?: string;
  grossMinor?: number;
  withholding?: WithholdingInstruction;
  allocations: ApAllocationInput[];
  paymentMethod?: string | null;
  reference?: string | null;
  memo?: string | null;
}

export interface ListApPaymentsParams {
  partyId?: string;
  status?: ApPaymentStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export type ApAgingBucket = "0-30" | "31-60" | "61-90" | "91+";

export const AP_AGING_BUCKETS: readonly ApAgingBucket[] = ["0-30", "31-60", "61-90", "91+"];

export interface ApAgingItem {
  documentId: string;
  documentType: ApDocumentType;
  documentNumber: string | null;
  vendorDocumentNumber: string | null;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  openMinor: number;
  functionalOpenMinor: number;
  daysOverdue: number;
  bucket: ApAgingBucket;
}

export interface ApAgingPartyRow {
  partyId: string;
  partyName: string;
  buckets: Record<ApAgingBucket, number>;
  totalMinor: number;
  items: ApAgingItem[];
}

export interface ApAgingReport {
  bookId: string;
  asOf: string;
  functionalCurrency: string;
  buckets: Record<ApAgingBucket, number>;
  totalMinor: number;
  parties: ApAgingPartyRow[];
  page: number;
  pageSize: number;
  totalParties: number;
}

export interface ApAgingParams {
  asOf?: string;
  partyId?: string;
  includeItems?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ApLedgerTieOut {
  reportKey: "aging";
  side: "ap";
  asOf: string;
  currency: string;
  totalOpenMinor: number;
  controlAccountCode: string | null;
  controlAccountBalanceMinor: number;
  differenceMinor: number;
  reconciles: boolean;
  notes: string[];
}
