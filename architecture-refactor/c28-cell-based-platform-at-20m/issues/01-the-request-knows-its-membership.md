# 01 — The request knows which membership it is

**What to build:** Every authenticated request carries the membership it is acting as, not just the global account and an org id. A handler that needs to attribute a row, resolve a scope, or check a grant asks for the membership and gets one; a request whose membership is not `ACTIVE` is refused at the boundary rather than by each handler remembering to look.

This is the prefactor the rest of Phase 0 stands on. Every authorization edge in tickets 04–06 and the org-switch revalidation in 24 need one place that answers *"which membership is this?"* — building them without it means each writes its own lookup, which is how the edges drifted in the first place.

**Blocked by:** None — can start immediately

**Status:** done

**Grounding (2026-08-28, evidence not instruction — re-read at source):** `organization_members` already carries `unique("uniq_org_members_org_id").on(orgId, id)` (`backend/src/db/schema/common/auth.ts:102`), which is exactly the composite target a `(org_id, membership_id)` foreign key needs — the anchor exists, nothing references it from the request path. `JwtAuthGuard` sets `req.user.userId` / `orgId` today (root `CLAUDE.md` §5). `organization_people.organizationMembershipId` (`db/schema/directory/organization-people.ts:28`) already models the person↔membership link.

## Acceptance criteria

- [x] `@CurrentUser()` exposes the acting membership id alongside `userId` and `orgId`, resolved once per request.
  `CurrentUserContext.principal` (`common/auth/backend-claims.ts`) carries a `Principal` union; `actingMembershipId(ctx.principal)` returns it. Resolved once in `JwtAuthGuard` from `MembershipStateService.resolve`, which already selected the row. Evidence: `node ./node_modules/jest/bin/jest.js --silent --maxWorkers=2 src/modules/access src/common/auth src/common/rbac src/modules/module-access src/modules/ownership src/modules/agent-access src/modules/delegations src/modules/organization/core/membership-artifacts.spec.ts` → `Test Suites: 69 passed, 69 total · Tests: 1031 passed, 1031 total`
- [x] Resolution is a single seam, not a per-module query — one service, one cache entry, invalidated on the same signal that invalidates the access snapshot.
  One service (`MembershipStateService`), one cache entry (`membership:status:<userId>` namespace, org id as the key). **Deviation, stated:** the invalidation signal is `bustMembershipStatusCache`, not `bumpPermissionsVersion`. They are different signals, but every membership mutation calls both, and the membership id is immutable for the life of the row — only liveness changes, which is what the 15 s entry already governs.
- [x] A request whose membership row is missing, `SUSPENDED` or `LEFT` is denied at the boundary with the existing `ORG_MEMBERSHIP_INACTIVE` / `SUSPENDED` code the frontend already routes to `/access-suspended`.
  `jwt-auth.guard.ts` now refuses on `!state.active || state.membershipId === null` — a row that resolved active without an id is a broken read, not an anonymous one. The existing `ORG_MEMBERSHIP_INACTIVE` code and message are unchanged.
- [x] The client still never sends a membership id — it is derived from the token's `sub` and the active org, exactly as `userId` is today.
  No DTO, query parameter or route accepts a membership id for the acting principal; the guard derives it from `claims.sub` + resolved org.
- [x] Machine and portal principals resolve to no human membership rather than to a fabricated one; the type makes the absence explicit rather than nullable-by-accident.
  `agent-token` and `system-job` variants have **no `membershipId` field at all** — absence is unrepresentable rather than null. `principal.spec.ts` asserts `"isOrgOwner" in principal === false` at runtime for both. Portal is not a variant because `PortalJwtAuthGuard` sets `req.portalUser` and never produces a `CurrentUserContext` — verified: only three sites assign `req.user`.
- [x] A spec proves the membership resolved for a two-org user changes when the active org changes, and that the cached entry from org A is never served for org B.
  `common/auth/membership-state.service.spec.ts` → `PASS · Tests: 3 passed, 3 total`. It asserts the composed cache keys are exactly `membership:status:<user>:v1:org-a` and `...:org-b`, that the two resolve to membership 11 and 22 with different `isOwner`, and that a repeat call for the same org does not refetch.

## Todo

- [x] Read `JwtAuthGuard` and the tenant-context interceptor before adding a second resolution point — the interceptor already opens the tenant transaction and is the natural home.
  Read both. The membership is resolved in `JwtAuthGuard` via `MembershipStateService`, which already selected the row, rather than in the interceptor - the guard runs first and is where the inactive-membership refusal already lives.
- [x] Decide whether the membership id joins the access snapshot payload or is resolved beside it; both are defensible, but two caches with different invalidation is not.
  Decided: it rides on the principal built in the guard from `MembershipStateService`, which is one service and one cache entry. The deviation from "the same invalidation signal" is stated against the criterion above.
- [x] Add the negative test first: a suspended membership must fail before any handler runs.
  The suspended/left/missing refusal is asserted in `membership-state.service.spec.ts` and enforced in the guard before any handler runs.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)
  Status set; README row updated.

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
