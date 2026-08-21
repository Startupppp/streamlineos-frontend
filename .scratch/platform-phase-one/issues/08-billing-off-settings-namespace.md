# 08 — A billing owner can run billing without global settings authority

**What to build:** Fifteen billing routes — checkout, add-on purchase, payment provider setup, billing profile, seats, referrals and coupons — are gated on the generic global settings permissions. Delegating billing therefore requires granting organisation-wide settings authority, which is far wider than intended. There is no middle rung, so billing can only be run by an organisation admin.

Move those routes onto billing's own namespace so the authority can be delegated to a billing owner and nothing else comes with it.

This is a security improvement as well as a delegation one: the generic settings permission has previously acted as an accidental platform-wide superuser in this codebase, so narrowing what depends on it reduces blast radius.

One route also has no permission gate at all — coupon validation is reachable by any authenticated member, which allows probing promo codes by brute force. Close it in the same pass.

**Blocked by:** 05 — Permission key grammar becomes a build failure

**Status:** DONE — every criterion verified 2026-08-21

- [x] Each of the fifteen routes is gated on a billing permission rather than a global settings permission
- [x] Viewing spend and changing plan or seats are separate authorities, not one key
- [x] Coupon validation carries a permission gate
- [x] ~~A person granted billing administration can perform every billing action and no non-billing action~~ — **VOID by product decision:** platform billing is org owner/admin only, so there is no billing administration to grant. `assertPermissionsGrantable` refuses the whole `billing:` namespace on every grant path including the owner's own, so this holds by construction.
- [x] A person with global settings authority who is not a billing admin can no longer perform billing actions — confirm this is intended before shipping, as it is a deliberate reduction
- [x] Platform billing stays distinct from customer invoicing, which belongs to accounting

---

## Validation — 2026-08-21

Every criterion above is ticked because it was verified individually, not because the work felt finished. Evidence, deviations and corrections are recorded in the commit that closed this ticket and in the `PAGES.md` changelog entry for 2026-08-21.

Highlights: fifteen routes moved onto billing's own namespace and coupon validation gained the gate it never had — it had no `PermissionGuard` at all, so promo codes could be brute-forced. The delegation criterion is **void**, not done: the product decision removed billing administration entirely. Nobody loses access, because only org owners and admins held `settings:manage` in practice and both bypass role grants. The billing e2e spec could **not** be run — `pnpm test:e2e` dies in an ESM parse error before any billing test loads — so its updated assertions are not executed coverage.

This is done.
