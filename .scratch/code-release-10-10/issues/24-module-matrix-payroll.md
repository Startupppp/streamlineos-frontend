# 24 — Payroll module release matrix

**What to build:** The §10 inventory-and-verdict pass for Payroll plus its §10.7 criteria: normalized and immutable financial records, bounded indexed reads, and UI that survives conflict and partial failure.

**Blocked by:** 20.

**Status:** 6 of 8 closed — boxes 1 and 2 PARTIAL, both needing hand-authored migrations. Report at `reports/24-payroll.md`.

- [ ] Payroll runs, components, assignments, calculations, payslips, taxes, deductions and payment/reconciliation history are normalized, tenant-safe and immutable where financial.
  PARTIAL: normalized and tenant-safe hold (0 payroll failures in `check:tenant-indexes`). Fixed three missing immutability guards (published payslips could be silently overwritten by a re-publish; acknowledged filings could be re-acknowledged; a PAID bank item could be flipped to FAILED) and three writes missing an `orgId` predicate. Still open: `payroll_journal_batches`/`_lines`, `payroll_bank_batches`/`_items`, `payroll_filings` and `payroll_tds_ytd_ledger` have no DB-level immutability trigger — only `payroll_run_employees` and `payroll_line_items` do (migration 0445). Closing it needs a hand-authored migration, which is a schema change outside a verdict pass.
- [ ] Run and item reads are bounded with indexed employee/period/status paths and no N+1 calculation; exports are asynchronous.
  PARTIAL: the two previously-regressed input-length bounds still hold (both trace to a DB-side cap, not a caller array). Fixed two real bound failures: `manager-inbox.service.ts` read every published payslip in history for up to 500 reports, and its guarding spec passed on the sibling query; `tax-admin.service.ts exportCsv` silently truncated at 100 rows. The run export is correctly async. Still open: `runs/inputs.service.ts:187` is a real N+1 (~4000 serial round-trips) that `check:db-call-count` cannot see because its detector is single-line only; `POST /payroll/filings/export` builds an uncapped CSV synchronously; and three index gaps (`(orgId, runId, status)` on run employees, `(orgId, entityId, month, id)` on runs, `(orgId, userId, status)` on payslip publications) are migrations.
- [x] Caches invalidate correctly after lock, publish and reversal.
- [x] Payroll commits an idempotent Accounting-posting intent through the transactional outbox; Accounting consumes it asynchronously and idempotently. A brief pending state is acceptable; a lost or dangling journal is not.
- [x] Run-state UI covers conflict, retry and partial failure; downloads are permission-checked at request time, not only at list time.
- [x] Calculation, locking and reconciliation are covered end to end.
- [x] Payroll administration stays under its own routes; employee pay remains self-service and is not duplicated into Settings.
- [x] The module's files are inventoried and classified KEEP/REFACTOR/REMOVE with the concrete failure named for each non-KEEP verdict.

**Proof:** backend `jest --runInBand --testPathPattern=payroll` exit 0, 121 suites / 931 tests (baseline 119/914). Backend `typecheck` exit 2 with 0 payroll errors (4 in cron/workflows). Frontend `type-check` exit 0. `check:outbox-consumers`, `check:idempotent-commands`, `check:cache-invalidation`, `check:module-gate`, `check:query-scope`, `check:command-catalog`, `check:client-pages` all exit 0. `check:tenant-indexes` and `check:db-call-count` fail outside payroll. `next build` and the seeded DB e2e suite were NOT run.
