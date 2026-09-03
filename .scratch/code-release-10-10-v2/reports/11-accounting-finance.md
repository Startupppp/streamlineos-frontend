# 11 — Accounting and Finance (PRD-C126)

**Status:** audited and partly fixed. Everything below was executed and read; nothing is inferred.

| | |
|---|---|
| Backend commit measured at | `959b0a8948a324839a0926a3e35afee97870f563` (`release/code-10-10-v2`) |
| Frontend commit measured at | `778f7d467f7fce5f890f06d006bd745bf3157748` (`release/code-10-10-v2`) |
| Database measured | `scratch_perf_seed`, local Postgres. Journal **665/665 applied; repo journal is 672** — the seed is **7 migrations behind head**. 1,720 MB, 8 organizations. |
| Role used | `streamline_app` — verified in-session `rolbypassrls = f`, `rolsuper = f` |
| Tenant GUC | `app.organization_id` — note `SET LOCAL app.current_org_id` does **not** work; `current_org_id()` is the reader function and raises `42501` |
| Writes | none. No `scratch_*` database was modified. |

Commands, gate exit codes and the repo-wide failures that are **not mine** are tabulated in
`10-billing-payments.md` §5 — one run covered both tickets. Headline: backend `typecheck` **exit 0**,
frontend `type-check` **exit 0**, `jest` over
`modules/(finance|expenses|accounting|invoices|quotes|billing)/` **exit 0 — 185 suites, 1294 tests**,
and 17 backend + 9 frontend `check:*` gates at **exit 0**.

---

## 1. The premise in the brief is false on this branch — and that is the most important finding

The brief (and project memory) records an accounting **rewrite** onto a `gl_*` kernel, with the rule
*"the `gl_*` kernel wins and the legacy path is a REMOVE candidate"*. **Proved by dependency graph,
not text search, that this is inverted here.**

Method: parsed every `export const X = pgTable("name")` under `db/schema/**`, resolved each consuming
file's own `import {…}` statements, classified operations on the bound local name; then reproduced
`src/scripts/check-outbox-consumers.mjs`'s module-graph walk (it reproduces the gate's own numbers —
3,637 TS files, **216 modules reachable from `AppModule`**) and added a second BFS over ES imports
from `src/main.ts` (3,458 / 3,637 files reachable).

**Result:**

* `src/db/schema/accounting/gl-kernel.ts` **does not exist on this branch.** It exists only on
  `feat/accounting-module` and its descendants. Neither this branch nor `main` has it.
  `grep -rn "gl_" src/ --include="*.ts"` returns **0 hits**.
* The **13 `gl_*` tables do exist in the database** — `gl_accounts`, `gl_book_currencies`, `gl_books`,
  `gl_currencies`, `gl_document_attachments`, `gl_document_compliance`, `gl_document_sequences`,
  `gl_fiscal_years`, `gl_fx_rates`, `gl_journal_lines`, `gl_journals`, `gl_parties`, `gl_periods`.
  They are created by three **journalled** migrations: `0489_chain_creates_early`,
  `0591b_gl_ap_ar_bank_tax_chain_repair`, `0619_chain_creates_what_production_has`. `0591b`'s own
  header states the cause: they *"were created on the live database via `drizzle-kit push` and never
  had a corresponding CREATE TABLE migration"*; `0619` is reverse-generated from `pg_catalog` so a
  cold build matches production.
* **Zero services touch them.** No Drizzle schema declares them, so no provider among the registered
  classes can. The only references in `src/` are raw SQL in six non-TypeScript scripts
  (`seed-perf1-budgets.mjs`, `seed-envelope.mjs`, `seed-scratch-e2e.mjs`, `scan-legacy-org-actors.mjs`,
  `read-cost-budgets.mjs`, `actor-classification-allowlist.json`) — none reachable from `AppModule`.
* Measured on the seed: `gl_journals` holds **35 rows** and `gl_journal_lines` holds **0** — 35
  journal headers with no lines, all written by the seeder.
