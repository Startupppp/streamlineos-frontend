# Wiki

## Route decision

- **Current/target route:** `/build/[projectId]/wiki`
- **Scope:** project
- **Disposition:** **KEEP**
- **Decision:** Retain as a canonical page, subject to the gaps and acceptance criteria below.
- **User job:** Create and find durable project knowledge.
- **Evidence:** `frontend/app/(authenticated)/build/[projectId]/wiki/page.tsx`; route and access guard verified in the repository. Browser verification on 2026-09-28 loaded `/build/6/wiki` with the local frontend on port 1000 and the configured deployed API, then loaded the resulting test document at `/build/6/wiki/860067`. The list and detail surfaces rendered after refresh without fresh browser errors. The test record was created during browser verification and remains pending explicit cleanup approval.

## Product contract

- **Purpose:** Expose project-related Knowledge pages without duplicating Library.
- **Primary persona:** Contributor.
- **Success metric:** Search success and stale-page review rate.
- **Required density:** comfortable, with compact child collections.
- **Core fields:** page tree, title, status, owner, updated, backlinks, project links.

## Above-the-fold text wireframe

```text
Scope breadcrumb / title                         Search / saved view / primary action
Purpose or freshness line                       Permission-safe secondary actions
Filter and layout toolbar (URL-backed)
Summary or status strip (only decision-useful metrics)
Bounded primary collection / workspace
Selection-aware bulk action bar (when rows are selected)
```

Priority is identity and next action first, filters/layout second, bounded content third. Decorative cards, duplicate explanation banners, and non-actionable vanity metrics stay out of the first viewport.

## Elements and interactions

- Title/breadcrumb: clickable ancestors; current title is non-interactive unless inline rename is authorized.
- Search: debounced, keyboard focused with `/`, reflected in `q`.
- Filters/group/sort/layout: popovers or segmented controls; every response-shaping value updates the URL.
- Rows/cards: single click selects/opens preview when useful; explicit title link performs full-page navigation; right click opens the same authorized actions available from the row menu.
- Inline edits: status, priority, assignee, dates, estimate, and labels only when the mutation is optimistic and reversible. Financial, access, approval, publication, and destructive changes are never optimistic.
- Dialog: confirmation or focused form with at most five fields. Sheet: six or more fields, multi-section edit, or when source context must remain visible. Popover: reversible compact selection. Full page: durable, collaborative, historical, builder, or execution work.
- Non-interactive: explanatory copy, historical audit events, calculated metrics, and permission-denial reasons.

## URL state

Deep-linkable query parameters: `q` (redirects to KB search route — deliberate; the collection list filters by `space`, `owner`, `status`, `sort`, `cursor`). Filter param names in the implementation are `space` (maps to `spaceId` backend field) and `owner` (maps to `ownerMembershipId` backend field). Cursor may be shared only when it is stable for the same normalized filter/sort/access revision. Selection, open menus, drafts, and unsaved form state are not placed in the URL.

## Bulk, keyboard, and context actions

- Child collections support selection only when a real repeated operation exists; the primary record itself is never selected.
- Keyboard: `Tab` follows visual order and `Esc` closes overlays or clears selection, on every page. Where the page has the target: `/` focuses search, `c` creates in current scope, `j/k` moves through the list, `Enter` opens the focused row, `e` edits it, `?` opens shortcut help. A shortcut whose target does not exist on this page is not required — see CCG-4. Shortcuts do not fire inside text inputs/editors.
- Context menu: open, copy link/key, edit, move/link, and archive/delete where authorized. It mirrors visible commands and never hides the only path to an action.

## States

- Loading: stable skeleton matching final geometry; preserve stale authorized content on refetch.
- Empty: distinguish first-run setup from a filtered no-result state; one relevant primary action maximum.
- Error: preserve backend code/message, retry safely, expose request ID; never convert 402/403 into empty.
- Permission denied: `NoPermissionState` with no record existence leak.
- Offline: show freshness; allow local drafts and approved idempotent commands only.
- Conflict: show field-level server/current comparison for version conflicts.

## Permissions

| Standing | View | Create | Edit | Delete/archive |
|---|---:|---:|---:|---:|
| Organization owner/admin | Yes when module enabled | Yes | Yes | Yes, with invariant checks |
| Build owner/admin | Yes | Yes | Yes | Yes within Build scope |
| Build member | Authorized records | Yes when `build:create` | Own/assigned or explicit permission | No by default |
| Guest/client | Explicit grant projection only | Bounded request/comment only | Own allowed contribution | No |

Backend guards and record scope are authoritative. Controls fail closed while access is loading. Missing, deleted, cross-tenant, and unauthorized detail records return indistinguishable 404s.

## Components

- Existing feature evidence: `@/features/wiki/components/wiki-home-page`
- Reuse: `PageState`, `DataTable`, cursor controls, `FilterBar` target module, `EmptyState`, `EntityFormDialog`, `EntityFormSheet`, `ConfirmDialog`, status/priority chips, member picker, command palette, dirty-state guard.
- New only if absent: scope-specific summary/visualization or execution module. Promote a shared module only after a second real consumer.

## API and data contract

