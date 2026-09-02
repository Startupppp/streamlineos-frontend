# 24 — Payroll module release matrix

**What to build:** The §10 inventory-and-verdict pass for Payroll plus its §10.7 criteria: normalized and immutable financial records, bounded indexed reads, and UI that survives conflict and partial failure.

**Blocked by:** 20.

**Status:** ready-for-agent

- [ ] Payroll runs, components, assignments, calculations, payslips, taxes, deductions and payment/reconciliation history are normalized, tenant-safe and immutable where financial.
- [ ] Run and item reads are bounded with indexed employee/period/status paths and no N+1 calculation; exports are asynchronous.
- [ ] Caches invalidate correctly after lock, publish and reversal.
- [ ] Payroll commits an idempotent Accounting-posting intent through the transactional outbox; Accounting consumes it asynchronously and idempotently. A brief pending state is acceptable; a lost or dangling journal is not.
- [ ] Run-state UI covers conflict, retry and partial failure; downloads are permission-checked at request time, not only at list time.
- [ ] Calculation, locking and reconciliation are covered end to end.
- [ ] Payroll administration stays under its own routes; employee pay remains self-service and is not duplicated into Settings.
- [ ] The module's files are inventoried and classified KEEP/REFACTOR/REMOVE with the concrete failure named for each non-KEEP verdict.