* **They carry no immutability trigger**, while the live `journal_entries` / `journal_lines` do (§3).

**The live accounting kernel on this branch is `ledger_accounts` / `journal_entries` /
`journal_lines` / `accounting_periods`**, written by `accounting/posting/` and `accounting/gl/`.
Note the trap: the module folder is named `gl/` but writes `journal_entries`, **not** `gl_journals`.

> **Do not act on any "the `gl_*` kernel wins" recommendation against `release/code-10-10-v2`.
> Deleting the legacy path here deletes the only working implementation.** The residual `gl_*`
> tables are a separate, deliberate decision for the release owner: 13 tenant tables with data and
> no application code.

### No table-level duplication exists

Every financial purpose resolves to exactly one live table.

| Purpose | Orphaned `gl_*` | Live table | Writers | Verdict |
|---|---|---|---|---|
| GL accounts | `gl_accounts` (0 refs) | `ledger_accounts` | 26 consumers / 4 writers | KEEP |
| Journal header | `gl_journals` (0 refs) | `journal_entries` | 28 / 6 | KEEP |
| Journal lines | `gl_journal_lines` (0 refs) | `journal_lines` | 28 / 3 | KEEP |
| Periods | `gl_periods`, `gl_fiscal_years` | `accounting_periods` | `accounting/gl/periods.service`, `accounting/posting/finance-posting.service` | KEEP |
| FX rates | `gl_fx_rates` | `fin_exchange_rates` | 3 / 1 | KEEP |
| Doc numbering | `gl_document_sequences` | `acc_number_sequences` | 6 / 6 | KEEP |
| Customer invoices | — | `invoices`, `invoice_items` | 27 consumers | KEEP |
| Vendor bills | — | `purchase_bills` | 23 consumers | KEEP |
| Expense claims | — | `expenses` | 17 consumers | KEEP |
| Quotes | — | `quotes` | 8 consumers | KEEP |

### The apparent "parallel modules" are complementary, not duplicate

All **23 `@Module`s** across `accounting/ finance/ billing/ invoices/ expenses/ quotes/` are
**reachable from `AppModule`** — the "compiles green, does not exist at runtime" failure mode does
not occur here. Checked against `openapi.json`: of 2,700 paths, **270 in scope, zero collide** after
normalising path params.

* `accounting/core` owns `GET|POST|PATCH accounting/purchase-bills`; `finance/ap/bills-workflow`
  mounts the same prefix but owns only the workflow verbs (`:billId/{submit-approval,approve,cancel}`).
* `expenses/` is employee-facing (`me/expenses`, `hr/expenses`); `finance/expenses/` is finance-facing
  (`accounting/expenses/policies`, `accounting/reimbursements`).
* `invoices/` owns `/invoices`; `finance/ar/` owns collections, credit notes, recurring invoices.

**REMOVE candidates: one, and it is not a kernel.** `src/modules/finance/reports/finance-reports-csv.util.ts`
(11 lines, exports `buildCsv`): zero runtime importers, no barrel, not in
`assertion-ceiling-ledger.json`; its only importer is its own spec. It **is** a genuine parallel
implementation — `finance/reports/finance-report-export-worker.service.ts:28` defines a private
`csvRow()` with byte-identical escaping and does not import it. **Semantic divergence: `buildCsv`
caps output at `CSV_ROW_CAP = 10_000` rows; the live path has no cap.** Flagged rather than deleted —
adopting it would *add* a row cap, which is a behaviour change, not a refactor. **Not removed.**

---

## 2. Money units — five defects found, five fixed

`src/modules/accounting/core/money.util.ts` is the correct, exact answer already present in this
repo: bigint arithmetic at scale 4, half-up `roundDecimal`, largest-remainder `allocateDecimal`, and
`assertDebitsEqualsCredits`. 28 files import it, including `finance/expenses/` and `finance/planning/`.
**`finance/banking/` bypassed it entirely** and did IEEE-754 arithmetic on money.

