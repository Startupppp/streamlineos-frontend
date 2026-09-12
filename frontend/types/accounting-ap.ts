export type ApDocumentType = "BILL" | "DEBIT_NOTE";

export type ApDocumentStatus = "DRAFT" | "POSTED" | "PARTIALLY_PAID" | "PAID" | "VOID";

export type ApPaymentStatus = "POSTED" | "REVERSED";

export type TaxCategory =
  | "standard"
  | "reduced"
  | "super_reduced"
  | "zero"
  | "exempt"
  | "out_of_scope"
  | "reverse_charge";

export type TaxSupplyNature =
  | "domestic_b2b"
  | "domestic_b2c"
  | "export"
  | "import"
  | "intra_community"
  | "oss_b2c"
  | "reverse_charge"
  | "outside_scope";

export type TaxGlRole =
  | "output_payable"
  | "input_recoverable"
  | "reverse_charge_output"
  | "reverse_charge_input"
  | "blocked_input"
  | "withheld";

export type PartyRole = "customer" | "vendor" | "both";

export interface VendorSummary {
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

export interface VendorTaxRegistration {
  id: string;
  regime: string;
  number: string;
  region: string | null;
  countryCode: string;
  isPrimary: boolean;
  validFrom: string | null;
  validTo: string | null;
}

export interface VendorExternalRef {
  system: string;
  id: string;
}

export interface VendorDetail extends VendorSummary {
  billingLine1: string | null;
  billingLine2: string | null;
  billingCity: string | null;
  billingPostalCode: string | null;
  shippingLine1: string | null;
  shippingCity: string | null;
  shippingRegion: string | null;
  shippingPostalCode: string | null;
  shippingCountryCode: string | null;
  defaultIncomeAccountId: string | null;
  defaultExpenseAccountId: string | null;
  withholdingCode: string | null;
  notes: string | null;
  externalRefs: VendorExternalRef[];
  taxRegistrations: VendorTaxRegistration[];
}

export interface VendorPage {
  items: VendorSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SaveVendorInput {
  role?: PartyRole;
  displayName: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  countryCode: string;
  defaultCurrency: string;
  billingLine1?: string | null;
  billingCity?: string | null;
  billingRegion?: string | null;
  billingPostalCode?: string | null;
  billingCountryCode?: string | null;
  defaultExpenseAccountId?: string | null;
  paymentTermsDays?: number;
  withholdingCode?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface ListVendorsParams {
  role?: PartyRole;
  search?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ApDocumentLine {
  id: string;
  lineNo: number;
  description: string;
  quantityMilli: number;
  unit: string | null;
  unitPriceMinor: number;
  discountMinor: number;
  taxCategory: TaxCategory;
  commodityCode: string | null;
  expenseAccountId: string | null;
  capitalize: boolean;
  lineNetMinor: number;
  lineTaxMinor: number;
  lineGrossMinor: number;
  dimensionProjectId: number | null;
  dimensionCostCenterId: string | null;
}

export interface ApDocumentSummary {
  id: string;
  bookId: string;
  partyId: string;
  partyName: string;
  documentType: ApDocumentType;
  status: ApDocumentStatus;
  documentNumber: string | null;
  vendorDocumentNumber: string | null;
  vendorDocumentDate: string | null;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  fxRate: string;
  supplyNature: TaxSupplyNature;
  reverseCharge: boolean;
  blockedInputTax: boolean;
  taxInclusive: boolean;
  netMinor: number;
  taxMinor: number;
  grossMinor: number;
  roundingMinor: number;
  settledMinor: number;
  openMinor: number;
  functionalGrossMinor: number;
  gstrPeriod: string | null;
  postedJournalId: string | null;
  postedAt: string | null;
  memo: string | null;
  reference: string | null;
}

export interface ApDocumentDetail extends ApDocumentSummary {
  originalDocumentId: string | null;
  placeOfSupplyCode: string | null;
  taxLocationFromCountry: string | null;
  taxLocationFromRegion: string | null;
  taxLocationToCountry: string | null;
  taxLocationToRegion: string | null;
  dimensionProjectId: number | null;
  lines: ApDocumentLine[];
}

export interface ApDocumentPage {
  items: ApDocumentSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApTaxComponentPreview {
  component: string;
  jurisdiction: string;
  rateBp: number;
  taxableMinor: number;
  taxMinor: number;
  recoverable: boolean;
  glRole: TaxGlRole;
  glAccountId: string | null;
}

export interface ApTaxLinePreview {
  documentLineId: string;
  taxCode: string;
  taxCodeId: string | null;
  category: TaxCategory;
  taxableMinor: number;
  totalTaxMinor: number;
  components: ApTaxComponentPreview[];
}

export interface ApTaxNotice {
  code: string;
  message: string;
  documentLineId?: string;
}

export interface ApTaxPreview {
  documentId: string;
  currency: string;
  netMinor: number;
  taxMinor: number;
  selfAssessedTaxMinor: number;
  blockedTaxMinor: number;
  roundingMinor: number;
  grossMinor: number;
  lines: ApTaxLinePreview[];
  errors: ApTaxNotice[];
  warnings: ApTaxNotice[];
}
