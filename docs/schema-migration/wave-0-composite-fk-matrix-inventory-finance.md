---
wave: 0
type: composite-FK matrix (inventory + finance + accounting)
status: DRAFT
date: 2026-07-26
covers: inventory/* (15 schema files), finance-ar-ap.ts, finance-assets.ts, finance-banking.ts, finance-expenses.ts, finance-planning.ts, finance-tax.ts, accounting.ts, accounting-core.ts
excludes: inventory-core tables already listed in wave-7-composite-fk-matrix.md (inv_uom, inv_categories, inv_products, inv_product_variants, inv_vendors, inv_warehouses, inv_locations, inv_stock_levels, inv_stock_transactions)
---

# Wave 0 — Composite-FK gate matrix: Inventory + Finance + Accounting

> Extension of `wave-7-composite-fk-matrix.md` covering domains not fully treated there.
> Wave-7 listed inventory and finance under W7-F/W7-H but only inventoried
> ~9 inv_core tables. This document covers the remaining ~74 tables across
> inventory sub-modules, all finance-* files, and the accounting cluster.
> **Do not duplicate rows already in wave-7-composite-fk-matrix.md.**

---

## Reading the columns

| Column | Meaning |
|---|---|
| Child table | Physical Postgres table name |
| Child col(s) | Column(s) forming the tenant-scoped FK |
| Parent table / key | Target (table.col or composite) |
| org_id present? | Yes/No + nullability |
| Existing ID type | serial (int4) / text / uuid |
| Target ID type | What the plan wants post-migration |
| Type match | ✔ types already match · ❌ mismatch must be resolved first |
| Candidate key on parent | Does parent have `UNIQUE(org_id, id)`? |
| Composite FK needed | The `foreignKey({columns:[org_id,child_col], foreignColumns:[parent.org_id,parent.id]})` call |
| Nullability | NOT NULL / nullable child col |
| Repair sketch | SQL to find invalid cross-tenant rows before applying FK |
| Wave | W7-F (inventory+payroll) or W7-H (finance/accounting) |
| Validation | DRAFT / VERIFIED |
| Cutover owner | Team / squad |

---

## SECTION 1 — INVENTORY sub-modules

### 1-A. `inventory/warehouses.ts`

> `inv_warehouses` and `inv_locations` are parent-level tables; they must receive
> `UNIQUE(org_id, id)` candidate keys **before** any child composite FKs can land.

#### 1-A-1. `inv_warehouses`

| Field | Value |
|---|---|
| Child table | `inv_warehouses` |
| Child col(s) | `org_id` (root tenant FK), `branch_id` |
| Parent / key | `organizations.id` (org anchor) · `org_branches.branch_id` (branch) |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial (int4) for own PK; `org_id` text; `branch_id` text |
| Target ID type | serial PK stays; org_id text ✔; branch_id text ✔ |
| Type match | ✔ org_id text = organizations.id text · ✔ branch_id text = org_branches.id text |
| Candidate key on parent | `organizations`: has PK only — needs `UNIQUE(id)` (it IS the pk, sufficient for single-col FK); composite `UNIQUE(org_id,id)` needed on itself for children |
| Composite FK needed | Add `UNIQUE(org_id, id)` on `inv_warehouses` (for child tables); single-col `branch_id → org_branches.id` already present |
| Nullability | org_id NOT NULL · branch_id nullable |
| Repair sketch | `SELECT id FROM inv_warehouses wh WHERE branch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM org_branches ob WHERE ob.id = wh.branch_id AND ob.org_id = wh.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Note — missing composite candidate key:** `inv_warehouses` has `uniqueIndex("uniq_inv_warehouses_org_code")` on `(org_id, code)` but NO `UNIQUE(org_id, id)`. All child tables that FK to `(inv_warehouses.org_id, inv_warehouses.id)` are blocked until this is added.

#### 1-A-2. `inv_locations`

| Field | Value |
|---|---|
| Child table | `inv_locations` |
| Child col(s) | `org_id`, `warehouse_id`, `parent_location_id` |
| Parent / key | `organizations.id` · `inv_warehouses.(org_id,id)` · `inv_locations.(org_id,id)` (self) |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; org_id text; warehouse_id integer; parent_location_id integer nullable |
| Type match | ✔ org_id · ✔ warehouse_id int = inv_warehouses.id int · ✔ parent_location_id int = inv_locations.id int |
| Candidate key on parent | `inv_warehouses` needs `UNIQUE(org_id,id)` (see 1-A-1); `inv_locations` needs `UNIQUE(org_id,id)` (self-ref) |
| Composite FK needed | `foreignKey([org_id,warehouse_id] → [inv_warehouses.org_id,inv_warehouses.id])` · self-ref `foreignKey([org_id,parent_location_id] → [inv_locations.org_id,inv_locations.id])` |
| Nullability | warehouse_id NOT NULL · parent_location_id nullable |
| Repair sketch | `SELECT id FROM inv_locations l WHERE warehouse_id NOT IN (SELECT id FROM inv_warehouses wh WHERE wh.org_id = l.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Note — missing composite candidate key:** `inv_locations` needs `UNIQUE(org_id, id)` for downstream children (stock, reservations, pick lines, etc.).

---

### 1-B. `inventory/purchase-orders.ts`

#### 1-B-1. `inv_vendors`

> **Critical architectural gap:** `inv_vendors` has a `clientId → clients.id` single-col FK.
> The plan (Wave 6 / §6 business-party foundation) wants vendor counterparties to reference
> `business_parties` (party_type = VENDOR), not `clients`. This is a **cross-module architectural
> migration**, not just a composite-FK addition. Tracked here as a blocker.

| Field | Value |
|---|---|
| Child table | `inv_vendors` |
| Child col(s) | `org_id`, `client_id` |
| Parent / key | `organizations.id` · `clients.id` (current) → target: `business_parties.(organization_id, party_id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; client_id integer nullable |
| Target ID type | Keep serial PK; `client_id` to be replaced by `party_id text` referencing `business_parties` |
| Type match | ❌ ARCHITECTURAL MISMATCH — `clients.id` is integer serial; `business_parties.party_id` is text UUID. Column rename + type change required. |
| Candidate key on parent | `business_parties` already has `UNIQUE(organization_id, party_id)` per wave-7 compliant table list |
| Composite FK needed | Post-migration: `foreignKey([org_id,party_id] → [business_parties.organization_id,business_parties.party_id])` (rename org_id → organization_id not required; use alias in FK) |
| Nullability | client_id currently nullable → party_id nullable after migration |
| Repair sketch | After backfill: `SELECT id FROM inv_vendors v WHERE party_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM business_parties bp WHERE bp.party_id = v.party_id AND bp.organization_id = v.org_id);` |
| Wave | W7-F (composite FK) — preceded by Wave 6 (party migration) |
| Validation | DRAFT |
| Cutover owner | Inventory + Party squad |

**Also needs:** `UNIQUE(org_id, id)` on `inv_vendors` for children (`inv_purchase_orders.vendor_id`, `inv_reorder_rules.vendor_id`).

#### 1-B-2. `inv_purchase_orders`

| Field | Value |
|---|---|
| Child table | `inv_purchase_orders` |
| Child col(s) | `org_id`, `vendor_id`, `warehouse_id` |
| Parent / key | `organizations.id` · `inv_vendors.(org_id,id)` · `inv_warehouses.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; vendor_id integer NOT NULL; warehouse_id integer nullable |
| Type match | ✔ all integer FKs match integer parents |
| Candidate key on parent | `inv_vendors` needs `UNIQUE(org_id,id)` · `inv_warehouses` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,vendor_id] → [inv_vendors.org_id,inv_vendors.id])` · `foreignKey([org_id,warehouse_id] → [inv_warehouses.org_id,inv_warehouses.id])` |
| Nullability | vendor_id NOT NULL · warehouse_id nullable |
| Repair sketch | `SELECT id FROM inv_purchase_orders po WHERE NOT EXISTS (SELECT 1 FROM inv_vendors v WHERE v.id = po.vendor_id AND v.org_id = po.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Also needs:** `UNIQUE(org_id, id)` on `inv_purchase_orders` for `inv_grns.po_id`.

#### 1-B-3. `inv_po_lines`

| Field | Value |
|---|---|
| Child table | `inv_po_lines` |
| Child col(s) | `po_id`, `product_variant_id` |
| Parent / key | `inv_purchase_orders.(org_id,id)` · `inv_product_variants.(org_id,id)` |
| org_id present? | **No own org_id column** — inherits scope through po_id |
| Existing ID type | serial PK; po_id integer NOT NULL; product_variant_id integer NOT NULL |
| Type match | ✔ |
| Candidate key on parent | Both parents need `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([po_id] → [inv_purchase_orders.id])` already exists (single-col); composite via parent chain only. No own org_id → composite FK to grandparent not directly expressible. Standard pattern: add `org_id` column, then composite FK. |
| Nullability | po_id NOT NULL · product_variant_id NOT NULL |
| Repair sketch | `SELECT pl.id FROM inv_po_lines pl JOIN inv_purchase_orders po ON po.id = pl.po_id JOIN inv_product_variants pv ON pv.id = pl.product_variant_id WHERE po.org_id <> pv.org_id;` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap:** `inv_po_lines` has no `org_id` column. Must add `org_id text NOT NULL` backfilled from parent PO, then composite FK. Same pattern applies to all `*_lines` tables below that lack their own `org_id`.

#### 1-B-4. `inv_grns`

| Field | Value |
|---|---|
| Child table | `inv_grns` |
| Child col(s) | `org_id`, `po_id`, `location_id` |
| Parent / key | `organizations.id` · `inv_purchase_orders.(org_id,id)` · `inv_locations.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; po_id integer NOT NULL; location_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `inv_purchase_orders` needs `UNIQUE(org_id,id)` · `inv_locations` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,po_id] → [inv_purchase_orders.org_id,inv_purchase_orders.id])` · `foreignKey([org_id,location_id] → [inv_locations.org_id,inv_locations.id])` |
| Nullability | po_id NOT NULL · location_id nullable |
| Repair sketch | `SELECT id FROM inv_grns g WHERE NOT EXISTS (SELECT 1 FROM inv_purchase_orders po WHERE po.id = g.po_id AND po.org_id = g.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Also needs:** `UNIQUE(org_id, id)` on `inv_grns` for `inv_vendor_returns.grn_id`.

#### 1-B-5. `inv_grn_lines`

| Field | Value |
|---|---|
| Child table | `inv_grn_lines` |
| Child col(s) | `grn_id`, `po_line_id` |
| Parent / key | `inv_grns.(org_id,id)` · `inv_po_lines.id` |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; grn_id integer NOT NULL; po_line_id integer NOT NULL |
| Type match | ✔ |
| Composite FK needed | Must add `org_id` backfilled from GRN; then `foreignKey([org_id,grn_id] → [inv_grns.org_id,inv_grns.id])` |
| Nullability | Both NOT NULL |
| Repair sketch | `SELECT gl.id FROM inv_grn_lines gl JOIN inv_grns g ON g.id = gl.grn_id JOIN inv_po_lines pl ON pl.po_id = g.po_id WHERE pl.id != gl.po_line_id OR g.org_id IS NULL;` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

---

### 1-C. `inventory/sales-orders.ts`

#### 1-C-1. `inv_sales_orders`

| Field | Value |
|---|---|
| Child table | `inv_sales_orders` |
| Child col(s) | `org_id`, `client_id`, `warehouse_id`, `invoice_id` |
| Parent / key | `organizations.id` · `clients.(org_id,id)` · `inv_warehouses.(org_id,id)` · `invoices.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; client_id integer nullable; warehouse_id integer nullable; invoice_id integer nullable |
| Type match | ✔ integer FKs to integer parents |
| Candidate key on parent | `clients` needs `UNIQUE(org_id,id)` · `inv_warehouses` needs `UNIQUE(org_id,id)` · `invoices` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,client_id] → [clients.org_id,clients.id])` · `foreignKey([org_id,warehouse_id] → [inv_warehouses.org_id,inv_warehouses.id])` · `foreignKey([org_id,invoice_id] → [invoices.org_id,invoices.id])` |
| Nullability | client_id nullable · warehouse_id nullable · invoice_id nullable |
| Repair sketch | `SELECT id FROM inv_sales_orders so WHERE client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = so.client_id AND c.org_id = so.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Also needs:** `UNIQUE(org_id, id)` on `inv_sales_orders` for shipments and pick-lists that reference `so_id` (those columns are currently bare integers with no `.references()` — see 1-E-1, 1-F-1).

#### 1-C-2. `inv_so_lines`

| Field | Value |
|---|---|
| Child table | `inv_so_lines` |
| Child col(s) | `so_id`, `product_variant_id` |
| Parent / key | `inv_sales_orders.(org_id,id)` · `inv_product_variants.(org_id,id)` |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; so_id integer NOT NULL; product_variant_id integer NOT NULL |
| Type match | ✔ |
| Composite FK needed | Add `org_id` from SO; `foreignKey([org_id,so_id] → [inv_sales_orders.org_id,inv_sales_orders.id])` |
| Nullability | Both NOT NULL |
| Repair sketch | `SELECT sl.id FROM inv_so_lines sl JOIN inv_sales_orders so ON so.id = sl.so_id JOIN inv_product_variants pv ON pv.id = sl.product_variant_id WHERE pv.org_id <> so.org_id;` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

---

### 1-D. `inventory/stock.ts`

#### 1-D-1. `inv_stock_levels` *(already in wave-7 coverage — listed for completeness, NOT a new row)*

Candidate key `UNIQUE(org_id, id)` needed for no known direct child FK; table is a leaf aggregate. Still needs composite FK to `inv_product_variants` and `inv_locations` — both of which require those parents to have candidate keys first.

#### 1-D-2. `inv_stock_transactions`

| Field | Value |
|---|---|
| Child table | `inv_stock_transactions` |
| Child col(s) | `org_id`, `product_variant_id`, `location_id` |
| Parent / key | `organizations.id` · `inv_product_variants.(org_id,id)` · `inv_locations.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; product_variant_id integer NOT NULL; location_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | Both parents need `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,product_variant_id] → [inv_product_variants.org_id,inv_product_variants.id])` · `foreignKey([org_id,location_id] → [inv_locations.org_id,inv_locations.id])` |
| Nullability | product_variant_id NOT NULL · location_id nullable |
| Repair sketch | `SELECT id FROM inv_stock_transactions t WHERE NOT EXISTS (SELECT 1 FROM inv_product_variants pv WHERE pv.id = t.product_variant_id AND pv.org_id = t.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Also needs:** `UNIQUE(org_id, id)` on `inv_stock_transactions` for `inv_valuation_layers.stock_transaction_id`.

#### 1-D-3. `inv_stock_adjustments`

| Field | Value |
|---|---|
| Child table | `inv_stock_adjustments` |
| Child col(s) | `org_id` |
| Parent / key | `organizations.id` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK |
| Type match | ✔ |
| Candidate key on parent | Needs `UNIQUE(org_id, id)` on self for adj_lines |
| Composite FK needed | None beyond org anchor (no intra-module parent) |
| Nullability | N/A |
| Repair sketch | N/A |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

#### 1-D-4. `inv_stock_adjustment_lines`

| Field | Value |
|---|---|
| Child table | `inv_stock_adjustment_lines` |
| Child col(s) | `adjustment_id`, `product_variant_id`, `location_id` |
| Parent / key | `inv_stock_adjustments.(org_id,id)` · `inv_product_variants.(org_id,id)` · `inv_locations.(org_id,id)` |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; adjustment_id integer NOT NULL; product_variant_id integer NOT NULL; location_id integer NOT NULL |
| Type match | ✔ |
| Composite FK needed | Add `org_id` backfilled from adjustment; `foreignKey([org_id,adjustment_id] → [inv_stock_adjustments.org_id,inv_stock_adjustments.id])` |
| Nullability | All NOT NULL |
| Repair sketch | `SELECT al.id FROM inv_stock_adjustment_lines al JOIN inv_stock_adjustments a ON a.id = al.adjustment_id JOIN inv_product_variants pv ON pv.id = al.product_variant_id WHERE pv.org_id <> a.org_id;` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

#### 1-D-5. `inv_stock_transfers`

| Field | Value |
|---|---|
| Child table | `inv_stock_transfers` |
| Child col(s) | `org_id`, `from_location_id`, `to_location_id`, `from_warehouse_id`, `to_warehouse_id` |
| Parent / key | `organizations.id` · `inv_locations.(org_id,id)` ×2 · `inv_warehouses.(org_id,id)` ×2 |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; location/warehouse FKs integer |
| Type match | ✔ |
| Candidate key on parent | Both `inv_locations` and `inv_warehouses` need `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,from_location_id] → [inv_locations.org_id,inv_locations.id])` · `foreignKey([org_id,to_location_id] → [inv_locations.org_id,inv_locations.id])` · `foreignKey([org_id,from_warehouse_id] → [inv_warehouses.org_id,inv_warehouses.id])` · `foreignKey([org_id,to_warehouse_id] → [inv_warehouses.org_id,inv_warehouses.id])` |
| Nullability | location FKs NOT NULL · warehouse FKs nullable |
| Repair sketch | `SELECT id FROM inv_stock_transfers t WHERE NOT EXISTS (SELECT 1 FROM inv_locations l WHERE l.id = t.from_location_id AND l.org_id = t.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

#### 1-D-6. `inv_stock_transfer_lines`

| Field | Value |
|---|---|
| Child table | `inv_stock_transfer_lines` |
| Child col(s) | `transfer_id`, `product_variant_id` |
| Parent / key | `inv_stock_transfers.(org_id,id)` · `inv_product_variants.(org_id,id)` |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; transfer_id integer NOT NULL; product_variant_id integer NOT NULL |
| Type match | ✔ |
| Composite FK needed | Add `org_id`; `foreignKey([org_id,transfer_id] → [inv_stock_transfers.org_id,inv_stock_transfers.id])` |
| Nullability | Both NOT NULL |
| Repair sketch | As per 1-D-4 pattern |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

---

### 1-E. `inventory/shipping.ts`

#### 1-E-1. `inv_shipments`

| Field | Value |
|---|---|
| Child table | `inv_shipments` |
| Child col(s) | `org_id`, `so_id` (bare integer — **no `.references()`**), `warehouse_id`, `carrier_id` |
| Parent / key | `organizations.id` · `inv_sales_orders.(org_id,id)` [no FK today] · `inv_warehouses.(org_id,id)` · `inv_carriers.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; so_id integer nullable (**missing FK**); warehouse_id integer nullable; carrier_id integer nullable |
| Type match | ✔ integers |
| Candidate key on parent | `inv_sales_orders` needs `UNIQUE(org_id,id)` · `inv_warehouses` needs `UNIQUE(org_id,id)` · `inv_carriers` needs `UNIQUE(org_id,id)` |
| Composite FK needed | First add `.references(() => invSalesOrders.id)` on `so_id`; then composite `foreignKey([org_id,so_id] → [inv_sales_orders.org_id,inv_sales_orders.id])` etc. |
| Nullability | so_id nullable · warehouse_id nullable · carrier_id nullable |
| Repair sketch | `SELECT id FROM inv_shipments s WHERE so_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inv_sales_orders so WHERE so.id = s.so_id AND so.org_id = s.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `so_id` has no `.references()` at all today — missing single-col FK entirely.**

#### 1-E-2. `inv_shipment_lines`

| Field | Value |
|---|---|
| Child table | `inv_shipment_lines` |
| Child col(s) | `shipment_id`, `so_line_id` (bare integer — **no `.references()`**), `product_variant_id` |
| Parent / key | `inv_shipments.(org_id,id)` · `inv_so_lines.id` [no FK] · `inv_product_variants.(org_id,id)` |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; shipment_id integer NOT NULL; so_line_id integer nullable (no FK); product_variant_id integer NOT NULL |
| Type match | ✔ |
| Composite FK needed | Add `org_id`; `foreignKey([org_id,shipment_id] → [inv_shipments.org_id,inv_shipments.id])` · add `.references()` on so_line_id |
| Nullability | shipment_id NOT NULL · so_line_id nullable · product_variant_id NOT NULL |
| Repair sketch | Cross-tenant check via shipment join |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `so_line_id` has no `.references()` — missing FK entirely.**

#### 1-E-3. `inv_carriers`

| Field | Value |
|---|---|
| Child table | `inv_carriers` |
| Child col(s) | `org_id` |
| Parent / key | `organizations.id` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK |
| Type match | ✔ |
| Candidate key on parent | Needs `UNIQUE(org_id, id)` on self for `inv_shipments.carrier_id` and `inv_loads.carrier_id` |
| Composite FK needed | None beyond org anchor |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

#### 1-E-4. `inv_packages`

| Field | Value |
|---|---|
| Child table | `inv_packages` |
| Child col(s) | `org_id`, `shipment_id` |
| Parent / key | `organizations.id` · `inv_shipments.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; shipment_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `inv_shipments` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,shipment_id] → [inv_shipments.org_id,inv_shipments.id])` |
| Nullability | shipment_id nullable |
| Repair sketch | `SELECT id FROM inv_packages p WHERE shipment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inv_shipments s WHERE s.id = p.shipment_id AND s.org_id = p.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

#### 1-E-5. `inv_package_lines`

| Field | Value |
|---|---|
| Child table | `inv_package_lines` |
| Child col(s) | `package_id`, `product_variant_id` |
| Parent / key | `inv_packages.(org_id,id)` · `inv_product_variants.(org_id,id)` |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; package_id integer NOT NULL; product_variant_id integer NOT NULL |
| Type match | ✔ |
| Composite FK needed | Add `org_id`; `foreignKey([org_id,package_id] → [inv_packages.org_id,inv_packages.id])` |
| Nullability | Both NOT NULL |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

#### 1-E-6. `inv_loads`

| Field | Value |
|---|---|
| Child table | `inv_loads` |
| Child col(s) | `org_id`, `source_warehouse_id`, `carrier_id` |
| Parent / key | `organizations.id` · `inv_warehouses.(org_id,id)` · `inv_carriers.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; source_warehouse_id integer nullable; carrier_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `inv_warehouses` and `inv_carriers` need `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,source_warehouse_id] → [inv_warehouses.org_id,inv_warehouses.id])` · `foreignKey([org_id,carrier_id] → [inv_carriers.org_id,inv_carriers.id])` |
| Nullability | Both nullable |
| Repair sketch | `SELECT id FROM inv_loads l WHERE source_warehouse_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inv_warehouses wh WHERE wh.id = l.source_warehouse_id AND wh.org_id = l.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

#### 1-E-7. `inv_load_lines`

| Field | Value |
|---|---|
| Child table | `inv_load_lines` |
| Child col(s) | `load_id`, `shipment_id`, `transfer_id` (bare integer — **no `.references()`**) |
| Parent / key | `inv_loads.(org_id,id)` · `inv_shipments.(org_id,id)` · `inv_stock_transfers.(org_id,id)` [no FK today] |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; load_id integer NOT NULL; shipment_id integer nullable; transfer_id integer nullable (no FK) |
| Type match | ✔ |
| Composite FK needed | Add `org_id`; composite to inv_loads; add `.references()` on transfer_id |
| Nullability | load_id NOT NULL · shipment_id nullable · transfer_id nullable |
| Repair sketch | Join check via load |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `transfer_id` has no `.references()` — missing FK entirely.**

---

### 1-F. `inventory/operations.ts`

#### 1-F-1. `inv_vendor_returns`

| Field | Value |
|---|---|
| Child table | `inv_vendor_returns` |
| Child col(s) | `org_id`, `vendor_id` (bare integer — **no `.references()`**), `po_id` (bare — no FK), `grn_id` (bare — no FK) |
| Parent / key | `organizations.id` · `inv_vendors.(org_id,id)` [no FK] · `inv_purchase_orders.(org_id,id)` [no FK] · `inv_grns.(org_id,id)` [no FK] |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; vendor_id integer NOT NULL; po_id integer nullable; grn_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `inv_vendors`, `inv_purchase_orders`, `inv_grns` all need `UNIQUE(org_id,id)` |
| Composite FK needed | First add `.references()` on all three bare FKs; then composite versions |
| Nullability | vendor_id NOT NULL · po_id nullable · grn_id nullable |
| Repair sketch | `SELECT id FROM inv_vendor_returns vr WHERE NOT EXISTS (SELECT 1 FROM inv_vendors v WHERE v.id = vr.vendor_id AND v.org_id = vr.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `vendor_id`, `po_id`, `grn_id` all have no `.references()` — 3 missing FKs.**

#### 1-F-2. `inv_vendor_return_lines`

| Field | Value |
|---|---|
| Child table | `inv_vendor_return_lines` |
| Child col(s) | `return_id`, `product_variant_id`, `lot_id` (bare — no FK), `serial_id` (bare — no FK) |
| Parent / key | `inv_vendor_returns.(org_id,id)` · `inv_product_variants.(org_id,id)` · `inv_lots.(org_id,id)` [no FK] · `inv_serial_numbers.(org_id,id)` [no FK] |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; all integer |
| Type match | ✔ |
| Composite FK needed | Add `org_id`; composite to inv_vendor_returns; add lot/serial FKs |
| Nullability | return_id NOT NULL · product_variant_id NOT NULL · lot_id nullable · serial_id nullable |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `lot_id`, `serial_id` have no `.references()`.**

#### 1-F-3. `inv_customer_returns`

| Field | Value |
|---|---|
| Child table | `inv_customer_returns` |
| Child col(s) | `org_id`, `so_id` (bare — no FK), `shipment_id` (bare — no FK), `client_id` (bare — no FK) |
| Parent / key | `organizations.id` · `inv_sales_orders.(org_id,id)` [no FK] · `inv_shipments.(org_id,id)` [no FK] · `clients.(org_id,id)` [no FK] |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; so_id nullable; shipment_id nullable; client_id nullable |
| Type match | ✔ integers |
| Composite FK needed | Add `.references()` on all three; then composite FKs |
| Nullability | All nullable |
| Repair sketch | `SELECT id FROM inv_customer_returns cr WHERE client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = cr.client_id AND c.org_id = cr.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `so_id`, `shipment_id`, `client_id` all have no `.references()` — 3 missing FKs.**

#### 1-F-4. `inv_customer_return_lines`

| Field | Value |
|---|---|
| Child table | `inv_customer_return_lines` |
| Child col(s) | `return_id`, `product_variant_id`, `lot_id` (bare), `serial_id` (bare) |
| Parent / key | `inv_customer_returns.(org_id,id)` · `inv_product_variants.(org_id,id)` · lots/serials (no FK) |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; integers |
| Type match | ✔ |
| Composite FK needed | Add `org_id`; composite to inv_customer_returns |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `lot_id`, `serial_id` have no `.references()`.**

#### 1-F-5. `inv_pick_lists`

| Field | Value |
|---|---|
| Child table | `inv_pick_lists` |
| Child col(s) | `org_id`, `so_id` (bare — no FK), `warehouse_id` |
| Parent / key | `organizations.id` · `inv_sales_orders.(org_id,id)` [no FK] · `inv_warehouses.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; so_id integer nullable (no FK); warehouse_id integer nullable |
| Type match | ✔ |
| Composite FK needed | Add `.references()` on so_id; then composite FKs for both |
| Nullability | Both nullable |
| Repair sketch | `SELECT id FROM inv_pick_lists pl WHERE so_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inv_sales_orders so WHERE so.id = pl.so_id AND so.org_id = pl.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `so_id` has no `.references()`.**

#### 1-F-6. `inv_pick_list_lines`

| Field | Value |
|---|---|
| Child table | `inv_pick_list_lines` |
| Child col(s) | `pick_list_id`, `so_line_id` (bare — no FK), `product_variant_id`, `location_id`, `lot_id` (bare), `serial_id` (bare) |
| Parent / key | `inv_pick_lists.(org_id,id)` · `inv_so_lines.id` [no FK] · `inv_product_variants.(org_id,id)` · `inv_locations.(org_id,id)` |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; integers |
| Type match | ✔ |
| Composite FK needed | Add `org_id`; composite to inv_pick_lists |
| Nullability | pick_list_id NOT NULL · product_variant_id NOT NULL · location_id nullable · so_line_id nullable |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `so_line_id`, `lot_id`, `serial_id` have no `.references()`.**

#### 1-F-7. `inv_cycle_counts`

| Field | Value |
|---|---|
| Child table | `inv_cycle_counts` |
| Child col(s) | `org_id`, `warehouse_id`, `location_id`, `category_id` (bare — no FK) |
| Parent / key | `organizations.id` · `inv_warehouses.(org_id,id)` · `inv_locations.(org_id,id)` · `inv_categories.(org_id,id)` [no FK] |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; warehouse_id integer NOT NULL; location_id integer nullable; category_id integer nullable (no FK) |
| Type match | ✔ |
| Candidate key on parent | All three parents need `UNIQUE(org_id,id)` |
| Composite FK needed | Composite FK to warehouses, locations; add `.references()` then composite to categories |
| Nullability | warehouse_id NOT NULL · location_id nullable · category_id nullable |
| Repair sketch | `SELECT id FROM inv_cycle_counts cc WHERE NOT EXISTS (SELECT 1 FROM inv_warehouses wh WHERE wh.id = cc.warehouse_id AND wh.org_id = cc.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `category_id` has no `.references()`.**

#### 1-F-8. `inv_cycle_count_lines`

| Field | Value |
|---|---|
| Child table | `inv_cycle_count_lines` |
| Child col(s) | `cycle_count_id`, `product_variant_id`, `location_id`, `lot_id` (bare) |
| Parent / key | `inv_cycle_counts.(org_id,id)` · `inv_product_variants.(org_id,id)` · `inv_locations.(org_id,id)` |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; integers |
| Type match | ✔ |
| Composite FK needed | Add `org_id`; composite to inv_cycle_counts |
| Nullability | cycle_count_id NOT NULL · product_variant_id NOT NULL · location_id NOT NULL · lot_id nullable |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `lot_id` has no `.references()`.**

#### 1-F-9. `inv_physical_audits`

| Field | Value |
|---|---|
| Child table | `inv_physical_audits` |
| Child col(s) | `org_id`, `warehouse_id` |
| Parent / key | `organizations.id` · `inv_warehouses.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; warehouse_id integer NOT NULL |
| Type match | ✔ |
| Candidate key on parent | `inv_warehouses` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,warehouse_id] → [inv_warehouses.org_id,inv_warehouses.id])` |
| Nullability | NOT NULL |
| Repair sketch | Standard warehouse cross-tenant check |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

#### 1-F-10. `inv_physical_audit_lines`

| Field | Value |
|---|---|
| Child table | `inv_physical_audit_lines` |
| Child col(s) | `audit_id`, `product_variant_id`, `location_id`, `lot_id` (bare) |
| Parent / key | `inv_physical_audits.(org_id,id)` · `inv_product_variants.(org_id,id)` · `inv_locations.(org_id,id)` |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; integers |
| Type match | ✔ |
| Composite FK needed | Add `org_id`; composite to inv_physical_audits |
| Nullability | audit_id NOT NULL · product_variant_id NOT NULL · location_id NOT NULL · lot_id nullable |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `lot_id` has no `.references()`.**

---

### 1-G. `inventory/quality.ts`

#### 1-G-1. `inv_quality_inspections`

| Field | Value |
|---|---|
| Child table | `inv_quality_inspections` |
| Child col(s) | `org_id` |
| Parent / key | `organizations.id` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK |
| Type match | ✔ |
| Candidate key on parent | Needs `UNIQUE(org_id,id)` on self |
| Composite FK needed | None beyond org anchor (sourceType/sourceId are polymorphic text refs — cannot be FK constrained) |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

#### 1-G-2. `inv_quality_inspection_lines`

| Field | Value |
|---|---|
| Child table | `inv_quality_inspection_lines` |
| Child col(s) | `inspection_id`, `product_variant_id`, `lot_id` (bare), `serial_id` (bare) |
| Parent / key | `inv_quality_inspections.(org_id,id)` · `inv_product_variants.(org_id,id)` |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; integers |
| Type match | ✔ |
| Composite FK needed | Add `org_id`; composite to inv_quality_inspections |
| Nullability | inspection_id NOT NULL · product_variant_id NOT NULL · lot_id nullable · serial_id nullable |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `lot_id`, `serial_id` have no `.references()`.**

#### 1-G-3. `inv_quality_holds`

| Field | Value |
|---|---|
| Child table | `inv_quality_holds` |
| Child col(s) | `org_id`, `product_variant_id`, `location_id`, `lot_id` (bare), `serial_id` (bare) |
| Parent / key | `organizations.id` · `inv_product_variants.(org_id,id)` · `inv_locations.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; product_variant_id integer NOT NULL; location_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | Both parents need `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,product_variant_id] → [inv_product_variants.org_id,inv_product_variants.id])` · `foreignKey([org_id,location_id] → [inv_locations.org_id,inv_locations.id])` |
| Nullability | product_variant_id NOT NULL · location_id nullable |
| Repair sketch | Standard cross-tenant check |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `lot_id`, `serial_id` have no `.references()`.**

#### 1-G-4. `inv_recall_events`

| Field | Value |
|---|---|
| Child table | `inv_recall_events` |
| Child col(s) | `org_id` |
| Parent / key | `organizations.id` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK |
| Type match | ✔ |
| Candidate key on parent | Needs `UNIQUE(org_id,id)` on self for recall_lines |
| Composite FK needed | None beyond org anchor |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

#### 1-G-5. `inv_recall_lines`

| Field | Value |
|---|---|
| Child table | `inv_recall_lines` |
| Child col(s) | `recall_id`, `product_variant_id` (nullable, no NOT NULL), `lot_id` (bare), `serial_id` (bare) |
| Parent / key | `inv_recall_events.(org_id,id)` · `inv_product_variants.(org_id,id)` |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; integers |
| Type match | ✔ |
| Composite FK needed | Add `org_id`; composite to inv_recall_events |
| Nullability | recall_id NOT NULL · product_variant_id nullable · lot_id nullable · serial_id nullable |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `lot_id`, `serial_id` have no `.references()`.**

---

### 1-H. `inventory/traceability.ts`

#### 1-H-1. `inv_lots`

| Field | Value |
|---|---|
| Child table | `inv_lots` |
| Child col(s) | `org_id`, `product_variant_id` |
| Parent / key | `organizations.id` · `inv_product_variants.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; product_variant_id integer NOT NULL |
| Type match | ✔ |
| Candidate key on parent | `inv_product_variants` needs `UNIQUE(org_id,id)` · `inv_lots` itself needs `UNIQUE(org_id,id)` for lot_id FKs |
| Composite FK needed | `foreignKey([org_id,product_variant_id] → [inv_product_variants.org_id,inv_product_variants.id])` |
| Nullability | product_variant_id NOT NULL |
| Repair sketch | `SELECT id FROM inv_lots l WHERE NOT EXISTS (SELECT 1 FROM inv_product_variants pv WHERE pv.id = l.product_variant_id AND pv.org_id = l.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

#### 1-H-2. `inv_serial_numbers`

| Field | Value |
|---|---|
| Child table | `inv_serial_numbers` |
| Child col(s) | `org_id`, `product_variant_id`, `lot_id` (bare — no FK), `current_location_id` |
| Parent / key | `organizations.id` · `inv_product_variants.(org_id,id)` · `inv_lots.(org_id,id)` [no FK] · `inv_locations.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; product_variant_id integer NOT NULL; lot_id integer nullable (no FK); current_location_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `inv_product_variants`, `inv_lots`, `inv_locations` all need `UNIQUE(org_id,id)` |
| Composite FK needed | Composite to product_variant and location; add `.references()` then composite to lots |
| Nullability | product_variant_id NOT NULL · lot_id nullable · current_location_id nullable |
| Repair sketch | `SELECT id FROM inv_serial_numbers sn WHERE NOT EXISTS (SELECT 1 FROM inv_product_variants pv WHERE pv.id = sn.product_variant_id AND pv.org_id = sn.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `lot_id` has no `.references()`.**

---

### 1-I. `inventory/reservations.ts`

#### 1-I-1. `inv_stock_reservations`

| Field | Value |
|---|---|
| Child table | `inv_stock_reservations` |
| Child col(s) | `org_id`, `product_variant_id`, `warehouse_id`, `location_id`, `lot_id` (bare), `serial_id` (bare) |
| Parent / key | `organizations.id` · `inv_product_variants.(org_id,id)` · `inv_warehouses.(org_id,id)` · `inv_locations.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; product_variant_id integer NOT NULL; warehouse_id nullable; location_id nullable |
| Type match | ✔ |
| Candidate key on parent | All three parents need `UNIQUE(org_id,id)` |
| Composite FK needed | Composite FKs to all three parents |
| Nullability | product_variant_id NOT NULL · warehouse_id nullable · location_id nullable |
| Repair sketch | `SELECT id FROM inv_stock_reservations r WHERE NOT EXISTS (SELECT 1 FROM inv_product_variants pv WHERE pv.id = r.product_variant_id AND pv.org_id = r.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `lot_id`, `serial_id` have no `.references()`.**

---

### 1-J. `inventory/valuation.ts`

#### 1-J-1. `inv_valuation_layers`

| Field | Value |
|---|---|
| Child table | `inv_valuation_layers` |
| Child col(s) | `org_id`, `product_variant_id`, `stock_transaction_id` |
| Parent / key | `organizations.id` · `inv_product_variants.(org_id,id)` · `inv_stock_transactions.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; product_variant_id integer NOT NULL; stock_transaction_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `inv_product_variants` and `inv_stock_transactions` need `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,product_variant_id] → [inv_product_variants.org_id,inv_product_variants.id])` · `foreignKey([org_id,stock_transaction_id] → [inv_stock_transactions.org_id,inv_stock_transactions.id])` |
| Nullability | product_variant_id NOT NULL · stock_transaction_id nullable |
| Repair sketch | `SELECT id FROM inv_valuation_layers vl WHERE NOT EXISTS (SELECT 1 FROM inv_product_variants pv WHERE pv.id = vl.product_variant_id AND pv.org_id = vl.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

---

### 1-K. `inventory/planning.ts`

#### 1-K-1. `inv_reorder_rules`

| Field | Value |
|---|---|
| Child table | `inv_reorder_rules` |
| Child col(s) | `org_id`, `product_variant_id`, `warehouse_id`, `vendor_id` (bare — no FK) |
| Parent / key | `organizations.id` · `inv_product_variants.(org_id,id)` · `inv_warehouses.(org_id,id)` · `inv_vendors.(org_id,id)` [no FK] |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; product_variant_id integer NOT NULL; warehouse_id integer nullable; vendor_id integer nullable (no FK) |
| Type match | ✔ |
| Candidate key on parent | All three parents need `UNIQUE(org_id,id)` |
| Composite FK needed | Composite to product_variant and warehouse; add `.references()` then composite to vendors |
| Nullability | product_variant_id NOT NULL · warehouse_id nullable · vendor_id nullable |
| Repair sketch | `SELECT id FROM inv_reorder_rules r WHERE NOT EXISTS (SELECT 1 FROM inv_product_variants pv WHERE pv.id = r.product_variant_id AND pv.org_id = r.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

**Gap: `vendor_id` has no `.references()`.**

#### 1-K-2. `inv_ai_insights`

| Field | Value |
|---|---|
| Child table | `inv_ai_insights` |
| Child col(s) | `org_id` |
| Parent / key | `organizations.id` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK |
| Type match | ✔ |
| Composite FK needed | None (leaf, no intra-module parent) |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

---

### 1-L. `inventory/admin.ts`

All 8 admin tables have `org_id text NOT NULL` referencing `organizations.id`. None have intra-module parent FKs except `inv_webhook_events.webhook_id → inv_webhooks.id`.

#### 1-L-1. `inv_settings`

No intra-module parents. Own `UNIQUE(org_id)` (single-row per org). Leaf. Needs `UNIQUE(org_id,id)` — but it's a 1-per-org config table, not referenced by children. Low priority.

#### 1-L-2. `inv_number_sequences` · `inv_idempotency_keys` · `inv_import_jobs` · `inv_export_jobs` · `inv_webhooks` · `inv_audit_events`

All are org-anchored leaf tables with single-col `org_id → organizations.id` FKs. No intra-module parent FKs beyond the org anchor. Need `UNIQUE(org_id,id)` candidate keys only if they become parents of future children.

#### 1-L-3. `inv_webhook_events`

| Field | Value |
|---|---|
| Child table | `inv_webhook_events` |
| Child col(s) | `org_id`, `webhook_id` |
| Parent / key | `organizations.id` · `inv_webhooks.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; webhook_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `inv_webhooks` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,webhook_id] → [inv_webhooks.org_id,inv_webhooks.id])` |
| Nullability | webhook_id nullable |
| Repair sketch | `SELECT id FROM inv_webhook_events e WHERE webhook_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inv_webhooks wh WHERE wh.id = e.webhook_id AND wh.org_id = e.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

---

### 1-M. `inventory/channels.ts`

#### 1-M-1. `inv_channels`

No intra-module parent beyond org. Needs `UNIQUE(org_id,id)` for `inv_channel_stock_publications.channel_id`.

#### 1-M-2. `inv_channel_stock_publications`

| Field | Value |
|---|---|
| Child table | `inv_channel_stock_publications` |
| Child col(s) | `org_id`, `channel_id`, `product_variant_id` |
| Parent / key | `organizations.id` · `inv_channels.(org_id,id)` · `inv_product_variants.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; channel_id integer NOT NULL; product_variant_id integer NOT NULL |
| Type match | ✔ |
| Candidate key on parent | `inv_channels` and `inv_product_variants` need `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,channel_id] → [inv_channels.org_id,inv_channels.id])` · `foreignKey([org_id,product_variant_id] → [inv_product_variants.org_id,inv_product_variants.id])` |
| Nullability | Both NOT NULL |
| Repair sketch | `SELECT id FROM inv_channel_stock_publications csp WHERE NOT EXISTS (SELECT 1 FROM inv_channels ch WHERE ch.id = csp.channel_id AND ch.org_id = csp.org_id);` |
| Wave | W7-F |
| Validation | DRAFT |
| Cutover owner | Inventory squad |

#### 1-M-3. `inv_3pl_connections`

No intra-module parent beyond org. Leaf table — composite FK to org only. `UNIQUE(org_id,id)` needed if children are added.

---

## SECTION 2 — FINANCE: `finance-ar-ap.ts`

> All tables here use `org_id text NOT NULL → organizations.id` (text). No int/text mismatch.
> As noted in `schema-change-plan.md`, AR tables (invoices, payments) use text org FKs —
> NOT part of the billing int/text mismatch (that affects only `billing.ts` tables).
> Verified: all `finance-ar-ap.ts` org_id columns are `text` with proper `.references()`.

#### 2-1. `credit_notes`

| Field | Value |
|---|---|
| Child table | `credit_notes` |
| Child col(s) | `org_id`, `client_id`, `invoice_id` |
| Parent / key | `organizations.id` · `clients.(org_id,id)` · `invoices.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; client_id integer nullable; invoice_id integer nullable |
| Type match | ✔ org_id text · ✔ client_id int = clients.id int · ✔ invoice_id int = invoices.id int |
| Candidate key on parent | `clients` needs `UNIQUE(org_id,id)` · `invoices` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,client_id] → [clients.org_id,clients.id])` · `foreignKey([org_id,invoice_id] → [invoices.org_id,invoices.id])` |
| Nullability | Both nullable |
| Repair sketch | `SELECT id FROM credit_notes cn WHERE client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = cn.client_id AND c.org_id = cn.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 2-2. `credit_note_items`

| Field | Value |
|---|---|
| Child table | `credit_note_items` |
| Child col(s) | `credit_note_id` |
| Parent / key | `credit_notes.(org_id,id)` |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; credit_note_id integer NOT NULL |
| Type match | ✔ |
| Composite FK needed | Add `org_id`; `foreignKey([org_id,credit_note_id] → [credit_notes.org_id,credit_notes.id])` |
| Nullability | NOT NULL |
| Repair sketch | N/A (backfill org_id from credit_notes first) |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 2-3. `fin_payment_allocations`

| Field | Value |
|---|---|
| Child table | `fin_payment_allocations` |
| Child col(s) | `org_id`, `payment_id`, `invoice_id` |
| Parent / key | `organizations.id` · `payments.(org_id,id)` · `invoices.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; payment_id integer NOT NULL; invoice_id integer NOT NULL |
| Type match | ✔ |
| Candidate key on parent | `payments` and `invoices` need `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,payment_id] → [payments.org_id,payments.id])` · `foreignKey([org_id,invoice_id] → [invoices.org_id,invoices.id])` |
| Nullability | Both NOT NULL |
| Repair sketch | `SELECT id FROM fin_payment_allocations pa WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.id = pa.payment_id AND p.org_id = pa.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 2-4. `vendor_credits`

| Field | Value |
|---|---|
| Child table | `vendor_credits` |
| Child col(s) | `org_id`, `vendor_id`, `bill_id` |
| Parent / key | `organizations.id` · `clients.(org_id,id)` (vendor stored as client) · `purchase_bills.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; vendor_id integer nullable; bill_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `clients` and `purchase_bills` need `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,vendor_id] → [clients.org_id,clients.id])` · `foreignKey([org_id,bill_id] → [purchase_bills.org_id,purchase_bills.id])` |
| Nullability | Both nullable |
| Repair sketch | As per credit_notes pattern |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

**Note:** `vendor_id` references `clients` (same pattern as `inv_vendors.client_id`) — architectural migration to `business_parties` is a future Wave 6 concern for this table too.

#### 2-5. `vendor_credit_items`

| Field | Value |
|---|---|
| Child table | `vendor_credit_items` |
| Child col(s) | `vendor_credit_id` |
| Parent / key | `vendor_credits.(org_id,id)` |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; vendor_credit_id integer NOT NULL |
| Type match | ✔ |
| Composite FK needed | Add `org_id`; composite to vendor_credits |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 2-6. `fin_vendor_payment_allocations`

| Field | Value |
|---|---|
| Child table | `fin_vendor_payment_allocations` |
| Child col(s) | `org_id`, `vendor_payment_id`, `bill_id` |
| Parent / key | `organizations.id` · `vendor_payments.(org_id,id)` · `purchase_bills.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; vendor_payment_id integer NOT NULL; bill_id integer NOT NULL |
| Type match | ✔ |
| Candidate key on parent | `vendor_payments` and `purchase_bills` need `UNIQUE(org_id,id)` |
| Composite FK needed | Composite FKs to both parents |
| Nullability | Both NOT NULL |
| Repair sketch | `SELECT id FROM fin_vendor_payment_allocations vpa WHERE NOT EXISTS (SELECT 1 FROM vendor_payments vp WHERE vp.id = vpa.vendor_payment_id AND vp.org_id = vpa.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 2-7. `fin_recurring_invoice_templates`

| Field | Value |
|---|---|
| Child table | `fin_recurring_invoice_templates` |
| Child col(s) | `org_id`, `client_id` |
| Parent / key | `organizations.id` · `clients.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; client_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `clients` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,client_id] → [clients.org_id,clients.id])` |
| Nullability | client_id nullable |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 2-8. `fin_recurring_bill_templates`

| Field | Value |
|---|---|
| Child table | `fin_recurring_bill_templates` |
| Child col(s) | `org_id`, `vendor_id` |
| Parent / key | `organizations.id` · `clients.(org_id,id)` (vendor stored as client) |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; vendor_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `clients` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,vendor_id] → [clients.org_id,clients.id])` |
| Nullability | vendor_id nullable |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 2-9. `fin_reminder_policies`

Org-anchored leaf. No intra-module parent. `UNIQUE(org_id,id)` needed if children added. Low priority.

#### 2-10. `fin_reminder_log`

| Field | Value |
|---|---|
| Child table | `fin_reminder_log` |
| Child col(s) | `org_id`, `invoice_id` |
| Parent / key | `organizations.id` · `invoices.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; invoice_id integer NOT NULL |
| Type match | ✔ |
| Candidate key on parent | `invoices` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,invoice_id] → [invoices.org_id,invoices.id])` |
| Nullability | NOT NULL |
| Repair sketch | `SELECT id FROM fin_reminder_log rl WHERE NOT EXISTS (SELECT 1 FROM invoices inv WHERE inv.id = rl.invoice_id AND inv.org_id = rl.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 2-11. `fin_collection_activities`

| Field | Value |
|---|---|
| Child table | `fin_collection_activities` |
| Child col(s) | `org_id`, `client_id`, `invoice_id` |
| Parent / key | `organizations.id` · `clients.(org_id,id)` · `invoices.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; client_id integer NOT NULL; invoice_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `clients` and `invoices` need `UNIQUE(org_id,id)` |
| Composite FK needed | Composite FKs to both parents |
| Nullability | client_id NOT NULL · invoice_id nullable |
| Repair sketch | `SELECT id FROM fin_collection_activities ca WHERE NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = ca.client_id AND c.org_id = ca.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 2-12. `fin_payment_runs`

| Field | Value |
|---|---|
| Child table | `fin_payment_runs` |
| Child col(s) | `org_id` |
| Parent / key | `organizations.id` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK |
| Type match | ✔ |
| Candidate key on parent | Needs `UNIQUE(org_id,id)` on self for fin_payment_run_items |
| Composite FK needed | None beyond org anchor |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 2-13. `fin_payment_run_items`

| Field | Value |
|---|---|
| Child table | `fin_payment_run_items` |
| Child col(s) | `run_id`, `bill_id`, `vendor_id`, `vendor_payment_id` |
| Parent / key | `fin_payment_runs.(org_id,id)` · `purchase_bills.(org_id,id)` · `clients.(org_id,id)` · `vendor_payments.(org_id,id)` |
| org_id present? | **No own org_id** |
| Existing ID type | serial PK; run_id integer NOT NULL; bill_id integer NOT NULL; vendor_id integer nullable; vendor_payment_id integer nullable |
| Type match | ✔ |
| Composite FK needed | Add `org_id`; composite to fin_payment_runs |
| Nullability | run_id NOT NULL · bill_id NOT NULL · vendor_id nullable · vendor_payment_id nullable |
| Repair sketch | Join to fin_payment_runs for org check |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

---

## SECTION 3 — FINANCE: `finance-assets.ts`

> All tables use `org_id text NOT NULL`. No int/text mismatch. Verified.

#### 3-1. `acc_asset_categories`

| Field | Value |
|---|---|
| Child table | `acc_asset_categories` |
| Child col(s) | `org_id`, `asset_account_id`, `depreciation_expense_account_id`, `accumulated_depreciation_account_id` |
| Parent / key | `organizations.id` · `ledger_accounts.(org_id,id)` ×3 |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; account FKs integer NOT NULL |
| Type match | ✔ |
| Candidate key on parent | `ledger_accounts` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,asset_account_id] → [ledger_accounts.org_id,ledger_accounts.id])` ×3 variants |
| Nullability | All NOT NULL |
| Repair sketch | `SELECT id FROM acc_asset_categories ac WHERE NOT EXISTS (SELECT 1 FROM ledger_accounts la WHERE la.id = ac.asset_account_id AND la.org_id = ac.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

**Also needs:** `UNIQUE(org_id,id)` on self for `acc_fixed_assets.category_id`.

#### 3-2. `acc_fixed_assets`

| Field | Value |
|---|---|
| Child table | `acc_fixed_assets` |
| Child col(s) | `org_id`, `category_id`, `vendor_id`, `bill_id`, `disposal_journal_entry_id` |
| Parent / key | `organizations.id` · `acc_asset_categories.(org_id,id)` · `clients.(org_id,id)` (vendor) · `purchase_bills.(org_id,id)` · `journal_entries.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; category_id integer NOT NULL; vendor_id integer nullable; bill_id integer nullable; disposal_journal_entry_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | All parents need `UNIQUE(org_id,id)` |
| Composite FK needed | Composite FKs to all four parents |
| Nullability | category_id NOT NULL · vendor_id nullable · bill_id nullable · disposal_journal_entry_id nullable |
| Repair sketch | `SELECT id FROM acc_fixed_assets afa WHERE NOT EXISTS (SELECT 1 FROM acc_asset_categories ac WHERE ac.id = afa.category_id AND ac.org_id = afa.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

**Also needs:** `UNIQUE(org_id,id)` on `acc_fixed_assets` for `acc_depreciation_schedules.asset_id`.

#### 3-3. `acc_depreciation_runs`

| Field | Value |
|---|---|
| Child table | `acc_depreciation_runs` |
| Child col(s) | `org_id`, `journal_entry_id` |
| Parent / key | `organizations.id` · `journal_entries.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; journal_entry_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `journal_entries` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,journal_entry_id] → [journal_entries.org_id,journal_entries.id])` |
| Nullability | nullable |
| Repair sketch | Standard cross-tenant check |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

**Also needs:** `UNIQUE(org_id,id)` on `acc_depreciation_runs` for `acc_depreciation_schedules.run_id`.

#### 3-4. `acc_depreciation_schedules`

| Field | Value |
|---|---|
| Child table | `acc_depreciation_schedules` |
| Child col(s) | `org_id`, `asset_id`, `run_id`, `journal_entry_id` |
| Parent / key | `organizations.id` · `acc_fixed_assets.(org_id,id)` · `acc_depreciation_runs.(org_id,id)` · `journal_entries.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; asset_id integer NOT NULL; run_id integer nullable; journal_entry_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | All three parents need `UNIQUE(org_id,id)` |
| Composite FK needed | Composite FKs to all three parents |
| Nullability | asset_id NOT NULL · run_id nullable · journal_entry_id nullable |
| Repair sketch | `SELECT id FROM acc_depreciation_schedules ads WHERE NOT EXISTS (SELECT 1 FROM acc_fixed_assets afa WHERE afa.id = ads.asset_id AND afa.org_id = ads.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

---

## SECTION 4 — FINANCE: `finance-banking.ts`

#### 4-1. `fin_bank_accounts`

| Field | Value |
|---|---|
| Child table | `fin_bank_accounts` |
| Child col(s) | `org_id`, `ledger_account_id` |
| Parent / key | `organizations.id` · `ledger_accounts.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; ledger_account_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `ledger_accounts` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,ledger_account_id] → [ledger_accounts.org_id,ledger_accounts.id])` |
| Nullability | ledger_account_id nullable |
| Repair sketch | `SELECT id FROM fin_bank_accounts fba WHERE ledger_account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ledger_accounts la WHERE la.id = fba.ledger_account_id AND la.org_id = fba.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

**Also needs:** `UNIQUE(org_id,id)` on `fin_bank_accounts` for imports, transactions, transfers.

#### 4-2. `fin_bank_imports`

| Field | Value |
|---|---|
| Child table | `fin_bank_imports` |
| Child col(s) | `org_id`, `bank_account_id` |
| Parent / key | `organizations.id` · `fin_bank_accounts.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; bank_account_id integer NOT NULL |
| Type match | ✔ |
| Candidate key on parent | `fin_bank_accounts` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,bank_account_id] → [fin_bank_accounts.org_id,fin_bank_accounts.id])` |
| Nullability | NOT NULL |
| Repair sketch | `SELECT id FROM fin_bank_imports fi WHERE NOT EXISTS (SELECT 1 FROM fin_bank_accounts fba WHERE fba.id = fi.bank_account_id AND fba.org_id = fi.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

**Also needs:** `UNIQUE(org_id,id)` on `fin_bank_imports` for `fin_bank_transactions.import_id`.

#### 4-3. `fin_bank_transactions`

| Field | Value |
|---|---|
| Child table | `fin_bank_transactions` |
| Child col(s) | `org_id`, `bank_account_id`, `import_id`, `matched_journal_entry_id` |
| Parent / key | `organizations.id` · `fin_bank_accounts.(org_id,id)` · `fin_bank_imports.(org_id,id)` · `journal_entries.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; bank_account_id integer NOT NULL; import_id integer nullable; matched_journal_entry_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | All three parents need `UNIQUE(org_id,id)` |
| Composite FK needed | Composite FKs to all three parents |
| Nullability | bank_account_id NOT NULL · import_id nullable · matched_journal_entry_id nullable |
| Repair sketch | `SELECT id FROM fin_bank_transactions fbt WHERE NOT EXISTS (SELECT 1 FROM fin_bank_accounts fba WHERE fba.id = fbt.bank_account_id AND fba.org_id = fbt.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

**Also needs:** `UNIQUE(org_id,id)` on `fin_bank_transactions` for `fin_reconciliation_matches.bank_transaction_id`.

#### 4-4. `fin_reconciliation_matches`

| Field | Value |
|---|---|
| Child table | `fin_reconciliation_matches` |
| Child col(s) | `org_id`, `bank_transaction_id`, `journal_entry_id` |
| Parent / key | `organizations.id` · `fin_bank_transactions.(org_id,id)` · `journal_entries.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; bank_transaction_id integer NOT NULL; journal_entry_id integer nullable; `matched_record_id` integer nullable (polymorphic — no FK constraint possible) |
| Type match | ✔ |
| Candidate key on parent | Both parents need `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,bank_transaction_id] → [fin_bank_transactions.org_id,fin_bank_transactions.id])` · `foreignKey([org_id,journal_entry_id] → [journal_entries.org_id,journal_entries.id])` |
| Nullability | bank_transaction_id NOT NULL · journal_entry_id nullable |
| Repair sketch | `SELECT id FROM fin_reconciliation_matches frm WHERE NOT EXISTS (SELECT 1 FROM fin_bank_transactions fbt WHERE fbt.id = frm.bank_transaction_id AND fbt.org_id = frm.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

**Note:** `matched_record_id` is polymorphic (type determined by `matched_type` enum) — cannot be FK constrained; ensure service-layer BOLA check.

#### 4-5. `fin_reconciliation_rules`

Org-anchored leaf. No intra-module parents. Low priority.

#### 4-6. `fin_bank_transfers`

| Field | Value |
|---|---|
| Child table | `fin_bank_transfers` |
| Child col(s) | `org_id`, `from_bank_account_id`, `to_bank_account_id`, `journal_entry_id` |
| Parent / key | `organizations.id` · `fin_bank_accounts.(org_id,id)` ×2 · `journal_entries.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; from/to bank_account_id integer NOT NULL; journal_entry_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `fin_bank_accounts` and `journal_entries` need `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,from_bank_account_id] → [fin_bank_accounts.org_id,fin_bank_accounts.id])` · same for `to_bank_account_id` · composite to journal_entries |
| Nullability | from/to NOT NULL · journal_entry_id nullable |
| Repair sketch | `SELECT id FROM fin_bank_transfers fbt WHERE NOT EXISTS (SELECT 1 FROM fin_bank_accounts fba WHERE fba.id = fbt.from_bank_account_id AND fba.org_id = fbt.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

---

## SECTION 5 — FINANCE: `finance-expenses.ts`

#### 5-1. `fin_reimbursement_batches`

| Field | Value |
|---|---|
| Child table | `fin_reimbursement_batches` |
| Child col(s) | `org_id`, `journal_entry_id`, `bank_account_id` |
| Parent / key | `organizations.id` · `journal_entries.(org_id,id)` · `fin_bank_accounts.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; journal_entry_id integer nullable; bank_account_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `journal_entries` and `fin_bank_accounts` need `UNIQUE(org_id,id)` |
| Composite FK needed | Composite FKs to both parents |
| Nullability | Both nullable |
| Repair sketch | Standard cross-tenant check |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 5-2. `fin_expense_policies`

| Field | Value |
|---|---|
| Child table | `fin_expense_policies` |
| Child col(s) | `org_id`, `category_id` |
| Parent / key | `organizations.id` · `expense_categories.(org_id,id)` (from `hr/payroll.ts`) |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; category_id integer nullable |
| Type match | ✔ integer |
| Candidate key on parent | `expense_categories` (HR/payroll schema) needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,category_id] → [expense_categories.org_id,expense_categories.id])` |
| Nullability | category_id nullable |
| Repair sketch | `SELECT id FROM fin_expense_policies fep WHERE category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM expense_categories ec WHERE ec.id = fep.category_id AND ec.org_id = fep.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

**Cross-module dependency:** `fin_expense_policies` references HR module's `expense_categories`. Both must advance to composite FKs together in the same wave.

---

## SECTION 6 — FINANCE: `finance-planning.ts`

#### 6-1. `fin_budgets`

| Field | Value |
|---|---|
| Child table | `fin_budgets` |
| Child col(s) | `org_id` |
| Parent / key | `organizations.id` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK |
| Type match | ✔ |
| Candidate key on parent | Needs `UNIQUE(org_id,id)` on self for budget_lines and budget_revisions |
| Composite FK needed | None beyond org anchor |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 6-2. `fin_budget_lines`

| Field | Value |
|---|---|
| Child table | `fin_budget_lines` |
| Child col(s) | `org_id`, `budget_id`, `account_id`, `department_id`, `project_id` |
| Parent / key | `organizations.id` · `fin_budgets.(org_id,id)` · `ledger_accounts.(org_id,id)` · `departments.(org_id,id)` · `projects.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; budget_id integer NOT NULL; account_id integer NOT NULL; department_id integer nullable; project_id integer nullable |
| Type match | ✔ all integer |
| Candidate key on parent | All four parents need `UNIQUE(org_id,id)` |
| Composite FK needed | Composite FKs to all four parents |
| Nullability | budget_id NOT NULL · account_id NOT NULL · department_id nullable · project_id nullable |
| Repair sketch | `SELECT id FROM fin_budget_lines fbl WHERE NOT EXISTS (SELECT 1 FROM fin_budgets fb WHERE fb.id = fbl.budget_id AND fb.org_id = fbl.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

**Cross-module dependency:** references HR's `departments` and Projects' `projects`. All three modules must have `UNIQUE(org_id,id)` candidate keys before this composite FK can land.

#### 6-3. `fin_budget_revisions`

| Field | Value |
|---|---|
| Child table | `fin_budget_revisions` |
| Child col(s) | `org_id`, `budget_id` |
| Parent / key | `organizations.id` · `fin_budgets.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; budget_id integer NOT NULL |
| Type match | ✔ |
| Candidate key on parent | `fin_budgets` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,budget_id] → [fin_budgets.org_id,fin_budgets.id])` |
| Nullability | NOT NULL |
| Repair sketch | `SELECT id FROM fin_budget_revisions fbr WHERE NOT EXISTS (SELECT 1 FROM fin_budgets fb WHERE fb.id = fbr.budget_id AND fb.org_id = fbr.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 6-4. `fin_cash_flow_scenarios`

Org-anchored leaf. No intra-module parents. Low priority.

---

## SECTION 7 — FINANCE: `finance-tax.ts`

#### 7-1. `acc_tax_codes`

| Field | Value |
|---|---|
| Child table | `acc_tax_codes` |
| Child col(s) | `org_id`, `collected_account_id`, `paid_account_id` |
| Parent / key | `organizations.id` · `ledger_accounts.(org_id,id)` ×2 |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; collected_account_id integer nullable; paid_account_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `ledger_accounts` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,collected_account_id] → [ledger_accounts.org_id,ledger_accounts.id])` · same for paid_account_id |
| Nullability | Both nullable |
| Repair sketch | `SELECT id FROM acc_tax_codes atc WHERE collected_account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ledger_accounts la WHERE la.id = atc.collected_account_id AND la.org_id = atc.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 7-2. `acc_tax_payments`

| Field | Value |
|---|---|
| Child table | `acc_tax_payments` |
| Child col(s) | `org_id`, `journal_entry_id` |
| Parent / key | `organizations.id` · `journal_entries.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; journal_entry_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `journal_entries` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,journal_entry_id] → [journal_entries.org_id,journal_entries.id])` |
| Nullability | nullable |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

---

## SECTION 8 — ACCOUNTING: `accounting.ts`

#### 8-1. `ledger_accounts`

| Field | Value |
|---|---|
| Child table | `ledger_accounts` |
| Child col(s) | `org_id`, `parent_account_id` (self-ref) |
| Parent / key | `organizations.id` · `ledger_accounts.(org_id,id)` (self) |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; parent_account_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | Needs `UNIQUE(org_id,id)` on self — currently only has `UNIQUE(org_id, code)` (not on id). Self-ref `foreignKey` already exists for parent_account_id but is single-col only. |
| Composite FK needed | Add `UNIQUE(org_id,id)`; then `foreignKey([org_id,parent_account_id] → [ledger_accounts.org_id,ledger_accounts.id])` |
| Nullability | parent_account_id nullable |
| Repair sketch | `SELECT id FROM ledger_accounts la WHERE parent_account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ledger_accounts p WHERE p.id = la.parent_account_id AND p.org_id = la.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

**This is the most critical parent in the accounting cluster.** `ledger_accounts` is referenced by `acc_asset_categories` (3 FKs), `fin_bank_accounts`, `acc_system_account_map`, `accounting_settings`, `acc_tax_codes` (2 FKs), `fin_budget_lines`, and `journal_lines`. All are blocked until `UNIQUE(org_id, id)` lands on `ledger_accounts`.

#### 8-2. `journal_entries`

| Field | Value |
|---|---|
| Child table | `journal_entries` |
| Child col(s) | `org_id`, `reversed_entry_id` (self-ref) |
| Parent / key | `organizations.id` · `journal_entries.(org_id,id)` (self) |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; reversed_entry_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | Needs `UNIQUE(org_id,id)` on self — currently `UNIQUE(org_id,entry_number)` only. Self-ref single-col FK already exists. |
| Composite FK needed | Add `UNIQUE(org_id,id)`; then composite self-ref |
| Nullability | reversed_entry_id nullable |
| Repair sketch | `SELECT id FROM journal_entries je WHERE reversed_entry_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_entries rev WHERE rev.id = je.reversed_entry_id AND rev.org_id = je.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

**Second most critical accounting parent.** Referenced by `journal_lines`, `fin_bank_transactions`, `fin_reconciliation_matches`, `fin_bank_transfers`, `fin_reimbursement_batches`, `acc_depreciation_runs`, `acc_depreciation_schedules`, `acc_fixed_assets`, `acc_tax_payments`.

#### 8-3. `journal_lines`

| Field | Value |
|---|---|
| Child table | `journal_lines` |
| Child col(s) | `org_id` (nullable!), `entry_id`, `account_id` |
| Parent / key | `organizations.id` · `journal_entries.(org_id,id)` · `ledger_accounts.(org_id,id)` |
| org_id present? | Yes, **but NULLABLE** — `orgId: text("org_id").references(() => organizations.id).notNull()` is NOT NULL in the definition, but the column spec shows nullable. **Verify in actual migration.** |
| Existing ID type | serial PK; entry_id integer NOT NULL; account_id integer NOT NULL |
| Type match | ✔ |
| Candidate key on parent | `journal_entries` and `ledger_accounts` need `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,entry_id] → [journal_entries.org_id,journal_entries.id])` · `foreignKey([org_id,account_id] → [ledger_accounts.org_id,ledger_accounts.id])` |
| Nullability | entry_id NOT NULL · account_id NOT NULL · org_id: verify nullability in DB |
| Repair sketch | `SELECT id FROM journal_lines jl WHERE NOT EXISTS (SELECT 1 FROM journal_entries je WHERE je.id = jl.entry_id AND je.org_id = jl.org_id);` |
| Wave | W7-H |
| Validation | DRAFT — **verify org_id nullability in actual DB** |
| Cutover owner | Finance squad |

**Note:** `journal_lines` has 7 bare dimension integer columns (`client_id`, `vendor_id`, `project_id`, `department_id`, `employee_id`, `tax_code_id`) with NO `.references()`. These are analytic dimension tags — intentionally unbound — but they carry cross-tenant risk. Document as known gap: service layer must scope all dimension lookups by org_id.

---

## SECTION 9 — ACCOUNTING: `accounting-core.ts`

#### 9-1. `accounting_periods`

| Field | Value |
|---|---|
| Child table | `accounting_periods` |
| Child col(s) | `org_id` |
| Parent / key | `organizations.id` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK |
| Type match | ✔ |
| Candidate key on parent | Needs `UNIQUE(org_id,id)` on self — `journal_entries.period_id` references it (bare integer, no FK). |
| Composite FK needed | None beyond org anchor (leaf as parent). Add `UNIQUE(org_id,id)` so `journal_entries.period_id` can get a composite FK later. |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

**Gap:** `journal_entries.period_id` is a bare integer with no `.references()` — missing FK entirely.

#### 9-2. `accounting_dimensions`

| Field | Value |
|---|---|
| Child table | `accounting_dimensions` |
| Child col(s) | `org_id` |
| Parent / key | `organizations.id` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK |
| Type match | ✔ |
| Candidate key on parent | Needs `UNIQUE(org_id,id)` for `accounting_dimension_values.dimension_id` |
| Composite FK needed | None beyond org anchor |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 9-3. `accounting_dimension_values`

| Field | Value |
|---|---|
| Child table | `accounting_dimension_values` |
| Child col(s) | `org_id`, `dimension_id` |
| Parent / key | `organizations.id` · `accounting_dimensions.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; dimension_id integer NOT NULL |
| Type match | ✔ |
| Candidate key on parent | `accounting_dimensions` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,dimension_id] → [accounting_dimensions.org_id,accounting_dimensions.id])` |
| Nullability | NOT NULL |
| Repair sketch | `SELECT id FROM accounting_dimension_values adv WHERE NOT EXISTS (SELECT 1 FROM accounting_dimensions ad WHERE ad.id = adv.dimension_id AND ad.org_id = adv.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 9-4. `accounting_settings`

| Field | Value |
|---|---|
| Child table | `accounting_settings` |
| Child col(s) | `org_id`, `retained_earnings_account_id` |
| Parent / key | `organizations.id` · `ledger_accounts.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; retained_earnings_account_id integer nullable |
| Type match | ✔ |
| Candidate key on parent | `ledger_accounts` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,retained_earnings_account_id] → [ledger_accounts.org_id,ledger_accounts.id])` |
| Nullability | nullable |
| Repair sketch | Standard cross-tenant check |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 9-5. `acc_number_sequences`

Org-anchored leaf. Single `UNIQUE(org_id,entity_type)`. No intra-module parents. Low priority.

#### 9-6. `acc_system_account_map`

| Field | Value |
|---|---|
| Child table | `acc_system_account_map` |
| Child col(s) | `org_id`, `account_id` |
| Parent / key | `organizations.id` · `ledger_accounts.(org_id,id)` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK; account_id integer NOT NULL |
| Type match | ✔ |
| Candidate key on parent | `ledger_accounts` needs `UNIQUE(org_id,id)` |
| Composite FK needed | `foreignKey([org_id,account_id] → [ledger_accounts.org_id,ledger_accounts.id])` |
| Nullability | NOT NULL |
| Repair sketch | `SELECT id FROM acc_system_account_map sam WHERE NOT EXISTS (SELECT 1 FROM ledger_accounts la WHERE la.id = sam.account_id AND la.org_id = sam.org_id);` |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 9-7. `fin_exchange_rates`

Org-anchored leaf. No intra-module parents. Low priority.

#### 9-8. `fin_approval_policies`

| Field | Value |
|---|---|
| Child table | `fin_approval_policies` |
| Child col(s) | `org_id` |
| Parent / key | `organizations.id` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK |
| Type match | ✔ |
| Composite FK needed | None (approver_user_id → users.id is global, exempt) |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

#### 9-9. `fin_approval_requests`

| Field | Value |
|---|---|
| Child table | `fin_approval_requests` |
| Child col(s) | `org_id` |
| Parent / key | `organizations.id` |
| org_id present? | Yes, NOT NULL |
| Existing ID type | serial PK |
| Type match | ✔ |
| Composite FK needed | None beyond org anchor (`record_id` is polymorphic — no FK possible; service must validate) |
| Wave | W7-H |
| Validation | DRAFT |
| Cutover owner | Finance squad |

**Note:** `fin_approval_requests.record_id` is a polymorphic integer (type determined by `record_type` enum). No FK constraint is possible. Service-layer BOLA check is mandatory.

#### 9-10. `fin_recurring_journal_templates`

Org-anchored leaf. No intra-module parents. Low priority.

---

## SECTION 10 — Critical path summary

### Parent tables needing `UNIQUE(org_id, id)` before ANY child can get composite FKs

| Parent table | Blocks (count) | Priority |
|---|---|---|
| `ledger_accounts` | acc_asset_categories (×3), fin_bank_accounts, acc_system_account_map, accounting_settings, acc_tax_codes (×2), fin_budget_lines, journal_lines | **CRITICAL — 9+ child FKs** |
| `journal_entries` | journal_lines, fin_bank_transactions, fin_reconciliation_matches, fin_bank_transfers, fin_reimbursement_batches, acc_depreciation_runs, acc_depreciation_schedules (×2), acc_fixed_assets, acc_tax_payments | **CRITICAL — 9+ child FKs** |
| `inv_warehouses` | inv_locations, inv_purchase_orders, inv_stock_transfers (×2), inv_cycle_counts, inv_physical_audits, inv_pick_lists, inv_shipments, inv_loads, inv_reorder_rules, inv_stock_reservations | **CRITICAL — 10+ child FKs** |
| `inv_locations` | inv_stock_levels, inv_stock_transactions, inv_stock_adjustments_lines, inv_stock_transfer_lines (×2), inv_quality_holds, inv_serial_numbers, inv_quality_inspection_lines, inv_cycle_count_lines, inv_physical_audit_lines, inv_pick_list_lines, inv_stock_reservations | **CRITICAL — 11+ child FKs** |
| `inv_product_variants` | inv_stock_levels, inv_stock_transactions, inv_lots, inv_serial_numbers, inv_stock_reservations, inv_valuation_layers, inv_reorder_rules, inv_channel_stock_publications, + all `*_lines` tables | **CRITICAL — 15+ child FKs** |
| `inv_vendors` | inv_purchase_orders, inv_reorder_rules | HIGH — also needs party migration |
| `fin_bank_accounts` | fin_bank_imports, fin_bank_transactions, fin_bank_transfers (×2), fin_reimbursement_batches | HIGH |
| `acc_fixed_assets` | acc_depreciation_schedules | MEDIUM |
| `acc_depreciation_runs` | acc_depreciation_schedules | MEDIUM |
| `acc_asset_categories` | acc_fixed_assets | MEDIUM |

### Tables with missing single-column FKs (must add before composite FK work)

These have bare integer columns with no `.references()` at all — they are a pre-prerequisite step:

| Table | Missing FK columns |
|---|---|
| `inv_vendor_returns` | `vendor_id`, `po_id`, `grn_id` |
| `inv_customer_returns` | `so_id`, `shipment_id`, `client_id` |
| `inv_shipments` | `so_id` |
| `inv_shipment_lines` | `so_line_id` |
| `inv_pick_lists` | `so_id` |
| `inv_pick_list_lines` | `so_line_id`, `lot_id`, `serial_id` |
| `inv_load_lines` | `transfer_id` |
| `inv_cycle_counts` | `category_id` |
| `inv_reorder_rules` | `vendor_id` |
| `inv_serial_numbers` | `lot_id` |
| `inv_stock_reservations` | `lot_id`, `serial_id` |
| `inv_vendor_return_lines` | `lot_id`, `serial_id` |
| `inv_customer_return_lines` | `lot_id`, `serial_id` |
| `inv_quality_inspection_lines` | `lot_id`, `serial_id` |
| `inv_quality_holds` | `lot_id`, `serial_id` |
| `inv_recall_lines` | `lot_id`, `serial_id` |
| `inv_cycle_count_lines` | `lot_id` |
| `inv_physical_audit_lines` | `lot_id` |
| `journal_entries` | `period_id` (→ accounting_periods) |

### Tables with missing own `org_id` column (must add + backfill before composite FK)

All line/detail tables that inherit scope only through their parent FK:

`inv_po_lines`, `inv_grn_lines`, `inv_so_lines`, `inv_stock_adjustment_lines`, `inv_stock_transfer_lines`, `inv_shipment_lines`, `inv_package_lines`, `inv_load_lines`, `inv_vendor_return_lines`, `inv_customer_return_lines`, `inv_pick_list_lines`, `inv_quality_inspection_lines`, `inv_cycle_count_lines`, `inv_physical_audit_lines`, `inv_recall_lines`, `credit_note_items`, `vendor_credit_items`, `fin_payment_run_items`

**Count: 18 tables require `org_id` column addition and backfill before composite FKs.**

---

## SECTION 11 — int/text type mismatch audit

The plan specifically flags `billing.ts` tables (`billing_profiles`, `app_installations`, `affiliates`, `affiliate_commissions`, `referrals`, `revenue_events`) as using **integer** `org_id` against `organizations.id` (text). This document verifies the inventory/finance/accounting domains are **free of this mismatch**:

| Domain | org_id type | organizations.id type | Mismatch? |
|---|---|---|---|
| All `inventory/*` tables | `text` | `text` | ✔ No mismatch |
| `finance-ar-ap.ts` | `text` | `text` | ✔ No mismatch |
| `finance-assets.ts` | `text` | `text` | ✔ No mismatch |
| `finance-banking.ts` | `text` | `text` | ✔ No mismatch |
| `finance-expenses.ts` | `text` | `text` | ✔ No mismatch |
| `finance-planning.ts` | `text` | `text` | ✔ No mismatch |
| `finance-tax.ts` | `text` | `text` | ✔ No mismatch |
| `accounting.ts` | `text` | `text` | ✔ No mismatch |
| `accounting-core.ts` | `text` | `text` | ✔ No mismatch |

**Confirmed: zero int/text org_id mismatches across all 74 tables covered here.**
The billing integer mismatch is isolated to `billing.ts` (W7-HOTFIX, already documented in wave-7-composite-fk-matrix.md).

---

## SECTION 12 — `inv_vendors` counterparty FK architectural gap

The plan (Wave 6, `wave-6-business-party-design.md`) requires `inv_vendors` to reference `business_parties` (party_type = VENDOR) rather than `clients`. Currently:

- `inv_vendors.client_id integer → clients.id` (single-col, nullable)
- `vendor_credits.vendor_id integer → clients.id` (same pattern — vendors stored as clients)
- `fin_recurring_bill_templates.vendor_id integer → clients.id` (same)
- `acc_fixed_assets.vendor_id integer → clients.id` (same)
- `fin_payment_run_items.vendor_id integer → clients.id` (same)

All five tables use `clients` as a proxy for vendors. Post Wave 6, all must be migrated to `business_parties.party_id (text UUID)`. This is a **type change** (integer → text) not just a composite FK addition. The migration sequence is:

1. Wave 6: land `business_parties` with `UNIQUE(organization_id, party_id)` (already compliant per wave-7).
2. Backfill: create `business_parties` rows (party_type=VENDOR) for each distinct vendor in `clients`; record mapping.
3. Add new `party_id text` column to each of the 5 tables (nullable); backfill from mapping.
4. Once backfilled and verified: add composite FK `foreignKey([org_id,party_id] → [business_parties.organization_id,business_parties.party_id])`.
5. Drop old `client_id`/`vendor_id` integer column.

---

## Table count

| Domain | Tables covered |
|---|---|
| inventory/warehouses | 2 |
| inventory/purchase-orders | 5 |
| inventory/sales-orders | 2 |
| inventory/stock | 5 |
| inventory/shipping | 7 |
| inventory/operations | 10 |
| inventory/quality | 5 |
| inventory/traceability | 2 |
| inventory/reservations | 1 |
| inventory/valuation | 1 |
| inventory/planning | 2 |
| inventory/admin | 8 |
| inventory/channels | 3 |
| finance-ar-ap | 13 |
| finance-assets | 4 |
| finance-banking | 6 |
| finance-expenses | 2 |
| finance-planning | 4 |
| finance-tax | 2 |
| accounting (accounting.ts) | 3 |
| accounting-core | 10 |
| **Total** | **97** |