No float *column* stores money anywhere in the schema (see `10-billing-payments.md` §2).

| Sev | Site | Was | Now |
|---|---|---|---|
| **P1** | `finance/banking/bank-accounts.service.ts:269` | `(parseFloat(openingBalance) + parseFloat(movementSum)).toFixed(4)` — the **persisted** `current_balance`, which then authorizes transfers | `addDecimals(toDecimal(…), toDecimal(…))` |
| **P1** | `finance/banking/reconciliation.service.ts:133,139,161` | `String(Math.abs(parseFloat(txn.amount)))` — the value **posted into the immutable journal** | `absDecimal(toDecimal(txn.amount))` |
| **P2** | `finance/banking/transfers.service.ts:103-105` | `parseFloat(currentBalance) < parseFloat(amount)` — an **authorization decision** on money | `compareDecimals(toDecimal(…), toDecimal(…)) < 0` |
| **P2** | `finance/banking/reconciliation.service.ts:255-257` | `Math.abs(parseFloat(a) - parseFloat(b)) > 0.01` — the ledger-vs-bank **mismatch alarm** | exact `subtractDecimals`/`absDecimal` against a named `RECONCILIATION_TOLERANCE = "0.01"` |
| **P2** | `finance/ap/ap-approval.helper.ts:36` | `total >= Number(p.minAmount)` — the **separation-of-duties threshold** | `compareDecimals(…) >= 0`; signature changed from `total: number` to a decimal string, with `payment-runs.service.ts:213`, `bills-workflow.service.ts:56` and `reconciliation.service.ts:78` updated to pass `toDecimal(...)` |
| **P3** | `finance/banking/bank-accounts.service.ts:131` | `parseFloat(input.openingBalance) !== 0` | `!isZero(toDecimal(...))` |

`ap-approval.helper.spec.ts` updated to the string signature and **strengthened** with two cases that
only pass under exact comparison: a threshold of `10000000000000.03` matches at `…03` and does not
match at `…02` — a distinction a double cannot represent.

```
jest --runInBand --testPathPattern="modules/finance/(banking|ap)/"   EXIT=0   36 suites, 166 tests
```

### Also fixed — expense CSV import silently persisted a wrong amount (P1)

`expenses/expenses-import.service.ts:132` read the amount cell with `parseFloat`. Demonstrated in
node against the real values:

```
"1,234.50" -> 1        "1.2.3" -> 1.2       "500abc" -> 500      "1e3" -> 1000
```

None of these are rejected by the old guard (`isNaN || <= 0 || > 100_000_000`) — **a thousands-
separated ₹1,234.50 imported as ₹1.00**, and with `autoApprove` it landed `APPROVED`. The banking
importer strips separators (`imports.service.ts:73`); the expense importer did not.

Replaced with `parseImportAmount`: strips separators, requires `^\d{1,12}(\.\d{1,2})?$`, then goes
through `toDecimal` / `isZero` / `compareDecimals` against the ceiling. `parseFloat` is gone from the
path. Proof: `src/modules/expenses/expenses-import-amount.spec.ts` (new, 9 cases) drives the **real**
service with a capturing db double and asserts the persisted row.

```
jest --runInBand --testPathPattern="expenses-import-amount"   EXIT=0   9 passed
```

**Bite test** against the old parser: `BITE EXIT=1, Tests: 4 failed, 5 passed`. Source restored.

### Not fixed, deliberately — invoice total arithmetic (P1, open)

`invoices/invoices-write.service.ts:62-75` and `invoices/invoices-update.service.ts:117-123` compute
`subtotal`, `taxAmount` and `total` with `round2` / `reduce(+)` / `toFixed(2)` on JS doubles, then
persist them into `decimal(18,4)` columns — truncating the ledger's own scale on the way.
The frontend mirrors the same computation and diverges measurably: `round2(1.005)` yields `1.00`
where `roundDecimal("1.005", 2)` yields `1.01`, and for a tax pool of `18.045` the client shows
CGST 9.02 / SGST 9.03 while the exact split is 9.0225 / 9.0225.

