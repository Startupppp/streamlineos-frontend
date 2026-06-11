# Pass 13 — Odoo Accounting MVP (Session 1 of 2)

## TL;DR

Built a GST-aware double-entry accounting module from scratch and wired it into the existing customer-invoice + payment flows. `pnpm exec tsc --noEmit` is clean. `pnpm exec tsx --env-file=.env scripts/test-accounting.ts` passes all 5 posting-rule smoke assertions. Nothing committed (per project rule). Auth pages untouched. `.env` untouched.

Spec: `docs/superpowers/specs/2026-06-11-odoo-accounting-mvp-design.md`
Plan: `docs/superpowers/plans/2026-06-11-odoo-accounting-mvp.md`

---

## What ships

### DB schema (5 new tables, 1 hand-written migration)

`drizzle/0104_accounting_mvp_schema.sql` (style matches `0101_add_quotes_module.sql` — `IF NOT EXISTS` + `EXCEPTION WHEN duplicate_object` guards).

- `ledger_accounts` — chart of accounts (renamed from `accounts` mid-execution to avoid colliding with NextAuth's existing `accounts` OAuth table)
- `journal_entries` — append-only GL header with idempotency UNIQUE constraint on `(org_id, source_type, source_id, source_event)`
- `journal_lines` — debit/credit rows, `decimal(18,4)`
- `indian_states` — 29-state reference for place-of-supply lookups
- `invoice_items` — extracted from the legacy JSONB `invoices.lineItems` column; adds `hsn_sac_code` and `gst_rate` per line
- Additive columns on `invoices`: `place_of_supply`, `customer_gstin`, `supplier_gstin`, `reverse_charge`, `tax_inclusive`, `cgst_amount`, `sgst_amount`, `igst_amount`
- `clients.gstin` column

Legacy `invoices.tax_rate` and JSONB `lineItems` columns preserved — additive migration, no breaking change to existing rows.

### GL machinery (pure functions + idempotent persist)

| File | Responsibility |
|---|---|
| `lib/accounting/posting-rules.ts` | `splitTaxPool`, `isIntraState`, `computeLineAmount`, `computeLineTax`, `paymentMethodToAccountCode`, `ACCOUNT_CODES` |
| `lib/accounting/numbering.ts` | `nextEntryNumber(orgId, year)` → `JE-YYYY-NNNNNN` |
| `lib/accounting/persist-entry.ts` | Balance check + idempotency lookup + retry-on-unique-violation insert |
| `lib/accounting/post-invoice.ts` | `postInvoiceSend` — AR / Sales / Output-GST entries |
| `lib/accounting/post-payment.ts` | `postPaymentReceipt` — Bank/Cash DR, AR CR |
| `lib/accounting/seed-coa.ts` | 50 Indian-standard accounts; idempotent per org; runs lazily on first call to `/api/accounting/accounts` |
| `lib/accounting/seed-states.ts` | 29 Indian states seed (server-only DB write) |
| `lib/accounting/indian-states.ts` | Same list, client-safe (separated because `seed-states.ts` is `server-only`) |

### API surface (6 routes, all RBAC-gated + zod-validated + cached)

- `GET /api/accounting/accounts` (OWNER/CEO/HR) — list, cached 300s, lazy-seeds COA
- `POST /api/accounting/accounts` (OWNER/CEO) — create
- `PATCH /api/accounting/accounts/[accountId]` (OWNER/CEO) — update
- `GET /api/accounting/journal` (OWNER/CEO/HR) — list with date-range + sourceType filters, cached 60s
- `GET /api/accounting/journal/[entryId]` (OWNER/CEO/HR) — header + lines joined to account code/name
- `GET /api/accounting/reports/trial-balance?asOf=YYYY-MM-DD` (OWNER/CEO/HR) — cached 60s
- `GET /api/accounting/reports/profit-loss?from=&to=` (OWNER/CEO/HR) — cached 60s

Modified existing routes (additive, preserve all prior behavior):
- `POST /api/invoices` — accepts new `items[]` (with `gstRate` + `hsnSacCode`) alongside legacy `lineItems`, computes CGST/SGST/IGST split, writes `invoice_items` rows, mirrors data to legacy JSONB; calls `postInvoiceSend` when `status === "SENT"`
- `PATCH /api/invoices/[invoiceId]` — posts journal entry on DRAFT → SENT transition
- `POST /api/invoices/[invoiceId]/payments` — calls `postPaymentReceipt` after payment insert

Cache invalidation: every posting calls `revalidateTag(tag, "default")` on `journal:{orgId}`, `trial-balance:{orgId}`, `profit-loss:{orgId}`.

### Validation + types + cache catalog

- `lib/validation/accounting-schemas.ts` — zod for accounts CRUD, journal queries, report queries
- `lib/api/cache-tags.ts` — added `ledgerAccounts`, `journal`, `trialBalance`, `profitLoss`
- `types/accounting.ts` — `Account`, `AccountType`, `JournalEntry`, `JournalLine`, `JournalEntryStatus`, `TrialBalanceRow`, `ProfitLossRow`, `ProfitLossReport`

### TanStack hooks

`lib/api/hooks/accounting.ts` — uses the existing `apiClient` from `lib/api-client.ts`:
- `useAccounts`, `useCreateAccount`, `useUpdateAccount(id)`
- `useJournal`, `useJournalEntry(id)`
- `useTrialBalance(asOf)`, `useProfitLoss(from, to)`

Query keys under `lib/query-keys.ts` `accounting` namespace, matching the project's existing pattern.

### UI (9 new pages + 1 form dialog + invoice GST upgrade)

- `app/(dashboard)/accounting/layout.tsx` — RBAC gate (OWNER/CEO/HR, with platform/org-owner bypass)
- `app/(dashboard)/accounting/page.tsx` — hub with 4 stat cards + 4 nav cards
- `app/(dashboard)/accounting/coa/page.tsx` — COA list with tabs (All / Asset / Liability / Equity / Income / Expense), search, create button
- `app/(dashboard)/accounting/coa/[accountId]/page.tsx` — account detail
- `app/(dashboard)/accounting/journal/page.tsx` — journal list with date + source filters
- `app/(dashboard)/accounting/journal/[entryId]/page.tsx` — single entry with balanced totals row
- `app/(dashboard)/accounting/trial-balance/page.tsx` — TB with balanced/imbalanced indicator
- `app/(dashboard)/accounting/profit-loss/page.tsx` — side-by-side Income vs Expense + net income card
- `features/accounting/create-account-dialog.tsx` — small form → `EntityFormDialog` (NOT Sheet, per the "small=dialog/large=sheet" rule), react-hook-form + zod + sonner toasts

Invoice UI upgrade in `app/(dashboard)/billing/invoices/new/page.tsx`:
- Migrated from `useState` to react-hook-form + `useFieldArray` + zod
- Per-line `hsn_sac_code` text + `gstRate` Select (0/5/12/18/28)
- New GST panel: `placeOfSupply` (Select from 29 states), `customerGstin`, `supplierGstin`, `reverseCharge` (with 15-char GSTIN regex validation)
- Live CGST/SGST/IGST display in totals (uses `splitTaxPool` directly — no duplicated math)
- Submit sends both `items[]` (new) and `lineItems` (legacy mirror) for backwards-compat

### Sidebar

`components/layout/sidebar/sidebar-nav-items.ts` — new Accounting group with `Calculator` icon, slotted between Finance and Marketing, gated via `requiredPermission: ["hr:salary:manage", "hr:payroll:approve"]` (pragmatic: matches existing CEO/HR/OWNER bypass without introducing new permission strings — see "Tech debt" below).

### Scripts

- `scripts/migrate-invoice-items.ts` — idempotent JSONB → `invoice_items` data migration (run once after `0104` migration applies)
- `scripts/test-accounting.ts` — posting-rules smoke (5 assertions, all pass)

---

## Code-quality discipline maintained

Across all 20 tasks:
- Zero code comments added
- Zero type casts (`as X` or `as unknown as Y`)
- Zero `!` non-null assertions
- Zero `any` / `ts-ignore`
- All event handlers named (no inline anonymous arrows for onClick/onChange/onSubmit). Library render-prop arrows (react-hook-form `FormField render`) preserved as-is per library API.
- Small forms → `EntityFormDialog` (Create Account)
- Large forms → react-hook-form + sections (Invoice GST upgrade)
- Sonner for toasts
- Loading / error / empty states handled on every page using `LoadingState` and `ErrorState` from `components/shared/`

---

## Known MVP trade-offs (documented for Session 2)

1. **Atomicity gap** — `persistJournalEntry` uses top-level `db`, not the invoice/payment transaction's `tx`. If the journal post fails after the invoice insert succeeds, the row exists without a journal entry. The idempotency UNIQUE means retry won't double-post. Fix path: refactor `persistJournalEntry` to accept an optional `tx` in Session 2.

2. **`clients.state` missing** — the schema has no client-side state column. Place-of-supply currently falls back to intra-state default when not explicitly set. Fix: add `clients.state` in Session 2 alongside the customer-ledger work.

3. **No `invoiceDate` column** — journal entry date uses `today` (UTC) for both create and DRAFT→SENT transitions. If invoice predates the SEND event by days/weeks, the GL date will be wrong. Acceptable for MVP.

4. **Sidebar permission reuse** — Accounting visibility is gated via existing HR salary permissions (`hr:salary:manage`, `hr:payroll:approve`). A first-class `accounting:view`/`accounting:manage` permission set should be added in Session 2.

5. **No formal test framework** — verification is `tsc --noEmit` + the `tsx` smoke script. Adding vitest is a separate ~2h task.

6. **`postInvoiceSend` on PATCH uses header-derived numbers** — when transitioning DRAFT → SENT via PATCH, subtotal/discount/taxPool are reconstructed from the persisted columns. Should match the create-time computation; verified mentally but not numerically tested across all DRAFT-with-edits scenarios.

7. **Editing legacy `lineItems` on PATCH doesn't recompute GST** — if a draft is edited via the legacy field, `cgst/sgst/igst` columns can drift. Acceptable because new clients write via `items[]`; deprecation path for legacy field is Session 2.

---

## Critical mid-execution decision

During Task 1 implementation, the implementer surfaced a name collision: NextAuth already has an `accounts` table for OAuth identities, and a second `accounts` table for chart-of-accounts would silently fail to create (`CREATE TABLE IF NOT EXISTS` is a no-op when the name already exists).

**Decision: rename the new domain table to `ledger_accounts` (TS: `ledgerAccounts`).** Documented inline in the plan file at `docs/superpowers/plans/2026-06-11-odoo-accounting-mvp.md` under the "Mid-execution amendment" header. The consumer-facing TypeScript type stays `Account` (in `types/accounting.ts`) — the rename is at the DB-binding layer only.

---

## How to apply (when ready)

1. Apply the migration: `pnpm exec drizzle-kit migrate` (or whatever this repo's apply-pending-migrations command is — `0104_accounting_mvp_schema.sql` is hand-written and idempotent)
2. One-time backfill of existing invoice line items: `pnpm exec tsx --env-file=.env scripts/migrate-invoice-items.ts`
3. Verify: `pnpm exec tsx --env-file=.env scripts/test-accounting.ts`
4. Start dev: `pnpm dev` then sign in as OWNER/CEO/HR and walk the golden path:
   - `/accounting` — hub renders with 4 stat cards
   - `/accounting/coa` — 50 default accounts visible across tabs; create one
   - `/billing/invoices/new` — create intra-state invoice with two lines at 18% and 5% GST; submit as SENT; verify CGST/SGST split in totals
   - `/accounting/journal` — new entry visible
   - Click it — debits = credits, lines for AR, Sales, Output CGST, Output SGST
   - `/accounting/trial-balance` — balanced
   - `/accounting/profit-loss` — sales revenue on income side
   - Record a payment on the invoice — new payment entry appears (Bank DR / AR CR)
   - Create an inter-state invoice (different `placeOfSupply` state code) — verify IGST instead of CGST/SGST

---

## Recommended Pass 14

Session 2 of the Accounting build:
- Refactor `persistJournalEntry` to accept an optional `tx` (closes atomicity gap)
- Add `clients.state`
- Customer ledger page (`/accounting/customers/[clientId]`) and vendor ledger
- Aged receivables / payables reports
- TDS deduction tracking (sections 194C, 194J, 194I)
- Purchase bills schema + UI (`/accounting/bills`)
- GSTR-1 read-only summary
- Reversing-entry endpoint for invoice/payment voids
- First-class `accounting:view` / `accounting:manage` permissions

After Session 2, the next Odoo apps in priority order: Inventory → Purchase → Manufacturing → POS → eCommerce → Marketing Automation → Helpdesk → Documents.

---

## Verification

```bash
pnpm exec tsc --noEmit                                           # clean
pnpm exec tsx --env-file=.env scripts/test-accounting.ts         # 5/5 PASS
```

Both passed at end of Pass 13.
