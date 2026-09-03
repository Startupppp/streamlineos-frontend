# 08 — Payroll — current-head audit

**Branch:** `release/code-10-10-v2` both repos.
**Backend head:** `2f37e1bb0`. **Frontend head:** `7469d2789`. **Date:** 2026-09-03.
**Databases used:** `scratch_head_1010` (local, owner URL, 677/677 journal head, 944 tables,
structure-only — every payroll table has 0 rows).
**Prior report:** `reports/08-payroll.md`. Every claim in it was re-verified at head; results below.
**Files written by this audit:** this one only. No source file was edited.

---

## 1. What I read (with numbers)

### Backend — `src/modules/payroll/**`

| dimension | count |
|---|---|
| TypeScript files | **313** (186 non-test, 127 test) |
| non-test LOC | **32,440** |
| controllers | **38** |
| services | **66** |
| HTTP routes | **181** — 90 `@Get`, 63 `@Post`, 22 `@Patch`, 6 `@Delete` |
| schema files (`src/db/schema/payroll/`) | **18** |
| jest suites / tests | **124 / 967**, exit 0 (re-run at head, 12.2 s) |

### Database — measured against `pg_catalog`, not against the schema files

| dimension | measured |
|---|---|
| payroll tables (`payroll_*`, `payslip_*`, `salary_*`, `employee_salary_*`) | **36** |
| RLS enabled **and** carrying a policy | **35 / 36** (`payroll_scheduler_state` excepted — global job lease, no `org_id`; correct) |
| RLS policy shape | `org_id = app.current_org_id()` on all 35 |
| immutability triggers (`BEFORE UPDATE OR DELETE`) | **8**, all present in `pg_trigger` |
| composite (multi-column) tenant FKs on payroll tables | **62** |
| `onConflict*` sites audited against the live catalog | **10** (prior report audited 8) |
| unique indexes on `payroll_bank_batch_items` / `payroll_tds_ytd_ledger` | verified present with the expected predicates |

### Frontend

| dimension | count |
|---|---|
| `features/payroll/**` | **160** files, **25,249** LOC |
| `hooks/api/payroll/**` | **35** files, **3,572** LOC |
| app routes under `app/(authenticated)/payroll/` | **23** `page.tsx` |
| `useAuthorizedMutation` call sites | **112** |
| raw `useMutation(` call sites in payroll | **0** |
| `useQuery` / `useCan` in `hooks/api/payroll` | **69 / 69** |

### Gates run (all cheap, all at head)

| gate | exit | corpus it actually read |
|---|---|---|
| `check:unbounded-reads` | 0 | 381 files classified; 3 actionable unbounded reads repo-wide, none payroll |
| `check:query-projections` | 0 | 3,650 source files; 1,378 unprojected reads vs ceiling 1,383 |
| `check:n1-growing-loops` | 0 | 2,161 service files, 5,103 loop nodes; 97 growing sites vs ratchet 102; **0 in payroll** |
| `check:conflict-targets` | 0 | 362 `onConflict` calls, 159 with an explicit target, 13 targeting a partial index; **0 payroll findings** |
| `jest --testPathPattern="modules/payroll"` | 0 | 124 suites / 967 tests |

---

## 2. Prior-report claims — re-verified at head

| prior claim | status at head | evidence |
|---|---|---|
| 1049 bank-batch natural key landed | **HOLDS** | `uniq_payroll_bank_batch_items_batch_subject (org_id,batch_id,run_employee_id)` and `uniq_..._live_subject (org_id,run_employee_id) WHERE status <> 'FAILED'` both present in `pg_indexes` on `scratch_head_1010`; journal entries at `_journal.json:4713`/`:4720` |
| 1050 TDS `run_id` in natural key | **HOLDS** | `uniq_payroll_tds_ytd_user_period (org_id,user_id,fiscal_year,period_key,run_id) WHERE user_id IS NOT NULL` + worker twin, both in the live catalog; `locking.service.ts:290,310` carry `runId` in `target`, and neither `set` clause writes `runId` |
| `batch-creator` excludes non-FAILED payees, converts to 409 | **HOLDS** | `batch-creator.service.ts:107` `ne(status,"FAILED")`, `:287` `ConflictException` |
| `checkRunCompletion` all-FAILED path fixed | **HOLDS for the all-FAILED case** | `payout-run-completion.ts:125-138` per-subject coverage aggregate. **But see F2 — the partial-coverage case is still open.** |
| `run-result-persister` 42P10 `targetWhere` fix | **HOLDS** | `:142` `targetWhere: sql\`worker_id is not null\`` on `onConflictDoUpdate`; `uniq_payroll_run_employees_run_worker` confirmed partial in the catalog |
| 8 immutability triggers present | **HOLDS** | listed from `pg_trigger`; `guard_locked_payroll_run_employee` freezes the financial columns and permits status transitions — correct |
| 0 float money columns | **HOLDS** | money is `numeric(15,2)` (driver returns a string) and integer `*_paise` |
| batch route not `@Idempotent` | **HOLDS — still absent** | `payout-batches.controller.ts:69-80`. Only 1 of the 7 payout mutating routes has one (`:150` `importReturn`) |
| TDS YTD ledger has zero readers | **HOLDS** | `grep payrollTdsYtdLedger src/` → only `locking.service.ts`, the schema file and specs. Form 16 reads `filing.payload.rows` (`filings.service.ts:176-200`), a **period** summary, not a YTD figure — there is no competing YTD computation either |
| `bankBatches`/`bankBatch` key collision "latent" | **HOLDS but is NOT latent — see F4** | `lib/query-keys/payroll.ts:31-36`; both hooks co-mount at `bank-transfers-content.tsx:132,142` |
| invalidation misses after mark-batch-paid / lock | **HOLDS** | `payout-batches.ts:130-139`; `approvals.ts:80-91` |
| `window.open` on the bank-file URL | **HOLDS** | `batches-table.tsx:84` |
| 13 client-side money surfaces | **HOLDS** (files moved by `9150e7164`) | `report-journal.tsx:104-113`, `employee-detail-page.tsx:285-288`, `ess-payslips-section.tsx:234` |

