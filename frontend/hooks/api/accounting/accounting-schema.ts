import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

const journalLineContract = z.object({
  id: z.number(),
  entryId: z.number(),
  accountId: z.number(),
  debit: z.string().nullable(),
  credit: z.string().nullable(),
  description: z.string().nullable(),
  lineOrder: z.number().nullable(),
  accountCode: z.string(),
  accountName: z.string(),
});

const journalEntryRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  entryNumber: z.string(),
  entryDate: z.string(),
  postingDate: z.string().nullable(),
  description: z.string().nullable(),
  periodId: z.number().nullable(),
  currency: z.string(),
  sourceType: z.string(),
  sourceId: z.string().nullable(),
  sourceEvent: z.string().nullable(),
  status: z.string(),
  createdBy: z.string(),
  createdByMembershipId: z.number().nullable(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  postedBy: z.string().nullable(),
  postedAt: z.string().nullable(),
  reversedEntryId: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export const journalEntryListContract = cursorPageContract(journalEntryRowContract);

export const journalEntryDetailContract = journalEntryRowContract.extend({
  createdByName: z.string().nullable(),
  createdByEmail: z.string().nullable(),
  lines: z.array(journalLineContract),
});

export const reverseJournalEntryContract = z.object({
  id: z.number(),
  entryNumber: z.string(),
  created: z.boolean(),
});

export const createJournalEntryContract = z.object({
  id: z.number(),
  entryNumber: z.string(),
});

export const postJournalEntryContract = z.object({
  id: z.number(),
  entryNumber: z.string(),
  status: z.string(),
});

const trialBalanceRowContract = z.object({
  accountId: z.number(),
  code: z.string(),
  name: z.string(),
  accountType: z.string(),
  debit: z.string(),
  credit: z.string(),
  balance: z.string(),
});

export const trialBalanceContract = z.object({
  asOf: z.string(),
  rows: z.array(trialBalanceRowContract),
  totalDebit: z.string(),
  totalCredit: z.string(),
  balanced: z.boolean(),
});

const plRowContract = z.object({
  accountId: z.number(),
  code: z.string(),
  name: z.string(),
  accountType: z.string(),
  amount: z.string(),
});

export const profitLossContract = z.object({
  from: z.string(),
  to: z.string(),
  income: z.array(plRowContract),
  expense: z.array(plRowContract),
  totalIncome: z.string(),
  totalExpense: z.string(),
  netIncome: z.string(),
});

const cashFlowItemContract = z.object({
  label: z.string(),
  amount: z.string(),
});

const cashFlowSectionContract = z.object({
  key: z.string(),
  label: z.string(),
  items: z.array(cashFlowItemContract),
  total: z.string(),
});

export const cashFlowContract = z.object({
  from: z.string(),
  to: z.string(),
  openingCash: z.string(),
  closingCash: z.string(),
  netChange: z.string(),
  reconciled: z.boolean(),
  sections: z.array(cashFlowSectionContract),
});

export const customerListContract = cursorPageContract(
  z.object({
    clientId: z.number(),
    clientName: z.string().nullable(),
    state: z.string().nullable(),
    gstin: z.string().nullable(),
    invoiceCount: z.number(),
    outstanding: z.string(),
  }),
);

const customerLedgerLineContract = z.object({
  date: z.string(),
  entryId: z.number(),
  entryNumber: z.string(),
  sourceType: z.string(),
  sourceEvent: z.string().nullable(),
  description: z.string().nullable(),
  invoiceId: z.number().nullable(),
  invoiceNumber: z.string().nullable(),
  debit: z.string(),
  credit: z.string(),
  runningBalance: z.string(),
});

export const customerLedgerContract = z.object({
  summary: z.object({
    clientId: z.number(),
    clientName: z.string().nullable(),
    state: z.string().nullable(),
    gstin: z.string().nullable(),
    totalInvoiced: z.string(),
    totalPaid: z.string(),
    outstanding: z.string(),
  }),
  lines: z.array(customerLedgerLineContract),
});

const gstr1RateBucketContract = z.object({
  gstRate: z.string(),
  taxableValue: z.string(),
  cgst: z.string(),
  sgst: z.string(),
  igst: z.string(),
  invoiceCount: z.number(),
});

const gstr1PlaceBucketContract = z.object({
  placeOfSupply: z.string().nullable(),
  placeName: z.string().nullable(),
  rates: z.array(gstr1RateBucketContract),
});

const gstr1SectionContract = z.object({
  section: z.enum(["B2B", "B2C"]),
  places: z.array(gstr1PlaceBucketContract),
  totalTaxableValue: z.string(),
  totalCgst: z.string(),
  totalSgst: z.string(),
  totalIgst: z.string(),
  totalInvoices: z.number(),
});

export const gstr1Contract = z.object({
  from: z.string(),
  to: z.string(),
  b2b: gstr1SectionContract,
  b2c: gstr1SectionContract,
  grandTotal: z.object({
    taxableValue: z.string(),
    cgst: z.string(),
    sgst: z.string(),
    igst: z.string(),
    invoices: z.number(),
  }),
});

const balanceSheetRowContract = z.object({
  accountId: z.number(),
  code: z.string(),
  name: z.string(),
  accountType: z.string(),
  balance: z.string(),
});

export const balanceSheetContract = z.object({
  asOf: z.string(),
  assets: z.array(balanceSheetRowContract),
  liabilities: z.array(balanceSheetRowContract),
  equity: z.array(balanceSheetRowContract),
  retainedEarnings: z.string(),
  totalAssets: z.string(),
  totalLiabilities: z.string(),
  totalEquity: z.string(),
  balanced: z.boolean(),
});

const agingBucketsContract = z.object({
  current: z.string(),
  d1_30: z.string(),
  d31_60: z.string(),
  d61_90: z.string(),
  d91_plus: z.string(),
  total: z.string(),
});

export const agedReceivablesContract = z.object({
  asOf: z.string(),
  rows: z.array(agingBucketsContract.extend({ clientId: z.number(), clientName: z.string() })),
  totals: agingBucketsContract,
});

const billBaseContract = z.object({
  id: z.number(),
  orgId: z.string(),
  vendorId: z.number().nullable(),
  billNumber: z.string(),
  vendorBillNumber: z.string().nullable(),
  billDate: z.string(),
  dueDate: z.string().nullable(),
  status: z.string(),
  subtotal: z.string(),
  taxAmount: z.string(),
  cgstAmount: z.string(),
  sgstAmount: z.string(),
  igstAmount: z.string(),
  discount: z.string(),
  total: z.string(),
  amountPaid: z.string(),
  currency: z.string(),
  placeOfSupply: z.string().nullable(),
  vendorGstin: z.string().nullable(),
  supplierGstin: z.string().nullable(),
  reverseCharge: z.boolean(),
  notes: z.string().nullable(),
  expenseAccountCode: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const billRowContract = billBaseContract.extend({ vendorName: z.string().nullable() });

export const purchaseBillListContract = cursorPageContract(billRowContract);

const billItemContract = z.object({
  id: z.number(),
  billId: z.number(),
  description: z.string(),
  hsnSacCode: z.string().nullable(),
  quantity: z.string(),
  rate: z.string(),
  gstRate: z.string(),
  amount: z.string(),
  lineOrder: z.number(),
});

export const purchaseBillDetailContract = billRowContract.extend({
  items: z.array(billItemContract),
});

export const purchaseBillCreatedContract = billBaseContract.extend({
  createdByMembershipId: z.number().nullable(),
  exchangeRate: z.string(),
  approvedBy: z.string().nullable(),
  approvedByMembershipId: z.number().nullable(),
  approvedAt: z.string().nullable(),
  recurringTemplateId: z.number().nullable(),
});

export const billStatusUpdateContract = z.object({
  id: z.number(),
  status: z.string(),
});

const taxBlockContract = z.object({
  taxableValue: z.string(),
  cgst: z.string(),
  sgst: z.string(),
  igst: z.string(),
});

const gstr3bItcContract = z.object({
  available: taxBlockContract,
  reversed: taxBlockContract,
  net: taxBlockContract,
});

export const gstr3bContract = z.object({
  from: z.string(),
  to: z.string(),
  outward: z.object({
    taxable: taxBlockContract,
    zeroRated: taxBlockContract,
    nilExempted: taxBlockContract,
    reverseCharge: taxBlockContract,
  }),
  itc: gstr3bItcContract,
  netTaxPayable: z.object({ cgst: z.string(), sgst: z.string(), igst: z.string(), total: z.string() }),
  invoiceCount: z.number(),
  billCount: z.number(),
});

export const vendorListContract = cursorPageContract(
  z.object({
    vendorId: z.number(),
    vendorName: z.string().nullable(),
    state: z.string().nullable(),
    gstin: z.string().nullable(),
    billCount: z.number(),
    outstanding: z.string(),
  }),
);

const vendorLedgerLineContract = z.object({
  date: z.string(),
  entryId: z.number(),
  entryNumber: z.string(),
  sourceType: z.string(),
  sourceEvent: z.string().nullable(),
  description: z.string().nullable(),
  billId: z.number().nullable(),
  billNumber: z.string().nullable(),
  debit: z.string(),
  credit: z.string(),
  runningBalance: z.string(),
});

export const vendorLedgerContract = z.object({
  summary: z.object({
    vendorId: z.number(),
    vendorName: z.string(),
    state: z.string().nullable(),
    gstin: z.string().nullable(),
    totalBilled: z.string(),
    totalPaid: z.string(),
    outstanding: z.string(),
  }),
  lines: z.array(vendorLedgerLineContract),
});

export const agedPayablesContract = z.object({
  asOf: z.string(),
  rows: z.array(agingBucketsContract.extend({ vendorId: z.number(), vendorName: z.string() })),
  totals: agingBucketsContract,
});

export const billPaymentCreatedContract = z.object({
  id: z.number(),
  orgId: z.string(),
  billId: z.number(),
  amount: z.string(),
  paymentDate: z.string(),
  paymentMethod: z.string(),
  referenceNumber: z.string().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  createdByMembershipId: z.number().nullable(),
});

export type JournalEntryList = z.infer<typeof journalEntryListContract>;
export type JournalEntryDetail = z.infer<typeof journalEntryDetailContract>;
export type TrialBalance = z.infer<typeof trialBalanceContract>;
export type ProfitLoss = z.infer<typeof profitLossContract>;
export type CashFlow = z.infer<typeof cashFlowContract>;
export type Gstr1 = z.infer<typeof gstr1Contract>;
export type Gstr3b = z.infer<typeof gstr3bContract>;
export type BalanceSheet = z.infer<typeof balanceSheetContract>;
export type AgedReceivables = z.infer<typeof agedReceivablesContract>;
export type AgedPayables = z.infer<typeof agedPayablesContract>;
export type PurchaseBillList = z.infer<typeof purchaseBillListContract>;
export type PurchaseBillDetail = z.infer<typeof purchaseBillDetailContract>;
