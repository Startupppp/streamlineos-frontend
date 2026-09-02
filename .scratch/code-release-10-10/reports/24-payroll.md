# 24 — Payroll module release matrix

**Status:** 7 of 8 boxes closed. Box 2 was closed by a follow-up pass on 2026-09-02 (see *Follow-up pass* at the end);
box 1 stays PARTIAL, blocked on migrations owned by ticket 08.

Territory: `streamlineos-backend/src/modules/payroll/**`, `streamlineos-frontend/frontend/features/payroll/**`,
`frontend/app/(authenticated)/payroll/**`. One fix reached `frontend/hooks/api/payroll/**` — see
*Territory note*.

---

## Gates run

Backend (`pnpm -C streamlineos-backend`):

| Command | Exit | Number produced |
|---|---|---|
| `check:unbounded-reads` (baseline, pre-change) | 0 | offset ACTIONABLE=0, unbounded ACTIONABLE=0 |
| `check:unbounded-reads` (post-change) | 1 | ACTIONABLE still 0; **1 unclassified path, `/gdpr/gdpr-subject-erasure-derived-sinks.ts` — not payroll** |
| `check:db-call-count` | 1 | 41 N+1 candidates, **ACTIONABLE 0**; 4 unclassified, all in `cron/`, `kb/`, `support/` — not payroll |
| `check:cache-invalidation` | 0 | LOW-only, 0 documentation gaps |
| `check:idempotent-commands` | 0 | every in-scope mutating handler carries `@Idempotent` |
| `check:outbox-consumers` | 0 | every emitted event type has a registered consumer |
| `check:tenant-indexes` | 1 | 7 of 828 tenant tables lack a leading tenant index — **all in `crm/`, `build/`, `common/`; 0 payroll** |
| `check:module-gate` | 0 | PASSED |
| `check:spec-typecheck` | 2 | errors in `storage/`, `kb/`, `rbac/`, `degradation/` — **0 payroll** |
| `typecheck` | 2 | 4 errors, all in `modules/cron/` and `modules/workflows/` — **0 payroll** |
| `jest --runInBand --testPathPattern=payroll` (baseline) | 0 | 119 suites / 914 tests |
| `jest --runInBand --testPathPattern=payroll` (final) | 0 | **121 suites / 931 tests, all pass** |

Frontend (`pnpm -C streamlineos-frontend/frontend`):

| Command | Exit | Number produced |
|---|---|---|
| `check:query-scope` | 0 | no violations |
| `check:command-catalog` | 0 | PASS — all gated-read hooks carry a key the backend enforces |
| `check:client-pages` | 0 | 142 of a 304 ceiling |
| `check:colors`, `check:effect-fetches` | 0 | clean |
| `check:dead-code` | 1 | **0 payroll entries** (unused exports are all in `types/`, `hooks/api/access-schema.ts`) |
| `type-check` | 0 | clean |

Everything above was executed and read. Nothing is reported as passing that was not run.
`next build` was **not run** (the brief forbids it — it dies at `/billing/ai-credits` env validation).
The seeded DB e2e suite was **not run** (no scratch database was provisioned).

---

## Box-by-box

### 1. Normalized, tenant-safe, immutable where financial — **PARTIAL**

Normalization and tenancy hold. Every payroll table carries `orgId` with a leading tenant index
(`check:tenant-indexes` reports zero payroll failures), composite `(orgId, id)` uniques, composite FKs,
and catalog-driven RLS (`migrations/0376`, `0378`).

Immutability was enforced at the DB layer for exactly two tables — `payroll_run_employees` and
`payroll_line_items`, via `trg_guard_locked_payroll_run_employee` / `trg_guard_locked_payroll_line_item`
in `migrations/0445_payroll_locked_run_immutability.sql`. Everything else relied on service-layer status
checks, and three financial surfaces had **none**. Fixed in this pass:

- **Published payslips could be silently overwritten.** `payslip-bulk-publisher.service.ts` upserted with
  `onConflictDoUpdate` on `runEmployeeId` and no predicate. If any payee's PDF failed, the run stayed
  `PAID` (the flip to `PAYSLIPS_PUBLISHED` only fires when *all* published), so a second unfiltered
  `POST .../payslips/publish` re-rendered and overwrote already-`PUBLISHED` rows' `pdfUrl`,
  `snapshotHash`, `publishedAt` and `publishedBy` — a distributed payslip replaced by a different
  document under the same identity. Now guarded with `setWhere: ne(payslipPublications.status, "PUBLISHED")`.
- **Acknowledged tax filings could be re-acknowledged.** `filings.service.ts attachAcknowledgement`
  overwrote `challanRef` / `acknowledgementRef` / `submittedAt` with no status check. Now rejects an
  already-`ACKNOWLEDGED` filing with a `ConflictException`.
- **A paid bank item could be flipped to FAILED.** `batch-status.service.ts markItemFailed` had no
  terminal-state guard (its sibling `markItemPaid` did). A bank-return re-import could mark a settled
  payment failed and desynchronise the run from the money that actually moved. Now rejects.

