# 01 — The request knows which membership it is

**What to build:** Every authenticated request carries the membership it is acting as, not just the global account and an org id. A handler that needs to attribute a row, resolve a scope, or check a grant asks for the membership and gets one; a request whose membership is not `ACTIVE` is refused at the boundary rather than by each handler remembering to look.

This is the prefactor the rest of Phase 0 stands on. Every authorization edge in tickets 04–06 and the org-switch revalidation in 24 need one place that answers *"which membership is this?"* — building them without it means each writes its own lookup, which is how the edges drifted in the first place.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** `organization_members` already carries `unique("uniq_org_members_org_id").on(orgId, id)` (`backend/src/db/schema/common/auth.ts:102`), which is exactly the composite target a `(org_id, membership_id)` foreign key needs — the anchor exists, nothing references it from the request path. `JwtAuthGuard` sets `req.user.userId` / `orgId` today (root `CLAUDE.md` §5). `organization_people.organizationMembershipId` (`db/schema/directory/organization-people.ts:28`) already models the person↔membership link.

## Acceptance criteria

- [ ] `@CurrentUser()` exposes the acting membership id alongside `userId` and `orgId`, resolved once per request.
- [ ] Resolution is a single seam, not a per-module query — one service, one cache entry, invalidated on the same signal that invalidates the access snapshot.
- [ ] A request whose membership row is missing, `SUSPENDED` or `LEFT` is denied at the boundary with the existing `ORG_MEMBERSHIP_INACTIVE` / `SUSPENDED` code the frontend already routes to `/access-suspended`.
- [ ] The client still never sends a membership id — it is derived from the token's `sub` and the active org, exactly as `userId` is today.
- [ ] Machine and portal principals resolve to no human membership rather than to a fabricated one; the type makes the absence explicit rather than nullable-by-accident.
- [ ] A spec proves the membership resolved for a two-org user changes when the active org changes, and that the cached entry from org A is never served for org B.

## Todo

- [ ] Read `JwtAuthGuard` and the tenant-context interceptor before adding a second resolution point — the interceptor already opens the tenant transaction and is the natural home.
- [ ] Decide whether the membership id joins the access snapshot payload or is resolved beside it; both are defensible, but two caches with different invalidation is not.
- [ ] Add the negative test first: a suspended membership must fail before any handler runs.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
