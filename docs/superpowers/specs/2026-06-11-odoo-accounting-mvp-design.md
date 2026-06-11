# Odoo Accounting MVP — Design Spec

**Date:** 2026-06-11
**Pass:** 6 (Session 1 of 2)
**Status:** Awaiting user review
**Owner:** Aditya
**Scope label:** Option B (Practical MVP), split across two sessions

---

## Why this build

The Streamlineos repo already covers HR, CRM, Projects, Chat, and Calendar but has no double-entry accounting. The existing `invoices` table (in `lib/db/schema/crm.ts`) is a single-`taxRate` customer-invoice list with no link to a general ledger and no GST split. For an Indian SMB product, that is the largest unaddressed pillar — TDS/GST compliance is the #1 reason owners replace spreadsheets with software.

This spec covers the first session of the Accounting build. Session 2 (ledgers, GSTR-1 summary, TDS, purchase bills) is referenced for context but is out of scope here.

---

## What ships in Session 1

1. **Chart of Accounts (COA)** — `accounts` table + seed of 50 standard Indian accounts, list/create/edit page
2. **GST-aware invoice upgrade** — additive columns on existing `invoices` and `invoice_items`; CGST/SGST/IGST split derived from place-of-supply; HSN/SAC per line item
3. **Journal entries** — `journal_entries` header + `journal_lines` debit/credit balanced rows
4. **Auto-posting rules** — invoice send → AR debit + Income credit + Output GST credit; payment receipt → Bank debit + AR credit
5. **Trial Balance + P&L reports** — read-only pages computed from journal lines
6. **Indian state-code reference table** — for place-of-supply lookups (e.g., `MH = 27`)

Existing data is not migrated retroactively. Only invoices created after migration emit journal entries. The legacy `taxRate` column on `invoices` is preserved (read-only path); new invoices fill the new split columns.

---

## What is deferred to Session 2

- Customer ledger and vendor ledger pages
- Aged receivables / aged payables reports
- GSTR-1 read-only summary
- TDS deduction (sections 194C, 194J, 194I)
- Purchase bills schema + UI

These are referenced in this spec only to confirm that the schema decisions in Session 1 do not block them.

---

## Out of scope (later passes, not Session 2)

- GSTR-3B, GSTR-2B reconciliation
- E-invoice IRN generation (GSTN API)
- Bank reconciliation
- Multi-currency
- Year-end closing utilities
- Balance Sheet (computable from journals once equity accounts are in use)
- E-Way Bill
- Form 26Q quarterly TDS data export

---

## Architecture

### Module location

New file: `lib/db/schema/accounting.ts`. Reasoning: accounting is large enough to warrant its own schema file (HR is 1,735 LOC; this will grow similarly over two sessions). Existing `invoices`/`payments` stay in `crm.ts` because they have FKs to `clients` and `projects` and moving them would force a circular import.

New folder: `app/(dashboard)/accounting/` — `coa/`, `journal/`, `reports/trial-balance/`, `reports/profit-loss/`. The existing `app/(dashboard)/billing/invoices/` keeps customer-facing invoice UI but adds GST fields to its create page.

New folder: `app/api/accounting/` — `accounts/`, `journal/`, `reports/`.

Posting helpers: `lib/accounting/post-invoice.ts`, `lib/accounting/post-payment.ts`, `lib/accounting/posting-rules.ts` — pure functions that take a domain event + org context and return journal-entry payloads. Called from existing invoice/payment route handlers, not as triggers.

### Why pure-function posting

A posting helper that takes a domain object and returns `{ entries: JournalEntryInsert[] }` is testable in isolation, idempotent (callers pass an idempotency key), and keeps the GL append-only. Triggers were rejected because Drizzle doesn't model PG triggers ergonomically and they hide the GL writes from the codebase.

### Idempotency

Each journal entry has a `sourceType` + `sourceId` + `sourceEvent` triplet with a unique constraint. Re-running a posting helper for the same `(invoice, "send")` returns the existing entry rather than duplicating it. The unique index is the only correctness barrier.

---

## Schema

### `accounts`

