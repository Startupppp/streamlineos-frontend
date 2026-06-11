export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

export interface Account {
  id: number;
  orgId: string;
  code: string;
  name: string;
  accountType: AccountType;
  parentAccountId: number | null;
  isActive: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalLine {
  id: number;
  entryId: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  debit: string;
  credit: string;
  description: string | null;
  lineOrder: number;
}

export type JournalEntryStatus = "DRAFT" | "POSTED" | "VOID";

export interface JournalEntry {
  id: number;
  orgId: string;
  entryNumber: string;
  entryDate: string;
  description: string | null;
  sourceType: string;
  sourceId: string | null;
  sourceEvent: string | null;
  status: JournalEntryStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lines?: JournalLine[];
}

export interface TrialBalanceRow {
  accountId: number;
  code: string;
  name: string;
  accountType: AccountType;
  debit: string;
  credit: string;
  balance: string;
}

export interface ProfitLossRow {
  accountId: number;
  code: string;
  name: string;
  accountType: "INCOME" | "EXPENSE";
  amount: string;
}

export interface ProfitLossReport {
  from: string;
  to: string;
  income: ProfitLossRow[];
  expense: ProfitLossRow[];
  totalIncome: string;
  totalExpense: string;
  netIncome: string;
}

export interface CustomerLedgerLine {
  date: string;
  entryId: number;
  entryNumber: string;
  sourceType: string;
  sourceEvent: string | null;
  description: string | null;
  invoiceId: number | null;
  invoiceNumber: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface CustomerLedgerSummary {
  clientId: number;
  clientName: string;
  state: string | null;
  gstin: string | null;
  totalInvoiced: string;
  totalPaid: string;
  outstanding: string;
}

export interface CustomerLedger {
  summary: CustomerLedgerSummary;
  lines: CustomerLedgerLine[];
}

export interface CustomerOutstanding {
  clientId: number;
  clientName: string;
  state: string | null;
  gstin: string | null;
  invoiceCount: number;
  outstanding: string;
}

export type Gstr1Section = "B2B" | "B2C";

export interface Gstr1RateBucket {
  gstRate: string;
  taxableValue: string;
  cgst: string;
  sgst: string;
  igst: string;
  invoiceCount: number;
}

export interface Gstr1PlaceBucket {
  placeOfSupply: string | null;
  placeName: string | null;
  rates: Gstr1RateBucket[];
}

export interface Gstr1Section1 {
  section: Gstr1Section;
  places: Gstr1PlaceBucket[];
  totalTaxableValue: string;
  totalCgst: string;
  totalSgst: string;
  totalIgst: string;
  totalInvoices: number;
}

export interface Gstr1Report {
  from: string;
  to: string;
  b2b: Gstr1Section1;
  b2c: Gstr1Section1;
  grandTotal: {
    taxableValue: string;
    cgst: string;
    sgst: string;
    igst: string;
    invoices: number;
  };
}

export interface BalanceSheetRow {
  accountId: number;
  code: string;
  name: string;
  accountType: AccountType;
  balance: string;
}

export interface BalanceSheetReport {
  asOf: string;
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
  retainedEarnings: string;
  balanced: boolean;
}

export type AgingBucket = "current" | "d1_30" | "d31_60" | "d61_90" | "d91_plus";

export interface AgedReceivablesRow {
  clientId: number;
  clientName: string;
  current: string;
  d1_30: string;
  d31_60: string;
  d61_90: string;
  d91_plus: string;
  total: string;
}

export interface AgedReceivablesReport {
  asOf: string;
  rows: AgedReceivablesRow[];
  totals: {
    current: string;
    d1_30: string;
    d31_60: string;
    d61_90: string;
    d91_plus: string;
    total: string;
  };
}

export type PurchaseBillStatus = "DRAFT" | "POSTED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";

export interface PurchaseBillItem {
  id: number;
  billId: number;
  description: string;
  hsnSacCode: string | null;
  quantity: string;
  rate: string;
  gstRate: string;
  amount: string;
  lineOrder: number;
}

export interface PurchaseBillSummary {
  id: number;
  orgId: string;
  vendorId: number | null;
  vendorName: string | null;
  billNumber: string;
  vendorBillNumber: string | null;
  billDate: string;
  dueDate: string | null;
  status: PurchaseBillStatus;
  subtotal: string;
  taxAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  discount: string;
  total: string;
  amountPaid: string;
  currency: string;
  placeOfSupply: string | null;
  vendorGstin: string | null;
  supplierGstin: string | null;
  reverseCharge: boolean;
  notes: string | null;
  expenseAccountCode: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseBill extends PurchaseBillSummary {
  items: PurchaseBillItem[];
}

export interface Gstr3BTaxBlock {
  taxableValue: string;
  cgst: string;
  sgst: string;
  igst: string;
}

export interface Gstr3BReport {
  from: string;
  to: string;
  outward: {
    taxable: Gstr3BTaxBlock;
    zeroRated: Gstr3BTaxBlock;
    nilExempted: Gstr3BTaxBlock;
    reverseCharge: Gstr3BTaxBlock;
  };
  itc: {
    available: Gstr3BTaxBlock;
    reversed: Gstr3BTaxBlock;
    net: Gstr3BTaxBlock;
  };
  netTaxPayable: {
    cgst: string;
    sgst: string;
    igst: string;
    total: string;
  };
  invoiceCount: number;
  billCount: number;
}

export interface AgedPayablesRow {
  vendorId: number;
  vendorName: string;
  current: string;
  d1_30: string;
  d31_60: string;
  d61_90: string;
  d91_plus: string;
  total: string;
}

export interface AgedPayablesReport {
  asOf: string;
  rows: AgedPayablesRow[];
  totals: {
    current: string;
    d1_30: string;
    d31_60: string;
    d61_90: string;
    d91_plus: string;
    total: string;
  };
}

export interface VendorLedgerLine {
  date: string;
  entryId: number;
  entryNumber: string;
  sourceType: string;
  sourceEvent: string | null;
  description: string | null;
  billId: number | null;
  billNumber: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface VendorLedgerSummary {
  vendorId: number;
  vendorName: string;
  state: string | null;
  gstin: string | null;
  totalBilled: string;
  totalPaid: string;
  outstanding: string;
}

export interface VendorLedger {
  summary: VendorLedgerSummary;
  lines: VendorLedgerLine[];
}

export interface VendorOutstanding {
  vendorId: number;
  vendorName: string;
  state: string | null;
  gstin: string | null;
  billCount: number;
  outstanding: string;
}
