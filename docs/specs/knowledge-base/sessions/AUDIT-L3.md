# AUDIT-L3 — S06 (Wiki Home) and S07 (Spaces + Space detail)

Lane L3 of 8. Scope: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md` slices S06 (lines ~578-589) and S07
(lines ~593-604). Method: every box re-measured against the current working tree before any code was
written, per the twelfth-pass finding at ledger line 2159-2160 and the SESSION-03 evidence at
`sessions/SESSION-03.md`. Backend repo: `D:/projects/personal/Streamlineos/backend` (separate git repo).

All Jest runs below used `npx jest --runTestsByPath <files> -w 2`, never a repo-wide gate. No git state
command was run beyond read-only `status`/`diff`/`log`.

---

## S06 — Wiki Home

### `[ ] Compact search field linked to full results`
**DONE** — `frontend/features/wiki/components/wiki-home-page.tsx:89-97` renders a `SearchInput` in a
`role="search"` form that pushes to `KB_SEARCH?q=...` on submit (`wiki-home-page.tsx:48-54`).

### `[ ] URL-backed status, spaceId, owner, view controls`
**DONE** — `frontend/features/wiki/components/wiki-home-all-pages.tsx:293-302` reads `status`, `space`,
`owner`, `sort`, `view` straight from `useSearchParams()` and writes them back via `useUrlFilters().update`
(`wiki-home-all-pages.tsx:337-359`).

### `[ ] Card/list toggle, result count, cursor for All pages`
**DONE** — list/card toggle: `wiki-home-all-pages.tsx:471-494`. Result count: `TablePagination`
(`frontend/components/ui/table-pagination.tsx:138`) renders `"N results on this page"`, consumed by both
the `DataTable` pagination prop and the card-view `TablePagination` in `wiki-home-all-pages.tsx:513-521`.
Cursor: `useKbPageCollection` → `GET /kb/pages` with `cursor`/`limit` (`frontend/hooks/api/kb/page-collection.ts:48-59`),
backend `KnowledgeCollectionService.listPages` does a keyset `limit+1` read
(`backend/src/modules/kb/core/collection/knowledge-collection.service.ts:168-171`).

### `[ ] Page-card menu via the single action descriptor model`
**DONE** — `frontend/features/wiki/lib/page-action-descriptors.ts` is the one descriptor table
(`resolveKbPageActions`/`groupKbPageActions`), consumed by `wiki-home-all-pages.tsx:143-159` (`AllPagesItemMenu`)
and by `wiki-page-collection-table.tsx:98-115` (used on space detail, private and shared pages). Verified
with `npx jest --runTestsByPath frontend/features/wiki/lib/page-action-descriptors.test.ts` — 1 suite, all
green.

### `[ ] Trust badges (draft/published/archived, verified/stale, owner missing)`
**DONE** — `frontend/features/wiki/components/kb-collection-badges.tsx`: `StatusBadge` covers
draft/in_review/published/archived (lines 49-63); `TrustBadge` covers verified/verification_expired
("Stale")/unverified (lines 6-18). "Owner missing" badge: `wiki-home-all-pages.tsx:263-270`.

### `[ ] First-run path: blank, template, or import`
**DONE** — `wiki-home-all-pages.tsx:402-413`: primary action "Create a page", secondary "Browse templates",
tertiary "Import pages" (gated on `kb:pages:import`), via `EmptyState`'s `tertiaryAction` prop.

### `[ ] Remove tree rendering for All pages; children load only on expand`
**DONE** — `WikiHomeAllPages` never calls the tree endpoint; it reads `useKbPageCollection` → `GET /kb/pages`,
a flat cursor list (`wiki-home-all-pages.tsx:316-324`). The sidebar tree (`frontend/features/wiki/components/page-tree.tsx`)
also no longer bulk-fetches: it uses `useKbPageTreeInfinite` (root level only, `PAGE_LIMIT`-bounded,
`InfiniteScrollSentinel`-driven) and each node's children load lazily via `useKbPageChildrenLevel(node.id, expanded)`
only once expanded (`frontend/features/wiki/components/page-tree-item.tsx:88`). The old `MAX_TREE_NODES = 2000`,
no-`hasMore` behaviour the twelfth pass flagged at `kb-page-tree.service.ts` is gone — `getTreeLevel`
(`backend/src/modules/kb/wiki/kb-page-tree.service.ts:76-172`) now returns a real `CursorPage` with `hasMore`.
`useKbPagesTree()` (`frontend/hooks/api/kb/pages.ts:120-136`, the old whole-tenant call) still exists but is
dead code — nothing imports it any more (`grep -rn "useKbPagesTree\b" frontend` matches only its own
declaration). Left as-is: not touched by this session's later, coordinator-authorized edit to the neighbouring
`useKbPageChildrenLevel` in the same file (see the "every child request carries spaceId" box below).

### `[ ] Acceptance: responsive at 100,000 tenant pages without downloading the tree`
**DONE (structural proof)** — no capture stack/production 100k-page dataset exists, so this is proven the way
the brief allows: every request is bounded. `kbPageCollectionQuerySchema.limit` is capped at `PAGE_SIZE_CAP = 100`
(`backend/src/common/pagination/list-query.schema.ts:4`, `backend/src/modules/kb/core/dto/kb.schemas.ts:184-189`);
the collection and tree services both do `.limit(query.limit + 1)` keyset reads, never an unbounded scan
(`knowledge-collection.service.ts:168`, `kb-page-tree.service.ts:136`). Page count therefore never enters the
request shape — the same query executes identically at 10 pages or 100,000.

**S06 tally: 8/8 DONE.**

---

## S07 — Spaces + Space detail

### `[ ] Server-projected page/member counts`
**DONE** — `KbSpacesService.list` computes `articleCount`/`pageCount`/`memberCount` via three grouped
queries against the already-fetched `spaceIds` (`backend/src/modules/kb/wiki/kb-spaces.service.ts:185-236`,
no per-space round trip).

### `[ ] Search, audience/status filters, cursor, list view`
**DONE** — `frontend/features/wiki/components/spaces-page.tsx:234-260` (search + audience + archived
selects), cursor via `useCursorPagination`/`TablePagination` (lines 75, 290-300).

### `[ ] Members sheet; owner; last updated; manager health summary`
**OPEN → FIXED.** Measured first: `SpaceMembersSheet` (`frontend/features/wiki/components/space-members-sheet.tsx`)
and `useKbSpaceMembers` (`frontend/hooks/api/kb/spaces.ts:174-191`) already existed but had **zero
consumers** anywhere in the tree (`grep -rn "SpaceMembersSheet" frontend` matched only its own file before
this session) — this is exactly the twelfth-pass finding at ledger line 2160, still true after SESSION-03.
`owner`/`last updated`/`manager health summary` were also absent from `SpaceCard`.

Fixed:
- Backend `KbSpacesService.list` now left-joins `organizationMembers`/`users` to resolve `ownerName`
  (creator's display name) and runs a fourth grouped query for `pagesOverdueForReview` (pages with
  `nextReviewAt IS NOT NULL AND nextReviewAt < now()`), all still batched — no N+1
  (`backend/src/modules/kb/wiki/kb-spaces.service.ts:156-291`). Response schemas updated additively
  (`backend/src/modules/kb/wiki/dto/kb-space-response.schemas.ts:100-101,116-117`,
  `frontend/hooks/api/kb/kb-spaces-settings-schema.ts:14-17`).
- `SpaceCard` (`frontend/features/wiki/components/space-card.tsx`) now renders "Owned by X · Updated Nh ago"
  and, for managers, an amber "N pages overdue for review" badge (the health summary) plus a **Members**
  button that opens `SpaceMembersSheet` (wired via `spaces-page.tsx:115-116,197-204,230-236,354-359`).
- Tests: `backend/src/modules/kb/wiki/kb-spaces-review-summary.spec.ts` (new, 4 tests — 2 BITE-verified:
  reverted the `list()`/`get()` field mapping by hand, confirmed both new assertions fail, restored,
  confirmed pass). `frontend/features/wiki/components/spaces-page.test.tsx` gained 4 tests (owner/updated
  line, health badge shown-to-manager/hidden-from-non-manager, Members sheet opens on click).
- Run: `npx jest --runTestsByPath backend/.../kb-spaces-review-summary.spec.ts backend/.../kb-spaces-cursor.spec.ts
  backend/.../kb-spaces-tenant-isolation.spec.ts backend/.../kb-spaces-ask-indexed.spec.ts -w 2` → 4 suites,
  14 tests, all green. `npx jest --runTestsByPath frontend/features/wiki/components/spaces-page.test.tsx -w 1`
  → 14 tests, all green.

### `[ ] Archive/restore replacing customer-facing hard delete; restore idempotent`
**DONE** — `KbSpacesController` exposes `POST :spaceId/archive` / `POST :spaceId/restore`
(`backend/src/modules/kb/wiki/kb-spaces.controller.ts:130-154`); `DELETE :spaceId` still exists but is a
soft `deletedAt` set plus outboxed content-delete events, not a customer hard delete
(`kb-spaces.service.ts:465-517`). `restore()` unconditionally sets `archivedAt: null` with no precondition
on current state — calling it twice is a no-op the second time, not an error (`kb-spaces.service.ts:367-384`).

### `[ ] Archive impact preview: pages, public links, Ask index impact, record links`
**DONE** — `archiveImpact()` (`kb-spaces.service.ts:386-463`) returns `pageCount`, `publicLinkCount`,
`recordLinkCount`, and `askIndexed` computed from `kbSources.chunkCount > 0` (a real chunk measurement, not
`pageCount > 0` — the exact defect the twelfth pass flagged at ledger line 2160 and SESSION-03 fixed).
Verified still true: `backend/src/modules/kb/wiki/kb-spaces-ask-indexed.spec.ts` — 4 tests, green. Consumed
by `SpaceArchiveImpact` (`frontend/features/wiki/components/space-archive-impact.tsx`), which was previously
wired only into `spaces-page.tsx`'s archive dialog; this session also wired it into the new space-detail
archive dialog (see below) so the preview appears wherever a manager can archive a space.

### `[ ] Space detail: breadcrumb, audience/access badge, in-space search, status/owner filters, create-in-space, lazy hierarchy, review-policy summary, inaccessible vs not-found recovery`
**OPEN → PARTIALLY FIXED + 2 items BLOCKED/HANDED OFF.** This is eight sub-requirements folded into one box
(see `docs/specs/knowledge-base/02-page-component-spec.md` §6). Measured each individually against
`frontend/features/wiki/components/space-detail-page.tsx` as it stood at session start:

| Sub-item | Was | Now |
|---|---|---|
| breadcrumb | `backHref={KB_SPACES}` back-link | unchanged — **DONE**, matches SESSION-03's own evidence for this item |
| audience badge | present | unchanged — **DONE** |
| **access badge** | absent | **BLOCKED** — see below |
| in-space search | present via `WikiPageCollectionTable` | unchanged — **DONE** |
| status filter | present | unchanged — **DONE** |
| **owner filter** | absent | **not fixed — HANDOFF**, see below |
| **create-in-space** | absent (no "New page" button anywhere on the page) | **FIXED** |
| **lazy hierarchy** | absent (flat table only) | **FIXED** |
| **members sheet** | absent | **FIXED** |
| **archive** | absent (only reachable from the Spaces list) | **FIXED** |
| **review-policy summary** | absent, no backend field even existed | **FIXED** |
| inaccessible vs not-found recovery | present | unchanged — **DONE** |

**access badge — BLOCKED.** A per-viewer graded access level for a space (view/comment/edit/manage) does
not exist anywhere in the backend. `computeAccessibleSpaceIds` (`backend/src/modules/kb/core/authorization/knowledge-space-scope.ts`)
returns only binary reach — a space id is either in the accessible set or it isn't. This is a
previously-documented, carried-forward gap: ledger line 975 states "a space should confer a graded access
level... `kb_space_members.role` is currently overloaded... the mapping cannot be defined until that column's
two meanings are separated... needs a product decision." `KB_ACCESS_LABELS` (`kb-collection-badges.tsx:20-25`,
used today only by `shared-page.tsx` for externally-shared pages) has no space-level equivalent to render
against. Building this would mean inventing access-level semantics the product owner hasn't decided —
correctly out of scope per the brief's "a preference is NOT blocked" rule this is not; it's an unresolved
upstream product decision, not a preference.

**owner filter — not fixed, HANDOFF.** `WikiPageCollectionTable` (`frontend/features/wiki/components/wiki-page-collection-table.tsx`)
is the shared component space-detail, private-page and shared-page all render, and it has no Owner select —
only `WikiHomeAllPages` (a sibling, near-duplicate implementation) has one. `wiki-page-collection-table.tsx`
is **not** in L3's file territory (only `wiki-home-*.tsx`, `wiki-page-card.tsx`, `page-action-descriptors.ts`
are). See Handoffs.

**create-in-space, lazy hierarchy, members sheet, archive — FIXED.** `space-detail-page.tsx` now has:
- A "New page" button in the page actions, gated on `kb:pages:create`, that calls `useCreateKbPage({ spaceId })`
  and navigates to the new page.
- A "Hierarchy" panel reusing the existing `PageTree` component (already lazy per the S06 fix above) scoped
  by `spaceId={spaceId}`, alongside the existing flat `WikiPageCollectionTable`.
- A "Members" button (gated on `kb:spaces:manage`) opening `SpaceMembersSheet` — the same previously-dead
  component from the box above, now reachable from both the Spaces list and Space detail.
- "Archive"/"Restore" buttons (gated on `kb:spaces:manage`) with a `ConfirmDialog` carrying the
  `SpaceArchiveImpact` preview, plus an "Archived" badge in the header when `archivedAt` is set.

**review-policy summary — FIXED.** `KbSpacesService.get()` now also returns `pagesOverdueForReview` and
`pagesWithReviewPolicy` (pages in the space with `nextReviewAt` set), computed from the existing
`kb_pages.next_review_at`/`review_interval_days` columns — no migration needed, no schema change. Rendered
in the space header as "N pages under review policy · M overdue" (manager-only). This intentionally does not
touch the separate `kb_page_reviews` approval-workflow table (owned by the Reviews slice, not S06/S07) — see
Handoffs for why.

Tests: `frontend/features/wiki/components/space-detail-page.test.tsx` — rewritten with the existing 7 tests
preserved plus 8 new ones (lazy hierarchy present, New page button shown/hidden by permission and creates
with `spaceId`, Members/Archive shown/hidden by permission and Members sheet opens, Restore replaces Archive
once archived, archive dialog carries the impact preview, review-policy summary rendered). Run:
`npx jest --runTestsByPath frontend/features/wiki/components/space-detail-page.test.tsx -w 1` → 15/15 green.
`npx eslint` on all touched frontend files → 0 problems (one pre-existing unused-var warning in
`spaces-page.test.tsx` untouched by this session).

### `[ ] Every child request carries spaceId, tenant, parent/cursor, current access`
**OPEN → FIXED.** `getTreeLevel` (`backend/src/modules/kb/wiki/kb-page-tree.service.ts:76-172`) already
accepted and filtered on `spaceId`/`parentId`/`cursor` together with the org and the visibility predicate
(`current access`) on every call — confirmed by `kb-page-tree-tenant-isolation.spec.ts` (10 tests, green).
But `useKbPageChildrenLevel(nodeId, enabled)` (`frontend/hooks/api/kb/pages.ts:202-225`), which fires
whenever a tree node — including the new space-detail hierarchy panel — is expanded, sent only
`parentId`+`cursor`, never `spaceId`. Not a security hole (a page's `parentPageId` already uniquely
identifies its own subtree, and the org/visibility predicate was still applied), but it did not literally
satisfy "every child request carries spaceId," and it was live: the space-detail hierarchy panel this
session added calls exactly this hook on every expand.

Fixed: `useKbPageChildrenLevel` now takes an optional third `spaceId` parameter, includes it in both the
request params and the query key when provided (`pages.ts:202-227`), and is threaded end to end — `PageTree`
already received a `spaceId` prop and now passes it to each root `PageTreeItem`
(`features/wiki/components/page-tree.tsx`), and `PageTreeItem` now accepts a `spaceId` prop, passes it into
its own `useKbPageChildrenLevel` call, and forwards it to its recursively-rendered children
(`features/wiki/components/page-tree-item.tsx`). The fix is not inert: it is reachable from the real
`PageTree` component the space-detail hierarchy panel renders.

Test: `frontend/hooks/api/kb/page-children-level-space-scope.test.tsx` (new) — a BITE test asserting
`apiClient.get` is called with `{ parentId, spaceId }` when the hook is given a `spaceId`, paired with a
positive control asserting `spaceId` is omitted when none is given. Reverted the hook by hand first: the
BITE test failed (`Received: {"parentId": 9}` — no `spaceId`), the positive control still passed; restored
the fix, both green. Run: `npx jest --runTestsByPath frontend/hooks/api/kb/page-children-level-space-scope.test.tsx -w 1`
→ 2/2. Full regression: `npx jest --runTestsByPath` across all touched wiki hook/component specs → 10 suites,
88 tests, green. `npx eslint` on all four touched files → 0 problems.

### `[ ] Move checks both source and target space`
**OPEN → FIXED.** Measured first: `KbPageTreeService.move` (`backend/src/modules/kb/wiki/kb-page-tree.service.ts`)
authorized the page being moved and the target **parent page**, but never compared the page's own `spaceId`
against the target parent's `spaceId`, and never updated `spaceId` on move. `MovePageDialog`
(`frontend/features/wiki/components/move-page-dialog.tsx:44-48`) searches **all** pages org-wide with no
space filter, so a user can pick a parent from a different space through the real UI — this was a live,
reachable defect, not theoretical. Moving a page under a cross-space parent left the moved page's `spaceId`
stale (still its old space) while its new parent lived in a different space — an inconsistent hierarchy that
`getTreeLevel`'s `spaceId`-scoped queries would then silently drop the page from (it would be unreachable
from its own new parent's space-scoped listing).

Fixed: `move()` now resolves the target parent's `spaceId`, and when it differs from the page's own
`spaceId`, calls `KbAccessService.assertSpaceAccessible(user, targetSpaceId)` (404 if the actor cannot reach
the target space) before writing, and the transaction now sets the page's `spaceId` to the target parent's
space alongside `parentPageId`/`sortOrder`.

This also closes the SESSION-03 HANDOFF text ("posted for SESSION-01... The `move` operation must check
that the caller can access BOTH the source page's space AND the target space... call
`access.assertSpaceAccessible(user, targetSpaceId)`") — that HANDOFF sat unaddressed in this exact file
until this session.

**Hardened after coordinator review.** `KbAccessService` was first injected as an *optional* constructor
parameter (`kbAccess?: KbAccessService`), called with `this.kbAccess?.assertSpaceAccessible(...)`, specifically
to avoid touching the eight pre-existing spec files across the wiki module that construct `KbPageTreeService`
with 4 args. The coordinator flagged this as an authorization guard that **fails open**: if the DI wiring
ever drops (module import removed, provider reordered), `this.kbAccess` resolves to `undefined`, `?.`
silently no-ops, and the cross-space move is permitted with every existing test still green, because those
tests inject the mock directly and never exercise a missing dependency. Fixed: the parameter is now required
(`kbAccess: KbAccessService`, `kb-page-tree.service.ts:75`) and the call site dropped the `?.`
(`this.kbAccess.assertSpaceAccessible(...)`, `:374`) — a missing provider now fails at Nest boot, not
silently at the authorization check. All eight call sites (`kb-page-tree-enumeration.spec.ts`,
`kb-page-tree-restore-reindex.spec.ts`, `kb-page-tree.acceptance.spec.ts`, `kb-page-tree.cursor-stability.spec.ts`,
`kb-softdelete-chunk-purge.spec.ts`, `kb-wiki-project-scoped.spec.ts`, plus the two in
`kb-page-tree-tenant-isolation.spec.ts` and this session's own `kb-page-tree-move-space-consistency.spec.ts`)
now pass a 5th `kbAccess` stub — none of those tests exercise a cross-space move, so a `{ assertSpaceAccessible:
jest.fn().mockResolvedValue(undefined) }` double is sufficient for them; the branch is never reached.

Tests: `backend/src/modules/kb/wiki/kb-page-tree-move-space-consistency.spec.ts` (5 tests total). The original
3 BITE-verified by hand: reverted the fix, ran the suite — 2 of 3 failed (`BITE: adopts the target parent's
space...` and `refuses the move when the actor cannot access the target parent's space...`); the positive
control (same-space move) passed both before and after, as it should. Restored the fix, reran — 3/3 green.

