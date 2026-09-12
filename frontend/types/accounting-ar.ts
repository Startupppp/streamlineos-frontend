import type { TaxRegime } from "./accounting-kernel-ext";

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
