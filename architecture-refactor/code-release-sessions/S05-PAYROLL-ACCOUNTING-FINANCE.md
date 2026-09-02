# S05 — Payroll, Accounting and Finance

Status: active

Independent scope: backend Payroll, Accounting and Finance modules/workers and matching frontend routes/features/hooks. Billing subscription/payment internals remain S07. Schema and migration edits belong to S02.

Master coverage: sections 10.7 and 10.11 plus financial portions of sections 3–8, 11 and 12.

## Acceptance criteria

- [ ] Verify normalized tenant-safe payroll and ledger models, immutable posted history, balanced journals, reversals, precision, tax/currency and indexed period/status access paths.
- [ ] Prove Payroll calculation/lock/approve/publish/reverse/export transitions, separation of duties, self-payslip privacy and every mutation-hook authorization.
- [ ] Preserve crash-consistent Payroll-to-Accounting outbox posting and prove rollback, replay, duplicate, crash and terminal-failure behavior.
- [ ] Make reminders and exports bounded, resumable, asynchronous and queue-backed with leases, cancellation, retry/DLQ, secure download and retention behavior.
- [ ] Verify finance approvals, expenses/reimbursements, invoices/payments/reconciliation, DataScope and cross-tenant denial with minimal projections and exact invalidation.
- [ ] Audit owned folders/files, decompose only mixed responsibilities and remove only dependency-proven dead/duplicate surfaces.
- [ ] Run focused Payroll/Accounting/Finance tests and targeted financial/query/isolation gates; record results.
- [ ] Reconcile this session and the master PRD using the README protocol.

## Completion

- [ ] S05 is complete; commit/evidence: _pending_.
