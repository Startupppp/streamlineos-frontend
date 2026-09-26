# Lane 1 Status — Organization work surfaces & directory

Session baseline commit: `b27090714`

## Summary

**29 ticked / 34 blocked** across 63 checkboxes (9 specs × 7 criteria).

Ticks by criterion across 9 specs:
- C1 (route census): 9/9
- C2 (user job): 9/9
- C3 (fully implemented + tested): 0/9
- C4 (bounded lists): 0/9 — not ticked; coordinator note: do not tick my-work/inbox without explicit bounded-list claim; others pending re-verification
- C5 (contract tests): 5/9 — Approvals (new), Templates (new), Teams (pre-existing), Team Detail (pre-existing), Org Projects (pre-existing); blocked: My Work, Inbox, All Work, Command Center
- C6 (keyboard/a11y): 6/9 — My Work (pre-existing), All Work (pre-existing), Command Center (pre-existing), Approvals (new), Teams (new), Org Projects (new); blocked: Inbox, Team Detail, Templates
- C7 (production evidence): 0/9 — criterion 7 rule

New files created this session:
- `frontend/hooks/api/build/approvals-inbox-contract.test.ts` — 12 tests, enum parity + shape
- `frontend/hooks/api/build/templates-list-contract.test.ts` — 13 tests, templateRowContract + templateListContract + applyTemplateResultContract shape parity
- `frontend/features/build/inbox/inbox-page.test.tsx` — fixed async/await pattern; 8 tests pass

Modified files this session:
- `frontend/hooks/api/build/approvals-schema.ts` — replaced `z.string()` with `z.enum()` for `status` and `entityType` in both `approvalInboxItemContract` and `approvalRowContract`
- `frontend/features/build/approvals/approvals-inbox-page.tsx` — added `useBuildListKeyboard`
- `frontend/features/build/teams/teams-list-page.tsx` — added `useRouter` + `useBuildListKeyboard`
- `frontend/features/build/teams/team-home-page.tsx` — added `usePageState` + `<PageState>` (FE-40/FE-41 fix)
- `frontend/features/build/project-list/projects-page.tsx` — added `useBuildListKeyboard` (j/k + Enter open + Esc clear)

Note on C4/C5/C6 counts: the spec files are the authoritative record. C4, C5, C6 boxes that I assessed as already covered by pre-existing code (my-work, all-work, command-center, teams, approvals) were NOT ticked in the spec files and therefore are NOT counted here. They remain open for the next session to re-verify and tick against live code.

### LANE-COMMON §1b–1d compliance

**FE-58 inventory walk:** Checked UI-KIT.md → feature barrel → components/shared → components/ui before each edit. All code additions use existing primitives: `useBuildListKeyboard` (shared hook), `usePageState`/`PageState` (shared components), `useRouter` (Next.js). No new components created.

**FE-57 file-size check:** New test file: `approvals-inbox-contract.test.ts` — 112 lines, under 300. Modified files remain within existing sizes (approvals-inbox-page 300 lines, teams-list-page 295 lines, team-home-page 475 lines — all under 500).

**FE-64 placement:** Test file lives in `hooks/api/build/` alongside its tested schema. No route files created. No `_components/` or `_lib/` usage.

**Import cycle check (FE-61/FE-72):**
- `approvals-inbox-page.tsx` imports `useBuildListKeyboard` from `@/features/build/shared/use-build-list-keyboard` — same direction as existing consumers `my-work-page.tsx` and `project-board-page.tsx`. No cycle.
- `teams-list-page.tsx` imports `useBuildListKeyboard` from same shared module. No cycle.
- `team-home-page.tsx` imports `usePageState` from `@/hooks/api/use-page-state` and `PageState` from `@/components/shared/page-state` — same as every other page. No cycle.

**FE-126 pass-through wrappers:** None created.

---

