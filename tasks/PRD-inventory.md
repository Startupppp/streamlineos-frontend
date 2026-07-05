# PRD — Inventory / ERP Module (Implementation-Grade)

Last updated: 2026-07-01  
Repo: `D:/projects/personal/Streamlineos`

## UI/UX source of truth

- **Source of truth**: [PRD-ui-ux-system.md](./PRD-ui-ux-system.md)
- **Canonical UI references**: `/signin` and `/signup`

This PRD is **grounded in the current repo implementation**:

- **Frontend routes/pages**: `frontend/app/(authenticated)/inventory/**` + `PAGES.md`
- **Frontend domain types**: `frontend/types/inventory.ts`
- **Frontend client data hooks**: `frontend/hooks/api/inventory/*.ts`
- **Backend NestJS modules**: `backend/src/modules/inv-*` + RBAC + module gating
- **Backend Drizzle schema**: `backend/src/db/schema/inventory/*.ts`

---

## Goals

- **Ship a production-grade Inventory module** with clean UX flows that match existing Inventory routes.
- Ensure **multi-tenant isolation** (all inventory rows scoped by `orgId`) and enforce **backend authZ** on every endpoint.
- Provide reliable, auditable stock accounting:
  - **No silent stock drift**; every movement creates `inv_stock_transactions`.
  - **Consistent state machines** for Purchase Orders, GRNs, Sales Orders, Transfers, and Adjustments.
- Make **expensive inventory queries fast** (stock summary, reorder, ATP, movements) with correct **indexes + caching + invalidation**.
- Cover edge cases: **concurrency**, **negative stock rules**, **partial receipts/shipments**, **idempotency**, and **retries**.

## Non-goals (explicit)

- No frontend `app/api/**` business endpoints. Inventory APIs live in **NestJS backend only**.
- No MRP/BOM/production planning (beyond what’s required to keep stock correct).
- No full barcode scanning app (can be a future phase).

---

## Current Inventory Route Map (Ground truth)

From `PAGES.md` and `frontend/app/(authenticated)/inventory/**`:

- **Dashboard**
  - `/inventory` → `frontend/app/(authenticated)/inventory/page.tsx` + `inventory-dashboard-client.tsx`
- **Products**
  - `/inventory/products` → `products/page.tsx`
  - `/inventory/products/new` → `products/new/page.tsx`
  - `/inventory/products/[productId]` → `products/[productId]/page.tsx`
  - `/inventory/products/categories` → `products/categories/page.tsx`
  - `/inventory/products/uom` → `products/uom/page.tsx`
- **Stock**
  - `/inventory/stock` → `stock/page.tsx` (stock levels)
  - `/inventory/stock/adjustments` → `stock/adjustments/page.tsx`
  - `/inventory/stock/movements` → `stock/movements/page.tsx`
  - `/inventory/stock/transfers` → `stock/transfers/page.tsx`
  - `/inventory/stock/transfers/[transferId]` → `stock/transfers/[transferId]/page.tsx`
- **Warehouses**
  - `/inventory/warehouses` → `warehouses/page.tsx`
  - `/inventory/warehouses/[warehouseId]` → `warehouses/[warehouseId]/page.tsx`
- **Vendors**
  - `/inventory/vendors` → `vendors/page.tsx`
  - `/inventory/vendors/[vendorId]` → `vendors/[vendorId]/page.tsx`
- **Purchase Orders**
  - `/inventory/purchase-orders` → `purchase-orders/page.tsx`
  - `/inventory/purchase-orders/new` → `purchase-orders/new/page.tsx`
  - `/inventory/purchase-orders/[poId]` → `purchase-orders/[poId]/page.tsx`
- **Sales Orders**
  - `/inventory/sales-orders` → `sales-orders/page.tsx`
  - `/inventory/sales-orders/new` → `sales-orders/new/page.tsx`
  - `/inventory/sales-orders/[soId]` → `sales-orders/[soId]/page.tsx`
- **Reports**
  - `/inventory/reports/stock-summary` → `reports/stock-summary/page.tsx`
  - `/inventory/reports/movements` → `reports/movements/page.tsx`
  - `/inventory/reports/reorder` → `reports/reorder/page.tsx`

---

## Personas & Roles

### Primary personas

- **Inventory Manager**: manages catalog, warehouses, vendors, purchase orders, stock operations, reporting.
- **Warehouse Staff**: receives goods, performs transfers/adjustments, checks stock levels.
- **Sales Ops**: creates sales orders, confirms/reserves, ships, invoices.
- **Finance/Accounting**: cares about inventory valuation postings (GRN, COGS, AR).

### Role gating (current frontend)

`frontend/app/(authenticated)/inventory/layout.tsx` currently gates by a **role allowlist**:

- `OWNER`, `CEO`, `INVENTORY_MANAGER`, `WAREHOUSE_STAFF` are allowed.

### RBAC permission keys (backend catalog)

Backend permission keys are defined in `backend/src/modules/rbac/permissions.constants.ts` (Inventory subset):

