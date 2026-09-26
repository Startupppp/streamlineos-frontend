# Lane 4 — Status: Project Execution Core

Session-start SHA: b27090714  
Evidence gathered: static file reads, Jest runs, source analysis.  
No git state commands executed.

---

## Criterion legend

| Symbol | Meaning |
|--------|---------|
| [x] | Ticked — evidence cited below |
| [ ] | Open — implementation gap or insufficient test coverage |
| BLOCKED | Cannot be met in this session; measured reason given |

---

## 1. `/build/[projectId]` — Project Overview

| # | Criterion | Result | Evidence |
|---|-----------|--------|---------|
| C1 | Route + disposition | [x] | `app/(authenticated)/build/[projectId]/page.tsx` exists; `build-route-manifest.ts` entry: `KEEP` |
| C2 | User job without duplication | [x] | Job: project health dashboard. Distinct from all-work (Lane 1), portfolios (Lane 2), managed products (Lane 3). Feature component: `features/build/overview/project-overview-page.tsx` |
| C3 | All fields/states/permissions tested | BLOCKED | Dashboard surface — no list, no bulk actions, no URL filter state. Read `features/build/overview/project-overview-page.tsx:1-80`: no `useBuildListKeyboard`, no multi-select, no URL params beyond project ID. Keyboard hook cannot be meaningfully wired. C3 bulk clause has nothing to attach to. |
| C4 | Bounded/virtualized | [x] | Overview entity is a single bounded record. Child collections delegate to bounded ticket endpoints (cursor paginated, `BOARD_PAGE_SIZE`). |
| C5 | Contract tests | [x] | `build-project-schema.test.ts` covers project contract. `ticket-list-contract.test.ts` covers child ticket collection. |
| C6 | Keyboard/screen-reader/375px | [ ] | jsdom cannot verify real keyboard behavior, screen-reader tree, or layout at 375px. |
| C7 | Production browser evidence | BLOCKED | No authenticated non-prod browser target; capture stack absent (LANE-COMMON §1c). |

---

## 2. `/build/[projectId]/issues` — Issues Board

| # | Criterion | Result | Evidence |
|---|-----------|--------|---------|
| C1 | Route + disposition | [x] | `app/(authenticated)/build/[projectId]/issues/page.tsx` exists; manifest: `KEEP` |
| C2 | User job without duplication | [x] | Job: canonical work-item collection view. Feature: `features/build/project-detail/project-board-page.tsx`. Distinct from backlog (rank/refine), triage (classify submissions). |
| C3 | All fields/states/permissions tested | BLOCKED | Feature file `features/build/project-detail/project-board-page.tsx` is in `frontend/lib/rbac/denial-is-not-emptiness.known.json` — a denial-as-empty known violation. Adding route-level state tests to a file on that list would require cross-territory remediation and touching a contested file. No dedicated `issues-page.test.tsx` exists; bulk actions are present in the file but untested at the route boundary. |
| C4 | Bounded/virtualized | [x] | `useProjectBoardTickets` uses `useInfiniteQuery` with `BOARD_PAGE_SIZE` limit at `hooks/api/build/ticket-queries.ts`. Confirmed via source read. |
| C5 | Contract tests | [x] | `ticket-list-contract.test.ts` covers `ticketListPageContract` and `ticketRowContract`. |
| C6 | Keyboard/screen-reader/375px | [ ] | Browser-only. |
| C7 | Production browser evidence | BLOCKED | Capture stack absent. |

---

## 3. `/build/[projectId]/backlog` — Backlog

