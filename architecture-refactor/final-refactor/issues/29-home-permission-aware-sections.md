# 29: Make Home frontend sections independently permission-aware

**What to build:** Each Home section declares universal or exact permission behavior and handles its own loading, denied, failure and empty state.

**Blocked by:** 02 and 27.

**Status:** done, except criterion 3, which is blocked on ticket 02 in the backend

- [x] Every Home query is enabled by exact universal/permission metadata.

  `frontend/lib/home/home-sections.ts` — `HOME_SECTIONS`, 16 entries, each declaring `id`, `label`, `endpoint` and a discriminated `access`: `universal` · `module` · `permission` · `module-permission`. It sits in `lib/`, not `features/dashboard/`, because `hooks/api/dashboard.ts` consumes it and shared code must not import a feature (root §9).

  **One Home query was firing ungated.** `usePublicDocuments` reads `GET /hr/documents`, which enforces `hr:documents:view`, but was `enabled: !!orgId && enabled` — so every member without that permission 403-spammed it on every Home render, which frontend §2 calls out specifically for dashboard widgets. It now gates on the module and the exact key.

  The metadata is checked against the backend rather than trusted:

  ```
  √ declares the same permission the backend route enforces
  √ parses decorators onto the route they belong to
  √ actually compares a majority of the declared sections
  √ uses only permission keys that exist in the catalog
  √ leaves no dashboard query enabled by organization membership alone
  ```

  **The controller parser was wrong first and the failure was informative.** It scanned backwards from `@Get(...)` and attributed each route the previous route's decorators, reporting nine mismatches that did not exist. In this controller the decorators follow `@Get`. The parser now scans forward and carries an explicit anti-vacuous assertion that it attributes `/dashboard/stats` → universal and `/dashboard/team-attendance` → `hr:attendance:view` correctly. The registry data was right throughout; the scan was the defect.

- [x] One failing or denied section does not fail or reveal another section.

  `features/dashboard/home-section-boundary.tsx` — a real `componentDidCatch` boundary per section, rendering `ErrorState` scoped to that section with a working retry. Before this, one widget throwing during render blanked the whole Home page. All 22 rendered widgets in `dashboard-client.tsx` are individually wrapped.

  ```
  $ node ./node_modules/jest/bin/jest.js features/dashboard/home-section-boundary
  √ renders its child when nothing throws
  √ replaces only the failing section and names it
  √ keeps a sibling section rendering when its neighbour throws
  √ never leaks the underlying error text to the user
  √ wraps each rendered widget in its own boundary
  Tests:       6 passed, 6 total
  ```

  "Does not reveal" is the gating half, covered by the permission tests above: a section whose key the actor lacks never issues its request.

- [ ] Query keys and invalidation match actor-aware backend cache semantics.

  **Blocked on ticket 02, and the frontend half is already correct.** Every Home key is hashed as `["authenticated:<orgId>:<userId>", key]` by `scopedQueryKeyHashFn`, and `QueryProvider` remounts on scope change, so a cross-actor read is structurally impossible on the client — proved by the existing `lib/query-scope-isolation.test.tsx`.

  The backend is what does not match. `dashboard:team-availability:${orgId}` and `dashboard:team-attendance:${orgId}:${today}` carry no membership, scope or permission version, and `getTeamAttendance(orgId)` / `getTeamAvailability(orgId)` never receive the actor at all, so no DataScope is applied before caching. Until ticket 02 adds those dimensions there is no actor-aware backend semantics for the client to match. Recorded in `CROSS-SESSION.md` for S1.

- [x] Owner/admin/member/scope and partial-failure UI tests pass.

  ```
  $ node ./node_modules/jest/bin/jest.js lib/home features/dashboard
  Tests:       22 passed, 22 total
  ```

  Scope and role coverage for the Home surface already exists and still passes: `hooks/api/access-scopes.test.ts` (owner short-circuit, team/own/none, unresolved snapshot), `lib/rbac/permission-denial-is-not-emptiness.test.tsx` (a denied section says so rather than rendering "nothing here"), and `nav-surface-parity.test.ts` (an owner sees destinations a scopeless member does not).
