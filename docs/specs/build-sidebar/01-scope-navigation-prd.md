# BSN-01 — Scope Navigation Parity PRD

## Tracker

Completion is recorded only in the Master Checklist of
[`README.md`](./README.md). Populate the Evidence Log before checking that
parent box.

## Outcome

Every Build scope opens a real Overview and exposes only destinations whose data
can be correctly filtered to that scope. Organization, PM workspace, managed
product, and project navigation must feel intentional rather than like aliases
of organization or project pages.

## Dependencies

- Design source:
  [`2026-09-19-build-sidebar-design.md`](../../superpowers/specs/2026-09-19-build-sidebar-design.md)
- Current resolver: `frontend/lib/build/build-scope.ts`
- Current catalog: `frontend/lib/build/build-nav-model.ts`
- Backend remains the owner of scope filtering and authorization.
- Client portal enablement filtering is owned by BSN-03.
- Final permission-drift repair and feedback-key alignment are owned by BSN-04.

## Product Requirements

### Organization

Primary destinations remain Overview, Projects, Products, Portfolios, Programs,
and Teams. Organization-wide administration remains in More tools or Build
settings.

### PM Workspace

Primary destinations are Overview, Projects, Products, Roadmap, Goals, and
Teams. Every collection is filtered by `pmWorkspaceId` on the backend and
membership is enforced at the data layer.

### Managed Product

Primary destinations are Overview, Roadmap, Goals, Feedback, Linked projects,
and Insights. Every collection is filtered by `managedProductId` on the backend.
Managed-product Feedback is a separate destination and data owner from project
Feedback.

### Project

Primary destinations are Overview, Issues, Backlog, Cycles, Timeline, Releases,
Updates, Files, and Client portal. Selecting a project opens Overview. Issues
remains a separate board destination. Client portal is catalogued here with its
permission key; BSN-03 adds the enabled-state gate.

### Overview Contracts

Each Overview is complete only when all listed fields render with explicit
loading, empty, error, denied, and populated states:

- **Organization Overview** — active workspaces count, active projects count,
  open issues assigned to the actor, portfolio or program health summary when
  authorized, and one authorized create action.
- **PM Workspace Overview** — workspace name, membership summary, project count,
  product count, open assigned work in that workspace, and one authorized create
  action.
- **Managed Product Overview** — product name and key, linked project count,
  roadmap summary or empty, open goals count or empty, and linked-project list
  bounded to the first page.
- **Project Overview** — project name and key, status or health, current cycle
  or empty, open issue count by status bucket, next milestone or empty, and
  links to Issues, Updates, and Files.

### Hierarchy Ownership

- Every project row has a non-null PM workspace.
- A project's managed product, when present, belongs to the same PM workspace.
- Orphan projects and cross-workspace product links are blocked at write time
  and repaired or reported by a one-time audit before directory nesting ships.
- Portfolios, programs, and teams remain organization rollups, not selector
  parents.

### Shared Rules

- Stable My Work appears at every internal Build scope.
- No normal scope has more than nine primary destinations.
- Every destination has one canonical route and one canonical permission.
- Routes do not pretend to be scope-specific while returning organization-wide
  data.
- Missing backend filters block the destination from shipping.
- Scope settings uses the permission for the selected scope.

## Remaining Implementation

Completed requirements are preserved in the Evidence Log and are no longer
duplicated as TODO checkboxes.

### Backend Scope Contracts

BSN-01-011, BSN-01-013, BSN-01-014, BSN-01-015 and BSN-01-016 CLOSED in the
fourth pass — see the Evidence Log.