```sql
id                  serial pk
org_id              text fk -> organizations.id  not null
code                text not null     -- e.g., "1100" for Accounts Receivable
name                text not null     -- e.g., "Accounts Receivable"
account_type        account_type_enum not null
parent_account_id   integer fk -> accounts.id  null
is_active           boolean default true not null
description         text null
created_at, updated_at timestamps
unique(org_id, code)
index(org_id, account_type, is_active)
```

(Uses `serial` int primary keys to match the rest of the codebase — `invoices`, `payments`, `clients` are all `serial integer`.)

`account_type_enum`: `ASSET | LIABILITY | EQUITY | INCOME | EXPENSE`

Seed (run per org on first access): 50 accounts following Indian SMB conventions. Examples:
- `1000 Cash`, `1100 Bank Account`, `1200 Accounts Receivable`, `1300 Inventory`, `1410 Input CGST`, `1411 Input SGST`, `1412 Input IGST`, `1500 Fixed Assets`
- `2000 Accounts Payable`, `2110 Output CGST`, `2111 Output SGST`, `2112 Output IGST`, `2200 TDS Payable`, `2300 Salary Payable`
- `3000 Owner's Equity`, `3100 Retained Earnings`
- `4000 Sales Revenue`, `4100 Service Revenue`, `4900 Other Income`
- `5000 Cost of Goods Sold`, `5100 Salaries Expense`, `5200 Rent Expense`, `5300 Utilities Expense`, etc.

Org gets the seed on first call to `GET /api/accounting/accounts` if no accounts exist for that org. Idempotent: subsequent calls do nothing.

### `journal_entries`

```sql
id                 serial pk
org_id             text fk -> organizations.id  not null
entry_number       text not null      -- "JE-2026-000001"; per-org sequence
entry_date         date not null
description        text null
source_type        text not null      -- "invoice" | "payment" | "manual" | "expense" (future)
source_id          text null          -- the originating row id as text (invoice/payment id stringified)
source_event       text null          -- "send" | "receipt" | "void"
status             je_status_enum default 'POSTED' not null
created_by         text fk -> users.id  not null
created_at, updated_at timestamps
unique(org_id, entry_number)
unique(org_id, source_type, source_id, source_event)  -- idempotency barrier
index(org_id, entry_date)
index(org_id, source_type, source_id)
```

`source_id` is stored as text so it can hold either an integer id (from `invoices`, `payments`) or a future string id without schema change. Existing pattern in `crm.ts` for activity logs.

`je_status_enum`: `DRAFT | POSTED | VOID`. MVP only uses `POSTED` for auto-postings. Manual entries can be `DRAFT` but the UI for that lands in Session 2.

### `journal_lines`

```sql
id                 serial pk
entry_id           integer fk -> journal_entries.id  on delete cascade  not null
account_id         integer fk -> accounts.id  not null
debit              decimal(18, 4) default 0 not null
credit             decimal(18, 4) default 0 not null
description        text null
line_order         integer not null
index(entry_id)
index(account_id)
check(debit >= 0 and credit >= 0)
check((debit > 0 and credit = 0) or (debit = 0 and credit > 0))
```

Per-entry invariant enforced in application code (NOT a Postgres deferrable constraint): `sum(debit) = sum(credit)` for all lines of an entry. Posting helpers reject unbalanced payloads. A reconciliation cron (Session 2) will sweep for any breaches.

### Invoice additive columns (no breaking change)

On `invoices`:
```sql
place_of_supply       text null           -- state code, e.g. "27" for MH
customer_gstin        text null
supplier_gstin        text null
reverse_charge        boolean default false not null
tax_inclusive         boolean default false not null
cgst_amount           decimal(18, 4) default 0 not null
sgst_amount           decimal(18, 4) default 0 not null
igst_amount           decimal(18, 4) default 0 not null
```

The existing `taxRate` and `taxAmount` columns are kept. Migration sets the new columns to 0 for existing rows. New invoices populate the split columns; `taxAmount` becomes the sum of cgst+sgst+igst at write-time.

`invoice_items` (NEW table; extracted from JSONB):
```sql
id                 serial pk
invoice_id         integer fk -> invoices.id  on delete cascade  not null
description        text not null
hsn_sac_code       text null
quantity           decimal(18, 4) not null
rate               decimal(18, 4) not null
gst_rate           decimal(5, 2) not null    -- 0, 5, 12, 18, 28
amount             decimal(18, 4) not null   -- pre-tax
line_order         integer not null
index(invoice_id)
```

