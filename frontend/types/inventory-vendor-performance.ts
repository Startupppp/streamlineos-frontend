import type { PurchaseOrderStatus } from "@/types/inventory";

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