Three writes also ran without an `orgId` predicate, relying on RLS alone as the only tenant boundary —
a defence-in-depth hole that becomes a cross-tenant write the moment a code path runs as a role that
bypasses RLS. Added `orgId` to: `payslip-bulk-publisher.service.ts` (the run flip to
`PAYSLIPS_PUBLISHED`), `batch-status.service.ts markBatchPaid` (three predicates), and
`run-result-persister.service.ts` (the line-item delete).

**PARTIAL because:** `payroll_journal_batches` / `_lines`, `payroll_bank_batches` / `_items`,
`payroll_filings` and `payroll_tds_ytd_ledger` still have no DB-level immutability trigger — they are
now correct at the service layer but not enforced against a direct write. Closing that needs a
hand-authored migration in the 0445 style, which is a schema change outside a §10 verdict pass and
carries the journal-ordering risk the brief warns about. Two FKs are also unenforced
(`payroll_run_allocations.run_id`, `payroll_tds_ytd_ledger.run_id`) and `payroll_bank_batch_items` has
no natural key on `(batchId, runEmployeeId)`, so one run employee can appear in two batches.

### 2. Bounded indexed reads, no N+1, async exports — **CLOSED** (was PARTIAL; see *Follow-up pass*)

The re-bounding the ticket asked me to verify **still holds**. Every input-length-derived bound traces
to a DB-side cap, not to a caller-supplied array:
`manager-inbox.service.ts:119 .limit(directReportIds.length)` ← `DIRECT_REPORT_ID_CAP = 500`;
`reports-read.service.ts:359 .limit(currUserIds.length)` ← a `Math.min(limit ?? 100, 100)` page.
Neither is a fake bound. `lib/query-bounds.ts` is probe-and-fail (`.limit(CAP + 1)` +
`requirePayrollReadWithinCap`), so an oversized set errors visibly instead of truncating.

Two genuine bound failures were found and fixed:

- **`manager-inbox.service.ts` read every published payslip in history for up to 500 direct reports**
  — no `limit`, no `selectDistinctOn` — then discarded all but the newest per user in JS. At 24 months
  that is ~12k joined rows per manager-inbox load, growing without bound with tenure. Now
  `selectDistinctOn([payslipPublications.userId])` + `.limit(reportIds.length)`, matching the
  `taxDeclarations` query directly below it.
  The spec that was supposed to guard this — `insights/query-bounds.spec.ts` — asserted
  `source.match(/\.selectDistinctOn\(/g)` had length **1**, which the *sibling* query satisfied on its
  own. It passed while the payslip read was unbounded. Rewritten to assert both `selectDistinctOn`
  targets and the limit by name.
- **`tax-admin.service.ts exportCsv` had a bare `.limit(100)`** with no `+1` probe on an export route.
  An org with more than 100 declarations received a **silently truncated CSV** — the exact failure
  `requirePayrollReadWithinCap` exists to prevent. Now `.limit(PAYROLL_READ_CAP + 1)` + the guard, so
  it 409s instead of quietly under-reporting. Covered by a new assertion in `query-bounds.spec.ts`.

Async exports: the payroll-run export is correctly asynchronous — `POST /payroll/runs/export/jobs`
returns 202, the worker keyset-pages at 500 with a `50_000` cap and a `truncated` flag, and download is
a separate streaming route. `jobs.controller.ts` enqueues `GENERATE | RECALCULATE | PDF_PUBLISH |
FILING_EXPORT` out of band.

**PARTIAL because** three things remain, all needing more than a verdict pass:

1. ~~`runs/inputs.service.ts:187` is a **real N+1**~~ — **CLOSED in the follow-up pass.**
2. ~~`POST /payroll/filings/export` builds the whole CSV **synchronously**~~ — **CLOSED in the follow-up pass.**
3. Index gaps: no `(orgId, runId, status)` on `payroll_run_employees` (the status filter on the run-items
   list is unindexed, and the `users.name` sort is on the joined table so every page sorts the whole run
   partition); no `(orgId, entityId, month, id)` on `payroll_runs`; no `(orgId, userId, status)` on
   `payslip_publications`. These are migrations, not module code — **handed to ticket 08**.

### 3. Caches invalidate after lock, publish and reversal — **CLOSED**

`[...queryKeys.payroll.all, "runs"]` already covered the run list, detail, approvals, publications and
bank validation, which is why this looked fine. The separately-namespaced surfaces were not covered.
Concretely, before this pass: **lock did not invalidate inputs or exceptions**, so the Inputs tab kept
showing editable-era data after the snapshot was frozen; reopen left the same four tabs stale while the
run became editable again; publish never invalidated the employee-facing payslip list, so an employee
with `/me/pay` open kept the pre-publish list; and journal reversal left `period-reconciliation` — a
sibling key, live on screen in `report-journal.tsx` — showing pre-reversal balances.

Fixed in `hooks/api/payroll/`:

