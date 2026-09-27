# 39 — "Hide completed" works for custom statuses

**What to build:** A project that renames its final column to "Shipped" gets the same behaviour as one that calls it "Done": hiding completed work hides it, and completion-based reports count it. Project statuses carry a state group in the database — backlog, unstarted, started, completed, cancelled — and that column is absent from the response contract and absent from the frontend contract, so the helper that decides which statuses count as completed branches on a field that is never populated and can only ever return the single hardcoded name. Nothing type-errors, because the field is declared optional on the way in.

The same table's group is declared correctly by a second schema eighty lines away in the same file, for the custom-states read. One of the two is the shape to keep.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

**Schema correction (2026-09-27):** `backend/src/db/schema/build/core.ts:110` gives the group a
default but does not declare it NOT NULL. A default is not a guarantee against historical or
explicit nulls. Expose the current nullable contract honestly, or survey/backfill/constrain before
requiring it. Ticket custom status names remain text; do not replace them with a fixed enum.

- [x] The state group is present in the response contract, the frontend contract and the read hook's row type
  - `backend/src/modules/build/core/dto/build-project-detail-response.schemas.ts` — `projectStatusSchema` now exports `type: z.enum(DB_ENUMS.state_group).nullable()`
  - `backend/src/modules/build/core/dto/build-core-response.schemas.ts` — `projectCustomStateSchema` and `orgCustomStateSchema` both use `z.enum(DB_ENUMS.state_group).nullable()`
  - `frontend/hooks/api/build/build-project-schema.ts` — `projectStatusRowSchema` and `projectCustomStateSchema` both carry `type: z.enum(STATE_GROUP_VALUES).nullable()`
- [x] The completed-status helper returns every status whose group is completed, and a test covers a renamed completed status
  - 15 tests in `frontend/features/build/shared/completed-status.test.ts`; all pass; covers renamed "Shipped" with `type: "completed"`, null-type rows, and multi-completed projects
- [x] The field is required where the database guarantees it, not optional-and-ignored
  - Column has a default but no NOT NULL constraint (`core.ts:110`); exposed honestly as `.nullable()` without `.optional()`
- [x] The two schemas for this table agree, or one of them is deleted
  - Both `projectStatusSchema` (detail) and `projectCustomStateSchema` (core) now use `z.enum(DB_ENUMS.state_group).nullable()` — agrees with `orgCustomStateSchema`; no pass-through wrapper (BE-143)
- [x] Every surface that hides or counts completed work is checked against a project with a renamed completed column
  - **"DONE" inventory (2026-09-27) — in-territory, fixed:**
    - `frontend/features/build/views/table-view-types.ts:10` — `isOverdue` now calls `isCompletedTicketStatus(ticket.status, statuses)` instead of `ticket.status === "DONE"`. Test file `table-view-types.test.ts` (7/7 pass) covers renamed "Shipped" (type="completed") returning false for past-due dates. `table-view.tsx:193` passes `projectStatuses` to `isOverdue`.
    - `frontend/features/build/views/workload-view.tsx` — `isTicketOverdue` now calls `isCompletedTicketStatus(t.status, statuses)`. `WorkloadViewProps` gains `projectStatuses?`. Callers: `workload-board-page.tsx` passes `statuses` from `useProject`; `project-board-content.tsx` passes `statuses` from its `ProjectBoardContentProps`.
    - `frontend/features/build/cycles/cycle-completion-sheet.tsx:24` — `incompleteCount` filter now calls `isCompletedTicketStatus(ticket.status, projectStatuses)`. `CycleCompletionSheetProps` gains `projectStatuses?`.
    - `frontend/features/build/cycles/cycles-page.tsx` — `handleConfirmCompletion` filter now calls `isCompletedTicketStatus(ticket.status, projectStatuses)`. `useProject` call added to source `projectStatuses`; `cycles-page.test.tsx` mocks `@/hooks/api/build/projects` to prevent QueryClient failure (16/16 pass, 2026-09-27).
    - `frontend/features/build/ticket-details/ticket-subtasks.tsx` — `subtasksDone` now uses `isCompletedTicketStatus(s.status, projectStatuses)`.
    - `frontend/features/build/ticket-details/subtask-row.tsx` — `isDone` now uses `isCompletedTicketStatus(subtask.status, projectStatuses)`.
  - **"DONE" inventory — out-of-territory bypasses (report for other lanes):**
    - `frontend/features/build/command-center/command-center-rows.tsx:50` — `item.status !== "DONE"` — out of territory; reported.
    - `frontend/features/build/epics/epic-story-row.tsx:47` — `isDone = story.status === "DONE"` — out of territory; reported.
    - `frontend/features/meetings/generate-agenda.ts:32,51,77` — multiple hardcoded "DONE" — out of territory; reported.
    - `frontend/features/build/tickets/use-duplicate-title-warning.ts:17` — `r.status !== "DONE"` — out of territory; reported.
- [x] Test existing null group rows and newly created/custom-renamed statuses through the actual response parser, not a cast that invents the missing field
  - `completed-status.test.ts` parses null-type rows and "Shipped" (type="completed") through `projectDetailContract.parse()` with no `as X` cast

**Test run evidence (2026-09-27):**
```
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath \
  features/build/views/table-view-types.test.ts \
  features/build/views/execution-core-gallery.test.tsx \
  features/build/cycles/cycles-page.test.tsx
Tests: 25 passed, 25 total — exit 0
```
