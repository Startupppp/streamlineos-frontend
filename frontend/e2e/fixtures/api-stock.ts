import type { ApiOracle } from "./api-oracle";

/**
 * One row of `/inventory/stock`, measured off the live endpoint.
 *
 * camelCase and NESTED — the variant and the bin arrive as objects, not as
 * `*_id` scalars. Note what is absent: the row's lot, serial, handling unit and
 * ownership are NOT projected, even though they are part of
 * `inv_stock_levels`' key. That is why `onHandFor` below cannot name a grain.
 */
export interface StockGrain {
  id: number;
  onHand: string;
  /** Held by a reservation. */
  committed: string;
  available: string;
  productVariant: { id: number; sku: string } | null;
  location: { id: number; name: string } | null;
}

/**
 * On-hand at one (variant, location), which is NOT a unique grain.
 *
 * `inv_stock_levels` is keyed wider than variant and location — lot, serial,
 * handling unit and ownership complete it — so one bin legitimately holds several
 * rows for the same SKU, and the seeded capacity tenant has exactly that: two
 * rows for variant 382 in "Free bin". The projection returns none of those four
 * columns, so the grain a given ledger movement belongs to is not addressable
 * from here.
 *
 * `items[0]` is therefore the most-recently-updated row (the list is ordered
 * `updatedAt DESC`), which right after a write is the row that was written. That
 * holds for a spec asserting its own write and is worth knowing the edge of: in a
 * tenant another suite is writing to concurrently, the newest row may be theirs,
 * and this then compares one movement's balance against a different grain's.
 */
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
  /** Total units the bin may hold. `null` means unlimited. */
  capacity: string | null;
}

export interface PutTarget {
  warehouseName: string;
  locationName: string;
  locationId: number;
}

/**
 * A warehouse and bin that can actually accept `qty` more units.
 *
 * Not "the first one in the list", which is how this spec first failed: bins
 * carry a `capacity` and the backend rejects an over-fill with
 * `LOCATION_CAPACITY_EXCEEDED`. A tenant seeded by other suites is full of
 * deliberately adversarial bins — the first one here is a capacity probe capped
 * at 100 and already holding exactly 100 — so a spec that takes whatever comes
 * first is testing the fixture's ordering, and fails on a business rule that
 * has nothing to do with the flow under test.
 *
 * Names, not ids, because the UI's comboboxes are driven by their visible
 * labels and those labels are the warehouse and location names.
 */
export async function findLocationWithHeadroom(
  api: ApiOracle,
  qty: number,
): Promise<PutTarget> {
  const warehouses = await api.get<Warehouse[]>("/inventory/warehouses");
  const tried: string[] = [];

  for (const warehouse of warehouses.filter((w) => w.isActive)) {
    const locations = await api.get<WarehouseLocation[]>(
      `/inventory/warehouses/${warehouse.id}/locations`,
    );

    for (const location of locations.filter((l) => l.isActive && l.locationType === "BIN")) {
      if (location.capacity === null) {
        return { warehouseName: warehouse.name, locationName: location.name, locationId: location.id };
      }

      // A capped bin still qualifies if the whole bin — every variant and lot
      // in it, which is what the cap counts — leaves room for `qty`.
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

/**
 * Everything currently in a bin, across every variant, lot and grain — which is
 * what a bin's `capacity` is counted against.
 *
 * Summing the wrong field name returned `NaN`, and `capacity - NaN >= qty` is
 * false, so `findLocationWithHeadroom` rejected every capped bin and fell through
 * to an uncapped one. It reached a usable bin anyway, which is exactly why it went
 * unnoticed: broken arithmetic producing the right answer.
 */
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
  /**
   * What the movement was posted FOR — `inv_grn`, `inv_stock_transfer`, and so
   * on, with the document's own id. It is what turns "a receipt-shaped row
   * exists" into "THIS receipt's row exists", which matters in a tenant several
   * suites are writing to.
   */
  referenceType: string | null;
  referenceId: string | null;
}

/** The most recent ledger rows for a grain, newest first. */
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

/**
 * The movement a named document posted at a named bin.
 *
 * Addressed by `referenceId` rather than by "the newest row of the right type",
 * which is the assertion that quietly passes on somebody else's write: this
 * tenant is shared, the adjust spec posts to the same variant, and "an
 * ADJUSTMENT_IN exists" was already true before the click.
 */
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

/** How the ledger rows read, for a failure message somebody can act on. */
export function describeLedger(ledger: LedgerEntry[]): string {
  return JSON.stringify(
    ledger.map((r) => [r.transactionType, r.locationId, r.quantityChange, r.referenceType, r.referenceId]),
  );
}
