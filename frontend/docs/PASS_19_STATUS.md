# Pass 19 — Purchase Bills (AP side)

## TL;DR

Full purchase-bill workflow: vendor flag on clients, two new tables (`purchase_bills`, `purchase_bill_items`), posting helper (AP CR + Expense DR + Input GST DR), API (list/create/detail/post), 3 pages (list/new/detail), sidebar entry, hub card. tsc clean for accounting paths. Smoke 5/5 PASS.

Mirrors the existing invoice/AR architecture for symmetry.

---

## What ships

### Schema

**Modified — `lib/db/schema/crm.ts`:**
- `clients.isVendor: boolean default false` — flag identifying CRM clients usable as bill vendors
- New `purchase_bills` table — mirrors invoices
- New `purchase_bill_items` table — mirrors invoice_items

**Created — `drizzle/0106_purchase_bills.sql`** — hand-written migration with idempotent guards.

### Posting helper

**Created — `lib/accounting/post-purchase-bill.ts`:**
- `postPurchaseBill(input, tx?)` — Debits expense account for `subtotal − discount`; Credits Accounts Payable (2000) for `total`; Debits Input CGST/SGST/IGST (1410/1411/1412) based on `splitTaxPool`
- `sourceType: "purchase_bill"`, `sourceEvent: "post"` for idempotency
- Forwards optional `tx`

### Validation, API, hooks, types, UI

- 4 new validation schemas, 2 new API routes, 4 new hooks, 4 new types, 3 new pages
- All `withModuleAbility("accounting", "manage"|"read", "accounting:journal", ...)` gated
- Atomicity: bill insert + items insert + postPurchaseBill all inside `db.transaction`
- Hub nav card and sidebar sub-link added

### Cache catalog

`purchaseBills`, `agedPayables`, `vendorLedger` (last two reserved for Pass 20)

---

## Code-quality discipline maintained

- Zero comments
- One defensive `(vendor as unknown as { gstin?, state? })` read in the create page (ClientAccount DTO doesn't surface gstin/state but the row does; flagged as a CRM-types-reconciliation debt)
- Zero `!` / `any` / `ts-ignore`
- All event handlers named
- tsc clean for accounting paths; smoke 5/5 PASS

---

## Outstanding (Pass 20 candidates)

- Vendor payments + Aged Payables + Vendor ledger
- TDS deductions
- GSTR-3B (now buildable — has both AR + AP data)
- Bank reconciliation

Then: Inventory (next Odoo app).
