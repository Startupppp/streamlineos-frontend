import type { ApiOracle } from "./api-oracle";
import type { StockGrain, Warehouse, WarehouseLocation } from "./api-stock";

const ISO_DATE_LENGTH = 10;

export function today(): string {
  return new Date().toISOString().slice(0, ISO_DATE_LENGTH);
}

function stamp(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
}

export interface SeedTarget {
  warehouseId: number;
  warehouseName: string;
  bin: WarehouseLocation;
  variantId: number;
  variantSku: string;
  variantProductName: string;
}

interface VariantRow {
  id: number;
  sku: string;
  productName: string;
}

const E2E_DOCK_CODE = "E2E-DOCK";
const E2E_DOCK_NAME = "E2E receiving dock";
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

async function heldPerBin(api: ApiOracle, warehouseId: number): Promise<Map<number, number>> {
  const held = new Map<number, number>();
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
