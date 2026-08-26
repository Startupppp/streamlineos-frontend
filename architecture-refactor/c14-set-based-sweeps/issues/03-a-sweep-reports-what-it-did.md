# 03 — A sweep reports what it did

**What to build:** An operator can see how long each sweep took per organisation and what failed, so growth is visible before it becomes an incident and a failure names the tenant and record rather than disappearing.

**Blocked by:** 02 — The remaining tenant-growing sweeps are set-based

**Status:** done

## Acceptance criteria

- [x] Duration is recorded per sweep per organisation. — `backend/src/modules/cron/cron-leave.service.ts:44,60-66`: `sweepStart = Date.now()` before the per-org work, `logger.info("[monthly-leave-reset] org sweep complete", { orgId, durationMs: Date.now() - sweepStart, ... })` after.
- [x] A failure names the tenant and the record. — `backend/src/common/tenant/for-each-org.ts:54-63`: `logger.error(...)` carries `{ orgId: org.id, error, cause, code }`.
- [x] An error logs its underlying cause, not only its surface message — a driver failure inside a query template says nothing useful on its own. — `for-each-org.ts:54-63` extracts `err.cause` (Drizzle's own `.message` is only `"Failed query: <sql>"`) and the Postgres error `code` off the cause object.
- [x] One tenant's failure does not abort the run. — `for-each-org.ts:41-64`: each org runs inside its own `try/catch`; a caught error increments `failed` and the `for` loop continues to the next org.
- [x] Sweeps whose queries grow are covered by read budgets. — `backend/src/scripts/read-cost-budgets.mjs`: `leave-accrual-ledger-dedup` (ceiling 100 blocks, forbid-seq-scan on `hr_leave_ledger`) and `leave-accrual-balance-read` (ceiling 200 blocks, forbid-seq-scan on `leave_balances`) budget entries added, backed by migration `0513`'s indexes. `run-read-cost-budgets.mjs`'s fixture block now resolves `leaveTypeIds` (active MONTHLY `leave_policies` for the seed org) and `period` (matching `cron-leave.service.ts`'s `buildPeriodLabel` format) to feed them; both entries `SKIP` rather than fail when no monthly policies exist in the seed. Not runtime-verified against a live database — no DB access in this environment — but the entries pass `validateBudgets()`'s structural checks and the column/index names were verified against the schema and migration 0513, not guessed.

## Todo

- [x] Emit through the structured logger once c20-03 lands — `common/logger/logger.service.ts`'s `logger`, used throughout
- [x] Assert the cause is logged, not just an error — `for-each-org.ts:54-63` (pre-existing, not newly added)
- [x] Add budget entries for the growing queries — `read-cost-budgets.mjs`, see above
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Verification note (orchestrator, 2026-08-26):** four of five criteria were already satisfied by pre-existing `forEachOrg` infrastructure before this batch; the per-sweep duration log and the two budget entries were newly added across two passes. Verified directly against source, including the query column names against the actual schema files.

---

PRD: [`c14 — Background sweeps operate on sets, not on rows`](../prd.md) · Candidate index: [`../README.md`](../README.md)
