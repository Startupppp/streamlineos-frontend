# Lane 4 — Project execution core

Read [`LANE-COMMON.md`](./LANE-COMMON.md) first. It is binding.

Migration range: **1255–1259**. Status file: `status/LANE-4-STATUS.md`. Requests: `requests/LANE-4.md`.

This is the hottest territory in the module. Read the contested-file list in
[`README.md`](./README.md) before your first edit — several files you will want are request-only
precisely because they sit under every other lane's pages too.

## Your page specs (10 — 70 checkboxes)

| Spec | Route |
|---|---|
| `docs/build-module/10-project.md` | `/build/[projectId]` |
| `docs/build-module/10-project-issues.md` | `…/issues` |
| `docs/build-module/10-project-backlog.md` | `…/backlog` |
| `docs/build-module/10-project-tickets-issue.md` | `…/tickets/[ticketKey]` |
| `docs/build-module/10-project-epics.md` | `…/epics` |
| `docs/build-module/10-project-triage.md` | `…/triage` |
| `docs/build-module/10-project-cycles.md` | `…/cycles` |
| `docs/build-module/10-project-cycles-cycle.md` | `…/cycles/[cycleId]` |
| `docs/build-module/10-project-modules.md` | `…/modules` |
| `docs/build-module/10-project-workload.md` | `…/workload` |

## Territory

**Frontend features:** `frontend/features/build/{backlog,epics,cycles,triage,modules,views,ticket-details,tickets,comments,bugs}/**`

**Frontend routes:** `frontend/app/(authenticated)/build/[projectId]/{issues,backlog,tickets,epics,triage,cycles,modules,workload}/**`, `frontend/app/(authenticated)/build/[projectId]/page.tsx`

**Frontend hooks:** `frontend/hooks/api/build/{tickets,ticket-queries,ticket-cache,ticket-cache-regression.test,ticket-search,ticket-activity,ticket-activity-pagination.test,ticket-sub-resources,ticket-update-mutation,ticket-create-rank-mutations,ticket-related-links,ticket-detail-assignees-contract.test,ticket-list-contract.test,ticket-ai,advanced,advanced-cycles.test,board-server-filter.test,checklists,labels,custom-states,custom-states.test,watchers,workload-capacity,execution-schema,execution-schema.test,build-tickets-schema.test,optimistic-create.test,mutation-invalidation.test}.*`

**Backend:** `backend/src/modules/build/execution/**`, `backend/src/modules/build/phase-2/**` (read-mostly: these are the contraction invariant specs — do not weaken them), and in `backend/src/modules/build/core/`: every `projects-ticket*`, `projects-tickets*`, `tickets-*`, `ticket-status.util.ts`, `build-ticket-*`, `board-*.spec.ts`, `projects-labels.service.ts`, `projects-custom-states.service.ts`, `projects-custom-fields.*`, `projects-changelog.service.ts`, `projects-recurrence.util.ts`, `lib/allocate-ticket-number.*`, `lib/default-statuses.ts`, plus each file's `*.spec.ts`.

**Explicitly not yours** (contested, request-only): `core/projects.controller.ts`,
`projects.module.ts`, `projects-by-id.*`, `project-access.ts`, `projects-scope.ts`,
`projects-query.service.ts`, `projects-write.service.ts`, `entity/**`,
`frontend/features/build/project-detail/project-board-page.tsx`,
`frontend/hooks/api/build/projects.ts`, `project-cache-patch.ts`, `build-project-schema.ts`,
`build-tickets-core-schema.ts`, `build-tickets-subresource-schema.ts`.

## Lane-specific hazards, measured

- **The Sprint→Cycle contraction is complete and irreversible.** `build.sprints` is dropped
  (archived to `build.sprints_archive`, 4 rows, RLS enabled); `sprint_id` is gone from `tickets`,
  `project_meetings`, `test_runs` and `sprint_scope_events`; `build.bugs` and
  `test_run_results.linked_bug_id` are gone. Every `SprintsService` verb throws `GoneException`.
  The `sprintId` census across the whole frontend returns **0**. `sprint-cycle-detach-invariant.spec.ts`
  and `sprint-cycle-drop-invariant.spec.ts` have **empty allowlists** and will fail if you
  reintroduce a reference in string, Drizzle relational (`sprintId: true`) or query-builder form.
  Do not "restore" anything sprint-shaped.
- Backend is cut over to Cycle; **the frontend is not fully cut over**. Check before assuming.
- **Ordering rule that inverts twice.** Drizzle names every *declared* column in its INSERT list,
  so a declaration that outlives its column raises `42703` on every insert and bare select. After a
  drop, a surviving declaration is a query against nothing — that is what broke
  `test-runs.service.ts` on `linked_bug_id`.
- Canonical `/build/:projectId/cycles` owns backlog-to-cycle planning, unfinished-ticket handling at
  completion, and the velocity panel. `/sprints` does not exist and must not come back.
- The Issues view ladder is the **exhaustive switch** in `frontend/features/build/views/project-board-content.tsx`.
  `view=timeline` and `type=BUG` redirect into Issues. `view=calendar` normalizes to
  `/calendar?projectId=…&source=build`; the local Build calendar renderer was deleted.
- Board-count reads accept and apply the same validated filter contract as board rows (search,
  status, priority, assignee, labels, cycle, module, epic, due-date). Explicit zero aggregates must
  stay zero and must not fall back to loaded-row counts.
- Board row model rows are **not anchors** — do not treat a route-model row as proof a page exists.
- Ticket edits send `expectedUpdatedAt` and surface a `Reapply` action; that is the conflict
  criterion's existing evidence (20/20 focused tests). Verify and cite.
- Malformed enum deep links (`priority=NOT_A_PRIORITY`) must be dropped before the request is
  built, on both the Issues path and the shared Backlog filter path.
- Ticket-detail caches must include **project and ticket identity**; a mismatched project URL
  (`/build/5/tickets/BQS-2`) must resolve to the unavailable-scope state without leaking ticket data.
- Search terms over 200 characters are rejected and valid terms trimmed, on project Issues, All Work
  and organization ticket search. All Work is Lane 1's page — coordinate through a request.
- `layoutType` on a saved view is a **PostgreSQL enum**; `z.string()` over it is the house defect.
- 15 GET routes already write inside the request transaction. Do not add a sixteenth.
