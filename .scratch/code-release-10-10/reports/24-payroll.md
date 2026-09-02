# 24 — Payroll module release matrix

**Status:** 6 of 8 boxes closed. Boxes 1 and 2 are PARTIAL, both for reasons named below.

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

### 2. Bounded indexed reads, no N+1, async exports — **PARTIAL**

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

1. `runs/inputs.service.ts:187` is a **real N+1 the gate cannot see**: `for (const row of toReset) await
   pullAttendanceInputs(...)` over a 1000-row set, 2–4 queries each → up to ~4000 serial round-trips in
   one request. `check:db-call-count` only matches `db.x(` / `tx.x(` on a single line, so DB work behind
   a helper is invisible to it — the gate reports ACTIONABLE 0 and is wrong here. Batched equivalents
   (`loadLockedSectionsByUser`, `loadLiveAttendanceByUser`) already exist and are used by the calc path.
2. `POST /payroll/filings/export` builds the whole CSV **synchronously** in the request path, reading all
   run employees and all line items through `lib/payroll-keyset-batch.ts`, which accumulates every page
   with **no total ceiling**. Only the row *sample* is capped at 500; the CSV is not. A `FILING_EXPORT`
   job type already exists and this route does not use it.
3. Index gaps: no `(orgId, runId, status)` on `payroll_run_employees` (the status filter on the run-items
   list is unindexed, and the `users.name` sort is on the joined table so every page sorts the whole run
   partition); no `(orgId, entityId, month, id)` on `payroll_runs`; no `(orgId, userId, status)` on
   `payslip_publications`. These are migrations, not module code.

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
