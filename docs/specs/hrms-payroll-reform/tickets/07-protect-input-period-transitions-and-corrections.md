# 07: Protect input-period transitions and corrections

**What to build:** Payroll operators build, lock, unlock and correct a period without races or mutation of locked history.

**Blocked by:** 06 Freeze complete payroll source snapshots

**Status:** ready-for-agent

**Program:** AP-05

**Requirements:** FR-ARCH-011, FR-ARCH-012

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-011-01:** Commands include expected version/generation and idempotency. State changes compare-and-set expected status/version in the transaction; losing commands return 409/current state with no partial effect.
- [ ] **AC-ARCH-011-02:** Build into a new generation; an old or delayed builder cannot replace a newer or locked generation. Claim/lease/fencing and crash recovery are explicit where work spans transactions.
- [ ] **AC-ARCH-011-03:** Lock checks complete validated generation and freezes source records atomically. Preserve current rollback-on-freeze-failure behavior; audit/outbox intent is committed with the outcome.
- [ ] **AC-ARCH-011-04:** Use competing real PostgreSQL transactions for build/build, build/lock and lock/unlock; prove one coherent winner and immutable prior generation. Query-chain mocks alone cannot close this criterion.
- [ ] **AC-ARCH-012-01:** Late attendance/leave/compensation/claim changes identify the affected generation and run. Locked/paid/closed facts stay immutable; revisions create linked adjustments, reversals or superseding publications.
- [ ] **AC-ARCH-012-02:** Unlock/reopen cannot imply reversal of an external payment, filing, posted journal or issued document. Apply the existing 00b/05c transition contracts and correction lineage.
- [ ] **AC-ARCH-012-03:** Test backdated salary, cancelled paid leave, corrected claim, rescinded hire and exited worker after cutoff; readiness and audit expose the unresolved impact.
- [ ] **AC-ARCH-012-04:** Preserve existing Payroll run lock/reversal CAS and PAID/CLOSED rejection rules rather than replacing them with generic status updates.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