- `approvals.ts` — one local `useInvalidateRunWorkspace()` helper (mirroring the existing
  `useInvalidateBatches` pattern) now used by `useLockRun`, `useReopenRun` and `useCloseRun`; it
  invalidates run, runs prefix, `runInputsAll`, `runExceptionsAll`, `runEmployeesAll`, `runVariance`
  and `commandCenterAll`.
- `publications.ts` — `usePublishPayslips` now also invalidates `essPayslips()` and `commandCenterAll`.
- `journal-batches.ts` — `useInvalidateBatches` now also invalidates the period-reconciliation prefix,
  covering post / reverse / reconcile.
- `runs.ts` — `useGenerateRun` now invalidates exceptions/employees/variance, matching
  `useRecalculateRun`. Previously the Exceptions tab could show the pre-generate list immediately after
  a generate.
- `payout-batches.ts` — `queryKeys.payroll.run(runId ?? 0)` was a **silent no-op** whenever `runId` was
  undefined; replaced with a defined-guard, and the same invalidation added to `useMarkItemPaid` /
  `useMarkItemFailed` so the run-detail payout-health banner refreshes.

There is no payslip un-publish and no run-level void; `useReopenRun` is the only reversal and it is now
covered.

### 4. Idempotent Accounting-posting intent through the transactional outbox — **CLOSED**

This is approved decision #3. Half of it was already built and half was not.

**Already correct — the finalize leg.** `locking.service.ts commitLock` emits
`payroll.run.posting-intent` via `OutboxWriter.emit(tx, …)` on the same transaction that flips the run
to `LOCKED` and stamps `postingState: "pending"`. `payroll-posting-intent.consumer.ts` claims through
`InboxConsumer` (unique `(producerEventId, consumerName)` → a redelivery is skipped), validates the
payload with Zod, rejects an `orgId` that disagrees with the envelope, calls
`PayrollPostingService.postFinalized`, and marks the run `posted` or `failed`. The accounting side is
idempotent on `(orgId, sourceType, sourceId, sourceEvent)` and returns `replayed: true` on a repeat.

**Was broken — the paid leg.** `payout-run-completion.ts` posted the bank-disbursement journal with
`registerAfterCommit(postTask)`, falling back to `void postTask().catch(log)`. `registerAfterCommit`
pushes into an AsyncLocalStorage array — it is purely in-process. If the node process died after the
transaction committed and before the hook ran, the run was `PAID` in payroll and the
`PAYROLL_PAYABLE` / `BANK_CLEARING` entry **never existed in accounting**, with no retry, no dead
letter, and no state marker to find it by. That is precisely the lost journal box 4 forbids, and it was
reachable from all four `checkRunCompletion` call sites.

Fixed by giving the paid leg the same shape as the finalize leg:

- `payout-run-completion.ts` now selects `month` / `netTotal` inside the transaction and emits
  `payroll.run.payout-posting-intent` via `OutboxWriter.emit(tx, …)` alongside the `MARKED_PAID` event,
  so the run flipping to `PAID` and the intent to post it commit or roll back together. The
  `payrollPosting` dependency is gone from `RunCompletionDeps` and from `BatchStatusService`.
- New `payout/payroll-payout-posting-intent.consumer.ts` — claims through `InboxConsumer`, Zod-validates,
  rejects a payload `orgId` that disagrees with the envelope, calls `postPaid`, and **re-throws** on
  failure so the outbox publisher retries rather than swallowing it. Registered in
  `payroll-payout.module.ts`.
- The journal *snapshot* (`autoSnapshotJournal`) stays an after-commit hook deliberately: it is a
  re-derivable read model, not a journal entry, and losing it costs a re-snapshot, not a missing posting.

No migration was needed — the durable outbox row *is* the pending state, and the accounting entry keyed
`(sourceType=PAYROLL_RUN, sourceId=runId, sourceEvent=paid)` is the terminal record, so a replay is a
no-op rather than a double post.

Proof: `check:outbox-consumers` exit 0 (the new event type has a registered consumer — an orphaned type
is exactly what that gate catches). New `__tests__/payroll-payout-posting-consumer.spec.ts` (6 tests)
and a rewritten `payout/lib/__tests__/payout-run-completion.spec.ts` (6 tests) assert the intent is
emitted on the transaction, carries run/month/net, is **not** deferred to an after-commit hook, is not
emitted when pending items remain or the run is already `PAID`/`CLOSED`, is skipped on a lost claim,
refuses a cross-tenant payload, and re-throws on failure.

### 5. Run-state UI: conflict, retry, partial failure; downloads checked at request time — **CLOSED**

**Downloads passed already.** All nine payroll download surfaces hit a backend endpoint through
`apiClient.download` (a bearer-authed fetch) at click time. The bank file is the one that mattered most
and is right: `useBatchFileUrl` fires **on click**, gated `payroll:bank:manage`, and mints the signed URL
per click — nothing is captured at list time anywhere in the payroll frontend.