- Products
  - `inventory:products:read` (scopable)
  - `inventory:products:create`
  - `inventory:products:update`
  - `inventory:products:delete`
- Stock
  - `inventory:stock:read` (scopable)
  - `inventory:stock:adjust`
  - `inventory:stock:transfer`
- Warehouses / Vendors
  - `inventory:warehouses:read`
  - `inventory:warehouses:manage`
  - `inventory:vendors:read`
  - `inventory:vendors:manage`
- Purchase Orders
  - `inventory:purchase-orders:read` (scopable)
  - `inventory:purchase-orders:create`
  - `inventory:purchase-orders:approve` (Send PO)
  - `inventory:purchase-orders:receive` (GRN)
- Sales Orders
  - `inventory:sales-orders:read` (scopable)
  - `inventory:sales-orders:create`
  - `inventory:sales-orders:confirm` (Reserve)
  - `inventory:sales-orders:ship` (Deduct + COGS)
  - `inventory:sales-orders:invoice` (Create invoice)
- Reports
  - `inventory:reports:read`

### DataScope (scopable permissions)

Inventory scopable reads resolve through `backend/src/modules/inventory/inventory-scope.ts`, returning `DataScope` for:

- `inventory:products:read`
- `inventory:purchase-orders:read`
- `inventory:sales-orders:read`
- `inventory:stock:read`

Implementation requirement:

- **All list endpoints that can leak data** must apply `DataScope` (already done for Products list, PO list, SO list, Stock adjustments list, Stock transfers list).
- Ensure scope is **consistent** across all inventory list endpoints (including movements reports if needed).

---

## Module Gating (Feature Enable/Disable)

Backend uses `@RequireModule("inventory")` + `ModuleGuard` (`backend/src/common/rbac/module.guard.ts`) to deny access when `user.enabledModules` does not include `"inventory"`.

### Requirements

- **All Inventory controllers** must be module-gated:
  - Already present for: Warehouses, Vendors, Stock, Purchase Orders, Sales Orders, Reports.
  - **Must also be added to Products controller** (`backend/src/modules/inv-products/inv-products.controller.ts`) so Products can’t be used when the module is disabled.
- Frontend should reflect module state in navigation and entry points (UX only):
  - If module disabled: show a clear “Inventory module disabled” screen and link to `/settings/modules` (permission-gated).

---

## Backend Architecture (NestJS-only)

### Backend modules (existing)

- `inv-products` → `backend/src/modules/inv-products/*`
- `inv-warehouses` → `backend/src/modules/inv-warehouses/*`
- `inv-vendors` → `backend/src/modules/inv-vendors/*`
- `inv-stock` → `backend/src/modules/inv-stock/*`
- `inv-purchase-orders` → `backend/src/modules/inv-purchase-orders/*`
- `inv-sales-orders` → `backend/src/modules/inv-sales-orders/*`
- `inv-reports` → `backend/src/modules/inv-reports/*`

### API surface (existing; must remain stable)

All endpoints are under `/inventory/**` and are **JWT-authenticated**, permission-guarded, and (most) module-gated.

#### Products (`/inventory/products`)

- `GET /inventory/products` (scoped) → list (filters: `status`, `categoryId`, `search`, `page`, `limit`)
- `GET /inventory/products/:productId`
- `POST /inventory/products`
- `PATCH /inventory/products/:productId`
- `DELETE /inventory/products/:productId`
- `GET /inventory/products/categories`
- `POST /inventory/products/categories`
- `GET /inventory/products/uom`
- `POST /inventory/products/uom`
- `GET /inventory/products/variants` (flat list for selectors)
- `POST /inventory/products/:productId/variants`
- `PATCH /inventory/products/:productId/variants/:variantId`

#### Warehouses (`/inventory/warehouses`)

- `GET /inventory/warehouses`
- `GET /inventory/warehouses/:warehouseId`
- `POST /inventory/warehouses`
- `PATCH /inventory/warehouses/:warehouseId`
- `GET /inventory/warehouses/:warehouseId/locations`
- `POST /inventory/warehouses/:warehouseId/locations`
- `PATCH /inventory/warehouses/:warehouseId/locations/:locationId`

#### Vendors (`/inventory/vendors`)

- `GET /inventory/vendors` (filters: `search`, `isActive`, `page`, `limit`)
- `GET /inventory/vendors/:vendorId`
- `POST /inventory/vendors`
- `PATCH /inventory/vendors/:vendorId`

#### Stock (`/inventory/stock`)

- `GET /inventory/stock` (stock levels; filters: `warehouseId?`, `productId?`, `lowStock?`, `page`, `limit`)
- `GET /inventory/stock/transactions` (movement ledger; filters: `productVariantId?`, `locationId?`, `transactionType?`, `fromDate?`, `toDate?`, `page`, `limit`)
- `GET /inventory/stock/adjustments` (scoped; pagination)
- `POST /inventory/stock/adjustments`
- `GET /inventory/stock/transfers` (scoped; pagination)
- `GET /inventory/stock/transfers/:transferId`
- `POST /inventory/stock/transfers`
- `POST /inventory/stock/transfers/:transferId/complete`