**Left open on purpose.** Converting only the update path would make create and update disagree, so
an invoice's total could shift by a paisa merely by being edited — worse than the current uniform
behaviour. The correct unit of work is create + update + `FinancePostingService.gstSplit` together,
plus the client's `bill-form-schemas.ts` / `new-invoice-form.tsx`. That is a single coherent change
and should be scheduled as one.

---

## 3. Immutable, tenant-safe ledgers — verified at the database

Read from `pg_trigger` / `pg_proc` on `scratch_perf_seed`:

| Table | Trigger | Function |
|---|---|---|
| `invoices` | `trg_invoice_immutability` | `enforce_invoice_immutability` |
| `journal_entries` | `trg_journal_entry_immutability` | `enforce_journal_entry_immutability` |
| `journal_lines` | `trg_journal_line_immutability` | `enforce_journal_line_immutability` |

`enforce_journal_line_immutability` raises `check_violation` when `debit`, `credit`, `account_id`,
`org_id` or `entry_id` changes on a line whose parent entry is `POSTED` or `VOID`, with the message
*"create a reversal entry instead"*. **The application agrees:** a repo-wide search for
`update(journalLines)` / `delete(journalLines)` returns **zero** production call sites — journal lines
are append-only in code as well as in the database. The six `update(journalEntries)` sites all sit
behind `assertEntryNotPosted` (`accounting/posting/finance-posting.service.ts`), pinned by
`accounting/posting/journal-immutability.spec.ts`. **KEEP — this is the criterion met.**

Invoices are covered in `10-billing-payments.md` §3 (DB trigger + `invoices-update.service.ts:102`
refusing to edit a non-draft invoice — two independent lines of defence).

**Gap:** `gl_journals` and `gl_journal_lines` carry **no** immutability trigger. Harmless today
because no code writes them (§1), but if the `gl_*` kernel is ever merged forward, **the immutability
guarantee does not travel with it.** Record this against the rewrite branch.

### Tenant safety

`pnpm check:tenant-isolation` exit 0 — 931/931 tenant-owned services have a declared isolation test.
All 13 `gl_*` tables have `relrowsecurity = t`. `invoice_items` has RLS on with a `tenant_isolation`
policy.

**Declared-vs-live drift on `invoice_items` (P2, reported, not changed).** The live column list is:

```
id, invoice_id, description, hsn_sac_code, quantity, rate, gst_rate, amount, line_order, org_id
```

`org_id` is `text NOT NULL`, has **no default**, is uniquely indexed as
`uniq_invoice_items_org_id (org_id, id)` and carries the RLS policy — yet the Drizzle declaration
(`db/schema/crm/invoicing.ts`) **does not declare it at all**. Inserts survive only because of a
compensating database trigger, `trg_set_org_id` → `set_org_id_from_parent`, which fills it from the
parent invoice. Consequences: no application code can write or read `invoiceItems.orgId`, and no
tenant-correlated predicate on it is expressible — which is why
`invoices-update.service.ts:132` deletes by `invoiceId` alone with no org predicate (RLS covers it,
but CLAUDE.md §3 wants the predicate explicit). Fixing this is a schema-declaration change and
belongs with whoever owns the migration wave, not with a module audit.

---

## 4. Normalized expenses, reconciliation, bounded reads, queues, retention, authorization