- [x] **BSN-01-012** Add or reuse validated `managedProductId` filters for
  Roadmap, Goals, Feedback, Linked projects, and Insights. **Roadmap, Goals,
  Linked projects and Feedback are CLOSED.** Feedback was NOT the blocker it was
  recorded as: `feedbucket_widgets` already carried `managed_product_id` with a
  composite FK and a partial `(org_id, managed_product_id)` index, so the
  recorded "no scope dimension in the backend" was true of the query and never
  of the schema. **Insights is now CLOSED too** (fifth pass):
  `GET /build/managed-products/:managedProductId/insights` exists, gated on
  `build:managed-products:view`, contract-typed by `managedProductInsightsSchema`,
  and answers in exactly two queries run under one `Promise.all` — a `GROUP BY`
  tally of the product's projects and a `GROUP BY` tally of its feedbucket
  submissions reached by an INNER JOIN through `feedbucket_widgets`. Both are
  org-led, projected to `(status, count)`, and filter `deleted_at IS NULL` on
  every table they touch, so there is no N+1 and no unbounded read. A product
  outside the caller's tenant 404s via the shared `loadProduct` guard.
  **All five destinations named by this requirement now carry a validated
  `managedProductId` filter, so the item is closed.**
- [ ] **BSN-01-018** Audit existing rows for orphan projects and cross-workspace
  product links; repair or quarantine before shipping nesting consumers.
  **Requires a database.** None exists on this machine, and the audit is a query
  over real rows — it cannot be satisfied by a mocked test. The client-side
  quarantine path for invalid hierarchy rows is already implemented and tested,
  so a bad row is contained in the UI; that is containment, not the audit.

### Routes and Pages

BSN-01-020, BSN-01-021, BSN-01-026 and BSN-01-027 CLOSED in the fourth pass —
see the Evidence Log.

- [x] **BSN-01-022** Implement or wire managed product Roadmap, Goals, Feedback,
  Linked projects, and Insights pages to scope-filtered APIs. CLOSED in the
  fifth pass. Roadmap, Goals and Linked projects were already wired and
  scope-filtered. Feedback and Insights are now both destinations in
  `build-managed-product-catalog.ts` with routes at
  `/build/managed-products/[managedProductId]/feedback` and `/insights`, each
  passing `managedProductId` to its query so the page is scope-filtered rather
  than organization-wide. The two carry **different** keys —
  `feedbucket:submissions:view` for Feedback, `build:managed-products:view` for
  Insights — and both are registered in `route-access-extensions.ts`, so a
  caller holding `build:managed-products:view` but not the feedbucket key no
  longer reaches the feedback inbox by direct URL. Denied, loading, error and
  empty states are all rendered. 8 frontend tests plus 3 backend service tests.
- [ ] **BSN-01-024** Implement or wire project Updates and Files pages.
  **Updates is DONE-PENDING-MIGRATION** (fifth pass). `build.project_updates`
  (migration `1126`, journal idx 1014) carries a keyset-ready partial index
  `(org_id, project_id, created_at DESC, id DESC) WHERE deleted_at IS NULL`, a
  composite tenant unique `(org_id, id)`, and FKs to `build.projects`,
  `organization_members` and `organizations` all authored `NOT VALID` then
  `VALIDATE`. `BuildUpdatesModule` is registered in `build.module.ts` **before**
  `ProjectsByIdModule`, whose bare `build/:projectId` route would otherwise
  shadow it — pinned by `build-route-order.spec.ts`. The service asserts project
  access on **all three** operations (list, create and delete), pages by
  microsecond-safe keyset cursor capped at 100, and restricts deletion to the
  author unless the caller holds `build:updates:manage` or owns the org. New
  keys `build:updates:view|manage` are in both catalogs. 9 backend tests,
  5 frontend. **The migration is UNAPPLIED.**
  **Files is now DONE-PENDING-MIGRATION too** (fifth pass), and the earlier
  "structural blocker" was wrong. A general-purpose upload path *did* exist —
  `StorageService`, `validateMagicBytes` (`modules/storage/file-signatures.ts`)
  and the quarantine machinery — and is reused rather than rebuilt.
  `build.project_attachments` (migration `1127`, journal idx 1015) mirrors the
  updates table: composite tenant unique `(org_id, id)`, three `NOT VALID` →
  `VALIDATE` FKs, a partial org-led keyset index, and **`GRANT`s to
  `streamline_app`** — a build table created without grants fails `42501` at
  runtime and reads as an RLS denial. `assertProjectAccess` runs on **all four**
  operations (list, upload, signed-url, delete), and uploads are magic-byte
  validated rather than trusting the client's MIME type. New keys
  `build:files:view|manage` are in both catalogs. 12 backend tests, 5 frontend,
  12 controller e2e. **The migration is UNAPPLIED.**