Per the coordinator's ask, this no longer stops at "the mock was called" — a new pair proves the decision is
real, not a mock interaction: `KbPageTreeService.move — the space check is a real authorization decision, not
a mock interaction` constructs `KbAccessService` the way production does (`new KbAccessService(db, cache,
access)`, matching the existing pattern in `kb-access.service.spec.ts`), with a mocked `db`/`cache`/`access`
underneath but the **real** `getAccessibleSpaceIds` → `computeAccessibleSpaceIds` → `assertSpaceAccessible`
call chain on top. One test grants the actor membership in the source space only and asserts the cross-space
move is rejected (404); the other grants membership in both spaces and asserts the same move succeeds. Both
were BITE-verified against the unfixed code (reverted the `move()` space check by hand): the negative failed
(`Resolved to value` instead of rejecting), the positive control still passed; restored, both green.

Full regression across the whole `kb-page-tree*`/`kb-wiki-project-scoped`/`kb-softdelete-chunk-purge` spec
family plus `kb-membership-uniqueness.spec.ts`: `npx jest --runTestsByPath` → 15 suites, 78 tests, all green
(`kb-membership-uniqueness.spec.ts` is now green too — lane L5's in-flight `kb-page-templates.service.ts` edit
has since been fixed on its end; see the note below). `npx eslint` on every touched backend file → 0 errors,
2 pre-existing unused-var warnings in files this session only appended a constructor argument to
(`queryCount` in `kb-page-tree.acceptance.spec.ts`, `txDelete` in `kb-softdelete-chunk-purge.spec.ts`), neither
introduced by this change.

