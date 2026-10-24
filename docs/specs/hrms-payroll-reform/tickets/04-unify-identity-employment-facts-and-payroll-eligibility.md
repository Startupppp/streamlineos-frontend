# 04: Unify identity, Employment Facts and payroll eligibility

**What to build:** A worker has one effective-dated employment interpretation and an explicit answer to whether each pay run may include them.

**Blocked by:** 01 Publish the executable baseline

**Status:** ready-for-agent

**Program:** AP-03

**Requirements:** FR-ARCH-006, FR-ARCH-007

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-006-01:** Publish the current read/write ownership and ID mapping for person, membership, worker, engagement, employment, position and payroll profile. Treat IDs as distinct; record source owner/version, effective interval and reconciliation state.
- [ ] **AC-ARCH-006-02:** Directory owns person/membership identity; the normative 00a Core HR ownership of worker/engagement/employment business facts governs. Existing Directory table location or legacy migration facade does not authorize a second independent writer.
- [ ] **AC-ARCH-006-03:** Use the owner Employment Facts interface rather than new ad-hoc joins or cross-module table writes. General facts exclude restricted salary/bank/tax/medical/case data.
- [ ] **AC-ARCH-006-04:** Reconcile concurrent employments, transfer, rehire, changed email, archived membership and historical payroll references before enforcing cutover constraints. Reconcile HR terms into CONTEXT.md during implementation using the domain-modeling skill.
- [ ] **AC-ARCH-007-01:** Eligibility comes from the declared employment/pay-group/legal-entity scope and effective period, not every active organization membership. Missing employment never silently defaults to ACTIVE.
- [ ] **AC-ARCH-007-02:** Produce a complete included/excluded subject list with reasons and an owner for repair. A safety cap fails visibly or pages to completion; it never creates a partial payroll snapshot.
- [ ] **AC-ARCH-007-03:** Preserve accountless worker payees and distinguish userId, workerId, employmentId and payrollProfileId through input, payout and document delivery.
- [ ] **AC-ARCH-007-04:** Test joiner/leaver boundaries, suspended/archived worker, concurrent employments, contractor exclusion and rehire without duplicate payee identity.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