#### Purchase Orders (`/inventory/purchase-orders`)

- `GET /inventory/purchase-orders` (scoped; filters: `vendorId?`, `status?`, `page`, `limit`)
- `GET /inventory/purchase-orders/:poId`
- `POST /inventory/purchase-orders`
- `POST /inventory/purchase-orders/:poId/send`
- `POST /inventory/purchase-orders/:poId/receive` (GRN)

#### Sales Orders (`/inventory/sales-orders`)

- `GET /inventory/sales-orders` (scoped; filters: `clientId?`, `status?`, `page`, `limit`)
- `GET /inventory/sales-orders/:soId`
- `POST /inventory/sales-orders`
- `POST /inventory/sales-orders/:soId/confirm`
- `POST /inventory/sales-orders/:soId/ship`
- `POST /inventory/sales-orders/:soId/invoice`
- `GET /inventory/sales-orders/:soId/atp`

#### Reports (`/inventory/reports`)

- `GET /inventory/reports/dashboard`
- `GET /inventory/reports/stock-summary`
- `GET /inventory/reports/reorder`
- `GET /inventory/reports/movements` (paginated; filters: `fromDate?`, `toDate?`, `page`, `limit`)

### Backend schema (existing; source of truth)

Inventory tables live under `backend/src/db/schema/inventory/`:

- `core.ts`
  - `inv_uom`
  - `inv_categories`
  - `inv_products`
  - `inv_product_variants`
- `warehouses.ts`
  - `inv_warehouses`
  - `inv_locations`
- `stock.ts`
  - `inv_stock_levels` (unique: `(product_variant_id, location_id)`)
  - `inv_stock_transactions`
  - `inv_stock_adjustments` + `inv_stock_adjustment_lines`
  - `inv_stock_transfers` + `inv_stock_transfer_lines`
- `purchase-orders.ts`
  - `inv_vendors`
  - `inv_purchase_orders` + `inv_po_lines`
  - `inv_grns` + `inv_grn_lines`
- `sales-orders.ts`
  - `inv_sales_orders` + `inv_so_lines`

---

## Schema Gaps & Fixes (Required)

These are **implementation gaps** between current schema/API usage and ERP-grade correctness. Fixing them is mandatory because multiple current flows depend on “magic” IDs or mismatched identifiers.

### 1) Warehouse ↔ Location mapping (remove `locationId = 1` fallbacks)

Current backend code paths use `locationId = 1` or treat `warehouseId` as a `locationId` in multiple places (e.g., PO send/receive, SO confirm/ship, transfers).

Requirements:

- **Every warehouse must have a deterministic default location** used for receiving/shipping/reservations when a specific bin is not chosen.
- Implement one of:
  - **Option A (recommended)**: Add `inv_warehouses.defaultLocationId` FK → `inv_locations.id`.
  - **Option B**: Create a required “ROOT” location per warehouse and always resolve it by query, not by hard-coded ID.
- Update all stock-affecting services to resolve `locationId` via warehouse default when only `warehouseId` is known.

### 2) Product vs Variant identifiers (enforce variant-first everywhere stock moves)

Stock is tracked by `inv_product_variants.id` and all movement tables reference `productVariantId`.

Requirements:

- Frontend “New Sales Order” and transfer/adjustment sheets must select **product variants**, not products.
- Backend DTOs and UI field names must be explicit: `productVariantId`, never ambiguous `productId`.

### 3) Stock level filtering must be functional

Frontend uses filters such as `warehouseId` and `productId` for `GET /inventory/stock`.

Requirements:

- Backend `InvStockService.listStockLevels()` must honor:
  - `warehouseId` (via join `inv_locations.warehouse_id`)
  - `productId` (via join `inv_product_variants.product_id`)
- If the API keeps the query param name `productId`, define it explicitly as **inv_products.id** and implement accordingly.

---

## Domain Rules & State Machines

### Stock quantities (canonical definitions)

At the `inv_stock_levels` row level (per `orgId`, `productVariantId`, `locationId`):

- **onHand**: physically present stock
- **committed**: reserved stock (e.g. confirmed sales orders; transfer reservations)
- **onOrder**: expected inbound stock (sent POs not fully received)
- **available**: \(onHand - committed\)

Implementation requirement:

- `available` must never be computed with a stale snapshot when doing a write (confirm/transfer/ship). Writes must be transactional and concurrency-safe.

### Purchase Order state machine (`PurchaseOrderStatus`)

Frontend types: `DRAFT | SENT | PARTIAL | RECEIVED | CLOSED | CANCELLED`

Backend behaviour (current):

- `DRAFT` → `SENT` via `POST /purchase-orders/:poId/send`
  - increments `onOrder` in stock levels
- `SENT | PARTIAL` → receipt via `POST /purchase-orders/:poId/receive`
  - creates GRN + lines
  - updates `quantityReceived` on PO lines
  - increments `onHand` and decrements `onOrder` for ACCEPTED receipts
  - transitions PO to `PARTIAL` or `RECEIVED` depending on remaining qty

