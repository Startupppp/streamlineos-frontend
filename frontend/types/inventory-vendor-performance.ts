import type { PurchaseOrderStatus } from "@/types/inventory";

/**
 * C4. A supplier rate never travels without the sample it rests on.
 *
 * `percent` is a decimal string the backend already rounded, and null when the
 * denominator was zero — "nothing to measure" and "zero percent" are opposite
 * claims about a vendor, and rendering both as 0.0% says the worst supplier on
 * the list is flawless.
 */
export interface ScorecardRate {
  percent: string | null;
  numerator: string;
  denominator: string;
  sampleSize: number;
  sufficient: boolean;
}

export interface VendorScorecard {
  vendorId: number;
  leadTime: {
    observations: number;
    meanDays: number;
    stdDevDays: number;
    p50Days: number;
    p90Days: number;
    reliable: boolean;
    note?: string;
  };
  onTime: ScorecardRate;
  lineFill: ScorecardRate;
  unitFill: ScorecardRate;
  returns: ScorecardRate;
  rejection: ScorecardRate;
  discrepancy: ScorecardRate;
  openPoCount: number;
  spend: {
    amount: string;
    currency: string;
    excludedCurrencies: string[];
  };
  notes: string[];
}

/** One purchase order behind the rates, with the receipts that settled it. */
export interface VendorDelivery {
  poId: number;
  poNumber: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryDate: string | null;
  firstReceiptDate: string | null;
  daysToReceive: number | null;
  onTime: boolean | null;
  orderedQty: string;
  receivedQty: string;
  lines: number;
  linesInFull: number;
  receiptCount: number;
  receiptIds: number[];
  total: string;
  currency: string;
}

export interface VendorDeliveriesResponse {
  items: VendorDelivery[];
  total: number;
  page: number;
  totalPages: number;
}
