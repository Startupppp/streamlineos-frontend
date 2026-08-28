# 22: Move Expense side effects to the outbox

**What to build:** Expense notifications and integrations occur after the business transaction commits and survive process or provider failure.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Business state and outbox intent commit atomically.
- [ ] Consumers retry idempotently and dead-letter terminal failures.
- [ ] No unobserved fire-and-forget promise remains in owned Expense paths.
- [ ] Commit/rollback/retry and duplicate-delivery tests pass.