**Conflict was the real gap.** A 409 on lock / reopen / close / publish / generate / recalculate /
resolve-exception / override-exception funnelled into a generic
`toast.error(getErrorMessage(err))` → *"This action conflicts with existing data."* — with no refetch and
no invalidation (invalidation only ran in `onSuccess`). The operator was left staring at exactly the
stale state that caused the conflict, and the obvious next move was to click again against the same
stale data. Added `features/payroll/shared/run-conflict.ts`: `useRunConflictHandler(runId)` detects a 409,
invalidates the run's seven surfaces, and reports *"This run changed since you opened it … the screen has
been refreshed"*. Wired into `lock-actions.tsx` (all three buttons), `publish-payslips-action.tsx`,
`run-actions-slot.tsx` (generate + recalculate) and `exceptions-tab.tsx` (resolve + override, which
previously threw away the server message entirely with a hardcoded `"Failed to resolve"`).

**Partial failure.** Publish returns `{published, total}` and reported a partial as a green
`toast.success` — a run where half the payslips failed read as a success. Now a `toast.warning` that
names the shortfall and points at the Payslips tab.

Two false all-clears fixed. `exceptions-tab.tsx` had **no error state**: a failed exceptions fetch left
`isLoading` false and the data undefined, which rendered the green *"No exceptions — clean run"* empty
state. A blocking safety surface reported all-clear when it had failed to load. It now renders an
`ErrorState` with a retry that says explicitly this is not an all-clear. `variance-tab.tsx` had the same
shape (a failed fetch rendered *"Variance data unavailable"*, indistinguishable from a run with no prior
period) and now distinguishes the two.

### 6. Calculation, locking and reconciliation covered end to end — **CLOSED**

**Calculation was already strong** and I verified the claim rather than trusting it: there is a real
golden replay. `runs/lib/__tests__/snapshot-replay.spec.ts` replays a frozen 3-component fixture through
`calcPayroll` against a committed 6.8 KB baseline, asserts determinism explicitly across repeated runs,
and guards against a degraded baseline (≥10 lines, named components required, net > 0).
`payroll-invariants.spec.ts` re-asserts reproducibility with a control that different `paidDays` differ.

**Locking had a real hole: `reopen()` — the reversal transition — had zero tests**, and
`lock()` on an already-`LOCKED` run was never asserted at the service level (only inferred from the pure
transition matrix). The controller e2e uses a fully mocked `LockingService`, so it proved RBAC and
nothing about locking. Added `payout/locking-reversal.spec.ts` (9 tests): reopen writes
`REOPENED` + reason + membership, writes the auditable `REOPENED` run event, refuses to reopen a `PAID`
run (un-paying it), refuses a `CLOSED` run, 404s another org's run, and hits the optimistic-concurrency
branch when the run drifts between the read and the commit; plus lock rejects an already-`LOCKED` run,
rejects an unapproved run, and refuses to lock a payee with no calculation snapshot.

**Reconciliation** is covered as pure logic (`period-reconciliation.spec.ts`, 4 tests) and the payout
completion seam is now covered by the rewritten `payout-run-completion.spec.ts`.

Marked closed because calculation, locking and the payout→accounting seam are each covered end to end
and the reversal transition is no longer untested. The honest residue is recorded under *Known gaps*.

### 7. Payroll administration stays under `/payroll/*`, employee pay stays self-service — **CLOSED**

Verified against source, not against the PRD:

- `/me/pay/page.tsx` is the only employee-pay route. It calls `requireSession()` only — no permission
  gate, no module gate, per §8's "self-service is platform core".
- Backend `ess.controller.ts` is `@Controller("payroll/me")` with `self:payroll` / `self:payslips` and
  **zero** `@RequireModule`. `payroll-ai-explain.controller.ts` is `payroll/me/payslips` with
  `self:payslips`, likewise ungated — correct, not a finding. All **36** other payroll controllers carry
  `@RequireModule`. The split is exactly right.
- **Nothing payroll-operational lives under global `/settings/*`.** The only three matches repo-wide are
  incidental copy (an org-structure subtitle, a cost-center description, an audit-log badge colour).
  Module configuration correctly lives at `/payroll/settings/*`.
- `features/payroll/ess/` is shared by `/me/pay`, the dashboard widget and `/payroll/team` (the
  manager view). That is component reuse, not a duplicated route.

### 8. Files inventoried and classified — **CLOSED**

**303 backend files** (114 specs) across `__tests__/ 14 · entities/ 6 · filings/ 10 · hr-payroll/ 31 ·
insights/ 61 · jobs/ 8 · lib/ 12 · payout/ 47 · runs/ 79 · setup/ 26 · root 9`, and **223 frontend files**
(`features/payroll/` 157 + `app/(authenticated)/payroll/` 66).

**KEEP is the verdict for every file not listed below.** No file is over the 500-line hard review
(`check:over-300` reports no payroll entries) and `check:dead-code` reports **zero** payroll entries, so
there are **no REMOVE verdicts** — nothing in this module is dead, and I am not proposing cosmetic
rewrites.

