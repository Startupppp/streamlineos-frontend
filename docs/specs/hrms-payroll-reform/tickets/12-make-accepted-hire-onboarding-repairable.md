# 12: Make accepted-hire onboarding repairable

**What to build:** An accepted hire creates the right worker and employment facts once, with visible recovery for incomplete onboarding and BGV handoff.

**Blocked by:** 04 Unify identity, Employment Facts and payroll eligibility; 05 Publish strict versioned wire contracts

**Status:** ready-for-agent

**Program:** AP-07

**Requirements:** FR-ARCH-019

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-019-01:** Version the AcceptedHire position/worker/employment mapping with idempotency, acknowledgment/reject, update/rescind and reconciliation. Recruitment owns pipeline/offer; HR owns accepted-hire lifecycle.
- [ ] **AC-ARCH-019-02:** Distinguish external hire.handoff webhook publication from internal onboarding/BGV completion. Deferred failures expose retryable/repairable state, not an implied successful onboarding.
- [ ] **AC-ARCH-019-03:** Use stable source identities rather than email-only matching as the final authority; no prejoining employment or admission conflict has a named repair path.
- [ ] **AC-ARCH-019-04:** Test duplicate acceptance, rescind, worker without login, changed email, missing prejoining employment and crash between hire commit and onboarding/BGV start.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

