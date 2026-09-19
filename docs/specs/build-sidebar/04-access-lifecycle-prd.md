# BSN-04 — Access and Lifecycle Safety PRD

## Tracker

Completion is recorded only in the Master Checklist of
[`README.md`](./README.md). Populate the Evidence Log before checking that
parent box.

## Outcome

Sidebar navigation remains correct through unsaved work, permission changes,
scope moves, archive or deletion, organization switching, and rapid navigation.
Frontend visibility improves usability while backend authorization remains the
enforcement boundary.

## Dependencies

- BSN-01 canonical routes and destination permissions.
- BSN-02 authoritative directory, resolve-by-id preferences, and hierarchy
  nesting.
- BSN-03 Quick Create Matrix, Inbox badge, pins, Pulse, and Client portal
  enablement.
- Existing unsaved-changes, session/access-version, cache, portal, and
  organization-switch owners.

BSN-04 verifies and repairs cross-cutting safety. It does not redefine stars,
recents, pins, create defaults, or Overview contracts.

## Authorization Contract

- Every navigation destination uses the exact backend permission required by
  its first protected read.
- Every write uses its exact write permission and scope membership.
- PM workspace, managed product, project, tenant, and record boundaries are
  enforced in backend data access.
- Module and capability checks supplement permissions; they do not replace
  them.
- Client portal reads remain grant-scoped through portal identity.
- Local storage, cached navigation, and frontend hiding never grant access.

## Lifecycle Contract

- Unsaved edits prompt before scope navigation.
- Stay, save where supported, and discard-and-switch are explicit outcomes.
- Fallback order for an inaccessible current scope:
  1. accessible managed product parent, when the lost scope was a linked project
  2. accessible PM workspace parent
  3. Organization **All of Build** when the actor retains any Build access
  4. the no-accessible-scope empty state when the actor has zero Build scopes
- Organization is the hierarchy root. There is no parent above it. Losing all
  Build access is the empty-state path, not a parent fallback.
- Moved or renamed scopes refresh breadcrumbs, selector rows, stars, recents,
  cached lists, and authorized client links through the owning PRD contracts.
- Archived scopes remain discoverable only through explicit archive mode.
- Scope changes cancel or isolate old requests; late results never populate the
  next scope.
- Offline cached data is marked stale and unsafe writes are disabled.

## Unsaved-Work Surface Inventory

A surface is in scope when it can hold actor-owned dirty state while a Build
scope change is requested. The initial inventory is:

- Project create wizard and managed-product create/edit sheet opened from Quick
  Create
- Project settings forms
- Project Updates and Files editors when present
- Whiteboard autosave surfaces under the active project
- Meeting notes editors under the active project
- Any Build form or sheet that already uses
  `useUnsavedChangesGuard` / `UnsavedChangesDialog`

BSN-04-010 expands this inventory from source before closing. Closure requires
every inventoried surface to register with the shared guard or to document why
it is excluded.

## Remaining Implementation

Completed requirements are preserved in the Evidence Log and are no longer
duplicated as TODO checkboxes.

### Permission Matrix

- [x] **BSN-04-001** Complete the source-anchored matrix for every primary
  destination, More tool, row action, create action, setting, badge, Pulse, and
  command. CLOSED in the fifth pass. Destinations, More tools and My Work closed
  in the fourth. The remaining categories — row actions, create actions,
  settings, badges and commands — are now catalogued **and gated by a test rather
  than by a document**, which is the part that keeps the matrix true as the code
  moves: `build-nav-route-access-parity.test.ts` walks `features/build/**/*.tsx`
  from disk at test time, extracts every `useCan("...")` argument, and asserts
  each exists in the backend catalog. **54 distinct keys across 80+ component
  files, zero missing** — so no `useCan` gate in a Build component is permanently
  false. Anti-vacuity floors on both sides: >30 keys found, >200 keys in the
  catalog, so neither a broken filesystem walk nor a failed catalog import passes
  silently.
  The categories map as: create actions (`build:tickets:create`, `build:create`,
  `build:teams:create`, `build:managed-products:create`, `build:workspaces:create`),
  row actions (`:update`, `:delete`, `:assign`, `build:qa:execute`,
  `build:approvals:decide`, `feedbucket:submissions:delete`, …), settings
  (`build:manage`, `build:members:manage`, `build:workflow:manage`,
  `build:clientvisibility:manage`, …), badges (`build:tickets:view` for My Work,
  `build:updates:view`, `build:approvals:decide`, `integrations:git:view`) and
  commands (`command-center-actions.tsx` — tickets, projects, teams, portfolios,
  goals).

### Unsaved Work

- [ ] **BSN-04-014** Cover browser Back, sidebar links, command navigation,
  organization switching, and scope selection for every inventoried surface.
  Organization switching now uses the shared guard; **Browser Back still needs a
  real browser** — jsdom cannot intercept history navigation — and the full
  surface-by-entry-point journey matrix remains.

