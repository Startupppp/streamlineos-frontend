# Milestones

## Route decision

- **Current/target route:** `/build/[projectId]/milestones`
- **Scope:** project
- **Disposition:** **KEEP**
- **Decision:** Retain as a canonical page, subject to the gaps and acceptance criteria below.
- **User job:** Coordinate work toward externally meaningful dates.
- **Evidence:** `frontend/app/(authenticated)/build/[projectId]/milestones/page.tsx`; Route existence verified in the repository; live behavior not directly observed with a valid detail record. **ASSUMPTION:** the page follows its source component until browser evidence is captured.

## Product contract

- **Purpose:** Track meaningful project checkpoints.
- **Primary persona:** Project manager.
- **Success metric:** Milestone on-time rate.
- **Required density:** compact by default with a comfortable-density toggle.
- **Core fields:** name, date, owner, status, progress, linked work.

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

Deep-linkable query parameters: `status`, `ownerId`, `from`, `to`, `q`, `cursor`. Cursor may be shared only when it is stable for the same normalized filter/sort/access revision. Selection, open menus, drafts, and unsaved form state are not placed in the URL.

## Bulk, keyboard, and context actions

- Bulk actions: assign, change status/priority, add label/link, archive, or export only where the same permission and state transition is valid for every selected row. Partial success returns a per-record result.
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

- Existing feature evidence: `@/features/build/milestones/project-milestones-page`
- Reuse: `PageState`, `DataTable`, cursor controls, `FilterBar` target module, `EmptyState`, `EntityFormDialog`, `EntityFormSheet`, `ConfirmDialog`, status/priority chips, member picker, command palette, dirty-state guard.
- New only if absent: scope-specific summary/visualization or execution module. Promote a shared module only after a second real consumer.

## API and data contract

