# 15 — Self-serve plan change, proration and cancellation

**Status:** done — the arithmetic; the surfaces are ticket 13's.
**Track:** D — funnel
**Blocked by:** 02, 03

## Why

The exit should be as honest as the entrance.

## Acceptance criteria

- [ ] Seats can be added and removed without a support ticket.
- [ ] An upgrade mid-cycle charges the difference. **Proration arithmetic is unit-tested against worked examples**, at period boundaries and across a plan change on the last day of a month.
- [ ] A downgrade states what will be lost **before** it is applied, so a cheaper plan is not a surprise outage.
- [ ] Cancellation completes without a phone call.
- [ ] Every change is reflected in entitlements immediately, not at the next billing cycle.

## Notes (2026-08-26)

Days rather than seconds, deliberately. A customer can reconstruct "ten of thirty
days" on paper; they cannot reconstruct a second-precision fraction, and a
proration nobody can check is one they dispute.

**Each side rounds once** against the whole-period amount. Computing a daily rate
and multiplying rounds twice, and the second rounding is exactly where the
customer's arithmetic stops matching ours.

The change date is clamped into the period rather than trusted — dated before it
would credit more than was ever paid, dated after it would charge for days not in
it. A zero-day period throws rather than dividing by zero.

Tested against **worked examples with the numbers written out**, at both period
boundaries, across a 28-day February, on the last day of a month, and for every
one of thirty days.

`downgradeImpact` answers "what do I lose", which is the question a customer
actually has. A negative limit is unlimited and can never be exceeded; reading it
as zero would block every downgrade to an unlimited plan.

**Still open:** the self-serve surfaces that call this — seats, upgrade,
downgrade, cancel. The arithmetic is the part with money risk.