### Canonical Navigation Model

BSN-01-031 and BSN-01-032 CLOSED in the fourth pass — see the Evidence Log.

- [ ] **BSN-01-033** Populate the complete project catalog with Overview as the
  selected scope landing destination.

## Completed Implementation Inventory

Closed in the fourth pass (2026-09-19):

- **BSN-01-011** — managed products and teams now call the SAME
  `PmWorkspacesService.assertMemberOfWorkspace` the project paths already used,
  on both create and workspace-filtered list, rather than a second helper.
  ⚠ The first implementation made the caller's membership id an OPTIONAL
  parameter so an existing spec would not break, which meant any caller omitting
  it skipped the check entirely — and two tests pinned that skip as correct.
  Every non-controller caller was a spec. The parameter is now REQUIRED and
  those tests assert the opposite: the guard runs even for a caller with a null
  membership, so there is no opt-out.
- **BSN-01-013** — verified already true and anchored: `loadProduct` and
  `loadTeam` bind `eq(table.orgId, orgId)` in the query's WHERE clause, not in a
  service-level branch a second caller could bypass, and a cross-tenant miss
  raises 404 rather than 403.
- **BSN-01-014** — page size is clamped by a shared `PAGE_SIZE_CAP = 100`; no
  N+1 (team member counts use one inline correlated aggregate, not a per-row
  query); WHERE clauses lead with `org_id`.
- **BSN-01-015** — a real contract gap was found and fixed:
  `teamListItemSchema` OMITTED `pmWorkspaceId` and `listTeams` did not project
  it, so a client could not tell which workspace a team belonged to. Both
  repaired.
- **BSN-01-016** — 16 non-member allow/deny specs across managed products and
  teams, each asserting the guard propagates and that `db.insert` is never
  reached, plus cross-tenant coverage.
- **BSN-01-020** — Organization, Workspace, Product and Project Overview pages
  exist against the Overview Contracts, with 29 tests. Counts are cursor-honest:
  where a list is cursor-paginated with no `total`, the field is OMITTED rather
  than rendered as a confident zero. The product goal count IS exact, because
  `GET /goals` is offset-paginated and its `count()` uses the same filtered
  WHERE — an earlier revision rendered `items.length` against a default
  `limit: 20`, which would have shown "20" for a product with 500 goals.
- **BSN-01-021** — workspace Projects, Products, Roadmap, Goals and Teams pages
  pass `pmWorkspaceId` to scope-filtered APIs, verified against the backend
  schemas rather than assumed.
- **BSN-01-026** — cross-scope deep links are proven not to leak project-scope
  permissions into workspace or product URLs: `/build/workspaces/ws-1/sprints`
  resolves to `build:view`, NOT `build:sprints:view`, and likewise for
  `feedbucket` and `bugs` under both workspace and managed-product URLs.
- **BSN-01-027** — the recorded defect was real: workspace Products and Teams
  collapsed denial into emptiness, so an unauthorised actor saw "nothing here"
  instead of a denied state. Every page touched now resolves five explicit
  states through the shared gate, reusing `NoPermissionState`.
- **BSN-01-031 / BSN-01-032** — workspace catalog at 7 destinations and
  managed-product catalog populated, both within the nine-destination ceiling,
  and every entry points at a route that actually exists.

