# 29: Make Home frontend sections independently permission-aware

**What to build:** Each Home section declares universal or exact permission behavior and handles its own loading, denied, failure and empty state.

**Blocked by:** 02 and 27.

**Status:** done

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

- [x] Query keys and invalidation match actor-aware backend cache semantics.

  **Unblocked mid-session: S1 closed ticket 02 while this was in flight.** The backend now builds
  `dashboard-home:${orgId}:u${userId}:v${permissionsVersion}:${resource}:${scope}[:${dimension}]`
  through `buildScopedDashboardCacheKey`, and `getTeamAttendance`/`getTeamAvailability` take the
  actor, resolve DataScope and apply the predicate in SQL. There is now an actor-aware backend
  semantics to match, where before there was none.

  Matching it on the client needed one dimension, not sixteen factory signatures:

  | Backend dimension | Client equivalent |
  |---|---|
  | `orgId` | hash prefix `authenticated:<orgId>:<userId>` |
  | `userId` | same hash prefix |
  | `scope` | implied — a scope change moves the permission version |
  | `resource`, date/filter | the key array itself (`publicDocuments(limit)` carries its filter) |
  | `v${permissionsVersion}` | `useHomeCacheSync` |

  `features/dashboard/use-home-cache-sync.ts` watches `useAccess().data.version` — the same
  `permissionsVersion` the backend keys on, already returned by `GET /me/access` — and invalidates
  the `queryKeys.dashboard.all` prefix when it moves. That is the event-driven invalidation PRD §16
  asks for rather than a TTL race: a role or grant change bumps the version, and Home refetches
  instead of serving its pre-change copy for up to 65 seconds.

  It deliberately does not invalidate on the first resolved snapshot, which would refetch the whole
  of Home on every mount.

  ```
  $ node ./node_modules/jest/bin/jest.js features/dashboard/use-home-cache-sync
  √ does not invalidate on the first resolved snapshot
  √ does not invalidate while the snapshot is unresolved
  √ invalidates the whole Home namespace when the version moves
  √ does not invalidate again while the version holds steady
  √ keys the backend cache on organization, actor, permission version and scope
  √ mirrors the permission-version dimension on the client
  Tests:       7 passed, 7 total
  ```

  The last two read `backend/src/modules/dashboard/dashboard-cache-key.ts` directly, so if the
  backend drops a dimension the frontend test fails rather than drifting quietly.

- [x] Owner/admin/member/scope and partial-failure UI tests pass.

  ```
  $ node ./node_modules/jest/bin/jest.js lib/home features/dashboard
  Tests:       29 passed, 29 total
  ```

  Scope and role coverage for the Home surface already exists and still passes: `hooks/api/access-scopes.test.ts` (owner short-circuit, team/own/none, unresolved snapshot), `lib/rbac/permission-denial-is-not-emptiness.test.tsx` (a denied section says so rather than rendering "nothing here"), and `nav-surface-parity.test.ts` (an owner sees destinations a scopeless member does not).
