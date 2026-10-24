# 09: Reconcile bank returns per row

**What to build:** Payroll operators import a bank return once and see correct per-row outcomes, including duplicates and conflicts, without partial corruption.

**Blocked by:** 07 Protect input-period transitions and corrections; 08 Use exact money, rates, dates and time quantities

**Status:** ready-for-agent

**Program:** AP-06

**Requirements:** FR-ARCH-015

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-015-01:** Preflight complete file format and item resolution before mutation, including duplicate PAID/FAILED, contradictory outcomes, itemId/userId disagreement and worker-only payees. Quarantine ambiguous rows.
- [ ] **AC-ARCH-015-02:** Persist an idempotent outcome receipt keyed to batch/item/source return identity; same-file or repeated-file replay returns the same applied/duplicate/conflict classification without repeated events.
- [ ] **AC-ARCH-015-03:** If application is intentionally partial, expose durable per-row applied/rejected/unresolved state and resumable continuation. A later row error cannot present earlier committed work as wholly unapplied.
- [ ] **AC-ARCH-015-04:** Keep format parsing as an adapter behind one payout reconciliation module. Test interruption after row N, concurrent import, unknown item, malformed bytes and duplicate/conflicting return references.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

