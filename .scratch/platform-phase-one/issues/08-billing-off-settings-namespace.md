# 08 — A billing owner can run billing without global settings authority

**What to build:** Fifteen billing routes — checkout, add-on purchase, payment provider setup, billing profile, seats, referrals and coupons — are gated on the generic global settings permissions. Delegating billing therefore requires granting organisation-wide settings authority, which is far wider than intended. There is no middle rung, so billing can only be run by an organisation admin.

Move those routes onto billing's own namespace so the authority can be delegated to a billing owner and nothing else comes with it.

This is a security improvement as well as a delegation one: the generic settings permission has previously acted as an accidental platform-wide superuser in this codebase, so narrowing what depends on it reduces blast radius.

One route also has no permission gate at all — coupon validation is reachable by any authenticated member, which allows probing promo codes by brute force. Close it in the same pass.

**Blocked by:** 05 — Permission key grammar becomes a build failure

**Status:** ready-for-agent

- [ ] Each of the fifteen routes is gated on a billing permission rather than a global settings permission
- [ ] Viewing spend and changing plan or seats are separate authorities, not one key
- [ ] Coupon validation carries a permission gate
- [ ] A person granted billing administration can perform every billing action and no non-billing action
- [ ] A person with global settings authority who is not a billing admin can no longer perform billing actions — confirm this is intended before shipping, as it is a deliberate reduction
- [ ] Platform billing stays distinct from customer invoicing, which belongs to accounting