**S07 tally: 3 DONE outright, 5 FIXED (members/owner/last-updated/health-summary; create-in-space/lazy-hierarchy/members-sheet/archive on space detail; move space-check, hardened to fail closed; child-request spaceId on tree-expand; review-policy summary folded into the space-detail box), 1 BLOCKED (access badge), 1 item HANDED OFF within an otherwise-fixed box (owner filter) — no box left merely "open."**

---

## Pre-existing failure, not caused by this session — now resolved by another lane

`backend/src/modules/kb/wiki/kb-membership-uniqueness.spec.ts` briefly failed 2 of 12 tests
(`KbPageTemplatesService › BITE: list is bounded...` and `...never a larger locally invented cap...`, both
`TypeError: this.db.select(...).from(...).leftJoin is not a function` at `kb-page-templates.service.ts:47`),
caused by lane L5's in-flight edit to `kb-page-templates.service.ts` (confirmed via `git status --porcelain`
showing that file, its controller, its dto and their specs modified by L5, not L3 — L3 never touched any file
with "template" in its name). The coordinator confirmed this and routed it to L5. As of the final regression
run in this session, `kb-membership-uniqueness.spec.ts` passes 12/12 — L5 has since fixed it.

---

## Handoffs

**HANDOFF 1 — owner filter on `wiki-page-collection-table.tsx`.** File: `frontend/features/wiki/components/wiki-page-collection-table.tsx`.
Not in L3's territory. `WikiHomeAllPages` (in territory) already has a working "My pages" Owner `<Select>`
(`wiki-home-all-pages.tsx:448-456`, wired to `owner=me` via `useUrlFilters`) — the fix is to lift the same
pattern into `WikiPageCollectionTable`, which is the component space detail, private-page and shared-page
all share. `WikiPageCollectionTableProps.fixedParams` already accepts an `owner` key
(`Pick<KbPageCollectionParams, "owner" | "sharedWithMe" | "spaceId">`) for *fixed* owner scoping — the
missing piece is a user-toggleable owner filter alongside the existing status/space/sort selects (around
`wiki-page-collection-table.tsx:399-438`), gated so it's hidden when the caller already fixed `owner` via
props (mirroring how the space `<Select>` is hidden when `fixedParams.spaceId` is set, line 412).

