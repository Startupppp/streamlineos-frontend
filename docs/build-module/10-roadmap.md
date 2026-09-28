# Roadmap

## Route decision

- **Current/target route:** `/build/roadmap`
- **Scope:** organization
- **Disposition:** **KEEP**
- **Decision:** Retain as a canonical page, subject to the gaps and acceptance criteria below.
- **User job:** Communicate what is planned and why.
- **Evidence:** `frontend/app/(authenticated)/build/roadmap/page.tsx`; Route existence verified in the repository; live behavior not directly observed with a valid detail record. **ASSUMPTION:** the page follows its source component until browser evidence is captured.

## Product contract

- **Purpose:** Connect outcomes and releases to planned product work.
- **Primary persona:** Product manager.
- **Success metric:** Roadmap item evidence coverage.
- **Required density:** comfortable, with compact child collections.
- **Core fields:** title, outcome, product/project, status, horizon, confidence, owner, feedback links.

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

Deep-linkable query parameters: `scope`, `productId`, `projectId`, `status`, `horizon`, `ownerId`, `q`, `sort`, `cursor`. Cursor may be shared only when it is stable for the same normalized filter/sort/access revision. Selection, open menus, drafts, and unsaved form state are not placed in the URL.

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

- Existing feature evidence: `@/features/build/roadmap/roadmap-list-page`
- Reuse: `PageState`, `DataTable`, cursor controls, `FilterBar` target module, `EmptyState`, `EntityFormDialog`, `EntityFormSheet`, `ConfirmDialog`, status/priority chips, member picker, command palette, dirty-state guard.
- New only if absent: scope-specific summary/visualization or execution module. Promote a shared module only after a second real consumer.

## API and data contract

- **Endpoints:** GET/POST /build/roadmap.
- **Client schema/hooks:** `frontend/hooks/api/build/roadmap.ts; roadmap-schema.ts` where present.
- **List request:** `{ cursor?, limit<=100, q?, filters, sort }`; filters are the normalized URL state above.
- **List response:** `{ data: <row>[], pageInfo: { nextCursor, hasMore }, aggregates?, meta: { requestId, revision? } }`.
- **Detail response:** `{ data: { title, outcome, product/project, status, horizon, confidence, owner, feedback links, version, createdAt, updatedAt }, meta }`.
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
  - Reopened 2026-09-27: the blanket CCG-1 concurrency exemption was based on a false premise. Verify this page's read token, stale-write handling and conflict UX against architecture tickets 36/11/12/13 before closing; existing non-conflict evidence remains valid only for the behavior it exercised.
  - 2026-09-27 progress: `version` token now flows end-to-end for roadmap items (`roadmapItemContract` schema + `RoadmapItem` type + `UpdateRoadmapItemInput` + `roadmap-item-sheet.tsx` passes `item.version`); 409 conflict handler added to `roadmap-item-sheet.tsx` (invalidates roadmap items query + warning toast); `roadmap-schema.test.ts` updated to include `version` in `baseRoadmapItem` and adds rejection test; 21/21 roadmap schema tests and 102/102 roadmap feature tests pass. `cursor` URL param is implemented via `listFilters.cursor` (first-class property of `useBuildListFilters`, not in FILTER_DEFINITIONS by design).
  - 2026-09-28 per-item audit. **Closed since the last entry:** `q` is URL-backed and forwarded server-side as `search` (pinned by four cases in `roadmap-list-page-keyboard.test.tsx`); keyboard `/`, `j/k`, `Enter`, `e`, `c` are wired and `itemCount` is pinned; core fields `title`, `product/project` (`projectId` link), `status` (column), `horizon` as `targetQuarter`, `confidence` (RICE) and `feedback links` (`linkedFeedbackCount` via `/signals`) are rendered — `roadmap-item-card.tsx:87-108`. The empty state now distinguishes first-run from filtered-empty. 118/118 across the roadmap suites.
  - **Closed since the last entry — a deep-linked `horizon` or `ownerId` used to 400 the whole list read.** `roadmapListQuerySchema` (`backend/src/modules/build/core/dto/roadmap.schemas.ts:20-29`) is `.strict()` and accepts only `status`, `search`, `cursor`, `limit`, `managedProductId`, `sort`; `roadmap-list-page.tsx` was forwarding `horizon` and `ownerId` straight from the URL, and an unvalidated `sort`/`status` too. Those are no longer sent, `sort` and `status` are now constrained to the backend enums, and `productId` is mapped onto the `managedProductId` the schema actually declares. Six new cases in `roadmap-list-page-keyboard.test.tsx` plus three in `roadmap-tab-states.test.tsx`.
  - 2026-09-28: **`projectId`, `horizon` and `ownerId` are now declared, forwarded and filtered server-side.** `roadmapListQuerySchema` (`backend/src/modules/build/core/dto/roadmap.schemas.ts:29-31`) declares all three; the predicates are `projects-roadmap.service.ts:296-301`. `horizon` filters the existing `target_quarter` column deliberately — the spec already records horizon as *rendered via* `target_quarter`, so a second column would be a second source of truth for one fact. `ownerId` is a **membership id**, not a user id: `roadmap-list-page.tsx:91-92` forwards it only when it is all digits, so `?ownerId=user-7` is dropped rather than sent as `NaN`, and both halves are pinned in `roadmap-list-page-keyboard.test.tsx`.
  - 2026-09-28: **`scope` is deliberately not a query parameter.** The page is organization-scoped (`:6`) and narrowing is expressed by *which* id parameter is present — `productId` means product scope, `projectId` means project scope. A separate `scope` param would be a second source of truth for a fact the id params already state, and the two could disagree. Closed as not-applicable rather than implemented.
  - 2026-09-28: **core fields `outcome` and `owner` now have storage and are wired end to end.** Migration `1422` added `build.roadmap_items.outcome text` and `owner_membership_id integer` with a composite `(org_id, owner_membership_id)` FK to `organization_members` and a partial index — a composite FK, not a global `users` FK, because a global one cannot be tenant-fenced and would permit an owner who is not a member of the org. Applied to production, nothing backfilled. `outcome` round-trips through create/update/get/list and has an Outcome field plus a conflict diff entry in `roadmap-item-sheet.tsx`; `owner` is a projected sub-object resolved through `getUserDisplayName` on `roadmap-item-card.tsx`, and a cross-tenant `ownerMembershipId` is rejected by `assertOwnerMembershipInOrg`. Both are required-and-nullable in the contract, so a dropped projection throws instead of rendering blank.
  - 2026-09-28: **offline state is wired.** `roadmap-tab.tsx:94` consumes `useOnlineStatus`, with the offline panel pinned at `roadmap-tab-states.test.tsx:301`.
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
