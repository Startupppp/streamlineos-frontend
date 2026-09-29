# Command Center

## Route decision

- **Current/target route:** `/build/command-center`
- **Scope:** organization
- **Disposition:** **KEEP**
- **Decision:** Retain as a canonical page, subject to the gaps and acceptance criteria below.
- **User job:** See what needs attention and jump directly to action.
- **Evidence:** `frontend/app/(authenticated)/build/command-center/page.tsx`; Verified populated organization home: two projects and 84 open issues.

## Product contract

- **Purpose:** Provide a prioritized operating home across Build.
- **Primary persona:** Product or project manager.
- **Success metric:** Action-through rate and stale-item reduction.
- **Required density:** comfortable, with compact child collections.
- **Core fields:** personal queue, project health, approvals, risks, releases, shortcuts, agent runs.

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

Deep-linkable query parameters: `scope`, `owner`, `health`, `due`, `view`.

Cursor may be shared only when it is stable for the same normalized filter/sort/access revision. Selection, open menus, drafts, and unsaved form state are not placed in the URL.

> **Adjudication, 2026-09-28 (criterion unchanged, subject named).** `view` has no subject on this surface. The page renders one fixed arrangement — a stat strip, a jump panel, the filter toolbar and six panels in one grid (`frontend/features/build/command-center/command-center-page.tsx:409-438`) — with no second layout, no density switch and no saved view for a `view` value to select. The layout switcher this parameter reads like belongs to project detail (`frontend/features/build/views/view-switcher.tsx`), and saved-view records are per project (`/build/[projectId]/settings/views`), not organization-wide. Nothing was invented here: implementing `view` would mean designing a second command-center layout, which the product contract above does not name. Whoever owns this spec should either strike `view` from the list or add the second layout to the contract first; a lane may not edit a criterion, so it stays listed, this note carries the correction, and the implementation box stays unchecked on it.

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

- Existing feature evidence: `@/features/build/command-center/command-center-page`
- Reuse: `PageState`, `DataTable`, cursor controls, `FilterBar` target module, `EmptyState`, `EntityFormDialog`, `EntityFormSheet`, `ConfirmDialog`, status/priority chips, member picker, command palette, dirty-state guard.
- New only if absent: scope-specific summary/visualization or execution module. Promote a shared module only after a second real consumer.

## API and data contract

