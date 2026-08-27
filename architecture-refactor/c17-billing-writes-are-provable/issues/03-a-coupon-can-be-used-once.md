# 03 — A coupon can be used once

**What to build:** A single-use promotion code can be used once. Today two guards exist and neither bites — the usage counter is never incremented and no redemption row is ever inserted — so a single-use code is reusable, forever, by anyone.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] The usage counter is incremented and the redemption row inserted in the same transaction that applies the discount. — `billing.service.ts:214-243` inside the `db.transaction` that activates the subscription: `SELECT … FOR UPDATE`, then `UPDATE coupons SET used_count = used_count + 1`, then `INSERT INTO coupon_redemptions`. Asserted by "the counter is incremented and the redemption inserted in the transaction that activates" (one locked select, two inserts, two updates, one transaction).
- [x] A unique constraint does the actual enforcement, not an application-level check. — `uq_coupon_redemptions_coupon_org UNIQUE (coupon_id, org_id)`, declared at `db/schema/common/shared.ts:442` and **verified present on the live database** by querying `pg_constraint`. It is created inline by `migrations/0000_light_vance_astro.sql:7229`, so it has been enforcing since the first migration. `billing.service.ts:250` maps its `23505` to `ConflictException` instead of the generic idempotent-replay path.
- [x] Two simultaneous redemptions result in exactly one success. — the loser's `23505` becomes a `ConflictException` rather than a silent success ("two simultaneous redemptions: the loser's unique violation becomes a conflict"), and "exactly one of two concurrent redemptions succeeds" asserts one fulfilled and one rejected across overlapping calls. **What is proven where:** the constraint's existence is proven against the real database (`pg_constraint`); the service's handling of the violation is proven by unit test. A two-connection race against Postgres was **not** run — there is no integration harness in this lane.
- [x] Redemptions are recorded so campaign performance is measurable. — every redemption writes `couponId`, `orgId`, `userId` and `redeemedAt`; `BillingCoupons.list` (`billing-coupons.ts`) returns coupons `with: { redemptions: true }` alongside `usedCount`. `coupon_redemptions.amount` is still null — it cannot be computed until `verifyPaymentSchema` carries `billingCycle`; see `architecture-refactor/OPEN-FINDINGS.md` §2.
- [x] A usage limit above one is enforced at exactly that number. — `coupon-pricing.ts:52` refuses at `usedCount >= maxUses`, checked under the row lock at `billing.service.ts:224`. Boundary tests at both levels: `coupon-pricing.spec.ts` allows redemptions 0/1/2 of 3 and refuses the fourth; `billing.service.spec.ts` runs the same boundary through `verifyAndActivate` and asserts the refusal happens before the redemption row is written.

## Todo

- [x] Add the constraint first — the application check loses under concurrency — already present since `0000`; confirmed against the live database rather than assumed.
- [x] Write the concurrent test; a sequential one passes while the bug is live — `billing.service.spec.ts` "exactly one of two concurrent redemptions succeeds".
- [x] Ensure the transaction mock invokes its callback — `makeDb` in `billing.service.spec.ts` invokes the callback and its tx carries `execute`; the coupon assertions run against the real transaction body.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Notes

**The session brief's blocker was wrong.** It stated that c17-03's unique constraint is migration
`0473`, "written and journalled but UNAPPLIED". `0473` is a no-op: it re-asserts the constraint
behind an `IF NOT EXISTS`, and `0000` already created it inline. `pg_constraint` on the `.env`
database returns `uq_coupon_redemptions_coupon_org UNIQUE (coupon_id, org_id)`. The criterion is
therefore satisfied by a real constraint, not by an application check.

A second, unlisted defect in the same class was fixed: **`createOrder` priced coupons with no
eligibility rules at all** — only `isActive`. An expired, exhausted or wrong-plan coupon still
discounted the provider order, the customer paid the discounted amount, and `verifyAndActivate` then
refused the redemption and rolled back — a charge with no subscription. `evaluateCoupon`
(`coupon-pricing.ts`) is now the single evaluator for pricing, validation and redemption, and
`createOrder` refuses with the reason rather than under-charging. Five tests.

---

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
