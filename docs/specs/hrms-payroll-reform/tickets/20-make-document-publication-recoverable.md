# 20: Make document publication recoverable

**What to build:** A pay or statutory document becomes available only after its storage and record publication agree, with cleanup and retry recovery.

**Blocked by:** 03 Enforce sensitive reads and rapid revocation; 05 Publish strict versioned wire contracts; 06 Freeze complete payroll source snapshots

**Status:** ready-for-agent

**Program:** AP-12

**Requirements:** FR-ARCH-031

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-031-01:** Stage uploaded objects and commit the document version/pointer with owner metadata; failed DB replacement cannot leave an untracked permanent object.
- [ ] **AC-ARCH-031-02:** Deletion of the prior object after a successful replacement is replayable cleanup; cleanup failure does not ambiguously report the committed replacement as wholly failed.
- [ ] **AC-ARCH-031-03:** Retain publication/version history, source evidence and legal-hold references; published, delivered and paid/officially-issued are separate outcomes.
- [ ] **AC-ARCH-031-04:** Test failure before/after upload, DB rollback, duplicate request, old-object delete retry, orphan sweep and correction without breaking prior issued references.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

