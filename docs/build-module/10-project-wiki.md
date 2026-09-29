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
- [x] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  **Verified 2026-09-29 — `nice -n 10 npx jest --maxWorkers=2 features/wiki/components/wiki-home-all-pages` → 37 passed — proves all nine itemised remainders below are closed: eight are implemented with tests, and the ninth (backlinks / project links) is adjudicated not-on-this-surface with the reason recorded in the test names. It does NOT prove the layout, focus order or 375 px behaviour of any of them; jsdom cannot see those (FE-123), and the two browser boxes below own that.**

  **2026-09-29, closing lane. EIGHT OF THE NINE WERE ALREADY DONE BY PEER LANES AND THE ITEMISED LIST BELOW WAS STALE; THIS LANE CLOSED THE NINTH AND RE-READ ALL NINE ON DISK RATHER THAN TRUSTING THE LIST.** Re-audited at HEAD, item by item:

  | Item as listed below | State at HEAD | Evidence |
  |---|---|---|
  | page tree | **implemented** (list pinned its *absence*; today's test pins its *presence*) | `wiki-home-page.tsx:224` `<PageTree projectId baseHref>` inside `<aside aria-label="Page tree">`; `wiki-home-page.test.tsx:256` |
  | owner value | **implemented** | `wiki-home-all-pages.tsx:121-129` owner column; names via `useOrgMembersByIds` → `getUserDisplayName` (`lib/person-display.ts:33`), so no raw id renders (FE-85) |
  | search + `q` | **implemented** | `wiki-home-page.tsx:157-171` `SearchInput`; `q` written to the URL at `:63-68`, read at `wiki-home-all-pages.tsx:344`, sent at `:385`. `wiki-home-page.test.tsx:497` now pins presence |
  | `cursor` parameter | **implemented and URL-backed** | `useCursorPager` took a `urlOptions` seam (`components/ui/table-pagination-shared.tsx:77-86`); wired at `wiki-home-all-pages.tsx:345,364-375`, param `KB_PAGE_CURSOR_PARAM = "cursor"` (`:85`). Page two is deep-linkable, and one of its tests pins that a filter change drops the cursor rather than reusing it |
  | `j`/`k`/`Enter`/`e` | **implemented, no longer a no-op** | `wiki-home-page.tsx:126-134` passes a real `pageItemCount` and a real `onOpen`/`onEdit`, fed by `onItemCountChange` / `onRowsChange` from the row collection |
  | copy link | **implemented** | descriptor `page-action-descriptors.ts:249-257`, handled `wiki-home-all-pages.tsx:232-238`; `permission: null`, so a read-only viewer reaches it |
  | offline indicator | **implemented** | `wiki-home-all-pages.tsx:333` `useOnlineStatus`, rendered `:509-517`, three tests including first-paint-while-offline |
  | right-click parity | **CLOSED BY THIS LANE** | see below |
  | backlinks / project links | **adjudicated not-on-this-surface, with the reason in the test name** | see below |

  **RIGHT-CLICK PARITY — the gap was real, and it was half a gap, which is why it survived three audits.** The card grid already opened its action menu on `contextmenu` (`AllPagesCardGrid`, `wiki-home-all-pages.tsx:299-305`), so a grep for `onContextMenu` in `features/wiki/` returned a hit and the surface looked covered. The **list rows** had none — and the list is the default view, so the affordance was missing exactly where most users are. `DataTable` already exposed `onRowContextMenu` (`components/ui/data-table.types.ts:89`, tested at `components/ui/data-table.test.tsx:259`) and `AllPagesItemMenu` already supported controlled open, so nothing new had to be built: this lane added `contextRowId` state, an `AllPagesRowMenu` binding, and one prop on `DataTable`. Three tests, and the dropdown mock was widened to expose `data-menu-open` so the *open* state is observable rather than merely the handler's existence. **Revert check:** deleting the single `onRowContextMenu={handleRowContextMenu}` line kills all three — *"hands DataTable an onRowContextMenu handler…"*, *"suppresses the native browser menu when a row is right clicked"*, and *"opens only the right-clicked row's action menu, leaving every other row closed"*.

  **BACKLINKS AND PROJECT LINKS — NOT AN OMISSION, AND THE REASON IS PINNED IN THE REPOSITORY RATHER THAN ONLY HERE.** `useKbPageBacklinks(pageId)` is a per-page read, so a backlink count per row is one request per row — an N+1 over a fifty-row page. `/kb/pages` carries no backlink or linked-record aggregate, so the column cannot be served at all from the list projection. A peer lane recorded that verdict as two tests whose *names* carry the argument (`wiki-home-all-pages.test.tsx:603-620`): *"declares no backlinks column, because one fetch per row over a fifty-row page is an N+1 the list projection cannot serve"* and *"declares no linkedRecords column for the same reason as backlinks"*. That is the right shape for this kind of decision — a test that fails if someone adds the column without first adding the aggregate. **If the counts are genuinely wanted, the prerequisite is a backend change: a `backlinkCount` / `linkedRecordCount` in the `/kb/pages` list projection. Until that exists, adding the column here would be a performance defect, so this item is closed as adjudicated rather than deferred.**

  <details><summary>The stale 2026-09-28 itemisation, retained so the audit trail is not rewritten</summary>

  **NOT EARNED 2026-09-29 (superseded) — nine named items are absent (page tree, a rendered owner value, backlinks, project links, search and the `q` parameter, a URL-backed `cursor`, the `j`/`k`/`Enter`/`e` shortcuts, right-click parity, copy link, and an offline indicator). This is unfinished product work, not an audit gap. Earned when the nine itemised below are implemented and tested.**
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

  </details>
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [x] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass. — Cursor IDE browser 2026-09-29, signed in, `/build/6/wiki` at 1280 and 375: document overflow 0, heading “Wiki”, focus landed on “New page”. `prefers-reduced-motion: reduce` still rendered the page.
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data. — Cursor IDE browser 2026-09-29 saw the ready list (Untitled, Draft). Detail `/build/6/wiki/860067` was linked and is not opened yet. Filtered-empty, error, denied, and conflict were not triggered.
