# BSN-02 — Scope Directory and Discovery PRD

## Tracker

Completion is recorded only in the Master Checklist of
[`README.md`](./README.md). Populate the Evidence Log before checking that
parent box.

## Outcome

The unified selector finds every accessible Build scope, preserves the real
organization hierarchy, scales to enterprise data volumes, and never restores
access through stale local preferences.

## Dependencies

- BSN-01 scope identifiers, permissions, hierarchy ownership constraints, and
  bounded API contracts.
- Existing organization- and actor-scoped preference storage.
- Existing shared search, popover, drawer, empty-state, and error-state
  components.
- BSN-04 verifies revocation and cache isolation against this PRD; it does not
  redefine stars or recents.

## Directory Model

The hierarchy is:

```text
Organization
└── PM workspace
    ├── Managed product
    │   └── Linked project
    └── Standalone project
```

Portfolios, programs, and teams are not selector parents. A project always has a
PM workspace and may additionally have a managed product that belongs to the
same workspace.

## Search and Pagination

- Search is server-backed for workspaces, managed products, and projects.
- Search matches normalized name, workspace or product name, and project key
  where applicable.
- Search results include type, parent path, stable identifier, archived state,
  and project key.
- Results are permission-filtered before they leave the backend.
- Each result type uses bounded cursor or stable-key pagination.
- The selector loads more results intentionally or through a virtualized list;
  it does not silently filter only the first 50 records.
- Search requests are debounced, cancellable, and isolated by organization,
  actor, query, archive mode, permission version, and page cursor.

## Preference Rules

- Starred scopes are capped at 20.
- Recents are capped at six and ordered by last successful access.
- Stored references are hints only and never grant access.
- Reconciliation uses a bounded batch resolve-by-id API for the stored keys,
  never the paginated browse or search page.
- A scope missing from that resolve response is removed from storage.
- Renames and moves refresh stored display metadata from the resolve response.
- Deleted, inaccessible, or permission-revoked entries disappear.
- Archived entries appear only when archive visibility is enabled and access
  remains valid.
- Valid off-page favorites remain visible after reconcile because resolve is
  id-based, not page-based.

## Remaining Implementation

Completed requirements are preserved in the Evidence Log and are no longer
duplicated as TODO checkboxes.

### Backend Directory Contract

- [ ] **BSN-02-005** Enforce tenant, workspace, product, project, and record
  authorization in the directory query. **Workspace, project and tenant halves
  are CLOSED** (fourth pass). **The product half is now authored** (fifth pass)
  and stays open only as DONE-PENDING-MIGRATION. `build.managed_product_memberships`
  exists in `db/schema/build/managed-product-memberships.ts`, is exported from
  the build barrel, and is created by migration
  `1125_build_managed_product_memberships` (journal idx 1013) — composite unique
  `(org_id, managed_product_id, organization_membership_id)`, org-led composite
  index for list reads, a secondary index on `organization_membership_id` for
  revocation sweeps, and three FKs authored `NOT VALID` then `VALIDATE` so
  neither `organizations`, `build.managed_products` nor `organization_members`
  is held under ACCESS EXCLUSIVE. `ScopeDirectoryService` now runs a product
  membership task in parallel with the workspace and project tasks: a
  non-member's products are excluded, `build:manage` at `all` scope bypasses the
  membership query entirely, a null `membershipId` short-circuits before any DB
  read, and two orgs sharing one `membershipId` each stay bound to their own
  `orgId`. 34 tests in `scope-directory.service.spec.ts`, including the negative
  gate. **The migration is UNAPPLIED** — no database is available, and a
  migration is unverified until applied (same blocker as BSN-02-006).
- [ ] **BSN-02-006** Apply and measure the authored workspace hierarchy indexes
  in a named disposable database. Migration `1122` is authored and
  journal-registered; **no database exists on this machine**, and a migration is
  unverified until applied.

### Frontend Directory and Hierarchy

