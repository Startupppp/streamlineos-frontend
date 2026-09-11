import { z } from "zod";

/**
 * Accounting statement reports. Every amount is a server-side `.toFixed(2)`
 * string, never a number — the aggregate is a `decimal` the driver hands back
 * as a string and the service formats rather than parses.
 *
 * `netPayable` can be negative, so it is not a non-negative decimal.
 */

export const expenseByCategoryRowContract = z.object({
  categoryId: z.number().nullable(),
  categoryName: z.string(),
  totalAmount: z.string(),
  count: z.number(),
});

export const expenseByCategoryContract = z.array(expenseByCategoryRowContract);

export const taxSummaryRowContract = z.object({
  month: z.string(),
  outputCgst: z.string(),
  outputSgst: z.string(),
  outputIgst: z.string(),
  inputCgst: z.string(),
  inputSgst: z.string(),
  inputIgst: z.string(),
  netPayable: z.string(),
});

export const taxSummaryContract = z.array(taxSummaryRowContract);

export type ExpenseByCategoryRow = z.infer<typeof expenseByCategoryRowContract>;
export type TaxSummaryRow = z.infer<typeof taxSummaryRowContract>;

const reportCatalogItemContract = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  endpoint: z.string(),
  params: z.array(z.string()),
  category: z.string(),
  exportable: z.boolean(),
});
export const reportCatalogContract = z.array(reportCatalogItemContract);

const statementLineContract = z.object({
  date: z.string(),
  docType: z.string(),
  docNumber: z.string(),
  debit: z.string(),
  credit: z.string(),
  runningBalance: z.string(),
});

export const customerStatementContract = z.object({
  client: z.object({ id: z.number(), name: z.string() }),
  openingBalance: z.string(),
  lines: z.array(statementLineContract),
  closingBalance: z.string(),
});

export const vendorStatementContract = z.object({
  vendor: z.object({ id: z.number(), name: z.string() }),
  openingBalance: z.string(),
  lines: z.array(statementLineContract),
  closingBalance: z.string(),
});

export const salesByCustomerContract = z.array(z.object({
  clientId: z.number().nullable(),
  clientName: z.string(),
  invoiceCount: z.number(),
  totalBilled: z.string(),
  totalPaid: z.string(),
  outstanding: z.string(),
}));

export const salesByItemContract = z.array(z.object({
  description: z.string().nullable(),
  totalQuantity: z.string(),
  totalAmount: z.string(),
  invoiceCount: z.number(),
}));

export const projectProfitabilityContract = z.array(z.object({
  projectId: z.number(),
  projectName: z.string(),
  revenue: z.string(),
  cost: z.string(),
  margin: z.string(),
  marginPct: z.string(),
}));

export const departmentProfitabilityContract = z.array(z.object({
  departmentId: z.number().nullable(),
  departmentName: z.string(),
  revenue: z.string(),
  cost: z.string(),
  margin: z.string(),
  marginPct: z.string(),
}));

export const workingCapitalContract = z.object({
  asOf: z.string(),
  currentAssets: z.string(),
  currentLiabilities: z.string(),
  workingCapital: z.string(),
  ratio: z.string().nullable(),
});

export const burnRateContract = z.object({
  months: z.array(z.object({ month: z.string(), netOutflow: z.string() })),
  averageBurnRate: z.string(),
});

export const cashRunwayContract = z.object({
  cashBalance: z.string(),
  averageBurnRate: z.string(),
  runwayMonths: z.number().nullable(),
  projectedMonths: z.array(z.object({ month: z.string(), projectedBalance: z.string() })),
});

const taxGlRoleContract = z.enum([
  "output_payable",
  "input_recoverable",
  "reverse_charge_output",
  "reverse_charge_input",
  "blocked_input",
  "withheld",
]);

const taxSummaryCurrencyTotalsContract = z.object({
  currency: z.string(),
  taxableMinor: z.number(),
  taxMinor: z.number(),
  outputTaxMinor: z.number(),
  recoverableInputTaxMinor: z.number(),
  blockedInputTaxMinor: z.number(),
  withheldTaxMinor: z.number(),
  netPayableMinor: z.number(),
});

export const taxSummaryReportContract = z.object({
  reportKey: z.literal("tax_summary"),
  title: z.string(),
  labelMode: z.enum(["founder", "accountant"]),
  bookId: z.string(),
  currency: z.string(),
  from: z.string(),
  to: z.string(),
  rows: z.array(
    z.object({
      glRole: taxGlRoleContract,
      glRoleLabel: z.string(),
      component: z.string(),
      jurisdiction: z.string(),
      rateBp: z.number(),
      currency: z.string(),
      taxableMinor: z.number(),
      taxMinor: z.number(),
      documentCount: z.number(),
    }),
  ),
  byRole: z.array(
    z.object({
      glRole: taxGlRoleContract,
      label: z.string(),
      taxableMinor: z.number(),
      taxMinor: z.number(),
    }),
  ),
  byComponent: z.array(
    z.object({ component: z.string(), taxableMinor: z.number(), taxMinor: z.number() }),
  ),
  byCurrency: z.array(taxSummaryCurrencyTotalsContract),
  totals: taxSummaryCurrencyTotalsContract,
  notes: z.array(z.string()),
});