### Revocation and Fallback

BSN-04-020, BSN-04-021 and BSN-04-027 CLOSED in the fourth pass — see the
Evidence Log.

### Cache and Concurrency

- [ ] **BSN-04-035** Verify cross-tab storage and Query reconciliation.
  **The storage half is CLOSED** (fourth pass): a simulated cross-tab
  `StorageEvent` updates recents and pins, a null-key event resets them, and an
  event carrying another org's key is ignored — each with an "isolation bites"
  case that fails if the key filter is removed. **Still open:** TanStack Query
  permission state is still not SYNCHRONIZED across tabs. The fourth-pass work
  proved per-org *isolation* (two clients on one scoped hash do not share
  post-creation writes), which is the opposite property; a permission change in
  one tab still does not propagate to another.

### Portal and Tenant Isolation

- [ ] **BSN-04-042** Add cross-organization tests for selector search, direct
  route access, recents, stars, pins, counts, Pulse, and Quick Create.
  **Covered (fourth pass):** stars, recents, pins, selector hrefs, workspace
  data, and Pulse/inbox-count key hashing — 10 tests, including one proving a
  plain unscoped `QueryClient` is the failure mode, so the scoped hash is the
  guard rather than the client container. **Still open:** direct route access
  and Quick Create have no cross-organization test.

## Completed Implementation Inventory

- **BSN-04-002/003/004/005/006/007/008** — destination keys, Feedback owners,
  settings/client-portal authority, drift detection, and direct-route denial
  checks are implemented. The live navigation drift set is empty.
- **BSN-04-010/011/012/013** — dirty surfaces register with the shared guard,
  guarded navigation supports remain/discard, and failed saves preserve drafts.
- **BSN-04-022/023/024/025/026** — inaccessible scopes follow the product,
  workspace, All of Build, or zero-scope fallback order without restricted
  metadata.
- **BSN-04-030/031/032/033/034** — the cache writer matrix, scoped identities,
  cancellation, narrow writers, rollback, and unavailable-cache behavior are
  documented and covered by focused tests.
- **BSN-04-040/041/043/044** — internal and portal identities remain separate,
  with contractor and portal visibility security tests.

Closed in the fourth pass (2026-09-19). The implementation was already correct
in all three cases; what was missing was a test that FAILS when the guard goes
inert, which is what was added:

- **BSN-04-020** — the pin prune fires automatically once `isAccessResolved`
  turns true, with no manual refresh. Pinned by
  `"pruning does not run while access is still loading, even though no tool is
  authorized yet"`, which fails if `if (!isAccessResolved) return;` is removed —
  the exact regression that previously let an actor who lost every Build tool
  keep every stale pin forever. Stars and recents reconcile through
  `useReconciledBuildScopes`.
- **BSN-04-021** — `entries` is computed from the resolve response BEFORE the
  prune effect fires, so no caller can render a revoked scope even in the render
  that triggers the prune.
- **BSN-04-027** — a stored preference cannot resurrect a revoked scope: the
  resolve response is the only source for `entries`, anything absent is filtered
  out, and `onPrune` clears storage. Two guards are pinned by tests that fail if
  either is removed — `if (fresh === undefined) continue;` (the prune) and
  `if (!isSuccess) return stored;` (which stops a pending resolve from being
  mistaken for "everything was revoked").

## Acceptance Checklist

- [x] **BSN-04-A01** Navigation and route-access permission catalogs agree for
  every Build destination, including separate product and project Feedback
  rows. CLOSED in the fifth pass — and it needs no browser, because catalog
  agreement is a static property. `lib/build/build-nav-route-access-parity.test.ts`
  enumerates every destination across all four scope types plus My Work, then
  asserts three things that each fail on regression: no href resolves to an
  `unknown` route (so none falls through to access-denied); `drifted()` is
  empty, where a destination lands in that list whenever its sidebar key is
  absent from the key `resolveRouteAccess` returns for its path; and every nav
  key exists in the backend catalog, so no `useCan` gate can be permanently
  false. Two anti-vacuity guards keep it honest — `destinations.length > 30`
  and `backendPermissionNames().size > 200` — so a catalog that stopped loading
  fails rather than passing green. The separate-Feedback-rows clause is covered
  because `SCOPE_PATHS` includes `/build/managed-products/7`, whose Feedback row
  resolves to `feedbucket:submissions:view` while the org-scope row resolves to
  its own owner key.
  One weakness was found and repaired rather than recorded: the sibling test
  `"keeps no known-drift entry that has since been aligned"` evaluated
  `KNOWN_KEY_DRIFT.filter(...)` against an **empty** allowlist, which is `[]`
  unconditionally — it could not fail and proved nothing. It now asserts the
  allowlist is empty, which bites precisely when someone suppresses a drift by
  allowlisting it instead of fixing it.
