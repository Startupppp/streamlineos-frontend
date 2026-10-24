# 25: Execute expand-reconcile-enforce-retire migrations

**What to build:** Existing data and callers move to the new domain contracts through a resumable cutover with rollback and zero-caller retirement evidence.

**Blocked by:** 09 Reconcile bank returns per row; 10 Represent payout and payroll-run states honestly; 11 Make leave-to-payroll handoff durable; 12 Make accepted-hire onboarding repairable; 13 Preserve payroll-to-accounting posting; 14 Publish privacy-safe Calendar projections; 15 Deepen governed insights and AskOS provenance; 16 Correct backend and frontend cache identity; 17 Unify employee SSR and infinite-query hydration; 18 Complete Action Center decisions and navigation; 19 Bound complete queries and deepen modules; 20 Make document publication recoverable; 21 Secure export creation and downloads; 22 Govern retention and accountless document delivery

**Status:** ready-for-agent

**Program:** AP-13

**Requirements:** FR-ARCH-036

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-036-01:** Record exact table/route/caller/write ownership and migration dependencies before cutover. Expand with versions/mappings/receipts, backfill resumably and quarantine ambiguous records.
- [ ] **AC-ARCH-036-02:** Keep one write owner; use dual/shadow reads to compare complete outputs and access projections, then enforce tenant FKs/uniqueness/interval/completeness constraints after reconciliation.
- [ ] **AC-ARCH-036-03:** Cut over consumers with rollback/forward-correction plan, current-versus-old schema compatibility and control totals. Immutable payroll history and source lineage remain available.
- [ ] **AC-ARCH-036-04:** Retire old routes/callers/aliases/files only with zero-caller and migration evidence; preserve open legacy acceptance work. Rehearse empty-DB and existing-data migrations and restore.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

