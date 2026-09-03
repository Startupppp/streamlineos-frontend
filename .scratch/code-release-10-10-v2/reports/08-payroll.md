# 08 — Payroll

**Branch:** `release/code-10-10-v2` (backend). **Date:** 2026-09-03.
**Measured against:** `scratch_t08v2` (fresh `TEMPLATE scratch_gates_cold`, journal head, empty),
plus read-only counts from `scratch_gates_head` (seeded, 8 orgs). Both local, non-Neon.

---

## The four PRD findings — verdicts first

### 1. `payroll_bank_batch_items` has no natural key → double payment — **RE-VERIFIED TRUE, FIXED**

Confirmed against `pg_catalog` at head, not against the schema file:

```
uniq_payroll_bank_batch_items_org_id   UNIQUE (org_id, id)     <- tenant-FK helper, not a key
payroll_bank_batch_items_pkey          PRIMARY KEY (id)
idx_..._batch_status, idx_..._org_worker                        <- plain indexes
```

Nothing enforced `(batch_id, run_employee_id)`. `grep -rn UNIQUE migrations/*.sql | grep bank_batch_item`
returns **nothing** — no migration has ever created one.

The exposure is **wider than the PRD recorded it.** The service-side guard in
`batch-creator.service.ts` excluded a payee only when an earlier item had already reached
status **`PAID`**. `PENDING` and `SENT` were not excluded — and `SENT` is exactly the window in
which a payment instruction has gone to the bank, is irreversible, and is not yet confirmed.
So a second `POST` for the same run (no `Idempotency-Key` required — it is an optional argument)
produced a second batch containing the same payees with the same amounts, both live at the bank.

**Fixed** — migration `1049_t08_payroll_bank_batch_item_natural_key.sql`, two indexes because the
two shapes are different rules:

| index | rule |
|---|---|
| `uniq_payroll_bank_batch_items_batch_subject` `(org_id, batch_id, run_employee_id)` | a payee appears at most once in one bank file |
| `uniq_payroll_bank_batch_items_live_subject` `(org_id, run_employee_id) WHERE status <> 'FAILED'` | a payee has at most one **live** instruction across every batch of the run |

`FAILED` is excluded on purpose so a returned payment stays re-issuable. `PENDING`, `SENT`, `PAID`
and `HELD` are all live. `run_employee_id` is the PK of `payroll_run_employees`, so the pair is
already per-(run, payee) — that is what makes two columns sufficient.

Service side, `batch-creator.service.ts` now excludes payees with any **non-FAILED** item
(`ne(status, "FAILED")`, was `eq(status, "PAID")`), and converts a violation of either index into
a **409** naming the cause instead of a 500.

Bite-proved on `scratch_t08v2` (FK triggers off via `session_replication_role = replica`; unique
indexes are not triggers and still fire):

```
BITE 1  same payee twice in the SAME batch
  ERROR: duplicate key ... "uniq_payroll_bank_batch_items_batch_subject"
BITE 2  same payee in a SECOND batch while the first is SENT
  ERROR: duplicate key ... "uniq_payroll_bank_batch_items_live_subject"
ALLOWED re-issue after a FAILED return  -> INSERT 0 1, 2 rows for the payee
```

Zero pre-existing violations on the seeded head (`bbi_rows 0`, `bbi_dup_in_batch 0`,
`bbi_dup_live 0`), so both indexes were created without `IF NOT EXISTS` — a duplicate here is money
that may have left the account twice and must be reconciled by a human, never deduplicated by a
migration.

---

### 2. The TDS ledger REPLACES where it should ACCUMULATE — **RE-VERIFIED TRUE, FIXED**

The bulk rewrite (48a44741) **did preserve replace-vs-accumulate semantics** — the `targetWhere`
work was correct and both partial arbiters resolve. The defect is one level down and survived it:
**the natural key had no `run_id`.**

```
uniq_payroll_tds_ytd_user_period (org_id, user_id, fiscal_year, period_key) WHERE user_id IS NOT NULL
```

`period_key` is `payroll_runs.month`. `uniq_payroll_runs_org_month_type_entity` deliberately allows
a `BONUS` / `OFF_CYCLE` / `CORRECTION` / `FINAL_SETTLEMENT` run in the **same month** as the
`REGULAR` one. Locking the second run therefore hit the first run's row and
`DO UPDATE SET tds_paise = excluded.tds_paise` **overwrote** the tax already withheld.