**HANDOFF 2 — review-policy approval workflow.** Not attempted: a deeper "review policy" reading of the box
could mean the `kb_page_reviews` approval/freshness workflow table (`backend/src/db/schema/kb/governance.ts`,
`type: "approval" | "freshness"`, `status: "pending" | "approved" | "rejected"`, `dueAt`) rather than the
simpler `kb_pages.next_review_at` scheduling field this session used. That table and its query service
(`kb-page-reviews-query.service.ts`) back the separate "Reviews" page (`02-page-component-spec.md` §8),
which is not S06/S07. If a future pass wants the approval-workflow reading instead of (or in addition to)
what's here, it should go through `KbPageReviewsQueryService` per BE-04 rather than a raw `kbPageReviews`
query from `kb-spaces.service.ts`.

**HANDOFF 3 (informational, no action needed) — vendored OpenAPI/permission catalog.** This session added
two new response fields (`ownerName`, `pagesOverdueForReview` on the space list item; `pagesOverdueForReview`,
`pagesWithReviewPolicy`, optional, on the full space schema) to a backend `@ResponseSchema`. Per the hard
rules, `openapi:gen` was not run (a stale vendored contract can silently disarm permission-binding checks —
see the `openapi:gen` memory note). Whoever runs the next full gate pass should regenerate the vendored
OpenAPI contract so `check:contract-vendor`/`check:contract-parity` see the new fields.