### Two prior claims I found to be **wrong** at head

1. **"the backend `usePayrollJournal` response returns `lines` and `unmappedCodes` and no totals"** — false.
   `JournalResult` (`journal.service.ts:19-26`, populated at `:178-185`) returns `provisional`, `month`,
   `lines`, `unmappedCodes`, **`totalDebits`** and **`totalCredits`**. The frontend type
   `types/payroll/reports.ts:129-132` declares only `lines` and `unmappedCodes`, which is why the
   component recomputes. The fix is far smaller than the prior report assessed — see F10.

2. **"the UI tells the user it is a short-lived signed link … whether that claim is true is a backend
   storage question."** — answered: the claim is **true**. `payout-batches.service.ts:178` calls
   `storage.getFileUrl(orgId, key, 3600)` and `storage.service.ts:232` is AWS
   `getSignedUrl(client, GetObjectCommand, {expiresIn})`. It is a genuine presigned URL. The residual
   concern is the 3600 s window and `window.open`, not the signing — see F11.

---

## 3. Per-criterion assessment

### PRD-C120 — architecture/schema: normalized, tenant-safe, immutable where financial

**Status: MET.** Walked every dimension the criterion names.

- **Normalization.** 36 tables. Runs (`payroll_runs`), per-payee rows (`payroll_run_employees`),
  components (`salary_components`), assignments (`employee_salary_profiles`,
  `employee_salary_profile_components`), calculations (`payroll_line_items`,
  `payroll_run_allocations`), payslips (`payslip_publications`, `payslip_templates`), taxes
  (`payroll_tds_ytd_ledger`, `payroll_tax_windows`, `payroll_filings`), deductions
  (`salary_loans`, `payroll_loan_adjustments`), payment/reconciliation history
  (`payroll_bank_batches`, `payroll_bank_batch_items`, `payroll_journal_batches`,
  `payroll_journal_batch_lines`, `payroll_run_events`). No duplicated grain found.
- **Tenant safety.** RLS on 35/36 with the correct predicate, plus **62 composite tenant FKs**.
  I specifically checked the joins that omit `org_id` — `payroll-ai-explain.service.ts:82-83`,
  `journal.service.ts:70,75,87`, `run-data-loader.service.ts:199` — and every one is safe **by
  construction**, because `(org_id, run_id) → payroll_runs(org_id, id)` and
  `(org_id, run_employee_id) → payroll_run_employees(org_id, id)` make a cross-tenant row
  structurally unreachable. This is the strongest thing in the module; it is worth saying out loud
  that the schema, not the query text, is what makes those reads correct.
- **Immutability.** 8 `BEFORE UPDATE OR DELETE` triggers verified in `pg_trigger`.
  `guard_locked_payroll_run_employee` freezes `gross`/`net`/`total_deductions`/
  `employer_contributions`/day counts/snapshots/`run_id`/`org_id` while the run is locked and
  permits status transitions — exactly the right cut.
- **Money units.** Zero `double precision`/`real` columns. Integer paise end to end
  (`runs/lib/money.ts`). One wire-format exception at `journal.service.ts:14-15`, where
  `JournalLine.debit/credit` are JS `number` — see F10.
- **`ON CONFLICT` arbiters.** I audited **all 10** sites (prior report found 8) against the live
  catalog. The two extra are `inputs.service.ts:238` (`uniq_payroll_inputs_run_user`, not partial)
  and `payslip-bulk-publisher.service.ts:237` (`uniq_payslip_publications_run_employee`, not
  partial). Both resolve. `payroll_run_employees` has **two** unique indexes — `run_user`
  (not partial) and `run_worker` (partial) — and the code targets each correctly.

### PRD-C121 — bounded reads, indexed paths, no N+1, async exports, invalidation

**Status: PARTIALLY MET — and this is where I found the release's sharpest defect.**

- **Indexed paths — MET.** `EXPLAIN` on the journal read shows
  `Bitmap Index Scan on idx_payroll_line_items_org_run`. Employee/period/status paths are indexed.
- **No N+1 — MET.** `check:n1-growing-loops` parsed 2,161 service files / 5,103 loop nodes and
  reports **0 payroll sites** among the 97 remaining.