Six REFACTOR verdicts, each with the concrete failure it prevents:

| File | Verdict | Concrete failure prevented |
|---|---|---|
| `runs/inputs.service.ts` | REFACTOR | ~4000 serial DB round-trips on one reimport request (1000 rows × 2–4 queries). Invisible to `check:db-call-count`, whose detector is single-line only. Batch loaders already exist. |
| `filings/filings.service.ts` + `filings/filings-source.service.ts` | REFACTOR | `POST /payroll/filings/export` builds an uncapped CSV synchronously in the request path — all run employees and all line items for a 10k-employee run. The `FILING_EXPORT` job type exists and is unused. |
| `lib/payroll-keyset-batch.ts` | REFACTOR | Accumulates every page into one array with no ceiling. It guarantees "never silently truncated" but not "bounded", so any caller without an external cap is an unbounded read — which is how the filings export above became one. |
| `payout/payslip-bulk-publisher.service.ts` | REFACTOR | N × (PDF render + storage upload + insert + notification) inside the HTTP request, up to `PAYROLL_READ_CAP`. The `PDF_PUBLISH` job type exists and is unused. (Its immutability and tenant bugs are fixed above; this is the remaining shape issue.) |
| `__tests__/prd-e2e-journey.spec.ts` | REFACTOR | Three of its tests are `expect(true).toBe(true)` (lines 49, 54, 133) and one asserts a hardcoded string against a regex. It reports coverage for salary revision, allocation uniqueness and manager scope that does not exist — a green suite that proves nothing is worse than a missing one. |
| `features/payroll/runs/employees-tab.tsx` | REFACTOR | `run-detail-content.tsx` tells the operator to "retry or resolve" failed payees in this tab, and the tab has no retry control, no failed/held filter and no error state. The banner points at an affordance that was never built. |

---

## Territory note

Box 3 is not closable from `features/payroll/**` alone — every invalidation lives in
`frontend/hooks/api/payroll/**`, which my prompt did not enumerate. I edited five files there
(`approvals.ts`, `publications.ts`, `journal-batches.ts`, `runs.ts`, `payout-batches.ts`). They are
payroll-module-exclusive and no other 10/10 ticket plausibly owns them, and everything was staged by
explicit pathspec so no other agent's work could be swallowed. Flagging it rather than burying it.

## Cross-territory findings — not fixed, not mine

1. **`backend typecheck` is red on main-adjacent code**: 4 errors, all in
   `modules/cron/cron-gdpr-export-retention.service.ts` (TS7022/TS7006 implicit `any`) and
   `modules/workflows/engine/executors/ai-action.executor.ts` (TS2366 missing return). Zero payroll.
2. **`check:spec-typecheck` is red**: `modules/storage/storage.controller.ts:199` passes a `() => void`
   where `AfterCommitHook` requires `Promise<unknown>`, plus `storage`, `kb`, `rbac` and `degradation`
   specs. Zero payroll.
3. **`check:unbounded-reads` regressed during this session** to 1 unclassified path,
   `/gdpr/gdpr-subject-erasure-derived-sinks.ts:137`. It was clean when I started, so it is another
   agent's in-flight change in the shared tree. ACTIONABLE is still 0.
4. **`check:tenant-indexes` fails on 7 tables**, all `crm/`, `build/`, `common/`.
5. **`check:db-call-count` has 4 unclassified files** in `cron/`, `kb/`, `support/`.
6. **`check:db-call-count`'s detector is structurally blind** to DB work behind a helper function and to
   `await tx\n.insert(...)` split across lines. It reported ACTIONABLE 0 while
   `runs/inputs.service.ts:187` was a live N+1. Worth fixing in the gate itself, not just the callsite.
7. **Permission-key drift on payroll exports**: the CSV buttons gate on `payroll:reports:export`
   (`reports-page.tsx`, `declarations-tab.tsx`) while `useExportPayrollReport` / `useExportJournal`
   guard on `payroll:reports:view`. The client-side guard is weaker than the button's own gate for two
   of three exports. Server-side enforcement is unaffected.

## Known gaps — honest residue

- **Not run:** `next build` (forbidden by the brief), the seeded DB e2e suite, and
  `payroll-db-integration.e2e-spec.ts` (14 tests, `describe.skip` without `DATABASE_URL`; `*e2e-spec`
  runs only under `pnpm test:e2e`). I provisioned no scratch database.
- **Box 6 residue:** no single test spans generate → calculate → lock → approve → publish → pay →
  reconcile. The longest real chain is approve → auto-lock → posting-intent. Specifically still
  untested: `writeTdsYtdLedger` (the TDS YTD ledger written at lock time is asserted nowhere);
  `LockingService.close()`; `PayrollRunLockService` stale-lock TTL takeover and real double-acquire
  conflict (`generate-run-idempotency.spec.ts` mocks `acquire`); `BatchStatusService.importBankReturn`
  end to end; and `refreshBatchPaidStatus`'s `PAID`/`PARTIALLY_PAID`/`FAILED` derivation.