- **BSN-01-001/002/003/004/005** — destination ownership was inventoried,
  Cycles is the customer term, project/product Feedback owners are distinct,
  and active shared-file reservations are recorded in the tracker.
- **BSN-01-010/017/019** — scope filters and project workspace/linkage write
  invariants are implemented and covered by rejection tests.
- **BSN-01-023/025** — project Overview and Issues are distinct; Client portal
  is catalogued with `build:clientvisibility:manage`.
- **BSN-01-030/034/035/036/037** — one split, acyclic, size-compliant canonical
  navigation model serves every shell surface without obsolete aliases.

## Acceptance Checklist

- [ ] **BSN-01-A01** Selecting each of the four scope types lands on an Overview
  that renders every required Overview Contract field.
- [ ] **BSN-01-A02** Workspace pages never show data from another workspace.
- [ ] **BSN-01-A03** Product pages never show unlinked product data or projects.
- [ ] **BSN-01-A04** Project Issues, Updates, Files, and Client portal are
  distinct destinations with correct active states.
- [ ] **BSN-01-A05** Standalone and product-linked projects both navigate
  correctly.
- [x] **BSN-01-A06** Unauthorized destinations are absent and direct URL access
  is denied by the backend for BSN-01-owned routes. CLOSED in the fifth pass —
  no database needed, because the specs boot the Nest application with the
  services mocked. 27 e2e tests across four controllers
  (`files.controller.e2e-spec.ts`, `managed-products-insights.e2e-spec.ts`,
  `comment-drafts.controller.e2e-spec.ts`, `updates-cross-tenant.e2e-spec.ts`)
  assert 401 without a token and 403 for a caller lacking the exact key, on every
  new surface: files list/upload/signed-url/delete, product insights, and
  draft generation. **Each negative is paired with a positive** — the same route
  with the correct key is NOT blocked — because a 403 assertion passes just as
  well when the route is broken for an unrelated reason.
  A guard audit was run alongside: all four controllers carry
  `@UseGuards(JwtAuthGuard, PermissionGuard)` at class level with
  `@RequirePermission` on every handler. `PermissionGuard` is not global, so this
  had to be confirmed rather than assumed.
- [x] **BSN-01-A07** No scope exceeds nine primary destinations. CLOSED in the
  fifth pass, and it is one of the few acceptance checks that needs no browser
  because the ceiling is a pure property of the catalog. `build-nav-model.test.ts`
  resolves the model for a caller holding `ALL_BUILD_PERMISSIONS` with
  `feedbucket` enabled — the widest possible nav — across all four scope types
  and asserts `primary.length <= BUILD_NAV_MAX_PRIMARY`, reading the exported
  constant rather than a literal, so raising the constant cannot silently pass
  the check. Each catalog file additionally pins its own cap. Adding Feedback
  and Insights took the product scope from 4 primary destinations to 6, leaving
  three of headroom; nothing had to be demoted to More tools.
- [ ] **BSN-01-A08** Create and update reject orphan projects and cross-workspace
  product links; the orphan audit reports zero unresolved rows or a named
  quarantine list.
- [x] **BSN-01-A09** Navigation model, route-access, frontend contract, backend
  controller, and tenant-isolation tests pass. CLOSED in the fifth pass, all five
  named layers run and green: navigation model and route-access
  (`lib/build`, `lib/rbac` — 129 suites / 1,094 tests), frontend contracts
  (`hooks/api/build`, included in that run), backend controllers
  (`src/modules/build` — 271 of 272 suites, the one failure being a broken
  detector in the notifications lane, see the README), and tenant isolation
  (`scope-directory-membership-gate.spec.ts`,
  `comment-drafts.isolation.spec.ts`, plus 27 controller e2e tests asserting
  cross-tenant **404 rather than 403**).
