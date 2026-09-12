import type { TaxRegime } from "./accounting-kernel";

export type PartyRole = "customer" | "vendor" | "both";

export interface PartyExternalRef {
  system: string;
  id: string;
}

export interface PartySummary {
  id: string;
  bookId: string;
  role: PartyRole;
  displayName: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  countryCode: string;
  defaultCurrency: string;
  billingRegion: string | null;
  billingCountryCode: string | null;
  paymentTermsDays: number;
  isActive: boolean;
}

export interface PartyTaxRegistration {
  id: string;
  regime: TaxRegime;
  number: string;
  region: string | null;
  countryCode: string;
  isPrimary: boolean;
  validFrom: string | null;
  validTo: string | null;
}

export interface PartyDetail extends PartySummary {
  billingLine1: string | null;
  billingLine2: string | null;
  billingCity: string | null;
  billingPostalCode: string | null;
  shippingLine1: string | null;
  shippingCity: string | null;
  shippingRegion: string | null;
  shippingPostalCode: string | null;
  defaultIncomeAccountId: string | null;
  defaultExpenseAccountId: string | null;
  withholdingCode: string | null;
  notes: string | null;
  externalRefs: PartyExternalRef[];
  taxRegistrations: PartyTaxRegistration[];
}

export interface PartyPage {
  items: PartySummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ListPartiesQuery {
  role?: PartyRole;
  search?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreatePartyInput {
  role?: PartyRole;
  displayName: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  countryCode: string;
  defaultCurrency: string;
  billingLine1?: string | null;
  billingLine2?: string | null;
  billingCity?: string | null;
  billingRegion?: string | null;
  billingPostalCode?: string | null;
  billingCountryCode?: string | null;
  shippingLine1?: string | null;
  shippingCity?: string | null;
  shippingRegion?: string | null;
  shippingPostalCode?: string | null;
  shippingCountryCode?: string | null;
  defaultIncomeAccountId?: string | null;
  defaultExpenseAccountId?: string | null;
  paymentTermsDays?: number;
  withholdingCode?: string | null;
  notes?: string | null;
  isActive?: boolean;
  externalRefs?: PartyExternalRef[];
}

export type UpdatePartyInput = Partial<CreatePartyInput>;

export interface CreatePartyTaxRegistrationInput {
  regime: TaxRegime;
  number: string;
  region?: string | null;
  countryCode: string;
  isPrimary?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface DeletedResult {
  id: string;
  deleted: true;
}

export type ArDocumentType = "INVOICE" | "CREDIT_NOTE";

export type ArDocumentStatus = "DRAFT" | "POSTED" | "PARTIALLY_PAID" | "PAID" | "VOID";

export type TaxCategory =
  | "standard"
  | "reduced"
  | "super_reduced"
  | "zero"
  | "exempt"
  | "out_of_scope"
  | "reverse_charge";

export type SupplyNature =
  | "domestic_b2b"
  | "domestic_b2c"
  | "export"
  | "import"
  | "intra_community"
  | "oss_b2c"
  | "reverse_charge"
  | "outside_scope";

export interface ArDocumentLineView {
  id: string;
  lineNo: number;
  description: string;
  quantityMilli: number;
  unit: string | null;
  unitPriceMinor: number;
  discountMinor: number;
  taxCategory: string;
  commodityCode: string | null;
  forcedTaxCodeId: string | null;
  forcedTaxReason: string | null;
  incomeAccountId: string | null;
  lineNetMinor: number;
  lineTaxMinor: number;
  lineGrossMinor: number;
  dimensionProjectId: number | null;
  dimensionCostCenterId: string | null;
}

export interface ArDocumentSummary {
  id: string;
  bookId: string;
  partyId: string;
  documentType: ArDocumentType;
  status: ArDocumentStatus;
  documentNumber: string | null;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  fxRate: string;
  supplyNature: SupplyNature;
  taxLocationFromCountry: string | null;
  taxLocationFromRegion: string | null;
  taxLocationToCountry: string | null;
  taxLocationToRegion: string | null;
  placeOfSupplyCode: string | null;
  taxInclusive: boolean;
  exportWithIgst: boolean;
  netMinor: number;
  taxMinor: number;
  grossMinor: number;
  roundingMinor: number;
  functionalGrossMinor: number;
  settledMinor: number;
  openMinor: number;
  originalDocumentId: string | null;
  postedJournalId: string | null;
  gstrPeriod: string | null;
  memo: string | null;
  reference: string | null;
}

export interface ArDocumentView extends ArDocumentSummary {
  lines: ArDocumentLineView[];
}

export interface ArDocumentPage {
  items: ArDocumentSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ArDocumentLineInput {
  description: string;
  quantityMilli?: number;
  unit?: string | null;
  unitPriceMinor: number;
  discountMinor?: number;
  taxCategory?: TaxCategory;
  commodityCode?: string | null;
  forcedTaxCodeId?: string | null;
  forcedTaxReason?: string | null;
  incomeAccountId?: string | null;
  dimensionProjectId?: number | null;
  dimensionCostCenterId?: string | null;
}

export interface ArDocumentHeaderInput {
  partyId: string;
  issueDate: string;
  dueDate?: string | null;
  currency?: string;
  fxRate?: string;
  supplyNature?: SupplyNature;
  taxLocationFromCountry?: string | null;
  taxLocationFromRegion?: string | null;
  taxLocationToCountry?: string | null;
  taxLocationToRegion?: string | null;
  placeOfSupplyCode?: string | null;
  taxInclusive?: boolean;
  exportWithIgst?: boolean;
  memo?: string | null;
  reference?: string | null;
  crmDealId?: string | null;
  dimensionProjectId?: number | null;
  ecommerceGstin?: string | null;
}

export interface CreateInvoiceInput extends ArDocumentHeaderInput {
  lines: ArDocumentLineInput[];
}

export interface CreateCreditNoteInput extends CreateInvoiceInput {
  originalDocumentId?: string | null;
}

export interface CreditNoteFromInvoiceInput {
  issueDate?: string;
  memo?: string | null;
  reference?: string | null;
  lines?: ArDocumentLineInput[];
}

export interface UpdateArDraftInput extends Partial<ArDocumentHeaderInput> {
  originalDocumentId?: string | null;
  lines?: ArDocumentLineInput[];
}

export interface ListArDocumentsQuery {
  partyId?: string;
  status?: ArDocumentStatus;
  openOnly?: boolean;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

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