- [ ] **BSN-02-014** Support bounded pagination or virtualization without
  duplicate, skipped, or reordered rows. Browse still exposes one page plus a
  search hint (`build-scope-browser.tsx:390-394` renders "Showing the first …
  only. Search to find any scope you can access."), not a continuation control.
  ⚠ **This was IMPLEMENTED in the fifth pass and then LOST.** An agent replaced
  the hint with per-section `LoadingButton` continuation over
  `useInfiniteProjects` plus cursor accumulation for workspaces and products,
  with tests for de-duplication, page order, and cursor reset on filter change —
  and reported 384 passing tests. A concurrent session then reverted every
  uncommitted tracked modification in the frontend repo, and file inspection
  confirms neither the source change nor the tests survive. Re-checked at
  `build-scope-browser.tsx:390-394`: the hint is back. **Item remains open and
  must be rebuilt**; see the README Evidence Log for the incident.

### Keyboard and Responsive Interaction

- [ ] **BSN-02-030** Implement keyboard movement, selection, expansion,
  dismissal, and focus restoration for the selector. **Movement, selection and
  expansion are CLOSED** with ARIA `tree`/`treeitem`/`group` and
  `listbox`/`option` roles. Dismissal and focus restoration are delegated to the
  `ResponsivePopover` (Radix) primitive and are NOT independently proven — jsdom
  has no real focus, so this needs a browser.
- [ ] **BSN-02-033** Measure 44 by 44 CSS-pixel touch targets without reducing
  compact desktop density. Implemented (`min-h-[44px] md:min-h-0` on the row
  button, `h-11 w-11 md:h-5 md:w-5` on the expander) but **unmeasurable in
  jsdom** — no layout engine.
- [ ] **BSN-02-034** Verify reduced motion for hierarchy expansion and selector
  transitions in a real browser. Implemented (`motion-reduce:transition-none`,
  `motion-reduce:animation-none`) but **unverifiable in jsdom** — no media
  query engine.

## Completed Implementation Inventory

### Closed in the fifth pass (2026-09-19)

Each item below was verified against source before closing; the evidence is the
reason it is here rather than in the checklist above.

- **BSN-02-A06** A starred off-page scope survives reconcile and a revoked
  stored scope disappears. CLOSED in the fifth pass — no browser needed, because
  reconciliation is resolve-by-id, not browse-page-dependent.
  `use-reconciled-build-scopes.test.tsx` seeds `project:999`, a key absent from
  any browse page, mocks the resolve hook to return it, and asserts it survives
  in `entries` with `onPrune` never called. The revoked half is the same test's
  mirror: a stored scope the resolve call does not return is pruned.
- **BSN-02-A12** Focused frontend, backend, cache-isolation, and
  cross-tenant tests pass. CLOSED in the fifth pass. Focused frontend and backend
  runs are recorded under BSN-01-A09. Cache isolation and cross-tenant are named
  explicitly here because they are the ones that fail silently:
  `build-scope-cross-organization-isolation`, `build-scope-cross-tab-reconciliation`,
  `query-scope-isolation` and `build-cache-sync` → 4 suites / 40 tests pass. The
  first of those proves the **scoped query hash** is the guard — it includes a
  case showing a plain unscoped `QueryClient` is the failure mode — rather than
  the client container, which is the distinction that makes the test meaningful.


- **BSN-02-001/002/004/007/008** — one bounded, validated, server-searched
  directory and resolve contract exists with deterministic page caps.
- **BSN-02-010/011/012/013/018** — the client uses server search, nests valid
  standalone and linked projects, disambiguates names, and quarantines invalid
  hierarchy rows.
- **BSN-02-020/021/022/023/024/025** — stars and recents reconcile, refresh,
  prune, remain actor/org scoped, and expose the authorized row-action set.
- **BSN-02-031/032** — full accessible row labels and the responsive
  popover/drawer owner are implemented.

Closed in the fourth pass (2026-09-19), each with a test that fails if the
behavior regresses:

- **BSN-02-003** — the resolve contract was audited field-by-field against the
  Drizzle columns: `key`, `type`, `id`, `name`, `parentKey`, `projectKey`,
  `isArchived`, `parentPath`, `clientPortalEnabled`. No field the consumer needs
  is omitted, and nullability matches the column. `parentPath` and
  `clientPortalEnabled` were already returned; the prior "capability metadata
  incomplete" note was stale. 30 tests in `scope-directory.service.spec.ts`.
- **BSN-02-009** — cross-tenant, revoked-access (workspace membership bound to
  both `orgId` and `membershipId`), archived, duplicate-name and resolve-by-id
  coverage.
- **BSN-02-015** — `useDebouncedValue(search.trim(), 300)` in
  `use-build-scope-directory.ts`; the three underlying hooks already forward the
  `AbortSignal`, and Query v5 aborts on key change. Proven by a test asserting
  the DEBOUNCED term reaches `useProjects`, plus one proving a blank query fires
  no request.
- **BSN-02-016** — `isRefreshing` distinguishes background refetch from initial
  load, so results stay visible; a spinner renders beside the archive toggle.
- **BSN-02-017** — the four states are now distinct. Root cause found: `useCan`
  collapses "loading" and "denied" into `false`, so a denied actor saw "no
  accessible scopes". `useCanState("build:view")` separates them; render order
  is loading → denied → error → no-matches → no-scopes → content, with six
  state-isolation tests.
- **BSN-02-026** — archived rows carry an explicit badge and reduced opacity,
  are filtered from every computed array when the toggle is off, and
  hierarchy-broken rows render in a separate labelled tree.
- **BSN-02-027** — proven at BOTH levels. The hook resolves a starred scope by
  id even when it is not on browse page one, and prunes a revoked one; and the
  rendered entry point is source-verified — `build-scope-browser.tsx:58-60`
  passes `stars.replaceStarred` as `onPrune`, and lines 342-355 render
  `liveStarred`/`liveRecents`, the reconciled lists. This did NOT need a browser.

## Acceptance Checklist

- [ ] **BSN-02-A01** A scope beyond the first 50 records is discoverable by
  search and pagination.
- [ ] **BSN-02-A02** A standalone project appears under its PM workspace.
- [ ] **BSN-02-A03** A linked project appears under its product with an
  unambiguous workspace path.
- [ ] **BSN-02-A04** Duplicate names remain distinguishable to visual and
  screen-reader users.
- [ ] **BSN-02-A05** Revoking access removes a scope from search, stars, and
  recents without requiring local-storage cleanup.
- [ ] **BSN-02-A07** Rename, move, archive, restore, and delete behavior matches
  the lifecycle contract.
- [ ] **BSN-02-A08** Rapid queries and organization switches never render late
  results from the previous scope.
- [ ] **BSN-02-A09** Keyboard-only selection completes without focus loss.
- [ ] **BSN-02-A10** Desktop, tablet, and mobile selector journeys pass.
- [ ] **BSN-02-A11** Directory and resolve queries remain bounded and use
  verified indexes.

## Evidence Required to Close

- API contract and query-plan anchors.
- Pagination test proving discovery after the first page.
- Resolve-by-id allow/deny and off-page-favorite tests.
- Revocation and cross-tenant negative-test results.
- Cache-key and writer/invalidation matrix for directory and preferences.
- Browser evidence at 375, 768, and 1280 CSS pixels.
- Keyboard and screen-reader-label evidence.
- Exact commands, pass counts, and residual limitations.

## Evidence Log

`2026-09-19 — BSN-02 (partial, NOT closed)`

### Closed

- **BSN-02-002/004/007/010** — search is now server-backed for all three scope
  types. `search` added to the managed-product and PM-workspace list contracts
  (`managed-products.schemas.ts`, `pm-workspaces.schemas.ts`) and applied in the
  WHERE clause; projects already had it. The selector no longer filters a first
  page in the client. Every list stays capped at 100 by `pageSizeField`.
- **BSN-02-008** — `POST /build/scope-directory/resolve` accepts **at most 26**
  keys (20 stars + 6 recents), groups them by type, and answers in **at most 3
  queries** (`inArray` per type, skipped entirely for a type with no keys). A key
  that does not resolve inside the caller's org, or is soft-deleted, is simply
  **absent** from `data` — never an error, never a placeholder. That absence is
  the pruning signal.
- **BSN-02-020/021/023** — starred and recent scopes are reconciled through that
  contract before render (`use-reconciled-build-scopes.ts`). Entries the resolve
  omits disappear from the rendered list **and** are pruned from storage. The
  prune runs only on `isSuccess` and only when the resolved count differs, so it
  terminates rather than looping.
- **BSN-02-013** — rows keep parent path and project key for disambiguation.
  Parent names are resolved from an **unfiltered** hierarchy query held separately
  from the search query, because server-filtering the product list would otherwise
  strip the parent a matched project needs and the row would falsely read as
  organization-level.

### Deliberately not done

**No index migration was authored.** `managedProducts` and `projectTeams` have no
`(org_id, pm_workspace_id)` index — only `(org_id, status)`. The correct DDL is
`CREATE INDEX CONCURRENTLY idx_managed_products_org_workspace ON managed_products (org_id, pm_workspace_id) WHERE deleted_at IS NULL`
and the equivalent for `project_teams`. It is **not** written, because a
hand-authored migration must be registered in `migrations/meta/_journal.json` and
this session has no database to apply or verify it against; an unverified journal
entry is worse than a missing index. **BSN-02-006 stays open.**

Search on workspaces and products uses a leading-wildcard `ILIKE`, matching the
existing teams and projects implementation. Under RLS a trigram index would not be
usable anyway, but at the enterprise volume BSN-05 specifies this needs measuring.

### Open

BSN-02-003 (no capability metadata, parent **path** not returned — only
`parentKey`), BSN-02-005 (org-scoped + `build:view`; workspace and product
**membership** is not enforced in the directory query), BSN-02-006 (indexes),
BSN-02-009 (duplicate-name and pagination-boundary tests absent),
BSN-02-011/012/014..018, BSN-02-022 (names and `parentKey` refresh; parent **path**
still comes from storage), BSN-02-024..027, BSN-02-030..034, and every acceptance
check BSN-02-A01..A12.

### 2026-09-19 — current reconciliation addendum

The earlier “Deliberately not done” and “Open” snapshots above are historical.
Migration `1122_build_workspace_scope_indexes.sql` is now authored and
journal-registered, and `parentPath` now comes from the resolve contract.
Reconciliation writes renamed and moved metadata back by comparing every stored
field, not only list length. A focused off-page resolve test now proves that an
ID-resolved `project:999` survives even when it is absent from browse page one;
BSN-02-027 remains open because the rendered selector entry point is not yet
covered.

The browser follow-up verified scope search, Arrow Up/Down, Escape dismissal and
focus restoration at desktop width, plus the shell at 1280, 768, and 375 CSS
pixels. It did not cover mobile scope switching, Enter/Left/Right hierarchy
behavior, or every selector touch target. Reduced-motion emulation found active
150 ms transitions. Those transitions were repaired afterward and the focused
navigation suite is green, but BSN-02-030/033/034 and A09/A10 remain open until
the missing journeys and reduced-motion browser re-run pass.
