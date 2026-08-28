# 27: Build the shared server route-access registry

**What to build:** Server layouts and every navigation surface derive route visibility and access from one permission/module registry with an explicit universal-route allowlist.

**Blocked by:** 03 — Enforce the organization and module authority matrix.

**Status:** done

Built against PRD §12's authority matrix as the specification rather than waiting on ticket 03's code, per the session's opening decision. The registry encodes module and permission metadata identically either way; the matrix rows ticket 03 changes are backend authority decisions, not route metadata.

- [x] Route metadata represents module, permission and universal status once.

  `frontend/lib/rbac/route-access/` — four modules behind one barrel:

  | File | Role |
  |---|---|
  | `universal-routes.ts` | `UNIVERSAL_ROUTES` (20 entries) and `UNIVERSAL_EXCLUSIONS`, each with a stated reason |
  | `route-access-extensions.ts` | `ROUTE_ACCESS_EXTENSIONS`, 6 entries for paths navigation cannot enumerate |
  | `route-access.ts` | `resolveRouteAccess(pathname): RouteAccessDecision` |
  | `enforce-route-access.ts` | server-only `enforceRouteAccess(fallbackPath)` |

  `RouteAccessDecision` is a discriminated union — `universal` · `permission` · `unknown` — so a caller cannot forget the deny case.

  Permissions are **derived** from the existing `NAV_GROUPS`/`HOME_NAV_GROUPS` graph through `resolveNavRouteAccess`, not restated. There is no second table to drift. The universal allowlist was promoted out of a test-local constant in `sidebar-permission-coverage.test.ts`, where it could not be consumed by production code.

  A prefix entry can over-reach, so exclusions are explicit: `/directory` is universal but `/directory/workers` is not — it is gated on `directory:workers:view`, which is not a member default. That carve-out was found by a test, not by inspection (see ticket 34).

- [x] Server authorization and desktop/mobile navigation consume the same registry.

  Navigation already filtered on `NavRoute.requiredPermission` via `getNavGroupsForUser`; the registry reads the same graph, so the two cannot disagree. Proved per route rather than asserted:

  ```
  √ never contradicts navigation for a route navigation already owns
  ```

  `app/(authenticated)/hr/layout.tsx` was the only layout consuming the nav graph, through bespoke logic that hardcoded `requireModulePermission("hr", …)` and fell back to `requireSession()` on a miss. It now calls `enforceRouteAccess("/hr")` and is 26 lines shorter.

- [x] Unknown/non-universal routes fail closed.

  `resolveRouteAccess` returns `unknown` for any path that is neither universal, nor owned by navigation, nor covered by an extension. `enforceRouteAccess` redirects it to `/access-denied?required=route:unregistered`. The previous HR behaviour was the opposite — an unmatched path fell through to `requireSession()`.

  ```
  √ resolves a route the registry has never seen as unknown, so it fails closed
  √ denies an HR path the registry does not know
  ```

- [x] Coverage tests detect missing, conflicting and frontend-only permission keys.

  `lib/rbac/route-access/__tests__/` — 16 tests. The sweep enumerates every `page.tsx` under `app/(authenticated)` from disk, so a new unregistered route fails the build.

  ```
  $ node ./node_modules/jest/bin/jest.js lib/rbac/route-access
  PASS lib/rbac/route-access/__tests__/route-access-coverage.test.ts
  PASS lib/rbac/route-access/__tests__/no-legacy-role-gates.test.ts
  PASS lib/rbac/route-access/__tests__/route-access-keys.test.ts
  Tests:       16 passed, 16 total
  ```

  Missing: `√ answers every authenticated route with universal or permission access` over 553 routes, with `√ finds the authenticated route tree, so an empty sweep cannot pass` guarding against a broken walk.
  Conflicting: `√ never contradicts navigation for a route navigation already owns`.
  Frontend-only: `√ has no frontend-only permission key in any route decision` and `… in a registry extension`, both against the **backend** catalog.

  **The key scan was wrong on its first run and the fix is the point.** It reported 13 ghosts, all `<module>:access:view`. Those keys are generated in `backend/src/modules/rbac/permissions/module-access.ts` from `delegableModuleIds()`, so a literal `name: "…"` scan cannot see them and reported real keys as missing. The scan now expands the generated pair per delegable module and carries `√ expands the generated module-access keys the literal scan cannot see` so it cannot silently regress.

  Four of eleven permission keys drafted for the extensions table were wrong (`accounting:reports:view`, `accounting:invoices:view`, `sign:envelopes:view`, `workflows:view` do not exist). Every key is now verified against the catalog before use, and the tests enforce it.

## Verification

```
$ node ./node_modules/jest/bin/jest.js lib/rbac/route-access
Tests:       16 passed, 16 total

$ node ./node_modules/jest/bin/jest.js components/layout
Tests:       80 passed, 80 total

$ npx --yes madge@8 --circular --ts-config tsconfig.json --extensions ts,tsx lib/rbac
✔ No circular dependency found!
```

`lib/rbac/route-access` imports `resolveNavRouteAccess` from `components/layout/sidebar`, the same direction `app/(authenticated)/hr/layout.tsx` already used and `next build` already proved. Zero cycles.
