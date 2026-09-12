import type { ApiOracle } from "./api-oracle";
import type { StockGrain, Warehouse, WarehouseLocation } from "./api-stock";

const ISO_DATE_LENGTH = 10;

export function today(): string {
  return new Date().toISOString().slice(0, ISO_DATE_LENGTH);
}

/** Unique enough per run to keep vendor codes from colliding. */
function stamp(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
}

export interface SeedTarget {
  warehouseId: number;
  warehouseName: string;
  /** A receivable bin with room for the quantity under test. */
  bin: WarehouseLocation;
  variantId: number;
  variantSku: string;
  /**
   * What a picker's trigger shows once this variant is chosen. The option row
   * carries the SKU as its sublabel and the PRODUCT name as its label, so the
   * string used to find an option and the string used to confirm the choice are
   * necessarily different ones.
   */
  variantProductName: string;
}

interface VariantRow {
  id: number;
  sku: string;
  productName: string;
}

/**
 * Where to receive, decided on measured headroom rather than list order.
 *
 * Bins carry a capacity and the backend refuses an over-fill outright. The
 * first bin in this tenant is a capacity probe already holding exactly its cap,
 * so "take the first one" fails on a business rule that has nothing to do with
 * receiving — and the failure names a capacity error, which reads as a product
 * bug rather than as a fixture that chose badly.
 *
 * A CAPPED bin is preferred over the uncapped one deliberately: receiving into
 * the only unlimited bin leaves the putaway suggester with nowhere that fits,
 * and the resulting task has a line with no destination.
 */
/**
 * The dock these specs receive onto, created once and reused.
 *
 * The tenant's own bins are capped at 100 and deliberately adversarial — one is
 * a capacity probe already holding exactly its cap. Every run of this suite
 * receives more units, so a fixture that hunts for spare room in them works
 * until it does not: measured, two of the three capped bins reached 100/100
 * within a dozen runs and seeding then failed with a capacity error that reads
 * like a product bug.
 *
 * So the suite brings its own bin. Capped rather than unlimited, because the
 * putaway suggester never sends goods back to the bin they are standing in and
 * needs somewhere else that fits — receiving onto the tenant's only uncapped bin
 * leaves a putaway line with no destination.
 */
const E2E_DOCK_CODE = "E2E-DOCK";
const E2E_DOCK_NAME = "E2E receiving dock";
/** Large enough that no realistic number of runs fills it. */
const E2E_DOCK_CAPACITY = "1000000";

export async function seedTarget(api: ApiOracle, qty: number): Promise<SeedTarget> {
  const warehouses = await api.get<{ items: Warehouse[] }>("/inventory/warehouses");
  const variants = await api.get<{ items: VariantRow[] }>("/inventory/products/variants", {
    page: 1,
    limit: 10,
  });
  const variant = variants.items?.[0];
  if (!variant) throw new Error("This tenant has no product variant to receive.");

  const warehouse = warehouses.items.find((w) => w.isActive);
  if (!warehouse) throw new Error("This tenant has no active warehouse.");

  const locations = await api.get<WarehouseLocation[]>(
    `/inventory/warehouses/${warehouse.id}/locations`,
  );
  const bin = (await dock(api, warehouse.id, locations)) ?? null;
  if (bin === null) {
    throw new Error(
      `Could not resolve a receiving bin in warehouse ${warehouse.id} for ${qty} units.`,
    );
  }

  const held = (await heldPerBin(api, warehouse.id)).get(bin.id) ?? 0;
  if (bin.capacity !== null && Number(bin.capacity) - held < qty) {
    throw new Error(
      `${bin.name} holds ${held} of ${bin.capacity} and cannot take ${qty} more units.`,
    );
  }

  return {
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    bin,
    variantId: variant.id,
    variantSku: variant.sku,
    variantProductName: variant.productName,
  };
}

/** The suite's own dock, made on first use and found by its code afterwards. */
async function dock(
  api: ApiOracle,
  warehouseId: number,
  locations: WarehouseLocation[],
): Promise<WarehouseLocation | undefined> {
  const existing = locations.find((l) => l.code === E2E_DOCK_CODE && l.isActive);
  if (existing) return existing;

  await api.post(`/inventory/warehouses/${warehouseId}/locations`, {
    name: E2E_DOCK_NAME,
    code: E2E_DOCK_CODE,
    locationType: "BIN",
    isReceivable: true,
    isPickable: true,
    isSellable: true,
    capacity: E2E_DOCK_CAPACITY,
    isActive: true,
  });

  const refreshed = await api.get<WarehouseLocation[]>(
    `/inventory/warehouses/${warehouseId}/locations`,
  );
  return refreshed.find((l) => l.code === E2E_DOCK_CODE);
}

/**
 * What every bin in a warehouse is holding, in one query per page.
 *
 * One call for the building rather than one per bin, and the difference is not
 * cosmetic: this machine runs several backends against one shared cache, a
 * single list read has been measured at ten seconds, and a per-bin loop spent
 * the whole setup budget before a browser was ever opened. Grouping is free
 * here — the projection already names the bin on each row.
 */