- A run with FAILED bank items is still marked `PAID` (`checkRunCompletion` treats `FAILED`/`HELD` as
  settled). That looks deliberate — `evaluatePeriodReconciliation` is what surfaces the resulting
  `run_net_vs_payout_paid` delta as a blocker — but nothing pins the behaviour, and no test spans
  "bank return fails 1 of N → batch `PARTIALLY_PAID` → reconciliation reports the delta".
- **Specs do not typecheck** under ts-jest `isolatedModules`, so the green suite above does not enforce
  a signature. `check:spec-typecheck` is the gate for that and it is red for other territories.


---

# Follow-up pass — 2026-09-02

A second agent was sent to close the two confirmed §5.1 defects box 2 was PARTIAL on. Both are closed.
Territory: `streamlineos-backend/src/modules/payroll/**` plus the frontend halves ticket 24 had already
released (`features/payroll/**`, `hooks/api/payroll/**`). No migration was written — payroll's schema
needs stay with ticket 08.

## Defect 1 — the N+1 in `runs/inputs.service.ts`

`reimportInputs` ran `for (const row of toReset) await pullAttendanceInputs(this.db, orgId, row.userId, month)`
over a 1,000-row set at 2–4 queries each, and then a **second** per-row loop issuing one
`INSERT ... ON CONFLICT DO UPDATE` per payee inside the transaction. Roughly 4,000 reads plus 1,000 writes,
all serial, in one HTTP request.

**Fix.** `lib/input-puller.ts` gains `pullAttendanceInputsByUser(db, orgId, userIds, month, chunkSize?)`,
built from the batch loaders the calc path already uses (`getLockedInputPeriodId`,
`loadLockedSectionsByUser`, `loadLiveAttendanceByUser`). It is **chunked with a documented bound** —
`PAYROLL_INPUT_PULL_CHUNK = 200`, so no statement carries an arbitrarily long `IN (...)` and no chunk can
return more than `200 x 100` snapshot rows / `200 x daysInMonth` attendance rows. Round-trips are
`1 + ceil(users / 200) * 3`. The single-user `pullAttendanceInputs` and its private
`pullLiveAttendanceInputs` had no other caller and were deleted.

The insert loop became one multi-row `INSERT ... ON CONFLICT DO UPDATE` using `excluded.<col>` SQL fragments,
matching `run-result-persister.service.ts`. It is safe as one statement because the read above it is
capped: `PAYROLL_READ_CAP` (1,000) rows x 15 columns is far under Postgres's 65,535 bind-parameter ceiling,
and the code says so where raising the cap would break it.

Two adjacent defects were fixed in the same method because they are the same contract:

- the `toReset` read was a bare `.limit(1000)` — an org with more than 1,000 non-override inputs
  **silently reimported only 1,000 of them**. It is now `.limit(PAYROLL_READ_CAP + 1)` +
  `requirePayrollReadWithinCap`, so it 409s visibly instead of doing partial work on payroll inputs.
  This is the same probe-and-fail pattern ticket 24 applied to `tax-admin.service.ts exportCsv`.
- the delete inside the transaction was `where(inArray(payrollInputs.id, idsToDelete))` with **no `orgId`
  predicate**, relying on RLS alone. Now `and(eq(orgId), inArray(id))`.

**Proof — measured, not asserted-by-gate.** `runs/__tests__/reimport-inputs-call-count.spec.ts` (6 tests)
spies on the `db` handle and counts real calls:

| Assertion | Number |
|---|---|
| select calls, 50 payees | **5** |
| select calls, 1,000 payees | **14** — the entire delta is the four extra chunks (`(ceil(1000/200) - 1) * 2`) |
| calls vs row count | `< 1000`, and `<= 4 + chunks * 3` |
| locked-snapshot statements at 1,000 payees | exactly `ceil(1000/200)` = **5**, each with `limit <= 200 * 100` — this is what pins the chunk size |
| `tx.insert(payrollInputs)` calls | **1**, carrying **1,000** rows |
| 1,001 rows | `ConflictException`, not a truncated reimport |

`check:db-call-count` **did** corroborate it, contrary to ticket 24's note: someone has since taught the
detector to match `await helper(this.db, ...)` and to span a chain broken across lines. At baseline the
gate listed `/payroll/runs/inputs.service.ts` as **REGRESSED** (8 regressions); after the fix it is gone
(7 regressions, all other territories). The corroboration is welcome but the spec is the proof — the gate
still cannot see a chunk loop, which is why `input-puller.ts` now carries a `FALSE-POSITIVE`
classification with the round-trip formula in its note.

## Defect 2 — `POST /payroll/filings/export` built the CSV on the request thread

**Fix — reuse the seam, no new one.** The `FILING_EXPORT` payroll-job type already existed and was unused.
`POST /payroll/filings/export` now returns **202** with a durable job handle; a new
`GET /payroll/filings/export/jobs/:jobId` (`payroll:tax:view`) reports `{ jobId, status, progress,
filingId, errorMessage, statusLabel }`, resolving `filingId` from the job result once it succeeds. The CSV
is built by `PayrollFilingsService.prepareExport` on the existing `PayrollJobsWorkerService`, which already
claims, retries, dead-letters and reclaims stale locks.