- [x] **BSN-01-A10** Frontend and backend type checks pass. CLOSED in the fifth
  pass: frontend `tsc --noEmit -p tsconfig.json` exit 0 over the **test-inclusive**
  program, backend `tsc --noEmit -p tsconfig.build.json` exit 0 with a 10240 MB
  heap. Typecheck is the only gate that sees an arity change, so the wider
  program is the one that matters after a signature change.
- [x] **BSN-01-A11** Cycle self-tests and cycle gates pass in both repositories.
  CLOSED in the fifth pass. **Self-tests first**, because a gate that resolves no
  edges reports zero vacuously: backend `check:cycles:self-test` → "madge names
  the cycle files in its output", 2/2; frontend `check:feature-cycles:self-test`
  → "detector sees a planted cycle and only that". Then the gates: no circular
  dependency in either repo, and `check:feature-cycles` PASS over **4,839
  resolved imports** — the resolved-import count being the anti-vacuity signal.
- [x] **BSN-01-A12** `frontend/PAGES.md` records the routes and measured status.
  CLOSED in the fifth pass — see BSN-05-080 for the entries added.

## Evidence Required to Close

- Frontend and backend revision pair.
- Route and API matrix with source anchors.
- Overview field checklist with browser evidence for all four scopes.
- Orphan/cross-workspace audit result.
- Exact focused test commands and pass counts.
- Cross-tenant and non-member negative-test results.
- Residual limitations or `none`.

## Evidence Log

`2026-09-19 — BSN-01 (partial, NOT closed) — frontend fb03f49f8 / backend 84394b5fa`

### Closed

- **BSN-01-001/002/005** — contract audit complete. Every workspace, product, project,
  roadmap, goal, team, update, file and insight list endpoint was inventoried against its
  controller, service WHERE clause, query schema, pagination envelope and permission key.
  Product Feedback and project Feedback are confirmed **separate owners**:
  `backend/src/modules/build/core/projects-feedback.service.ts:20` (org-wide
  `feedbackPosts` board, key `build:roadmap:view`) versus
  `backend/src/modules/feedbucket/feedbucket-submissions.service.ts:34`
  (key `feedbucket:submissions:view`).
- **BSN-01-030/037** — `frontend/lib/build/build-nav-model.ts` split by scope ownership,
  **702 → 174 lines**. New owners under `frontend/lib/build/nav/`:
  `build-nav-destination.ts` (63, neutral types), `build-stable-destinations.ts` (39),
  `build-organization-catalog.ts` (145), `build-workspace-catalog.ts` (28),
  `build-managed-product-catalog.ts` (20), `build-project-catalog.ts` (293).
  Largest owner 293, under the 500 hard ceiling. One canonical `resolveBuildNavModel`
  retained; no alias re-exports — all eight consumers were repointed at the owning
  module. `check:file-sizes` no longer lists any Build nav file; the `check:over-300`
  count fell by one (527 → 526 against baseline 513 — the residual overage is
  pre-existing and owned by other lanes). `madge --circular` clean;
  `check:feature-cycles` PASS with 4,688 resolved imports, so the result is not vacuous.

### Repaired beyond the TODO list

`linkProjectToManagedProduct` accepted a managed product from **any** PM workspace.
`backend/src/modules/build/core/projects-write.service.ts:359` now rejects a
cross-workspace link with 400. Pinned by `projects-managed-product-link-workspace.spec.ts`
(5 tests, including a negative asserting `update` is never reached, so the guard cannot
pass vacuously).

### BLOCKED — these destinations must not ship

The PRD rule "missing backend filters block the destination from shipping" applies to
**12 of the requested destinations**. Verified absent at 84394b5fa:

