# 11: Make leave-to-payroll handoff durable

**What to build:** Approved leave and time changes reach Payroll and downstream readers through replayable, observable handoffs.

**Blocked by:** 06 Freeze complete payroll source snapshots; 07 Protect input-period transitions and corrections; 08 Use exact money, rates, dates and time quantities

**Status:** ready-for-agent

**Program:** AP-07

**Requirements:** FR-ARCH-018

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-018-01:** Commit approved/cancelled/corrected time fact and required downstream intent together where acknowledged crash-loss matters. Use existing outbox/inbox infrastructure with schema version, source version, actor authority and correlation.
- [ ] **AC-ARCH-018-02:** Idempotent payroll consumers update open input projections once; frozen generations receive explicit late-change/correction state. Retry, dead-letter, lag and reconciliation have an owner.
- [ ] **AC-ARCH-018-03:** Test source commit then process crash, duplicate/out-of-order delivery, delayed consumer, cancellation and frozen-period correction. Logged fire-and-forget completion is insufficient.
- [ ] **AC-ARCH-018-04:** Preserve durable notification behavior and owner-specific cache/Calendar invalidation; transaction-scoped handles cannot escape into deferred work.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

