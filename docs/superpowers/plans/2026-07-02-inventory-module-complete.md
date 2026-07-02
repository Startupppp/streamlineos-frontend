# Inventory Module — Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Inventory/ERP module 100% functional end-to-end per PRD-inventory.md — fixing all critical bugs, adding missing features, and ensuring consistent UI/UX.

**Architecture:** Frontend Next.js (App Router) calls NestJS backend at /inventory/**. All pages live under frontend/app/(authenticated)/inventory/. Hooks in frontend/hooks/api/inventory/. Backend modules in backend/src/modules/inv-*.

**Tech Stack:** Next.js 15 · TypeScript strict · TanStack Query v5 · react-hook-form + Zod · shadcn/ui · Framer Motion · NestJS · Drizzle ORM

---

## CONFIRMED BUGS TO FIX

### Backend Critical
1. `inv-products.controller.ts` — missing `@RequireModule("inventory")` (only inventory controller without it)
2. `inv-purchase-orders.service.ts:181` — `locationId = po.warehouseId ?? 1` (warehouse ID ≠ location ID)
3. `inv-purchase-orders.service.ts:215` — `locationId = data.locationId ?? 1` (falls back to ID 1)
4. `inv-sales-orders.service.ts:203` — `locationId = so.warehouseId ?? 1` in confirmSo
5. `inv-sales-orders.service.ts:238` — `locationId = so.warehouseId ?? 1` in shipSo
6. `inv-stock.service.ts:276` — TRANSFER_IN `quantityBefore: "0"` hardcoded (should be real destination balance)
7. `inv-warehouses.service.ts` — no auto-creation of default location when warehouse is created

### Frontend Critical
8. `stock/adjustments/page.tsx` — no location selector (locationId required by backend schema)
9. `stock/transfers/page.tsx` — sends warehouseId as locationId (wrong ID type)
10. `sales-orders/new/page.tsx` — uses product selector but backend needs variant IDs
11. `hooks/api/inventory/stock.ts` — `CreateTransferLineInput.productId` should be `productVariantId`

## MISSING FEATURES (from PRD)
12. `products/[productId]/page.tsx` — "Add Variant" sheet not implemented
13. `stock/transfers/[transferId]/page.tsx` — no per-line receive qty input, no dispatch step
14. `purchase-orders/[poId]/page.tsx` — no location selector for GRN, no rejection workflow
15. `products/categories/page.tsx` — no edit/archive category
16. `vendors/[vendorId]/page.tsx` — no edit vendor form
17. `warehouses/page.tsx` — no set-default warehouse action
18. `stock/movements/page.tsx` — no pagination controls

---

## Phase 1 — Backend Fixes

### Task 1.1: Products Controller — Add Module Gating
**File:** `backend/src/modules/inv-products/inv-products.controller.ts`
- [ ] Add `import { ModuleGuard } from "../../common/rbac/module.guard";` and `import { RequireModule } from "../../common/rbac/require-module.decorator";`
- [ ] Add `@RequireModule("inventory")` and `@UseGuards(ModuleGuard)` to controller class (match pattern from inv-vendors.controller.ts)

### Task 1.2: Warehouses Schema — Add defaultLocationId
**File:** `backend/src/db/schema/inventory/warehouses.ts`
- [ ] Add `defaultLocationId: integer("default_location_id")` (nullable, no Drizzle FK to avoid circular ref)
- [ ] Run `pnpm -C backend db:generate` then `db:push` to apply migration

### Task 1.3: Warehouses Service — Auto-create default location
**File:** `backend/src/modules/inv-warehouses/inv-warehouses.service.ts`
- [ ] In `createWarehouse`: after inserting warehouse, insert a "Main" location (ZONE type, code "MAIN"), then update warehouse.defaultLocationId
- [ ] Add `getDefaultLocationId(orgId, warehouseId)` helper: query warehouse.defaultLocationId → if null, query first active location for warehouse → throw if none
- [ ] Export helper or inject service where needed

### Task 1.4: Shared Location Resolution
**Files:** `inv-purchase-orders.service.ts`, `inv-sales-orders.service.ts`, `inv-stock.service.ts`
- [ ] Each service: add `resolveLocationId(orgId, warehouseId)` private method that queries warehouse.defaultLocationId → fallback to first active location → throw BadRequestException if none
- [ ] `sendPo`: replace `po.warehouseId ?? 1` with `await this.resolveLocationId(orgId, po.warehouseId)`
- [ ] `receiveGoods`: replace `data.locationId ?? 1` with `data.locationId ?? await this.resolveLocationId(orgId, po.warehouseId)`
- [ ] `confirmSo`: replace `so.warehouseId ?? 1` with `await this.resolveLocationId(orgId, so.warehouseId)`
- [ ] `shipSo`: replace `so.warehouseId ?? 1` with `await this.resolveLocationId(orgId, so.warehouseId)`
- [ ] `completeTransfer` TRANSFER_IN: look up actual destination onHand before the update instead of hardcoding "0"

---

## Phase 2 — Frontend Hook Fixes

### Task 2.1: Fix stock.ts hooks
**File:** `frontend/hooks/api/inventory/stock.ts`
- [ ] Update `CreateAdjustmentInput`: rename `productId` → `productVariantId`, make `locationId` required
- [ ] Update `CreateTransferLineInput`: rename `productId` → `productVariantId`
- [ ] Update `CreateTransferInput`: remove `fromWarehouseId`/`toWarehouseId` (use only `fromLocationId`/`toLocationId`, both required)
- [ ] Fix mutation payload in `useCreateTransfer`: remove fallback to warehouse ID
- [ ] Update `useTransfers` to support status filter (add `filters?: { status?: TransferStatus }`)
- [ ] Add `useUpdateTransferStatus` (dispatch: PENDING → IN_TRANSIT)

### Task 2.2: Fix/Add products.ts hooks
**File:** `frontend/hooks/api/inventory/products.ts`
- [ ] Add `useUpdateCategory(id)` → `PATCH /inventory/products/categories/:id`
- [ ] Add `useUpdateUom(id)` → `PATCH /inventory/products/uom/:id` (if backend supports it)
- [ ] Ensure `useUpdateProductVariant` exists and calls correct endpoint

### Task 2.3: Fix warehouses.ts hooks
**File:** `frontend/hooks/api/inventory/warehouses.ts`
- [ ] Add `useSetDefaultWarehouse()` → `PATCH /inventory/warehouses/:id` with `{ isDefault: true }`
- [ ] Add `useUpdateLocation()` → `PATCH /inventory/warehouses/:warehouseId/locations/:locationId`

---

## Phase 3 — Frontend Pages (Critical Fixes)

### Task 3.1: Stock Adjustments Page
**File:** `frontend/app/(authenticated)/inventory/stock/adjustments/page.tsx`
- [ ] Replace manual productId/locationId inputs with:
  - Warehouse selector (useWarehouses)
  - Location selector (useLocations(warehouseId), enabled when warehouse selected)
  - Product Variant selector (useProductVariants, searchable combobox)
- [ ] Keep adjustment type (IN/OUT/SET) + quantity + reason + notes
- [ ] Ensure form submits `productVariantId` and `locationId` (not warehouseId)
- [ ] Multi-line support: allow adding multiple lines in one adjustment

### Task 3.2: Stock Transfers Page
**File:** `frontend/app/(authenticated)/inventory/stock/transfers/page.tsx`
- [ ] "New Transfer" sheet: replace warehouse selectors with location selectors:
  - From: warehouse selector → location selector (useLocations)
  - To: warehouse selector → location selector (useLocations)
- [ ] Replace product selector with variant selector (useProductVariants)
- [ ] Support multi-line transfer (add/remove lines)
- [ ] Submit uses `fromLocationId`, `toLocationId`, `lines[].productVariantId`

### Task 3.3: Sales Order New Page
**File:** `frontend/app/(authenticated)/inventory/sales-orders/new/page.tsx`
- [ ] Replace product selector with variant selector (useProductVariants)
- [ ] Each line: productVariantId (displayed as "Product - Variant name"), quantity, unitPrice, taxRate

---

## Phase 4 — Frontend Pages (Feature Additions)

### Task 4.1: Product Detail — Variants Management
**File:** `frontend/app/(authenticated)/inventory/products/[productId]/page.tsx`
- [ ] "Add Variant" button opens Sheet with: name, sku, costPrice, sellingPrice, isActive
- [ ] Calls `POST /inventory/products/:productId/variants` (useCreateProductVariant hook)
- [ ] Variant rows in table: show edit Sheet (PATCH /inventory/products/:productId/variants/:variantId)
- [ ] Edit Sheet pre-fills current values

### Task 4.2: Transfer Detail — Receive Sheet + Dispatch
**File:** `frontend/app/(authenticated)/inventory/stock/transfers/[transferId]/page.tsx`
- [ ] Add "Dispatch" button (PENDING → triggers dispatch if backend supports, or just marks IN_TRANSIT via a PATCH)
- [ ] Replace "Mark as Completed" with "Receive Transfer" Sheet:
  - Per-line: shows requested qty, input for received qty (default = requested qty)
  - Validates received qty ≤ requested
  - Submits via useCompleteTransfer with per-line quantityReceived

### Task 4.3: PO Detail — Location + Rejection
**File:** `frontend/app/(authenticated)/inventory/purchase-orders/[poId]/page.tsx`
- [ ] "Receive goods" sheet: add location selector (useLocations(po.warehouseId))
- [ ] Per-line: quantity input + quality status (ACCEPTED/REJECTED radio) + rejection reason (shown when REJECTED)
- [ ] Backend receiveGoods already supports locationId and qualityStatus per line

### Task 4.4: Categories — Edit/Archive
**File:** `frontend/app/(authenticated)/inventory/products/categories/page.tsx`
- [ ] Add edit button per row → opens edit Sheet (name, parentCategoryId, description)
- [ ] Add archive toggle (PATCH to set isActive: false)

### Task 4.5: Vendor Detail — Edit Vendor
**File:** `frontend/app/(authenticated)/inventory/vendors/[vendorId]/page.tsx`
- [ ] Add "Edit" button → opens Sheet with all vendor fields pre-filled
- [ ] Calls useUpdateVendor(vendorId)

### Task 4.6: Warehouses — Set Default
**File:** `frontend/app/(authenticated)/inventory/warehouses/page.tsx`
- [ ] Each warehouse card: if not default, show "Set as Default" action
- [ ] Calls PATCH /inventory/warehouses/:id with { isDefault: true }
- [ ] Only one warehouse can be default (backend should handle de-defaulting others, or frontend can optimistically update)

### Task 4.7: Stock Movements — Pagination
**File:** `frontend/app/(authenticated)/inventory/stock/movements/page.tsx`
- [ ] Wire up pagination controls using `total` and `totalPages` from API
- [ ] Add variant filter combobox (useProductVariants)
- [ ] Add location filter

---

## Phase 5 — UI/UX Consistency

### Task 5.1: Sheet Padding Audit
- [ ] All sheets: ensure single `p-6` (or equivalent) padding, no double-stacked padding from both Sheet content and inner form wrappers
- [ ] Header: `text-lg font-semibold` with `text-sm text-muted-foreground` description
- [ ] Footer: sticky with `border-t pt-4` — not inside the scroll area
- [ ] Consistent across: adjustments, transfers, vendors, warehouses, products, categories sheets

### Task 5.2: Responsive + Polish
- [ ] Verify all pages work at 375/768/1280px
- [ ] Loading skeletons match real layout
- [ ] Empty states fill content area with icon + message + CTA