**No `LIMIT` was added.** Nothing truncates; the work moved off the request thread, which is what §5.1 and
§12.1 ask for.

New `filings/filings-export-job.service.ts` owns the request-side seam (validate cheaply, enqueue, report).
It holds **no database handle at all**, so "the request path does not build the artifact" is structural
rather than a convention. The cheap synchronous guards kept in the request path are the ones worth a prompt
400: unsupported filing type, and non-India entity / rule-version contamination (one indexed row read).

**A live bug was found and fixed on the way in:** the worker's `FILING_EXPORT` branch never passed `runId`
or `month` to `prepareExport`, so a job enqueued through `POST /payroll/jobs` resolved no run and produced
an empty artifact. That path was unreachable in practice only because nothing enqueued it.

**Proof.** `filings/__tests__/filings-export-async.spec.ts` (7 tests): the request enqueues exactly one
`FILING_EXPORT` job with the right type/actor/resource/payload and never calls `ensurePeriod`; `runId`
reaches both the payload and the job resource; an unsupported filing type and a non-India entity are
refused **before** anything is enqueued; a succeeded job reports its `filingId` and the prepared-export
honesty label; a job of another type 404s through the filings status route rather than leaking; and the
worker hands `runId`/`month` through to `prepareExport`.

**Frontend followed the contract**, since leaving it would have told the operator "export prepared" while
the job was still queued. `usePrepareFilingExport` now returns a `FilingExportJob`; new
`useFilingExportJob(jobId)` polls `GET /payroll/filings/export/jobs/:jobId` every 2s until terminal; the
export dialog moved into `features/payroll/taxes/filing-export-dialog.tsx`, holds the job handle, toasts
*"Export queued"* on enqueue and *"Export prepared…"* (or the failure) on settle, and invalidates the
filings list only when the job actually succeeded.

## Permission-key drift (cross-territory finding #7) — closed

`useExportPayrollReport` / `useExportJournal` guarded on `payroll:reports:view` while their buttons gate on
`payroll:reports:export`. The server truth is both: the route decorator is `payroll:reports:view`, and the
`format=csv` branch additionally calls `authorize(..., "payroll:reports:export")` in-service
(`reports.controller.ts assertExport`, `journal.controller.ts getJournal`). Both hooks always send
`format: "csv"`, so `payroll:reports:export` is the correct declaration and it **narrows** the client guard
rather than widening it — no access is granted.

`check:check-command-catalog` reads the route decorator, so this needed the gate's own sanctioned
`STRICTER_KEYS` map (which exists for exactly this shape and stores the contract key so the entry goes
stale the moment the backend gate changes). Two entries added; the gate and its 25-fixture self-test are
both green.

## Extra coverage — the locking and lock-TTL path

`payout/locking-close-and-ttl.spec.ts` (11 tests) covers two of the untested surfaces ticket 24 flagged:

- **`PayrollRunLockService` generation-lock takeover.** A fresh token and timestamp are stamped when the
  run is free; the conditional `WHERE` really carries a **15-minute** staleness cutoff (the predicate's
  bound Date is extracted and measured — mutating `LOCK_TTL_MS` to 1 minute fails two tests, so the
  assertion is live, not decorative); a live lock that matches nothing 409s; a returning row carrying
  **another acquirer's** token 409s rather than reporting a lock we do not hold; `release` scopes the clear
  to the caller's own token, so a takeover winner survives the loser's release; and
  `assertNoOtherActiveGeneration` blocks a sibling live generation while letting a stale one through.
- **`LockingService.close()`** — the terminal transition, previously untested: a published run closes with
  the actor membership stamped and a `CLOSED` run event written; another org's run 404s (never 403);
  a `PAID` run and an already-`CLOSED` run are both refused; and the optimistic-concurrency branch fires
  when the run drifts out of its read status before the update commits, writing no event.

**Not covered, honestly:** `writeTdsYtdLedger` and `BatchStatusService.importBankReturn` are still
untested, and there is still no single test spanning generate → reconcile. Those were out of budget.

## Gates — follow-up pass

Backend (`pnpm -C streamlineos-backend`):

