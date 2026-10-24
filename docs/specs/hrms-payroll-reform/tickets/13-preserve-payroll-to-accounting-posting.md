# 13: Preserve payroll-to-accounting posting

**What to build:** Each approved payroll outcome produces a balanced, traceable accounting intent that can be retried and reconciled safely.

**Blocked by:** 07 Protect input-period transitions and corrections; 08 Use exact money, rates, dates and time quantities

**Status:** ready-for-agent

**Program:** AP-07

**Requirements:** FR-ARCH-020

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-020-01:** Payroll sends balanced versioned journal intent to Accounting through the existing posting command and idempotent consumer; it does not create a competing direct journal write path.
- [ ] **AC-ARCH-020-02:** Test commit-before-consumer crash, duplicate delivery, rejection, timeout, reversal/replacement and reconciliation of posted status.
- [ ] **AC-ARCH-020-03:** Net pay, payout ledger, employer liabilities and journal control totals tie to immutable run facts; posting success remains distinct from payout and filing success.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