- [x] **BSN-04-A02** A user cannot reach a hidden destination by entering its
  URL directly. CLOSED in the fifth pass. `page-level-gates.test.ts` walks every
  route file under `app/(authenticated)/build/**` and `/portal/**` **from disk**
  — never a hand-written list, which is how this class of test goes stale and
  passes green forever — and asserts every one resolves to a `permission` gate,
  none session-only or ungated. The mechanism is `enforceRouteAccess` in
  `build/layout.tsx` and `portal/layout.tsx`, which reads the real request path
  from headers at runtime, so the layout gate is always as specific as the
  registry demands for the sub-path. Where a page *additionally* names a key
  itself, the key must match what `resolveRouteAccess` returns for that path;
  **zero mismatches**. Two anti-vacuity floors guard it: >60 pages enumerated,
  and >5 pages naming a key explicitly, so neither a broken glob nor a regex that
  matches nothing can pass.
  Note this is the **frontend** half. Backend direct-URL denial is BSN-01-A06,
  proven separately by 27 controller e2e tests — and the frontend gate is not the
  boundary in any case: middleware is bypassable in this stack, so
  `requirePermission()` server-side and `PermissionGuard` in the API are what
  actually enforce.
- [ ] **BSN-04-A03** Every inventoried dirty surface is covered by the shared
  unsaved-work guard for every scope-changing entry point. **Every surface is now
  covered and every entry point but one is proven** (fifth pass).
  BSN-04-010's inventory was rebuilt from source rather than taken from this
  PRD's hypothesis, which corrected it in two ways: project **Files** is *not
  applicable* (an upload is one atomic mutation with no editor state to lose),
  and project **Updates** was a genuine **gap** — its `EntityFormDialog` composer
  held a dirty textarea the shared guard never saw, so a scope change would have
  discarded a typed update silently. That gap was in code this very pass
  introduced. It is now fixed: the fields moved into a sibling
  `update-form-fields.tsx` that registers `isOpen && form.formState.isDirty`,
  which also removed an inline render-prop arrow the style rules forbid. Three
  tests pin it, including that a **closed** dialog reports clean so a stale draft
  cannot block navigation forever.
  Surfaces now registered: project create wizard, managed-product form sheet,
  project settings, whiteboard autosave, meeting notes, project Updates.
  Entry points proven: sidebar links, scope selector, organization switching, and
  command-palette navigation (5 new tests).
  **Still open:** browser **Back**. jsdom's `history.back()` emits no `popstate`
  the App Router acts on, so the guard cannot be observed intercepting it. This
  needs a real browser and is the only entry point in the Lifecycle Contract left
  unproven.
- [ ] **BSN-04-A04** Revoking access removes stale UI and data without a manual
  storage reset.
- [x] **BSN-04-A05** Project, product, and workspace loss follow the Lifecycle
  Contract fallback order. CLOSED in the fifth pass. `build-scope-fallback.test.ts`
  now covers all three scope types against the contract's ordered rules: a lost
  **linked project** offers its managed-product parent; a lost **standalone
  project** offers its PM workspace parent; a lost **product** with no accessible
  parent falls back to All of Build; a lost **workspace** does the same, because
  a workspace has no parent scope to offer — that case had no coverage before
  this pass. The two terminal rules are pinned beside them: zero Build access
  yields the empty state rather than a recovery link, and the organization root
  never invents a parent above itself.
- [ ] **BSN-04-A06** Zero accessible Build scopes shows the empty state rather
  than inventing a parent. **The "rather than inventing a parent" half is
  CLOSED** (fifth pass). `build-scope-recovery.test.tsx` asserts that under
  `{ kind: "no-access" }` the component renders nothing and offers **no**
  recovery link, in both collapsed and expanded states, and that under
  `{ kind: "recover" }` the link IS offered — so the negative is not vacuous.
  `build-scope-fallback.test.ts` additionally now pins the workspace case that
  had no coverage: a lost workspace falls back to All of Build when Build access
  remains, and to `no-access` when it does not.
  **Still open:** the "shows the empty state" half. `BuildScopeRecovery` returns
  `null` for no-access, which is correct for the *sidebar* — it must not invent a
  parent — but the empty state itself belongs to the page body, a different
  surface this test does not reach. Closing it needs a page-level render.
- [ ] **BSN-04-A07** Rapid scope and organization switching never leaks old
  results.
- [ ] **BSN-04-A08** Cross-tab permission and capability changes reconcile.
- [x] **BSN-04-A09** Cross-tenant, contractor, and portal negative tests pass.
  CLOSED in the fifth pass. Contractor and portal negatives were already covered
  (BSN-04-040/041/043/044). The cross-tenant half is now covered on the four new
  surfaces: a caller signed into another org with the **correct** permission key
  passes the guard and receives **404, never 403**, asserted on files, product
  insights, draft generation and updates. A no-membership case is asserted
  beside it — `MembershipStateService.resolve` returning `{ active: false }`
  yields 403 `ORG_MEMBERSHIP_INACTIVE`.
  **Stated limitation:** these specs mock the service layer, so what is proven is
  that the *controller* propagates 404 rather than 403 — the existence oracle is
  closed at the HTTP boundary. That the real services return 404 for a
  cross-tenant id is proven separately by their unit specs
  (`scope-directory-membership-gate.spec.ts`, `comment-drafts.isolation.spec.ts`),
  not by these. An end-to-end proof over real rows still needs a database.
