# 13 — Self-serve signup provisions a working tenant

**Status:** not started
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