Existing JSONB `line_items` data is migrated row-by-row in the migration script (read JSON, insert into new table; backfill `gst_rate` from invoice-level `taxRate`). After migration, the JSONB column stays as a read-only legacy backup for one release; removed in Session 2.

### Customer GSTIN

`clients.gstin` column added to existing `clients` table (currently has `state` and `address` but no GSTIN). Nullable; required at runtime only when invoice would be B2B GST.

### `indian_states`

Static reference table (seeded once at deploy):
```sql
state_code     text pk    -- "27"
state_name     text not null  -- "Maharashtra"
gst_state_code text not null  -- same as state_code; future-proofs UT/special-state codes
```

Seeded as part of the migration script, not per-org.

---

## GST treatment

**Place-of-supply resolution** (in posting helper, not in DB):

1. If `invoice.place_of_supply` is set explicitly, use it
2. Else if `client.state` is set, use that state's code
3. Else use `organization.address.state` (intra-state default)

**Tax split rule:**

- `org.state_code == place_of_supply` → CGST + SGST (each = gst_rate / 2)
- Otherwise → IGST (= full gst_rate)

**Per-line computation:**

```
line.amount      = quantity * rate
line.tax_amount  = line.amount * gst_rate / 100
```

**Invoice-level computation** (sum across lines, then split):

```
subtotal       = sum(line.amount)
tax_pool       = sum(line.tax_amount)
if intra-state:
  cgst_amount  = tax_pool / 2
  sgst_amount  = tax_pool / 2
  igst_amount  = 0
else:
  cgst_amount  = 0
  sgst_amount  = 0
  igst_amount  = tax_pool
total          = subtotal + cgst_amount + sgst_amount + igst_amount - discount
```

Decimal arithmetic with banker's rounding to 2 decimal places at the invoice header (lines stored at 4 decimals).

---

## Auto-posting rules

### Invoice "send" event

Trigger: `PATCH /api/invoices/[invoiceId]` with `status: "SENT"`, or `POST /api/invoices` with `status: "SENT"`.

Journal entry created:
- DR Accounts Receivable (1200) — `total`
- CR Sales Revenue (4000) — `subtotal - discount`
- CR Output CGST (2110) — `cgst_amount` (only if > 0)
- CR Output SGST (2111) — `sgst_amount` (only if > 0)
- CR Output IGST (2112) — `igst_amount` (only if > 0)

`source_type = "invoice"`, `source_id = invoice.id`, `source_event = "send"`.

### Payment "receipt" event

Trigger: `POST /api/payments`.

Journal entry created:
- DR Bank Account (1100) or Cash (1000) by `payment_method` — `amount`
- CR Accounts Receivable (1200) — `amount`

`payment_method` → account mapping:
- `bank_transfer | upi | card | cheque` → 1100 Bank
- `cash` → 1000 Cash
- `other` → 1100 Bank (with note)

`source_type = "payment"`, `source_id = payment.id`, `source_event = "receipt"`.

### Invoice void

Out of scope for Session 1. If an invoice is set to `CANCELLED`, the journal entry stays posted; a reversing entry will be implemented in Session 2 alongside the manual-journal UI.

---

## API surface (Session 1)

All routes use `withRoles` from `lib/api/helpers.ts` (added in Pass 1). Default role list: `[OWNER, CEO, HR]` — Accounting is treated as finance-restricted unless the org defines otherwise. RBAC is enforced at route layer; no business logic runs ahead of the role check.

| Method | Path | Roles | Validation | Caching |
|---|---|---|---|---|
| GET | `/api/accounting/accounts` | OWNER, CEO, HR | `paginatedQuerySchema.merge(z.object({ type: z.enum(account_type_enum).optional() }))` | `unstable_cache` tag: `accounts:{orgId}`, revalidate 300s |
| POST | `/api/accounting/accounts` | OWNER, CEO | `createAccountSchema` (code, name, type, parentId?) | `revalidateTag(accounts:{orgId})` |
| PATCH | `/api/accounting/accounts/[accountId]` | OWNER, CEO | `updateAccountSchema` (name?, isActive?, description?) | `revalidateTag(accounts:{orgId})` |
| GET | `/api/accounting/journal` | OWNER, CEO, HR | `paginatedQuerySchema.merge(dateRangeSchema).merge(z.object({ sourceType: z.string().optional() }))` | tag `journal:{orgId}`, revalidate 60s |
| GET | `/api/accounting/journal/[entryId]` | OWNER, CEO, HR | `idSchema` | per-entity tag |
| GET | `/api/accounting/reports/trial-balance` | OWNER, CEO, HR | `z.object({ asOf: z.string().date() })` | tag `tb:{orgId}:{asOf}`, revalidate 60s |
| GET | `/api/accounting/reports/profit-loss` | OWNER, CEO, HR | `dateRangeSchema` | tag `pnl:{orgId}:{from}:{to}`, revalidate 60s |

