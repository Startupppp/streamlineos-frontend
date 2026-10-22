import type { ApiOracle } from "./api-oracle";

export interface StockGrain {
  id: number;
  onHand: string;
  committed: string;
  available: string;
  productVariant: { id: number; sku: string } | null;
  location: { id: number; name: string } | null;
}

export async function onHandFor(
  api: ApiOracle,
  variantId: number,
  locationId: number,
): Promise<number> {
  const res = await api.get<{ items: StockGrain[] }>("/inventory/stock", {
    variantId,
    locationId,
    page: 1,
    limit: 50,
  });
  const row = res.items?.[0];
  return row ? Number(row.onHand) : 0;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}

export interface WarehouseLocation {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  locationType: string;
  capacity: string | null;
}

export interface PutTarget {
  warehouseName: string;
  locationName: string;
  locationId: number;
}

export async function findLocationWithHeadroom(
  api: ApiOracle,
  qty: number,
): Promise<PutTarget> {
  const warehouses = await api.get<{ items: Warehouse[] }>("/inventory/warehouses");
  const tried: string[] = [];

  for (const warehouse of warehouses.items.filter((w) => w.isActive)) {
    const locations = await api.get<WarehouseLocation[]>(
      `/inventory/warehouses/${warehouse.id}/locations`,
    );

    for (const location of locations.filter((l) => l.isActive && l.locationType === "BIN")) {
      if (location.capacity === null) {
        return { warehouseName: warehouse.name, locationName: location.name, locationId: location.id };
      }

      const held = await binOccupancy(api, location.id);
      if (Number(location.capacity) - held >= qty) {
        return { warehouseName: warehouse.name, locationName: location.name, locationId: location.id };
      }
      tried.push(`${location.name}(${held}/${location.capacity})`);
    }
  }

  throw new Error(
    `No active bin can accept ${qty} more units. Tried: ${tried.join(", ") || "(none)"}. ` +
      `Seed a bin with spare capacity, or lower the quantity under test.`,
  );
}

export async function binOccupancy(api: ApiOracle, locationId: number): Promise<number> {
  const res = await api.get<{ items: StockGrain[] }>("/inventory/stock", {
    locationId,
    page: 1,
    limit: 200,
  });
  return (res.items ?? []).reduce((sum, row) => sum + Number(row.onHand), 0);
}

export interface LedgerEntry {
  id: number;
  transactionType: string;
  quantityChange: string;
  quantityBefore: string;
  quantityAfter: string;
  productVariantId: number;
  locationId: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
}

export async function recentLedger(
  api: ApiOracle,
  variantId: number,
  limit = 5,
): Promise<LedgerEntry[]> {
  const res = await api.get<{ items: LedgerEntry[] }>("/inventory/stock/transactions", {
    productVariantId: variantId,
    page: 1,
    limit,
  });
  return res.items ?? [];
}

export function movementFor(
  ledger: LedgerEntry[],
  match: { referenceType: string; referenceId: number; locationId: number; transactionType: string },
): LedgerEntry | undefined {
  return ledger.find(
    (row) =>
      row.referenceType === match.referenceType &&
      row.referenceId === String(match.referenceId) &&
      row.locationId === match.locationId &&
      row.transactionType === match.transactionType,
  );
}

export function describeLedger(ledger: LedgerEntry[]): string {
  return JSON.stringify(
    ledger.map((r) => [r.transactionType, r.locationId, r.quantityChange, r.referenceType, r.referenceId]),
  );
}
