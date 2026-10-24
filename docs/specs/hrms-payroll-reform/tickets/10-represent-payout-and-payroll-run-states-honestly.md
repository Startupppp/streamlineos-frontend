# 10: Represent payout and payroll-run states honestly

**What to build:** Operators and workers see unknown, partial, returned and reconciled payment states with safe run transitions and stale approval handling.

**Blocked by:** 09 Reconcile bank returns per row

**Status:** ready-for-agent

**Program:** AP-06

**Requirements:** FR-ARCH-016, FR-ARCH-017

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-016-01:** Document existing manual bank-file/advice/CSV capability and unresolved SENT behavior. Distinguish requested, sent, unknown/unresolved, failed, returned and paid outcomes semantically; preserve existing supported states where an adapter translation suffices.
- [ ] **AC-ARCH-016-02:** Timeout or missing acknowledgment never becomes successful payment or immediate retry. Reconcile status before reissue and preserve beneficiary version, amount, reference and idempotency.
- [ ] **AC-ARCH-016-03:** Direct provider rail is P1/partner-dependent: before enabling it, prove signed callbacks, out-of-order replay, inquiry, partial failure and returned-payment recovery using mock plus provider sandbox evidence.
- [ ] **AC-ARCH-016-04:** P0 manual fallback records evidence and unresolved items without claiming automatic bank connectivity or settlement. Never downgrade existing payment controls because a partner is unavailable.
- [ ] **AC-ARCH-017-01:** Preserve live-payee uniqueness, batch replay protection, full paid-coverage completion, held/failed payee treatment and existing lock/reversal compare-and-set.
- [ ] **AC-ARCH-017-02:** Approve/reject/pay commands recheck current actor, maker/checker, run/result/stage version and guard state. Duplicate/stale/concurrent actions yield a stable idempotent result or 409 and current state.
- [ ] **AC-ARCH-017-03:** An open approval dialog or cached stage cannot authorize a changed amount after preview or a revoked actor. Exact run/stage views recover from conflict without false success.
- [ ] **AC-ARCH-017-04:** Test zero eligible payees, partial paid coverage, duplicate batch, approval/rejection race, stale bulk decision and paid/closed reversal rejection through the owning interface.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

