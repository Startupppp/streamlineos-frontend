export interface TaxProblem {
  code: string;
  message: string;
  documentLineId?: string;
}

export interface TaxPreviewComponent {
  component: string;
  jurisdiction: string;
  rateBp: number;
  taxableMinor: number;
  taxMinor: number;
  glRole: string;
  accountId: string | null;
}

export interface TaxPreviewLine {
  documentLineId: string;
  taxCode: string;
  category: string;
  netMinor: number;
  taxMinor: number;
  grossMinor: number;
  components: TaxPreviewComponent[];
}

export interface TaxPreview {
  currency: string;
  netMinor: number;
  taxMinor: number;
  grossMinor: number;
  roundingMinor: number;
  lines: TaxPreviewLine[];
  errors: TaxProblem[];
  warnings: TaxProblem[];
}

export interface FrozenTaxLine {
  component: string;
  jurisdiction: string;
  rateBp: number;
  taxableMinor: number;
  taxMinor: number;
  currency: string;
  glRole: string;
  glAccountId: string | null;
  documentLineId: string | null;
}

export type DepositAccountTag = "bank" | "cash" | "undeposited" | "psp_clearing";

export type ArReceiptStatus = "POSTED" | "REVERSED";

export interface ArAllocationView {
  id: string;
  documentId: string;
  documentNumber: string | null;
  amountMinor: number;
  createdAt: string;
}

export interface ArReceiptSummary {
  id: string;
  bookId: string;
  partyId: string;
  receiptNumber: string | null;
  receiptDate: string;
  depositAccountId: string;
  currency: string;
  fxRate: string;
  amountMinor: number;
  unappliedMinor: number;
  appliedMinor: number;
  status: ArReceiptStatus;
  paymentMethod: string | null;
  reference: string | null;
  memo: string | null;
  postedJournalId: string | null;
  reversalJournalId: string | null;
}

export interface ArReceiptView extends ArReceiptSummary {
  allocations: ArAllocationView[];
}

export interface ArReceiptPage {
  items: ArReceiptSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AllocationLineInput {
  documentId: string;
  amountMinor: number;
}

export interface CreateReceiptInput {
  partyId: string;
  receiptDate: string;
  depositAccountId?: string;
  depositAccountTag?: DepositAccountTag;
  currency?: string;
  fxRate?: string;
  amountMinor: number;
  paymentMethod?: string | null;
  reference?: string | null;
  memo?: string | null;
  providerPaymentId?: string | null;
  allocations?: AllocationLineInput[];
  autoAllocateFifo?: boolean;
}

export interface ReverseReceiptInput {
  reversalDate?: string;
  reason?: string;
}

export interface ListReceiptsQuery {
  partyId?: string;
  status?: ArReceiptStatus;
  unappliedOnly?: boolean;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface CreditNoteAllocationResult {
  creditNoteId: string;
  allocatedMinor: number;
  openMinor: number;
}

export type AgingBasis = "due" | "issue";

export interface AgingBuckets {
  days0to30: number;
  days31to60: number;
  days61to90: number;
  days91Plus: number;
}

export type AgingBucketKey = keyof AgingBuckets;

export interface AgingOpenItem {
  kind: "invoice" | "credit_note" | "unapplied_receipt";
  documentId: string;
  documentNumber: string | null;
  partyId: string;
  partyName: string;
  currency: string;
  issueDate: string;
  basisDate: string;
  daysOverdue: number;
  bucket: AgingBucketKey;
  openMinor: number;
  functionalOpenMinor: number;
}

export interface AgingPartyRow {
  partyId: string;
  partyName: string;
  currency: string;
  buckets: AgingBuckets;
  totalMinor: number;
  functionalTotalMinor: number;
}

export interface AgingReport {
  bookId: string;
  asOf: string;
  basis: AgingBasis;
  baseCurrency: string;
  rows: AgingPartyRow[];
  totals: AgingBuckets & { totalMinor: number; functionalTotalMinor: number };
  reconciliation: {
    agingFunctionalMinor: number;
    arControlBalanceMinor: number;
    differenceMinor: number;
    balanced: boolean;
  };
}

export interface AgingQuery {
  asOf?: string;
  basis?: AgingBasis;
  partyId?: string;
  currency?: string;
  includeSettled?: boolean;
}