`createAccountSchema`, `updateAccountSchema`, and report query schemas live in `lib/validation/accounting-schemas.ts`. Existing `lib/validation/common-schemas.ts` primitives are reused — no redefinitions.

Invoice routes (`app/api/invoices/route.ts`, `app/api/invoices/[invoiceId]/route.ts`) and payments routes are NOT new but are extended in this session:
- Validation schema is updated to accept the new GST fields (all optional; defaulted)
- The handlers call `postInvoice()` / `postPayment()` from `lib/accounting/` after the DB write succeeds, within the same transaction
- On failure of the posting step, the invoice/payment write is rolled back

### Cache invalidation strategy

A successful auto-posting calls `revalidateTag` for:
- `journal:{orgId}`
- `tb:{orgId}:*` (pattern; implemented via versioned key — see `lib/api/cache-tags.ts`)
- `pnl:{orgId}:*`

The catalog in `lib/api/cache-tags.ts` is extended with `CacheTag.accounts`, `CacheTag.journal`, `CacheTag.trialBalance`, `CacheTag.profitLoss`.

---

## UI surface (Session 1)

### `app/(dashboard)/accounting/page.tsx`

Accounting hub. Stat cards: open invoices (₹), MTD revenue (₹), unposted journals (always 0 in MVP), accounts count. Below: tabs / quick links to COA, Journal, Reports.

Uses `PageWrapper` + `StatCard` from existing components. Adopts `DS` tokens. Responsive grid via `DS.gridResponsive4`.

### `app/(dashboard)/accounting/coa/page.tsx`

Chart of Accounts. List grouped by account type (tabs: All / Assets / Liabilities / Equity / Income / Expenses). Uses `ListToolbar` for search + filter. Inline create via `EntityFormSheet` (existing pattern from Pass 1).

### `app/(dashboard)/accounting/coa/[accountId]/page.tsx`

Account detail — shows running balance, recent journal lines hitting this account. Read-only in MVP except the existing fields (name, isActive, description).

### `app/(dashboard)/accounting/journal/page.tsx`

Journal entry list. Columns: entry_number, date, source, description, total (sum of debits = sum of credits). Filter by date range and source type. Read-only.

### `app/(dashboard)/accounting/journal/[entryId]/page.tsx`

Single journal entry — header + lines table (account, debit, credit). Read-only.

### `app/(dashboard)/accounting/reports/trial-balance/page.tsx`

Trial Balance as of a chosen date. Each account: opening, debit, credit, closing. Totals row asserts `sum(debit) === sum(credit)`; if not, a red banner surfaces the imbalance (defensive; should be impossible).

### `app/(dashboard)/accounting/reports/profit-loss/page.tsx`

P&L for a chosen date range. Income accounts summed positive, expense accounts summed positive; net at the bottom.

### Invoice page changes

`app/(dashboard)/billing/invoices/new/page.tsx` and the invoice edit page get:
- A new "GST" section (place of supply select from `indian_states`, customer GSTIN field bound to `client.gstin` with manual override)
- Per-line `gst_rate` select (0 / 5 / 12 / 18 / 28) and `hsn_sac_code` text
- Live computed CGST/SGST/IGST display in the totals area

All UI uses existing `DS` tokens, `EntityFormSheet` / form components — no new shared abstractions are introduced.

### Sidebar

`components/layout/app-sidebar.tsx` gets a new `Accounting` section (Calculator icon) with sub-links: Overview, Chart of Accounts, Journal, Reports. Visible only to users whose role is in `[OWNER, CEO, HR]`.

---

## Files to create