PRD requirements (hardening):

- **Idempotency**: `send` and `receive` must support `Idempotency-Key` so retries don’t double-add `onOrder` or double-receive.
- **Warehouse-to-location correctness**:
  - Never use “magic” `locationId = 1`.
  - Define and persist a per-warehouse default receiving location (see “Schema gaps & fixes”).
- **Rejected goods**:
  - Support GRN lines with `REJECTED` and require `rejectionReason`.
  - Rejected lines must not increase `onHand`.
  - Optionally: create a “QC Hold / Rejected” location and move stock there (future).

### GRN (Goods Receipt Note)

GRN is a stock movement event that must:

- Create `inv_grns` + `inv_grn_lines`
- Create `inv_stock_transactions` of type `GRN` for accepted quantities
- Update `inv_stock_levels.onHand` and `inv_stock_levels.onOrder`
- Produce audit log entries (see Audit section)
- Post accounting entries (already implemented through `JournalPostingService`)

### Sales Order state machine (`SalesOrderStatus`)

Frontend types: `DRAFT | CONFIRMED | SHIPPED | INVOICED | CANCELLED`

Backend behaviour (current):

- `DRAFT` → `CONFIRMED` via `POST /sales-orders/:soId/confirm`
  - validates sufficient availability
  - increments `committed`
- `CONFIRMED` → `SHIPPED` via `POST /sales-orders/:soId/ship`
  - decrements `onHand`
  - decrements `committed`
  - writes `inv_stock_transactions` of type `SALE`
  - posts COGS accounting entry
- `SHIPPED` → `INVOICED` via `POST /sales-orders/:soId/invoice`
  - creates invoice in Billing/CRM schema
  - posts AR + revenue

PRD requirements (hardening):

- **Concurrency**: confirming must be safe against concurrent confirmations/shipments for the same variants.
  - Use transaction + row locks or atomic SQL to prevent overselling.
- **Partial shipment support**:
  - Backend already accepts a ship body schema; the UI currently sends shipped lines but the backend path must apply them.
  - Implement partial shipping: update `quantityShipped` per line, allow `PARTIALLY_SHIPPED` (if desired) or keep `CONFIRMED` until full shipment. (If adding a new status, update frontend enums and backend `invSoStatusEnum`.)
- **Negative stock rules**:
  - Default: do not allow.
  - Add an org-level setting (and a permission like `inventory:stock:override-negative` if needed) for controlled overrides.

### Stock Transfer state machine (`TransferStatus`)

Frontend types: `PENDING | IN_TRANSIT | COMPLETED | CANCELLED`

Backend behaviour (current):

- `POST /stock/transfers` creates transfer + lines, and increments `committed` at the from-location.
- `POST /stock/transfers/:id/complete`:
  - decrements `onHand` and `committed` at from-location
  - increments `onHand` at to-location
  - writes `TRANSFER_OUT` + `TRANSFER_IN` transactions
  - sets status `COMPLETED`

PRD requirements (hardening):

- **Partial receive**: allow per-line received qty < requested and record variance as part of transfer completion.
- **In-transit**: provide an explicit “dispatch” action that moves `committed` → “in transit” (optional: dedicated column or transaction model).
- **Negative stock**: completing a transfer must fail if it would take `onHand` below 0 unless override rules allow.
- **Idempotency** on complete.

### Stock Adjustment

Current UI allows `AdjustmentType = IN | OUT | SET`. Current backend expects **signed `quantityChange`** per line.

PRD requirements:

- Support **SET** properly:
  - Convert SET into a delta: `quantityChange = targetOnHand - currentOnHand`.
  - Record the `before` and `after` correctly in `inv_stock_transactions`.
- Improve UX: never ask users to type raw IDs (product variant ID, location ID). Use selectors.

---

## Frontend UX (Click-by-click, page-by-page)

This section documents the **current** UX and the **required** UX hardening to reach “ERP-grade”.

### `/inventory` — Inventory Dashboard

Files:

- `frontend/app/(authenticated)/inventory/page.tsx`
- `frontend/app/(authenticated)/inventory/inventory-dashboard-client.tsx`

Primary components used:

- `PageWrapper`, `StatCard`, `Card`, `Table`, `EmptyState`, `ErrorState`, `Skeleton`, `Badge`

Data hooks used:

- `useInventoryDashboard()` → `GET /inventory/reports/dashboard`
- `useProducts({ limit: 1 })` → `GET /inventory/products`
- `useStockSummary()` → `GET /inventory/reports/stock-summary`
- `useReorderReport()` → `GET /inventory/reports/reorder`
- `useStockTransactions({ limit: 10 })` → `GET /inventory/stock/transactions`

Click flow (happy path):

- Open `/inventory`
- Review KPI cards:
  - Total SKUs → click → `/inventory/products`
  - Total On Hand → click → `/inventory/stock`
  - Low Stock Items → click → `/inventory/stock`
  - Open Sales Orders → click → `/inventory/sales-orders`