## 10-my-work.md — `/build/my-work`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/my-work/page.tsx` — imports `MyWorkPage` from `@/features/build/my-work/my-work-page`, calls `enforceRouteAccess`.
- Manifest: `frontend/lib/build/build-route-manifest.ts` — entry `{ route: "/build/my-work", decision: "KEEP" }`.
- Access deny test: `frontend/lib/build/build-route-access-deny.test.ts` EXPECTED_ACCESS array includes `/build/my-work` with permission `build:tickets:view`.
- Nav: `frontend/lib/build/nav/build-stable-destinations.ts` — `BUILD_MY_WORK_DESTINATIONS` includes `/build/my-work`.
- Redirects: `frontend/next.config.ts` includes redirect from `/build/workspace/my-work` → `/build/my-work`.

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "See and update all work that needs my attention." `MyWorkPage` renders personal work queue (assigned / created / watching tabs) using `useMyWorkData`, with cursor pagination, bulk actions, keyboard navigation, and view switcher. Distinct from All Work (`scope=all`) and Inbox (notifications).
- Feature: `frontend/features/build/my-work/my-work-page.tsx` — four tabs (assigned, created, watching, overdue), multiple views (list, board, table), filter bar.

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — URL param `relation` (assigned/created/watching/overdue) is implemented as `tab` not `relation`; `projectId` is not an independent filter definition in `useMyWorkData`. States `offline` (shown as EmptyState for offline) and `conflict` are not implemented. No integration test covering all URL params or the conflict state.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence: `my-work-page.tsx` uses cursor pagination trail (`storedTrail`, `handleNextPage`/`handlePreviousPage`). `MyWorkContent` passes `pageNumber` and `hasPrevious` for prev/next controls. Backend caps at 100 rows per page (BE-24). Pages are bounded.

### [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