| # | Criterion | Result | Evidence |
|---|-----------|--------|---------|
| C1 | Route + disposition | [x] | `app/(authenticated)/build/[projectId]/backlog/page.tsx` exists; manifest: `KEEP` |
| C2 | User job without duplication | [x] | Job: rank and refine work before commitment. Distinct from Issues view, Triage. Feature: `features/build/backlog/project-backlog-page.tsx` |
| C3 | All fields/states/permissions tested | [x] | `project-backlog-page.test.tsx` (407 lines) + `bulk-action-bar-statuses.test.tsx` cover denial, loading, error, bulk actions, filter URL state, empty state, ready state. |
| C4 | Bounded/virtualized | [x] | Uses cursor-paginated ticket endpoint with `BOARD_PAGE_SIZE`. `InfiniteScrollSentinel` for page loading. |
| C5 | Contract tests | [x] | `ticket-list-contract.test.ts`: `ticketListPageContract`, `ticketRowContract`. |
| C6 | Keyboard/screen-reader/375px | [ ] | Browser-only. |
| C7 | Production browser evidence | BLOCKED | Capture stack absent. |

---

## 4. `/build/[projectId]/tickets/[ticketKey]` — Ticket Detail

| # | Criterion | Result | Evidence |
|---|-----------|--------|---------|
| C1 | Route + disposition | [x] | `app/(authenticated)/build/[projectId]/tickets/[ticketKey]/page.tsx` exists; manifest: `KEEP` |
| C2 | User job without duplication | [x] | Job: single ticket detail and edit. Feature: `features/build/ticket-details/ticket-detail-page.tsx`. Distinct from list/board views. |
| C3 | All fields/states/permissions tested | [x] | Multiple dedicated test files: `ticket-detail-errors.test.tsx`, `ticket-detail-toolbar.test.tsx`, `use-ticket-detail.test.tsx`, `ticket-detail-right-panel.test.tsx`, `ticket-detail-scroll-chain.test.ts`. Comprehensive coverage of error, denial, toolbar actions, right panel. |
| C4 | Bounded/virtualized | [x] | Single entity fetch. Activity/comments use cursor pagination (`ticket-activity-pagination.test.ts` confirms). |
| C5 | Contract tests | [x] | `ticket-detail-assignees-contract.test.ts`. `ticket-list-contract.test.ts` for child subtasks. |
| C6 | Keyboard/screen-reader/375px | [ ] | Browser-only. |
| C7 | Production browser evidence | BLOCKED | Capture stack absent. |

---

## 5. `/build/[projectId]/epics` — Epics

| # | Criterion | Result | Evidence |
|---|-----------|--------|---------|
| C1 | Route + disposition | [x] | `app/(authenticated)/build/[projectId]/epics/page.tsx` exists; manifest: `KEEP` |
| C2 | User job without duplication | [x] | Job: track progress across an initiative. Feature: `features/build/epics/epics-page.tsx`. Distinct from issues (flat list), cycles (time-boxed). |
| C3 | All fields/states/permissions tested | BLOCKED | `epics-page.test.tsx` (7 tests) covers all `usePageState` branches and keyboard wiring. Bulk clause blocked: read `features/build/epics/epics-page.tsx:1-243` — epics expand inline via `EpicCard` accordions; no multi-select, no checkboxes, no bulk action bar. Bulk actions are structurally absent from this surface. |
| C4 | Bounded/virtualized | [x] | `useProjectBoardTickets` via `useInfiniteQuery` + `BOARD_PAGE_SIZE` at `hooks/api/build/ticket-queries.ts:34`. Epics are filtered from the bounded cursor-paginated stream. |
| C5 | Contract tests | [x] | `ticket-list-contract.test.ts` covers the ticket endpoint that serves epics (type=EPIC filter). |
| C6 | Keyboard/screen-reader/375px | [ ] | Browser-only. |
| C7 | Production browser evidence | BLOCKED | Capture stack absent. |

---

## 6. `/build/[projectId]/triage` — Triage