- Review “Recent Movements” → click “View all” → `/inventory/stock`
- Review “Low Stock Alerts” → click “View all” → `/inventory/stock`

Empty-state flow:

- If no SKUs/stock: dashboard shows “No inventory data yet” with CTA “Add Product” → `/inventory/products`

Hardening requirements:

- Ensure dashboard endpoints are cached (already via `CACHE_KEYS.invDashboard`) and invalidated on any stock-impacting mutation.

---

### `/inventory/products` — Products List

File: `frontend/app/(authenticated)/inventory/products/page.tsx`

Components:

- `PageWrapper`, `ListToolbar`, `Select`, `Table`, `Badge`, `Button`, `DataTablePagination`

Hooks:

- `useProducts({ search, status, categoryId, page, limit })` → `GET /inventory/products`
- `useCategories()` → `GET /inventory/products/categories`

Click flow:

- Search in toolbar (name/SKU)
- Filter by Status (Active/Inactive) and Category
- Click product name or “View” → `/inventory/products/[productId]`
- Click “New Product” → `/inventory/products/new`
- Page through pagination

Hardening requirements:

- Add bulk actions (future): activate/deactivate, export.
- Ensure `totalStock` displayed is correct (backend must return it or compute via report endpoint).

---

### `/inventory/products/new` — New Product

File: `frontend/app/(authenticated)/inventory/products/new/page.tsx`

Components:

- `react-hook-form` + Zod (`productSchema`)
- `PageWrapper`, `Card`, `Input`, `Textarea`, `Select`, `Button`

Hooks:

- `useCategories()`, `useUom()`
- `useCreateProduct()` → `POST /inventory/products`

Click flow:

- Fill Basic Information (Name, SKU, Category, UOM, Description, Status)
- Fill Pricing (Cost, Selling)
- Fill Reorder Settings (Reorder Point)
- Submit → success toast → redirect to `/inventory/products`

Hardening requirements:

- Add “hasVariants” and variant creation workflow (see Product Detail).
- Add barcode support end-to-end (already in schema/types; needs UI field and scan later).

---

### `/inventory/products/[productId]` — Product Detail

File: `frontend/app/(authenticated)/inventory/products/[productId]/page.tsx`

Components:

- `Tabs` (“Info”, “Variants”, “Stock”), `Card`, `Table`, `Badge`
- Edit form uses `react-hook-form` + Zod

Hooks:

- `useProduct(productId)` → `GET /inventory/products/:productId`
- `useUpdateProduct()` → `PATCH /inventory/products/:productId`
- `useStockLevels({ productId })` → `GET /inventory/stock?productId=...` (note: backend currently filters by **productVariantId**, not productId; ensure contract matches)

Click flow:

- Info tab:
  - Click “Edit” → edit form shows inline → “Save changes” updates product → toast
- Variants tab:
  - Shows variants table
  - “Add Variant” button exists but no flow implemented
- Stock tab:
  - Shows per-location stock rows

Hardening requirements:

- Implement “Add Variant” as a Sheet:
  - Inputs: name, sku, costPrice, sellingPrice, attributes
  - Calls `POST /inventory/products/:productId/variants`
- Ensure Stock tab uses **variant-level** stock (inventory is tracked on `inv_product_variants`).

---

### `/inventory/products/categories` — Categories

File: `frontend/app/(authenticated)/inventory/products/categories/page.tsx`

Click flow:

- Create Category card:
  - Set Name, optional Parent Category, Description → “Add Category”
- Categories table shows all categories with parent name resolution

Hardening requirements:

- Add “edit category” + “archive category” (keep stable IDs).
- Prevent cycles (backend should enforce if parent editing is added).

---

### `/inventory/products/uom` — Units of Measure

File: `frontend/app/(authenticated)/inventory/products/uom/page.tsx`

Click flow:

- Create UOM card → name + abbreviation → “Add UOM”
- UOM table lists all

Hardening requirements:

- Add edit/archive when needed; enforce unique `(orgId, name)` and abbreviation constraints.

---

### `/inventory/stock` — Stock Levels

File: `frontend/app/(authenticated)/inventory/stock/page.tsx`

Click flow:

- Optional filter by Warehouse
- Toggle “Low stock only”
- Table shows per-row status:
  - Critical: available <= reorder point
  - Low: available <= min stock
  - OK

Hardening requirements:

- Implement “minStockLevel” and “maxStockLevel” correctly; backend currently returns `minStockLevel: null` in client mapping.
- Add “drill-down” row click → product detail / location view.

---

### `/inventory/stock/adjustments` — Stock Adjustments

File: `frontend/app/(authenticated)/inventory/stock/adjustments/page.tsx`

Current click flow:

- Click “New Adjustment”
- In sheet, user must enter:
  - Warehouse
  - **Product Variant ID** (manual)
  - **Location ID** (manual)
  - Adjustment type (IN/OUT/SET)
  - Quantity, reason, notes