async function heldPerBin(api: ApiOracle, warehouseId: number): Promise<Map<number, number>> {
  const held = new Map<number, number>();
  // The list endpoint caps `limit` at 100 and refuses more, so pages are walked
  // rather than asked for in one go.
  for (let page = 1; page <= 20; page += 1) {
    const res = await api.get<{ items: StockGrain[]; totalPages: number }>("/inventory/stock", {
      warehouseId,
      page,
      limit: 100,
    });
    for (const row of res.items ?? []) {
      const binId = row.location?.id;
      if (binId === undefined) continue;
      held.set(binId, (held.get(binId) ?? 0) + Number(row.onHand));
    }
    if (page >= (res.totalPages ?? 1)) break;
  }
  return held;
}

/**
 * Every active bin in a warehouse that can take `qty` more units, measured.
 *
 * A capacity is a number on a row; what a bin can accept is that number minus
 * everything already in it, across every variant and lot, which is what the cap
 * counts. Reading only the column is how a spec ends up moving stock into a bin
 * that is already exactly full and failing on `LOCATION_CAPACITY_EXCEEDED`.
 */
export async function binsWithHeadroom(
  api: ApiOracle,
  warehouseId: number,
  qty: number,
  exclude: number[] = [],
): Promise<WarehouseLocation[]> {
  const locations = await api.get<WarehouseLocation[]>(
    `/inventory/warehouses/${warehouseId}/locations`,
  );
  const held = await heldPerBin(api, warehouseId);
  return locations.filter((bin) => {
    if (!bin.isActive || bin.locationType !== "BIN") return false;
    if (exclude.includes(bin.id)) return false;
    if (bin.capacity === null) return true;
    return Number(bin.capacity) - (held.get(bin.id) ?? 0) >= qty;
  });
}

export interface PurchaseOrderRow {
  id: number;
  poNumber: string;
  status: string;
  lines: Array<{ id: number; productVariantId: number; quantity: string }>;
}

/**
 * A purchase order that can be received against — created, approved where the
 * organisation requires it, and sent.
 *
 * The approval step is attempted and its one specific refusal is swallowed.
 * This organisation has PO approval switched off and the endpoint SAYS so
 * rather than quietly succeeding; ignoring only that message keeps the helper
 * correct on an organisation where approval is required, instead of silently
 * skipping a step that matters there.
 */
export async function sentPurchaseOrder(
  api: ApiOracle,
  target: SeedTarget,
  qty: number,
  note: string,
): Promise<PurchaseOrderRow> {
  const vendor = await api.post<{ id: number }>("/inventory/vendors", {
    name: `E2E supplier ${stamp()}`,
    code: `E2E${stamp()}`.slice(0, 20),
    leadTimeDays: 3,
    currency: "INR",
  });

  const created = await api.post<{ id: number }>("/inventory/purchase-orders", {
    vendorId: vendor.id,
    orderDate: today(),
    warehouseId: target.warehouseId,
    currency: "INR",
    notes: note,
    lines: [
      {
        productVariantId: target.variantId,
        quantity: qty,
        unitCost: "1.0000",
        taxRate: "0",
        lineOrder: 0,
      },
    ],
  });

  try {
    await api.post(`/inventory/purchase-orders/${created.id}/approve`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/approval is not required/i.test(message)) throw error;
  }
  await api.post(`/inventory/purchase-orders/${created.id}/send`);

  const po = await api.get<PurchaseOrderRow>(`/inventory/purchase-orders/${created.id}`);
  if (po.status !== "SENT") {
    throw new Error(`Purchase order ${po.poNumber} is ${po.status}, not SENT; it cannot be received.`);
  }
  return po;
}

export interface PostedReceipt {
  grnId: number;
  grnNumber: string;
}

/** A goods receipt that has actually posted, so its stock exists to be moved. */
export async function postedReceipt(
  api: ApiOracle,
  po: PurchaseOrderRow,
  target: SeedTarget,
  qty: number,
): Promise<PostedReceipt> {
  const poLineId = po.lines?.[0]?.id;
  if (!poLineId) throw new Error(`Purchase order ${po.poNumber} has no lines to receive.`);

  const draft = await api.post<{ id: number }>("/inventory/goods-receipts", {
    poId: po.id,
    receivedDate: today(),
    locationId: target.bin.id,
    lines: [{ poLineId, quantityReceived: qty.toFixed(4), qualityStatus: "ACCEPTED" }],
  });
  const posted = await api.post<{ grnNumber: string; status: string }>(
    `/inventory/goods-receipts/${draft.id}/post`,
  );
  if (posted.status !== "POSTED") {
    throw new Error(`Goods receipt ${posted.grnNumber} is ${posted.status}, not POSTED.`);
  }
  return { grnId: draft.id, grnNumber: posted.grnNumber };
}