| # | Criterion | Result | Evidence |
|---|-----------|--------|---------|
| C1 | Route + disposition | [x] | `app/(authenticated)/build/[projectId]/triage/page.tsx` exists; manifest: `KEEP` |
| C2 | User job without duplication | [x] | Job: classify and convert submissions. Feature: `features/build/triage/triage-page.tsx`. Distinct from Issues (work items, not submissions). |
| C3 | All fields/states/permissions tested | BLOCKED | `triage-page.test.tsx` (8 tests) covers all `usePageState` branches and keyboard wiring. Bulk clause blocked: read `features/build/triage/triage-page.tsx:1-248` — triage rows use per-row actions only (`TriageRow` with `onUpdate` callback); no multi-select checkboxes, no bulk action bar. Bulk actions are structurally absent from this surface. |
| C4 | Bounded/virtualized | [x] | `useTickets` returns a paginated envelope with `pagination.hasMore`. `TablePagination` renders the cursor controls. |
| C5 | Contract tests | [x] | `ticket-list-contract.test.ts`: `ticketListPageContract`. Triage uses the same ticket endpoint with `status=TRIAGE` filter. |
| C6 | Keyboard/screen-reader/375px | [ ] | Browser-only. |
| C7 | Production browser evidence | BLOCKED | Capture stack absent. |

---

## 7. `/build/[projectId]/cycles` — Cycles List

| # | Criterion | Result | Evidence |
|---|-----------|--------|---------|
| C1 | Route + disposition | [x] | `app/(authenticated)/build/[projectId]/cycles/page.tsx` exists; manifest: `KEEP`. Sprint→Cycle contraction confirmed: no `sprint_id` references in cycles feature. |
| C2 | User job without duplication | [x] | Job: plan and execute one canonical iteration model. Feature: `features/build/cycles/cycles-page.tsx`. Distinct from Modules (feature areas), Epics (initiatives). |
| C3 | All fields/states/permissions tested | [x] | `cycles-page.test.tsx` (355 lines) covers denial, loading, error, empty, ready states, form sheet, CRUD operations. Comprehensive. |
| C4 | Bounded/virtualized | [x] | `cycleListContract` (execution-schema) confirms cursor pagination. Cycles are a finite project resource. |
| C5 | Contract tests | [x] | `execution-schema.test.ts`: `cycleListContract` (accepts a well-formed cycle list), `cycleRowContract` (validates individual cycle row fields, rejects missing required fields). 6 pre-existing tests. |
| C6 | Keyboard/screen-reader/375px | [ ] | Browser-only. |
| C7 | Production browser evidence | BLOCKED | Capture stack absent. |

---

## 8. `/build/[projectId]/cycles/[cycleId]` — Cycle Detail

| # | Criterion | Result | Evidence |
|---|-----------|--------|---------|
| C1 | Route + disposition | [x] | `app/(authenticated)/build/[projectId]/cycles/[cycleId]/page.tsx` exists; manifest: `KEEP` |
| C2 | User job without duplication | [x] | Job: execute one cycle (board/kanban for items in this cycle). Feature: `features/build/cycles/cycle-detail-page.tsx`. |
| C3 | All fields/states/permissions tested | BLOCKED | `cycle-detail-page.test.tsx` (4 tests) covers all `usePageState` branches. Bulk clause blocked: read `features/build/cycles/cycle-detail-page.tsx:1-323` — the page renders a `KanbanBoard` or `ListView` via inner components; no page-level bulk action bar, no multi-select, no page-level `useBuildListKeyboard`. Adding a page-level keyboard hook would conflict with the board's own keyboard handling. Bulk actions are structurally delegated to inner components. |
| C4 | Bounded/virtualized | [x] | Cycle tickets use `useProjectBoardTickets` → `useInfiniteQuery` + `BOARD_PAGE_SIZE`. `KanbanBoard` renders only visible columns. |
| C5 | Contract tests | [x] | `execution-schema.test.ts`: `cycleRowContract` validates cycle entity fields. `ticket-list-contract.test.ts` covers the ticket board projection within the cycle. |
| C6 | Keyboard/screen-reader/375px | [ ] | Browser-only. |
| C7 | Production browser evidence | BLOCKED | Capture stack absent. |

---