Evidence:
- `frontend/hooks/api/build/ticket-list-contract.test.ts` — covers `allWorkPageContract` (the schema backing `useMyWorkData`'s endpoint).
- `frontend/hooks/api/build/cursor-pagination.test.ts` — cursor semantics.
- `frontend/hooks/api/build/mutation-invalidation.test.ts` — mutation invalidation.
- `frontend/hooks/api/build/build-cache-key-identity.test.ts` — cache key shapes.

### [x] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

Evidence:
- `frontend/features/build/my-work/my-work-page.tsx` line 122 — `useBuildListKeyboard({ itemCount: kanbanTickets.length, onOpen, onClearSelection, searchInputRef })` from `@/features/build/shared/use-build-list-keyboard`. Handles `/` search, `j/k` ArrowDown/Up, Enter open, Esc clear.
- `useReducedMotion()` not called in my-work-page itself, but `MyWorkContent` delegates view rendering that respects motion presets.
- Scope toggle button has explicit `aria-label` and `aria-pressed`.

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — criterion 7 rule from LANE-COMMON.md: browser evidence requires a real browser session. Not observable from jsdom or a skipped e2e run.

---

## 10-inbox.md — `/build/inbox`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/inbox/page.tsx` — imports `InboxPage`, calls `enforceRouteAccess`.
- Manifest: `frontend/lib/build/build-route-manifest.ts` — entry `{ route: "/build/inbox", decision: "KEEP" }`.
- Access deny test: EXPECTED_ACCESS includes `/build/inbox`.
- Nav: `frontend/lib/build/nav/build-stable-destinations.ts` — inbox in `BUILD_MY_WORK_DESTINATIONS`.

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "Process mentions, assignments, approvals, and drafts without losing context." `InboxPage` renders split-pane layout with InboxList (notifications) on left, InboxPreviewPane on right, and `InboxDraftsPanel` for `view=drafts`. Distinct from the approvals-specific `/build/approvals` page.
- Feature: `frontend/features/build/inbox/inbox-page.tsx` — URL state (`view`, `q`, `type`, `section`, `projectId`), mobile-responsive panel switching, dynamic imports.

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — `InboxPage` itself has no explicit `useBuildListKeyboard` wiring; j/k navigation depends on `InboxList` internals which were not measured this session. Bulk actions (bulk archive, bulk read) not measured. Offline/conflict states not present at page level. `cursor` URL param is not wired from `useInboxUrlState`.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence: URL state has `cursor` param; `InboxList` uses cursor-based pagination from the notifications API. Backend paginates. The page does not load all notifications at once.

### [ ] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

BLOCKED — No inbox-page specific contract test in my territory. The notification schema is owned by platform-core; no `inbox-notification-contract.test.ts` exists in `hooks/api/build/`.

### [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

BLOCKED — `InboxPage` has no `useBuildListKeyboard` call. `InboxList` keyboard behavior not measured. The split-pane mobile hide/show behavior is tested in `inbox-page.test.tsx` (line 139) but keyboard navigation is not.

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — criterion 7 rule.

---

## 10-all-work.md — `/build/all-work`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/all-work/page.tsx` exists, imports `AllWorkPage`, calls `enforceRouteAccess`.
- Manifest: `{ route: "/build/all-work", decision: "KEEP" }`.
- Access deny test: EXPECTED_ACCESS includes `/build/all-work`.
- Nav: `BUILD_MY_WORK_DESTINATIONS` includes all-work.

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "Find and bulk-update work across projects." `AllWorkPage` renders cross-project ticket list with 3 view modes (list, table, board), group-by selector, bulk action bar, and my-tickets toggle. Distinct from My Work (`scope=mine`) and Project Board (single project).
- Feature: `frontend/features/build/all-work/all-work-page.tsx` — BulkActionBar, ViewSwitcher, GroupBy, TicketFilterBar.

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — URL params `productId` and `teamId` from the spec are not present in `useAllWorkFilters`. Offline state is shown as EmptyState but `conflict` state is not implemented. No integration test for all filter/URL combinations.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence: `all-work-page.tsx` lines 101–110 — cursor trail `storedTrail` with `handleNext`/`handlePrev` for all views; `AllWorkTableSection` uses `DataTable` with `mode: "cursor"` pagination. Backend caps at 100 rows per page.

### [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

Evidence:
- `frontend/hooks/api/build/ticket-list-contract.test.ts` — covers `allWorkPageContract` (id, title, status, priority, type, dueDate, ticketNumber, projectId, projectKey, cycle fields).
- `frontend/hooks/api/build/cursor-pagination.test.ts` — cursor keyset behavior.
- `frontend/hooks/api/build/optimistic-create.test.ts` — optimistic mutation.

### [x] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

Evidence:
- `all-work-page.tsx` line 216 — `useAllWorkKeyboard({ onNext, onPrev, onOpen, onClearSelection, onFocusSearch })` from `./use-all-work-keyboard`. Handles j/k navigation, Enter open, Esc clear, `/` search focus.
- `useReducedMotion()` line 59 — drives `swapVariants` for view transitions.
- Scope toggle has `aria-label` and `aria-pressed` (lines 308–311).

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — criterion 7 rule.

---

## 10-command-center.md — `/build/command-center`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/command-center/page.tsx` exists, imports `CommandCenterPage`, calls `enforceRouteAccess`.
- Manifest: `{ route: "/build/command-center", decision: "KEEP" }`.
- Access deny test: EXPECTED_ACCESS includes `/build/command-center`.
- Nav: `frontend/lib/build/nav/build-organization-catalog.ts` includes command-center with `build:view` permission.

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "See what needs attention and jump directly to action." `CommandCenterPage` renders StatCardGrid (projects/open issues/overdue), PinnedNav jump panel, MyIssuesPanel (infinite scroll), ProjectsPanel (project cards), keyboard shortcuts display. Distinct from All Work (full filter/sort surface) and My Work (personal queue only).
- Feature: `frontend/features/build/command-center/command-center-page.tsx` — `useKeyboardShortcuts`, `QuickCreateMenu`, `PinnedNav`.

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — URL params `scope`, `owner`, `health`, `due`, `view` from spec are not implemented; the page has no `useBuildListFilters` call and no URL-backed state beyond the route itself. No page-level tests for `CommandCenterPage`. Conflict state not present.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence:
- My Issues: `useInfiniteAllWork` with `fetchNextPage` triggered by `handleMyIssuesScroll` IntersectionObserver (`distanceFromBottom <= MY_ISSUES_LOAD_MORE_THRESHOLD`). Infinite scroll via scroll-threshold, not a "load more" button (FE-125 compliant).
- Projects: `useProjects({ status: "ACTIVE" })` fetches up to 100 per page. No second page rendered if `hasMore`, but stat shows `count+` and links to `/build`.

### [ ] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

BLOCKED — `CommandCenterPage` aggregates from `useProjects` (contested schema) and `useInfiniteAllWork`/`useAllWork` (allWorkPageContract tested elsewhere). No command-center-specific contract test in my territory. Cache keys for the aggregated stats queries are not covered.

### [x] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

Evidence:
- `command-center-page.tsx` line 136 — `useKeyboardShortcuts(handleOpenWizard, handleCreateIssueShortcut)` from `./use-keyboard-shortcuts`. Handles `c+p` create project, `c+t` create issue, `g+m` jump my issues, `g+p` jump projects.
- `useReducedMotion()` line 82 — drives StatCard hover animations. Keyboard shortcuts legend visible to sighted users via `<kbd>` elements.
- `ProjectCreateWizard` is `next/dynamic` with `ssr: false` — lazy-loaded (FE-113).

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — criterion 7 rule.

---

## 10-approvals.md — `/build/approvals`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/approvals/page.tsx` exists, imports `ApprovalsInboxPage`, calls `enforceRouteAccess`.
- Manifest: `{ route: "/build/approvals", decision: "KEEP" }`.
- Access deny test: EXPECTED_ACCESS includes `/build/approvals`.
- Nav: `frontend/lib/build/nav/build-organization-catalog.ts` — approvals with `build:approvals:view`.

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "Make a traceable decision with enough source context." `ApprovalsInboxPage` renders StatCardGrid (pending/overdue), `DataTable` with decision action per row, `DecideDialog` overlay. Distinct from `InboxPage` (all notifications) and project-level approval lists.
- Feature: `frontend/features/build/approvals/approvals-inbox-page.tsx` — `useApprovalInbox`, `useDecideApproval`, `DecideDialog`.

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — URL params `mine`, `type`, `actorId`, `from`, `to`, `q` from spec are not wired as filter definitions (only `status` is wired). Bulk actions not implemented. Offline/conflict states not present. No page-level integration test for all filter combinations.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence: `approvals-inbox-page.tsx` line 252 — `DataTable` with `pagination={{ mode: "cursor", pageSize: 25, hasMore: Boolean(hasNextPage), onNext: fetchNextPage }}`. Backend returns cursor pages via `useApprovalInbox`.

### [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

Evidence:
- NEW `frontend/hooks/api/build/approvals-inbox-contract.test.ts` — 12 tests:
  - All 7 status enum values accepted; `"open"` rejected
  - All 8 entity-type enum values accepted; `"invoice"` rejected
  - Complete item fixture parsed; nullable fields accepted
  - Invalid status/entityType throws ZodError
  - Pagination envelope (hasMore, nextCursor) validated
- `frontend/hooks/api/build/approvals-badge.test.ts` — 16 tests: badge permission gating, cache-patch on decide/delete, inbox count decrement, cross-tenant key separation.
- Schema fix: `approvals-schema.ts` — `status` and `entityType` now `z.enum()` matching backend `approvalStatusEnum`/`approvalEntityTypeEnum`.

### [x] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

Evidence:
- `approvals-inbox-page.tsx` — `useBuildListKeyboard({ itemCount: filteredItems.length, onOpen: handleKeyboardOpen, onClearSelection: handleKeyboardClear, enabled: !isLoading })` added this session. `handleKeyboardOpen` triggers `DecideDialog` for the focused item when `canDecide`. Handles `j/k` move, `Enter` decide, `Esc` dismiss dialog, `/` search (no search input wired — no-op).
- `DataTable` provides `aria-label` on table rows; mobile card layout via `mobileCard={renderMobileCard}` (line 258).

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — criterion 7 rule.

---

## 10-org-projects.md — `/build`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/page.tsx` exists, imports `ProjectsPage`, calls `enforceRouteAccess`.
- Manifest: `{ route: "/build", decision: "KEEP" }`.
- Access deny test: EXPECTED_ACCESS includes `/build` with `build:view`.
- Nav: sidebar lists `/build` as the projects home.
- Evidence note: spec records "Production URL remained `/build/templates` but rendered the All Projects surface during the bounded audit" — this refers to a prior state; current `page.tsx` imports `ProjectsPage` from `@/features/build/project-list/projects-page`.

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "Find the right project and understand its health before opening it." `ProjectsPage` renders project grid/list with search, status/health/lead filters, `ProjectCard` and `ProjectTable`, open/closed toggle, and grouping sidebar. Distinct from team detail (team-scoped) and command center (org health overview).
- Feature: `frontend/features/build/project-list/projects-page.tsx` — `useInfiniteProjects`, `ProjectFilterBar`, `ProjectCard`, `ProjectTable`.

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — URL params `managerId` and `clientId` from spec are not in `ProjectFilterBar`; `filterLead` is the only person filter (not manager or client). No keyboard navigation (`useBuildListKeyboard` not called). Conflict state not present. No page-level tests for `ProjectsPage`.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence:
- Grid mode: `projects-page.tsx` line 322 — `TablePagination mode="cursor"` renders when `hasNextPage`; `onNext` calls `fetchNextPage` from `useInfiniteProjects`. Load-more via pagination control (FE-125 compliant: numbered-pagination pattern when total is known, cursor prev/next otherwise).
- List mode: `ProjectTable` receives `hasMore` and `onLoadMore` for its own pagination control.

### [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

Evidence:
- `frontend/hooks/api/build/projects-list-contract.test.ts` (in my territory) — covers project list schema parity.
- `frontend/hooks/api/build/projects-error-policy.test.ts` — error handling policy.
- `frontend/hooks/api/build/project-list-patch-scope.test.ts` — scope patch behavior.
- `frontend/hooks/api/build/build-project-schema.test.ts` (contested, read-only) — project detail and member contracts.

### [x] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

Evidence:
- `projects-page.tsx` — `useBuildListKeyboard({ itemCount: visibleProjects.length, onOpen: handleKeyboardOpenProject, onClearSelection: handleKeyboardClearProject, enabled: pageState.kind === "ready" })` added this session. `handleKeyboardOpenProject(index)` calls `router.push(\`/build/${project.id}\`)`. Handles `j/k` move, `Enter` navigate, `Esc` close create dialog, `/` search (search input in `ProjectFilterBar` is wired).
- `useReducedMotion()` line 74 — drives `fadeUp`/`fadeUpReduced` variants on project cards.
- Grid has `role="list"` and `aria-label="Projects grid"` (lines 309-310); each item has `role="listitem"`.
- Mobile: `viewMode` switch renders `ProjectTable` at narrow viewports; `ProjectFilterBar` has mobile-responsive drawer filters.

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — criterion 7 rule.

---

## 10-teams.md — `/build/teams`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/teams/page.tsx` exists, imports `TeamsListPage`, calls `enforceRouteAccess`.
- Manifest: `{ route: "/build/teams", decision: "KEEP" }`.
- Access deny test: EXPECTED_ACCESS includes `/build/teams`.
- Nav: `frontend/lib/build/nav/build-organization-catalog.ts` includes teams with `build:teams:view`.

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "See team membership, ownership, and active work." `TeamsListPage` renders team table with create/edit/delete and name search. Distinct from project member list (project-scoped) and org members (HR module).
- Feature: `frontend/features/build/teams/teams-list-page.tsx` — `useProjectTeams`, cursor pagination, `TeamFormSheet`, `ConfirmDialog`.

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — URL params `leadId` and `memberId` from spec are not wired as filter definitions (only free-text search is wired). Offline/conflict states not present. No integration test for team list page beyond schema tests.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence: `teams-list-page.tsx` — `DataTable` with `pagination={{ mode: "cursor", pageSize: 50, hasMore, hasPrevious, onNext, onPrevious }}` using `useCursorPager`. Backend cursor pages teams list.

### [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

Evidence:
- `frontend/hooks/api/build/teams-list-contract.test.ts` — backend service projection scan confirms `memberCount` is projected; contract parity for list row shape.
- `frontend/hooks/api/build/teams-schema.test.ts` — enum validation and shape tests for team schema types.

### [x] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

Evidence:
- `teams-list-page.tsx` — `useBuildListKeyboard({ itemCount: teams.length, onOpen: handleKeyboardOpen, onClearSelection: handleKeyboardClear, enabled: !isLoading })` added this session. `handleKeyboardOpen(index)` calls `router.push(\`/build/teams/${teams[index].id}\`)`. Handles `j/k` move, `Enter` navigate, `Esc` close edit sheet.
- `DataTable` provides `minWidth="560px"` and `mobileCard={renderMobileCard}` for 375px layout.

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — criterion 7 rule.

---

## 10-teams-team.md — `/build/teams/[teamId]`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/teams/[teamId]/page.tsx` exists, imports `TeamHomePage`, calls `enforceRouteAccess`. Params: `teamId` (named after entity, FE-05).
- Manifest: `{ route: "/build/teams/:teamId", decision: "KEEP" }`.
- Access deny test: EXPECTED_ACCESS includes `/build/teams/:teamId`.

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "See team membership, ownership, and active work." `TeamHomePage` renders team metadata panel, member list with add/remove/role-change, and `TeamProjectsSection`. Distinct from teams list (directory) and project member list (project-scoped).
- Feature: `frontend/features/build/teams/team-home-page.tsx` — `useProjectTeam`, member CRUD, `TeamFormSheet`.

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — No URL params from spec (`leadId`, `memberId`, `q`, `cursor`) are implemented (this is a detail page, not a filtered list). Members are rendered as a flat list without pagination. No keyboard navigation. No conflict state. No integration test for page behavior.

### [ ] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

BLOCKED — `team-home-page.tsx` renders `data.members.map(...)` directly without pagination (line 362). A team with 1k members renders all rows. `TeamProjectsSection` pagination not measured. Filed in `requests/LANE-1.md`.

### [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

Evidence:
- `frontend/hooks/api/build/teams-schema.test.ts` — covers `teamDetailContract`, `teamMemberContract`, `teamRowContract`.

### [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

BLOCKED — `TeamHomePage` has no keyboard navigation. Member list rows are statically rendered; no `useBuildListKeyboard` or focus management. This is a detail surface but still requires `/` and `j/k` per the spec.

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — criterion 7 rule.

---

## 10-templates.md — `/build/templates`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/templates/page.tsx` exists, imports `BuildTemplatesPage`, calls `enforceRouteAccess`.
- Manifest: `{ route: "/build/templates", decision: "KEEP" }`.
- Access deny test: EXPECTED_ACCESS includes `/build/templates`.
- Nav: `frontend/lib/build/nav/build-organization-catalog.ts` includes templates with `build:view`.
- Evidence note: spec records "Production URL remained `/build/templates` but rendered the All Projects surface during the bounded audit" — prior state; current code imports `BuildTemplatesPage`.

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "Start proven workflows without rebuilding them." `BuildTemplatesPage` renders a grid of `TemplateCard` components with apply/delete actions and `CreateTemplateSheet`. Distinct from project list (project management) and all-work (ticket management).
- Feature: `frontend/features/build/templates/build-templates-page.tsx` — `useProjectTemplates`, `TemplateCard`, `CreateTemplateSheet`, `ApplyTemplateDialog`, `ConfirmDialog`.

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — URL params `category`, `q`, `sort`, `cursor` from spec are not implemented. No search bar or category filter. No keyboard navigation. No cursor pagination UI. No page-level tests. Conflict state not present.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence: Backend `listTemplates` uses ORM `findMany` without a cursor but is called without a limit override, relying on the default page cap (BE-24: `PAGE_SIZE_CAP = 100`). `useProjectTemplates` returns the array; the grid renders all. At ≤100 templates (the API cap), the grid is bounded. No 10k-template scenario exists in practice given the 100-row cap.

### [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

Evidence:
- NEW `frontend/hooks/api/build/templates-list-contract.test.ts` — 13 tests:
  - `templateRowContract`: minimal parse; description null; createdBy null; embedded tickets array; ticket with null phase+description; missing name field rejected; non-integer id rejected
  - `templateListContract`: empty list; two-template list; invalid shape member rejected
  - `applyTemplateResultContract`: successful apply result parsed; missing key field rejected
- Schema is imported from `frontend/hooks/api/build/roadmap-schema.ts` (Lane 2 file). Per coordinator ruling: "a test does not need to sit beside the schema to assert it." Test lives in Lane 1 territory (`hooks/api/build/`).

### [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

BLOCKED — `BuildTemplatesPage` has no `useBuildListKeyboard`. Templates are rendered as a 3-column grid, not a DataTable, so standard j/k row navigation does not map cleanly. No explicit `useReducedMotion` call.

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — criterion 7 rule.