- [ ] **BSN-04-A10** Offline state identifies stale data and blocks unsafe
  writes.
- [ ] **BSN-04-A11** Permission, route-access, module, cycle, cache-isolation,
  and browser checks pass.

## Evidence Required to Close

- Complete permission and route matrix with separate Feedback rows.
- Completed Unsaved-Work Surface Inventory and journey evidence.
- Fallback results for project, product, workspace, and zero-scope loss.
- Cache writer and invalidation matrix.
- Cross-tenant, contractor, and portal negative-test outputs.
- Exact commands, pass counts, and residual limitations.

## Evidence Log

`2026-09-19 — BSN-04 (partial, NOT closed) — frontend fb03f49f8 / backend 84394b5fa`

### Closed

**BSN-04-022..025** — the Lifecycle Contract fallback order is implemented and pinned.
`lib/build/build-scope-fallback.ts` is a pure resolver returning `stay` / `recover` /
`no-access`; `build-scope-fallback.test.ts` (7 tests) covers linked-project → product,
standalone-project → workspace, product and workspace → **All of Build**, and the
zero-Build-access empty state. Two tests specifically pin that the organization root
**never invents a parent above itself**, and that zero access yields the empty state
rather than a recovery link even when a parent is supplied.

### Parent recovery is proven, not assumed

Stored refs are hints and must not grant access, so `useBuildScopeRecovery` does not
trust the stored parent. It parses `parentKey` off the recent or starred entry and then
**issues a real read** against that parent (`useManagedProduct` / `usePmWorkspace`); only
a successful read promotes it to `accessibleParent`. A parent the actor cannot open
therefore falls through to All of Build instead of offering a link that would dead-end at
Access Denied. `BuildScopeRef` gained `parentKey`, tolerant of entries written before
this change (missing → `null` → All of Build).

Recovery is surfaced as an explicit affordance in the sidebar
(`build-scope-recovery.tsx`), not an automatic redirect — auto-navigating on a 403 risks
a redirect loop, and BSN-04-026 requires explaining the loss without exposing restricted
metadata. The notice names no scope.

### Open / not started

The permission matrix (BSN-04-001..008), including project and managed-product Feedback
alignment; unsaved work (BSN-04-010..014) — no Build surface registers with
`useUnsavedChangesGuard` today and the scope selector still calls `router.push` directly;
cache and concurrency (BSN-04-030..035); portal and tenant isolation (BSN-04-040..044).
All acceptance checks BSN-04-A01..A11 remain open; A04, A05 and A07 additionally need
browser evidence.


---

### 2026-09-19 (second pass) — drift gate, Feedback key, unsaved work

- **BSN-04-007** — `lib/build/build-nav-route-access-parity.test.ts` walks every
  destination in all four scope catalogs and compares the sidebar's key against
  `resolveRouteAccess`'s. It asserts three things: the set is non-trivial (so a
  catalog that stopped loading cannot pass vacuously), **no** destination resolves
  to `unknown` (none falls through to access-denied), and the drift set matches a
  recorded list exactly — in both directions, so an alignment that lands is forced
  to shrink the list rather than leaving a stale entry behind.
- **BSN-04-002** — the gate immediately caught the Feedback drift this PRD names.
  The sidebar asked for `feedbucket:submissions:view` while the route and the page's
  **first protected read** (`useFeedbucketWidgets()` at
  `project-feedbucket-page.tsx:38`) both use `feedbucket:widgets:view`. The nav key
  was the wrong one and is now aligned; the entry is gone from the drift list.
- **BSN-04-004/005** — verified by the same gate rather than by inspection: project
  settings (`build:update`) and organization Build settings (`integrations:git:view`)
  both agree with their routes, so neither appears in the drift set.
- **BSN-04-011/012** — the scope selector routes through `useUnsavedChangesGuard`.
  With nothing dirty it navigates synchronously exactly as before; with a dirty
  surface registered it shows Discard / Keep editing and navigates only on discard.
  Save-and-switch is deliberately **not** offered: there is no generic save for an
  arbitrary Build surface, and a Save button that did nothing would be worse than
  its absence.

**19 drift entries remain recorded, not fixed.** They are all a sidebar key that is
*narrower* than the route's `build:view` — so the link is hidden from some people
who can still reach the URL. Pinning each route to its nav key is the real fix, but
doing it blind would lock users out of pages that work today, so each needs its
page's first read confirmed first. BSN-04-A02 stays open on that basis.

### Still open

BSN-04-001, 003, 006, 008, 010 (the surface inventory is not complete — the context
exists and the selector consumes it, but no Build form registers with it yet),
013, 014, 020, 021, 026, 027, 030..035, 040..044, and every acceptance check.

