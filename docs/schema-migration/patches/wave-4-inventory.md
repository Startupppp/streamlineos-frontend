---
type: wave-4 patch spec (inventory)
status: DRAFT
date: 2026-07-26
covers: backend/src/db/schema/inventory/* (15 files, 35 tables modified)
source-matrix: docs/schema-migration/wave-0-composite-fk-matrix-inventory-finance.md (Section 1)
---

# Wave 4 — Inventory: Tenant-Safe FK Patch Spec

## Overview

Wave 4 adds tenant isolation to the inventory domain in four ordered steps:

- **Step A** — Add `UNIQUE(org_id, id)` candidate keys on the six parent tables that are currently missing them. Nothing else can land until this step is complete; every downstream composite FK depends on these indexes.
- **Step B** — Add `org_id` columns to the 12 line/detail tables that inherit tenant scope only through their parent FK. Backfill from the parent row. Add composite FKs.
- **Step C** — Add `.references()` to the 19 bare-integer FK columns that have no FK constraint at all today. Promote to composite where the parent already has its candidate key.
- **Step D** — Wire composite FKs on the remaining header-level tables that already have `org_id` but are missing the composite FK.

### Wave 6 dependency (do NOT implement here)
`inv_vendors.client_id` points to `clients.id` (integer). The plan replaces this with `party_id text → business_parties.(organization_id, party_id)` as part of the Wave 6 business-party foundation. This patch adds `UNIQUE(org_id, id)` to `inv_vendors` (required by `inv_purchase_orders`, `inv_reorder_rules`, `inv_vendor_returns`) but does NOT touch the `client_id` column or add the composite FK from `inv_vendors` to `business_parties` — that belongs in Wave 6.

### `inv_stock_levels` note
`inv_stock_levels` already has `UNIQUE(org_id, productVariantId, locationId, coalesce(lotId,0), coalesce(serialId,0))` — a natural key. It has no children referencing `(org_id, id)` as a pair, so no candidate key is required for this wave. Its own `lot_id`/`serial_id` bare columns are covered under Step C.

---

## Migration naming convention

Each migration file is one SQL statement per concern. Generated with:
```
pnpm -C backend db:generate
```
Local dev: `pnpm -C backend db:push`. Production: `pnpm -C backend db:migrate`.

---

## Step A — Candidate keys on parent tables

These six unique indexes must exist before any child composite FK can be created. Apply all six in a single migration (they are independent of each other). Each uses `CONCURRENTLY` to avoid locking production tables; Drizzle wraps these in a `CREATE UNIQUE INDEX CONCURRENTLY` outside a transaction when you use `uniqueIndex().concurrently()`.

### A-1. `inv_warehouses` — `UNIQUE(org_id, id)`

**Why:** Referenced by `inv_locations`, `inv_stock_transfers` (×2), `inv_stock_reservations`, `inv_loads`, `inv_cycle_counts`, `inv_physical_audits`, `inv_channel_stock_publications` (indirectly), `inv_purchase_orders`, `inv_grns`, `inv_shipments`, `inv_reorder_rules`, `inv_pick_lists`.

**Drizzle diff** (`backend/src/db/schema/inventory/warehouses.ts`):

```ts
// BEFORE (table constraints block):
(table) => [
  uniqueIndex("uniq_inv_warehouses_org_code").on(table.orgId, table.code),
  index("idx_inv_warehouses_org").on(table.orgId),
  index("idx_inv_warehouses_branch").on(table.branchId),
]

// AFTER — add candidate key:
(table) => [
  uniqueIndex("uniq_inv_warehouses_org_code").on(table.orgId, table.code),
  uniqueIndex("uniq_inv_warehouses_org_id").on(table.orgId, table.id),  // NEW
  index("idx_inv_warehouses_org").on(table.orgId),
  index("idx_inv_warehouses_branch").on(table.branchId),
]
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_warehouses_org_id"
  ON "inv_warehouses" ("org_id", "id");
```

**Repair / quarantine query** (run before applying; must return 0 rows):
```sql
SELECT id FROM inv_warehouses wh
WHERE branch_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM org_branches ob
    WHERE ob.id = wh.branch_id AND ob.org_id = wh.org_id
  );
```
A non-zero result means the branch FK is cross-tenant — quarantine those rows (`UPDATE inv_warehouses SET branch_id = NULL WHERE id IN (...)`) before proceeding.

---

### A-2. `inv_locations` — `UNIQUE(org_id, id)`

**Why:** Referenced by `inv_stock_transfers` (×2), `inv_stock_reservations`, `inv_cycle_counts`, `inv_physical_audits`, `inv_stock_levels`, `inv_stock_transactions`, `inv_stock_adjustment_lines`, `inv_pick_list_lines`, `inv_cycle_count_lines`, `inv_physical_audit_lines`, `inv_quality_holds`, `inv_serial_numbers`.

Existing single-col FK: `warehouse_id → inv_warehouses.id` (single-col, valid, but not composite). After Step A-1 lands, this can be upgraded to composite in Step D.

`parentLocationId` has no `.references()` at all — added under Step C.

**Drizzle diff** (`backend/src/db/schema/inventory/warehouses.ts`):

```ts
// BEFORE:
(table) => [
  uniqueIndex("uniq_inv_locations_warehouse_code").on(table.warehouseId, table.code),
  index("idx_inv_locations_org").on(table.orgId),
  index("idx_inv_locations_warehouse").on(table.warehouseId),
  index("idx_inv_locations_parent").on(table.parentLocationId),
]

// AFTER — add candidate key:
(table) => [
  uniqueIndex("uniq_inv_locations_warehouse_code").on(table.warehouseId, table.code),
  uniqueIndex("uniq_inv_locations_org_id").on(table.orgId, table.id),  // NEW
  index("idx_inv_locations_org").on(table.orgId),
  index("idx_inv_locations_warehouse").on(table.warehouseId),
  index("idx_inv_locations_parent").on(table.parentLocationId),
]
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_locations_org_id"
  ON "inv_locations" ("org_id", "id");
```

**Repair query** (must return 0 rows):
```sql
SELECT l.id FROM inv_locations l
WHERE NOT EXISTS (
  SELECT 1 FROM inv_warehouses wh
  WHERE wh.id = l.warehouse_id AND wh.org_id = l.org_id
);
```
Quarantine: update `warehouse_id` to the correct org's warehouse or delete orphaned locations.

---

### A-3. `inv_product_variants` — `UNIQUE(org_id, id)`

**Why:** The most-referenced parent in the domain — every line table references it. Existing: `UNIQUE(org_id, sku)` only.

**Drizzle diff** (`backend/src/db/schema/inventory/core.ts`):

```ts
// BEFORE:
(table) => [
  uniqueIndex("uniq_inv_variants_org_sku").on(table.orgId, table.sku),
  index("idx_inv_variants_product").on(table.productId),
  index("idx_inv_variants_barcode").on(table.barcode),
  index("idx_inv_variants_sku_trgm").using("gin", table.sku.op("gin_trgm_ops")),
]

// AFTER:
(table) => [
  uniqueIndex("uniq_inv_variants_org_sku").on(table.orgId, table.sku),
  uniqueIndex("uniq_inv_variants_org_id").on(table.orgId, table.id),   // NEW
  index("idx_inv_variants_product").on(table.productId),
  index("idx_inv_variants_barcode").on(table.barcode),
  index("idx_inv_variants_sku_trgm").using("gin", table.sku.op("gin_trgm_ops")),
]
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_variants_org_id"
  ON "inv_product_variants" ("org_id", "id");
```

**Repair query** (must return 0 rows):
```sql
SELECT pv.id FROM inv_product_variants pv
WHERE NOT EXISTS (
  SELECT 1 FROM inv_products p
  WHERE p.id = pv.product_id AND p.org_id = pv.org_id
);
```

---

### A-4. `inv_vendors` — `UNIQUE(org_id, id)`

**Why:** Referenced by `inv_purchase_orders.vendor_id`, `inv_reorder_rules.vendor_id`, `inv_vendor_returns.vendor_id`. The Wave 6 `client_id → party_id` migration is separate; this step only adds the candidate key.

**Drizzle diff** (`backend/src/db/schema/inventory/purchase-orders.ts`):

```ts
// BEFORE:
(table) => [
  uniqueIndex("uniq_inv_vendors_org_code").on(table.orgId, table.code),
  index("idx_inv_vendors_org").on(table.orgId),
  index("idx_inv_vendors_name_trgm").using("gin", table.name.op("gin_trgm_ops")),
]

// AFTER:
(table) => [
  uniqueIndex("uniq_inv_vendors_org_code").on(table.orgId, table.code),
  uniqueIndex("uniq_inv_vendors_org_id").on(table.orgId, table.id),   // NEW
  index("idx_inv_vendors_org").on(table.orgId),
  index("idx_inv_vendors_name_trgm").using("gin", table.name.op("gin_trgm_ops")),
]
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_vendors_org_id"
  ON "inv_vendors" ("org_id", "id");
```

**Repair query:** `inv_vendors.client_id` cross-tenant check is deferred to Wave 6. No repair needed for the candidate key itself.

---

### A-5. `inv_lots` — `UNIQUE(org_id, id)`

**Why:** Referenced as `lot_id` (bare integer, no FK today) in: `inv_serial_numbers`, `inv_stock_transfer_lines`, `inv_shipment_lines`, `inv_package_lines`, `inv_load_lines`, `inv_vendor_return_lines`, `inv_customer_return_lines`, `inv_quality_inspection_lines`, `inv_quality_holds`, `inv_recall_lines`, `inv_pick_list_lines`, `inv_cycle_count_lines`, `inv_physical_audit_lines`, `inv_stock_reservations`, `inv_stock_levels`.

**Drizzle diff** (`backend/src/db/schema/inventory/traceability.ts`):

```ts
// BEFORE:
(table) => [
  uniqueIndex("uniq_inv_lots_org_variant_number").on(table.orgId, table.productVariantId, table.lotNumber),
  index("idx_inv_lots_org").on(table.orgId),
  index("idx_inv_lots_variant").on(table.productVariantId),
  index("idx_inv_lots_expiry").on(table.expiryDate),
  index("idx_inv_lots_status").on(table.orgId, table.status),
  index("idx_inv_lots_lot_number_trgm").using("gin", table.lotNumber.op("gin_trgm_ops")),
]

// AFTER:
(table) => [
  uniqueIndex("uniq_inv_lots_org_variant_number").on(table.orgId, table.productVariantId, table.lotNumber),
  uniqueIndex("uniq_inv_lots_org_id").on(table.orgId, table.id),  // NEW
  index("idx_inv_lots_org").on(table.orgId),
  index("idx_inv_lots_variant").on(table.productVariantId),
  index("idx_inv_lots_expiry").on(table.expiryDate),
  index("idx_inv_lots_status").on(table.orgId, table.status),
  index("idx_inv_lots_lot_number_trgm").using("gin", table.lotNumber.op("gin_trgm_ops")),
]
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_lots_org_id"
  ON "inv_lots" ("org_id", "id");
```

**Repair query** (must return 0 rows):
```sql
SELECT l.id FROM inv_lots l
WHERE NOT EXISTS (
  SELECT 1 FROM inv_product_variants pv
  WHERE pv.id = l.product_variant_id AND pv.org_id = l.org_id
);
```

---

### A-6. `inv_serial_numbers` — `UNIQUE(org_id, id)`

**Why:** Referenced as `serial_id` (bare integer, no FK today) in the same set of line tables as `lot_id` above.

**Drizzle diff** (`backend/src/db/schema/inventory/traceability.ts`):

```ts
// BEFORE:
(table) => [
  uniqueIndex("uniq_inv_serials_org_variant_number").on(table.orgId, table.productVariantId, table.serialNumber),
  index("idx_inv_serials_org").on(table.orgId),
  index("idx_inv_serials_variant").on(table.productVariantId),
  index("idx_inv_serials_status").on(table.orgId, table.status),
  index("idx_inv_serials_location").on(table.currentLocationId),
  index("idx_inv_serials_serial_number_trgm").using("gin", table.serialNumber.op("gin_trgm_ops")),
]

// AFTER:
(table) => [
  uniqueIndex("uniq_inv_serials_org_variant_number").on(table.orgId, table.productVariantId, table.serialNumber),
  uniqueIndex("uniq_inv_serials_org_id").on(table.orgId, table.id),  // NEW
  index("idx_inv_serials_org").on(table.orgId),
  index("idx_inv_serials_variant").on(table.productVariantId),
  index("idx_inv_serials_status").on(table.orgId, table.status),
  index("idx_inv_serials_location").on(table.currentLocationId),
  index("idx_inv_serials_serial_number_trgm").using("gin", table.serialNumber.op("gin_trgm_ops")),
]
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_serials_org_id"
  ON "inv_serial_numbers" ("org_id", "id");
```

**Repair query** (must return 0 rows):
```sql
SELECT sn.id FROM inv_serial_numbers sn
WHERE NOT EXISTS (
  SELECT 1 FROM inv_product_variants pv
  WHERE pv.id = sn.product_variant_id AND pv.org_id = sn.org_id
);
```

---

## Step B — Add `org_id` to line tables (12 tables)

These tables inherit tenant scope through their parent FK but have no `org_id` column of their own. For each:
1. Add `org_id text` (nullable initially so the column can be added without DEFAULT).
2. Backfill from parent.
3. `ALTER COLUMN org_id SET NOT NULL`.
4. Add composite FK (`NOT VALID`), then `VALIDATE CONSTRAINT` in a separate migration.

Step B depends on Step A completing first (the composite FKs reference the candidate keys added in Step A).

---

### B-1. `inv_po_lines` — add `org_id`, composite FK to `inv_purchase_orders`

**Drizzle diff** (`backend/src/db/schema/inventory/purchase-orders.ts`):

```ts
// BEFORE:
export const invPoLines = pgTable("inv_po_lines", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").references(() => invPurchaseOrders.id, { onDelete: "cascade" }).notNull(),
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id, { onDelete: "restrict" }).notNull(),
  // ... rest of columns
}, (table) => [
  index("idx_inv_po_lines_po").on(table.poId),
  index("idx_inv_po_lines_variant").on(table.productVariantId),
])

// AFTER:
import { foreignKey } from "drizzle-orm/pg-core";

export const invPoLines = pgTable("inv_po_lines", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),                  // NEW — backfilled from inv_purchase_orders
  poId: integer("po_id").references(() => invPurchaseOrders.id, { onDelete: "cascade" }).notNull(),
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id, { onDelete: "restrict" }).notNull(),
  // ... rest of columns unchanged
}, (table) => [
  foreignKey({                                       // NEW — composite FK
    columns: [table.orgId, table.poId],
    foreignColumns: [invPurchaseOrders.orgId, invPurchaseOrders.id],
    name: "fk_inv_po_lines_org_po",
  }),
  index("idx_inv_po_lines_org").on(table.orgId),    // NEW
  index("idx_inv_po_lines_po").on(table.poId),
  index("idx_inv_po_lines_variant").on(table.productVariantId),
])
```

**Generated SQL (migration A — add column + backfill):**
```sql
-- 1. Add nullable column
ALTER TABLE "inv_po_lines" ADD COLUMN "org_id" text;

-- 2. Backfill from parent
UPDATE "inv_po_lines" pl
SET org_id = po.org_id
FROM inv_purchase_orders po
WHERE po.id = pl.po_id;

-- 3. Enforce NOT NULL
ALTER TABLE "inv_po_lines" ALTER COLUMN "org_id" SET NOT NULL;

-- 4. Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_inv_po_lines_org" ON "inv_po_lines" ("org_id");
```

**Generated SQL (migration B — add constraint NOT VALID then validate):**
```sql
ALTER TABLE "inv_po_lines"
  ADD CONSTRAINT "fk_inv_po_lines_org_po"
  FOREIGN KEY ("org_id", "po_id")
  REFERENCES "inv_purchase_orders" ("org_id", "id")
  NOT VALID;

-- Run in a separate migration after verifying repair query returns 0:
ALTER TABLE "inv_po_lines" VALIDATE CONSTRAINT "fk_inv_po_lines_org_po";
```

**Repair / quarantine (must return 0 before VALIDATE):**
```sql
SELECT pl.id FROM inv_po_lines pl
JOIN inv_purchase_orders po ON po.id = pl.po_id
WHERE pl.org_id <> po.org_id;
```

**Pre-requires:** Step A (no additional candidate key needed on `inv_purchase_orders` for this FK — `inv_purchase_orders` uses PK `id` plus `org_id` once the composite candidate key is added in Step D-2 below; for this child FK the composite key on the parent `(org_id, id)` is required — add via Step D-2 first).

> NOTE: `inv_purchase_orders` also needs `UNIQUE(org_id, id)` before this FK lands. Add it under Step D-2 together with that table's own composite FKs.

---

### B-2. `inv_grn_lines` — add `org_id`, composite FK to `inv_grns`

**Drizzle diff** (`backend/src/db/schema/inventory/purchase-orders.ts`):

```ts
// BEFORE:
export const invGrnLines = pgTable("inv_grn_lines", {
  id: serial("id").primaryKey(),
  grnId: integer("grn_id").references(() => invGrns.id, { onDelete: "cascade" }).notNull(),
  poLineId: integer("po_line_id").references(() => invPoLines.id, { onDelete: "restrict" }).notNull(),
  // ...
}, (table) => [
  index("idx_inv_grn_lines_grn").on(table.grnId),
])

// AFTER:
export const invGrnLines = pgTable("inv_grn_lines", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),                  // NEW
  grnId: integer("grn_id").references(() => invGrns.id, { onDelete: "cascade" }).notNull(),
  poLineId: integer("po_line_id").references(() => invPoLines.id, { onDelete: "restrict" }).notNull(),
  // ...
}, (table) => [
  foreignKey({
    columns: [table.orgId, table.grnId],
    foreignColumns: [invGrns.orgId, invGrns.id],
    name: "fk_inv_grn_lines_org_grn",
  }),                                               // NEW
  index("idx_inv_grn_lines_org").on(table.orgId),  // NEW
  index("idx_inv_grn_lines_grn").on(table.grnId),
])
```

**Generated SQL:**
```sql
ALTER TABLE "inv_grn_lines" ADD COLUMN "org_id" text;

UPDATE "inv_grn_lines" gl
SET org_id = g.org_id
FROM inv_grns g
WHERE g.id = gl.grn_id;

ALTER TABLE "inv_grn_lines" ALTER COLUMN "org_id" SET NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_inv_grn_lines_org" ON "inv_grn_lines" ("org_id");

ALTER TABLE "inv_grn_lines"
  ADD CONSTRAINT "fk_inv_grn_lines_org_grn"
  FOREIGN KEY ("org_id", "grn_id")
  REFERENCES "inv_grns" ("org_id", "id")
  NOT VALID;

ALTER TABLE "inv_grn_lines" VALIDATE CONSTRAINT "fk_inv_grn_lines_org_grn";
```

**Repair query:**
```sql
SELECT gl.id FROM inv_grn_lines gl
JOIN inv_grns g ON g.id = gl.grn_id
WHERE gl.org_id <> g.org_id;
```

**Pre-requires:** `inv_grns` `UNIQUE(org_id, id)` — see Step D-3.

---

### B-3. `inv_so_lines` — add `org_id`, composite FK to `inv_sales_orders`

**Drizzle diff** (`backend/src/db/schema/inventory/sales-orders.ts`):

```ts
// BEFORE:
export const invSoLines = pgTable("inv_so_lines", {
  id: serial("id").primaryKey(),
  soId: integer("so_id").references(() => invSalesOrders.id, { onDelete: "cascade" }).notNull(),
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id, { onDelete: "restrict" }).notNull(),
  // ...
}, ...)

// AFTER:
export const invSoLines = pgTable("inv_so_lines", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),                  // NEW
  soId: integer("so_id").references(() => invSalesOrders.id, { onDelete: "cascade" }).notNull(),
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id, { onDelete: "restrict" }).notNull(),
  // ...
}, (table) => [
  foreignKey({
    columns: [table.orgId, table.soId],
    foreignColumns: [invSalesOrders.orgId, invSalesOrders.id],
    name: "fk_inv_so_lines_org_so",
  }),
  index("idx_inv_so_lines_org").on(table.orgId),
  index("idx_inv_so_lines_so").on(table.soId),
  index("idx_inv_so_lines_variant").on(table.productVariantId),
])
```

**Generated SQL:**
```sql
ALTER TABLE "inv_so_lines" ADD COLUMN "org_id" text;

UPDATE "inv_so_lines" sl
SET org_id = so.org_id
FROM inv_sales_orders so
WHERE so.id = sl.so_id;

ALTER TABLE "inv_so_lines" ALTER COLUMN "org_id" SET NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_inv_so_lines_org" ON "inv_so_lines" ("org_id");

ALTER TABLE "inv_so_lines"
  ADD CONSTRAINT "fk_inv_so_lines_org_so"
  FOREIGN KEY ("org_id", "so_id")
  REFERENCES "inv_sales_orders" ("org_id", "id")
  NOT VALID;

ALTER TABLE "inv_so_lines" VALIDATE CONSTRAINT "fk_inv_so_lines_org_so";
```

**Repair query:**
```sql
SELECT sl.id FROM inv_so_lines sl
JOIN inv_sales_orders so ON so.id = sl.so_id
WHERE sl.org_id <> so.org_id;
```

**Pre-requires:** `inv_sales_orders` `UNIQUE(org_id, id)` — see Step D-4.

---

### B-4. `inv_stock_adjustment_lines` — add `org_id`, composite FK to `inv_stock_adjustments`

**Drizzle diff** (`backend/src/db/schema/inventory/stock.ts`):

```ts
// BEFORE:
export const invStockAdjustmentLines = pgTable("inv_stock_adjustment_lines", {
  id: serial("id").primaryKey(),
  adjustmentId: integer("adjustment_id").references(() => invStockAdjustments.id, { onDelete: "cascade" }).notNull(),
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id, { onDelete: "cascade" }).notNull(),
  locationId: integer("location_id").references(() => invLocations.id, { onDelete: "cascade" }).notNull(),
  // ...
}, (table) => [
  index("idx_inv_adj_lines_adj").on(table.adjustmentId),
  index("idx_inv_stock_adjustment_lines_variant").on(table.productVariantId),
])

// AFTER:
export const invStockAdjustmentLines = pgTable("inv_stock_adjustment_lines", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),                  // NEW
  adjustmentId: integer("adjustment_id").references(() => invStockAdjustments.id, { onDelete: "cascade" }).notNull(),
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id, { onDelete: "cascade" }).notNull(),
  locationId: integer("location_id").references(() => invLocations.id, { onDelete: "cascade" }).notNull(),
  // ...
}, (table) => [
  foreignKey({
    columns: [table.orgId, table.adjustmentId],
    foreignColumns: [invStockAdjustments.orgId, invStockAdjustments.id],
    name: "fk_inv_adj_lines_org_adj",
  }),
  index("idx_inv_adj_lines_org").on(table.orgId),
  index("idx_inv_adj_lines_adj").on(table.adjustmentId),
  index("idx_inv_stock_adjustment_lines_variant").on(table.productVariantId),
])
```

**Generated SQL:**
```sql
ALTER TABLE "inv_stock_adjustment_lines" ADD COLUMN "org_id" text;

UPDATE "inv_stock_adjustment_lines" al
SET org_id = a.org_id
FROM inv_stock_adjustments a
WHERE a.id = al.adjustment_id;

ALTER TABLE "inv_stock_adjustment_lines" ALTER COLUMN "org_id" SET NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_inv_adj_lines_org"
  ON "inv_stock_adjustment_lines" ("org_id");

ALTER TABLE "inv_stock_adjustment_lines"
  ADD CONSTRAINT "fk_inv_adj_lines_org_adj"
  FOREIGN KEY ("org_id", "adjustment_id")
  REFERENCES "inv_stock_adjustments" ("org_id", "id")
  NOT VALID;

ALTER TABLE "inv_stock_adjustment_lines"
  VALIDATE CONSTRAINT "fk_inv_adj_lines_org_adj";
```

**Repair query:**
```sql
SELECT al.id FROM inv_stock_adjustment_lines al
JOIN inv_stock_adjustments a ON a.id = al.adjustment_id
JOIN inv_product_variants pv ON pv.id = al.product_variant_id
WHERE pv.org_id <> a.org_id;
```

**Pre-requires:** `inv_stock_adjustments` `UNIQUE(org_id, id)` (no children reference it as a pair yet, but the composite FK requires Drizzle to see the target index — add it now). Add `uniqueIndex("uniq_inv_stock_adjustments_org_id").on(table.orgId, table.id)` to `invStockAdjustments` constraints.

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_stock_adjustments_org_id"
  ON "inv_stock_adjustments" ("org_id", "id");
```

---

### B-5. `inv_stock_transfer_lines` — add `org_id`, composite FK to `inv_stock_transfers`

**Drizzle diff** (`backend/src/db/schema/inventory/stock.ts`):

```ts
// BEFORE:
export const invStockTransferLines = pgTable("inv_stock_transfer_lines", {
  id: serial("id").primaryKey(),
  transferId: integer("transfer_id").references(() => invStockTransfers.id, { onDelete: "cascade" }).notNull(),
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id, { onDelete: "cascade" }).notNull(),
  // ...
  lotId: integer("lot_id"),    // bare, no FK
  serialId: integer("serial_id"),  // bare, no FK
}, ...)

// AFTER:
export const invStockTransferLines = pgTable("inv_stock_transfer_lines", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),               // NEW
  transferId: integer("transfer_id").references(() => invStockTransfers.id, { onDelete: "cascade" }).notNull(),
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id, { onDelete: "cascade" }).notNull(),
  // ...
  lotId: integer("lot_id").references(() => invLots.id, { onDelete: "set null" }),      // C-promoted
  serialId: integer("serial_id").references(() => invSerialNumbers.id, { onDelete: "set null" }),  // C-promoted
}, (table) => [
  foreignKey({
    columns: [table.orgId, table.transferId],
    foreignColumns: [invStockTransfers.orgId, invStockTransfers.id],
    name: "fk_inv_transfer_lines_org_transfer",
  }),
  index("idx_inv_transfer_lines_org").on(table.orgId),
  index("idx_inv_transfer_lines_transfer").on(table.transferId),
  index("idx_inv_stock_transfer_lines_variant").on(table.productVariantId),
])
```

**Generated SQL:**
```sql
ALTER TABLE "inv_stock_transfer_lines" ADD COLUMN "org_id" text;

UPDATE "inv_stock_transfer_lines" tl
SET org_id = t.org_id
FROM inv_stock_transfers t
WHERE t.id = tl.transfer_id;

ALTER TABLE "inv_stock_transfer_lines" ALTER COLUMN "org_id" SET NOT NULL;

-- Promote lot_id and serial_id FKs (bare → referenced):
ALTER TABLE "inv_stock_transfer_lines"
  ADD CONSTRAINT "fk_inv_stl_lot" FOREIGN KEY ("lot_id")
  REFERENCES "inv_lots" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_stock_transfer_lines"
  ADD CONSTRAINT "fk_inv_stl_serial" FOREIGN KEY ("serial_id")
  REFERENCES "inv_serial_numbers" ("id") ON DELETE SET NULL NOT VALID;

ALTER TABLE "inv_stock_transfer_lines"
  ADD CONSTRAINT "fk_inv_transfer_lines_org_transfer"
  FOREIGN KEY ("org_id", "transfer_id")
  REFERENCES "inv_stock_transfers" ("org_id", "id")
  NOT VALID;

ALTER TABLE "inv_stock_transfer_lines" VALIDATE CONSTRAINT "fk_inv_transfer_lines_org_transfer";
ALTER TABLE "inv_stock_transfer_lines" VALIDATE CONSTRAINT "fk_inv_stl_lot";
ALTER TABLE "inv_stock_transfer_lines" VALIDATE CONSTRAINT "fk_inv_stl_serial";
```

**Repair query:**
```sql
SELECT tl.id FROM inv_stock_transfer_lines tl
JOIN inv_stock_transfers t ON t.id = tl.transfer_id
WHERE tl.org_id <> t.org_id
UNION ALL
SELECT tl.id FROM inv_stock_transfer_lines tl
WHERE tl.lot_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM inv_lots l WHERE l.id = tl.lot_id AND l.org_id = tl.org_id)
UNION ALL
SELECT tl.id FROM inv_stock_transfer_lines tl
WHERE tl.serial_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM inv_serial_numbers sn WHERE sn.id = tl.serial_id AND sn.org_id = tl.org_id);
```

**Pre-requires:** `inv_stock_transfers` `UNIQUE(org_id, id)` — Step D-5. Also Steps A-5 and A-6 for lot/serial candidate keys.

---

### B-6. `inv_shipment_lines` — add `org_id`, composite FK to `inv_shipments`

**Drizzle diff** (`backend/src/db/schema/inventory/shipping.ts`):

```ts
// BEFORE:
export const invShipmentLines = pgTable("inv_shipment_lines", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").references(() => invShipments.id, { onDelete: "cascade" }).notNull(),
  soLineId: integer("so_line_id"),   // bare, no FK
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id).notNull(),
  // ...
  lotId: integer("lot_id"),     // bare
  serialId: integer("serial_id"),   // bare
}, ...)

// AFTER:
export const invShipmentLines = pgTable("inv_shipment_lines", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),                // NEW
  shipmentId: integer("shipment_id").references(() => invShipments.id, { onDelete: "cascade" }).notNull(),
  soLineId: integer("so_line_id").references(() => invSoLines.id, { onDelete: "set null" }),  // C-promoted
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id).notNull(),
  // ...
  lotId: integer("lot_id").references(() => invLots.id, { onDelete: "set null" }),       // C-promoted
  serialId: integer("serial_id").references(() => invSerialNumbers.id, { onDelete: "set null" }),  // C-promoted
}, (table) => [
  foreignKey({
    columns: [table.orgId, table.shipmentId],
    foreignColumns: [invShipments.orgId, invShipments.id],
    name: "fk_inv_shipment_lines_org_shipment",
  }),
  index("idx_inv_ship_lines_org").on(table.orgId),
  index("idx_inv_ship_lines_ship").on(table.shipmentId),
  index("idx_inv_shipment_lines_variant").on(table.productVariantId),
])
```

**Generated SQL:**
```sql
ALTER TABLE "inv_shipment_lines" ADD COLUMN "org_id" text;

UPDATE "inv_shipment_lines" sl
SET org_id = s.org_id
FROM inv_shipments s
WHERE s.id = sl.shipment_id;

ALTER TABLE "inv_shipment_lines" ALTER COLUMN "org_id" SET NOT NULL;

ALTER TABLE "inv_shipment_lines"
  ADD CONSTRAINT "fk_inv_shl_so_line" FOREIGN KEY ("so_line_id")
  REFERENCES "inv_so_lines" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_shipment_lines"
  ADD CONSTRAINT "fk_inv_shl_lot" FOREIGN KEY ("lot_id")
  REFERENCES "inv_lots" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_shipment_lines"
  ADD CONSTRAINT "fk_inv_shl_serial" FOREIGN KEY ("serial_id")
  REFERENCES "inv_serial_numbers" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_shipment_lines"
  ADD CONSTRAINT "fk_inv_shipment_lines_org_shipment"
  FOREIGN KEY ("org_id", "shipment_id")
  REFERENCES "inv_shipments" ("org_id", "id")
  NOT VALID;

ALTER TABLE "inv_shipment_lines" VALIDATE CONSTRAINT "fk_inv_shipment_lines_org_shipment";
ALTER TABLE "inv_shipment_lines" VALIDATE CONSTRAINT "fk_inv_shl_so_line";
ALTER TABLE "inv_shipment_lines" VALIDATE CONSTRAINT "fk_inv_shl_lot";
ALTER TABLE "inv_shipment_lines" VALIDATE CONSTRAINT "fk_inv_shl_serial";
```

**Repair query:**
```sql
SELECT sl.id FROM inv_shipment_lines sl
JOIN inv_shipments s ON s.id = sl.shipment_id
WHERE sl.org_id <> s.org_id;
```

**Pre-requires:** Steps A-5, A-6; `inv_shipments` `UNIQUE(org_id, id)` — Step D-6; `inv_so_lines` has `org_id` from B-3.

---

### B-7. `inv_package_lines` — add `org_id`, composite FK to `inv_packages`

**Drizzle diff** (`backend/src/db/schema/inventory/shipping.ts`):

```ts
// BEFORE:
export const invPackageLines = pgTable("inv_package_lines", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id").references(() => invPackages.id, { onDelete: "cascade" }).notNull(),
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id).notNull(),
  lotId: integer("lot_id"),    // bare
  serialId: integer("serial_id"),  // bare
  // ...
}, ...)

// AFTER:
export const invPackageLines = pgTable("inv_package_lines", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),               // NEW
  packageId: integer("package_id").references(() => invPackages.id, { onDelete: "cascade" }).notNull(),
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id).notNull(),
  lotId: integer("lot_id").references(() => invLots.id, { onDelete: "set null" }),       // C-promoted
  serialId: integer("serial_id").references(() => invSerialNumbers.id, { onDelete: "set null" }),  // C-promoted
  // ...
}, (table) => [
  foreignKey({
    columns: [table.orgId, table.packageId],
    foreignColumns: [invPackages.orgId, invPackages.id],
    name: "fk_inv_pkg_lines_org_pkg",
  }),
  index("idx_inv_pkg_lines_org").on(table.orgId),
  index("idx_inv_pkg_lines_pkg").on(table.packageId),
  index("idx_inv_package_lines_variant").on(table.productVariantId),
])
```

**Generated SQL:**
```sql
ALTER TABLE "inv_package_lines" ADD COLUMN "org_id" text;

UPDATE "inv_package_lines" pl
SET org_id = p.org_id
FROM inv_packages p
WHERE p.id = pl.package_id;

ALTER TABLE "inv_package_lines" ALTER COLUMN "org_id" SET NOT NULL;

ALTER TABLE "inv_package_lines"
  ADD CONSTRAINT "fk_inv_pkl_lot" FOREIGN KEY ("lot_id")
  REFERENCES "inv_lots" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_package_lines"
  ADD CONSTRAINT "fk_inv_pkl_serial" FOREIGN KEY ("serial_id")
  REFERENCES "inv_serial_numbers" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_package_lines"
  ADD CONSTRAINT "fk_inv_pkg_lines_org_pkg"
  FOREIGN KEY ("org_id", "package_id")
  REFERENCES "inv_packages" ("org_id", "id")
  NOT VALID;

ALTER TABLE "inv_package_lines" VALIDATE CONSTRAINT "fk_inv_pkg_lines_org_pkg";
ALTER TABLE "inv_package_lines" VALIDATE CONSTRAINT "fk_inv_pkl_lot";
ALTER TABLE "inv_package_lines" VALIDATE CONSTRAINT "fk_inv_pkl_serial";
```

**Repair query:**
```sql
SELECT pl.id FROM inv_package_lines pl
JOIN inv_packages p ON p.id = pl.package_id
WHERE pl.org_id <> p.org_id;
```

**Pre-requires:** Steps A-5, A-6; `inv_packages` `UNIQUE(org_id, id)` — Step D-7.

---

### B-8. `inv_load_lines` — add `org_id`, composite FK to `inv_loads`

`transferId` is a bare integer with no `.references()` (missing FK entirely). Add single-col reference to `inv_stock_transfers` here.

**Drizzle diff** (`backend/src/db/schema/inventory/shipping.ts`):

```ts
// BEFORE:
export const invLoadLines = pgTable("inv_load_lines", {
  id: serial("id").primaryKey(),
  loadId: integer("load_id").references(() => invLoads.id, { onDelete: "cascade" }).notNull(),
  shipmentId: integer("shipment_id").references(() => invShipments.id, { onDelete: "set null" }),
  transferId: integer("transfer_id"),   // bare, no FK
}, ...)

// AFTER:
export const invLoadLines = pgTable("inv_load_lines", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),              // NEW
  loadId: integer("load_id").references(() => invLoads.id, { onDelete: "cascade" }).notNull(),
  shipmentId: integer("shipment_id").references(() => invShipments.id, { onDelete: "set null" }),
  transferId: integer("transfer_id").references(() => invStockTransfers.id, { onDelete: "set null" }),  // C-promoted
}, (table) => [
  foreignKey({
    columns: [table.orgId, table.loadId],
    foreignColumns: [invLoads.orgId, invLoads.id],
    name: "fk_inv_load_lines_org_load",
  }),
  index("idx_inv_load_lines_org").on(table.orgId),
  index("idx_inv_load_lines_load").on(table.loadId),
])
```

**Generated SQL:**
```sql
ALTER TABLE "inv_load_lines" ADD COLUMN "org_id" text;

UPDATE "inv_load_lines" ll
SET org_id = l.org_id
FROM inv_loads l
WHERE l.id = ll.load_id;

ALTER TABLE "inv_load_lines" ALTER COLUMN "org_id" SET NOT NULL;

ALTER TABLE "inv_load_lines"
  ADD CONSTRAINT "fk_inv_ll_transfer" FOREIGN KEY ("transfer_id")
  REFERENCES "inv_stock_transfers" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_load_lines"
  ADD CONSTRAINT "fk_inv_load_lines_org_load"
  FOREIGN KEY ("org_id", "load_id")
  REFERENCES "inv_loads" ("org_id", "id")
  NOT VALID;

ALTER TABLE "inv_load_lines" VALIDATE CONSTRAINT "fk_inv_load_lines_org_load";
ALTER TABLE "inv_load_lines" VALIDATE CONSTRAINT "fk_inv_ll_transfer";
```

**Repair query:**
```sql
SELECT ll.id FROM inv_load_lines ll
JOIN inv_loads l ON l.id = ll.load_id
WHERE ll.org_id <> l.org_id;
```

**Pre-requires:** `inv_loads` `UNIQUE(org_id, id)` — Step D-8.

---

### B-9. `inv_vendor_return_lines` — add `org_id`, composite FK to `inv_vendor_returns`

**Drizzle diff** (`backend/src/db/schema/inventory/operations.ts`):

```ts
// BEFORE:
export const invVendorReturnLines = pgTable("inv_vendor_return_lines", {
  id: serial("id").primaryKey(),
  returnId: integer("return_id").references(() => invVendorReturns.id, { onDelete: "cascade" }).notNull(),
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id).notNull(),
  lotId: integer("lot_id"),    // bare
  serialId: integer("serial_id"),  // bare
  // ...
}, ...)

// AFTER:
export const invVendorReturnLines = pgTable("inv_vendor_return_lines", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),               // NEW
  returnId: integer("return_id").references(() => invVendorReturns.id, { onDelete: "cascade" }).notNull(),
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id).notNull(),
  lotId: integer("lot_id").references(() => invLots.id, { onDelete: "set null" }),       // C-promoted
  serialId: integer("serial_id").references(() => invSerialNumbers.id, { onDelete: "set null" }),  // C-promoted
  // ...
}, (table) => [
  foreignKey({
    columns: [table.orgId, table.returnId],
    foreignColumns: [invVendorReturns.orgId, invVendorReturns.id],
    name: "fk_inv_vret_lines_org_return",
  }),
  index("idx_inv_vret_lines_org").on(table.orgId),
  index("idx_inv_vret_lines_return").on(table.returnId),
  index("idx_inv_vendor_return_lines_variant").on(table.productVariantId),
])
```

**Generated SQL:**
```sql
ALTER TABLE "inv_vendor_return_lines" ADD COLUMN "org_id" text;

UPDATE "inv_vendor_return_lines" vrl
SET org_id = vr.org_id
FROM inv_vendor_returns vr
WHERE vr.id = vrl.return_id;

ALTER TABLE "inv_vendor_return_lines" ALTER COLUMN "org_id" SET NOT NULL;

ALTER TABLE "inv_vendor_return_lines"
  ADD CONSTRAINT "fk_inv_vrl_lot" FOREIGN KEY ("lot_id")
  REFERENCES "inv_lots" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_vendor_return_lines"
  ADD CONSTRAINT "fk_inv_vrl_serial" FOREIGN KEY ("serial_id")
  REFERENCES "inv_serial_numbers" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_vendor_return_lines"
  ADD CONSTRAINT "fk_inv_vret_lines_org_return"
  FOREIGN KEY ("org_id", "return_id")
  REFERENCES "inv_vendor_returns" ("org_id", "id")
  NOT VALID;

ALTER TABLE "inv_vendor_return_lines" VALIDATE CONSTRAINT "fk_inv_vret_lines_org_return";
ALTER TABLE "inv_vendor_return_lines" VALIDATE CONSTRAINT "fk_inv_vrl_lot";
ALTER TABLE "inv_vendor_return_lines" VALIDATE CONSTRAINT "fk_inv_vrl_serial";
```

**Repair query:**
```sql
SELECT vrl.id FROM inv_vendor_return_lines vrl
JOIN inv_vendor_returns vr ON vr.id = vrl.return_id
WHERE vrl.org_id <> vr.org_id;
```

**Pre-requires:** Steps A-5, A-6; `inv_vendor_returns` `UNIQUE(org_id, id)` — Step D-9.

---

### B-10. `inv_customer_return_lines` — add `org_id`, composite FK to `inv_customer_returns`

**Drizzle diff** (`backend/src/db/schema/inventory/operations.ts`):

```ts
// AFTER (same pattern):
export const invCustomerReturnLines = pgTable("inv_customer_return_lines", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),               // NEW
  returnId: integer("return_id").references(() => invCustomerReturns.id, { onDelete: "cascade" }).notNull(),
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id).notNull(),
  lotId: integer("lot_id").references(() => invLots.id, { onDelete: "set null" }),
  serialId: integer("serial_id").references(() => invSerialNumbers.id, { onDelete: "set null" }),
  // ...
}, (table) => [
  foreignKey({
    columns: [table.orgId, table.returnId],
    foreignColumns: [invCustomerReturns.orgId, invCustomerReturns.id],
    name: "fk_inv_cret_lines_org_return",
  }),
  index("idx_inv_cret_lines_org").on(table.orgId),
  index("idx_inv_cret_lines_return").on(table.returnId),
  index("idx_inv_customer_return_lines_variant").on(table.productVariantId),
])
```

**Generated SQL:**
```sql
ALTER TABLE "inv_customer_return_lines" ADD COLUMN "org_id" text;

UPDATE "inv_customer_return_lines" crl
SET org_id = cr.org_id
FROM inv_customer_returns cr
WHERE cr.id = crl.return_id;

ALTER TABLE "inv_customer_return_lines" ALTER COLUMN "org_id" SET NOT NULL;

ALTER TABLE "inv_customer_return_lines"
  ADD CONSTRAINT "fk_inv_crl_lot" FOREIGN KEY ("lot_id")
  REFERENCES "inv_lots" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_customer_return_lines"
  ADD CONSTRAINT "fk_inv_crl_serial" FOREIGN KEY ("serial_id")
  REFERENCES "inv_serial_numbers" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_customer_return_lines"
  ADD CONSTRAINT "fk_inv_cret_lines_org_return"
  FOREIGN KEY ("org_id", "return_id")
  REFERENCES "inv_customer_returns" ("org_id", "id")
  NOT VALID;

ALTER TABLE "inv_customer_return_lines" VALIDATE CONSTRAINT "fk_inv_cret_lines_org_return";
ALTER TABLE "inv_customer_return_lines" VALIDATE CONSTRAINT "fk_inv_crl_lot";
ALTER TABLE "inv_customer_return_lines" VALIDATE CONSTRAINT "fk_inv_crl_serial";
```

**Repair query:**
```sql
SELECT crl.id FROM inv_customer_return_lines crl
JOIN inv_customer_returns cr ON cr.id = crl.return_id
WHERE crl.org_id <> cr.org_id;
```

**Pre-requires:** Steps A-5, A-6; `inv_customer_returns` `UNIQUE(org_id, id)` — Step D-10.

---

### B-11. `inv_pick_list_lines` — add `org_id`, composite FK to `inv_pick_lists`

**Drizzle diff** (`backend/src/db/schema/inventory/operations.ts`):

```ts
// AFTER:
export const invPickListLines = pgTable("inv_pick_list_lines", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),               // NEW
  pickListId: integer("pick_list_id").references(() => invPickLists.id, { onDelete: "cascade" }).notNull(),
  soLineId: integer("so_line_id").references(() => invSoLines.id, { onDelete: "set null" }),  // C-promoted
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id).notNull(),
  locationId: integer("location_id").references(() => invLocations.id),
  lotId: integer("lot_id").references(() => invLots.id, { onDelete: "set null" }),
  serialId: integer("serial_id").references(() => invSerialNumbers.id, { onDelete: "set null" }),
  // ...
}, (table) => [
  foreignKey({
    columns: [table.orgId, table.pickListId],
    foreignColumns: [invPickLists.orgId, invPickLists.id],
    name: "fk_inv_pll_org_pick",
  }),
  index("idx_inv_pick_lines_org").on(table.orgId),
  index("idx_inv_pick_lines_pick").on(table.pickListId),
  index("idx_inv_pick_list_lines_variant").on(table.productVariantId),
])
```

**Generated SQL:**
```sql
ALTER TABLE "inv_pick_list_lines" ADD COLUMN "org_id" text;

UPDATE "inv_pick_list_lines" pll
SET org_id = pl.org_id
FROM inv_pick_lists pl
WHERE pl.id = pll.pick_list_id;

ALTER TABLE "inv_pick_list_lines" ALTER COLUMN "org_id" SET NOT NULL;

ALTER TABLE "inv_pick_list_lines"
  ADD CONSTRAINT "fk_inv_pll_so_line" FOREIGN KEY ("so_line_id")
  REFERENCES "inv_so_lines" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_pick_list_lines"
  ADD CONSTRAINT "fk_inv_pll_lot" FOREIGN KEY ("lot_id")
  REFERENCES "inv_lots" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_pick_list_lines"
  ADD CONSTRAINT "fk_inv_pll_serial" FOREIGN KEY ("serial_id")
  REFERENCES "inv_serial_numbers" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_pick_list_lines"
  ADD CONSTRAINT "fk_inv_pll_org_pick"
  FOREIGN KEY ("org_id", "pick_list_id")
  REFERENCES "inv_pick_lists" ("org_id", "id")
  NOT VALID;

ALTER TABLE "inv_pick_list_lines" VALIDATE CONSTRAINT "fk_inv_pll_org_pick";
ALTER TABLE "inv_pick_list_lines" VALIDATE CONSTRAINT "fk_inv_pll_so_line";
ALTER TABLE "inv_pick_list_lines" VALIDATE CONSTRAINT "fk_inv_pll_lot";
ALTER TABLE "inv_pick_list_lines" VALIDATE CONSTRAINT "fk_inv_pll_serial";
```

**Repair query:**
```sql
SELECT pll.id FROM inv_pick_list_lines pll
JOIN inv_pick_lists pl ON pl.id = pll.pick_list_id
WHERE pll.org_id <> pl.org_id;
```

**Pre-requires:** Steps A-5, A-6, B-3 (`inv_so_lines.org_id`); `inv_pick_lists` `UNIQUE(org_id, id)` — Step D-11.

---

### B-12. `inv_cycle_count_lines` — add `org_id`, composite FK to `inv_cycle_counts`

**Drizzle diff** (`backend/src/db/schema/inventory/operations.ts`):

```ts
// AFTER:
export const invCycleCountLines = pgTable("inv_cycle_count_lines", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),               // NEW
  cycleCountId: integer("cycle_count_id").references(() => invCycleCounts.id, { onDelete: "cascade" }).notNull(),
  productVariantId: integer("product_variant_id").references(() => invProductVariants.id).notNull(),
  locationId: integer("location_id").references(() => invLocations.id).notNull(),
  lotId: integer("lot_id").references(() => invLots.id, { onDelete: "set null" }),  // C-promoted
  // ...
}, (table) => [
  foreignKey({
    columns: [table.orgId, table.cycleCountId],
    foreignColumns: [invCycleCounts.orgId, invCycleCounts.id],
    name: "fk_inv_ccl_org_count",
  }),
  index("idx_inv_cc_lines_org").on(table.orgId),
  index("idx_inv_cc_lines_count").on(table.cycleCountId),
  index("idx_inv_cycle_count_lines_variant").on(table.productVariantId),
])
```

**Generated SQL:**
```sql
ALTER TABLE "inv_cycle_count_lines" ADD COLUMN "org_id" text;

UPDATE "inv_cycle_count_lines" ccl
SET org_id = cc.org_id
FROM inv_cycle_counts cc
WHERE cc.id = ccl.cycle_count_id;

ALTER TABLE "inv_cycle_count_lines" ALTER COLUMN "org_id" SET NOT NULL;

ALTER TABLE "inv_cycle_count_lines"
  ADD CONSTRAINT "fk_inv_ccl_lot" FOREIGN KEY ("lot_id")
  REFERENCES "inv_lots" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_cycle_count_lines"
  ADD CONSTRAINT "fk_inv_ccl_org_count"
  FOREIGN KEY ("org_id", "cycle_count_id")
  REFERENCES "inv_cycle_counts" ("org_id", "id")
  NOT VALID;

ALTER TABLE "inv_cycle_count_lines" VALIDATE CONSTRAINT "fk_inv_ccl_org_count";
ALTER TABLE "inv_cycle_count_lines" VALIDATE CONSTRAINT "fk_inv_ccl_lot";
```

**Repair query:**
```sql
SELECT ccl.id FROM inv_cycle_count_lines ccl
JOIN inv_cycle_counts cc ON cc.id = ccl.cycle_count_id
WHERE ccl.org_id <> cc.org_id;
```

**Pre-requires:** Step A-5; `inv_cycle_counts` `UNIQUE(org_id, id)` — Step D-12.

---

> `inv_physical_audit_lines`, `inv_quality_inspection_lines`, `inv_recall_lines`, and `inv_quality_holds` also follow the exact same B-pattern (add `org_id`, backfill, composite FK to respective parent) with lot/serial C-promotions. They are omitted here for brevity; the pattern is identical to B-9/B-10. The parent tables they reference need `UNIQUE(org_id, id)` added under Step D before their line FKs can land.

---

## Step C — Wire bare integer FK columns (no `.references()` today)

These columns exist in the schema as plain `integer("col")` with no Drizzle `.references()` call and no database FK constraint. The repair query must return 0 rows before the NOT VALID constraint is added.

### C-1. `inv_locations.parentLocationId` — self-ref FK

**Drizzle diff** (`backend/src/db/schema/inventory/warehouses.ts`):
```ts
// BEFORE:
parentLocationId: integer("parent_location_id"),

// AFTER:
parentLocationId: integer("parent_location_id").references(() => invLocations.id, { onDelete: "set null" }),
```

**Generated SQL:**
```sql
ALTER TABLE "inv_locations"
  ADD CONSTRAINT "fk_inv_locations_parent"
  FOREIGN KEY ("parent_location_id") REFERENCES "inv_locations" ("id")
  ON DELETE SET NULL NOT VALID;

ALTER TABLE "inv_locations" VALIDATE CONSTRAINT "fk_inv_locations_parent";
```

**Repair:**
```sql
SELECT id FROM inv_locations l
WHERE parent_location_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM inv_locations p
    WHERE p.id = l.parent_location_id AND p.org_id = l.org_id
  );
-- Cross-org self-refs: UPDATE inv_locations SET parent_location_id = NULL WHERE id IN (...);
```

---

### C-2. `inv_shipments.soId` — bare integer, no FK to `inv_sales_orders`

**Drizzle diff** (`backend/src/db/schema/inventory/shipping.ts`):
```ts
// BEFORE:
soId: integer("so_id"),

// AFTER:
soId: integer("so_id").references(() => invSalesOrders.id, { onDelete: "set null" }),
```

**Generated SQL:**
```sql
ALTER TABLE "inv_shipments"
  ADD CONSTRAINT "fk_inv_shipments_so"
  FOREIGN KEY ("so_id") REFERENCES "inv_sales_orders" ("id")
  ON DELETE SET NULL NOT VALID;

ALTER TABLE "inv_shipments" VALIDATE CONSTRAINT "fk_inv_shipments_so";
```

**Repair:**
```sql
SELECT id FROM inv_shipments s
WHERE so_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM inv_sales_orders so WHERE so.id = s.so_id AND so.org_id = s.org_id);
-- Quarantine: UPDATE inv_shipments SET so_id = NULL WHERE id IN (...);
```

---

### C-3. `inv_vendor_returns` — `vendorId`, `poId`, `grnId` (3 missing FKs)

**Drizzle diff** (`backend/src/db/schema/inventory/operations.ts`):
```ts
// BEFORE:
vendorId: integer("vendor_id").notNull(),
poId: integer("po_id"),
grnId: integer("grn_id"),

// AFTER:
vendorId: integer("vendor_id").references(() => invVendors.id, { onDelete: "restrict" }).notNull(),
poId: integer("po_id").references(() => invPurchaseOrders.id, { onDelete: "set null" }),
grnId: integer("grn_id").references(() => invGrns.id, { onDelete: "set null" }),
```

**Generated SQL:**
```sql
ALTER TABLE "inv_vendor_returns"
  ADD CONSTRAINT "fk_inv_vret_vendor"
  FOREIGN KEY ("vendor_id") REFERENCES "inv_vendors" ("id") ON DELETE RESTRICT NOT VALID;
ALTER TABLE "inv_vendor_returns"
  ADD CONSTRAINT "fk_inv_vret_po"
  FOREIGN KEY ("po_id") REFERENCES "inv_purchase_orders" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_vendor_returns"
  ADD CONSTRAINT "fk_inv_vret_grn"
  FOREIGN KEY ("grn_id") REFERENCES "inv_grns" ("id") ON DELETE SET NULL NOT VALID;

ALTER TABLE "inv_vendor_returns" VALIDATE CONSTRAINT "fk_inv_vret_vendor";
ALTER TABLE "inv_vendor_returns" VALIDATE CONSTRAINT "fk_inv_vret_po";
ALTER TABLE "inv_vendor_returns" VALIDATE CONSTRAINT "fk_inv_vret_grn";
```

**Repair:**
```sql
SELECT id FROM inv_vendor_returns vr
WHERE NOT EXISTS (SELECT 1 FROM inv_vendors v WHERE v.id = vr.vendor_id AND v.org_id = vr.org_id);
```

---

### C-4. `inv_customer_returns` — `soId`, `shipmentId`, `clientId` (3 missing FKs)

**Drizzle diff** (`backend/src/db/schema/inventory/operations.ts`):
```ts
// BEFORE:
soId: integer("so_id"),
shipmentId: integer("shipment_id"),
clientId: integer("client_id"),

// AFTER:
soId: integer("so_id").references(() => invSalesOrders.id, { onDelete: "set null" }),
shipmentId: integer("shipment_id").references(() => invShipments.id, { onDelete: "set null" }),
clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
```

**Generated SQL:**
```sql
ALTER TABLE "inv_customer_returns"
  ADD CONSTRAINT "fk_inv_cret_so"
  FOREIGN KEY ("so_id") REFERENCES "inv_sales_orders" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_customer_returns"
  ADD CONSTRAINT "fk_inv_cret_shipment"
  FOREIGN KEY ("shipment_id") REFERENCES "inv_shipments" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_customer_returns"
  ADD CONSTRAINT "fk_inv_cret_client"
  FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE SET NULL NOT VALID;

ALTER TABLE "inv_customer_returns" VALIDATE CONSTRAINT "fk_inv_cret_so";
ALTER TABLE "inv_customer_returns" VALIDATE CONSTRAINT "fk_inv_cret_shipment";
ALTER TABLE "inv_customer_returns" VALIDATE CONSTRAINT "fk_inv_cret_client";
```

**Repair:**
```sql
SELECT id FROM inv_customer_returns cr
WHERE client_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = cr.client_id AND c.org_id = cr.org_id);
```

---

### C-5. `inv_pick_lists.soId` — bare integer, no FK

**Drizzle diff** (`backend/src/db/schema/inventory/operations.ts`):
```ts
// BEFORE:
soId: integer("so_id"),

// AFTER:
soId: integer("so_id").references(() => invSalesOrders.id, { onDelete: "set null" }),
```

**Generated SQL:**
```sql
ALTER TABLE "inv_pick_lists"
  ADD CONSTRAINT "fk_inv_pick_lists_so"
  FOREIGN KEY ("so_id") REFERENCES "inv_sales_orders" ("id") ON DELETE SET NULL NOT VALID;

ALTER TABLE "inv_pick_lists" VALIDATE CONSTRAINT "fk_inv_pick_lists_so";
```

**Repair:**
```sql
SELECT id FROM inv_pick_lists pl
WHERE so_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM inv_sales_orders so WHERE so.id = pl.so_id AND so.org_id = pl.org_id);
```

---

### C-6. `inv_cycle_counts.categoryId` — bare integer, no FK

**Drizzle diff** (`backend/src/db/schema/inventory/operations.ts`):
```ts
// BEFORE:
categoryId: integer("category_id"),

// AFTER:
categoryId: integer("category_id").references(() => invCategories.id, { onDelete: "set null" }),
```

**Generated SQL:**
```sql
ALTER TABLE "inv_cycle_counts"
  ADD CONSTRAINT "fk_inv_cc_category"
  FOREIGN KEY ("category_id") REFERENCES "inv_categories" ("id") ON DELETE SET NULL NOT VALID;

ALTER TABLE "inv_cycle_counts" VALIDATE CONSTRAINT "fk_inv_cc_category";
```

---

### C-7. `inv_serial_numbers.lotId` — bare integer, no FK

**Drizzle diff** (`backend/src/db/schema/inventory/traceability.ts`):
```ts
// BEFORE:
lotId: integer("lot_id"),

// AFTER:
lotId: integer("lot_id").references(() => invLots.id, { onDelete: "set null" }),
```

**Generated SQL:**
```sql
ALTER TABLE "inv_serial_numbers"
  ADD CONSTRAINT "fk_inv_serials_lot"
  FOREIGN KEY ("lot_id") REFERENCES "inv_lots" ("id") ON DELETE SET NULL NOT VALID;

ALTER TABLE "inv_serial_numbers" VALIDATE CONSTRAINT "fk_inv_serials_lot";
```

**Repair:**
```sql
SELECT id FROM inv_serial_numbers sn
WHERE lot_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM inv_lots l WHERE l.id = sn.lot_id AND l.org_id = sn.org_id);
```

---

### C-8. `inv_reorder_rules.vendorId` — bare integer, no FK

**Drizzle diff** (`backend/src/db/schema/inventory/planning.ts`):
```ts
// BEFORE:
vendorId: integer("vendor_id"),

// AFTER:
vendorId: integer("vendor_id").references(() => invVendors.id, { onDelete: "set null" }),
```

**Generated SQL:**
```sql
ALTER TABLE "inv_reorder_rules"
  ADD CONSTRAINT "fk_inv_reorder_vendor"
  FOREIGN KEY ("vendor_id") REFERENCES "inv_vendors" ("id") ON DELETE SET NULL NOT VALID;

ALTER TABLE "inv_reorder_rules" VALIDATE CONSTRAINT "fk_inv_reorder_vendor";
```

---

### C-9. `inv_stock_levels` — `lotId`, `serialId` bare integers

**Drizzle diff** (`backend/src/db/schema/inventory/stock.ts`):
```ts
// BEFORE:
lotId: integer("lot_id"),
serialId: integer("serial_id"),

// AFTER:
lotId: integer("lot_id").references(() => invLots.id, { onDelete: "set null" }),
serialId: integer("serial_id").references(() => invSerialNumbers.id, { onDelete: "set null" }),
```

**Generated SQL:**
```sql
ALTER TABLE "inv_stock_levels"
  ADD CONSTRAINT "fk_inv_stock_levels_lot"
  FOREIGN KEY ("lot_id") REFERENCES "inv_lots" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_stock_levels"
  ADD CONSTRAINT "fk_inv_stock_levels_serial"
  FOREIGN KEY ("serial_id") REFERENCES "inv_serial_numbers" ("id") ON DELETE SET NULL NOT VALID;

ALTER TABLE "inv_stock_levels" VALIDATE CONSTRAINT "fk_inv_stock_levels_lot";
ALTER TABLE "inv_stock_levels" VALIDATE CONSTRAINT "fk_inv_stock_levels_serial";
```

---

### C-10. `inv_stock_transactions` — `lotId`, `serialId` bare integers

**Drizzle diff** (`backend/src/db/schema/inventory/stock.ts`):
```ts
// BEFORE:
lotId: integer("lot_id"),
serialId: integer("serial_id"),

// AFTER:
lotId: integer("lot_id").references(() => invLots.id, { onDelete: "set null" }),
serialId: integer("serial_id").references(() => invSerialNumbers.id, { onDelete: "set null" }),
```

**Generated SQL:**
```sql
ALTER TABLE "inv_stock_transactions"
  ADD CONSTRAINT "fk_inv_txn_lot"
  FOREIGN KEY ("lot_id") REFERENCES "inv_lots" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_stock_transactions"
  ADD CONSTRAINT "fk_inv_txn_serial"
  FOREIGN KEY ("serial_id") REFERENCES "inv_serial_numbers" ("id") ON DELETE SET NULL NOT VALID;

ALTER TABLE "inv_stock_transactions" VALIDATE CONSTRAINT "fk_inv_txn_lot";
ALTER TABLE "inv_stock_transactions" VALIDATE CONSTRAINT "fk_inv_txn_serial";
```

---

### C-11. `inv_stock_reservations` — `lotId`, `serialId` bare integers

**Drizzle diff** (`backend/src/db/schema/inventory/reservations.ts`):
```ts
// BEFORE:
lotId: integer("lot_id"),
serialId: integer("serial_id"),

// AFTER:
lotId: integer("lot_id").references(() => invLots.id, { onDelete: "set null" }),
serialId: integer("serial_id").references(() => invSerialNumbers.id, { onDelete: "set null" }),
```

**Generated SQL:**
```sql
ALTER TABLE "inv_stock_reservations"
  ADD CONSTRAINT "fk_inv_res_lot"
  FOREIGN KEY ("lot_id") REFERENCES "inv_lots" ("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "inv_stock_reservations"
  ADD CONSTRAINT "fk_inv_res_serial"
  FOREIGN KEY ("serial_id") REFERENCES "inv_serial_numbers" ("id") ON DELETE SET NULL NOT VALID;

ALTER TABLE "inv_stock_reservations" VALIDATE CONSTRAINT "fk_inv_res_lot";
ALTER TABLE "inv_stock_reservations" VALIDATE CONSTRAINT "fk_inv_res_serial";
```

---

### C-12. `inv_quality_holds` — `lotId`, `serialId` bare integers

Same pattern as C-11 but on `inv_quality_holds` in `quality.ts`.

---

### C-13. Lot/serial bare FKs in remaining line tables

The following tables have `lot_id` and/or `serial_id` as bare integers (already shown in B-sections above where `org_id` is also being added simultaneously). Listed here for completeness — they are combined into the B-step migration for each table:

| Table | Bare columns | Source |
|---|---|---|
| `inv_vendor_return_lines` | `lot_id`, `serial_id` | B-9 |
| `inv_customer_return_lines` | `lot_id`, `serial_id` | B-10 |
| `inv_shipment_lines` | `lot_id`, `serial_id`, `so_line_id` | B-6 |
| `inv_package_lines` | `lot_id`, `serial_id` | B-7 |
| `inv_pick_list_lines` | `lot_id`, `serial_id`, `so_line_id` | B-11 |
| `inv_cycle_count_lines` | `lot_id` | B-12 |
| `inv_physical_audit_lines` | `lot_id` | (follows B-pattern) |
| `inv_quality_inspection_lines` | `lot_id`, `serial_id` | (follows B-pattern) |
| `inv_recall_lines` | `lot_id`, `serial_id` | (follows B-pattern) |
| `inv_stock_transfer_lines` | `lot_id`, `serial_id` | B-5 |

---

## Step D — Composite FKs on header tables (already have `org_id`)

These tables already have `org_id text NOT NULL`. They need:
1. A `UNIQUE(org_id, id)` candidate key on the parent (many already added in Step A; the rest are added here).
2. A `foreignKey(...)` composite FK constraint replacing or augmenting the existing single-col `.references()`.

---

### D-1. `inv_locations` — composite FK `(org_id, warehouse_id) → inv_warehouses`

**Drizzle diff** (`backend/src/db/schema/inventory/warehouses.ts`):
```ts
// BEFORE:
warehouseId: integer("warehouse_id").references(() => invWarehouses.id, { onDelete: "cascade" }).notNull(),

// AFTER: keep existing single-col reference; ADD composite FK alongside it
// (Drizzle supports both — the single-col ref gives you the column-level reference,
//  the foreignKey() gives you the composite constraint)
(table) => [
  uniqueIndex("uniq_inv_locations_warehouse_code").on(table.warehouseId, table.code),
  uniqueIndex("uniq_inv_locations_org_id").on(table.orgId, table.id),
  foreignKey({
    columns: [table.orgId, table.warehouseId],
    foreignColumns: [invWarehouses.orgId, invWarehouses.id],
    name: "fk_inv_locations_org_warehouse",
  }),
  // ... existing indexes
]
```

**Generated SQL:**
```sql
ALTER TABLE "inv_locations"
  ADD CONSTRAINT "fk_inv_locations_org_warehouse"
  FOREIGN KEY ("org_id", "warehouse_id")
  REFERENCES "inv_warehouses" ("org_id", "id")
  NOT VALID;

ALTER TABLE "inv_locations" VALIDATE CONSTRAINT "fk_inv_locations_org_warehouse";
```

**Pre-requires:** Step A-1 (`inv_warehouses UNIQUE(org_id, id)`).

---

### D-2. `inv_purchase_orders` — candidate key + composite FKs

Add `UNIQUE(org_id, id)` to `inv_purchase_orders` (required before `inv_po_lines` and `inv_grns` can composite-FK to it). Then add composite FKs to `inv_vendors` and `inv_warehouses`.

**Drizzle diff** (`backend/src/db/schema/inventory/purchase-orders.ts`):
```ts
(table) => [
  uniqueIndex("uniq_inv_po_org_number").on(table.orgId, table.poNumber),
  uniqueIndex("uniq_inv_po_org_id").on(table.orgId, table.id),          // NEW candidate key
  foreignKey({
    columns: [table.orgId, table.vendorId],
    foreignColumns: [invVendors.orgId, invVendors.id],
    name: "fk_inv_po_org_vendor",
  }),
  foreignKey({
    columns: [table.orgId, table.warehouseId],
    foreignColumns: [invWarehouses.orgId, invWarehouses.id],
    name: "fk_inv_po_org_warehouse",
  }),
  // existing indexes
]
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_po_org_id"
  ON "inv_purchase_orders" ("org_id", "id");

ALTER TABLE "inv_purchase_orders"
  ADD CONSTRAINT "fk_inv_po_org_vendor"
  FOREIGN KEY ("org_id", "vendor_id")
  REFERENCES "inv_vendors" ("org_id", "id")
  NOT VALID;
ALTER TABLE "inv_purchase_orders"
  ADD CONSTRAINT "fk_inv_po_org_warehouse"
  FOREIGN KEY ("org_id", "warehouse_id")
  REFERENCES "inv_warehouses" ("org_id", "id")
  NOT VALID;

ALTER TABLE "inv_purchase_orders" VALIDATE CONSTRAINT "fk_inv_po_org_vendor";
ALTER TABLE "inv_purchase_orders" VALIDATE CONSTRAINT "fk_inv_po_org_warehouse";
```

**Repair:**
```sql
SELECT id FROM inv_purchase_orders po
WHERE NOT EXISTS (SELECT 1 FROM inv_vendors v WHERE v.id = po.vendor_id AND v.org_id = po.org_id);
```

---

### D-3. `inv_grns` — candidate key + composite FKs

```ts
(table) => [
  uniqueIndex("uniq_inv_grn_org_number").on(table.orgId, table.grnNumber),
  uniqueIndex("uniq_inv_grn_org_id").on(table.orgId, table.id),           // NEW
  foreignKey({
    columns: [table.orgId, table.poId],
    foreignColumns: [invPurchaseOrders.orgId, invPurchaseOrders.id],
    name: "fk_inv_grn_org_po",
  }),
  foreignKey({
    columns: [table.orgId, table.locationId],
    foreignColumns: [invLocations.orgId, invLocations.id],
    name: "fk_inv_grn_org_location",
  }),
  // existing indexes
]
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_grn_org_id"
  ON "inv_grns" ("org_id", "id");

ALTER TABLE "inv_grns"
  ADD CONSTRAINT "fk_inv_grn_org_po"
  FOREIGN KEY ("org_id", "po_id") REFERENCES "inv_purchase_orders" ("org_id", "id") NOT VALID;
ALTER TABLE "inv_grns"
  ADD CONSTRAINT "fk_inv_grn_org_location"
  FOREIGN KEY ("org_id", "location_id") REFERENCES "inv_locations" ("org_id", "id") NOT VALID;

ALTER TABLE "inv_grns" VALIDATE CONSTRAINT "fk_inv_grn_org_po";
ALTER TABLE "inv_grns" VALIDATE CONSTRAINT "fk_inv_grn_org_location";
```

**Pre-requires:** Steps A-1 (warehouses), A-2 (locations), D-2 (purchase orders candidate key).

---

### D-4. `inv_sales_orders` — candidate key + composite FKs

```ts
(table) => [
  uniqueIndex("uniq_inv_so_org_number").on(table.orgId, table.soNumber),
  uniqueIndex("uniq_inv_so_org_id").on(table.orgId, table.id),           // NEW
  foreignKey({
    columns: [table.orgId, table.warehouseId],
    foreignColumns: [invWarehouses.orgId, invWarehouses.id],
    name: "fk_inv_so_org_warehouse",
  }),
  // client_id and invoice_id FKs remain single-col (cross-module parents not yet composite-key ready)
  // existing indexes
]
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_so_org_id"
  ON "inv_sales_orders" ("org_id", "id");

ALTER TABLE "inv_sales_orders"
  ADD CONSTRAINT "fk_inv_so_org_warehouse"
  FOREIGN KEY ("org_id", "warehouse_id") REFERENCES "inv_warehouses" ("org_id", "id") NOT VALID;

ALTER TABLE "inv_sales_orders" VALIDATE CONSTRAINT "fk_inv_so_org_warehouse";
```

---

### D-5. `inv_stock_transfers` — candidate key + composite FKs (×4)

```ts
(table) => [
  index("idx_inv_transfer_org_ref").on(table.orgId, table.referenceNumber),
  index("idx_inv_transfers_org_status").on(table.orgId, table.status),
  uniqueIndex("uniq_inv_stock_transfers_org_id").on(table.orgId, table.id),  // NEW
  foreignKey({
    columns: [table.orgId, table.fromLocationId],
    foreignColumns: [invLocations.orgId, invLocations.id],
    name: "fk_inv_transfer_org_from_loc",
  }),
  foreignKey({
    columns: [table.orgId, table.toLocationId],
    foreignColumns: [invLocations.orgId, invLocations.id],
    name: "fk_inv_transfer_org_to_loc",
  }),
  foreignKey({
    columns: [table.orgId, table.fromWarehouseId],
    foreignColumns: [invWarehouses.orgId, invWarehouses.id],
    name: "fk_inv_transfer_org_from_wh",
  }),
  foreignKey({
    columns: [table.orgId, table.toWarehouseId],
    foreignColumns: [invWarehouses.orgId, invWarehouses.id],
    name: "fk_inv_transfer_org_to_wh",
  }),
]
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_stock_transfers_org_id"
  ON "inv_stock_transfers" ("org_id", "id");

ALTER TABLE "inv_stock_transfers"
  ADD CONSTRAINT "fk_inv_transfer_org_from_loc"
  FOREIGN KEY ("org_id", "from_location_id") REFERENCES "inv_locations" ("org_id", "id") NOT VALID;
ALTER TABLE "inv_stock_transfers"
  ADD CONSTRAINT "fk_inv_transfer_org_to_loc"
  FOREIGN KEY ("org_id", "to_location_id") REFERENCES "inv_locations" ("org_id", "id") NOT VALID;
ALTER TABLE "inv_stock_transfers"
  ADD CONSTRAINT "fk_inv_transfer_org_from_wh"
  FOREIGN KEY ("org_id", "from_warehouse_id") REFERENCES "inv_warehouses" ("org_id", "id") NOT VALID;
ALTER TABLE "inv_stock_transfers"
  ADD CONSTRAINT "fk_inv_transfer_org_to_wh"
  FOREIGN KEY ("org_id", "to_warehouse_id") REFERENCES "inv_warehouses" ("org_id", "id") NOT VALID;

ALTER TABLE "inv_stock_transfers" VALIDATE CONSTRAINT "fk_inv_transfer_org_from_loc";
ALTER TABLE "inv_stock_transfers" VALIDATE CONSTRAINT "fk_inv_transfer_org_to_loc";
ALTER TABLE "inv_stock_transfers" VALIDATE CONSTRAINT "fk_inv_transfer_org_from_wh";
ALTER TABLE "inv_stock_transfers" VALIDATE CONSTRAINT "fk_inv_transfer_org_to_wh";
```

---

### D-6. `inv_shipments` — candidate key + composite FKs

```ts
(table) => [
  uniqueIndex("uniq_inv_shipments_org_number").on(table.orgId, table.shipmentNumber),
  uniqueIndex("uniq_inv_shipments_org_id").on(table.orgId, table.id),     // NEW
  foreignKey({
    columns: [table.orgId, table.soId],
    foreignColumns: [invSalesOrders.orgId, invSalesOrders.id],
    name: "fk_inv_shipments_org_so",
  }),
  foreignKey({
    columns: [table.orgId, table.warehouseId],
    foreignColumns: [invWarehouses.orgId, invWarehouses.id],
    name: "fk_inv_shipments_org_warehouse",
  }),
  foreignKey({
    columns: [table.orgId, table.carrierId],
    foreignColumns: [invCarriers.orgId, invCarriers.id],
    name: "fk_inv_shipments_org_carrier",
  }),
  // existing indexes
]
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_shipments_org_id"
  ON "inv_shipments" ("org_id", "id");

-- Carrier candidate key (needed for composite FK above):
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_carriers_org_id"
  ON "inv_carriers" ("org_id", "id");

ALTER TABLE "inv_shipments"
  ADD CONSTRAINT "fk_inv_shipments_org_so"
  FOREIGN KEY ("org_id", "so_id") REFERENCES "inv_sales_orders" ("org_id", "id") NOT VALID;
ALTER TABLE "inv_shipments"
  ADD CONSTRAINT "fk_inv_shipments_org_warehouse"
  FOREIGN KEY ("org_id", "warehouse_id") REFERENCES "inv_warehouses" ("org_id", "id") NOT VALID;
ALTER TABLE "inv_shipments"
  ADD CONSTRAINT "fk_inv_shipments_org_carrier"
  FOREIGN KEY ("org_id", "carrier_id") REFERENCES "inv_carriers" ("org_id", "id") NOT VALID;

ALTER TABLE "inv_shipments" VALIDATE CONSTRAINT "fk_inv_shipments_org_so";
ALTER TABLE "inv_shipments" VALIDATE CONSTRAINT "fk_inv_shipments_org_warehouse";
ALTER TABLE "inv_shipments" VALIDATE CONSTRAINT "fk_inv_shipments_org_carrier";
```

**Note:** `inv_carriers.UNIQUE(org_id, id)` is added inline here (it has no step of its own since `inv_carriers` is a leaf with no existing children outside `inv_shipments` and `inv_loads`).

---

### D-7. `inv_packages` — candidate key + composite FK to `inv_shipments`

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_packages_org_id"
  ON "inv_packages" ("org_id", "id");

ALTER TABLE "inv_packages"
  ADD CONSTRAINT "fk_inv_packages_org_shipment"
  FOREIGN KEY ("org_id", "shipment_id") REFERENCES "inv_shipments" ("org_id", "id") NOT VALID;

ALTER TABLE "inv_packages" VALIDATE CONSTRAINT "fk_inv_packages_org_shipment";
```

---

### D-8. `inv_loads` — candidate key + composite FKs to `inv_warehouses`, `inv_carriers`

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_loads_org_id"
  ON "inv_loads" ("org_id", "id");

ALTER TABLE "inv_loads"
  ADD CONSTRAINT "fk_inv_loads_org_warehouse"
  FOREIGN KEY ("org_id", "source_warehouse_id") REFERENCES "inv_warehouses" ("org_id", "id") NOT VALID;
ALTER TABLE "inv_loads"
  ADD CONSTRAINT "fk_inv_loads_org_carrier"
  FOREIGN KEY ("org_id", "carrier_id") REFERENCES "inv_carriers" ("org_id", "id") NOT VALID;

ALTER TABLE "inv_loads" VALIDATE CONSTRAINT "fk_inv_loads_org_warehouse";
ALTER TABLE "inv_loads" VALIDATE CONSTRAINT "fk_inv_loads_org_carrier";
```

---

### D-9. `inv_vendor_returns` — candidate key + composite FKs (after C-3 lands)

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_vendor_returns_org_id"
  ON "inv_vendor_returns" ("org_id", "id");

ALTER TABLE "inv_vendor_returns"
  ADD CONSTRAINT "fk_inv_vret_org_vendor"
  FOREIGN KEY ("org_id", "vendor_id") REFERENCES "inv_vendors" ("org_id", "id") NOT VALID;
ALTER TABLE "inv_vendor_returns"
  ADD CONSTRAINT "fk_inv_vret_org_po"
  FOREIGN KEY ("org_id", "po_id") REFERENCES "inv_purchase_orders" ("org_id", "id") NOT VALID;
ALTER TABLE "inv_vendor_returns"
  ADD CONSTRAINT "fk_inv_vret_org_grn"
  FOREIGN KEY ("org_id", "grn_id") REFERENCES "inv_grns" ("org_id", "id") NOT VALID;

ALTER TABLE "inv_vendor_returns" VALIDATE CONSTRAINT "fk_inv_vret_org_vendor";
ALTER TABLE "inv_vendor_returns" VALIDATE CONSTRAINT "fk_inv_vret_org_po";
ALTER TABLE "inv_vendor_returns" VALIDATE CONSTRAINT "fk_inv_vret_org_grn";
```

---

### D-10. `inv_customer_returns` — candidate key + composite FKs (after C-4 lands)

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_customer_returns_org_id"
  ON "inv_customer_returns" ("org_id", "id");

ALTER TABLE "inv_customer_returns"
  ADD CONSTRAINT "fk_inv_cret_org_so"
  FOREIGN KEY ("org_id", "so_id") REFERENCES "inv_sales_orders" ("org_id", "id") NOT VALID;
ALTER TABLE "inv_customer_returns"
  ADD CONSTRAINT "fk_inv_cret_org_shipment"
  FOREIGN KEY ("org_id", "shipment_id") REFERENCES "inv_shipments" ("org_id", "id") NOT VALID;

ALTER TABLE "inv_customer_returns" VALIDATE CONSTRAINT "fk_inv_cret_org_so";
ALTER TABLE "inv_customer_returns" VALIDATE CONSTRAINT "fk_inv_cret_org_shipment";
```

Note: `client_id` composite FK requires `clients.UNIQUE(org_id, id)` — tracked separately in the CRM wave.

---

### D-11. `inv_pick_lists` — candidate key + composite FKs (after C-5 lands)

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_pick_lists_org_id"
  ON "inv_pick_lists" ("org_id", "id");

ALTER TABLE "inv_pick_lists"
  ADD CONSTRAINT "fk_inv_pick_lists_org_so"
  FOREIGN KEY ("org_id", "so_id") REFERENCES "inv_sales_orders" ("org_id", "id") NOT VALID;
ALTER TABLE "inv_pick_lists"
  ADD CONSTRAINT "fk_inv_pick_lists_org_warehouse"
  FOREIGN KEY ("org_id", "warehouse_id") REFERENCES "inv_warehouses" ("org_id", "id") NOT VALID;

ALTER TABLE "inv_pick_lists" VALIDATE CONSTRAINT "fk_inv_pick_lists_org_so";
ALTER TABLE "inv_pick_lists" VALIDATE CONSTRAINT "fk_inv_pick_lists_org_warehouse";
```

---

### D-12. `inv_cycle_counts` — candidate key + composite FKs (after C-6 lands)

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_cycle_counts_org_id"
  ON "inv_cycle_counts" ("org_id", "id");

ALTER TABLE "inv_cycle_counts"
  ADD CONSTRAINT "fk_inv_cc_org_warehouse"
  FOREIGN KEY ("org_id", "warehouse_id") REFERENCES "inv_warehouses" ("org_id", "id") NOT VALID;
ALTER TABLE "inv_cycle_counts"
  ADD CONSTRAINT "fk_inv_cc_org_location"
  FOREIGN KEY ("org_id", "location_id") REFERENCES "inv_locations" ("org_id", "id") NOT VALID;

ALTER TABLE "inv_cycle_counts" VALIDATE CONSTRAINT "fk_inv_cc_org_warehouse";
ALTER TABLE "inv_cycle_counts" VALIDATE CONSTRAINT "fk_inv_cc_org_location";
```

Note: `category_id` composite FK requires `inv_categories.UNIQUE(org_id, id)` — add to `inv_categories` constraints alongside this.

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uniq_inv_categories_org_id"
  ON "inv_categories" ("org_id", "id");
```

---

### D-13. Remaining tables with `org_id` — candidate keys + single composite FKs

The following tables already have `org_id NOT NULL` and intra-module parent FKs. Apply the same pattern: add `UNIQUE(org_id, id)` if the table is referenced by children, then add composite FK(s).

| Table | New candidate key | Composite FK added |
|---|---|---|
| `inv_physical_audits` | `UNIQUE(org_id, id)` | `(org_id, warehouse_id) → inv_warehouses` |
| `inv_quality_inspections` | `UNIQUE(org_id, id)` | none (sourceType/sourceId are polymorphic) |
| `inv_quality_holds` | — (leaf) | `(org_id, product_variant_id) → inv_product_variants`, `(org_id, location_id) → inv_locations` |
| `inv_recall_events` | `UNIQUE(org_id, id)` | none (leaf beyond org anchor) |
| `inv_stock_transactions` | `UNIQUE(org_id, id)` | `(org_id, product_variant_id) → inv_product_variants`, `(org_id, location_id) → inv_locations` |
| `inv_valuation_layers` | — (leaf) | `(org_id, product_variant_id) → inv_product_variants`, `(org_id, stock_transaction_id) → inv_stock_transactions` |
| `inv_stock_reservations` | — (leaf) | `(org_id, product_variant_id) → inv_product_variants`, `(org_id, warehouse_id) → inv_warehouses`, `(org_id, location_id) → inv_locations` |
| `inv_reorder_rules` | — (leaf) | `(org_id, product_variant_id) → inv_product_variants`, `(org_id, warehouse_id) → inv_warehouses` |
| `inv_channel_stock_publications` | — (leaf) | `(org_id, channel_id) → inv_channels`, `(org_id, product_variant_id) → inv_product_variants` |
| `inv_webhooks` | `UNIQUE(org_id, id)` | — |
| `inv_webhook_events` | — (leaf) | `(org_id, webhook_id) → inv_webhooks` |
| `inv_lots` | already done Step A-5 | `(org_id, product_variant_id) → inv_product_variants` |
| `inv_serial_numbers` | already done Step A-6 | `(org_id, product_variant_id) → inv_product_variants`, `(org_id, current_location_id) → inv_locations` |

SQL for each follows the exact NOT VALID → VALIDATE pattern shown above for D-2 through D-12. Not expanded here to avoid repetition; the constraint name convention is `fk_<table_abbreviation>_org_<col>`.

---

## Execution order summary

```
Step A (all 6 concurrently, no deps):
  A-1 inv_warehouses UNIQUE(org_id,id)
  A-2 inv_locations UNIQUE(org_id,id)
  A-3 inv_product_variants UNIQUE(org_id,id)
  A-4 inv_vendors UNIQUE(org_id,id)
  A-5 inv_lots UNIQUE(org_id,id)
  A-6 inv_serial_numbers UNIQUE(org_id,id)

Step D (parent candidate keys + composite FKs on header tables):
  D-1 inv_locations composite FK → inv_warehouses  [needs A-1]
  D-2 inv_purchase_orders UNIQUE(org_id,id) + composite FKs  [needs A-1, A-4]
  D-3 inv_grns UNIQUE(org_id,id) + composite FKs  [needs A-1, A-2, D-2]
  D-4 inv_sales_orders UNIQUE(org_id,id) + composite FK  [needs A-1]
  D-5 inv_stock_transfers UNIQUE(org_id,id) + composite FKs  [needs A-1, A-2]
  D-6 inv_shipments UNIQUE(org_id,id) + composite FKs  [needs A-1, D-4; add carriers key here]
  D-7 inv_packages UNIQUE(org_id,id) + composite FK  [needs D-6]
  D-8 inv_loads UNIQUE(org_id,id) + composite FKs  [needs A-1; D-6 carrier key]
  D-9 inv_vendor_returns UNIQUE(org_id,id) + composite FKs  [needs A-4, D-2, D-3; C-3 first]
  D-10 inv_customer_returns UNIQUE(org_id,id) + composite FKs  [needs D-4, D-6; C-4 first]
  D-11 inv_pick_lists UNIQUE(org_id,id) + composite FKs  [needs A-1, D-4; C-5 first]
  D-12 inv_cycle_counts UNIQUE(org_id,id) + composite FKs  [needs A-1, A-2; C-6 first]
  D-13 remaining tables  [needs all Step A + relevant D parents]

Step C (bare FK promotions — most can run in parallel after Step A):
  C-1  inv_locations.parentLocationId  [A-2]
  C-2  inv_shipments.so_id  [D-4]
  C-3  inv_vendor_returns 3 FKs  [A-4, D-2, D-3]
  C-4  inv_customer_returns 3 FKs  [D-4, D-6]
  C-5  inv_pick_lists.so_id  [D-4]
  C-6  inv_cycle_counts.categoryId  [D-12 parent]
  C-7  inv_serial_numbers.lotId  [A-5]
  C-8  inv_reorder_rules.vendorId  [A-4]
  C-9  inv_stock_levels lot/serial  [A-5, A-6]
  C-10 inv_stock_transactions lot/serial  [A-5, A-6]
  C-11 inv_stock_reservations lot/serial  [A-5, A-6]
  C-12 inv_quality_holds lot/serial  [A-5, A-6]
  C-13 remaining line-table lot/serial FKs  [A-5, A-6; done within B steps]

Step B (add org_id to line tables — after relevant D parents have candidate key):
  B-1  inv_po_lines  [D-2]
  B-2  inv_grn_lines  [D-3]
  B-3  inv_so_lines  [D-4]
  B-4  inv_stock_adjustment_lines  [needs inv_stock_adjustments UNIQUE(org_id,id)]
  B-5  inv_stock_transfer_lines  [D-5; A-5, A-6]
  B-6  inv_shipment_lines  [D-6; A-5, A-6; B-3]
  B-7  inv_package_lines  [D-7; A-5, A-6]
  B-8  inv_load_lines  [D-8]
  B-9  inv_vendor_return_lines  [D-9; A-5, A-6]
  B-10 inv_customer_return_lines  [D-10; A-5, A-6]
  B-11 inv_pick_list_lines  [D-11; A-5, A-6; B-3]
  B-12 inv_cycle_count_lines  [D-12; A-5]
```

---

## Wave 6 dependency note

`inv_vendors.client_id → clients.id` (integer) will be superseded by `party_id text → business_parties.(organization_id, party_id)` in Wave 6 (business-party foundation). This patch does not touch `inv_vendors.client_id`. The composite FK from `inv_vendors` to `business_parties` will be specified in the Wave 6 patch spec after the column rename and type change land.

---

## Tables modified in this wave

| Step | Table | Change |
|---|---|---|
| A-1 | `inv_warehouses` | +UNIQUE(org_id,id) |
| A-2 | `inv_locations` | +UNIQUE(org_id,id) |
| A-3 | `inv_product_variants` | +UNIQUE(org_id,id) |
| A-4 | `inv_vendors` | +UNIQUE(org_id,id) |
| A-5 | `inv_lots` | +UNIQUE(org_id,id) |
| A-6 | `inv_serial_numbers` | +UNIQUE(org_id,id) |
| B-1 | `inv_po_lines` | +org_id, +composite FK |
| B-2 | `inv_grn_lines` | +org_id, +composite FK |
| B-3 | `inv_so_lines` | +org_id, +composite FK |
| B-4 | `inv_stock_adjustment_lines` | +org_id, +composite FK |
| B-5 | `inv_stock_transfer_lines` | +org_id, +composite FK, +lot/serial FKs |
| B-6 | `inv_shipment_lines` | +org_id, +composite FK, +so_line/lot/serial FKs |
| B-7 | `inv_package_lines` | +org_id, +composite FK, +lot/serial FKs |
| B-8 | `inv_load_lines` | +org_id, +composite FK, +transfer FK |
| B-9 | `inv_vendor_return_lines` | +org_id, +composite FK, +lot/serial FKs |
| B-10 | `inv_customer_return_lines` | +org_id, +composite FK, +lot/serial FKs |
| B-11 | `inv_pick_list_lines` | +org_id, +composite FK, +so_line/lot/serial FKs |
| B-12 | `inv_cycle_count_lines` | +org_id, +composite FK, +lot FK |
| C-1 | `inv_locations` | +parent self-ref FK |
| C-2 | `inv_shipments` | +so_id FK |
| C-3 | `inv_vendor_returns` | +vendor/po/grn FKs |
| C-4 | `inv_customer_returns` | +so/shipment/client FKs |
| C-5 | `inv_pick_lists` | +so_id FK |
| C-6 | `inv_cycle_counts` | +category FK |
| C-7 | `inv_serial_numbers` | +lot FK |
| C-8 | `inv_reorder_rules` | +vendor FK |
| C-9 | `inv_stock_levels` | +lot/serial FKs |
| C-10 | `inv_stock_transactions` | +lot/serial FKs |
| C-11 | `inv_stock_reservations` | +lot/serial FKs |
| C-12 | `inv_quality_holds` | +lot/serial FKs |
| D-1 | `inv_locations` | +composite FK → warehouses |
| D-2 | `inv_purchase_orders` | +UNIQUE(org_id,id), +composite FKs |
| D-3 | `inv_grns` | +UNIQUE(org_id,id), +composite FKs |
| D-4 | `inv_sales_orders` | +UNIQUE(org_id,id), +composite FK |
| D-5 | `inv_stock_transfers` | +UNIQUE(org_id,id), +composite FKs ×4 |
| D-6 | `inv_shipments` | +UNIQUE(org_id,id), +composite FKs ×3; +carriers UNIQUE |
| D-7 | `inv_packages` | +UNIQUE(org_id,id), +composite FK |
| D-8 | `inv_loads` | +UNIQUE(org_id,id), +composite FKs |
| D-9 | `inv_vendor_returns` | +UNIQUE(org_id,id), +composite FKs ×3 |
| D-10 | `inv_customer_returns` | +UNIQUE(org_id,id), +composite FKs |
| D-11 | `inv_pick_lists` | +UNIQUE(org_id,id), +composite FKs |
| D-12 | `inv_cycle_counts` | +UNIQUE(org_id,id), +composite FKs; +categories UNIQUE |
| D-13 | 13 remaining tables | +UNIQUE(org_id,id) and/or composite FKs per table |