- **Endpoints:** Knowledge page APIs plus project record links.
- **Client schema/hooks:** `frontend/hooks/api/build/kb/pages.ts; kb/record-links.ts` where present.
- **List request:** `{ cursor?, limit<=100, q?, filters, sort }`; filters are the normalized URL state above.
- **List response:** `{ data: <row>[], pageInfo: { nextCursor, hasMore }, aggregates?, meta: { requestId, revision? } }`.
- **Detail response:** `{ data: { page tree, title, status, owner, updated, backlinks, project links, version, createdAt, updatedAt }, meta }`.
- **Mutation:** Zod-validated command, `Idempotency-Key` when retriable, `If-Match` for versioned updates; response returns the complete cache-patch projection.
- **Pagination:** cursor for unbounded activity/work; numbered pages only when an exact total is already computed cheaply.
- **Caching:** key includes scope, normalized filters, sort, cursor, and source revision. Standard list stale time 30 s; entity 60 s; live queues 0–15 s; reports 2 min.
- **Invalidation:** patch exact detail and every rendered collection first; invalidate only affected aggregates/ancestors after commit. Source-module projections follow source events and ACL revisions.

## Gaps

- **P0:** Verify route renders this contract rather than another page; add route/access/parent identity tests and complete loading/error/denied behavior.
- **P0:** Verify server/client Zod parity, bounded pagination, composite tenant predicates, and exact cache keys for every endpoint above.
- **P1:** Complete URL-backed filters, saved views, keyboard/context actions, bulk semantics, mobile layout, and accessible chart/table alternatives.
- **P2:** Add realtime or AI only when it reduces a measured user delay and preserves deterministic non-AI operation.

## Acceptance criteria

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
- [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  **NOT EARNED 2026-09-29 — nine named items are absent (page tree, a rendered owner value, backlinks, project links, search and the `q` parameter, a URL-backed `cursor`, the `j`/`k`/`Enter`/`e` shortcuts, right-click parity, copy link, and an offline indicator). This is unfinished product work, not an audit gap. Earned when the nine itemised below are implemented and tested.**
  - Audited per item against `/build/[projectId]/wiki` on 2026-09-28. Implemented and tested: core fields `title`, `status`, `updated`; overlays (row `⋯` menu, `ConfirmDialog` delete, card/list toggle); query parameters `space`, `owner`, `status`, `sort`, `view`; shortcuts `c` and `?`; states loading / first-run-empty / filtered-empty / error-with-request-id / denied; the create control failing closed on `kb:pages:create` and the row menu gating on `kb:pages:{create,update,manage,delete,export}` and `kb:templates:manage`. Bulk actions: none, and none are required — this collection has no repeated operation. Conflict state: not applicable to a collection. Nine items are missing:
  - Core field **page tree** — absent. `frontend/features/wiki/components/wiki-home-page.tsx` renders only `WikiHomeAllPages`; `PageTree` (`frontend/features/wiki/components/page-tree.tsx`) is mounted only by `wiki-shell.tsx` and `space-detail-page.tsx`, and `frontend/features/wiki/components/wiki-home-page.test.tsx:242` pins that the tree hook is never called here.
  - Core field **owner** — no owner value renders. The columns in `frontend/features/wiki/components/wiki-home-all-pages.tsx:82` are title / status / trust / updated; the row carries `ownerUserId` (`frontend/hooks/api/kb/kb-page-collection-schema.ts:16`) but only `OwnerMissingBadge` uses it, so an owned page shows no owner.
  - Core fields **backlinks** and **project links** — not on this surface. Both render only on the detail, `frontend/features/wiki/components/page-right-panel.tsx:155` and `:190`.
  - **Search** and the **`q` query parameter** — the project-scoped route renders no search input (`frontend/features/wiki/components/wiki-home-page.tsx:107`), and `wiki-home-page.test.tsx:497` pins that absence, so `q` is unreachable and `/` has no target here.
  - **`cursor` query parameter** — not URL-backed. `useCursorPager` holds the cursor in React state (`frontend/components/ui/table-pagination-shared.tsx:77`), so page 2 of this collection cannot be deep-linked or shared.
  - Shortcuts **`j`/`k`**, **`Enter`** and **`e`** — `frontend/features/wiki/components/wiki-home-page.tsx:75` calls `useBuildListKeyboard` with `itemCount: 0` and a no-op `onOpen`, while the real row collection renders below it in `wiki-home-all-pages.tsx`. The target exists, so CCG-4 does not exempt these.
  - **Right-click parity** — no `onContextMenu` exists anywhere in `frontend/features/wiki/`; the row actions are reachable only from the `⋯` trigger (`frontend/features/wiki/components/wiki-home-all-pages.tsx:218`).
  - Context action **copy link/key** — not in the action set (`frontend/features/wiki/lib/page-action-descriptors.ts:131`).
  - State **offline** — no freshness or offline indicator on this surface. The detail has one (`frontend/features/wiki/components/page-document-breadcrumb.tsx:109`); the collection has none.
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass. — **OUT OF SCOPE — browser verification** (2026-09-29: waived by Tarun, not a release blocker; see the open non-browser box above).
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data. — **OUT OF SCOPE — browser verification** (2026-09-29: waived by Tarun, not a release blocker; see the open non-browser box above).