| Criterion | Evidence | Verdict |
|---|---|---|
| Normalized expenses | `expenses` is a real table with `org_id`, `status`, `deleted_at`, indexes — no JSONB arrays. `expense-lifecycle.service.ts` imports `money.util`. | met |
| Reconciliation | `finance/banking/reconciliation*.ts` + `matching.service.ts`; the posting and alarm paths are now exact (§2) | met, improved |
| Bounded indexed reads | `check:unbounded-reads` exit 0 — 3 actionable unbounded repo-wide (target 0), **0 in my folders**; `check:query-projections` exit 0 (1378 vs ceiling 1383); `check:n1-growing-loops` exit 0 (97 vs ratchet 102) | met at the gate |
| Queue-backed exports/reminders | `check:outbox-consumers` exit 0 — 24 emitted / 29 declared / **29 registered**, including `expense.export.requested`, `finance.report.export.requested`, `accounting.bill.approved`, `accounting.bill.paid`, `accounting.invoice.reminder.due` | met |
| Idempotent consumers | `check:idempotent-commands` exit 0; consumers claim through `InboxConsumer` on `(producer_event_id, consumer_name)`. The two named `finance/controls/approvals.controller.ts:52,64` skips are declared `bespoke-mechanism`, not hidden | met |
| Retention | `check:retention-coverage` exit 0; `accounting/posting/financial-retention.spec.ts` present | met |
| Authorization | `check:authz-deny` exit 0 (uncovered 2311 vs ratchet 2441); `check:record-access` exit 0; `check:scope-application` exit 0 (150/150) | met at the gate |
| Transaction discipline | `check:transaction-callbacks` exit 0 — 473 doubles, 266 invoke, VOID 2 at ratchet 2 | met |
| SET NULL column lists | `check:set-null-column-lists` **exit 0 with a database** — 562 declared, 274 needing a list, 802 catalog constraints, catalog half matched. Bare it exits 2 `INCONCLUSIVE` (missing env), which is not a failure | met |

**Honest limits.** `check:authz-deny` and `check:tenant-isolation` are *static*: they prove a test
exists and is attributable, not that it passes. The execution companion
(`check:tenant-isolation:run`) was **not run** — it is a full jest sweep and the mutex budget was
spent on the module suite. Say "not run", not "passing".

---

## 5. Classification of my accounting/finance folders

| Path | Files (src / spec) | Verdict | Reason |
|---|---|---|---|
| `src/modules/accounting/**` | 61 / 27 | **KEEP** | live GL kernel; all 6 modules reachable from `AppModule` |
| `src/modules/finance/**` | 133 / 99 | **KEEP** | all 10 sub-modules reachable; AP/AR/banking/tax/planning are the live paths |
| `src/modules/invoices/**` | 12 / 10 | **KEEP** (one **REFACTOR**) | `invoices.service.ts` now returns `lineItems` — prevents an invoice PDF with no itemisation and an edit dialog that could replace real rows with a placeholder |
| `src/modules/expenses/**` | 20 / 9 | **KEEP** (one **REFACTOR**) | `expenses-import.service.ts` — prevents a comma-formatted amount importing as ₹1.00 |
| `src/modules/quotes/**` | 5 / 3 | **KEEP** | reachable, no defect found |
| `finance/banking/**` | — | **REFACTORED** | prevents a wrong persisted bank balance, a wrong journal posting, a mis-authorized transfer and a false/missed reconciliation alarm |
| `finance/ap/ap-approval.helper.ts` | — | **REFACTORED** | prevents a payment slipping past its approval threshold on a representation error |
| `finance/reports/finance-reports-csv.util.ts` | 1 / 1 | **REMOVE candidate — not removed** | zero runtime importers; live twin at `finance-report-export-worker.service.ts:28` lacks its `CSV_ROW_CAP` |
| `gl_*` tables (13, DB only) | 0 / 0 | **REPORT** | no schema declaration, no service, no immutability trigger; residue of a `drizzle-kit push` from another branch |
| `accounting/gl/recurring-journals.service.ts` | — | **NOT TOUCHED** | held by another agent |

---

## 6. Frontend — accounting states, gating, money

