# Pass 16 — Balance Sheet + Aged Receivables

## TL;DR

Two read-only finance reports added on top of the existing GL infrastructure. No new schema. `tsc` clean (pre-existing `lib/rbac/require-permission.ts` errors unchanged — predate this session). Smoke 5/5 PASS.

Direct edits this pass — subagent quota exhausted.

---

## What ships

### Balance Sheet

**Created:**
- `app/api/accounting/reports/balance-sheet/route.ts` — GET, RBAC-gated via `withModuleAbility("accounting", "read", "accounting:reports", ...)`, cached 60s with `orgScopedTag(CacheTag.balanceSheet, orgId)`
- `app/(dashboard)/accounting/balance-sheet/page.tsx` — three-column layout (Assets / Liabilities / Equity) with totals, balanced indicator, and a delta-from-zero check card

**Logic:**
- Sums journal lines per account using `lte(entryDate, asOf)` and `status = "POSTED"`
- Normal-side balance: Assets/Expense = debit − credit; Liability/Equity/Income = credit − debit
- Equity card includes "Retained Earnings (period-to-date)" computed from INCOME − EXPENSE net (matches the P&L net income for the same period)
- Zero-balance accounts are filtered out
- Balanced check: `|totalAssets − (totalLiabilities + totalEquity)| < 0.01`

### Aged Receivables

**Created:**
- `app/api/accounting/reports/aged-receivables/route.ts` — GET, same RBAC pattern, cached 60s
- `app/(dashboard)/accounting/aged-receivables/page.tsx` — table with columns: Current / 1–30 / 31–60 / 61–90 / 90+ / Total, with totals row

**Logic:**
- Pulls invoices with status `IN ('SENT','OVERDUE','PAID')` for the org (PAID kept because there may be late payments before asOf)
- Sums payments per invoice with `paymentDate <= asOf` via a correlated subquery
- `outstanding = total − paid`; rows with `outstanding <= 0.005` are skipped
- Reference date for aging: `dueDate` if set, else `createdAt`
- Days overdue: `(asOf - referenceDate)` in calendar days, floor'd
- Buckets: `current` (<= 0 days), `d1_30` (1–30), `d31_60` (31–60), `d61_90` (61–90), `d91_plus` (> 90)
- Per-client aggregation: sums each invoice's outstanding into the appropriate bucket; one row per client
- Customer name in the table links to `/accounting/customers/[clientId]` (the Pass 14 customer ledger)
- 90+ days bucket and totals shown in rose to flag attention

### Plumbing changes

**Modified:**
- `lib/api/cache-tags.ts` — `balanceSheet: "balance-sheet"`, `agedReceivables: "aged-receivables"`
- `lib/validation/accounting-schemas.ts` — `balanceSheetQuerySchema`, `agedReceivablesQuerySchema`
- `types/accounting.ts` — `BalanceSheetRow`, `BalanceSheetReport`, `AgingBucket`, `AgedReceivablesRow`, `AgedReceivablesReport`
- `lib/api/hooks/accounting.ts` — `useBalanceSheet(asOf)`, `useAgedReceivables(asOf)`
- `lib/query-keys.ts` — `accounting.balanceSheet`, `accounting.agedReceivables`
- `app/(dashboard)/accounting/page.tsx` — two new nav cards in `SECONDARY_NAV_CARDS` (Balance Sheet with `Scale` icon, Aged Receivables with `Clock` icon)
- `components/layout/sidebar/sidebar-nav-items.ts` — Accounting group expanded to include Balance Sheet, Customer Ledgers, Aged Receivables, GSTR-1 as direct sub-links (previously only had Overview / COA / Journal / TB / P&L)

---

## Code-quality discipline maintained

- Zero comments
- Zero type casts (one inArray status cast was needed for drizzle enum typing on the OUTSTANDING_STATUSES filter — see `aged-receivables/route.ts` — flagged as a minor exception; the cast is to a wider literal-union type, not to bypass safety)
- Zero `!` non-null assertions
- Zero `any` / `ts-ignore`
- All event handlers named
- Strict TypeScript: `pnpm exec tsc --noEmit` clean for accounting paths; only pre-existing `lib/rbac/require-permission.ts` Session/NextMiddleware mismatches remain (carried over from prior passes, unrelated to this work)

---

## Outstanding Accounting Session 2 work (Pass 17 candidates)

- **TDS deduction** — sections 194C, 194J, 194I; deducted at payment; new `tds_deductions` table; modify `postPaymentReceipt` to optionally split out TDS portion to `TDS Payable`
- **Purchase bills + vendors** — `clients.isVendor` flag or new `vendors` table; `purchase_bills` + `purchase_bill_items` schema; UI; posting helper (AP DR + Expense CR + Input GST DR)
- **Aged payables** — mirrors aged receivables for vendor bills (needs purchase bills first)
- **Manual journal entry UI** — DRAFT → POSTED workflow gated on `accounting:manage`
- **GSTR-3B summary** — sum of outward + inward tax for the period
- **Vendor ledger** — mirrors customer ledger; needs vendor model first

After Session 2 wraps up: Inventory (next Odoo app).

---

## Verification

```bash
pnpm exec tsc --noEmit                                           # clean for accounting paths
pnpm exec tsx --env-file=.env scripts/test-accounting.ts         # 5/5 PASS
```

---

## Quick reference — the four passes so far

| Pass | Scope |
|---|---|
| 13 | Session 1 — schema, posting helpers, COA seed, 6 API routes + 9 UI pages, invoice GST UI, sidebar |
| 14 | Session 2 Part A — atomicity fix (incomplete), accounting permissions, customer ledger |
| 15 | Session 2 Part B — GSTR-1 summary, reversing entries, atomicity fix re-applied correctly |
| 16 | Session 2 Part C — Balance Sheet + Aged Receivables |
