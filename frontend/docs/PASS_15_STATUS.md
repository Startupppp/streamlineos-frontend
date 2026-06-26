# Pass 15 — Accounting Session 2 Part B + atomicity correction

## TL;DR

Three deliverables:
1. **GSTR-1 read-only summary** — outward-supplies report API + UI, grouped by B2B/B2C → place of supply → tax rate, with per-line tax-weighted allocation of header GST
2. **Reversing journal entries** — POST endpoint + "Reverse this entry" button on the journal detail page, idempotent via existing UNIQUE constraint
3. **Atomicity gap properly closed** — Pass 14 Task 1's report was misleading; `persistJournalEntry` did NOT actually accept `tx`. Verified by grep and direct file read. Re-applied the change via direct edits, then verified again by grep that the change landed this time.

`pnpm exec tsc --noEmit` clean. `pnpm exec tsx --env-file=.env scripts/test-accounting.ts` 5/5 PASS.

---

## What ships

### GSTR-1 read-only summary

**Created:**
- `app/api/accounting/reports/gstr-1/route.ts` — RBAC-gated, `unstable_cache`-wrapped (60s)
- `app/(dashboard)/accounting/gstr-1/page.tsx` — month/range pickers + grand total card + B2B/B2C nested tables

**Modified:**
- `lib/api/cache-tags.ts` — `gstr1: "gstr-1"`
- `lib/validation/accounting-schemas.ts` — `gstr1QuerySchema`
- `types/accounting.ts` — `Gstr1Section`, `Gstr1RateBucket`, `Gstr1PlaceBucket`, `Gstr1Section1`, `Gstr1Report`
- `lib/api/hooks/accounting.ts` — `useGstr1(from, to)`
- `lib/query-keys.ts` — `accounting.gstr1`
- `app/(dashboard)/accounting/page.tsx` — added GSTR-1 nav card

**Per-line tax allocation algorithm:**
```
weightedTaxTotal = sum over lines of (line.amount × line.gstRate / 100)
ratio per line  = (line.amount × line.gstRate / 100) / weightedTaxTotal
cgstShare per line = invoice.cgstAmount × ratio   (same for SGST/IGST)
```
Lines with `gstRate === 0` get 0 GST allocation but their taxable value still flows into the 0% bucket. Grand totals are computed independently from invoice header sums to guarantee reconciliation.

**Filters applied:**
- Status `IN ('SENT', 'PAID', 'OVERDUE')` — excludes DRAFT and CANCELLED
- Date column: `invoices.createdAt` against `from T00:00:00Z` / `to T23:59:59.999Z`
- Section: B2B when `customerGstin` non-empty, else B2C
- Place name resolved via `indianStates` table

### Reversing journal entries

**Created:**
- `app/api/accounting/journal/[entryId]/reverse/route.ts` — POST endpoint

**Modified:**
- `lib/api/hooks/accounting.ts` — `useReverseJournalEntry(entryId)` mutation
- `app/(dashboard)/accounting/journal/[entryId]/page.tsx` — "Reverse this entry" button with `ConfirmDialog`

**Constraints:**
- 404 if entry not found or not in caller's org
- 409 if original `status !== "POSTED"` (only posted entries are reversible)
- 409 if original `sourceEvent === "reverse"` (no reverse-of-reverse)
- Idempotent: a second POST returns the existing reverse with `created: false`
- Reversing lines: same accountCode, swap debit/credit, description "Reverses ${original.entryNumber}: ${original.description}"
- Cache invalidation: `journal`, `trialBalance`, `profitLoss`, plus `customerLedger` when the source touches AR (`sourceType` is invoice or payment)

UI:
- Button hidden via CASL `ability.can("manage", "accounting:journal")` on the client
- Button disabled when `status !== "POSTED"`, when `sourceEvent === "reverse"`, or when mutation pending
- `ConfirmDialog` titled "Reverse journal entry?" with explanatory body
- Sonner toasts on success/error
- Server enforces the permission independently — UI hide is for cosmetics only

### Atomicity gap — properly closed this time