`check:query-scope`, `gated-reads`, `response-contracts`, `empty-states`, `named-handlers`,
`permission-binding`, `permission-catalog`, `contract-drift`, `file-sizes` all **exit 0**. Two
`permission-binding` divergences name files in scope (`hooks/api/accounting/expenses.ts:65,175` gate
`accounting:reimbursements:*` against a route declaring `hr:expenses:view`) and both are **registered
as accepted** at `scripts/check-permission-route-binding.mjs:245,254` — not drift.

Two gates are **weaker than they look** and should not be read as coverage:

* `check:empty-states` returns 0 over at least 7 hand-rolled empty states in scope, because
  `scripts/check-no-handrolled-empty-states.mjs:31-37` requires the layout classes on a **single
  line** plus a noun from a fixed allowlist.
* `check:formatters` returns 0 over `features/accounting/lib/format-currency.ts:1-9`, a third
  INR-hardcoded money formatter used at 15 sites, because the scanner looks for `Intl.NumberFormat`
  and this one uses `toLocaleString`.

### Fixed

**A failed reconciliation load rendered as success (P1).**
`features/accounting/banking/components/reconciliation-client.tsx` never read
`workspaceQuery.isError` or `accountsQuery.isError`. On a 500 the workspace was `undefined`,
`displayedTxns` fell back to `[]`, and the page rendered **"Every transaction is matched"** — an
accountant would conclude the account was fully reconciled when the API had failed. This is exactly
the *"schema drift renders as a broken empty state"* pattern in project memory. Added an
`ErrorState` branch ahead of the content, with `getErrorMessage` and a `handleRetry` refetching both
queries.

Also fixed under ticket 10 but landing in accounting: `features/accounting/sales/invoice-detail-view.tsx`
display-boundary conversions for the now-string line amounts.

### Open accounting-side defects — reported, not fixed

| Sev | File:line | Defect |
|---|---|---|
| P1 | `features/accounting/core/opening-balances-editor.tsx:265-273` | **"Post opening balances"** is ungated (`accounting:journal:create`); the route page has no gate either |
| P1 | `features/accounting/purchases/bill-form-schemas.ts:68-95` | client `computeTotals()` mirrors `accounting-payables.service.ts:90-113` in floats; `round2(1.005)`=1.00 vs backend 1.01, and CGST/SGST split by `round2(pool/2)` vs `allocateDecimal` at scale 4. The totals panel disagrees with the saved bill |
| P1 | `features/accounting/banking/components/banking-hub-client.tsx:125-128` | "Total Cash Balance" float-sums **mixed currencies** over one cursor page, with no pagination control |
| P1 | `vendor-credits-page.tsx:88,93,320,380`; `recurring-bills-page.tsx:98,99,108,259,296`; `recurring-invoices-page.tsx:142,179`; `recurring-journals-tab.tsx:89,93,98,231,241`; `bank-import-client.tsx:399-406`; `forecast-page.tsx:265` | mutating controls ungated (`accounting:vendor-credits:*`, `accounting:recurring:manage`, `accounting:banking:import`, `accounting:forecast:manage`) — every key verified present in both catalogs |
| P1 | `hooks/api/accounting/banking.ts:38,39,52` | wire-shape drift: `matchType`, `matchedRecordId`, `confirmedBy` are declared and **never returned** — the columns are `matchedJournalEntryId` and `confirmedByMembershipId` (`db/schema/accounting/finance-banking.ts:57-71,81-93`). Both repos typecheck clean; any panel rendering match provenance shows blank |
| P2 | `features/accounting/core/new-journal-entry-page.tsx:227` | balance guard is `Math.abs(debit-credit) < 0.005` on a scale-4 ledger while the backend compares exactly (`money.util.ts:188`) — an entry off by 0.004 shows "Balanced ✓", enables Post, and is rejected by the server; totals `.toFixed(2)` hide the cause |
| P2 | `features/accounting/shared/money.tsx:22` | `Money` defaults `currency = "INR"`; **80 of 93 call sites in scope pass no currency**, and `useOrgDisplay()` is consumed at only 3 |
| P2 | `bank-import-client.tsx:73` | zero of loading / empty / error; a failed account load leaves the selector silently empty |
| P2 | `core/period-close-page.tsx`; `purchases/vendor-credits-page.tsx:140-147` | no error branch (`checklistQuery`; `CreditDetailSheet` shows a bare `Loading…` and a blank body on failure) |
| P2 | `bill-new-form-body.tsx:121-147`; `new-journal-entry-page.tsx:349,350,358`; `balance-sheet-page.tsx:90,100,107`; `aged-payables-page.tsx:21`; `aged-receivables-page.tsx:21` | money rendered with **no currency symbol at all** |
| P3 | `types/accounting/ar.ts:105,113` | `orgId: number` / `createdBy: number \| null` where the backend sends `text` (`finance-ar-ap.ts:137,147`); `archivedAt`/`updatedAt` omitted. Read through a raw cast, so nothing catches it |
| P3 | `hooks/api/accounting/banking.ts:34,64` | `description` and `ledgerBalance` declared non-null; both are nullable at the source (`computeLedgerBalance` returns `string \| null`) |
| P3 | — | 45 in-scope files exceed the 300-line §7 target; `check:over-300` is **exit 1** repo-wide at 517 vs baseline 516. **None exceeds the 500-line hard threshold.** The gate does not name the new file |