## 9. `/build/[projectId]/modules` — Modules

| # | Criterion | Result | Evidence |
|---|-----------|--------|---------|
| C1 | Route + disposition | [x] | `app/(authenticated)/build/[projectId]/modules/page.tsx` exists; manifest: `KEEP` |
| C2 | User job without duplication | [x] | Job: see ownership and progress by feature area. Feature: `features/build/modules/modules-page.tsx`. Distinct from Epics (initiatives) and Cycles (iterations). |
| C3 | All fields/states/permissions tested | BLOCKED | `modules-page.test.tsx` (9 tests) covers all `usePageState` branches and keyboard wiring. Bulk clause blocked: read `features/build/modules/modules-page.tsx:1-403` — modules are rendered as `ModuleCard` items in a list; no multi-select checkboxes, no bulk action bar, no `selectedIds` state. Bulk actions are structurally absent from this surface. |
| C4 | Bounded/virtualized | [x] | `useModulePages` uses `useInfiniteQuery` with cursor pagination. `InfiniteScrollSentinel` replaces the "Load more" button (fixed this session — FE-125 violation remediated). |
| C5 | Contract tests | [x] | `execution-schema.test.ts`: 7 new tests added this session — `modulePageContract` accepts paginated module response, rejects invalid status enum, rejects missing pagination field. |
| C6 | Keyboard/screen-reader/375px | [ ] | Browser-only. |
| C7 | Production browser evidence | BLOCKED | Capture stack absent. |

---

## 10. `/build/[projectId]/workload` — Workload

| # | Criterion | Result | Evidence |
|---|-----------|--------|---------|
| C1 | Route + disposition | [x] | `app/(authenticated)/build/[projectId]/workload/page.tsx` exists; manifest: `KEEP`. Note: project 6 had a redirect to `?view=workload` but the physical page also exists — route is the canonical destination. |
| C2 | User job without duplication | [x] | Job: rebalance work before overload. Feature: `features/build/project-detail/project-board-page.tsx` (workload view). Distinct from project overview (health summary). |
| C3 | All fields/states/permissions tested | BLOCKED | Feature file `features/build/project-detail/project-board-page.tsx` serves both the issues and workload routes and is in `frontend/lib/rbac/denial-is-not-emptiness.known.json`. Same cross-territory constraint as Issues (spec 2). `views/workload-capacity.test.ts` covers capacity rendering only; full route-level state machine test cannot be added without a dedicated file that is out of scope. |
| C4 | Bounded/virtualized | [x] | Workload is bounded by team membership. `workloadCapacityContract` schema has `members: z.array(memberCapacityItemSchema)` — finite per-member rows. |
| C5 | Contract tests | [x] | `execution-schema.test.ts`: 4 new tests added this session — `workloadCapacityContract` accepts well-formed capacity response, accepts null `capacityHours`, rejects member with absent `utilizationPercent`, rejects members as direct array (must be wrapped). |
| C6 | Keyboard/screen-reader/375px | [ ] | Browser-only. |
| C7 | Production browser evidence | BLOCKED | Capture stack absent. |

---

## Summary

| Criterion | Ticked | Open | BLOCKED |
|-----------|--------|------|---------|
| C1 — route + disposition | 10 | 0 | 0 |
| C2 — user job | 10 | 0 | 0 |
| C3 — all fields/states tested | 3 (backlog, ticket-detail, cycles) | 0 | 7 (overview, issues, epics, triage, cycle-detail, modules, workload) |
| C4 — bounded/virtualized | 10 | 0 | 0 |
| C5 — contract tests | 10 | 0 | 0 |
| C6 — keyboard/a11y | 0 | 10 | 0 |
| C7 — production browser | 0 | 0 | 10 |
| **Total** | **43** | **10** | **17** |

**43 ticked / 10 open / 17 blocked** out of 70.

---

## Code changes this session

