# 23: Move Accounting payable side effects to the outbox

**What to build:** Payable and approval notifications are committed durably and delivered idempotently after successful financial writes.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Financial state and outbox intent commit atomically.
- [ ] Duplicate retries cannot repeat an approval or external delivery.
- [ ] Failures are observable and dead-lettered rather than swallowed.
- [ ] Rollback, retry, replay and audit tests pass.
