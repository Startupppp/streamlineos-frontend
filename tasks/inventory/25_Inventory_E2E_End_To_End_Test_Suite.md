# Inventory Module — End-to-End Test Suite

> **Purpose:** Exhaustive manual and automated E2E checklist for the StreamlineOS Inventory module.  
> **Scope:** UI flows, API contracts, RBAC, stock integrity, integrations, and worst-case scenarios.  
> **Last updated:** 2026-07-06  
> **Related:** `20_Testing_QA_And_Production_Readiness.md`, `scripts/functional/inventory.test.mjs`

---

## Table of Contents

1. [How to Use This Document](#1-how-to-use-this-document)
2. [Prerequisites & Test Environment](#2-prerequisites--test-environment)
3. [Test Data Conventions](#3-test-data-conventions)
4. [Roles & Permission Matrix](#4-roles--permission-matrix)
5. [Global Gates (Run First)](#5-global-gates-run-first)
6. [Master Data Setup](#6-master-data-setup)
7. [Products & Catalog](#7-products--catalog)
8. [Warehouses & Locations](#8-warehouses--locations)
9. [Stock Levels & Opening Balance](#9-stock-levels--opening-balance)
10. [Stock Adjustments](#10-stock-adjustments)
11. [Stock Transfers](#11-stock-transfers)
12. [Reservations & ATP](#12-reservations--atp)
13. [Vendors & Procurement (PO → GRN)](#13-vendors--procurement-po--grn)
14. [Sales Orders (Confirm → Ship → Invoice)](#14-sales-orders-confirm--ship--invoice)
15. [Operations (Receipts, Issues, Picking, Packing, Shipping)](#15-operations-receipts-issues-picking-packing-shipping)
16. [Returns (Vendor & Customer)](#16-returns-vendor--customer)
17. [Cycle Counts & Physical Audits](#17-cycle-counts--physical-audits)
18. [Traceability (Lots, Serials, Expiry)](#18-traceability-lots-serials-expiry)
19. [Quality (Inspections, Holds, Recalls)](#19-quality-inspections-holds-recalls)
20. [Shipping (Packages, Shipments, Loads, Carriers)](#20-shipping-packages-shipments-loads-carriers)
21. [Planning (Replenishment & Forecasting)](#21-planning-replenishment--forecasting)
22. [Finance (Valuation & Costing)](#22-finance-valuation--costing)
23. [Channels & 3PL](#23-channels--3pl)
24. [Reports & Dashboard](#24-reports--dashboard)
25. [Import, Export & Barcode](#25-import-export--barcode)
26. [Settings & Admin](#26-settings--admin)
27. [Cross-Module Integrations](#27-cross-module-integrations)
28. [Concurrency & Race Conditions](#28-concurrency--race-conditions)
29. [Security, RBAC & Data Scope](#29-security-rbac--data-scope)
30. [Worst-Case & Edge-Case Catalog](#30-worst-case--edge-case-catalog)
31. [UI/UX Checklist (All Screens)](#31-uiux-checklist-all-screens)
32. [Regression Smoke (Pre-Release)](#32-regression-smoke-pre-release)
33. [Sign-Off Template](#33-sign-off-template)

---

## 1. How to Use This Document

| Symbol | Meaning |
|--------|---------|
| `- [ ]` | Not tested |
| `- [x]` | Passed |
| `- [!]` | Failed — log defect ID |
| `- [~]` | Blocked / skipped — note reason |
| **UI** | Test via browser at `/inventory/*` |
| **API** | Test via HTTP (Postman, `inventory.test.mjs`, or e2e spec) |
| **BOTH** | Must pass on UI and API |
| **IRREV** | Mutates ledger — use isolated test org or dedicated data set |

**Test order matters.** Complete [Section 6](#6-master-data-setup) before downstream flows. Irreversible operations (`IRREV`) should run last in each section or in a disposable org.

---

## 2. Prerequisites & Test Environment

### Environment

- [ ] Backend running (`streamlineos-backend`) with migrations applied through `0157_inventory_transfer_reserved.sql`
- [ ] Frontend running (`streamlineos-frontend/frontend`)
- [ ] Database seeded or empty org available for isolated testing
- [ ] `inventory` module enabled on test org (`enabledModules` includes `"inventory"`)
- [ ] Accounting module enabled if testing invoice journal posting
- [ ] CRM module enabled if testing SO → client link

### Test Orgs (recommended)

| Org | Purpose |
|-----|---------|
| `inv-e2e-full` | Full happy-path lifecycle (PO receive, SO ship, counts post) |
| `inv-e2e-rbac` | Role/permission matrix only — minimal writes |
| `inv-e2e-disabled` | Module disabled — gate testing |
| `inv-e2e-concurrent` | Two-browser concurrency tests |

### Test Users

| User | Role | Purpose |
|------|------|---------|
| `owner@inv-e2e.test` | OWNER | Full access baseline |
| `inv-mgr@inv-e2e.test` | INVENTORY_MANAGER | All 47 inventory permissions |
| `branch-mgr@inv-e2e.test` | BRANCH_MANAGER | Read + limited SO/PO actions |
| `member@inv-e2e.test` | Member, no inventory perms | 403 baseline |
| `scoped@inv-e2e.test` | Custom role, `own` scope on PO/SO reads | Data scope testing |

### Automated Harness

```bash
# Backend functional smoke (auth, RBAC, validation — no irreversible writes)
node streamlineos-backend/scripts/functional/inventory.test.mjs

# Backend unit + e2e specs
cd streamlineos-backend && npm test -- --testPathPattern=inv-
```

---

## 3. Test Data Conventions

Use consistent prefixes so test data is identifiable and purgeable:

| Prefix | Entity |
|--------|--------|
| `E2E-UOM-` | Units of measure |
| `E2E-CAT-` | Categories |
| `E2E-PROD-` | Products / SKUs |
| `E2E-WH-` | Warehouses |
| `E2E-LOC-` | Locations |
| `E2E-VND-` | Vendors |
| `E2E-PO-` | Purchase orders |
| `E2E-SO-` | Sales orders |
| `E2E-TRF-` | Transfers |
| `E2E-ADJ-` | Adjustments |

**Idempotency:** Every mutating API call must send a unique `Idempotency-Key` header (UUID). Reuse the same key to verify `409 DUPLICATE_IDEMPOTENCY_KEY` replay behavior.

---

## 4. Roles & Permission Matrix

### Permission Groups (47 total)

| Resource | Permissions |
|----------|-------------|
| Products | `read` (scopable), `create`, `update`, `delete` |
| Stock | `read` (scopable), `adjust`, `transfer`, `reserve`, `reconcile` |
| Warehouses | `read`, `manage` |
| Vendors | `read`, `manage` |
| Purchase Orders | `read` (scopable), `create`, `update`, `approve`, `receive` |
| Sales Orders | `read` (scopable), `create`, `update`, `confirm`, `ship`, `invoice` |
| Returns | `vendor-returns:manage`, `customer-returns:manage` |
| Quality | `read`, `inspect`, `release`, `scrap`, `recall` |
| Shipping | `packages:manage`, `shipments:manage`, `loads:manage` |
| Planning | `replenishment:manage` |
| Finance | `valuation:read` |
| Admin | `settings:manage`, `import`, `export`, `webhooks:manage`, `channels:manage`, `3pl:manage` |
| Reports | `reports:read` |

### Role × Action Matrix

| Action | OWNER | INV_MGR | BRANCH_MGR | MEMBER |
|--------|:-----:|:-------:|:----------:|:------:|
| View dashboard | ✅ | ✅ | ✅ | ❌ 403 |
| Create product | ✅ | ✅ | ❌ | ❌ |
| Adjust stock | ✅ | ✅ | ❌ | ❌ |
| Approve PO | ✅ | ✅ | ✅ | ❌ |
| Receive PO | ✅ | ✅ | ❌ | ❌ |
| Confirm SO | ✅ | ✅ | ✅ | ❌ |
| Ship SO | ✅ | ✅ | ✅ | ❌ |
| Invoice SO | ✅ | ✅ | ❌ | ❌ |
| Manage settings | ✅ | ✅ | ❌ | ❌ |
| Manage channels | ✅ | ✅ | ❌ | ❌ |

- [ ] **RBAC-01** OWNER can perform every inventory action
- [ ] **RBAC-02** INVENTORY_MANAGER has all 47 permissions
- [ ] **RBAC-03** BRANCH_MANAGER: read products/stock/warehouses; confirm + ship SO; cannot adjust stock
- [ ] **RBAC-04** MEMBER with empty permissions: 403 on all `@CheckAbility` inventory routes
- [ ] **RBAC-05** Scopable read with scope `none` returns empty list (not 403)
- [ ] **RBAC-06** Scopable read with scope `own` shows only records created by that user

---

## 5. Global Gates (Run First)

### Module Gate

- [ ] **GATE-01** Navigate to `/inventory` with module disabled → redirect or 404 `MODULE_DISABLED`
- [ ] **GATE-02** API `GET /inventory/products` with module disabled → `404 { code: "MODULE_DISABLED" }`
- [ ] **GATE-03** Enable module → sidebar shows Inventory section
- [ ] **GATE-04** Sidebar items hidden when user lacks required permission (e.g. no `inventory:products:read` → Products hidden)

### Authentication

- [ ] **GATE-05** All `/inventory/*` API routes without JWT → `401`
- [ ] **GATE-06** Expired/invalid token → `401`
- [ ] **GATE-07** Cross-tenant: user A cannot read org B inventory data → `404` or empty

### Layout & Navigation

- [ ] **GATE-08** All 58 inventory routes load without crash (see [Section 31](#31-uiux-checklist-all-screens))
- [ ] **GATE-09** Breadcrumbs correct on nested routes
- [ ] **GATE-10** Browser back/forward preserves state
- [ ] **GATE-11** Deep-link to `[productId]` / `[poId]` with invalid ID → empty state or 404 page

---

## 6. Master Data Setup

> Complete this section before any stock-moving tests.

### UOM

- [ ] **MD-01** Create UOM `E2E-UOM-EA` (Each, ratio 1) — **UI + API**
- [ ] **MD-02** Create UOM `E2E-UOM-BOX` (Box, ratio 12 to EA base)
- [ ] **MD-03** Duplicate UOM code → `400` validation error
- [ ] **MD-04** Edit UOM rounding precision
- [ ] **MD-05** Delete UOM in use by product → blocked

### Categories

- [ ] **MD-06** Create root category `E2E-CAT-ROOT`
- [ ] **MD-07** Create child category under root
- [ ] **MD-08** Circular parent assignment → `400`
- [ ] **MD-09** Archive category with active products → warning or block

### Number Sequences

- [ ] **MD-10** View default sequences (PO, SO, GRN, Transfer, Adjustment)
- [ ] **MD-11** Custom prefix applied on next document create
- [ ] **MD-12** Sequence increments atomically (no duplicate numbers under concurrent create)

---

## 7. Products & Catalog

**Routes:** `/inventory/products`, `/new`, `/[productId]`, `/categories`, `/uom`

### Create Product — Happy Path

- [ ] **PROD-01** Create STOCKABLE product `E2E-PROD-001`, tracking NONE, WAC costing
- [ ] **PROD-02** Auto-created default variant exists with same SKU
- [ ] **PROD-03** Set reorderPoint=10, minStockLevel=5, maxStockLevel=100
- [ ] **PROD-04** Assign category and UOM
- [ ] **PROD-05** Product appears in list with correct status badge

### Product Types & Tracking

- [ ] **PROD-06** Create CONSUMABLE product — no stock tracking required
- [ ] **PROD-07** Create SERVICE product — excluded from stock operations
- [ ] **PROD-08** Create LOT-tracked product `E2E-PROD-LOT`
- [ ] **PROD-09** Create SERIAL-tracked product `E2E-PROD-SER`
- [ ] **PROD-10** Switch tracking type on product with existing stock → blocked or migration warning

### Variants

- [ ] **PROD-11** Add variant with unique SKU `E2E-PROD-001-RED`
- [ ] **PROD-12** Variant inherits parent reorder settings
- [ ] **PROD-13** Duplicate variant SKU within org → `400`
- [ ] **PROD-14** Edit variant price and attributes

### Product Lifecycle

- [ ] **PROD-15** Archive product → hidden from default list, still in movements history
- [ ] **PROD-16** Restore archived product
- [ ] **PROD-17** Set status DISCONTINUED → blocked on new PO/SO lines
- [ ] **PROD-18** Delete product with no stock/movements → success
- [ ] **PROD-19** Delete product with ledger history → blocked

### Worst Cases — Products

- [ ] **PROD-W01** Create product with empty SKU → `400`
- [ ] **PROD-W02** SKU max length boundary
- [ ] **PROD-W03** Special characters in SKU/barcode
- [ ] **PROD-W04** XSS in product name → sanitized on render
- [ ] **PROD-W05** Create 100 variants — performance acceptable (<3s)
- [ ] **PROD-W06** PATCH with non-existent productId → `404`
- [ ] **PROD-W07** User without `inventory:products:create` → `403`

---

## 8. Warehouses & Locations

**Routes:** `/inventory/warehouses`, `/[warehouseId]`

### Warehouse CRUD

- [ ] **WH-01** Create warehouse `E2E-WH-MAIN`, set as default
- [ ] **WH-02** Only one default warehouse per org
- [ ] **WH-03** Assign branch and manager
- [ ] **WH-04** Deactivate warehouse → excluded from new operations
- [ ] **WH-05** Duplicate warehouse code → `400`

### Location Hierarchy

- [ ] **WH-06** Create location tree: ZONE → AISLE → RACK → BIN
- [ ] **WH-07** Create RECEIVING location (`isReceivable=true`)
- [ ] **WH-08** Create SHIPPING location (`isPickable=true`)
- [ ] **WH-09** Create QUARANTINE location (`isSellable=false`)
- [ ] **WH-10** Create SCRAP, TRANSIT, RETURNS location types
- [ ] **WH-11** Set location capacity — verify overflow warning (if implemented)

### Warehouse Stock Tab

- [ ] **WH-12** Stock tab shows levels aggregated by variant
- [ ] **WH-13** Filter by location
- [ ] **WH-14** Zero-stock variants hidden or shown per filter

### Worst Cases — Warehouses

- [ ] **WH-W01** Transfer to/from inactive warehouse → `400`
- [ ] **WH-W02** Receive into non-receivable location → `400`
- [ ] **WH-W03** Pick from non-pickable location → `400`
- [ ] **WH-W04** Delete location with stock → blocked
- [ ] **WH-W05** Deep hierarchy (5+ levels) — UI renders correctly

---

## 9. Stock Levels & Opening Balance

**Routes:** `/inventory/stock`, `/inventory/stock/movements`

### View Stock

- [ ] **STK-01** Stock levels table loads with columns: product, warehouse, onHand, committed, available
- [ ] **STK-02** ATP formula verified: `available = onHand - committed - blockedQty - qualityHoldQty`
- [ ] **STK-03** Forecasted: `onHand + incoming - outgoing`
- [ ] **STK-04** Filter by warehouse, product, low-stock
- [ ] **STK-05** Availability popover shows breakdown

### Opening Balance **IRREV**

- [ ] **STK-06** Post opening stock: 100 units of `E2E-PROD-001` at RECEIVING location
- [ ] **STK-07** Ledger txn type `OPENING_BALANCE` created
- [ ] **STK-08** `averageCost` set from opening cost
- [ ] **STK-09** Valuation layer created
- [ ] **STK-10** Duplicate opening balance for same variant/location → `400` or additive per policy

### Movements

- [ ] **STK-11** Movement history shows all txn types chronologically
- [ ] **STK-12** Filter by date range, type, product
- [ ] **STK-13** Each movement links to source document (PO, SO, adjustment, etc.)
- [ ] **STK-14** Movement immutability — no edit/delete on posted txns

### Worst Cases — Stock

- [ ] **STK-W01** Opening balance with qty=0 → `400`
- [ ] **STK-W02** Opening balance with negative qty → `400`
- [ ] **STK-W03** Opening balance without `Idempotency-Key` → `400`
- [ ] **STK-W04** View stock with `inventory:stock:read` scope `none` → empty
- [ ] **STK-W05** Stock page with 10,000+ rows — pagination works

---

## 10. Stock Adjustments

**Routes:** `/inventory/stock/adjustments`

### Below Approval Threshold (auto-post)

- [ ] **ADJ-01** Settings: `adjustmentApprovalThreshold = null` or high value
- [ ] **ADJ-02** Create adjustment +5 qty, reason RECOUNT — auto-posts **IRREV**
- [ ] **ADJ-03** Ledger txn `ADJUSTMENT_IN` created
- [ ] **ADJ-04** Create adjustment -3 qty, reason DAMAGE — auto-posts **IRREV**
- [ ] **ADJ-05** Ledger txn `ADJUSTMENT_OUT` created

### Above Approval Threshold

- [ ] **ADJ-06** Settings: `adjustmentApprovalThreshold = 10`
- [ ] **ADJ-07** Create adjustment totaling 15 units → status `PENDING_APPROVAL`
- [ ] **ADJ-08** Post without approve → `400`
- [ ] **ADJ-09** Approve → status `APPROVED`
- [ ] **ADJ-10** Post → status `POSTED`, stock updated **IRREV**
- [ ] **ADJ-11** Cancel pending adjustment → success
- [ ] **ADJ-12** Cancel posted adjustment → `400`

### Adjustment Reasons

Test each reason enum creates correct ledger entry:

- [ ] **ADJ-13** PURCHASE
- [ ] **ADJ-14** SALE
- [ ] **ADJ-15** RETURN
- [ ] **ADJ-16** DAMAGE
- [ ] **ADJ-17** EXPIRY
- [ ] **ADJ-18** THEFT
- [ ] **ADJ-19** RECOUNT
- [ ] **ADJ-20** OTHER

### Worst Cases — Adjustments

- [ ] **ADJ-W01** Adjust out more than on-hand (`allowNegativeStock=false`) → `400 INSUFFICIENT_STOCK`
- [ ] **ADJ-W02** Enable `allowNegativeStock=true` → adjust out succeeds, onHand negative
- [ ] **ADJ-W03** Adjust into QUALITY_HOLD bucket
- [ ] **ADJ-W04** Adjust into BLOCKED bucket
- [ ] **ADJ-W05** Multi-line adjustment (3 products) — all lines post atomically
- [ ] **ADJ-W06** Duplicate `Idempotency-Key` → `409` with cached result
- [ ] **ADJ-W07** Missing `Idempotency-Key` → `400`
- [ ] **ADJ-W08** Adjustment on SERIAL product without serial IDs → `400`
- [ ] **ADJ-W09** User without `inventory:stock:adjust` → `403`

---

## 11. Stock Transfers

**Routes:** `/inventory/stock/transfers`, `/[transferId]`

### Full Transfer Lifecycle

- [ ] **TRF-01** Create transfer: WH-A/BIN-01 → WH-A/BIN-02, 20 units **IRREV chain**
- [ ] **TRF-02** Status `PENDING`
- [ ] **TRF-03** Reserve → status `RESERVED`, committed incremented at source
- [ ] **TRF-04** Dispatch → status `IN_TRANSIT`, `TRANSFER_OUT` txn, onHand decremented at source
- [ ] **TRF-05** Complete (full qty) → status `COMPLETED`, `TRANSFER_IN` txn, onHand incremented at dest
- [ ] **TRF-06** Reservations consumed/released

### Partial Receive

- [ ] **TRF-07** Dispatch 50 units
- [ ] **TRF-08** Complete with 30 units → partial receive
- [ ] **TRF-09** Remaining 20 units — verify disposition (back to source or in-transit per policy)

### Cancel

- [ ] **TRF-10** Cancel from `PENDING` → success
- [ ] **TRF-11** Cancel from `RESERVED` → reservations released
- [ ] **TRF-12** Cancel from `IN_TRANSIT` → `400`
- [ ] **TRF-13** Cancel from `COMPLETED` → `400`

### Worst Cases — Transfers

- [ ] **TRF-W01** Same source and destination location → `400`
- [ ] **TRF-W02** Transfer qty > available at source → `400 INSUFFICIENT_STOCK`
- [ ] **TRF-W03** Dispatch from `PENDING` (skip reserve) — per policy `400` or allowed
- [ ] **TRF-W04** Complete more than dispatched qty → `400`
- [ ] **TRF-W05** Transfer LOT-tracked product — lot preserved at destination
- [ ] **TRF-W06** Transfer SERIAL-tracked — each serial moves individually
- [ ] **TRF-W07** Cross-warehouse transfer
- [ ] **TRF-W08** Missing `Idempotency-Key` on dispatch/complete → `400`
- [ ] **TRF-W09** User without `inventory:stock:transfer` → `403`

---

## 12. Reservations & ATP

**Routes:** Stock page reservations panel, SO detail

### Manual Reservation

- [ ] **RES-01** Reserve 10 units against SO manually
- [ ] **RES-02** `committed` incremented, available decreased
- [ ] **RES-03** Ledger txn `RESERVATION_CREATE` (zero qty movement)
- [ ] **RES-04** Release reservation → `committed` decremented
- [ ] **RES-05** Consume on ship → reservation status `CONSUMED`

### ATP Display

- [ ] **RES-06** ATP reflects reservations in real time on UI
- [ ] **RES-07** Multiple reservations on same variant — FIFO consumption order

### Reservation Strategies (via Settings)

- [ ] **RES-08** `MANUAL` — no auto-allocation on confirm
- [ ] **RES-09** `AUTO_ON_CONFIRM` — auto-reserve on SO confirm
- [ ] **RES-10** `FIFO` — oldest stock reserved first
- [ ] **RES-11** `FEFO` — earliest expiry lot reserved first

### Worst Cases — Reservations

- [ ] **RES-W01** Reserve more than available (`allowBackorders=false`) → `400 INSUFFICIENT_STOCK`
- [ ] **RES-W02** `allowBackorders=true` → reserve succeeds, ATP negative
- [ ] **RES-W03** Reserve against quality-held stock → `400`
- [ ] **RES-W04** Reserve against blocked stock → `400`
- [ ] **RES-W05** FEFO + expired lot + `expiryReservationPolicy=BLOCK` → lot skipped
- [ ] **RES-W06** FEFO + expired lot + `expiryReservationPolicy=WARN` → reserved with warning
- [ ] **RES-W07** Expire stale reservations via `POST /inventory/settings/expire-reservations`
- [ ] **RES-W08** Double-reserve same qty concurrently → one succeeds, one `400`
- [ ] **RES-W09** SO confirm with insufficient stock + autoReserve → SO stays CONFIRMED (confirm never fails)

---

## 13. Vendors & Procurement (PO → GRN)

**Routes:** `/inventory/vendors`, `/purchase-orders`, `/operations/receipts`

### Vendor CRUD

- [ ] **VND-01** Create vendor `E2E-VND-001`
- [ ] **VND-02** Link vendor to CRM client (if CRM enabled)
- [ ] **VND-03** View vendor performance metrics
- [ ] **VND-04** Deactivate vendor → blocked on new PO

### PO Lifecycle — Happy Path **IRREV chain**

- [ ] **PO-01** Create PO draft with 2 lines for `E2E-PROD-001`
- [ ] **PO-02** Edit lines in DRAFT
- [ ] **PO-03** Approve PO (if `requirePoApproval=true`)
- [ ] **PO-04** Send PO → status `SENT`
- [ ] **PO-05** Partial receive: 60% of line 1 **IRREV**
- [ ] **PO-06** PO status → `PARTIAL`
- [ ] **PO-07** Receive remaining qty **IRREV**
- [ ] **PO-08** PO status → `RECEIVED`
- [ ] **PO-09** Close PO → status `CLOSED`
- [ ] **PO-10** GRN created with correct lines
- [ ] **PO-11** Stock onHand increased, `onOrder` decremented
- [ ] **PO-12** Valuation layer + WAC updated

### PO Receive — LOT & SERIAL

- [ ] **PO-13** Receive LOT product — provide lot number, lot record created/reused
- [ ] **PO-14** Receive SERIAL product — provide exactly N serial numbers for qty N
- [ ] **PO-15** Duplicate serial on receive → `400 SERIAL_ALREADY_USED`

### GRN Reversal

- [ ] **PO-16** Reverse GRN **IRREV** — stock decremented, reversal txn created

### Worst Cases — Procurement

- [ ] **PO-W01** Send PO from DRAFT without approval when `requirePoApproval=true` → `400`
- [ ] **PO-W02** Receive when PO is DRAFT → `400`
- [ ] **PO-W03** Over-receipt beyond `overReceiptTolerancePct` → `400` with max allowed qty
- [ ] **PO-W04** Over-receipt within tolerance → succeeds
- [ ] **PO-W05** Cancel PO after partial receive → `400`
- [ ] **PO-W06** Cancel PO with no receipts → success
- [ ] **PO-W07** Edit PO after SENT → `400`
- [ ] **PO-W08** Receive into QUARANTINE when `inspectionOnReceipt=true`
- [ ] **PO-W09** Double receive same line with same `Idempotency-Key` → `409`
- [ ] **PO-W10** Receive with cost=0 → verify WAC handling
- [ ] **PO-W11** User without `inventory:purchase-orders:receive` → `403`

---

## 14. Sales Orders (Confirm → Ship → Invoice)

**Routes:** `/inventory/sales-orders`, `/new`, `/[soId]`

### SO Lifecycle — Happy Path **IRREV chain**

- [ ] **SO-01** Create SO draft, link CRM client
- [ ] **SO-02** Add 2 lines with qty
- [ ] **SO-03** Confirm SO → status `CONFIRMED`
- [ ] **SO-04** Auto-reserve (if `autoReserveOnConfirm=true`) → `RESERVED` or `PARTIALLY_RESERVED`
- [ ] **SO-05** Manual reserve remaining (if partial)
- [ ] **SO-06** Pick all lines → status `PICKED`, pick list created
- [ ] **SO-07** Pack → status `PACKED`, package created
- [ ] **SO-08** Ship → status `SHIPPED`, `SALE` txn, onHand decremented **IRREV**
- [ ] **SO-09** Invoice → status `INVOICED`, accounting journal posted **IRREV**
- [ ] **SO-10** Close SO → status `CLOSED`

### Partial Shipment

- [ ] **SO-11** `allowPartialShipment=true` — ship 50% of line 1
- [ ] **SO-12** SO status → `PARTIALLY_SHIPPED`
- [ ] **SO-13** Ship remainder → `SHIPPED`
- [ ] **SO-14** Invoice from `PARTIALLY_SHIPPED` → allowed

### SERIAL Pick

- [ ] **SO-15** Pick SERIAL product — must provide `serialId` per unit
- [ ] **SO-16** Pick without serial → `400` per line

### Package Required

- [ ] **SO-17** `packageRequiredForShipping=true` — ship auto-creates package
- [ ] **SO-18** Ship without package when required → `400`

### Worst Cases — Sales

- [ ] **SO-W01** Edit SO after CONFIRMED → `400`
- [ ] **SO-W02** Confirm from non-DRAFT → `400`
- [ ] **SO-W03** Pick when not reserved → `400`
- [ ] **SO-W04** Pack when not PICKED → `400`
- [ ] **SO-W05** Ship more than picked qty → `400`
- [ ] **SO-W06** Ship with insufficient onHand (`allowNegativeStock=false`) → `400 INSUFFICIENT_STOCK`
- [ ] **SO-W07** Invoice from DRAFT → `400`
- [ ] **SO-W08** Cancel after SHIPPED → `400`
- [ ] **SO-W09** Cancel after INVOICED → `400`
- [ ] **SO-W10** Cancel DRAFT → success, no stock impact
- [ ] **SO-W11** SO for DISCONTINUED product → blocked on create
- [ ] **SO-W12** SO for SERVICE product — no stock impact
- [ ] **SO-W13** ATP check endpoint returns correct per-line availability
- [ ] **SO-W14** Double ship with same `Idempotency-Key` → `409`
- [ ] **SO-W15** User without `inventory:sales-orders:ship` → `403`

---

## 15. Operations (Receipts, Issues, Picking, Packing, Shipping)

**Routes:** `/inventory/operations`, `/receipts`, `/issues`, `/picking`, `/packing`, `/shipping`, `/returns`

### Operations Hub

- [ ] **OPS-01** Operations page lists pending work queues
- [ ] **OPS-02** Receipts queue shows POs awaiting receive
- [ ] **OPS-03** Picking queue shows SOs ready to pick
- [ ] **OPS-04** Packing queue shows picked SOs
- [ ] **OPS-05** Shipping queue shows packed SOs

### Receipts

- [ ] **OPS-06** Receive goods sheet opens from PO
- [ ] **OPS-07** GRN detail sheet shows line breakdown
- [ ] **OPS-08** Reverse receipt from GRN detail

### Picking & Packing

- [ ] **OPS-09** Pick sheet shows allocated locations (FEFO/FIFO order)
- [ ] **OPS-10** Partial pick updates SO line picked qty
- [ ] **OPS-11** Pack sheet assigns items to package

### Worst Cases — Operations

- [ ] **OPS-W01** Empty queues show proper empty state
- [ ] **OPS-W02** Concurrent pick of same SO line — second user blocked
- [ ] **OPS-W03** Mobile viewport (375px) — all operation sheets usable

---

## 16. Returns (Vendor & Customer)

**Routes:** `/inventory/returns`, vendor/customer return sheets

### Vendor Returns **IRREV**

- [ ] **RET-01** Create vendor return against GRN line
- [ ] **RET-02** Post return → `VENDOR_RETURN` txn, onHand decremented
- [ ] **RET-03** Reasons: DAMAGED, WRONG_ITEM, EXCESS, EXPIRED, QUALITY_REJECTED
- [ ] **RET-04** Cancel draft return → success
- [ ] **RET-05** Cancel posted return → `400`

### Customer Returns **IRREV**

- [ ] **RET-06** Create customer return against SO
- [ ] **RET-07** Disposition RESTOCK → `CUSTOMER_RETURN` to ON_HAND
- [ ] **RET-08** Disposition QUARANTINE → to QUALITY_HOLD
- [ ] **RET-09** Disposition SCRAP → SCRAP movement
- [ ] **RET-10** `inspectionOnReturn=true` → return goes to quarantine first

### Worst Cases — Returns

- [ ] **RET-W01** Return more than originally received/shipped → `400`
- [ ] **RET-W02** Return SERIAL item — must specify serial
- [ ] **RET-W03** Return LOT item — lot number required
- [ ] **RET-W04** User without `inventory:vendor-returns:manage` → `403`
- [ ] **RET-W05** User without `inventory:customer-returns:manage` → `403`

---

## 17. Cycle Counts & Physical Audits

**Routes:** `/inventory/cycle-counts`, `/[countId]`, `/physical-audits`, `/[auditId]`

### Cycle Count Lifecycle **IRREV on post**

- [ ] **CC-01** Create cycle count for warehouse zone
- [ ] **CC-02** Status `PLANNED`
- [ ] **CC-03** Start → `COUNTING`
- [ ] **CC-04** Enter counted qty per line (only editable in COUNTING)
- [ ] **CC-05** Submit for review → `REVIEW`
- [ ] **CC-06** Variance calculated: system qty vs counted qty
- [ ] **CC-07** Post with `Idempotency-Key` → `POSTED` **IRREV**
- [ ] **CC-08** Gain variance → `CYCLE_COUNT_GAIN` txn
- [ ] **CC-09** Loss variance → `CYCLE_COUNT_LOSS` txn

### Physical Audit

- [ ] **CC-10** Same state machine as cycle count
- [ ] **CC-11** Full warehouse audit scope

### Worst Cases — Counts

- [ ] **CC-W01** Edit lines outside COUNTING → `400`
- [ ] **CC-W02** Post without `Idempotency-Key` → `400`
- [ ] **CC-W03** Cancel POSTED count → `400`
- [ ] **CC-W04** Cancel from PLANNED → success
- [ ] **CC-W05** Post with zero variance → no stock change, status POSTED
- [ ] **CC-W06** Post loss exceeding onHand → `400 INSUFFICIENT_STOCK`
- [ ] **CC-W07** User without `inventory:stock:reconcile` → `403`

---

## 18. Traceability (Lots, Serials, Expiry)

**Routes:** `/inventory/lots`, `/[lotId]`, `/serials`, `/[serialId]`, `/expiry`

### Lots

- [ ] **TRC-01** Lot created on PO receive with lot number
- [ ] **TRC-02** Lot detail shows stock by location
- [ ] **TRC-03** Lot movement history traceable
- [ ] **TRC-04** Reuse existing lot number on receive → qty added to same lot

### Serials

- [ ] **TRC-05** Serial created on receive, status AVAILABLE
- [ ] **TRC-06** Serial detail shows current location and SO link after ship
- [ ] **TRC-07** Serial status transitions: AVAILABLE → RESERVED → SHIPPED

### Expiry

- [ ] **TRC-08** Expiry report lists lots nearing expiration
- [ ] **TRC-09** Expired lot blocked from reservation (BLOCK policy)
- [ ] **TRC-10** Expiry alert thresholds configurable

### Traceability Chain

- [ ] **TRC-11** Full chain: PO → GRN → lot → SO → shipment traceable end-to-end

### Worst Cases — Traceability

- [ ] **TRC-W01** Ship serial not in AVAILABLE status → `400`
- [ ] **TRC-W02** Split lot across locations — qty sums correctly
- [ ] **TRC-W03** Recall lot → status RECALLED, blocks new reservations
- [ ] **TRC-W04** Serial duplicate across org → `400`

---

## 19. Quality (Inspections, Holds, Recalls)

**Routes:** `/inventory/quality`, `/inspections`, `/holds`, `/recalls`

### Inspections

- [ ] **QLT-01** Create inspection on GRN receipt (when `inspectionOnReceipt=true`)
- [ ] **QLT-02** Pass inspection → stock released to ON_HAND
- [ ] **QLT-03** Fail inspection → QUARANTINE or SCRAP movement
- [ ] **QLT-04** Inspection on customer return (when `inspectionOnReturn=true`)

### Holds

- [ ] **QLT-05** Create quality hold on variant/lot
- [ ] **QLT-06** `qualityHoldQty` incremented
- [ ] **QLT-07** Held stock excluded from ATP
- [ ] **QLT-08** Release hold → stock back to ON_HAND

### Recalls

- [ ] **QLT-09** Create recall for lot
- [ ] **QLT-10** Lot status → RECALLED
- [ ] **QLT-11** Recall detail shows affected SOs/shipments
- [ ] **QLT-12** Cannot reserve recalled lot

### Worst Cases — Quality

- [ ] **QLT-W01** Scrap more than held qty → `400`
- [ ] **QLT-W02** Double release same hold → `400`
- [ ] **QLT-W03** User without `inventory:quality:inspect` → `403`
- [ ] **QLT-W04** User without `inventory:quality:scrap` → `403` on dispose

---

## 20. Shipping (Packages, Shipments, Loads, Carriers)

**Routes:** `/inventory/shipments`, `/packages`, `/loads`, `/carriers`

### Packages

- [ ] **SHP-01** Create package from packed SO
- [ ] **SHP-02** Add/remove lines before close
- [ ] **SHP-03** Close package → locked
- [ ] **SHP-04** Reopen closed package (if allowed)

### Shipments

- [ ] **SHP-05** Create shipment from SO
- [ ] **SHP-06** Assign carrier and tracking number
- [ ] **SHP-07** Ship → tracking status updated
- [ ] **SHP-08** Cancel shipment before ship → success
- [ ] **SHP-09** Cancel after ship → `400`

### Loads & Carriers

- [ ] **SHP-10** Create load with multiple shipments
- [ ] **SHP-11** Dispatch load
- [ ] **SHP-12** Close load
- [ ] **SHP-13** CRUD carrier records

### Worst Cases — Shipping

- [ ] **SHP-W01** Package content mismatch vs SO lines → `400`
- [ ] **SHP-W02** Ship package not linked to SO → `400`
- [ ] **SHP-W03** User without `inventory:shipments:manage` → `403`

---

## 21. Planning (Replenishment & Forecasting)

**Routes:** `/inventory/replenishment`, `/rules`, `/forecasting`

### Replenishment Rules

- [ ] **PLN-01** Create rule: when `E2E-PROD-001` below reorderPoint → suggest PO
- [ ] **PLN-02** Suggestion respects min/max stock levels
- [ ] **PLN-03** Generate PO from suggestion → draft PO created
- [ ] **PLN-04** Edit/delete replenishment rule

### Forecasting

- [ ] **PLN-05** Demand forecast loads for selected products
- [ ] **PLN-06** Forecast chart renders with historical data
- [ ] **PLN-07** Empty history → proper empty state

### Worst Cases — Planning

- [ ] **PLN-W01** Suggestion for product with `reorderEnabled=false` → excluded
- [ ] **PLN-W02** Generate PO with no vendor configured → `400` or prompt
- [ ] **PLN-W03** User without `inventory:replenishment:manage` → `403`

---

## 22. Finance (Valuation & Costing)

**Routes:** `/inventory/valuation`, `/costing`

### Valuation

- [ ] **FIN-01** Valuation summary matches sum of layers
- [ ] **FIN-02** WAC recalculates after each receipt
- [ ] **FIN-03** FIFO layers consumed on outbound in correct order
- [ ] **FIN-04** Valuation by warehouse filter

### Costing

- [ ] **FIN-05** Standard cost vs actual cost comparison
- [ ] **FIN-06** Cost adjustment reflected in valuation

### Accounting Integration

- [ ] **FIN-07** GRN receive posts inventory receipt journal
- [ ] **FIN-08** SO invoice posts COGS + revenue journal
- [ ] **FIN-09** Adjustment post creates journal entry (if configured)

### Worst Cases — Finance

- [ ] **FIN-W01** Valuation with zero stock → $0, no error
- [ ] **FIN-W02** User without `inventory:valuation:read` → `403`
- [ ] **FIN-W03** Switch costing method on product with layers → blocked or migration

---

## 23. Channels & 3PL

**Routes:** `/inventory/channels`, `/3pl`

### Channels

- [ ] **CH-01** Create sales channel
- [ ] **CH-02** Publish product to channel
- [ ] **CH-03** Sync stock → ATP pushed to channel
- [ ] **CH-04** Channel stock reflects reservations (available, not onHand)

### 3PL

- [ ] **CH-05** Create 3PL connection
- [ ] **CH-06** Sync stock bidirectionally
- [ ] **CH-07** 3PL sync failure → `CHANNEL_SYNC_FAILED` error surfaced

### Worst Cases — Channels

- [ ] **CH-W01** Publish product with zero ATP → 0 stock on channel
- [ ] **CH-W02** Sync during active reservation — consistent snapshot
- [ ] **CH-W03** User without `inventory:channels:manage` → `403`
- [ ] **CH-W04** User without `inventory:3pl:manage` → `403`

---

## 24. Reports & Dashboard

**Routes:** `/inventory`, `/reports/stock-summary`, `/movements`, `/reorder`

### Dashboard

- [ ] **RPT-01** Dashboard KPIs: total SKUs, low stock count, pending POs, pending SOs
- [ ] **RPT-02** Recent movements widget
- [ ] **RPT-03** Charts render without error

### Reports

- [ ] **RPT-04** Stock summary — onHand, committed, available per variant
- [ ] **RPT-05** Movement report — filterable by date, type, product
- [ ] **RPT-06** Reorder report — products below reorderPoint
- [ ] **RPT-07** Slow-moving stock report
- [ ] **RPT-08** Expiry report — lots expiring within N days
- [ ] **RPT-09** Valuation report — total inventory value

### Export

- [ ] **RPT-10** Export report to CSV
- [ ] **RPT-11** Large report pagination (>1000 rows)

### Worst Cases — Reports

- [ ] **RPT-W01** Reports with no data → empty state, not error
- [ ] **RPT-W02** Date range invalid (end before start) → `400`
- [ ] **RPT-W03** User without `inventory:reports:read` → `403`

---

## 25. Import, Export & Barcode

**Routes:** `/inventory/import`, `/barcode`

### Import

- [ ] **IMP-01** Download import template
- [ ] **IMP-02** Preview CSV upload — validation errors shown per row
- [ ] **IMP-03** Import valid products CSV → products created
- [ ] **IMP-04** Import with duplicate SKU → row error, others succeed
- [ ] **IMP-05** Import job status trackable

### Export

- [ ] **IMP-06** Export products to CSV
- [ ] **IMP-07** Export stock levels to CSV

### Barcode

- [ ] **IMP-08** Barcode lookup by SKU
- [ ] **IMP-09** Barcode lookup by barcode field
- [ ] **IMP-10** Unknown barcode → not found message

### Worst Cases — Import

- [ ] **IMP-W01** CSV with missing required columns → `400` with column list
- [ ] **IMP-W02** CSV with 10,000 rows — job queued, not timeout
- [ ] **IMP-W03** Invalid UOM in import row → row-level error
- [ ] **IMP-W04** User without `inventory:import` → `403`
- [ ] **IMP-W05** Malformed CSV (wrong encoding) → graceful error

---

## 26. Settings & Admin

**Routes:** `/inventory/settings`

### Inventory Settings

| Setting | Test |
|---------|------|
| `allowNegativeStock` | Toggle → verify adjust/ship behavior (see ADJ-W01, SO-W06) |
| `allowBackorders` | Toggle → verify reserve behavior (see RES-W01) |
| `reservationStrategy` | Cycle through MANUAL, AUTO_ON_CONFIRM, FIFO, FEFO |
| `defaultCostingMethod` | Change default for new products |
| `expiryReservationPolicy` | BLOCK vs WARN vs ALLOW |
| `inspectionOnReceipt` | Toggle → PO receive to quarantine |
| `inspectionOnReturn` | Toggle → customer return to quarantine |
| `overReceiptTolerancePct` | Set 5% → verify PO-W03/W04 |
| `requirePoApproval` | Toggle → verify PO-W01 |
| `adjustmentApprovalThreshold` | Set → verify ADJ-06–10 |
| `autoReserveOnConfirm` | Toggle → verify RES-09 |
| `allowPartialShipment` | Toggle → verify SO-11 |
| `packageRequiredForShipping` | Toggle → verify SO-17/18 |

- [ ] **SET-01** Each setting persists after save
- [ ] **SET-02** Settings form validation — invalid pct → `400`
- [ ] **SET-03** Health check endpoint returns module status
- [ ] **SET-04** Expire reservations maintenance action

### Webhooks

- [ ] **SET-05** Create webhook for `stock.adjusted` event
- [ ] **SET-06** Webhook fires on adjustment post
- [ ] **SET-07** Invalid webhook URL → SSRF blocked
- [ ] **SET-08** Retry failed webhook delivery

### Worst Cases — Settings

- [ ] **SET-W01** User without `inventory:settings:manage` → `403`
- [ ] **SET-W02** Concurrent settings save — last write wins, no corrupt state

---

## 27. Cross-Module Integrations

### CRM

- [ ] **INT-01** SO linked to CRM client — client name shown on SO detail
- [ ] **INT-02** Vendor linked to CRM contact
- [ ] **INT-03** SO invoice creates CRM invoice record

### Accounting

- [ ] **INT-04** GRN receive → journal entry in accounting module
- [ ] **INT-05** SO invoice → revenue + COGS journal
- [ ] **INT-06** Inventory valuation matches accounting inventory account

### Branch Scoping

- [ ] **INT-07** Warehouse assigned to branch — branch manager sees only their branch stock
- [ ] **INT-08** SO for branch-specific warehouse

### Worst Cases — Integrations

- [ ] **INT-W01** Accounting module disabled — SO invoice still works, journal skipped gracefully
- [ ] **INT-W02** CRM client deleted — SO shows orphaned link gracefully

---

## 28. Concurrency & Race Conditions

> Run with two browser sessions or parallel API calls.

- [ ] **CON-01** Two users reserve last unit simultaneously — one `400 INSUFFICIENT_STOCK`
- [ ] **CON-02** Double PO receive with different idempotency keys — second blocked
- [ ] **CON-03** Double PO receive with same idempotency key — `409` replay
- [ ] **CON-04** Double SO ship — second `400`
- [ ] **CON-05** Adjustment during active reservation — serialized, no oversell
- [ ] **CON-06** Transfer complete race — only one completion succeeds
- [ ] **CON-07** Cycle count post during active pick — correct final qty
- [ ] **CON-08** 10 concurrent opening balance posts — row lock, no lost updates

---

## 29. Security, RBAC & Data Scope

### Authentication & Authorization

- [ ] **SEC-01** JWT tampering → `401`
- [ ] **SEC-02** Role escalation via API (member → owner action) → `403`
- [ ] **SEC-03** Direct API access bypassing UI — all endpoints gated

### Data Isolation

- [ ] **SEC-04** Org A user cannot access Org B `/inventory/products/:id`
- [ ] **SEC-05** SQL injection in search/filter params → sanitized
- [ ] **SEC-06** XSS in product name rendered safely

### Scopable Permissions

- [ ] **SEC-07** `inventory:products:read` scope `own` — only own products
- [ ] **SEC-08** `inventory:purchase-orders:read` scope `own` — only own POs
- [ ] **SEC-09** `inventory:sales-orders:read` scope `own` — only own SOs
- [ ] **SEC-10** `inventory:stock:read` scope `all` — all warehouses

### Webhook Security

- [ ] **SEC-11** Webhook URL pointing to internal IP → blocked (SSRF)
- [ ] **SEC-12** Webhook URL with file:// scheme → blocked

---

## 30. Worst-Case & Edge-Case Catalog

Quick-reference for destructive, boundary, and failure scenarios.

### Stock Integrity

| ID | Scenario | Expected |
|----|----------|----------|
| WC-01 | Ship more than onHand | `400 INSUFFICIENT_STOCK` |
| WC-02 | `allowNegativeStock=true` + oversell | Negative onHand allowed |
| WC-03 | Reserve > available | `400` (unless backorders) |
| WC-04 | committed > onHand (oversell display) | ATP negative; outbound still blocked |
| WC-05 | Concurrent stock mutations | `FOR UPDATE` serialization |
| WC-06 | Partial transfer receive | Only received qty at destination |
| WC-07 | Reverse already-reversed GRN | `400` |

### Document State Machine Violations

| ID | Scenario | Expected |
|----|----------|----------|
| WC-10 | Post unapproved adjustment (above threshold) | `400` |
| WC-11 | Cancel POSTED adjustment/count | `400` |
| WC-12 | Dispatch transfer from PENDING (skip reserve) | `400` or policy-dependent |
| WC-13 | Pick SERIAL without serialId | `400` per line |
| WC-14 | Pack unpicked SO | `400` |
| WC-15 | Receive DRAFT PO | `400` |
| WC-16 | Over-receive beyond tolerance | `400` + max qty |
| WC-17 | Cancel PO after partial receive | `400` |
| WC-18 | Cancel shipped SO | `400` |
| WC-19 | Duplicate serial on receive | `400 SERIAL_ALREADY_USED` |

### Idempotency & Headers

| ID | Scenario | Expected |
|----|----------|----------|
| WC-20 | Missing `Idempotency-Key` on mutation | `400` |
| WC-21 | Duplicate completed idempotency key | `409` + cached body |
| WC-22 | Retry failed mutation with same key | Re-executes or returns cached per state |

### Data Boundaries

| ID | Scenario | Expected |
|----|----------|----------|
| WC-30 | qty = 0 on any line | `400` |
| WC-31 | qty = 999999999 | Handled or bounded |
| WC-32 | cost with 4+ decimal places | Rounded per policy |
| WC-33 | Unicode in SKU/name | Stored and displayed correctly |
| WC-34 | Very long notes field | Truncated or `400` |

### System Failures

| ID | Scenario | Expected |
|----|----------|----------|
| WC-40 | API timeout mid-transfer dispatch | Transaction rolled back, no partial state |
| WC-41 | DB connection lost during PO receive | Rollback, PO stays receivable |
| WC-42 | Network error on UI submit | Error toast, form data preserved |
| WC-43 | Stale page — submit outdated SO | `400` version conflict or status check |

---

## 31. UI/UX Checklist (All Screens)

Test each route at **375px**, **768px**, and **1280px** viewports.

### Loading / Empty / Error States

Every screen must handle:
- [ ] Skeleton loading on first fetch
- [ ] Empty state with actionable CTA
- [ ] API error with retry option
- [ ] Permission denied state (403)

### Route Checklist

| Route | Load | CRUD | Filters | Mobile |
|-------|:----:|:----:|:-------:|:------:|
| `/inventory` | [ ] | — | [ ] | [ ] |
| `/inventory/products` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/products/new` | [ ] | [ ] | — | [ ] |
| `/inventory/products/[id]` | [ ] | [ ] | — | [ ] |
| `/inventory/products/categories` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/products/uom` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/stock` | [ ] | — | [ ] | [ ] |
| `/inventory/stock/movements` | [ ] | — | [ ] | [ ] |
| `/inventory/stock/adjustments` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/stock/transfers` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/stock/transfers/[id]` | [ ] | [ ] | — | [ ] |
| `/inventory/warehouses` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/warehouses/[id]` | [ ] | [ ] | — | [ ] |
| `/inventory/vendors` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/vendors/[id]` | [ ] | [ ] | — | [ ] |
| `/inventory/purchase-orders` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/purchase-orders/new` | [ ] | [ ] | — | [ ] |
| `/inventory/purchase-orders/[id]` | [ ] | [ ] | — | [ ] |
| `/inventory/sales-orders` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/sales-orders/new` | [ ] | [ ] | — | [ ] |
| `/inventory/sales-orders/[id]` | [ ] | [ ] | — | [ ] |
| `/inventory/operations` | [ ] | — | — | [ ] |
| `/inventory/operations/receipts` | [ ] | [ ] | — | [ ] |
| `/inventory/operations/issues` | [ ] | [ ] | — | [ ] |
| `/inventory/operations/picking` | [ ] | [ ] | — | [ ] |
| `/inventory/operations/packing` | [ ] | [ ] | — | [ ] |
| `/inventory/operations/shipping` | [ ] | [ ] | — | [ ] |
| `/inventory/operations/returns` | [ ] | [ ] | — | [ ] |
| `/inventory/cycle-counts` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/cycle-counts/[id]` | [ ] | [ ] | — | [ ] |
| `/inventory/physical-audits` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/physical-audits/[id]` | [ ] | [ ] | — | [ ] |
| `/inventory/lots` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/lots/[id]` | [ ] | — | — | [ ] |
| `/inventory/serials` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/serials/[id]` | [ ] | — | — | [ ] |
| `/inventory/expiry` | [ ] | — | [ ] | [ ] |
| `/inventory/replenishment` | [ ] | [ ] | — | [ ] |
| `/inventory/replenishment/rules` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/forecasting` | [ ] | — | — | [ ] |
| `/inventory/valuation` | [ ] | — | [ ] | [ ] |
| `/inventory/costing` | [ ] | — | — | [ ] |
| `/inventory/quality` | [ ] | — | — | [ ] |
| `/inventory/quality/inspections` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/quality/holds` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/quality/recalls` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/shipments` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/packages` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/loads` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/carriers` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/channels` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/3pl` | [ ] | [ ] | [ ] | [ ] |
| `/inventory/reports/stock-summary` | [ ] | — | [ ] | [ ] |
| `/inventory/reports/movements` | [ ] | — | [ ] | [ ] |
| `/inventory/reports/reorder` | [ ] | — | [ ] | [ ] |
| `/inventory/settings` | [ ] | [ ] | — | [ ] |
| `/inventory/import` | [ ] | [ ] | — | [ ] |
| `/inventory/barcode` | [ ] | — | — | [ ] |

---

## 32. Regression Smoke (Pre-Release)

Minimum 30-minute smoke before any inventory release:

```
[ ] Module gate — inventory enabled, sidebar visible
[ ] Create product → appears in list
[ ] Create warehouse + receivable location
[ ] Post opening stock → stock levels update
[ ] Create PO → send → receive → stock increases
[ ] Create SO → confirm → pick → pack → ship → stock decreases
[ ] Create adjustment → stock updates
[ ] Create transfer → dispatch → complete
[ ] Dashboard loads without error
[ ] Reorder report shows low-stock items
[ ] Member user gets 403 on write endpoints
[ ] node scripts/functional/inventory.test.mjs — all green
```

---

## 33. Sign-Off Template

| Field | Value |
|-------|-------|
| **Release / Sprint** | |
| **Test org(s)** | |
| **Environment** | dev / staging / prod |
| **Tester** | |
| **Date** | |
| **Automated harness** | pass / fail |
| **Sections completed** | /33 |
| **Total cases** | ~350+ |
| **Passed** | |
| **Failed** | |
| **Blocked** | |
| **Critical defects open** | |
| **Sign-off** | ☐ Approved ☐ Blocked |

### Defect Log

| ID | Test Case | Severity | Summary | Status |
|----|-----------|----------|---------|--------|
| | | P0/P1/P2/P3 | | Open/Fixed/Won't Fix |

---

## Appendix A — API Endpoint Quick Reference

| Domain | Base Path |
|--------|-----------|
| Products | `GET/POST /inventory/products` |
| Categories | `GET/POST /inventory/products/categories` |
| UOM | `GET/POST /inventory/products/uom` |
| Warehouses | `GET/POST /inventory/warehouses` |
| Locations | `GET/POST /inventory/warehouses/:id/locations` |
| Stock levels | `GET /inventory/stock` |
| Transactions | `GET /inventory/stock/transactions` |
| Opening balance | `POST /inventory/stock/opening` |
| Adjustments | `POST /inventory/stock/adjustments` |
| Transfers | `POST /inventory/stock/transfers` |
| Vendors | `GET/POST /inventory/vendors` |
| Purchase orders | `GET/POST /inventory/purchase-orders` |
| GRNs | `GET /inventory/goods-receipts` |
| Sales orders | `GET/POST /inventory/sales-orders` |
| Cycle counts | `GET/POST /inventory/cycle-counts` |
| Physical audits | `GET/POST /inventory/physical-audits` |
| Lots / Serials | `GET /inventory/lots`, `/inventory/serials` |
| Quality | `GET/POST /inventory/quality/*` |
| Shipments | `GET/POST /inventory/shipments` |
| Reports | `GET /inventory/reports/*` |
| Settings | `GET/PATCH /inventory/settings` |
| Import | `POST /inventory/import` |

## Appendix B — Document State Machines

### Purchase Order
```
DRAFT → SENT → PARTIAL → RECEIVED → CLOSED
                  ↘ CANCELLED (no receipts only)
```

### Sales Order
```
DRAFT → CONFIRMED → PARTIALLY_RESERVED/RESERVED → PICKED → PACKED
  → PARTIALLY_SHIPPED/SHIPPED → INVOICED → CLOSED
  ↘ CANCELLED (not shipped/invoiced)
```

### Stock Transfer
```
PENDING → RESERVED → IN_TRANSIT → COMPLETED
  ↘ CANCELLED (PENDING or RESERVED only)
```

### Cycle Count / Physical Audit
```
PLANNED → COUNTING → REVIEW → POSTED
  ↘ CANCELLED (not POSTED)
```

### Stock Adjustment
```
PENDING_POST → POSTED        (below threshold)
PENDING_APPROVAL → APPROVED → POSTED   (above threshold)
  ↘ CANCELLED (not POSTED)
```

## Appendix C — Default Org Settings

```json
{
  "allowNegativeStock": false,
  "allowBackorders": false,
  "reservationStrategy": "AUTO_ON_CONFIRM",
  "defaultCostingMethod": "WEIGHTED_AVERAGE",
  "expiryReservationPolicy": "BLOCK",
  "inspectionOnReceipt": false,
  "inspectionOnReturn": false,
  "overReceiptTolerancePct": "0.00",
  "requirePoApproval": false,
  "adjustmentApprovalThreshold": null,
  "autoReserveOnConfirm": true,
  "allowPartialShipment": true,
  "packageRequiredForShipping": false
}
```

## Appendix D — Known Test Gaps

Backend `it.todo` stubs exist for: lots, serials, expiry, traceability, replenishment rules, forecasting, AI insights, valuation layers (auth/RBAC/shape tests).

Frontend has **no Playwright E2E tests** for inventory yet — this document serves as the manual E2E baseline until automated UI coverage is added.

---

*End of Inventory E2E Test Suite*