```
lib/db/schema/accounting.ts                  -- accounts, journal_entries, journal_lines, indian_states + enums
lib/accounting/post-invoice.ts               -- posting helper for invoice send
lib/accounting/post-payment.ts               -- posting helper for payment receipt
lib/accounting/posting-rules.ts              -- account-code lookup, GST split math
lib/accounting/seed-coa.ts                   -- 50-account default seed runner
lib/accounting/seed-states.ts                -- Indian state codes seed
lib/validation/accounting-schemas.ts         -- zod for accounts, journal queries, reports

lib/api/hooks/accounting.ts                  -- useAccounts, useJournal, useTrialBalance, useProfitLoss

app/api/accounting/accounts/route.ts
app/api/accounting/accounts/[accountId]/route.ts
app/api/accounting/journal/route.ts
app/api/accounting/journal/[entryId]/route.ts
app/api/accounting/reports/trial-balance/route.ts
app/api/accounting/reports/profit-loss/route.ts

app/(dashboard)/accounting/page.tsx
app/(dashboard)/accounting/coa/page.tsx
app/(dashboard)/accounting/coa/[accountId]/page.tsx
app/(dashboard)/accounting/journal/page.tsx
app/(dashboard)/accounting/journal/[entryId]/page.tsx
app/(dashboard)/accounting/reports/trial-balance/page.tsx
app/(dashboard)/accounting/reports/profit-loss/page.tsx
app/(dashboard)/accounting/layout.tsx        -- RBAC gate at the segment

types/accounting.ts                          -- Account, JournalEntry, JournalLine, TrialBalanceRow, etc.

drizzle/<generated migration>.sql            -- via drizzle-kit generate
```

## Files to modify

```
lib/db/schema/crm.ts                         -- additive columns on invoices; new invoice_items table; clients.gstin
lib/db/schema/enums.ts                       -- account_type_enum, je_status_enum
lib/db/schema/index.ts                       -- export accounting schema
lib/api/cache-tags.ts                        -- add accounts, journal, trialBalance, profitLoss tags
types/invoice.ts                             -- add GST fields and InvoiceItem.hsn_sac_code, gst_rate
app/api/invoices/route.ts                    -- updated zod, call postInvoice on send
app/api/invoices/[invoiceId]/route.ts        -- same
app/api/payments/route.ts                    -- updated zod, call postPayment on create
app/(dashboard)/billing/invoices/new/page.tsx        -- GST UI fields
app/(dashboard)/billing/invoices/[invoiceId]/edit/page.tsx  -- GST UI fields
components/layout/app-sidebar.tsx            -- Accounting section
lib/validation/index.ts                      -- re-export accounting-schemas
```

No file deletions in Session 1. The legacy `taxRate` column on `invoices` is preserved.

---

## Migration order

1. Add enums (`account_type_enum`, `je_status_enum`)
2. Create `indian_states` and seed
3. Create `accounts` (org-scoped; seed runs on first access)
4. Create `journal_entries`, `journal_lines`
5. Add additive columns to `invoices`
6. Create `invoice_items`; data-migration script populates from existing JSONB
7. Add `clients.gstin`

Each step is its own drizzle-kit migration so a partial failure is recoverable. The data-migration script (step 6) is run via `pnpm tsx scripts/migrate-invoice-items.ts`. It is idempotent: skips invoices already represented in `invoice_items`.

---

## Testing approach

This codebase has no test harness today (verified by grep — no `vitest`, `jest`, or `*.test.ts` in dependencies). For Session 1:

1. **Posting helpers** — pure functions, testable via `tsx` runner. A minimal `scripts/test-accounting.ts` exercises:
   - `postInvoice` produces a balanced entry (debits = credits) for intra-state, inter-state, multi-line, zero-tax, discount cases
   - `postPayment` produces a balanced entry
   - Idempotency: calling twice returns the same entry id
2. **Trial Balance correctness** — script that creates 5 fixture invoices + 3 payments and asserts `sum(debit) = sum(credit)` in the resulting trial balance
3. **Manual UI smoke** — pnpm dev, create an invoice with each GST scenario, verify the journal entry appears with correct lines and the P&L moves

No formal test framework is introduced this session. If the user wants vitest set up, that's a separate ~2h task in a follow-up pass.

---

## RBAC + security