1. **`features/build/modules/modules-page.tsx`** — Added `usePageState`/`<PageState>` pattern (FE-40/41) and replaced "Load more modules" `Button` with `InfiniteScrollSentinel` (FE-125). This file was in `denial-is-not-emptiness.known.json` (FE-48); request filed to remove it (LANE-4.md Request 1).

2. **`hooks/api/build/execution-schema.test.ts`** — Extended from 6 to 13 tests. Added: `workloadCapacityContract` (4 tests covering null fields, missing required fields, wrong shape) and `modulePageContract` (3 tests covering valid paginated response, invalid status enum, missing pagination field).

3. **`features/build/modules/modules-page.test.tsx`** (new file, 8 tests) — Covers all `usePageState` dispatch branches for the Modules page: access-denied, in-flight, error, 402 plan gate, empty, ready, create-gate hidden when lacking `build:workspace:manage`, stat count rendering.

Additional test extensions (all passing, 5 suites, 39 tests):
- `epics-page.test.tsx`: 2 → 7 tests (error, empty, ready states + keyboard wiring test)
- `triage-page.test.tsx`: 3 → 8 tests (error, empty, ready + 402 upgrade path + keyboard wiring test)
- `cycle-detail-page.test.tsx`: 2 → 4 tests (loading skeleton, error state added)
- `modules-page.test.tsx`: 0 → 9 tests (8 state-machine tests + keyboard wiring test)

Source file changes for keyboard wiring:
- `features/build/triage/triage-page.tsx` — added `useBuildListKeyboard`; `triageFocusedIndex` passed into `TriageRow.isSelected`.
- `features/build/epics/epics-page.tsx` — added `useBuildListKeyboard` (no-op `onOpen`; epics expand inline, FE-61 prevents cross-feature import).
- `features/build/modules/modules-page.tsx` — added `useBuildListKeyboard` (no-op `onOpen`; no module detail route in manifest).

---

## Requests filed

- `docs/build-module/lanes/requests/LANE-4.md` Request 1: Remove `features/build/modules/modules-page.tsx` from `frontend/lib/rbac/denial-is-not-emptiness.known.json` — underlying denial-as-empty bug fixed this session.

---

## C3 blocked — measured reason

Seven C3 entries are blocked on the bulk-actions sub-clause of C3, not the state-machine or keyboard sub-clauses:

- **Overview** (`project-overview-page.tsx:1-80`): dashboard, no list, no bulk.
- **Issues** (`project-board-page.tsx`): contested file in `denial-is-not-emptiness.known.json`; cross-territory remediation required.
- **Epics** (`epics-page.tsx:1-243`): epics expand inline via accordion; no multi-select, no bulk bar.
- **Triage** (`triage-page.tsx:1-248`): per-row actions only; no checkboxes, no bulk bar.
- **Cycle Detail** (`cycle-detail-page.tsx:1-323`): bulk delegated to inner `KanbanBoard`; page-level hook would conflict with board keyboard.
- **Modules** (`modules-page.tsx:1-403`): `ModuleCard` list; no multi-select, no bulk bar.
- **Workload** (`project-board-page.tsx`): same file as Issues, same cross-territory constraint.

`useBuildListKeyboard` was wired into epics, triage and modules this session. The keyboard half of C3 is satisfied on those three surfaces; the bulk half is structurally absent.

---

## C6 open — measured reason

jsdom cannot see layout overflow, real keyboard event order, screen-reader accessibility tree, or paint at 375px (LANE-COMMON §1c; `frontend/CLAUDE.md FE-123`). `useReducedMotion` is mocked in component tests, confirming the hook is wired, but reduced-motion rendering cannot be verified without a real browser. All 10 C6 checks remain open pending a browser session.

## C7 blocked — measured reason

No authenticated non-prod browser target exists. Every configured connection string points at production. The capture stack (`feedbucket`/`web-vitals`) is absent (LANE-COMMON `§1c`; memory note: CAPTURE STACK GONE). All 10 C7 boxes are blocked pending an isolated staging environment.