**Modified directly (after subagent quota exhausted and the prior Pass 14 Task 1 was discovered to have only superficially edited):**
- `lib/accounting/persist-entry.ts` — `DbOrTx` type alias + `persistJournalEntry(draft, tx?)` + `executor = tx ?? db` pattern across all 4 db calls
- `lib/accounting/numbering.ts` — `nextEntryNumber(orgId, year, tx?)` with executor pattern; type-only import of `DbOrTx`
- `lib/accounting/post-invoice.ts` — `postInvoiceSend(input, tx?)` forwards `tx` to `persistJournalEntry`
- `lib/accounting/post-payment.ts` — `postPaymentReceipt(input, tx?)` forwards `tx`
- `server/queries/invoice.ts` — `createPayment(orgId, invoiceId, data, outerTx?)` reuses an outer transaction or opens its own
- `app/api/invoices/route.ts` — `postInvoiceSend` MOVED inside the existing `db.transaction` and now receives `tx`. `seedChartOfAccountsForOrg` hoisted to before the transaction (idempotent, must be committed first). `revalidateTag` calls remain after the transaction commits.
- `app/api/invoices/[invoiceId]/route.ts` — PATCH status transition wrapped in a new `db.transaction`; both the invoice update and `postInvoiceSend` receive the same `tx`. `seedChartOfAccountsForOrg` runs before the transaction.
- `app/api/invoices/[invoiceId]/payments/route.ts` — `createPayment` + `postPaymentReceipt` both wrapped in a single `db.transaction`, both receive `tx`.

### Type alias

```ts
export type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
```

This derives the transaction-handle type from `db.transaction`'s callback signature, so the `PostgresJsDatabase` and `PostgresJsTransaction` shapes are both covered without explicit imports of internal Drizzle types and without `any`.

### Verification (post-fix)

```bash
grep -n "DbOrTx\|tx?: DbOrTx\|executor" lib/accounting/persist-entry.ts
# → 7 hits: type alias, signature, executor declaration, 4 executor. usages

grep -n "postInvoiceSend\|postPaymentReceipt" app/api/invoices/route.ts app/api/invoices/\[invoiceId\]/route.ts app/api/invoices/\[invoiceId\]/payments/route.ts
# → 3 call sites; each followed by ", tx)"

pnpm exec tsc --noEmit                                           # clean
pnpm exec tsx --env-file=.env scripts/test-accounting.ts         # 5/5 PASS
```

---

## Lesson from the Pass 14 Task 1 failure

A subagent reported "DONE" with a detailed account of edits that did not actually save. The status doc was written before any verification grep. This pass added a final grep-against-grep verification step BEFORE writing the status doc. Lesson for future passes: a subagent's report describes intent, not result. **Always verify file contents directly before marking a task complete.**

The skill suggests two-stage review (spec + quality) per task to catch this — Pass 13 used it on the first task (schema rename, where it caught the NextAuth collision), but later tasks skipped reviews for speed. Going forward, at minimum: a grep verifying the agent's key claims is non-negotiable before marking a task complete.

---

## Code-quality discipline (unchanged from Passes 13-14)

- Zero comments added
- Zero type casts (`as X` / `as unknown as Y`)
- Zero `!` non-null assertions
- Zero `any` / `ts-ignore`
- All event handlers named
- Strict TypeScript clean

---

## Outstanding Accounting Session 2 work (Pass 16 candidates)

- **TDS deduction tracking** — sections 194C, 194J, 194I; deducted at payment; new `tds_deductions` table + UI
- **Purchase bills** — vendors (or `clients.isVendor` flag) + `purchase_bills` schema + UI + posting helper (AP DR + Expense CR + Input GST DR)
- **Aged receivables / payables** — bucket clients/vendors by 0–30 / 31–60 / 61–90 / 90+ days from invoice/bill due date
- **Manual journal entry UI** — DRAFT → POSTED workflow gated on `accounting:manage`; reuses the same `persistJournalEntry`
- **Vendor ledger** — mirrors customer ledger; needs vendor model first
- **Balance Sheet report** — computable from journals once equity accounts are in use

After Session 2 wraps up, next Odoo apps in priority order: Inventory → Purchase → Manufacturing → POS → eCommerce → Marketing Automation → Helpdesk → Documents.