| Command | Exit | Number |
|---|---|---|
| `jest --runInBand --testPathPattern=payroll` | 0 | **124 suites / 955 tests** (from 121/931) |
| `typecheck` | 0 | **0 errors** (the 4 cron/workflows errors ticket 24 saw are gone) |
| `check:spec-typecheck` | 0 | passed — it caught a real constructor-arity break in `filings-list-pagination.spec.ts` that ts-jest `isolatedModules` could not |
| `check:unbounded-reads` | 0 | ACTIONABLE 0, 0 unclassified |
| `check:db-call-count` | 1 | ACTIONABLE **0 in payroll**; `/payroll/runs/inputs.service.ts` left the REGRESSED list (8 → 7, remainder all build/cron/kb/organization/support/surveys) |
| `check:idempotent-commands` | 0 | every in-scope mutating handler carries `@Idempotent` |
| `check:outbox-consumers` | 0 | every emitted event type has a consumer |
| `check:module-gate` · `check:cache-invalidation` · `check:tenant-indexes` | 0 | all pass (tenant-indexes is now green repo-wide) |
| `check:module-di` · `check:cycles` · `check:route-classification` · `check:route-duplicates` · `check:contract-breaking-change` · `check:contract-registry` · `check:openapi-coverage` · `check:bounded-contracts` · `check:fire-and-forget` · `check:bulk-id-limits` | 0 | all pass |
| `check:file-sizes` | 1 | 4 files over 500 lines, **0 payroll** (splitting the filings service kept it out) |

Frontend (`pnpm -C streamlineos-frontend/frontend`):

| Command | Exit | Number |
|---|---|---|
| `type-check` | 0 | clean |
| `check:command-catalog` | 0 | 25/25 self-test fixtures; 0 WRONG-KEY |
| `check:query-scope` · `check:effect-fetches` · `check:colors` · `check:client-pages` · `check:contract-drift` · `check:cycles` · `check:route-access-contract` · `check:query-signal` · `check:icon-labels` · `check:over-300` | 0 | all pass |
| `check:file-sizes` | 1 | `hooks/api/notifications-inbox.ts` only — **0 payroll** |
| `check:dead-code` | 1 | 3 unclassified exports in `features/build`, `features/mail`, `app/api/media` — **0 payroll** |
| `check:empty-states` | 1 | `features/workflows/builder/workflow-builder-canvas.tsx` — **not payroll** |

`next build` and the seeded DB e2e suite were **NOT run** in this pass either.

## Files changed — follow-up pass

Backend:
- `src/modules/payroll/runs/lib/input-puller.ts` — `pullAttendanceInputsByUser` + `PAYROLL_INPUT_PULL_CHUNK`; deleted the two now-unused single-user pullers
- `src/modules/payroll/runs/inputs.service.ts` — batched pull, bulk upsert, probe-and-fail cap, `orgId` on the delete
- `src/modules/payroll/runs/__tests__/reimport-inputs-call-count.spec.ts` *(new)*
- `src/modules/payroll/filings/filings-export-job.service.ts` *(new)* — request-side export seam
- `src/modules/payroll/filings/filings.service.ts` — export-job orchestration moved out; `prepareExport` is now documented as worker-side
- `src/modules/payroll/filings/filings.controller.ts` — `POST export` → 202 + job; new `GET export/jobs/:jobId`
- `src/modules/payroll/filings/__tests__/filings-export-async.spec.ts` *(new)*
- `src/modules/payroll/jobs/payroll-jobs-worker.service.ts` — pass `runId`/`month` to `prepareExport`
- `src/modules/payroll/payroll.module.ts` — register `PayrollFilingsExportJobService`
- `src/modules/payroll/payout/locking-close-and-ttl.spec.ts` *(new)*

Frontend:
- `hooks/api/payroll/filings.ts` — `FilingExportJob`, `useFilingExportJob`, async `usePrepareFilingExport`
- `hooks/api/payroll/reports.ts` — export hooks declare `payroll:reports:export`
- `features/payroll/taxes/filing-export-dialog.tsx` *(new)* — dialog + job polling
- `features/payroll/taxes/filings-tab.tsx` — uses the dialog
- `lib/query-keys/payroll.ts` — `filingExportJob(jobId)`
- `scripts/check-command-catalog.mjs` — two `STRICTER_KEYS` entries (the gate's own sanctioned mechanism)

## Cross-territory notes from this pass

1. **`src/scripts/baselines/db-call-count-classification.json` was NOT staged.** Another agent is
   concurrently rewriting it (reclassifying build/cron/kb/organization entries from `N+1-FIXED` to
   `ACTIONABLE`/`FALSE-POSITIVE`). My two payroll entries — a `FALSE-POSITIVE` for
   `/payroll/runs/lib/input-puller.ts` and a refreshed note on `/payroll/runs/inputs.service.ts` — are
   written into the working tree and will travel with whoever commits that file. Staging it would have
   swallowed their in-progress work.
2. **`check:db-call-count`'s detector is no longer blind** to DB work behind a helper or to a chain split
   across lines; ticket 24's finding #6 is fixed by someone else. It still cannot distinguish a bounded
   chunk loop from an N+1, which is what the `FALSE-POSITIVE` verdict is for.
3. `check:file-sizes` (backend) fails on `ai-gateway-runner.helper.ts`, `cron-hr-retention.service.ts`,
   `gdpr-subject-erasure.service.ts`, `storage.service.ts`; frontend on `hooks/api/notifications-inbox.ts`.
   None are payroll.
4. `check:dead-code` (frontend) has 3 unclassified exports and `check:empty-states` one hand-rolled block,
   all outside payroll.