- **Async exports — MET, and genuinely good.** `payroll-export.service.ts` is org-scoped **and**
  requester-scoped (`find()` at `:213-231` filters on `requestedByMembershipId`, so no
  same-org cross-user leak), keyset-paginated (`gt(payrollRuns.id, afterId)`), idempotent on
  `(org_id, idempotency_key)` with a `requestHash` mismatch check, cancellable, retried under
  `maxAttempts`, expiring at 24 h, and the download streams with `Cache-Control: private, no-store`.
  `claim()` is a correct compare-and-swap. No CSV-injection surface (all columns are enums/numbers).
- **Bounded reads — NOT MET, and the gate cannot see it.** `check:unbounded-reads` passes because
  every payroll read *has* a `LIMIT`. But the module's own helper documents the distinction:
  `lib/query-bounds.ts:3-8` — *"The extra probe row makes an unexpectedly large set fail visibly
  instead of being silently truncated."* Measured at head:

  | | count |
  |---|---|
  | `.limit(...)` calls in `src/modules/payroll/**` (non-test) | 193 |
  | reads guarded by `requirePayrollReadWithinCap` | **9** |
  | hard-coded `.limit(500/1000/…)` reads with **no** overflow guard | **19** |

  Nineteen reads silently truncate. Three of them (`journal.service.ts:71,76,88`) and two more
  (`journal-outbox.service.ts:127,334`) sit directly on the accounting hand-off. See **F1** and **F3**.
  `run-data-loader.service.ts:133` truncates payroll generation itself — see **F5**.
- **Invalidation after lock/publish/reversal — server side, N/A; frontend, NOT MET.** Confirmed the
  prior report: `grep -rn "CacheService\|cachedVersioned\|invalidateNamespace" src/modules/payroll/`
  returns nothing, so there is no server cache to invalidate and the criterion resolves to the
  Query cache. On that side the defects are real and still open — **F4**, **F9**.

### PRD-C122 — run-state UI, conflict/retry/partial failure, permission gates, secure downloads, E2E

**Status: PARTIALLY MET.**

- **Permission gates — MET, and the gate is not inert.** `useAuthorizedMutation`
  (`hooks/api/authorized-mutation.ts:39-53`) resolves the access snapshot and **throws before
  calling `mutationFn`** if the permission is absent. 112 call sites, **0** raw `useMutation` in
  payroll. It correctly treats an unresolved snapshot as pending rather than denied. Backend
  decorators match: every payout mutation carries `@RequirePermission("payroll:bank:manage")`.
- **Secure downloads — MET with one exception.** Every payroll download except one uses the
  authenticated `apiClient.download` blob path. The exception is **F11**.
- **Run-state UI — MET.** `PARTIALLY_PAID` is rendered, batch lifecycle actions are status-gated.
- **Conflict/retry — PARTIAL.** Run-lifecycle 409s are handled well (`run-conflict.ts`, 6 call
  sites). Batch-mutation 409s are not — **F8**.
- **Partial failure — NOT MET on the surface that matters.** 11 payroll surfaces render a server
  error as an empty state — **F6**.
- **E2E — NOT MEASURED.** See §6.

---

## 4. Findings

| # | sev | file:line | summary |
|---|---|---|---|
| F1 | **P0** | `backend/src/modules/payroll/insights/journal.service.ts:71` | Journal truncates at 1000 line items; measured 13 lines/employee → breaks at **77 employees**. Debit side truncated, credit side complete → the journal can never balance → the ledger hand-off is permanently blocked, and a truncated batch is written into an immutable table automatically |
| F2 | **P0** | `backend/src/modules/payroll/payout/lib/payout-run-completion.ts:138` | Run marked PAID when every *batched* payee is paid, but `HELD` payees are excluded from batches; the posting intent then sends the **full run net** to accounting |
| F3 | **P1** | `backend/src/modules/payroll/insights/journal-outbox.service.ts:334` | `reverseBatch` reads the original's lines with `LIMIT 1000` and inserts the reversal directly at `status:"POSTED"`, bypassing the balance check, with header totals copied from the original |
| F4 | **P1** | `frontend/lib/query-keys/payroll.ts:31-36` | `bankBatches(runId)` and `bankBatch(batchId)` produce an identical query key; the two hooks co-mount, and the detail sheet throws a TypeError when the ids coincide |
| F5 | **P1** | `backend/src/modules/payroll/runs/run-data-loader.service.ts:133` | `loadEligibleProfiles` truncates at 1000 active salary profiles, unguarded and unordered — payees 1001+ silently never enter payroll |
| F6 | **P1** | `frontend/features/payroll/reports/report-summary.tsx:19` (+10 more) | A failed read renders as an empty state that tells the operator to run payroll |
| F7 | **P1** | `backend/src/modules/payroll/payout/payout-batches.controller.ts:69` | The one route that mints payment instructions carries no `@Idempotent`; 6 of the 7 payout mutating routes have none |
| F8 | P2 | `frontend/features/payroll/payout/bank-transfers/generate-payout-dialog.tsx` | Batch-mutation 409s are not routed through `isRunConflict` — anonymous toast, no refresh |
| F9 | P2 | `frontend/hooks/api/payroll/payout-batches.ts:130-139` | Mark-batch-paid flips the run to PAID server-side but never invalidates the runs list or command center (60 s staleTime); lock never invalidates the batch list or bank validation |
| F10 | P2 | `frontend/types/payroll/reports.ts:129-132` | The FE type drops `totalDebits`/`totalCredits`/`provisional` that the server sends, so the component recomputes in float and adjudicates "✓ Balanced" itself |
| F11 | P2 | `frontend/features/payroll/payout/bank-transfers/batches-table.tsx:84` | `window.open` of a 3600 s presigned URL to a CSV containing **unmasked** bank account numbers |
| F12 | P2 | `backend/src/modules/payroll/payout/locking.service.ts:282` | The TDS YTD ledger is correct and has zero readers |
| F13 | P2 | `backend/src/modules/payroll/payout/lib/payout-run-completion.ts:110,143` | Two `LIMIT PAYROLL_READ_CAP+1` reads with no `requirePayrollReadWithinCap` guard (bounded transitively today) |
| F14 | P2 | `backend/src/modules/payroll/insights/ess.controller.ts:25` | 2 of 38 payroll controllers carry no `@RequireModule("payroll")` and no `ModuleGuard` |
| F15 | P2 | `frontend/lib/rbac/permissions/payroll.ts:32` | Registry description claims `payroll:runs:manage` covers mark-paid; mark-paid actually requires `payroll:bank:manage` |

