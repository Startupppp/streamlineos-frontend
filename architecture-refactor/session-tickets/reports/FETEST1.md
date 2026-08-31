# FETEST1 — Frontend Jest Suite Run & Fix

**Date:** 2026-08-30  
**Lane:** FETEST1

---

## Baseline (before fixes)

Shards run: 4 × `--maxWorkers=2 --shard=N/4`

| Shard | Suites | Tests | Failed suites |
|-------|--------|-------|---------------|
| 1/4 | 41 | 437 | 2 |
| 2/4 | 41 | 264 | 2 |
| 3/4 | 41 | 310 | 3 |
| 4/4 | 41 | 400 | 1 |
| **Total** | **164** | **1411** | **8 unique** |

### Failing suites (initial)

| Suite | Failures | Kind |
|-------|----------|------|
| `components/layout/sidebar/sidebar-permission-coverage.test.ts` | 1 | Test fixture |
| `components/layout/sidebar/sidebar-deep-link.test.ts` | 2 | Source defect |
| `components/layout/sidebar/sidebar-nav-items.test.ts` | 1 | Source defect |
| `components/layout/sidebar/sidebar-nav-inventory.test.ts` | 1 | Test fixture (hash stale) |
| `lib/rbac/permissions/__tests__/catalog-sync.test.ts` | 2 | Source defect |
| `lib/rbac/route-access/__tests__/route-access-keys.test.ts` | 3 | Source defect |
| `features/dashboard/quick-actions.test.tsx` | 1 | Test fixture (mock gap) |
| `features/renderer/renderer.test.tsx` | 1 | Test fixture (empty file) |

---

## Root-cause analysis

### 1. `/me/pay` in wrong nav group — SOURCE DEFECT

`PAYROLL_NAV_GROUPS` declared `/me/pay` with product `"payroll"`. `HOME_NAV_GROUPS` also declared it in the "For Me" group with product `"home"`. The prefix index is built from `[...NAV_GROUPS, ...HOME_NAV_GROUPS]` and NAV_GROUPS wins on equal-length prefix, so `getProductFromPathname("/me/pay")` returned `"payroll"` instead of `"home"`.

**Fix:** Removed the `/me/pay` route from `PAYROLL_NAV_GROUPS`. The home nav entry is the canonical one — self-service pay is a home surface.

**File:** `frontend/components/layout/sidebar/sidebar-nav-groups-payroll.ts`

### 2. `calendar:admin:manage` phantom permission key — SOURCE DEFECT

The frontend permissions catalog added `calendar:admin:manage` but the backend catalog has only `calendar:read`, `calendar:write`, `calendar:ai:use`, `calendar:events:export`. The phantom key fails `catalog-sync.test.ts` and `route-access-keys.test.ts`.

**Fix:** Removed `calendar:admin:manage` from:
- `frontend/lib/rbac/permissions/calendar.ts`
- `frontend/lib/rbac/permissions/permission-key-extended.ts`

### 3. `/calendar/settings` extension uses phantom key — SOURCE DEFECT

The extension for `/calendar/settings` used `calendar:admin:manage`. After removing that key, replaced with `calendar:write` (the strongest existing calendar permission in the backend catalog). The route still resolves to `kind: "permission"` for all tests that assert it.

**Fix:** Updated extension permission from `calendar:admin:manage` → `calendar:write`.

**File:** `frontend/lib/rbac/route-access/route-access-extensions.ts`

### 4. Nav contradicts registry for `/chat/settings`, `/chat/moderation`, `/calendar/settings` — SOURCE DEFECT

`resolveNavRouteAccess` used a prefix match (`/chat/*` → `chat:channels:read`) that also matched admin sub-paths with stronger extension permissions. The test "never contradicts navigation" caught the mismatch.

**Fix:** Updated `routeOwnsPath` inside `resolveNavRouteAccess` to respect `inactivePrefixes`. Added `inactivePrefixes: ["/chat/settings", "/chat/moderation"]` to the `/chat` nav route and `inactivePrefixes: ["/calendar/settings"]` to the `/calendar` nav route, so the admin sub-paths are excluded from the parent route's prefix claim.

**Files:**
- `frontend/components/layout/sidebar/sidebar-nav-items.ts` — `routeOwnsPath` now checks `inactivePrefixes`
- `frontend/components/layout/sidebar/sidebar-home-nav.ts` — `inactivePrefixes` added to `/chat` and `/calendar`

### 5. `/directory/settings` classified as universal — TEST FIXTURE DEFECT

The test's `isUniversal()` includes `/directory` as a universal prefix. `/directory/settings` (the module's admin settings, under the administration product) is gated on `directory:people:view` but the classifier treated it as universal. Analogous to how `/chat/access` is already excluded.

**Fix:** Added `UNIVERSAL_ADMIN_EXCLUSIONS` array containing `/directory/settings`, checked before the prefix scan.

**File:** `frontend/components/layout/sidebar/sidebar-permission-coverage.test.ts`

### 6. Navigation inventory digest stale — TEST FIXTURE (hash update)

Removing `/me/pay` from `PAYROLL_NAV_GROUPS` changes `NAV_GROUPS`. The digest test requires an updated hash.

**Fix:** Updated hash from `38b4106d...` to `3b3a6ac1...`.

**File:** `frontend/components/layout/sidebar/sidebar-nav-inventory.test.ts`

### 7. `framer-motion` mock missing `useReducedMotion` — TEST FIXTURE DEFECT

`quick-actions.tsx` imports `useMotionVariants` from `lib/motion-variants.ts`, which internally calls `useReducedMotion()`. The test mock returned only `{ motion: { div: MotionDiv } }` with no `useReducedMotion`, causing a "not a function" runtime error.

**Fix:** Added `useReducedMotion: () => false` to the mock.

**File:** `frontend/features/dashboard/quick-actions.test.tsx`

### 8. Empty test file — TEST FIXTURE DEFECT

`features/renderer/renderer.test.tsx` contained only `export {};`. Jest requires at least one test per file.

**Fix:** Added a smoke test that verifies the barrel's three primary exports (`RecordDetail`, `RecordForm`, `RecordList`) are functions.

**File:** `frontend/features/renderer/renderer.test.tsx`

---

## After fixes

All four shards pass cleanly:

| Shard | Suites | Tests | Failed |
|-------|--------|-------|--------|
| 1/4 | 41 | 437 | 0 |
| 2/4 | 41 | 265 | 0 |
| 3/4 | 41 | 310 | 0 |
| 4/4 | 41 | 400 | 0 |
| **Total** | **164** | **1412** | **0** |

(+1 test from the new renderer smoke test)

---

## Summary: source vs. fixture

| Defect | Kind | Files changed |
|--------|------|---------------|
| `/me/pay` in payroll nav | **Source** | `sidebar-nav-groups-payroll.ts` |
| `calendar:admin:manage` phantom | **Source** | `permissions/calendar.ts`, `permission-key-extended.ts` |
| Extension using phantom key | **Source** | `route-access-extensions.ts` |
| Nav/registry contradiction | **Source** | `sidebar-nav-items.ts`, `sidebar-home-nav.ts` |
| `isUniversal` misclassifies `/directory/settings` | **Test fixture** | `sidebar-permission-coverage.test.ts` |
| Stale nav inventory hash | **Test fixture** | `sidebar-nav-inventory.test.ts` |
| Missing `useReducedMotion` mock | **Test fixture** | `quick-actions.test.tsx` |
| Empty renderer test file | **Test fixture** | `renderer.test.tsx` |
