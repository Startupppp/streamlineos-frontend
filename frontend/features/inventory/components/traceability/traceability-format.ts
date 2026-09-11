import { TXN_TYPE_CONFIG } from "@/features/inventory/components/stock-movements-columns";
import type {
  LotStockByLocation,
  TraceabilityChain,
  TraceabilityReturn,
} from "@/hooks/api/inventory/traceability-schema";

export interface LocationStockTotal {
  locationId: number;
  locationName: string;
  locationCode: string;
  warehouseName: string;
  onHand: number;
}

export function sumQuantities(values: readonly string[]): number {
  return values.reduce((total, value) => total + Number(value), 0);
}

export function totalStockByLocation(
  rows: readonly LotStockByLocation[],
): LocationStockTotal[] {
  const totals = new Map<number, LocationStockTotal>();
  for (const row of rows) {
    const current = totals.get(row.locationId);
    totals.set(row.locationId, {
      locationId: row.locationId,
      locationName: row.locationName,
      locationCode: row.locationCode,
      warehouseName: row.warehouseName,
      onHand: (current?.onHand ?? 0) + Number(row.onHand),
    });
  }
  return [...totals.values()];
}

export interface ShipmentTotal {
  shipmentId: number;
  shipmentNumber: string;
  status: string;
  shippedAt: string | null;
  quantity: number;
}

export function totalShipments(
  rows: TraceabilityChain["shipments"],
): ShipmentTotal[] {
  const totals = new Map<number, ShipmentTotal>();
  for (const row of rows) {
    const current = totals.get(row.shipmentId);
    totals.set(row.shipmentId, {
      shipmentId: row.shipmentId,
      shipmentNumber: row.shipmentNumber,
      status: row.status,
      shippedAt: row.shippedAt,
      quantity: (current?.quantity ?? 0) + Number(row.quantity),
    });
  }
  return [...totals.values()];
}

export interface ReturnTotal {
  key: string;
  returnNumber: string;
  kind: string;
  status: string;
  quantity: number;
}

function returnKind(row: TraceabilityReturn): string {
  return row.category === "vendor" ? "To vendor" : "From customer";
}

export function totalReturns(rows: TraceabilityChain["returns"]): ReturnTotal[] {
  const totals = new Map<string, ReturnTotal>();
  for (const row of rows) {
    const key = `${row.category}-${String(row.returnId)}`;
    const current = totals.get(key);
    totals.set(key, {
      key,
      returnNumber: row.returnNumber,
      kind: returnKind(row),
      status: row.status,
      quantity: (current?.quantity ?? 0) + Number(row.quantity),
    });
  }
  return [...totals.values()];
}

function humanizeCode(code: string): string {
  return code
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function statusLabel(status: string): string {
  return humanizeCode(status);
}

export function movementTypeLabel(transactionType: string): string {
  const known = Object.entries(TXN_TYPE_CONFIG).find(([type]) => type === transactionType);
  if (known) return known[1].label;
  return humanizeCode(transactionType);
}