---

## 7. Cross-territory findings (report only)

1. **`finance/expenses/` and `finance/ar/` write another module's tables directly**, against
   CLAUDE.md §1 ("cross-module access goes through the other module's service"):
   `finance/expenses/receipts.service.ts:72`, `finance/expenses/reimbursements.service.ts:117,263`
   UPDATE `expenses`; `finance/ar/{collections,credit-notes}` UPDATE `invoices`;
   `inventory/sales-orders/so-lifecycle.service.ts:161` INSERTs `invoices`. Coupling defect, not dead
   code. The first three are in my folders but the fix is an interface change across module
   boundaries — **P2, needs an owner.**
2. **`check:spec-typecheck` is red** on `src/test/narrowed-type-assertions.spec.ts:249,265` — a
   support-ticket status union, not mine.
3. **`check:replay-ledger`** cannot pass against `scratch_perf_seed` (no `__replay` ledger); it needs
   a purpose-built cold-replay database. Infrastructure.
4. **Frontend catalog drift:** `accounting:access:view` / `accounting:access:manage` exist only in
   the frontend catalog (`lib/rbac/permissions/permission-key-extended.ts:142-143`), so
   `app/(authenticated)/accounting/access/page.tsx` and its nav entry are permanently denied to
   everyone but the org owner. **P1.**
5. **`invoice_items` declared-vs-live drift** (§3) — a schema-declaration change, migration-wave
   territory. **P2.**
6. **`knip` cannot report dead code as configured** — specs are entry points and the jest plugin
   re-adds them; a control run with `"jest": false` moved unused files from 0 → 48. **P2, tooling.**

---

## 8. What I could not do

* **`invoice_items` holds 0 rows in the seed**, so the read I added to `getInvoice` could not be
  cost-measured — a plan over an empty relation is not representative. The supporting index
  (`idx_invoice_items_invoice`) exists and the predicate matches it. Re-measure once the seeder
  writes line items. The emptiness also means nothing on this database would ever have surfaced the
  empty-invoice-PDF defect.
* **`check:tenant-isolation:run`** — **not run** (mutex budget). The static half is exit 0.
* **`next build`** — **not run.** `type-check` exit 0 for both repos is the proof offered.
* **Invoice total arithmetic** — deliberately left as one coherent open unit (§2).
* **No git command was run.** All changes are uncommitted in the shared tree; the orchestrator
  commits. My frontend `hooks/api` changes are exactly `invoice-schema.ts` and `invoice.ts` — the
  `hooks/api/module-access/**`, `principal-groups*` and `user-api-tokens-schema.ts` changes visible
  in `git status` are **another agent's** uncommitted work and must not be swept into a commit of
  mine.