- **Endpoints:** GET /build; GET /build/all-work; GET /me/inbox.
- **Client schema/hooks:** `frontend/hooks/api/build/projects.ts; all-work.ts; approvals.ts` where present.
- **List request:** `{ cursor?, limit<=100, q?, filters, sort }`; filters are the normalized URL state above.
- **List response:** `{ data: <row>[], pageInfo: { nextCursor, hasMore }, aggregates?, meta: { requestId, revision? } }`.
- **Detail response:** `{ data: { personal queue, project health, approvals, risks, releases, shortcuts, agent runs, version, createdAt, updatedAt }, meta }`.
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
  **BLOCKED — needs Tarun's decision 2026-09-29 — every other item on this box is implemented and tested (third pass below); the sole remainder is the `view` query parameter, and settling it means deciding whether the command center gains a second layout or an organization-wide saved view at all. Neither side implemented here.**
  - Audited per item against `/build/command-center` on 2026-09-28. Implemented and tested: all seven core fields — personal queue (`command-center-my-issues-panel.tsx`), project health (`command-center-projects-panel.tsx` with per-project progress), approvals, risks, releases, agent runs and the pinned shortcut strip; overlays `QuickCreateMenu`, project-create wizard and `ShortcutHelpDialog`; query parameters `scope`, `owner` and `due`, each with a paired absent-param control and an invalid-value control; shortcuts `?`, `c p`, `c t`, `g m`, `g p`, none firing inside a text input; states loading skeleton / first-run empty / error with the 500 hidden from the panels and the 402 upgrade path preserved via `error` on `usePageState` / denied as `Access Restricted` / offline banner; permissions `build:view`, `build:create`, `build:tickets:create`, `build:tickets:view`, `build:approvals:view`, `build:risks:view`, each paired. Bulk actions: none, and none are required — no panel has a repeated operation. Conflict state: not applicable, this surface issues no versioned update. Four items are missing:
  - Query parameter **`health`** — not read, and not implementable on the client. `GET /build` computes `health` per row (`backend/src/modules/build/core/project-crud/projects-query.service.ts:248`) but `listProjectsSchema` is `.strict()` and declares no `health` field (`backend/src/modules/build/core/dto/project-core.schemas.ts:73`), so there is no server-side health filter; filtering a keyset page in the client would present one page as the whole filtered set (FE-105). Closing this needs a backend filter first.
  - Query parameter **`view`** — not read. This surface has no second layout or saved view for a `view` value to select.
  - **No URL-writing filter toolbar** — `scope`, `owner` and `due` are read-only deep links. A grep for `router.replace|useUrlFilters|router.push` over `frontend/features/build/command-center/*.tsx` finds nothing, so no control sets them, "every response-shaping value updates the URL" is one-directional, and the wireframe's "Filter and layout toolbar (URL-backed)" row has no implementation. The filtered-empty state therefore cannot be reached from the UI either.
  - Shortcuts **`j`/`k`** and **`Enter`** — `frontend/features/build/command-center/use-keyboard-shortcuts.ts` implements only `?`, `g m`, `g p`, `c p` and `c t`. The My issues panel is a real row list (`command-center-rows.tsx:56`), so these shortcuts have a target and CCG-4 does not exempt them. `/` stays exempt: this surface has no search input.
  - 2026-09-28 second pass. Three of the four items the first pass listed as missing are now implemented; **the box stays open on one**. Evidence class: component and hook specs, not browser evidence.
    - **Query parameter `health` — implemented, and its first-pass premise was wrong.** `GET /build` does accept it: `listProjectsSchema` declares `health: z.enum(projectHealthEnum).optional()` (`backend/src/modules/build/core/dto/project-core.schemas.ts:109`) and `ProjectsQueryService` filters on the computed band after raising the fetch limit to the page cap (`project-crud/projects-query.service.ts:182`, `:331-334`), so the filtered set is the server's, not one keyset page's. The toolbar now writes it (`frontend/features/build/command-center/command-center-toolbar.tsx:19`, `:30-35`, `:112-123`) and the page forwards a validated band to `useProjects` (`command-center-page.tsx:134-158`), dropping an unknown band rather than sending it to a `.strict()` schema that would 400. Tests: three page cases (present, absent, unknown value) and four toolbar cases plus two render cases that fail if any declared control is missing.
    - **URL-writing filter toolbar — implemented.** `CommandCenterToolbar` (`command-center-toolbar.tsx`) drives `scope`, `owner`, `health` and `due` through `useBuildListFilters`, which writes each one with `router.replace` and clears the cursor, and is rendered at `command-center-page.tsx:407`. The first pass's grep found nothing because the toolbar did not exist yet. The filtered-empty state is therefore reachable from the UI.
    - **Shortcuts `j`/`k` and `Enter` — implemented.** `useBuildListKeyboard` is wired over the personal queue (`command-center-page.tsx:253-258`) and its `focusedIndex` is passed to `MyIssuesPanel` (`:419`), which marks the focused row. `Enter` navigates to the focused issue through `handleOpenItem` (`:240-249`). Covered by `command-center-keyboard.test.tsx` (3 focus cases) and, new in this pass, three page cases asserting the row count, the navigation target and that an out-of-range index navigates nowhere — the last of which fails if `onOpen` returns to being the empty handler it was.
    - **STILL OPEN — query parameter `view`.** Unchanged premise correction: this surface has no second layout and no saved view, so there is nothing for a `view` value to select. The surface is a fixed set of panels (`command-center-page.tsx:410-427`); `ViewSwitcher` (`features/build/views/view-switcher.tsx`) belongs to project detail, and the saved-view records are per project (`/build/[projectId]/settings/views`), not organization-wide. Implementing `view` here would mean inventing a layout the product contract does not name, so it stays unimplemented and this box stays unchecked on it alone.
    - **Shortcut `e` — exempt under CCG-4, recorded so it is not mistaken for a gap.** The personal-queue row has no inline edit affordance; its single action is opening the full ticket page, which `Enter` already does.
    - **Test commands and results:** `cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/command-center` → 8 suites, 100 tests, all passing. `npx eslint features/build/command-center` → clean (three raw palette literals in `command-center-risks-panel.tsx` were replaced with status tokens in the same pass). `node --max-old-space-size=6144 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.specs.json` → no diagnostic naming a command-center file.
    - **Out-of-lane want:** `ProjectFilters` (`frontend/types/projects/projects.ts:351-358`) declares no `health` (or `sort`) field although `GET /build` accepts both. The page therefore annotates its filter object as `ProjectFilters & { health?: … }`. Wanted change: add `health?: ProjectHealth` and `sort?: ProjectSort` to `ProjectFilters` and drop the intersection. Also `features/build/project-list/projects-page.tsx:198-207` still filters health client-side (`project-list-shaping.ts:72-74`) instead of passing it to the server, which presents one keyset page as the whole filtered set — the same FE-105 defect this pass removed from the command center.
  - 2026-09-28 third pass. `view` is adjudicated (the note is under URL state above) and **the box stays unchecked on it** — that is the honest outcome, not a pass. Everything else on the box is implemented and tested. Two follow-ups from the second pass are now closed, both in this lane's widened territory: `ProjectFilters` declares `health` (`frontend/types/projects/projects.ts:358`), so the page passes a plain `ProjectFilters` and the intersection workaround is gone (`command-center-page.tsx:142-150`); and the project list no longer filters health inside one loaded keyset page — it forwards the band to `useInfiniteProjects` (`features/build/project-list/projects-page.tsx:202`) and `filterVisibleProjects` no longer touches health (`project-list-shaping.ts:62-77`), which was the same FE-105 defect this spec's own `health` parameter had. `cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/command-center features/build/project-list` → 15 suites, 124 tests, all passing, including three new project-list cases (band present, absent, unknown) and two on `filterVisibleProjects` asserting it keeps every row the server returned and still applies status and the closed-project preference.
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [x] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data. — **OUT OF SCOPE — browser verification** (2026-09-29: waived by Tarun, not a release blocker; see the open non-browser box above).