Migration `1030` (ticket 24's central artifact) **records this exact defect in its own header** and
mitigated only the narrow half: `guard_paid_payroll_tds_ytd_row` raises 23514 when the overwrite
lands on a row whose run already reached `PAID`/`PAYSLIPS_PUBLISHED`/`CLOSED`. It does **not** fire
while the first run is merely `LOCKED` — the ordinary case, since an off-cycle run is normally
locked alongside the regular one long before either is paid. 1030 named the real fix
("needs `run_id` in the ledger's natural key, which is a schema declaration change") and deferred it
to ticket 24 as a follow-up. That follow-up was never done.

Measured, same figures both sides:

```
OLD key (org,user,fy,month)             ytd_tds =  300   rows = 1   <- regular run's 1000 destroyed
NEW key (org,user,fy,month,run_id)      ytd_tds = 1300   rows = 2
   re-lock of run 100 stays idempotent (still 2 rows, 1300)
```

A 77% under-report of withholding for that employee, for that fiscal year.

**Fixed** — migration `1050_t08_payroll_tds_ytd_run_in_natural_key.sql`: `run_id` joins both partial
unique indexes and becomes `NOT NULL` (a nullable column in a unique key is not a key). Widening a
unique key can never fail on existing data, so no backfill and no deduplication is involved.
`locking.service.ts` adds `payrollTdsYtdLedger.runId` to both `target` arrays and drops
`runId: sql\`excluded.run_id\`` from both `set` clauses — the key can no longer move. A fiscal year's
withholding is now the **SUM** over its rows, which is what a year-to-date ledger means.

Two side effects worth recording. (a) The cross-arbiter hazard is gone by construction: a
`byUser` row carries a non-null `worker_id`, so **both** partial indexes governed it while only the
user arbiter was named — a subject that changed facet mid-month raised an unhandled 23505 and 500'd
the lock. With `run_id` in the key, only one row per (org, fy, period, run) can carry a given
`worker_id`, so the collision is unreachable. (b) `guard_paid_payroll_tds_ytd_row` no longer has a
legitimate write to refuse; it is now purely a backstop.

**Still open, reported not fixed:** the ledger has **zero readers**. `grep -rn payrollTdsYtdLedger
src/` outside `locking.service.ts` finds only the schema file and two specs. Nothing in Form 16,
filings or the tax surfaces consults it — the YTD ledger is write-only today. Correct data that
nobody reads is still a gap; it belongs to whoever owns Form 16 / filings.

---

### 3. A run with FAILED bank items is still marked PAID — **RE-VERIFIED TRUE, FIXED**

`checkRunCompletion` (`payout/lib/payout-run-completion.ts`) treated `PAID`, `FAILED` **and**
`HELD` alike as terminal and asked only "is any item still non-terminal?":

```ts
not(eq(status,"PAID")), not(eq(status,"FAILED")), not(eq(status,"HELD"))
...
if (pendingItems.length > 0) return;
// falls through -> run.status = "PAID"
```

A run in which **every** item FAILED reached `pendingItems.length === 0` and was marked `PAID`, with
`payroll_run_events.metadata.paidCount = 0`. Worse, the same transaction emits
`PAYROLL_RUN_PAYOUT_POSTING_INTENT_EVENT` carrying `net: currentRun.netTotal` — the **full run net**,
not the amount actually paid — so a run where nobody was paid posted the entire payroll to
Accounting. `markItemFailed` calls `checkRunCompletion` directly, so the path fires on the ordinary
bank-return flow.

**Fixed** — the predicate is now per-payee coverage, in one aggregate:

```sql
count(distinct run_employee_id)                                      AS subjects,
count(distinct run_employee_id) filter (where status = 'PAID')       AS paidSubjects
```

The run is marked PAID only when `subjects > 0 && paidSubjects === subjects`. This kills the
all-failed path **and** keeps the retry path correct: a payee with a FAILED item in batch 1 and a
PAID item in batch 2 counts as paid, which a naive `failed === 0` rule would have broken forever.

Four regression tests added, and **bite-proved**: reverting the predicate to `if (subjects === 0)
return;` fails exactly 3 of them (`BITE_EXIT=1`), then passes again once restored.

`refreshBatchPaidStatus` itself was already correct on the batch row (`PAID` only when nothing is
FAILED and nothing is outstanding) — the defect was in the **run**-level decision beside it.

---

### 4. `writeTdsYtdLedger` / `importBankReturn` / `refreshBatchPaidStatus` untested — **PARTLY RESOLVED, REST FIXED**

| function | state on arrival | now |
|---|---|---|
| `writeTdsYtdLedger` | **already tested** — `locking-tds-ledger-bulk.spec.ts`, 5 cases, landed with 48a44741; explicitly asserts both partial arbiters | unchanged, still green |
| `checkRunCompletion` | tested — `payout-run-completion.spec.ts`, 6 cases, **none of them covering a FAILED item**, which is exactly why finding 3 survived a green spec | +4 cases, bite-proved |
| `refreshBatchPaidStatus` | **no test anywhere** | 4 cases |
| `importBankReturn` | **no test anywhere** | 5 cases |

New file: `src/modules/payroll/payout/__tests__/bank-return-and-batch-status.spec.ts`.
The `importBankReturn` cases stub `markItemPaid`/`markItemFailed` (the money-moving calls) and
assert **which item id** each was asked to act on — including that a replayed return file is a
no-op, that a line naming a payee outside the batch is reported rather than applied to someone
else, and that a `userId` line lands on that payee's non-terminal item rather than their settled one.

The PRD's warning holds and is worth repeating: ts-jest runs `isolatedModules`, so a green spec
enforces no signature. Six green cases sat over the finding-3 defect for the whole release.

---

## New P0 found here, not in the PRD: payroll generation 42P10s for every worker-only payee

`run-result-persister.service.ts:140` upserted the `workerOnlyRows` batch with

```ts
target: [payrollRunEmployees.runId, payrollRunEmployees.workerId],   // no targetWhere
```

but `uniq_payroll_run_employees_run_worker` is **PARTIAL** (`WHERE worker_id IS NOT NULL`,
migration `0392`). Proved on `scratch_t08v2`:

```
ON CONFLICT (run_id, worker_id) DO UPDATE
  ERROR:  there is no unique or exclusion constraint matching the ON CONFLICT specification   [42P10]
ON CONFLICT (run_id, worker_id) WHERE worker_id IS NOT NULL DO UPDATE
  Conflict Arbiter Indexes: uniq_payroll_run_employees_run_worker
```

`workerOnlyRows` is `profile.userId === null && profile.workerId !== null` — the `workers` facet
with `is_payee` and no login, which `backend/CLAUDE.md` §1 states explicitly exists. **Generating a
payroll run containing any such payee aborted the whole generation.** Same defect class the brief
records as having just broken chat. One-line fix: `targetWhere: sql\`worker_id is not null\``.

**The form used is `onConflictDoUpdate` + `targetWhere`, which is the correct pair.** Per the
coordinator's correction, drizzle-orm 0.45.2 accepts `targetWhere` on `onConflictDoUpdate` only —
`onConflictDoNothing` takes `{ target, where }` and silently drops a `targetWhere` key, re-emitting
the identical broken SQL. Audited: all three `targetWhere` uses in payroll source
(`run-result-persister.service.ts:142`, `locking.service.ts:292` and `:312`) sit on
`onConflictDoUpdate`. Payroll's four `onConflictDoNothing` sites pass **no** `targetWhere` — two are
bare (`payroll-calendar-reminder.scheduler.ts:63`, `run-result-persister.service.ts:350`, no target
so no arbiter is inferred) and two name non-partial indexes
(`uniq_salary_components_org_code`, `uniq_payroll_run_export_jobs_org_idempotency`).

`pnpm check:conflict-targets` — **exit 0**, and **zero payroll findings**: the AST resolver no longer
reports `run-result-persister.service.ts:138`, and the two ratcheted defects it does report belong to
billing (`versioned-catalog.service.ts:182`) and hr (`rosters.service.ts:41`).

Note for finding 1: the new `uniq_payroll_bank_batch_items_live_subject` **is partial**, which is
exactly the shape that creates this trap. Verified there is **no** `onConflict*` anywhere against
`payrollBankBatchItems` — `batch-creator.service.ts` uses a plain multi-row insert and converts a
violation through `isUniqueViolationOn`, so no arbiter is inferred and no predicate is owed. Any
future upsert against that table must carry `WHERE status <> 'FAILED'`, and
`check:conflict-targets` will now fail if it does not.

Full audit of every `onConflict*` in `src/modules/payroll/**` against the catalog: 8 sites, and this
was the only mismatch. The partial unique indexes on payroll tables are
`payroll_run_employees.run_worker`, both `payroll_tds_ytd_ledger` period indexes (correct
`targetWhere` since 48a44741), `payroll_bank_batches.org_idempotency_key` and both
`payroll_accounting_mappings` indexes — the last three are reached through `isUniqueViolation`
catches, not `onConflict`, so no arbiter is inferred.

---

## The batch-creation route is not `@Idempotent` — reported, now backstopped

`POST /payroll/runs/:runId/payout/batches` (`payout-batches.controller.ts:69`) — the one route that
mints payment instructions — carries **no `@Idempotent`**. It reads an *optional*
`@Headers("idempotency-key")` and threads it into `payroll_bank_batches.idempotency_key` as a
per-currency sub-key. Omit the header and every retry, double-click or client timeout minted a fresh
batch over the same payees.

`check:idempotent-commands` exits 0 but does **not** cover this route: its own output says
`Handlers in scope 11` for the whole repository, and neither `createBatch` nor any other payout
handler is among them. A green gate here is not evidence about this route — this is the
"gates report green over unread code" shape, and it is why the PRD finding survived the gate.

I did not add `@Idempotent` (it changes the route contract and belongs with ticket 04's API work),
but the exposure is no longer a double payment: after `1049`, a second batch over the same payees
hits `uniq_payroll_bank_batch_items_live_subject` and the service converts it to a **409**. The
database is now the backstop the header was not. Adding `@Idempotent` remains the right follow-up.

## Money units (PRD-C050) — clean

- **Zero** `double precision` / `real` columns across every `payroll_*`, `payslip_*`, `salary_*`,
  `employee_salary_*` table (`pg_attribute` scan). Money is `numeric(15,2)`, which the driver hands
  back as a **string**, and integer `*_paise` columns.
- The calculation engine works end to end in integer paise (`runs/lib/money.ts`:
  `toPaise`/`fromPaise`/`applyRounding`/`pctOf`, all `Math.round`).
- Floats appear only where the quantity really is fractional — slab/surcharge/cess rates, an
  overtime multiplier, an FX rate, a percent-of-basic — and every one is rounded back to integer
  paise at the boundary before it becomes money (`calculation-engine.ts:350`
  `Math.round(annualTaxRupees * 100)`). No float survives into a stored amount.
- `setup/lib/template-preview.ts` computes in floats, but it is a **preview** surface that persists
  nothing. Noted, not a defect.
- `decimal(15,2)` maxes at 1e15 paise, inside `Number.MAX_SAFE_INTEGER` (9.007e15), so the paise
  integers cannot lose precision at the declared ceiling.

## Immutability where financial (PRD-C120) — enforced in the database

Eight `BEFORE UPDATE OR DELETE` row triggers verified present in `pg_trigger`, not assumed from
migration text: `payroll_run_employees`, `payroll_line_items` (0445), `payroll_journal_batches`,
`payroll_journal_batch_lines`, `payroll_bank_batches`, `payroll_bank_batch_items`,
`payroll_filings` (1001), `payroll_tds_ytd_ledger` (1030). All three migrations are journalled
(idx 201 / 778 / 790). RLS is on for 30 of 31 `payroll_*`/`payslip_*` tables; the one exception is
`payroll_scheduler_state`, a global job-lease table with no tenant column — correct.

## Drizzle error wrapping — already clean in payroll

`grep` for `.code ===` across `src/modules/payroll/**` returns **zero** hits outside test fixtures.
Every unique-violation catch (6 sites: `command-receipts`, `accounting-mappings` ×2, `payroll-jobs`,
`profiles` ×3, `batch-creator`, `entities`) goes through `common/db/postgres-error.ts`, which walks
the bounded `cause` chain. No dead `23505` check exists in this territory.

---

---

## PRD-C122 frontend — audited, NOT fixed

The payout/bank-return UI exists and is complete (batch list, generate, mark sent/paid, per-item
mark paid/failed, import-return CSV, pre-flight validation, `PARTIALLY_PAID` rendered). Every
financial action is permission-gated twice — `useCan` in the component and `useAuthorizedMutation`
before the request — on `payroll:runs:manage` / `payroll:bank:manage` / `payroll:payslips:manage` /
`payroll:runs:approve`, matching the backend decorators exactly. `Idempotency-Key` is minted
explicitly for batch generation (`batches-table.tsx:66`) and `lib/api-client.ts:185` auto-sets one
for every other mutation, so no payroll route can 400 for a missing key. Downloads go through an
authenticated blob fetch, not a raw storage URL. None of that needed changing.

Four things did, and none is fixed here:

**(a) Money is computed in JavaScript on 13 rendered surfaces.** Amounts arrive as decimal strings
and are `parseFloat`ed into doubles and summed, rather than rendering a server total. The sharpest:
`reports/report-journal.tsx:104-113` reduces `Number(l.debit)` / `Number(l.credit)` over the row set
and then **adjudicates whether the journal balances** with a hard-coded `Math.abs(d - c) < 0.01`
epsilon — the frontend is issuing the reconciliation verdict. Others:
`salary-structure-template-sheet.tsx:57-70` and `salary-structures-page.tsx:38-47` (a whole CTC
preview: HRA, gross, PF, estimated net, all client-side), `employee-detail-page.tsx:283-302`
(estimated net), `runs/variance-tab.tsx:53-58`, `runs/breakdown-sheet.tsx:234-245` (a client total
rendered directly above the server's own `snapshot.totals`, two sources of truth adjacent),
`loans/loan-table-columns.tsx:10-18` (outstanding loan balance derived, not fetched),
`ess/components/ess-payslips-section.tsx:234` (the legal **amount-in-words** on an employee payslip,
`Math.round(parseFloat(net))` client-side), and five report footers that sum a paginated row set.
Not fixed: every one needs the server to supply the total first, and the read hooks live in
`hooks/api/**`, which is ticket 19's. `report-journal` is the one I would fix first — the backend
`usePayrollJournal` response returns `lines` and `unmappedCodes` and no totals, so closing it is a
backend + hook + component change spanning an excluded territory.

**(b) Payout-batch 409s are not distinguished.** `features/payroll/shared/run-conflict.ts` handles
run-lifecycle 409s well — it detects `error.status === 409`, invalidates 7 surfaces and toasts
"This run changed since you opened it". Nothing equivalent exists for the batch mutations: my new
409 (`"A payout instruction already exists for one of these payees on this run"`) will render as an
anonymous red toast at `generate-payout-dialog.tsx:83` with no refresh, as will "Item already marked
paid" at `mark-batch-dialogs.tsx:104` and `batch-item-actions.tsx:57,68`. The fix is to route those
catch blocks through the existing `isRunConflict` helper. **This is the one follow-up I would rank
above the others** — it is the user-facing half of the double-payment fix.

**(c) Two invalidation misses after a money mutation.** Marking a batch paid flips the run to `PAID`
server-side but invalidates only `bankBatch`, `bankBatches` and `run(runId)` — **not** the run LIST
or the command center, so `/payroll/runs` keeps showing `LOCKED` for up to the 60s staleTime.
Locking a run invalidates 7 run surfaces but not the batch list or bank validation. Also latent:
`bankBatches(runId)` and `bankBatch(batchId)` produce the **same key shape**
(`lib/query-keys/payroll.ts:31-36`), so run 7's batch list and batch 7's detail collide — which
currently masks some of these misses by over-invalidating. All of it is `hooks/api/payroll/**` and
`lib/query-keys/**`, both outside my territory. **Routed to ticket 19.**

**(d) The bank-batch file URL is opened unverified.** `useBatchFileUrl` GETs
`/payroll/payout/batches/:id/file`, and `batches-table.tsx:84` does `window.open(url)`. The UI tells
the user it is a short-lived signed link (`generate-payout-dialog.tsx:136`) but the frontend cannot
check that, and the payload behind it is full bank account data. Whether that claim is true is a
backend storage question. Every other payroll download (payslips, filings, reports, FNF, tax) uses
the authenticated `apiClient.download` blob path and is fine.

Also noted, not a defect I can settle: `payroll:runs:manage` is one undifferentiated key covering
lock, reopen, close, generate and recalculate — there is no way to grant "can lock" without also
granting "can reopen a locked run", though reopen is the reversal path for a financial record. Its
registry description (`lib/rbac/permissions/payroll.ts:32`) says "Lock, reopen, and mark paid", but
mark-paid actually lives under `payroll:bank:manage` — the description is stale. That is a product
decision, not a bug.

## Commands run

| command | exit | result |
|---|---|---|
| `jest --runInBand --testPathPattern="modules/payroll"` | **0** | 124 suites, **967 tests**, all pass |
| `jest --testPathPattern="payout-run-completion\|bank-return-and-batch-status\|locking-tds-ledger-bulk"` | **0** | 3 suites, 24 tests |
| same, with the finding-3 predicate reverted (bite check) | **1** | 3 failed / 7 passed — the new tests bite |
| `pnpm typecheck` | **2** | 4 errors, **all** in `src/scripts/check-referential-action-drift.ts`, an **untracked** file from another territory. Zero payroll errors. |
| `pnpm check:spec-typecheck` | **0** | spec-inclusive typecheck passed |
| `check:migration-chain` | 0 | no issues |
| `check:migration-ledger` | 0 | no orphan / duplicate / unreachable entries |
| `check:migration-discipline` | 0 | journal monotonicity + duplicate idx + prefixes |
| `check:conflict-targets` | **0** | 0 payroll findings; 2 ratcheted defects, both other territories |
| `check:declaration-constraint-drift` | **0** | after applying 1049/1050 to `scratch_gates_cold`; 0 new integrity findings, no payroll findings. Was exit 1 naming exactly my two indexes — the gate caught my in-flight drift correctly, which is the gate working. |
| `check:idempotent-commands` | 0 | every in-scope mutating handler carries `@Idempotent` |
| `check:record-access` | 0 | every record read excludes soft-deleted rows |
| `check:tenant-isolation` | 0 | existence only, not execution |
| `check:scope-application` | 0 | 150 resolutions / 150 applied |
| `check:cache-invalidation` | 0 | LOW-only |
| `check:n1-growing-loops` | 0 | 97 sites vs ratchet 102 |
| `check:query-projections` | 0 | 0 in scope |
| `check:unbounded-reads` | 0 | 3 remaining, none payroll |
| `check:restrict-fks` | 0 | 346 schema files |

Migrations applied and verified against `pg_catalog` on `scratch_t08v2`, `scratch_gates_cold` and
`scratch_gates_head` — all four applications exit 0, both new bank-batch indexes and both rebuilt
TDS indexes present with the expected predicates, `run_id attnotnull = t`.

## Files changed (backend)

```
migrations/1049_t08_payroll_bank_batch_item_natural_key.sql        (new)
migrations/1050_t08_payroll_tds_ytd_run_in_natural_key.sql         (new)
migrations/meta/_journal.json                                      (+2 entries, idx 805/806, additive only)
src/db/schema/payroll/payout.ts
src/db/schema/payroll/entities-periods.ts
src/modules/payroll/payout/batch-creator.service.ts
src/modules/payroll/payout/locking.service.ts
src/modules/payroll/payout/lib/payout-run-completion.ts
src/modules/payroll/runs/run-result-persister.service.ts
src/modules/payroll/payout/lib/__tests__/payout-run-completion.spec.ts
src/modules/payroll/payout/__tests__/bank-return-and-batch-status.spec.ts   (new)
```

## Honest gaps

- `pnpm typecheck` is **red at exit 2**, not green — but all 4 errors are in another territory's
  untracked file. Reported, not fixed.
- `check:tenant-isolation` proves a test **exists**, not that it passes. `check:tenant-isolation:run`
  was **not run**.
- Seeded e2e (`payroll-db-integration.e2e-spec.ts`, `payroll-runs.controller.e2e-spec.ts`) was
  **not run** — `*e2e-spec` needs `pnpm test:e2e` against a seeded database.
- The TDS YTD ledger still has **no reader**. Fixed data, unfixed consumer.
- No benchmark was taken. The two new indexes are additive write-side constraints on tables that are
  empty in the seed; there was nothing to measure in BUFFERS.
