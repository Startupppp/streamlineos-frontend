# Lane 2 — QA Bug Consolidation Cutover Plan

## Overview

The QA bug lifecycle is being moved from the legacy `build.bugs` table onto the canonical work-item model: `build.tickets` (type='BUG') + `build.work_item_qa_details` sidecar.

Production has already received the expand migrations (`b-qa-bug-01` through `b-qa-bug-03`). The contract-freeze migration (`b-qa-bug-04`) awaits this application cutover completing successfully in staging.

## Migration Phases

### Phase 1: Expand (DONE — applied in production)

- `b-qa-bug-01-expand.sql`: Created `work_item_qa_details`, `bug_work_item_map`, added `linked_work_item_id` to `test_run_results`, created `uniq_tickets_org_project_id` index.
- `b-qa-bug-02-backfill.sql`: Backfilled existing bugs into `tickets` (type='BUG') + `work_item_qa_details`, populated `bug_work_item_map`, set `test_run_results.linked_work_item_id` for rows previously linked via `linked_bug_id`.
- `b-qa-bug-03-contract.sql`: Validated NOT VALID foreign keys, validated reopen_count check constraint.

### Phase 2: Application Cutover (THIS BRANCH)

All QA bug reads and writes now go through `tickets`+`work_item_qa_details`:

**`bugs.service.ts`** — fully cutover:
- `listBugs`: queries `tickets` (type='BUG') LEFT JOIN `work_item_qa_details`; filters on `qaState`/`severity` columns in sidecar
- `getBug`: same join, single row
- `createBug`: inserts into `tickets` then `work_item_qa_details` in one transaction; resolves `ticketStatus` via `resolveWorkItemStatus("new", availableStatuses)`; maps `bugPriority` to `ticketPriority` via `resolveTicketPriority`
- `updateBug`: updates `tickets` (title, description, priority, status) and `work_item_qa_details` (qaState, severity, QA fields) separately; re-resolves `ticketStatus` when `status` changes; increments `reopenCount` in sidecar on reopen
- `deleteBug`: soft-deletes the ticket; sidecar cascades

**`test-runs.service.ts`** — `createBugFromResultConsolidated`:
- Inserts into `tickets` (type='BUG') + `work_item_qa_details` (not `bugs`)
- Sets `testRunResults.linkedWorkItemId` (not `linkedBugId`)
- Audit log records `resourceType: "ticket"`, action `bug.created_from_result_consolidated`

**`test-runs.controller.ts`**:
- `POST :runId/results/:resultId/bug` now routes to `createBugFromResultConsolidated`

**`qa.ts` schema**:
- `testRuns.cycleId` added (FK to `cycles`)
- `testRunResults.linkedWorkItemId` (column `linked_work_item_id`), replaces `linkedTicketId`
- `workItemQaDetails`: composite PK `(org_id, work_item_id)`, `projectId`, `qaState` as `bugStatusEnum`, triple FK `(org_id, project_id, work_item_id)` → `tickets`
- `bugWorkItemMap`: composite PK `(org_id, bug_id)`, `workItemId`, `ticketNumber`, `migrationBatch`, `migratedAt`

**Response contract (`qa-response.schemas.ts`)**:
- `bugRowSchema` now reflects ticket+sidecar shape: `ticketNumber`, `type: 'BUG'`, `status` (resolved name), `priority` (UPPER), `qaState`, `severity`, QA narrative fields
- `testRunResultRowSchema` adds `linkedWorkItemId` alongside `linkedBugId`

### Phase 3: Contract Freeze — BLOCKED

`b-qa-bug-04-contract-freeze.sql` REVOKEs INSERT/UPDATE/DELETE on `build.bugs` from `streamline_app`. After this, any legacy writer that slips through errors at the DB layer. This migration is destructive and irreversible without a follow-on GRANT.

**Agent 3 review 2026-09-22: BLOCKED. Unmet preconditions:**

1. Staging validation not confirmed — `pnpm exec jest src/modules/build/qa/phase-2` (57 tests) has not been reported as passing.
2. Staging end-to-end checks (POST /build/:projectId/bugs, GET response shape, test-run bug creation) not confirmed.
3. `build.bugs` write count must reach zero and be observed over a monitoring window before the REVOKE is safe. Not verified.
4. P0-PRODUCTION-EXECUTION-2026-09-22.md explicitly records: "The write freeze and destructive contract drop did not run."

Do not apply `b-qa-bug-04-contract-freeze.sql` until all four items above are confirmed.

## Status Mapping

Bug statuses map to ticket state groups as follows:

| Bug Status    | State Group | Rationale                          |
|---------------|-------------|------------------------------------|
| new           | backlog     | unfiled, no triage yet             |
| triaged       | unstarted   | acknowledged, not assigned         |
| assigned      | unstarted   | assigned but not started           |
| in_progress   | started     | active work                        |
| fixed         | started     | fix applied, QA not yet confirmed  |
| ready_for_qa  | started     | awaiting QA verification           |
| verified      | completed   | QA confirmed fix                   |
| reopened      | started     | regression — back in flight        |
| closed        | completed   | resolved/won't-fix                 |

The resolved `tickets.status` is the name of the first `project_statuses` row in the mapped state group (falling back through `STATE_GROUP_FALLBACK_CHAIN` if no match).

## Identity Reconciliation

`bug_work_item_map` is the canonical identity ledger:
- `(org_id, bug_id)` → legacy surrogate key
- `legacy_bug_number` → original per-project bug counter
- `work_item_id` → canonical ticket id
- `ticket_number` → new per-project ticket counter

Consumers that hold a legacy `bugId` can look up the canonical `work_item_id` via `bug_work_item_map`.

## Test-Run Failure Evidence Link

Legacy path: `test_run_results.linked_bug_id` → `build.bugs.id`
New path: `test_run_results.linked_work_item_id` → `build.tickets.id`

Both columns coexist during transition. The backfill (b-qa-bug-02) copied `linked_bug_id` values into `linked_work_item_id` for existing rows. New rows set only `linked_work_item_id`.

## Rollback

If `b-qa-bug-04` has NOT been applied, rollback consists of reverting `bugs.service.ts` to read/write `build.bugs`, and reverting `test-runs.controller.ts` to call `createBugFromResult`. The `bugs` table retains all data until `b-qa-bug-04` fires.

After `b-qa-bug-04` is applied, rollback requires a migration reversal (GRANT back the privileges).

## Validation Checklist

- [ ] `pnpm exec jest src/modules/build/qa/phase-2` passes all 57 tests
- [ ] Staging: POST /build/:projectId/bugs creates a ticket row, not a bugs row
- [ ] Staging: GET /build/:projectId/bugs returns `ticketNumber` and `qaState` fields
- [ ] Staging: POST /build/:projectId/test-runs/:runId/results/:resultId/bug sets `linked_work_item_id` on result row
- [ ] `build.bugs` write count drops to zero (measure before applying b-qa-bug-04)
- [ ] Apply `b-qa-bug-04-contract-freeze.sql` after zero-write period