- Submit → creates adjustment → list refreshes

Hardening requirements (ERP-grade):

- Replace raw-ID inputs with selectors:
  - Warehouse selector → load locations selector
  - Product selector should be **variant selector** (`GET /inventory/products/variants?activeOnly=true`)
- Implement SET semantics end-to-end (delta computation).
- Add adjustment detail drawer (future) and allow export.

---

### `/inventory/stock/movements` — Stock Movements (Ledger)

File: `frontend/app/(authenticated)/inventory/stock/movements/page.tsx`

Click flow:

- Pick date preset (7/30/90/all)
- Filter transaction type
- Inspect ledger rows (qty change, before/after, reference, user)

Hardening requirements:

- Add pagination controls (backend supports it; current UI shows just current page result count).
- Add filters for product variant, location, reference type/id.

---

### `/inventory/stock/transfers` — Transfers

File: `frontend/app/(authenticated)/inventory/stock/transfers/page.tsx`

Current click flow:

- Filter by status
- “New Transfer” sheet asks:
  - From warehouse, to warehouse
  - **Product ID** (manual)
  - Quantity, notes
- List row click opens detail: `/inventory/stock/transfers/[transferId]`

Hardening requirements:

- Transfer creation must support multi-line transfers and variant selectors (no manual IDs).
- Transfers must support partial receive and variance tracking (detail page already shows variance).

---

### `/inventory/stock/transfers/[transferId]` — Transfer Detail

File: `frontend/app/(authenticated)/inventory/stock/transfers/[transferId]/page.tsx`

Click flow:

- View status + from/to location
- “Mark as Completed”:
  - currently auto-marks each line received quantity = requested quantity

Hardening requirements:

- Add a “Receive transfer” sheet:
  - Per-line received qty input, default = requested
  - Validate received qty ≤ requested (unless over-receipt explicitly allowed)
- Add “Dispatch” step to move from PENDING → IN_TRANSIT with audit trail.

---

### `/inventory/warehouses` — Warehouses

File: `frontend/app/(authenticated)/inventory/warehouses/page.tsx`

Click flow:

- View warehouse cards (name/code/default/location count)
- “New Warehouse” opens Sheet (name, code, address, city/state/country)
- Click card → `/inventory/warehouses/[warehouseId]`

Hardening requirements:

- Add set-default action and archive/restore (optional).
- Enforce code uniqueness and stable default receiving location creation.

---

### `/inventory/warehouses/[warehouseId]` — Warehouse Detail (Locations)

File: `frontend/app/(authenticated)/inventory/warehouses/[warehouseId]/page.tsx`

Click flow:

- View locations grouped by type: ZONE/AISLE/RACK/BIN
- “Add Location” opens Sheet:
  - Type, name, code, optional parent

Hardening requirements:

- Implement location tree rendering by parent (currently flat grouped display).
- Add “inactive” toggle and edit.

---

### `/inventory/vendors` — Vendors

File: `frontend/app/(authenticated)/inventory/vendors/page.tsx`

Click flow:

- Search vendors
- “New vendor” opens `AppSheet` form (name required, code optional, currency, GSTIN, lead time, payment terms, etc.)
- Click vendor name → `/inventory/vendors/[vendorId]`

Hardening requirements:

- Add edit vendor flow (backend supports PATCH).

---

### `/inventory/vendors/[vendorId]` — Vendor Detail

File: `frontend/app/(authenticated)/inventory/vendors/[vendorId]/page.tsx`

Click flow:

- View vendor fields (status, code, email, phone, GSTIN, lead time, terms, address/notes)
- “New PO” CTA links to `/inventory/purchase-orders/new?vendorId=...`
- Purchase orders table lists this vendor’s POs

---

### `/inventory/purchase-orders` — Purchase Orders List

File: `frontend/app/(authenticated)/inventory/purchase-orders/page.tsx`

Click flow:

- Filter by status and vendor
- Click PO # → detail
- “New PO” → `/inventory/purchase-orders/new`

---

### `/inventory/purchase-orders/new` — New Purchase Order

File: `frontend/app/(authenticated)/inventory/purchase-orders/new/page.tsx`

Click flow:

- Select vendor, order date, expected delivery, notes
- Add lines:
  - Select variant (product name + SKU)
  - quantity, unit cost (auto-filled from costPrice), tax %
- Totals computed client-side
- Submit:
  - Calls `POST /inventory/purchase-orders`
  - Redirects to PO detail

Hardening requirements:

- Add warehouse selector to route received stock to a warehouse (backend supports `warehouseId`).
- Add currency selection consistency (backend defaults INR).

---

### `/inventory/purchase-orders/[poId]` — Purchase Order Detail + GRN

File: `frontend/app/(authenticated)/inventory/purchase-orders/[poId]/page.tsx`

Click flow:

- If PO is `DRAFT`: “Send PO” (calls `POST /purchase-orders/:poId/send`)
- If PO is `SENT|PARTIAL` and has pending lines: “Receive goods”
  - Opens sheet with per-line “Qty received”
  - Submits GRN (calls `POST /purchase-orders/:poId/receive`)