---

### F1 — P0 — the payroll journal truncates at 77 employees, and the truncated batch is written to an immutable table

`journal.service.ts:59-90` reads three sets in parallel; the first is the one that matters:

```ts
this.db.select({ runEmployeeId, componentId, code, category, name, amount })
  .from(payrollLineItems)
  .where(eq(payrollLineItems.runId, run.id))
  .limit(1000),                       // <- no guard, no ORDER BY
```

**The threshold, measured — not estimated.** The repo's own frozen calculation fixture
(`runs/lib/__tests__/fixtures/replay-expected.json`, the baseline `snapshot-replay.spec.ts:20`
guards) produces **13 line items for one employee**:

```
HRA, SPECIAL, BASIC, BONUS_1, REIMBURSEMENT_1, EPF_EMPLOYEE, EPF_EMPLOYER,
PROFESSIONAL_TAX, GRATUITY, LWF_EMPLOYEE, LWF_EMPLOYER, LOAN_EMI_9, TDS
```

`1000 / 13 = 76.9`. **A payroll run with 77 or more employees truncates.**

**Why the truncation is not merely lossy but guaranteed-unbalancing.** The debit side is built from
the truncated `lineItems` set. The credit side is not:

```ts
// journal.service.ts:162-169
const totalNetPaise = runEmployees.reduce((acc, emp) => acc + toPaise(emp.net), 0);
lines.push({ account: "Salaries Payable", credit: totalNetPaise / 100, ... });
```

`runEmployees` is a **different read with a different 1000 cap on a different table** — an employee
cap, not a line-item cap — so for any run between 77 and 1000 employees the credit side is
**complete** while the debit side is truncated. Arithmetic demonstrated on `scratch_head_1010`
(100 employees × 13 components):

```
raw_line_items=1300  read_after_LIMIT_1000=1000
debit_total=1000000  credit_total(full_set)=1300000  imbalance=300000
```

**Where the truncated figures land.** `journal-outbox.service.ts:157` calls the same `buildJournal`
and writes its output into `payroll_journal_batches` / `payroll_journal_batch_lines` — tables guarded
by `trg_guard_posted_payroll_journal_batch_line`, i.e. **immutable**. And that path is automatic:
`payout-run-completion.ts:236-241` → `autoSnapshotJournal` → `createBatch`, fired on the same flow
that marks the run PAID (PAID is in `PAYROLL_LOCKED_STATUSES`, so `provisional` is false and the
snapshot is taken as authoritative).

**Failure scenario.** An org with 100 employees runs payroll. 1,300 line items are written. The run
is approved, locked, batched, paid. `checkRunCompletion` fires `autoSnapshotJournal`, which writes an
immutable journal batch whose debits cover ~1,000 line items and whose "Salaries Payable" credit
covers all 100 employees. The operator opens `/payroll/reports` → the journal shows Total Debit
₹X, Total Credit ₹Y, **no "✓ Balanced"**, and no explanation. They click Post → `markPosted`
(`journal-outbox.service.ts:256`) throws *"Batch does not balance: debits X vs credits Y."*
**They can never post that month's payroll to the ledger, and the error blames balance rather than
truncation.** Every subsequent month behaves identically. Re-generating produces a *different*
truncated set — there is no `ORDER BY`, and `EXPLAIN` confirms a bare `Bitmap Heap Scan` with no
`Sort` — so the `sourceHash` differs and the replay guard at `:165-178` mints a new version instead
of returning the existing batch.

**Why 967 green tests did not catch it.** `insights-unit.spec.ts:79` is literally named
*"JournalService — double-entry balancing"* and has 3 `buildJournal` cases, all against a mocked
`db` whose stub ignores `.limit()`. The boundary is unreachable from the suite.