- **Endpoints:** milestone endpoints.
- **Client schema/hooks:** `frontend/hooks/api/build/milestones.ts` where present.
- **List request:** `{ cursor?, limit<=100, q?, filters, sort }`; filters are the normalized URL state above.
- **List response:** `{ data: <row>[], pageInfo: { nextCursor, hasMore }, aggregates?, meta: { requestId, revision? } }`.
- **Detail response:** `{ data: { name, date, owner, status, progress, linked work, version, createdAt, updatedAt }, meta }`.
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
  - Reopened 2026-09-27: the blanket CCG-1 concurrency exemption was based on a false premise. Verify this page's read token, stale-write handling and conflict UX against architecture tickets 36/11/12/13 before closing; existing non-conflict evidence remains valid only for the behavior it exercised.
  - Measured 2026-09-26: URL-backed filters and `from`/`to` date range via `useBuildListFilters` with `gte`/`lte` applied server-side; `useBuildListKeyboard` wired for `/`, `j/k`, `Enter`, `Esc`, `c`, `e`, with `?` served globally by `use-keyboard-shortcuts.ts:60`; selection state plus `handleBulkStatusChange` and a bulk strip; row actions moved to a `DropdownMenu` on `MilestoneCard`; server-side keyset cursor over `(targetDate, id)` — `targetDate` is NOT NULL, so the predicate matches `ORDER BY targetDate ASC, id ASC` with no null bucket needed. 7/7 suite.
  - Conflict handling remains open under [CCG-1](./99-cross-cutting-gaps.md); ticket 13 tracks this entity's concurrency contract. Missing an HTTP header does not prove the absence of body-based version checking.
  - **2026-09-28 — CONFIRMED: every milestone update 400s today. The token is missing from three files, two of which are outside this lane.** `updateMilestoneSchema` requires `version: z.number().int().positive()` and is `.strict()` (`backend/src/modules/build/execution/dto/workspace.schemas.ts:29`), and `listMilestones` does project it (`backend/src/modules/build/execution/workspace.service.ts:54`). The frontend drops it: `milestoneRowSchema` (`frontend/hooks/api/build/workspace-schema.ts:4-17`) omits `version`, so `z.object()` strips it off every row; `ProjectMilestone` (`frontend/types/projects/planning.ts:1-12`) has no `version`; and `UpdateMilestoneInput` (`frontend/hooks/api/build/milestones.ts:71-76`) declares none, so the PATCH body cannot carry one. Both writers are affected — `handleBulkStatusChange` (`frontend/features/build/milestones/project-milestones-page.tsx:170`) and `milestone-upsert-sheet.tsx:94`. Fix order: add `version: z.number()` to `milestoneRowSchema`, add `version: number` to `ProjectMilestone`, add `version: number` **required, never `.optional()`** to `UpdateMilestoneInput`, then pass `m.version` at both call sites. The contract test must reject a row that omits `version`, not merely accept one that has it.
  - 2026-09-28 per-item audit. **Closed since the last entry:** the failure branch no longer discards the backend's status semantics. `project-milestones-page.tsx` had an `if (isError)` block rendering a bare `ErrorState` *after* `usePageState`, so a 402 `MODULE_NOT_ENABLED` lost its `upgradePath` (AP-7) even though `error` was passed correctly. Both branches now resolve through `<PageState>`, with a paired 402/ordinary-error test. 9/9 in `project-milestones-page.test.tsx`.
  - **Still open — `ownerId` query parameter.** Declared in `MILESTONE_FILTER_DEFINITIONS` (`project-milestones-page.tsx:57`) but never read, never given a control, and `listMilestonesQuerySchema` (`backend/src/modules/build/execution/dto/workspace.schemas.ts:10-18`) has no `ownerId`. Needs a backend filter first.
  - **Still open — core fields `owner`, `progress` and `linked work`.** `build.project_milestones` (`backend/src/db/schema/build/members.ts:118-137`) has `createdBy` but no assignable owner, no progress column and no link table to work items. `milestone-card.tsx` renders none of the three. All three need schema work before the frontend can show them.
  - **Still open — offline and conflict states.** No `useOnlineStatus` branch and no 409 handler on this surface.
  - 2026-09-28 — **closed. Every item the entries above left open is now implemented and tested.** Taking them in the order they were raised:
  - **The version token is no longer missing.** `milestoneRowSchema` declares `version` (`frontend/hooks/api/build/workspace-schema.ts:24`), `ProjectMilestone` carries it (`frontend/types/projects/planning.ts:20`), `UpdateMilestoneInput` declares it **required** (`frontend/hooks/api/build/milestones.ts:76`), and both writers send the row's own token — `milestone-upsert-sheet.tsx:161` and the bulk change at `project-milestones-page.tsx:198`. `milestone-upsert-version-token.test.tsx` rejects a body with the token stripped rather than merely accepting one that has it. That suite was **red on arrival** (the owner field's `MemberPicker` pulled `useSession` into a provider-less render); it is fixed by stubbing the picker and `useCan`, not by deleting the assertion.
  - **`ownerId` is a served query parameter.** `listMilestonesQuerySchema.ownerId` coerces a numeric string (`backend/src/modules/build/execution/dto/workspace.schemas.ts:18`), the predicate is `workspace.service.ts:74`, and the page forwards it only when it is all digits (`project-milestones-page.tsx:104-105,119`) so `?ownerId=user-7` is dropped instead of being sent as `NaN`. It now has a control too: an owner `BuildFilterSelect` labelled by `getUserDisplayName` and valued by membership id (`:283-291`), which writes the URL rather than filtering the loaded page. Four paired cases in `project-milestones-page.test.tsx`.
  - **Core fields `owner` and `linked work` are stored, projected and rendered.** Migration `1424_build_milestone_owner_linked_work.sql` added `owner_membership_id` with a composite `(org_id, owner_membership_id)` FK and a partial index (`backend/src/db/schema/build/members.ts:127,137-138`); the list resolves the owner through `organization_members → users` (`workspace.service.ts:64-65,107-109`) and `assertOwnerInOrg` (`:145`) rejects a cross-tenant membership id. `milestone-card.tsx:143-147` renders the display name, never the id.
  - **Core field `progress` now has a source and needs no new column.** It is the completed share of the milestone's linked work: `linkedWorkCounts` (`workspace.service.ts:111-135`) returns `linked` and `completed` from **one** aggregate, where `completed` is `count(*) FILTER (WHERE project_statuses.type = 'completed')` over the same `tickets → project_statuses` join the burn-up report already uses (`core/analytics/projects-reports.service.ts:148-161`) — the status *type*, not a hardcoded `"DONE"`, so a project that renamed its final column still counts. A second column holding a percentage would be a second source of truth for a fact the ticket rows already state. `completedTicketCount` is required-and-not-optional in the backend row schema (`execution/dto/workspace-response.schemas.ts:24`), the client contract (`frontend/hooks/api/build/workspace-schema.ts:23`) and the row type (`frontend/hooks/api/build/milestones.ts:17-19`), so a dropped projection throws instead of rendering 0%. `milestone-card.tsx:73-76,164-171` renders `3/4 done (75%)`, and renders **nothing** when there is no linked work rather than claiming 0%. `updateMilestone` also stopped returning the hardcoded `linkedTicketCount: 0` it used to (`workspace.service.ts:192-197`), which was a cache-patch projection that zeroed a milestone's linked work on every edit.
  - **Offline state is wired.** `project-milestones-page.tsx:89,358-365` consumes `useOnlineStatus`, paired positive/negative cases in `project-milestones-page.test.tsx`.
  - **Conflict state shows a field-level comparison, not a toast.** `milestone-upsert-sheet.tsx:167-180` maps a `PROJECTS_TICKET_CONFLICT` onto `TicketConflictDialog` through `buildMilestoneConflictDiffs` (`:61-89`), which diffs name, description, target date, status and owner (the owner by display name, via `ownerLabel` at `:136-144`) and falls back to a warning toast when nothing was edited. Four cases in `milestone-conflict-dialog.test.tsx`, including that a 500 still reaches the error toast and opens no comparison. The token itself is enforced server-side at `workspace.service.ts:159` with the bump owned by the `trg_project_milestones_version_bump` trigger from migration `1395`, so the compare-and-swap is not decorative.
  - **Right click opens the card's authorized actions.** `milestone-card.tsx:97` handles `contextmenu` and opens the existing row `DropdownMenu` as a controlled menu (`:174`), mirroring Edit and — only when the viewer may delete — Delete. Six cases in `milestone-card.test.tsx` cover progress, the owner name and the menu, including that Delete is absent for a viewer without it. `copy link/key` is not offered: a milestone has no detail route and no human key.
  - **Bulk actions report a per-record result.** `project-milestones-page.tsx:186-212` counts settled mutations and, on partial failure, names each failed milestone with its backend message instead of firing N anonymous toasts; on full success it reports one line. Three cases pin the success line, the partial line naming the failed row, and that each row is sent with its own token. Only the status transition is offered: milestones carry no labels or links to add, and archive/delete stays a single `ConfirmDialog` because the spec's own Elements line keeps destructive changes off the optimistic path.
  - Commands, 2026-09-28: `cd frontend && npx jest --maxWorkers=2 features/build/milestones` → 4 suites, 31 tests, all pass. `npx jest --maxWorkers=2 hooks/api/build/milestones-list-contract` → 14 tests, all pass; its fixture omitted the `owner` and `linkedTicketCount` keys an earlier pass had made required, so that suite was also red on arrival. `cd backend && npx jest --maxWorkers=2 src/modules/build/execution` → 28 suites, 311 tests, all pass, including 20 cases in `milestone-owner-linked-work.spec.ts`. `npx eslint features/build/milestones` → 0 errors. Component- and unit-test evidence only: no database and no browser, so the two browser boxes below stay unticked, and the response-schema change needs `pnpm openapi:generate` plus a `frontend/contracts/openapi.json` refresh from the orchestrator.
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
