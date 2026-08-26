# 13 — Self-serve signup provisions a working tenant

**Status:** provisioning half done — the front door is deliberately a waitlist.
**Track:** D — funnel
**Blocked by:** 08, 09

## Why

The funnel's measure is not signups but **workspaces with real data in them**.

## Acceptance criteria

- [ ] Signup with an email address provisions a tenant, assigns its region and seeds a demo dataset.
- [ ] The new user lands in onboarding through the **existing wizard gate**, which remains the single authority on where they land.
- [ ] The workspace has something in it, so the product is judged rather than an empty grid.
- [ ] Provisioning is idempotent under retry and leaves no half-created tenant.
- [ ] **No business route handler is added to the frontend** — the auth bridge remains the only one.

## Notes (2026-08-26)

**This ticket conflicts with a live product decision, and I did not override
it.** Commit `5850179e5` (25 Aug, authored by the repository owner) replaced
self-serve signup with a waitlist: every marketing CTA now points at `/waitlist`,
and `/signin` "stays reachable by URL for people who already have an account; it
is simply no longer advertised."

Building "self-serve signup provisions a working tenant" would undo that. So the
work done here is the machinery that admission needs **either way** — because
letting somebody in off the waitlist still has to create a tenant, place it, and
seed it.

**Placement is done and is at the seam.** `regionForNewOrg` now takes an optional
country and places accordingly; called without one it returns the primary exactly
as before, so all three existing creation paths are unchanged until they pass
one. Resolution stays at the seam rather than at the callers, for the same reason
region resolution went inside `withTenant` in Phase 1: a fourth creation path
would otherwise have to remember the rule.

**What the audit found:** the waitlist collects entries and **has no admission
path at all**. Nobody can be let in. That is the actual gap in the funnel, and it
is a product decision — who admits, from where, on what basis — rather than a
technical one.

**Still needs you:** the admission trigger and its UX. The provisioning pieces it
would call — placement, demo seed, idempotency — are the parts worth building
before that decision, and placement is the one that was blocking.