- Displays GRN history table

Hardening requirements:

- Add location selector for receiving (backend supports `locationId`).
- Add acceptance/rejection per line and enforce reasons for rejection.

---

### `/inventory/sales-orders` — Sales Orders List

File: `frontend/app/(authenticated)/inventory/sales-orders/page.tsx`

Click flow:

- Filter by status and date range
- Click SO # → detail
- “New SO” → `/inventory/sales-orders/new`

---

### `/inventory/sales-orders/new` — New Sales Order

File: `frontend/app/(authenticated)/inventory/sales-orders/new/page.tsx`

Current click flow:

- Optional customer selection
- Required warehouse selection
- Add lines selecting **Products** (not variants)

Critical requirement:

- Sales orders operate on `inv_product_variants` (`productVariantId`).
- The New SO page must be updated to select **variants**, not products, to match backend schema and avoid ID mismatches.

Hardening requirements:

- Use `GET /inventory/products/variants?activeOnly=true` for selectors (same as PO new).
- Add inline ATP check per line (optional).

---

### `/inventory/sales-orders/[soId]` — Sales Order Detail (Confirm/Ship/Invoice)

File: `frontend/app/(authenticated)/inventory/sales-orders/[soId]/page.tsx`

Click flow:

- If `DRAFT`: “Confirm Order” → reserves stock (`POST /sales-orders/:soId/confirm`)
- If `CONFIRMED`: “Ship Order” → deduct stock (`POST /sales-orders/:soId/ship`)
- If `SHIPPED`: “Generate Invoice” → creates invoice (`POST /sales-orders/:soId/invoice`)
- Shows ATP indicator per line using `GET /sales-orders/:soId/atp`
- If invoice created: “View Invoice” links to `/billing/invoices/[invoiceId]`

Hardening requirements:

- Implement partial shipping and location selection (picking) as described in backend requirements.

---

### Reports

#### `/inventory/reports/stock-summary`

File: `frontend/app/(authenticated)/inventory/reports/stock-summary/page.tsx`

Click flow:

- View table of stock summary rows
- Export CSV (client-side)

Hardening requirements:

- Add server-side CSV export for large datasets (future) with streaming.

#### `/inventory/reports/movements`

File: `frontend/app/(authenticated)/inventory/reports/movements/page.tsx`

Click flow:

- Filter by warehouse, type, date from/to
- View movement rows (qty, balance after, reference, user)

#### `/inventory/reports/reorder`

File: `frontend/app/(authenticated)/inventory/reports/reorder/page.tsx`

Click flow:

- View KPI cards: out-of-stock, critical, low
- View reorder rows + suggested qty

Hardening requirements:

- Add “Create PO from reorder” (future):
  - group by preferred vendor, prefill `/purchase-orders/new` line items.

---

## Performance, Caching & Indexing

### Caching (existing patterns; must be correct)

Backend uses Upstash Redis via `CacheService`.

Key inventory cache keys (from `backend/src/common/cache/cache-keys.ts`):

- `inv:products:list:${orgId}:${hash}` (TTL short)
- `inv:products:categories:${orgId}` (TTL medium)
- `inv:products:uom:${orgId}` (TTL medium)
- `inv:stock:levels:${orgId}:${hash}` (TTL short)
- `inv:stock:summary:${orgId}` (TTL medium)
- `inv:dashboard:${orgId}` (TTL short)
- `inv:reorder:${orgId}` (TTL medium)
- `inv:vendors:list:${orgId}:${hash}` (TTL short)
- `inv:po:list:${orgId}:${hash}` (TTL short)
- `inv:so:list:${orgId}:${hash}` (TTL short)

TTL constants:

- SHORT = 30s, MEDIUM = 5m, LONG = 10m

### Invalidation rules (must be enforced)

Any mutation that affects stock, reorder, or dashboard must invalidate:

- `CACHE_KEYS.invDashboard(orgId)`
- `CACHE_KEYS.invStockSummary(orgId)`
- `CACHE_KEYS.invReorderReport(orgId)`
- `inv:stock:levels:${orgId}:*` (pattern scan)

Stock-affecting mutations include:

- Receive goods (GRN)
- Send PO (onOrder)
- Confirm SO (committed)
- Ship SO (onHand + committed)
- Create adjustment
- Create transfer (committed)
- Complete transfer (onHand + committed)

### Index requirements (already present; validate)

Critical indexes in Drizzle schema:

- Stock uniqueness: `uniq_inv_stock_variant_location(product_variant_id, location_id)`
- Hot query indexes:
  - `idx_inv_txn_org_variant(org_id, product_variant_id)`
  - `idx_inv_txn_org_type(org_id, transaction_type)`
  - `idx_inv_txn_created(created_at)`
  - `idx_inv_po_org_status(org_id, status)`
  - `idx_inv_so_org_status(org_id, status)`
  - `idx_inv_transfers_org_status(org_id, status)`