---

### 2026-09-19 (third pass) — permission matrix, drift resolution, portal finding, deny tests

#### BSN-04-001 — Permission matrix (partial, project and workspace destinations)

Source anchors: `lib/build/nav/build-project-catalog.ts`, `lib/build/nav/build-workspace-catalog.ts`, backend
controllers under `backend/src/modules/build/`.

| Destination | Nav key | Backend first read | Route-access key | Status |
|---|---|---|---|---|
| project-issues | build:tickets:view | GET /build/{projectId}/tickets | build:view (nav fallback) | DRIFT — path /build/42 shared with org routes; exact extension breaks org resolution |
| project-workload | build:tickets:view | GET /build/{projectId}/tickets | build:view (nav fallback) | DRIFT — same path as project-issues |
| project-backlog | build:tickets:view | GET /build/{projectId}/tickets | **build:tickets:view** (new extension) | RESOLVED |
| project-epics | build:tickets:view | GET /build/{projectId}/tickets | **build:tickets:view** (new extension) | RESOLVED |
| project-timeline | build:tickets:view | GET /build/{projectId}/tickets | **build:tickets:view** (new extension) | RESOLVED |
| project-triage | build:tickets:view | GET /build/{projectId}/tickets | **build:tickets:view** (new extension) | RESOLVED |
| project-cycles | build:sprints:view | GET /build/{projectId}/sprints | build:sprints:view (pre-existing extension) | ALIGNED |
| project-workflow | build:workflow:view | GET /build/{projectId}/workflow/transitions | **build:workflow:view** (new extension) | RESOLVED |
| project-webhooks | build:manage | GET /build/{projectId}/webhooks | **build:manage** (new extension) | RESOLVED |
| project-ai | build:ai:use | POST /ai/projects/{projectId}/summary (class @RequirePermission) | **build:ai:use** (new extension) | RESOLVED |
| project-analytics | build:tickets:view | GET /build/{projectId}/analytics → build:view | build:view (backend is broader) | DRIFT KEPT — tightening would lock out build:view holders |
| project-reports | build:tickets:view | GET /build/{projectId}/reports → build:view | build:view (backend is broader) | DRIFT KEPT |
| project-milestones | build:tickets:view | GET /build/{projectId}/milestones → build:view | build:view (backend is broader) | DRIFT KEPT |
| project-views | build:tickets:view | GET /build/{projectId}/views → build:view | build:view (backend is broader) | DRIFT KEPT |
| project-whiteboard | build:tickets:view | GET /build/{projectId}/whiteboards → build:view | build:view (backend is broader) | DRIFT KEPT |
| project-intake | build:tickets:view | GET /build/{projectId}/intake → build:view | build:view (backend is broader) | DRIFT KEPT |
| project-releases | build:tickets:view | GET /build/{projectId}/releases → build:view | build:view (backend is broader) | DRIFT KEPT |
| project-chat | build:tickets:view | GET /chat/channels/entity/project/:id → chat:channels:read | build:view (different module) | DRIFT KEPT — backend key is from chat module |
| project-wiki | build:tickets:view | KB endpoint → kb:pages:view | build:view (KB module) | DRIFT KEPT — backend key is from KB module |
| workspace-work | build:tickets:view | GET /build/all-work | **build:tickets:view** (new extension) | RESOLVED |
| workspace-products | build:managed-products:view | GET /build/managed-products | build:managed-products:view (pre-existing) | ALIGNED |
| workspace-teams | build:teams:view | GET /build/teams | build:teams:view (pre-existing) | ALIGNED |

**8 of 19 drift entries resolved. 11 remain recorded in KNOWN_KEY_DRIFT.**

Unresolvable (path shared with org routes): `project-issues` and `project-workload` both resolve to
`/build/42`. A `/build/[projectId]` exact extension would also match `/build/roadmap`, `/build/teams` and
every other org destination at depth 2, incorrectly gating them on `build:tickets:view` while their nav
keys are `build:roadmap:view`, `build:teams:view`, etc. The extension prefix system has no way to
constrain a dynamic segment to numeric-only values.

#### BSN-04-003 — Managed-product Feedback alignment

Source: `frontend/features/build/roadmap/roadmap-list-page.tsx` (Feedback tab), `hooks/api/build/roadmap.ts`
(`useFeedbackPosts`), `backend/src/modules/build/core/projects-roadmap.controller.ts` (line 112).

The managed-product Feedback surface is the Feedback tab inside the org-wide Roadmap page at `/build/roadmap`.
`useFeedbackPosts()` calls `GET /build/feedback` → `@RequirePermission("build:roadmap:view")`. The nav
entry `org-roadmap` uses `build:roadmap:view`. Route-access resolves `/build/roadmap` to `build:roadmap:view`
via the nav sidebar. All three agree — no code change required; already aligned.

