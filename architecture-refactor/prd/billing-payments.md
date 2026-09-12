# Billing and payments

The previous audit recorded passing focused checks. The 2026-09-12 recovery review
found current-source checkout-binding and promotion-authority defects; see
[the access and billing recovery assignment](recovery-access-billing.md).
Those local repairs must land before the deployed proof below. Earlier passing
tests do not certify these untested business invariants.

## Prerequisite status — 2026-09-12

The local repairs BILL-001 depends on have LANDED. Revision pair: root `967e6a549`,
backend `4ef590f3a`.

| Repair | State |
|---|---|
| Platform merchant boundary — subscription checkout uses StreamlineOS's own configured merchant, not the tenant's `payment_providers` rows | Landed |
| Durable `subscription_purchases` binding — plan, cycle, amount, currency and coupon are read from the stored purchase, never from the confirm body | Landed |
| Provider captured-amount check — `fetchPayment` asserts order id, `captured` status, amount and currency before activation | Landed |
| Callback and webhook converge on one conditional `PENDING -> ACTIVATED` transition | Landed |
| Platform promotions moved to platform-only keys, so a customer cannot mint a discount against what they owe | Landed |

Evidence at that pair: backend `tsc --noEmit` clean across `src/modules/billing`
under both tsconfigs; billing units **63 suites / 782 tests**; access and RBAC
**92 suites / 1286 tests**; frontend billing **9 suites / 115 tests**, including
`catalog-sync.test.ts` (both catalog directions).

These are mocked unit checks and a typecheck. They do NOT constitute payment
verification: no provider sandbox call, no database, no browser, and the
`subscription_purchases` migration is journaled but **has not been executed against
any database**. BILL-001 and BILL-002 below remain BLOCKED-EXTERNAL and are not
satisfied by anything in this section.

## BILL-001 — Prove deployed payment failure and recovery paths
Status: BLOCKED-EXTERNAL
Maps to: PRD-C162
Parallel group: 3
Depends on: relevant access/billing checkout, merchant/webhook, activation and reconciliation repairs; coordinator records the integrated revision.
Prerequisite: MET at root `967e6a549` / backend `4ef590f3a` — see the prerequisite status above.
Owner: payments operator

Why this cannot be closed from a development session: it requires a named disposable
environment with real Razorpay sandbox credentials, an executed migration, and a
forced provider-side failure the sandbox cannot induce on demand. First step for the
payments operator is to apply the `subscription_purchases` migration on that
environment and re-run the reproduction, because every check recorded above is mocked.

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