| Destination | Blocker |
|---|---|
| Workspace Products | `listManagedProductsQuerySchema` has no `pmWorkspaceId` (`managed-products.schemas.ts:5-9`) |
| Workspace Teams | `listTeamsQuerySchema` has no `pmWorkspaceId` despite `projectTeams.pmWorkspaceId` being NOT NULL (`teams.schemas.ts:4-8`, `teams.ts:20`) |
| Workspace / Product Roadmap | roadmap list has no workspace, product or project dimension (`roadmap.schemas.ts:5-12`) |
| Workspace / Product Goals | Goals live outside Build (`src/modules/goals/`), filterable by `projectId` only (`goal.schemas.ts:22`) |
| Product Feedback | Feedbucket submissions filterable by `widgetId` only, not `managedProductId` (`feedbucket.schemas.ts:77-85`) |
| Product Insights | no managed-product analytics endpoint exists anywhere |
| Project Updates, Project Files | no such collection exists in schema or API |

**Root cause that must be fixed first (BSN-01-010..019):** the PM-workspace dimension is
currently **vestigial**. No create path accepts `pmWorkspaceId` — `createProjectSchema`
is `.strict()` with no such field and `ProjectsProvisionService` always calls
`resolveDefaultWorkspaceId(orgId)` (`projects-provision.service.ts:37,137`); teams and
managed products do the same (`teams.service.ts:123`, `managed-products.service.ts:72`).
Every record in an org therefore lands in one default workspace, so workspace-scoped
navigation would filter a dataset that is always one workspace deep. Shipping workspace
Overview / Projects / Products / Roadmap / Goals / Teams before this is repaired would
produce exactly the "routes that pretend to be scope-specific while returning
organization-wide data" this PRD forbids.

### Unrun / open

Every Overview page (BSN-01-020..027), the orphan audit (BSN-01-018), and all acceptance
checks BSN-01-A01..A12. No browser evidence was captured.


---

### 2026-09-19 (second pass) — backend write path repaired

The "vestigial PM workspace" blocker recorded above is **partly lifted**.

- `PmWorkspacesService.resolveWorkspaceIdForWrite(orgId, requested?)` is now the
  single answer to "which workspace does this write belong to": absent -> the org
  default (unchanged behaviour), present -> loaded and **org-scoped**, rejecting a
  foreign-tenant id with 404 and an archived workspace with 400. Projects, teams
  and managed products all call it, so three create paths stopped hard-coding the
  default. 5 tests, including one asserting the lookup binds the caller's `orgId`.
- `createProjectSchema` now accepts `pmWorkspaceId` and `managedProductId`;
  `createManagedProductSchema` and `createTeamSchema` accept `pmWorkspaceId`. A
  project may only be linked to a product in **its own** workspace, enforced on
  create (`resolveManagedProductForWorkspace`) as well as on update.
- Scope filters now reach the WHERE clause: `pmWorkspaceId` on the managed-product
  and team lists, `managedProductId` on the project list, plus `search` on
  managed products and workspaces. 6 tests render the real Drizzle condition with
  `PgDialect().sqlToQuery().params` and assert the bound values — including a
  negative proving no workspace constraint is added when none is requested.
- Updating the three create paths broke 7 existing specs whose `PmWorkspacesService`
  doubles only stubbed `resolveDefaultWorkspaceId`. All four doubles were updated;
  **backend `src/modules/build` is 152 suites / 795 tests, all green.**

**Delivered navigation:** workspace scope now has Projects, Products, Teams and All
work, each backed by a real filter; managed-product scope gains Linked projects.
Three new routes were added with matching route-access entries so the URL cannot be
reached without the key the sidebar link requires.

**Honesty note on the workspace root:** its base path renders the project list, so
the destination is labelled **Projects**, not Overview. A test pins that label
specifically, because calling a list an Overview is the defect BSN-01-023 exists to
prevent. Real Overview pages remain unbuilt.

**Still blocked:** Roadmap, Goals, product Feedback and product Insights have no
scope dimension at all in the backend, so those six destinations remain unshipped
and BSN-01-010/012/021/031/032 stay open rather than being marked done on partial
delivery.
