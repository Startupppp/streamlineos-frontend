# 23: Move Accounting payable side effects to the outbox

**What to build:** Payable and approval notifications are committed durably and delivered idempotently after successful financial writes.

**Blocked by:** None (can start immediately).

**Status:** implemented

- [x] Financial state and outbox intent commit atomically.
- [x] Duplicate retries cannot repeat an approval or external delivery.
- [x] Failures are observable and dead-lettered rather than swallowed.
- [x] Rollback, retry, replay and audit tests pass.

Evidence: the payable workflow and bill-approved outbox consumer are covered by focused accounting tests; billing/accounting verification passes.