- Every route uses `withRoles([OWNER, CEO, HR], ...)` from `lib/api/helpers.ts`. No route uses raw `auth()`.
- Every input goes through a zod schema before any DB query.
- Every query has `eq(table.orgId, session.user.orgId)` in its WHERE clause. The `withRoles` helper resolves `session.user.orgId` and passes it as the handler's third argument, matching the convention used elsewhere in the codebase. Cross-org reads are impossible by construction.
- Decimal math runs in JS using `Number` for now (acceptable for amounts ≤ ₹1e14; banker's rounding to 2dp at the header). If users surface accuracy issues we'll switch to `decimal.js` in a follow-up — explicitly tracked.
- Journal entries are append-only. No DELETE endpoint. Mistakes are corrected by a reversing entry (Session 2 manual-journal UI).
- Account `isActive=false` accounts cannot receive new journal lines (enforced in posting helpers).

---

## Risks / known unknowns

1. **Existing invoice JSONB data shape variance.** The data-migration script may encounter line items with missing `quantity` or `rate` fields if older write paths existed. Mitigation: the script logs and skips malformed rows; user reviews the log before deciding what to do with them.
2. **Place-of-supply edge cases.** Special-status states (J&K post-370, UTs) sometimes carry different rules. MVP treats them like any other state by their numeric code; explicit handling deferred until a customer asks.
3. **Decimal precision drift.** JS Number math is fine for MVP but a tax-rate computation across 1000 lines could accumulate sub-paisa drift. Acceptable for v1; switch path documented above.
4. **No `Decimal` Postgres column on existing `payments.amount`.** Already `decimal(12,2)` — sufficient.
5. **Journal sequence generator.** Per-org `entry_number = "JE-YYYY-NNNNNN"` is generated by counting existing entries for `(orgId, year)` and incrementing. Race condition under concurrent posts mitigated by the `UNIQUE(org_id, entry_number)` index — colliding writer retries with the next number. Pure DB sequence is overkill for MVP volume.

---

## Success criteria

Session 1 ships when:

1. `pnpm exec tsc --noEmit` passes
2. `pnpm exec drizzle-kit generate` produces a clean migration
3. A user can: create a customer with GSTIN; create an intra-state invoice with two line items at different GST rates; mark it sent; record a payment; see correct CGST/SGST/IGST on the invoice; see a balanced journal entry under the invoice; see the same numbers reflected in Trial Balance and P&L; create an inter-state invoice and see IGST instead
4. Trial Balance debit total equals credit total to the paisa across all generated entries
5. Sidebar Accounting section is visible to OWNER/CEO/HR and hidden from other roles
6. No commits made by Claude per project rule; user commits manually after review
7. `.env` and auth pages untouched per project rule

---

## Session 2 preview (so schema decisions hold up)

Session 2 will add:
- `vendors` table (or reuse `crm.organizations` with a `is_vendor` flag — to be decided then)
- `purchase_bills` + `purchase_bill_items` (same shape as invoices)
- `tds_deductions` (linked to payment; section, rate, deductee PAN)
- `customer_ledger` view (computed; not a table)
- `vendor_ledger` view (computed)
- Manual journal entry UI (DRAFT → POSTED workflow)
- Reversing-entry endpoint for invoice/payment voids
- GSTR-1 read-only summary page

These additions only ADD to the schema set in Session 1 — they do not require changing any column added in Session 1. Verified by walking through each one against the Session 1 tables.

---

## Open questions for the user (none required — proceeding on defaults)

The following defaults are committed in this spec. If the user wants any of them changed, raise it now or as a redirect during implementation:

1. **Default Accounting role list** — `[OWNER, CEO, HR]`. Alternative: introduce a dedicated `FINANCE` role (currently a phantom, not in `SYSTEM_ROLES`). Default chosen because adding a real role is its own pass.
2. **Journal entry number format** — `JE-YYYY-NNNNNN`. Alternative: `JE-NNNNNN` (no year). Default chosen because the year prefix simplifies year-end reset.
3. **First seed run** — automatic on first call to `GET /api/accounting/accounts`. Alternative: explicit "Initialize Accounting" button. Default chosen for zero-click onboarding.
4. **Branch-level books** — single book per org. Alternative: per-branch books. Default chosen because branch-scoped GL is a known hard problem; defer until a customer asks.
