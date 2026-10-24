# 14: Publish privacy-safe Calendar projections

**What to build:** Calendar shows leave and workforce events at the viewer’s permitted detail while exposing projection failure and recovery honestly.

**Blocked by:** 03 Enforce sensitive reads and rapid revocation; 11 Make leave-to-payroll handoff durable

**Status:** ready-for-agent

**Program:** AP-08

**Requirements:** FR-ARCH-021

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-021-01:** Retain registered HR Calendar source adapters; publish bounded source-id/version event projections with safe label, timezone, status, visibility and canonical deep link.
- [ ] **AC-ARCH-021-02:** Colleague leave reason and restricted HR/pay fields never leak into events, availability, notifications or cached views. Permission changes and cancellation update/remove projections safely.
- [ ] **AC-ARCH-021-03:** Approved leave blocks availability; failed/unreadable source yields explicit unknown/failed coverage, not free time. Preserve existing privacy/failure behavior and focused tests.
- [ ] **AC-ARCH-021-04:** Move HR window query ownership into the domain query module; test window splitting, exclusive all-day end, DST/overnight, disabled source, delayed version, out-of-order cancellation and bounded cross-zone reads.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

