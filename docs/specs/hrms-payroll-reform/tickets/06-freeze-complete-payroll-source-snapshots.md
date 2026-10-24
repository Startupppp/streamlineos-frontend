# 06: Freeze complete payroll source snapshots

**What to build:** A payroll calculation consumes a validated, complete, traceable generation of every required source fact.

**Blocked by:** 04 Unify identity, Employment Facts and payroll eligibility; 05 Publish strict versioned wire contracts

**Status:** ready-for-agent

**Program:** AP-04

**Requirements:** FR-ARCH-009, FR-ARCH-010

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-009-01:** Define one strict versioned discriminated section contract for the eight current sections and any approved extension, including typed source references, exact quantities and source versions. Validate before persistence and consumption.
- [ ] **AC-ARCH-009-02:** Employment Facts, Time Input Package, Approved Reimbursement, compensation and deduction inputs have explicit producer/consumer ownership, watermark/checksum, effective time and supersession semantics.
- [ ] **AC-ARCH-009-03:** Payroll reads locked input through the owning interface; generic record casts, malformed-payload skipping and ambiguous numeric defaults cannot bypass validation.
- [ ] **AC-ARCH-009-04:** Support declared old schema versions through explicit migration/read adapters; unsupported or corrupt locked versions produce a repairable blocker, not live-source substitution.
- [ ] **AC-ARCH-010-01:** For every eligible employment, validate required sections, uniqueness, referenced owner versions, quantity consistency and checksum before lock/calculation. Name each missing or invalid section and responsible repair owner.
- [ ] **AC-ARCH-010-02:** Represent absent/unavailable attendance distinctly from measured zero attendance and an approved zero-pay result. A missing source cannot become full month, zero deduction or ACTIVE employment by fallback.
- [ ] **AC-ARCH-010-03:** Persist the eligibility set, capture watermark, generation and source reference manifest. Prove a source row consumed twice cannot duplicate a reimbursement, loan recovery or time quantity.
- [ ] **AC-ARCH-010-04:** Rebuild comparison exposes late facts and source changes; a valid frozen generation reproduces the same calculated input package.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

