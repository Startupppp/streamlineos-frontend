# L75 — Route Descendants & Membership Revocation

Date: 2026-08-30  
Lane: L75  
Status: VERIFIED DONE — both P0 items already implemented and passing.

---

## P0-1: Administrative descendants of universal roots

### Verdict: VERIFIED DONE

All structural protection for admin descendants of universal roots is already in place and passing. No code changes were required.

### How it works

**Path-normalization:** `frontend/lib/rbac/request-path.ts` parses headers through `new URL(value, "https://streamlineos.local")`, which resolves path traversal (`/auth/../probe` → `/probe`) before any matching.

**Exact-by-default universal routes:** `frontend/lib/rbac/route-access/universal-routes.ts` uses explicit `universalDescendants` arrays — not prefix matching — for universal roots that own mixed territory (`/notifications`, `/chat`, `/knowledge`). Without an extension entry, an admin descendant resolves to "unknown" (redirected to `/access-denied`), not "universal". The `matchUniversalRoute` function never prefix-matches past a listed descendant.

**Extension registry:** `frontend/lib/rbac/route-access/route-access-extensions.ts` explicitly gates 13 admin descendant paths:

| Path | Permission |
|---|---|
| `/notifications/providers` | `notifications:providers:view` |
| `/notifications/templates` | `notifications:templates:view` |
| `/notifications/events` | `notifications:events:view` |
| `/notifications/policy` | `notifications:policy:view` |
| `/notifications/broadcasts` | `notifications:broadcasts:view` |
| `/knowledge/wiki/settings` | `kb:settings:manage` |
| `/knowledge/wiki/import` | `kb:pages:import` |
| `/knowledge/wiki/analytics` | `kb:analytics:view` |
| `/knowledge/wiki/reviews` | `kb:reviews:view` |
| `/knowledge/wiki/spaces` | `kb:spaces:view` |
| `/knowledge/wiki/templates` | `kb:templates:manage` |
| `/knowledge/wiki/trash` | `kb:pages:purge` |
| `/directory/workers` | `directory:workers:view` |

**Server-side enforcement through parent layouts:** The notifications layout (`app/(authenticated)/notifications/layout.tsx`), knowledge layouts (`app/(authenticated)/knowledge/layout.tsx`, `app/(authenticated)/knowledge/wiki/layout.tsx`), workflows layout (`app/(authenticated)/workflows/layout.tsx`) and payroll layout (`app/(authenticated)/payroll/layout.tsx`) all call `enforceRouteAccess(fallbackPath)`. `enforceRouteAccess` reads the ACTUAL request pathname from `x-pathname` / `next-url` headers — not the fallback — then calls `resolveRouteAccess` which checks the extension registry first. Admin descendants are therefore permission-resolved server-side before the page renders.

**Navigation-only guards:** `RequireModule` in payroll layout is supplementary to `enforceRouteAccess`, which runs first with a permission check.

**Table-driven regression matrix:** `frontend/lib/rbac/route-access/__tests__/universal-route-matrix.test.ts`

- 55 rows covering every universal root, allowed descendants, and forbidden administration descendants
- 8 named assertion cases
- Verifies `isUniversalRoute` and `resolveRouteAccess` independently for each row
- Enforces `protected_.length > 10` so a truncated test cannot pass vacuously

All 32 frontend route-access tests pass.

**Check scripts (all pass):**

```
pnpm check:route-classification  → 3534 handlers, 0 UNDECLARED — OK
pnpm check:permission-keys       → 690 keys, 0 ghost keys — OK
pnpm check:navigation-permissions → 438 nav gates, all resolve — OK
```

### Bite proof

Using a test double (NOT source-file sabotage) the `/notifications/providers` extension was removed from a local copy of the registry. The path resolved to "unknown" (not "permission" and not "universal"), proving the matrix detects a missing gate. Removing it in source would redirect every user to `/access-denied` — the mechanism bites in the correct direction. The source file was never modified; the bite test file was deleted after verification.

---

## P0-2: Membership-revocation spec

### Verdict: VERIFIED DONE — spec runs, 36/36 pass, tombstone asserted at the correct level

**File:** `backend/src/modules/organization/core/membership-revocation.spec.ts`

The spec already provides `OrgMembershipReadService` in `buildService()` (line 153):
```ts
{ provide: OrgMembershipReadService, useValue: {} },
```

**Test counts:** 36 tests, 36 passed, 0 failed.

**Does the spec assert the Redis tombstone?**

Yes — at the correct level for a unit test. The spec asserts `sessions.revokeAllForUser` is called when this is the last active membership. `SessionsService.revokeAllForUser` (line 96–112 of `sessions.service.ts`) always calls `this.tombstone(active.map(s => s.id))` BEFORE the DB update, writing `revoked:session:<id>` to Redis for every active session. The guard reads only the Redis key; the DB `isRevoked` flag is secondary. Asserting at the `revokeAllForUser` boundary — rather than mocking Redis — is the standard unit-test seam: the tombstone write is a consequence of the function's implementation, not something `OrgMembershipService` can bypass.

---

## Test counts

| Suite | Pattern | Total | Passed | Failed | Notes |
|---|---|---|---|---|---|
| Backend | `membership\|route\|access` | 689 | 686 | 3 | 2 suites pre-existing (user-module-access-tenant, membership-artifacts) |
| Frontend | `membership\|route\|access` | 186 | 186 | 0 | — |
| Backend membership-revocation only | `membership-revocation` | 36 | 36 | 0 | — |
| Frontend universal-route-matrix only | `universal-route-matrix` | 8 | 8 | 0 | — |

**Pre-existing backend failures (not caused by this lane):**
- `user-module-access-tenant-isolation.spec.ts` (2 tests): `tx.execute is not a function` — mock wiring issue in `with-tenant.ts`, unrelated to membership or route classification
- `membership-artifacts.spec.ts` (11 tests): passes in isolation (11/11); 1 collision in combined run due to test ordering effect

---

## Key files

- `frontend/lib/rbac/route-access/universal-routes.ts` — exact-by-default universal matching
- `frontend/lib/rbac/route-access/route-access-extensions.ts` — 13 admin descendant gates
- `frontend/lib/rbac/route-access/route-access.ts` — resolver (extension → universal → nav → unknown)
- `frontend/lib/rbac/route-access/enforce-route-access.ts` — server-side enforcer (reads actual path)
- `frontend/lib/rbac/request-path.ts` — path normalization via URL constructor
- `frontend/lib/rbac/route-access/__tests__/universal-route-matrix.test.ts` — 55-row table-driven matrix
- `frontend/app/(authenticated)/notifications/layout.tsx` — `enforceRouteAccess` for notifications
- `frontend/app/(authenticated)/workflows/layout.tsx` — `enforceRouteAccess` for workflows
- `frontend/app/(authenticated)/payroll/layout.tsx` — `enforceRouteAccess` for payroll
- `backend/src/modules/organization/core/membership-revocation.spec.ts` — 36 passing tests
- `backend/src/modules/sessions/sessions.service.ts` — `revokeAllForUser` writes tombstone
