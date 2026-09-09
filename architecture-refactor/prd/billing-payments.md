# Billing and payments

Current-source unit and focused checks are green. No local billing implementation defect remains in the audited scope.

## BILL-001 — Prove deployed payment failure and recovery paths
Status: BLOCKED-EXTERNAL
Maps to: PRD-C162
Parallel group: 3
Depends on: none
Owner: payments operator

Scope: Exercise deployed provider failure, webhook retry, reconciliation, and recovery paths, including a forced provider-side failure that the Razorpay sandbox cannot induce locally.

Completion: Timestamped provider and application evidence proves failure detection, idempotent recovery, ledger reconciliation, and no duplicate charge.

## BILL-002 — Record Finance release approval
Status: BLOCKED-EXTERNAL
Maps to: PRD-C182, PRD-C193
Parallel group: 3
Depends on: BILL-001
Owner: Finance approver

Scope: Review payment evidence and record the accountable Finance/final release decision.

Completion: The named approver, decision, timestamp, scope, and residual risks are recorded in the release authority evidence.