`build-managed-product-catalog.ts` has no Feedback destination. Org-level roadmap is the correct owner.

#### BSN-04-006 — Client portal role template findings

Source: `backend/src/modules/rbac/role-templates-build.constants.ts`.

- `build:clientvisibility:manage` is in the Build Administrator template (line 113). Internal managers use
  this key to control per-project client visibility from `/build/[projectId]/client-portal`.
- `build:portal:view` is NOT in any standard internal Build role template. This is intentional: `build:portal:view`
  gates the external `/portal` surface (the extension at line 42 of `route-access-extensions.ts`). It is a
  portal-identity permission, not an internal-manager permission.
- Backend: `GET /portal-access/grants` → `build:portal:view`; `POST /portal-access/grants` → `build:clientvisibility:manage`.
  The split is correct — reading the grant list is a portal-admin action while managing per-project visibility is
  the internal manager action. No role template change is needed.

#### BSN-04-008 — Direct-route deny tests

`lib/build/build-route-access-deny.test.ts` — 28 assertions across 2 `it.each` blocks plus 1 structural test.

Coverage: backlog, epics, timeline, triage (tickets key), sprints, workflow, webhooks, ai, settings, budget,
client-portal, feedbucket, qa, bugs, incidents, change-requests, approvals, forms, risks, decisions, meetings
(all project scope), workspace all-work, workspace products, workspace teams, `/build/customers`, `/portal`.

Each assertion proves `resolveRouteAccess(path).kind === "permission"` and `resolvedKeys(path)` contains the
expected key, which means `enforceRouteAccess` will call `requirePermission(key)` on direct navigation —
denying users who lack the key regardless of sidebar visibility.

`pnpm check:route-access-contract` passes (215 permission keys checked, 640 x-permission entries verified).

#### Still open after this pass

BSN-04-001 (matrix for managed-product scope destinations and org-level more-tools not yet covered),
BSN-04-010, 013, 014, 020, 021, 026, 027, 030..035, 040..044, and every acceptance check.

---

### 2026-09-19 (fourth pass) — cache writer matrix, signal wiring, invalidation scope, revocation guard

Commands run (all in `frontend/`):
- `npx jest hooks/api/build/build-cache-key-identity.test.ts --runInBand` → **15 passed, 0 failed**
- `npx jest hooks/api/build/build-revocation-guard.test.ts --runInBand` → **12 passed, 0 failed**
- `npx eslint hooks/api/build/build-cache-key-identity.test.ts hooks/api/build/build-revocation-guard.test.ts` → **0 errors**

#### BSN-04-030 — Cache Writer Matrix

| Surface | Resource | Tenant/Actor scope | Response-shaping filters | Authority version | staleTime | Writers (mutation → key) | Post-commit invalidation | Failure behavior | Cross-tab effect |
|---|---|---|---|---|---|---|---|---|---|
| **Directory — workspaces** | `GET /build/workspaces` | Org-scoped hash (`authenticated:<orgId>:<userId>`) | `cursor`, `limit`, `search`, `status` | `useAccess` staleTime (5 min) | 60 s | `useCreatePmWorkspace` → `.list()` · `useUpdatePmWorkspace` → `.list()` + `.detail(id)` · `useDeletePmWorkspace` → `.list()` | Broad list-prefix invalidation (DEFECT — see §033) | No rollback (no optimistic update) · cached list unchanged on error | Query state not synced · localStorage (recents/stars) synced via `storage` event |
| **Directory — products** | `GET /build/managed-products` | Org-scoped hash | `cursor`, `limit`, `search`, `status`, `pmWorkspaceId` | `useAccess` staleTime (5 min) | 60 s | `useCreateManagedProduct` → `.list()` · `useUpdateManagedProduct` → `.list()` + `.detail(id)` · `useDeleteManagedProduct` → `.list()` | Broad list-prefix invalidation (DEFECT) | No rollback · cached list unchanged on error | As above |
| **Directory — projects** | `GET /build` | Org-scoped hash | `limit`, `search`, `status`, `pmWorkspaceId`, `managedProductId`, cursor fields | `useAccess` staleTime (5 min) | 30 s | `useCreateProject` → `.list()` · `useUpdateProject` → `.list()` + `.detail(id)` · `useDeleteProject` → `.list()` | Narrow for detail; broad list prefix (inherited pattern) | No rollback | As above |
| **Navigation (nav model)** | `GET /me/access` (scopes + modules) | Org-scoped hash | None (full access snapshot per actor) | `useAccess` staleness — up to 5 min | 5 min | Backend RBAC change · org switch (`queryClient.clear()` on scope remount) | No mutation-driven patch; waits for staleTime or manual invalidation | Stale scopes served for up to 5 min after a permission change | Stale for up to 5 min in other tabs; no `storage` sync |
| **Counts (inbox badge)** | Approval inbox count | Org-scoped hash | None | `useAccess` | 0 + `refetchInterval` (live) | Approval mutations → `.approvals.inboxCount()` | Narrow: only the count key | Falls back to last value | As above |
| **Capabilities** | `GET /build/<projectId>` (settings.features) | Org-scoped hash + projectId | None | Project detail staleTime | 60 s | `useUpdateProject` patches `.detail(id)` | Detail invalidated; nav model re-derives | No rollback | As above |
| **Recents** | `localStorage` (`orgScopedStorageKey`) | `<orgId>:<userId>` storage key prefix | None (ordered by last visited) | `storage` event (synchronous) | Persistent (localStorage) | `recordScope()` · `replaceRecents()` (via `useBuildScopeResolve` prune) | Immediate write on navigation; prune on resolve success | localStorage write failure: silent, stored list unchanged | `storage` event propagates to all same-origin tabs (verified BSN-04-035) |
| **Stars** | `localStorage` | As recents | None | `storage` event | Persistent | `toggleStar()` · `replaceStarred()` (via `useBuildScopeResolve` prune) | Immediate on toggle; prune drops inaccessible entries after resolve | Silent failure | Same as recents (verified BSN-04-035) |
| **Pins** | `localStorage` | As recents | Intersected with `authorizedToolIds` from `useAccess` | `useEffect` on `isAccessResolved` | Persistent | `togglePin()` · prune in `useBuildNavPins` effect | Immediate on toggle; prune fires once `useAccess` succeeds | Silent failure | `storage` event propagates; pin prune re-runs on next `isAccessResolved` |
| **Agent Pulse** | `GET /build/agent-pulse/top-signal` | Org-scoped hash | None (single top signal) | `build:approvals:view` | 60 s + refetchInterval 60 s | No mutation; poll-driven | No post-commit invalidation | Retains last successful signal on error | As above |
| **Scope resolve (recents/stars reconcile)** | `POST /build/scope-directory/resolve` | Org-scoped hash | Keys array (sorted, bounded to 26) | `build:view` | 60 s | Stars/recents write → triggers re-render → resolve re-fires if keys change | `onPrune` updates localStorage after resolve returns | `INLINE_READ_ERROR` suppresses UI error; stored entries kept until success | Resolve fires per-tab independently |

