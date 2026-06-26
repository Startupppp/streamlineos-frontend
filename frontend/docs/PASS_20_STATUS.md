# Pass 20 — GSTR-3B + Vendor Ledger + Aged Payables

## TL;DR

Three AP-side reports built on top of Pass 19's purchase bills infrastructure. No new schema. `tsc` clean for accounting paths. Smoke 5/5 PASS.

---

## What ships

### GSTR-3B summary

**Created:**
- `app/api/accounting/reports/gstr-3b/route.ts` — outward (invoices SENT/PAID/OVERDUE) + inward (bills POSTED/PARTIALLY_PAID/PAID) aggregated, net tax payable computed
- `app/(dashboard)/accounting/gstr-3b/page.tsx` — month picker, net tax summary card, sections 3.1 (outward) + 4 (ITC), invoice/bill counts

Logic:
- Output tax (Section 3.1): sums `invoices.cgst/sgst/igstAmount` per status
- Reverse charge breakdown (3.1.d): filtered by `invoices.reverseCharge = true`
- ITC (Section 4): sums `purchase_bills.cgst/sgst/igstAmount` per status
- Net tax payable per type: `max(0, output − itc)`; zero-rated and nil-rated supplies are placeholders for now (require additional invoice-level classification)
- Outward filter uses `invoices.createdAt`; inward filter uses `purchase_bills.billDate`

### Vendor Ledger

**Created:**
- `app/api/accounting/vendors/route.ts` — paginated list of vendor clients with per-vendor outstanding (totalBilled − totalPaid)
- `app/api/accounting/vendors/[vendorId]/ledger/route.ts` — single-vendor ledger with running balance against Accounts Payable account
- `app/(dashboard)/accounting/vendors/page.tsx` — list page with search + "only outstanding" filter
- `app/(dashboard)/accounting/vendors/[vendorId]/page.tsx` — detail page with 3 stat cards + date filter + journal-line table linked to bill/entry detail

Running-balance strategy:
1. Look up AP account by code `2000`
2. Collect this vendor's bill IDs (status `POSTED`/`PARTIALLY_PAID`/`PAID`)
3. Query journal lines hitting AP filtered to `sourceType = "purchase_bill"` AND `sourceId IN billIds`
4. Single pass: `running += credit − debit` (AP is credit-normal)
5. Each line carries `billId` + `billNumber` via pre-fetched maps

### Aged Payables

**Created:**
- `app/api/accounting/reports/aged-payables/route.ts` — bucket `purchase_bills` by `dueDate` overdue days
- `app/(dashboard)/accounting/aged-payables/page.tsx` — table with Current / 1–30 / 31–60 / 61–90 / 90+ buckets, mirrors Aged Receivables

Reference date: `dueDate` if set, else `billDate`. Same bucket boundaries as Aged Receivables.

### Plumbing

- `lib/api/cache-tags.ts` — `gstr3B` added (others reserved in Pass 19)
- `lib/validation/accounting-schemas.ts` — `gstr3BQuerySchema`, `recordVendorPaymentSchema`
- `types/accounting.ts` — `Gstr3BTaxBlock`, `Gstr3BReport`, `AgedPayablesRow`, `AgedPayablesReport`, `VendorLedgerLine`, `VendorLedgerSummary`, `VendorLedger`, `VendorOutstanding`
- `lib/api/hooks/accounting.ts` — `useGstr3B`, `useVendorsOutstanding`, `useVendorLedger`, `useAgedPayables`
- `lib/query-keys.ts` — `gstr3B`, `vendorsOutstanding`, `vendorLedger`, `agedPayables`
- `app/(dashboard)/accounting/accounting-hub-client.tsx` — 3 new secondary nav cards (GSTR-3B, Vendor Ledgers, Aged Payables)
- `components/layout/sidebar/sidebar-nav-items.ts` — 3 new accounting sub-links

---

## Code-quality discipline maintained

- Zero comments added
- Zero `as` type casts in new code
- Zero `!` non-null assertions
- Zero `any` / `ts-ignore`
- All event handlers named
- `pnpm exec tsc --noEmit` clean for accounting paths

---

## Full Accounting MVP surface (cumulative across Passes 13-20)

| Module | Status |
|---|---|
| Chart of Accounts | ✅ COA seed + CRUD + detail page |
| Journal Entries | ✅ List + detail + manual create + DRAFT/POSTED workflow + reverse |
| Auto-posting | ✅ Invoice SEND + Payment receipt + Purchase Bill POST, all atomic |
| Trial Balance | ✅ |
| P&L | ✅ |
| Balance Sheet | ✅ |
| GSTR-1 (outward supplies) | ✅ |
| GSTR-3B (net tax payable) | ✅ |
| Customer Ledgers + Outstanding | ✅ |
| Aged Receivables | ✅ |
| Vendor Ledgers + Outstanding | ✅ |
| Aged Payables | ✅ |
| Purchase Bills + AP posting | ✅ |
| Reverse entries | ✅ |
| RBAC | ✅ first-class `accounting:view/manage/report` permissions |
| Atomicity | ✅ `tx` forwarded through `persistJournalEntry` and all helpers |
| Sidebar + hub | ✅ 11 sub-links in Accounting group |

---

## Outstanding (Pass 21 candidates)

- **Vendor payments** route — POST `/api/accounting/purchase-bills/[billId]/payments` mirroring invoice payments. Auto-posts cash/bank DR + AP CR. Updates `purchase_bills.amountPaid` and transitions status to PARTIALLY_PAID / PAID.
- **TDS deductions** — sections 194C, 194J, 194I; deducted at vendor-payment time; `tds_deductions` table; modify vendor-payment helper to split out TDS portion to `TDS Payable` (account 2200)
- **Bank reconciliation** — match bank statement entries against payments
- **Year-end closing utilities** — close revenue/expense to retained earnings
- **Multi-currency** — currency tables, FX rates, revaluation

Then: Inventory (next Odoo app — also large scope).

---

## Verification

```bash
pnpm exec tsc --noEmit                                           # clean for accounting
pnpm exec tsx --env-file=.env scripts/test-accounting.ts         # 5/5 PASS
```

Pre-existing TS errors (unchanged across Passes 13-20, not from this work): `lib/rbac/require-permission.ts`, `lib/api/hooks/blog.ts`, `app/(dashboard)/projects/[projectId]/settings/page.tsx`, `app/api/hr/performance/cycles/[cycleId]/route.ts`.