---

## Counts

- **DONE:** 15 (S06: 8/8; S07: 7 — server-projected counts, search/filters/cursor/list, archive-restore,
  archive-impact-preview, breadcrumb, audience badge, in-space search + status filter, inaccessible/not-found
  recovery)
- **OPEN → FIXED:** 4 boxes (members-sheet/owner/last-updated/health-summary; the space-detail cluster of
  create-in-space/lazy-hierarchy/members-sheet/archive/review-policy-summary; every child request carries
  spaceId, now including tree-expand reads; move source+target space check, hardened to fail closed on a
  missing dependency and proven with a real, not mocked, authorization decision)
- **BLOCKED:** 1 (access badge — upstream product decision on graded space access, carried forward from
  ledger line 975, not newly discovered)
- **Handed off, out of L3's file territory:** 1 sub-item inside an otherwise-fixed box (owner filter on the
  shared `wiki-page-collection-table.tsx`, routed by the coordinator to lane L2 which owns the S04 collection
  slice)

The single most important defect found: **`KbPageTreeService.move` never verified or reconciled a page's
`spaceId` against its new parent's space**, and the real `MovePageDialog` UI lets any user with edit access
pick a cross-space parent (it searches all pages org-wide, not space-scoped). This was a live, reachable
data-integrity and authorization gap — not a theoretical one — sitting unaddressed since a SESSION-03 HANDOFF
explicitly called it out in this exact file. Fixed with an authorization check plus a `spaceId` write on
move, verified failing-then-passing against a purpose-built spec. The first version of that fix injected the
authorization dependency as optional and called it with `?.`, which fails open if the DI wiring ever breaks;
on coordinator review this was hardened to a required dependency that fails closed at boot, and a second test
pair was added that constructs `KbAccessService` the way production does and proves the move is refused by a
real authorization decision, not merely that a mock function was called.