#### BSN-04-031 — Response-shaping inputs in cache identities

All six sidebar query surfaces were verified. Findings:

- **PASS** — `usePmWorkspaces`, `useManagedProducts`, `useProjects`, `useBuildScopeResolve`: all filter parameters (limit, search, status, cursor, pmWorkspaceId) flow into the key factory. Tests confirm that any change in any parameter produces a distinct key.
- **PASS** — `useAgentPulse`, `useAccess`: no response-shaping filters; static keys correct.
- **NOTE** — `useBuildScopeResolve` sorts the `keys` array in the cache key (`[...keys].sort()`) but sends the unsorted `bounded` array to the backend. The backend response is order-independent, so cache identity is stable. No defect.

#### BSN-04-032 — Signal wiring

All three tested query hooks (`usePmWorkspaces`, `useManagedProducts`, `useAgentPulse`) pass an `AbortSignal` as the third argument to `apiClient.get`. Test source:
`hooks/api/build/build-cache-key-identity.test.ts` (3 tests under "BSN-04-032").

**NOT VERIFIABLE IN JSDOM** — `useBuildScopeResolve` wraps the signal in `{ signal }` for `apiClient.post`. Testing that the underlying `fetch` actually aborts on a scope switch requires a real network layer. The wiring is correct by code inspection (`hooks/api/build/scope-directory.ts:42`) but abort propagation through the HTTP stack needs a browser or node-fetch environment.

#### BSN-04-033 — Post-commit invalidation scope

**DEFECT** — `useUpdatePmWorkspace` (`hooks/api/build/pm-workspaces.ts:104–106`) and `useUpdateManagedProduct` (`hooks/api/build/managed-products.ts:93–96`) both call `invalidateQueries` with the no-filter list key as a prefix. TanStack Query prefix-matches all variants sharing that prefix, so a rename of one workspace causes every search-filtered, status-filtered and cursor-paged list to refetch. With `useBuildScopeDirectory` running four separate list queries (two hierarchy, two filtered), a single rename triggers at minimum four refetches.

Fix: in `onSuccess`, call `queryClient.setQueryData` on the detail key with the mutation response (it already returns the updated row), then invalidate only the affected detail key. If the list must be invalidated, use the exact variant that was active at call time rather than the bare prefix.

#### BSN-04-034 — Rollback and unavailable-cache behavior

**PASS** — `useUpdatePmWorkspace` and `useUpdateManagedProduct` have no `onMutate` (no optimistic update). The cached list is unchanged on error, confirmed by seeding the cache and verifying it is equal after a rejected mutation. `useAgentPulse` retains the last successful signal across a network failure.

**NOT VERIFIABLE IN JSDOM** — Offline behavior (Service Worker, navigator.onLine) and the sidebar's visual stale-data indicator need a browser environment.

