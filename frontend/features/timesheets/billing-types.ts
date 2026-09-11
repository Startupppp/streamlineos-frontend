/**
 * One row per (project, currency), not per project. A project billed in two
 * currencies arrives as two rows: the API will not sum across currencies, so
 * `billableAmount` is always money in exactly the `currency` beside it.
 */
export interface BillingGroup {
  projectId: number;
  projectName: string;
  totalHours: number;
  billableAmount: number;
  currency: string;
  entryCount: number;
  missingRate: boolean;
}

export interface BillingCurrencyTotal {
  currency: string;
  amount: number;
  hours: number;
}

export interface BillingConvertedTotals {
  baseCurrency: string;
  convertedTotal: number;
  conversions: {
    currency: string;
    amount: number;
    rate: number;
    rateDate: string | null;
    converted: number;
  }[];
  missingRates: string[];
}

export interface BillingUninvoiced {
  groups: BillingGroup[];
  totals: {
    hours: number;
    amount: number | null;
    currency: string | null;
    mixed: boolean;
    byCurrency: BillingCurrencyTotal[];
    converted?: BillingConvertedTotals | null;
  };
}

export interface BillingExportInput {
  startDate: string;
  endDate: string;
  format: "CSV" | "XLSX";
  projectId?: number;
  idempotencyKey?: string;
}

export interface InvoiceDraftInput {
  startDate: string;
  endDate: string;
  projectId?: number;
}