### Expensive query notes & requirements

- Stock levels low-stock filter uses a correlated subquery against `inv_products.reorder_point`.
  - Requirement: keep this fast by ensuring joins and referenced columns are indexed and by caching the result.
  - Future optimization: denormalize reorder/min/max into variant or stock-level for faster filters.
- Movements report can be large:
  - Require pagination and date range filtering defaults.
  - Add composite index `(org_id, created_at DESC)` on transactions if not present.

---

## Concurrency, Idempotency & Data Integrity

### Concurrency hazards to eliminate

- Two users confirming sales orders simultaneously for the same variant can oversell if both read the same availability snapshot.
- Transfers and shipments can race with confirmations/receipts.

Requirements:

- All stock-reserving/deducting operations must be done in a **single DB transaction**, with one of:
  - Row locks on the relevant `inv_stock_levels` rows, or
  - Atomic SQL updates that fail when resulting stock would be negative.
- Prefer **idempotent writes** using an Idempotency-Key mechanism:
  - Store `(orgId, idempotencyKey, endpoint)` with request hash + response snapshot and TTL.
  - On retry: return original response.

### Negative stock rules

Default business rule: **negative onHand is not allowed**.

Optional (future) settings:

- `inventory.allowNegativeStock` (org-level)
- `inventory:stock:override-negative` (permission) to allow deliberate overrides with audit logging

### Decimal quantities

Schema uses `decimal(18,4)` for quantities. Requirements:

- UI must allow fractional quantities where it makes sense (already uses `step="0.0001"` in some places).
- Backend must consistently parse and format quantities (avoid float drift in JS).

---

## Audit Logging (mandatory for ERP-grade)

Backend already supports audit logs via:

- `AuditService` (`backend/src/common/audit/audit.service.ts`)
- Audit log viewer (`GET /audit-log`, permission `audit-log:read`)

Inventory must log:

- `inv.product.created|updated|deleted`
- `inv.variant.created|updated`
- `inv.warehouse.created|updated`
- `inv.location.created|updated`
- `inv.vendor.created|updated`
- `inv.po.created|sent|received`
- `inv.grn.created` (include totals, accepted/rejected counts)
- `inv.so.created|confirmed|shipped|invoiced`
- `inv.stock.adjustment.created`
- `inv.stock.transfer.created|completed`

Audit metadata must include:

- `before` / `after` (where feasible)
- reference numbers (`PO-...`, `GRN-...`, `SO-...`, `TRF-...`, `ADJ-...`)
- affected variant IDs + quantities + locations

---

## Competitor Parity & Differentiation

### Parity targets

- **Zoho Inventory**: multi-warehouse, reorder rules, POs/SOs/GRNs, barcode, serial/batch tracking, shipping integrations.
- **Odoo Inventory**: advanced routes (multi-step inbound/outbound), putaway rules, barcode app, lot/serial traceability, forecasting.
- **QuickBooks Commerce (TradeGecko)**: historically strong in D2C + wholesale order management, but **standalone product discontinued** (sunset 2023-08-31). Use as a feature reference only, not a go-to competitor.

### Differentiation opportunities (StreamlineOS)

- **Deep RBAC + multi-tenant scope** baked into every inventory endpoint (DataScope + module gating).
- **Unified audit log** across all business systems (inventory + accounting + HR + workflows).
- **Accounting-grade postings** by default:
  - GRN posts inventory + AP accrual automatically.
  - Shipment posts COGS + inventory deduction.
  - Invoicing posts AR + revenue.
- **Performance by design**: cached dashboards/reports with explicit invalidation, not stale global caches.

---

## Known Gaps (from current repo) — Must be addressed to reach “implementation-grade”

- **Frontend uses raw IDs** in Stock Adjustments and Transfers creation.
- **Sales Order creation selects Products**, but backend expects **Product Variants**.
- **Warehouse vs Location mismatch** in backend: several backend flows fall back to `locationId = 1` or treat `warehouseId` as `locationId`.
- **Idempotency** not consistently enforced on stock-impacting writes.
- **Audit logs** not emitted for most inventory actions yet.
- **Partial shipment/receipt** and multi-line transfers need full UI + backend alignment.

---

## Acceptance Criteria (Definition of Done for Inventory module)

- **UX**
  - All Inventory pages have loading/empty/error states (already present on most pages).
  - No workflows require typing internal IDs (variantId/locationId) for core operations.
  - Partial receipts and transfers supported end-to-end.
- **Backend**
  - Module gating applied consistently (including Products).
  - All protected endpoints permission-guarded; DataScope applied to scopable reads.
  - Stock-affecting operations are transactional and concurrency-safe.
  - Idempotency-key support on write endpoints that can be retried.
- **Performance**
  - Dashboard + stock summary + reorder report cached and correctly invalidated.
  - Large movement queries paginated and indexed.
- **Auditability**
  - All inventory writes produce audit log entries with meaningful metadata.
- **Accounting**
  - GRN and Ship flows post entries successfully; invoices linked from SO work.