**Proposed fix.** Replace all three reads with `requirePayrollReadWithinCap(await …
.limit(PAYROLL_READ_CAP + 1), "build journal line items")` so an oversized run fails visibly with a
409 instead of posting silently wrong figures — that is the contract `lib/query-bounds.ts:3-8`
already states. The correct long-term fix is to aggregate in SQL: the code groups by
`(componentId, code, category, costCenter)` in JS, which a `GROUP BY` does in one bounded round trip
whose result set is bounded by the number of *groups*, not the number of employees. Add an
`ORDER BY` regardless, so `sourceHash` is stable. Same treatment for `journal-outbox.service.ts:127`
(`get()` silently drops a large batch's lines from the UI).

---

### F2 — P0 — a run with HELD payees is marked PAID and posts the full net to accounting

The prior report closed the *all-FAILED* case. The **partial-coverage** case is still open, and it
is a different shape: the coverage predicate measures only payees who reached a batch.

```ts
// payout-run-completion.ts:125-138
subjects:     count(distinct run_employee_id)
paidSubjects: count(distinct run_employee_id) filter (where status = 'PAID')
...
if (subjects === 0 || paidSubjects !== subjects) return;   // <- over BATCHED payees only
```

But `batch-creator.service.ts:113-120` never batches everyone:

```ts
if (e.status === "HELD" || e.holdReason) return false;   // :115
if (!bank?.accountNumber) return false;                  // :118
```

and the amount handed to accounting is the whole run:

```ts
// payout-run-completion.ts:215
net: currentRun.netTotal ?? "0",
```

which `payroll-posting.service.ts:81-91` turns into
`DR PAYROLL_PAYABLE / CR BANK_CLEARING` for the full amount.

**Reachability — traced end to end.**
`setEmployeeHold` (`payroll-run-employees.service.ts:42-46`) refuses on locked statuses, so the hold
must be applied at `PREVIEW_READY`/`EXCEPTIONS_FOUND` — which is exactly when an operator holds a
payee. A hold is **not** an exception, so `approvals.service.ts:59-77` (which does correctly block on
open BLOCKERs) sees a blocker count of 0 and lets the run through. And `setEmployeeHold` writes only
`holdReason` — nothing recomputes `payrollRuns.netTotal`.

**Failure scenario.** 10 employees, `netTotal` ₹1,000,000. Employee X (₹100,000) is held pending an
investigation. Submit → approve → lock: all legal. Generate batch → 9 payees, ₹900,000. All 9 marked
paid → `subjects = 9`, `paidSubjects = 9` → the **run is marked PAID**. The outbox emits
`net = ₹1,000,000`; `postPaid` posts `DR PAYROLL_PAYABLE 1,000,000 / CR BANK_CLEARING 1,000,000`.
The bank moved ₹900,000. BANK_CLEARING is over-credited by ₹100,000, the held employee's payable is
written off, and the books say they were paid. `payroll_run_events.metadata.paidCount = 9` against
`payrollRuns.employeeCount = 10` — the DB holds the evidence and nothing reads it.

**Proposed fix.** Two independent changes, both needed:
1. Compare batched coverage against **run** coverage: count `payroll_run_employees` for the run
   excluding deliberately-held payees, and mark the run PAID only when the paid subjects equal that
   set. A run with unbatched, unheld payees should stay `LOCKED`, or move to a distinct
   `PARTIALLY_PAID` run status.
2. Post the **amount actually disbursed**, not `run.netTotal` — sum the `PAID`
   `payroll_bank_batch_items.amount` for the run and put that in the intent payload. The consumer
   schema (`payroll-payout-posting-intent.consumer.ts:19-25`) needs no change.

---

### F3 — P1 — a >1000-line journal batch is "reversed" by 1000 lines, and the reversal skips the balance check

`journal-outbox.service.ts`:

```ts
const originalLines = await this.db.select().from(payrollJournalBatchLines)
  .where(eq(payrollJournalBatchLines.batchId, batchId))
  .orderBy(payrollJournalBatchLines.lineNo)
  .limit(1000);                                    // :330-334  no guard

// :356-364
status: "POSTED",                                  // inserted POSTED directly
totalDebits: batch.totalCredits,                   // header copied+swapped from the ORIGINAL
totalCredits: batch.totalDebits,
lineCount: originalLines.length,                   // the TRUNCATED count
```

`markPosted` refuses an unbalanced batch (`:256`), but `reverseBatch` never calls it — it inserts at
`status:"POSTED"` itself. So the one check that would have caught this is bypassed, and the header
totals it would have checked are copied from the original rather than derived from the reversal's own
lines.

**Failure scenario.** Journal lines are grouped by `(componentId, code, category, costCenter)`, so
an org with ~80 cost centres × 13 components exceeds 1,000 groups. Its posted batch has 1,040 lines.
An operator reverses it for a mapping error. The reversal is written POSTED with 1,000 lines and a
header claiming the full amount; the original is flipped to `REVERSED`. The ledger is permanently
short by the 40 un-reversed lines. `lineCount` 1000 vs the original's 1040 is stored on both rows and
checked by nothing.

**Proposed fix.** Guard the read with `requirePayrollReadWithinCap`, and assert
`sum(reversal lines) == swapped header totals` before insert — or route the reversal through the same
balance assertion `markPosted` uses.

---

### F4 — P1 — two payroll queries share one cache key, and the batch detail sheet throws

```ts
// lib/query-keys/payroll.ts:31-36
bankBatches: (runId?: number) => [...base,"payroll","payout","batches", runId],
bankBatch:   (batchId: number) => [...base,"payroll","payout","batches", batchId],
```

Identical shape, identical arity. The two hooks hold **incompatible response types**:

- `usePayoutBatches` → `PayoutBatchesPage = { data: PayoutBatch[]; pagination }` (`payout-batches.ts:31-48`)
- `usePayoutBatch` → `GetBatchResult = { batch; items }` (`types/payroll/payout.ts:123-126`)

and both are mounted in the **same tree**: `bank-transfers-content.tsx:132` `<BatchesTable runId={runId}>`
and `:142` `<BatchDetailSheet batchId={selectedBatchId}>`.

The QueryClient hashes keys with an `authenticated:${orgId}:${userId}` prefix (`lib/query-scope.ts:28-39`),
so the tenant dimension is present — this collision is *within* one org+user scope and the prefix does
not help. `payroll_runs.id` and `payroll_bank_batches.id` are both **global** sequences
(`nextval(...)`, confirmed in `information_schema`), so run 1 → batch 1 is the first payroll any
customer ever runs.

**Failure scenario.** Operator on `/payroll/bank-transfers?runId=1`. `usePayoutBatches(1)` caches a
`PayoutBatchesPage` under `[…,"batches",1]`. They click batch 1. `usePayoutBatch(1)` subscribes to the
**same** query and gets the cached list on its first render. `batch-detail-sheet.tsx:164`:

```ts
const items = data?.items.data ?? [];      // optional chain on `data` only
```

`data.items` is `undefined` → `.data` → **TypeError**. Not an empty state — a render crash on the
surface that carries per-item mark-paid / mark-failed / import-return, i.e. the whole reconciliation
UI. Once the detail's `queryFn` resolves and overwrites the shared entry with a `GetBatchResult`,
`batches-table.tsx:223` `batches?.data ?? []` silently renders **zero batches** over a run that has
one.

**Proposed fix.** Give the two keys different segments — `bankBatches: (runId) => [...,"payout","batches","by-run", runId]`
and `bankBatch: (batchId) => [...,"payout","batches","detail", batchId]` — keeping
`[...,"payout","batches"]` as the shared invalidation prefix that `useCreatePayoutBatch`
(`payout-batches.ts:81`) already relies on. Independently, `data?.items.data` should be
`data?.items?.data`.

---

### F5 — P1 — payroll generation silently covers only the first 1000 payees

```ts
// run-data-loader.service.ts:114-133
.from(employeeSalaryProfiles)
.where(and(eq(orgId), inArray(status, ["ACTIVE","UPCOMING"]), lte(effectiveFrom, monthEndDate)))
.limit(1000);                        // no guard, no ORDER BY
```

An org with more than 1,000 active salary profiles generates a run for an **arbitrary, unstable**
1,000 of them. `payrollRuns.employeeCount` is then set to the truncated count
(`run-result-persister.service.ts:198`), so nothing anywhere reports the omission — the run looks
complete and internally consistent. The remaining employees are simply never paid, and because the
subset is unordered it can differ between generation and recalculation.

**Failure scenario.** A 1,200-person company generates March payroll. 1,000 employees are calculated;
200 are absent from the run with no exception, no warning and no count discrepancy. The run is
approved and locked. The 200 discover it on payday.

**Proposed fix.** `requirePayrollReadWithinCap(rows, "load eligible salary profiles")`. A 409 that
says "this org exceeds the supported 1000-payee generation bound" is a vastly better outcome than a
silently short payroll, and it is precisely what the helper exists for.

---

### F6 — P1 — eleven payroll surfaces render a server error as an empty state

Each destructures `{ data, isLoading }` and never reads `isError`:

| file:line | what the user is told when the read 500s |
|---|---|
| `reports/report-summary.tsx:19` → `:27` | "No payroll run for this period — Run payroll for this month to see summary figures." |
| `runs/employees-tab.tsx:93` → `:161` | "No employees in this run — Generate payroll to include employees" |
| `reports/report-journal.tsx:95` → `:245` | "No journal lines" |
| `reports/report-register.tsx:107` → `:150` | "No payroll register data" |
| `reports/report-variance.tsx:92` → `:138` | "No variance data" |
| `reports/report-dept-cost.tsx:68` → `:100` | "No department cost data" |
| `reports/report-cost-center.tsx:60` → `:90` | "No cost center data" |
| `reports/report-bank-payout.tsx:118` → `:136` | "No bank payout batches" |
| `reports/report-pivot.tsx:103` → `:142` | (empty) |
| `payout/payslips/templates-tab.tsx:103` → `:159` | "No templates found" |
| `ess/components/ess-total-rewards-section.tsx:11` → `:34` | "Total rewards unavailable" |

`reports-page.tsx` has no error boundary either (`grep isError|ErrorState|ErrorBoundary` → nothing).

**Failure scenario.** F1 makes `/payroll/reports/journal` return a truncated result rather than an
error, but any 500 on `/payroll/reports/summary` — a schema drift, a timeout, a revoked permission —
renders "No payroll run for this period. Run payroll for this month." to a finance operator who has
already run it. The two report surfaces that *do* handle errors
(`journal-batches-sheet.tsx:55`, `report-pay-compression.tsx:15`) show the pattern the other eleven
should follow.

**Proposed fix.** Pull `isError`/`error`/`refetch` from each hook and render the existing
`<ErrorState title=… description={getErrorMessage(error)} onRetry={refetch}/>` before the empty
branch — the component is already imported in 28 payroll files.

---

### F7 — P1 — the route that mints payment instructions has no `@Idempotent`

`payout-batches.controller.ts:69-80` reads an **optional** `@Headers("idempotency-key")` and threads
it in as a per-currency sub-key. Across the 7 mutating payout routes, exactly one carries the
decorator:

| route | `@Idempotent` |
|---|---|
| `POST /payroll/runs/:runId/payout/batches` | **no** (`:69`) |
| `POST /payroll/payout/batches/:id/mark-sent` | no (`:123`) |
| `POST /payroll/payout/batches/:id/mark-paid` | no (`:135`) |
| `POST /payroll/payout/batches/:id/import-return` | **yes** (`:150`) |
| `POST …/items/:itemId/mark-paid` | no (`:160`) |
| `POST …/items/:itemId/mark-failed` | no (`:173`) |

Migration 1049 removed the double-payment consequence — a retry now hits
`uniq_payroll_bank_batch_items_live_subject` and `batch-creator.service.ts:287` converts it to a 409.
So the database is the backstop the header was not. But the frontend does mint a key
(`batches-table.tsx:66`), which means the *server* never enforces what the *client* volunteers: any
other client, or a client whose `crypto.randomUUID()` call is re-run, gets no protection, and the
recovery surfaces as F8's anonymous toast.

**Proposed fix.** `@Idempotent("payroll.payout.batch.create")` on `:69`, and make the header
required as `payroll-export.controller.ts:53` already does. This is a route-contract change and
belongs with ticket 04.

---

### F8 / F9 / F10 / F11 — frontend, P2

- **F8** — `run-conflict.ts` has a good 409 handler used at 6 run-lifecycle sites. The batch
  mutations do not use it: `generate-payout-dialog.tsx`, `mark-batch-dialogs.tsx`,
  `batch-item-actions.tsx` all fall through to `toast.error(getErrorMessage(err))`. F1049's 409
  ("A payout instruction already exists for one of these payees on this run") therefore renders as an
  anonymous red toast with no refresh — the user is looking at exactly the stale list that caused it.
  *Fix:* route those catch blocks through `useRunConflictHandler(runId)`.

- **F9** — `useMarkBatchPaid` (`payout-batches.ts:130-139`) invalidates `bankBatch(batchId)`,
  `bankBatches(runId)` and `run(runId)`. It does **not** invalidate `[...all,"runs"]`. Because
  `run(runId)` = `[…,"payroll","runs", 1]` and `runs(params)` = `[…,"payroll","runs", {limit:10}]`
  differ at position 4, the run *list* is not matched, and `usePayrollRuns` has `staleTime: 60_000`
  (`runs.ts:25`) — so `/payroll/runs` shows `LOCKED` for up to a minute after the server has moved the
  run to `PAID`. The command center is missed too. Symmetrically,
  `useInvalidateRunWorkspace` (`approvals.ts:80-91`) invalidates 7 run surfaces but neither
  `bankBatches` nor `bankValidation`, so the pre-flight validation panel keeps showing resolved
  blockers. *Fix:* add `[...all,"runs"]` + `commandCenterAll` to the batch mutations, and
  `bankBatches(runId)` + `bankValidation(runId)` to `useInvalidateRunWorkspace`.

- **F10** — `types/payroll/reports.ts:129-132` declares `JournalReport` as `{ lines, unmappedCodes }`.
  The server sends **six** fields (`journal.service.ts:19-26`), including the authoritative
  `totalDebits`/`totalCredits` and the `provisional` flag. The route is fetched without a response
  contract (`reports.ts:135` passes 3 args, unlike `runs.ts:24` which passes
  `payrollRunsPageContract`), so the fields arrive and are merely invisible to TypeScript.
  Consequences: `report-journal.tsx:104-113` re-derives both totals in float and issues the
  reconciliation verdict itself with `Math.abs(d - c) < 0.01`; and the journal report never shows the
  "figures are provisional" banner that `report-summary.tsx:38-43` shows, because the flag was typed
  away. *Fix:* widen the type to the server's shape and render `data.totalDebits` /
  `data.totalCredits` / `data.provisional`. This is far smaller than the prior report assessed — no
  backend change is needed. Separately, `JournalLine.debit/credit` being JS `number` on the wire
  (`journal.service.ts:14-15`) is the one place money leaves the backend as a float; at
  `numeric(15,2)` magnitudes it round-trips through `Math.round(x*100)`, so it is a contract-shape
  defect rather than a live arithmetic error.

- **F11** — the presigned-URL claim is **true** (3600 s, real AWS `getSignedUrl`). Two residual
  concerns: the CSV behind it contains the **unmasked** account number
  (`batch-creator.service.ts:201` writes `bank.accountNumber`, while the DB row stores only
  `"XXXX"+last4` at `:207`), and `batches-table.tsx:84` hands that URL to `window.open`, putting it
  in browser history for an hour. Every other payroll download uses `apiClient.download`.
  *Fix:* drop the expiry to ~120 s and stream through `apiClient.download` as
  `payroll-export.controller.ts:84-98` does.

### F12–F15 — P2, recorded

- **F12** `payroll_tds_ytd_ledger` is now correct (1050) and has **zero readers** anywhere in `src/`.
  Form 16 (`filings.service.ts:166-215`) is a *period* summary read from `filing.payload.rows` and is
  explicitly labelled "not an official Form 16". There is no competing YTD computation, so this is a
  gap rather than a conflict. Belongs to whoever owns Form 16 / filings.
- **F13** `payout-run-completion.ts:110` (`allBatches`) and `:143` (`paidRunEmployees`) use
  `.limit(PAYROLL_READ_CAP + 1)` without `requirePayrollReadWithinCap`. Today they are bounded
  transitively — `batch-creator.service.ts:80` guards the whole run at 1000 employees, so no run with
  more than that can ever have a batch. That is an invariant enforced in a different file; if F5 is
  fixed by raising the cap, these two become live silent truncations on the mark-PAID path.
- **F14** 36 of 38 payroll controllers carry `@RequireModule("payroll")` + `ModuleGuard`. The two
  that do not are `ess.controller.ts:25` and `payroll-ai-explain.controller.ts:24`, both under
  `payroll/me`. This may be deliberate (self-service should survive an admin module toggle) but it is
  undocumented and inconsistent; worth an explicit comment either way.
- **F15** `lib/rbac/permissions/payroll.ts:32` describes `payroll:runs:manage` as *"Lock, reopen, and
  mark paid payroll runs"*. Mark-paid is gated on `payroll:bank:manage`
  (`payout-batches.controller.ts:137`). Also noted, not a bug: `payroll:runs:manage` is one
  undifferentiated key covering lock **and** reopen, so "can lock" cannot be granted without "can
  reverse a locked financial record" — a product decision.

---

## 5. What head already gets right

Worth stating precisely, because it is a lot and because several of these are the reason other things
are safe:

1. **Tenant safety is structural, not textual.** 62 composite tenant FKs
   (`(org_id, run_id) → payroll_runs(org_id, id)` etc.) mean the several joins that omit `org_id`
   cannot reach another tenant even in principle. RLS on 35/36 tables with the right predicate is the
   second layer. I found **no** cross-tenant read in payroll.
2. **Financial immutability is enforced in the database**, with the right cut — 8 triggers freeze
   amounts and snapshots on locked runs while permitting the status transitions the payout flow needs.
3. **Money is integer paise end to end**, zero float columns, `Math.round` at every rate boundary.
4. **`ON CONFLICT` arbiters all resolve** — 10/10 audited against the live catalog, including the two
   partial indexes that need a `targetWhere` and the one (`payroll_bank_batch_items`) that
   deliberately has no upsert at all.
5. **The async export path is a model of the pattern**: org- **and requester**-scoped, keyset
   paginated, idempotent with a request-hash guard, cancellable, retried under a cap, expiring,
   streamed with `private, no-store`.
6. **The permission gate is real, not inert.** 112 `useAuthorizedMutation` sites, 0 raw
   `useMutation`, and the guard throws before the request while correctly treating an unresolved
   access snapshot as pending rather than denied.
7. **The ESS surface has no IDOR.** Every `payroll/me/*` route takes the subject from the token, never
   from a param; the AI explain path additionally checks `pub.pubUserId !== userId` and refuses
   unpublished payslips, is rate-limited, and makes its provider call **outside** any transaction.
8. **No N+1 and no provider-call-in-transaction in payroll** — verified by gate over 2,161 service
   files and by reading the two AI/storage paths.
9. The three P0s the prior wave fixed (double payment, TDS YTD overwrite, all-FAILED marked PAID) and
   the 42P10 worker-only regression are all **still fixed at head**; 967 tests green.

---

## 6. Blocked on infrastructure — NOT MEASURED

- **Seeded E2E.** `payroll-db-integration.e2e-spec.ts` and `payroll-runs.controller.e2e-spec.ts` were
  **not run**. Both `scratch_head_1010` and `scratch_cold_1010` are structure-only — every payroll
  table has 0 rows (`payroll_runs=0 run_employees=0 bank_batches=0 organizations=0`). Running them
  needs `pnpm test:e2e` against a **seeded** database with at least one org, one policy version, one
  salary profile set and one generated run. That is the only way to close C122's E2E half.
- **The exact F1 threshold in situ.** I proved the 13-lines-per-employee figure from the repo's own
  frozen fixture and the truncation arithmetic in SQL, but I could not run `buildJournal` against a
  77-employee run because no seeded run exists. What would measure it: seed a run with ≥77 employees,
  call `GET /payroll/reports/journal`, and assert `totalDebits === totalCredits`. That assertion is
  the regression test F1 needs and does not currently exist anywhere in the 967.
- **Performance / BUFFERS.** No benchmark taken. Every payroll table is empty, so
  `EXPLAIN (ANALYZE, BUFFERS)` would measure nothing. The one plan I did take
  (`payroll_line_items` by `run_id`) confirms index selection and, importantly, the **absence of a
  Sort node** — which is the evidence for F1's nondeterministic truncation.
- **`check:tenant-isolation:run`** was not run; `check:tenant-isolation` proves a test *exists*, not
  that it passes.
- **`pnpm typecheck` / `next build`** were not run, per the laptop budget. The orchestrator runs them.