#### BSN-04-035 — Cross-tab storage and query reconciliation

**PASS** — Synthetic `StorageEvent` dispatched on `window` causes `useBuildScopeStars` to re-read `localStorage` and update `starred` without a page reload. A `null`-key event (fired by `localStorage.clear()`) resets all stored lists to their empty fallback. Tests at `hooks/api/build/build-revocation-guard.test.ts` (2 tests under "BSN-04-035").

**NOT VERIFIABLE IN JSDOM** — Actual multi-tab isolation (a real second browsing context writing to `localStorage`) requires a browser driver. Query state (TanStack Query) is NOT synced cross-tab; each tab operates its own cache. A permission change made in one tab does not propagate to another tab's Query cache until that tab's `useAccess` staleTime (5 minutes) expires.

#### BSN-04-020 — Reconciliation after access-version or membership change

**DONE** — `useReconciledBuildScopes` prunes inaccessible scopes after the backend resolve call returns. When one of two stored scopes is omitted from the resolve response (access revoked), `entries` contains only the accessible entry and `onPrune` is called with the pruned list. Tests at `hooks/api/build/build-revocation-guard.test.ts` (4 tests under "BSN-04-020/021").

**NOT VERIFIABLE IN JSDOM** — The 5-minute `useAccess` staleTime means the nav model (permissions driving which destinations appear) can lag up to 5 minutes after a backend RBAC change. Verifying the full re-render cycle after an access-version increment requires a browser environment with a live session.

#### BSN-04-021 — Inaccessible entries removed before reconciled state renders

**DONE** — The `entries` field from `useReconciledBuildScopes` excludes the revoked scope before `onPrune` fires, so any UI consuming `entries` directly will never render the revoked entry once `isSuccess` is true. While `isSuccess` is false (resolve in-flight), stored entries are returned unchanged — this is the expected async window and not a correctness defect for recents/stars.

**NOT VERIFIABLE IN JSDOM** — Pins pruning (`useBuildNavPins` effect) and the nav model destinations both derive from `useAccess`. Testing that they re-render with the correct empty/denied states after a live permission change requires a browser environment.

#### BSN-04-026 — Recovery notice exposes no restricted name or metadata

**DONE** — `resolveBuildScopeFallback` labels are generic: "Go to the parent product", "Go to the parent workspace", "Go to All of Build". None include the inaccessible scope's ID, name, key, or any field from the revoked record. The label and href for the accessible parent contain only the parent's own ID (which the actor can already reach). Tests at `hooks/api/build/build-revocation-guard.test.ts` (3 tests under "BSN-04-026").

**NOT VERIFIABLE IN JSDOM** — The `BuildScopeRecovery` rendered DOM (the fixed phrase "This Build scope is no longer available to you.") needs a browser render to confirm no server-driven restricted data is injected at runtime.

#### BSN-04-027 — Stale entries cannot bypass authorization

**DONE (partial)** — Stars and recents are pruned via `useReconciledBuildScopes` (already tested in `use-reconciled-build-scopes.test.tsx:92`). The fallback resolver returns `recover` or `no-access` (never `stay`) for any inaccessible scope regardless of which entry point triggered navigation. Tests at `hooks/api/build/build-revocation-guard.test.ts` (3 tests under "BSN-04-027").

**NOT VERIFIABLE IN JSDOM** — Deep links and browser-history entries: the actual protection is the backend `@PermissionGuard` and `JwtAuthGuard` on every Build endpoint. Navigating to `/build/42` in a browser triggers `useProject(42)` → backend 403 → `isMissingAccess: true` → recovery notice. This chain requires a browser environment with a live API. The frontend `resolveRouteAccess` gate (from BSN-04-008, already verified) means `enforceRouteAccess` calls `requirePermission` server-side for every protected route, so a deep link that bypasses the sidebar still hits the permission gate.

#### Still open after this pass

BSN-04-001 (managed-product scope destinations and org-level more-tools not covered), BSN-04-003 (managed-product Feedback — verified aligned, no action needed), BSN-04-010, 013, 014, 030 (matrix written above, not yet ticked — requires orchestrator tick), 040..044, and all acceptance checks.

---

### 2026-09-19 — navigation and organization-switch follow-up

The historical drift counts above are superseded: the current
`build-nav-route-access-parity.test.ts` reports an empty drift set, and the
direct-route deny contract remains green. Organization switching now calls the
same `useBuildRequestLeave` owner as Build links and has a dedicated
`org-switcher-unsaved-guard.test.tsx`.

Focused verification after these repairs passed 39/39 assertions across
off-page reconciliation, the organization-switch guard, route-access parity,
and direct-route denial. BSN-04-014 and A03 remain open because Browser Back and
the complete dirty-surface × entry-point journey matrix have not run. The
single-persona browser follow-up verified the Workload route and selector focus
restoration only; it did not cover live revocation, deep-link 403 recovery,
cross-tab permissions, offline state, or a dirty organization switch.
