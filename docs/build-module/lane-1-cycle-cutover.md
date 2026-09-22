# Lane 1: Cycle Canonical Iteration Identity — Cutover Plan

## Production State (as of 2026-09-22)

Five-phase migration plan. Phases 01–03 already ran in production per `docs/build-module/P0-PRODUCTION-EXECUTION-2026-09-22.md`.

| Phase | File | Status |
|-------|------|--------|
| 01 — expand | `a-sprint-cycle-01-expand.sql` | DONE — added `legacy_sprint_id`, `goal`, `deleted_at` to `cycles`; added `cycle_id` to `project_meetings`, `test_runs`, `sprint_scope_events` |
| 02 — backfill | `a-sprint-cycle-02-backfill.sql` | DONE — `sprint_cycle_migration_map` populated, `cycles.legacy_sprint_id` backfilled for all 4 legacy sprints |
| 03 — constrain | `a-sprint-cycle-03-constrain.sql` | DONE |
| 04 — detach | `a-sprint-cycle-04-detach.sql` | BLOCKED — drops `sprint_id` from 4 tables; precondition guard refuses if ticket bindings not archived |
| 05 — drop | `a-sprint-cycle-05-drop.sql` | BLOCKED — drops `sprints` table entirely |

---

## Dual-identity schema (must stay until phase 05 lands)

`build.tickets` carries both columns:
- `sprint_id integer FK → build.sprints ON DELETE SET NULL`
- `cycle_id integer FK → build.cycles ON DELETE SET NULL`

The tripwire tests in `sprint-cycle-consolidation.spec.ts` assert both columns and both FK names are present until phase 05 removes them. Do not remove either column from Drizzle schema until phase 05 SQL is applied and the tripwires are deliberately retired.

---

## What was delivered in this sprint closure

### 1. `SprintsService.createSprint` is frozen (HTTP 410)

`sprints.service.ts` — `createSprint` now throws `GoneException` with message:
`"Sprint creation is frozen. Create a Cycle via POST /build/:projectId/cycles to start a new iteration."`

Verified by `sprint-create-frozen.spec.ts` (5 mutation-proof tests: removing the freeze makes 3 fail).

The only production caller is `iterations.controller.ts:89` which just forwards the response to the HTTP client. No caller expects a successful return value.

### 2. Cycle contract tests added to frontend

`execution-schema.test.ts` — 4 new tests pin `cycleRowContract` and `cycleListContract`.

### 3. `build-sprint-completed-consumer` switched to `tickets.cycleId`

- Looks up `cycles.legacySprintId = sprintId` to resolve the cycle.
- Queries `eq(tickets.cycleId, cycleId)` for assignees.
- If no cycle mapping found: marks event SKIPPED and logs a warning.

### 4. `build-due-sweep` switched to `cycles` + `tickets.cycleId`

- Queries `cycles` where `status = 'active'` and `endDate = current_date + 1`.
- Queries `inArray(tickets.cycleId, endingIds)` for open-ticket owners.
- Notification key stays `build.sprint.ending` (backward compat with templates).
- Entity type changed to `"cycle"`, link changed to `/build/:projectId/cycles`.

### 5. AI tool `moveTicketToSprint` renamed to `moveToCycle`

- Tool key: `moveToCycle`, confirms: `ticket.moveToCycle`.
- Looks up cycles by name, proposes `{ cycleId, cycleName }` payload.
- Import changed from `sprints` to `cycles`.

### 6. Backlog bulk-assign switched to `cycleId`

- `project-backlog-page.tsx:172` — `handleBulkSprint` now passes `{ cycleId: ... }`.
- `ticket-create-rank-mutations.ts` — `BulkUpdateTicketsInput` gains `cycleId?: number | null`; `toTicketUpdateInput` forwards it.

### 7. Schema: `cycles.legacySprintId` added to Drizzle

`core.ts` — `legacySprintId: integer("legacy_sprint_id")` plus FK `fk_cycles_org_legacy_sprint`. This column was already in the DB from phase 01 but was missing from the Drizzle schema.

### 8. Schema: `meetings.cycleId` added to Drizzle

`meetings.ts` — `cycleId: integer("cycle_id")` plus FK `fk_project_meetings_org_cycle` and index `idx_project_meetings_cycle`. Original `sprintId` and `fk_project_meetings_org_sprint` are kept (tripwire requires them until phase 05).

### 9. Headline invariant test

`sprint-cycle-detach-invariant.spec.ts` — 9 tests asserting the owned execution paths (`build-sprint-completed-consumer`, `build-due-sweep`, `work-actions-tools`) no longer reference `tickets.sprintId` and do reference `tickets.cycleId`. Mutation-proof: reverting any cutover change makes a `not.toContain` assertion fail.

---

## Phase 04 precondition gate — critical safety note

**The DO-block guard in `a-sprint-cycle-04-detach.sql` is a DATA check only.** It inspects whether each `tickets.sprint_id` value has been archived in `sprint_binding_archive`. It has zero visibility into application code. If any service still SELECTs `tickets.sprint_id` when phase 04 runs, the migration succeeds, the column disappears, and that service starts raising **42703 (undefined_column) on live traffic** with no warning.

The application-layer code cutover in this document is the ONLY thing standing between phase 04 and a production outage.

| Item | File | Status |
|------|------|--------|
| `sprint_scope_events.cycle_id` — already populated by phase 01 | DB | DONE |
| `test_runs.sprint_id` cleared / cutover | Agent 2 scope | PENDING |
| Archive existing ticket sprint bindings (run phase 04 migration) | Coordinator / migration author | PENDING |

**Agent 3 review 2026-09-22: Phases 04 and 05 are BLOCKED.** Both PENDING items above are unmet. The DO-block guard in `a-sprint-cycle-04-detach.sql` is a data check only; the application-layer cutover (`test_runs.sprint_id` and ticket binding archive) must complete first. Phase 05 cannot run until phase 04 succeeds. Default is BLOCKED; do not proceed to phase 04 unless both PENDING rows above are confirmed DONE.

---

## Remaining `tickets.sprintId` references

After all application-layer cutover is complete, no non-schema source file will reference `tickets.sprintId`. The invariant spec (`sprint-cycle-detach-invariant.spec.ts`) enforces this with an empty allowlist — any new violation fails the gate immediately.

---

## Rollback

To reverse the application cutover only (no DB changes required):
1. Revert `SprintsService.createSprint` freeze (restore insert logic).
2. Revert the five consumer/sweep/tools/backlog edits.
3. No migration rollback needed — phases 01–03 changes are additive.
