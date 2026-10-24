# 23: Instrument recovery and operational controls

**What to build:** Operators can identify and repair lag, dead letters, import conflicts, unknown provider outcomes and failed recovery at a fixed revision.

**Blocked by:** 09 Reconcile bank returns per row; 10 Represent payout and payroll-run states honestly; 11 Make leave-to-payroll handoff durable; 12 Make accepted-hire onboarding repairable; 13 Preserve payroll-to-accounting posting; 14 Publish privacy-safe Calendar projections; 15 Deepen governed insights and AskOS provenance; 16 Correct backend and frontend cache identity; 17 Unify employee SSR and infinite-query hydration; 18 Complete Action Center decisions and navigation; 19 Bound complete queries and deepen modules; 20 Make document publication recoverable; 21 Secure export creation and downloads; 22 Govern retention and accountless document delivery

**Status:** ready-for-agent

**Program:** AP-13

**Requirements:** FR-ARCH-034

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-034-01:** Trace correlation and durable command/event/generation IDs across source, consumer, calculation, payout, journal and document publication without logging raw sensitive payloads.
- [ ] **AC-ARCH-034-02:** Expose and alert on projection lag, failed namespace invalidation, outbox backlog/dead letter, import row conflict, unknown provider state and orphan cleanup; name support owner and reconciliation action.
- [ ] **AC-ARCH-034-03:** Verify existing PRD06a availability, latency, scale, unknown-state alert and RPO/RTO/restore gates at fixed revisions. Audit report proposed numbers cannot weaken normative targets.
- [ ] **AC-ARCH-034-04:** Run restore and replay drills with source checksum/control totals and reconcile external actions after restore; evidence includes environment, dataset, timestamps and observer.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

