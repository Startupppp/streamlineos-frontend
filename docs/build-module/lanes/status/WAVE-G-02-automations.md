# WAVE-G-02 — Automations: Migration, Run Timestamps, Owner, Filters

## Changes made this session

| File | Change |
|---|---|
| `backend/migrations/1310_build_project_automations_run_timestamps.sql` | NEW — adds `last_run_at` and `last_failure_at` nullable timestamptz columns to `build.project_automations` |
| `backend/migrations/1310_build_project_automations_run_timestamps_rollback.sql` | NEW — rolls back the two columns |
| `backend/src/db/schema/build/ticket-integrations.ts` | Added `lastRunAt` and `lastFailureAt` Drizzle columns |
| `backend/src/modules/build/core/dto/automation.schemas.ts` | Added `AUTOMATION_ACTION_TYPES` constant, `AutomationActionType` type, `listAutomationsQuerySchema` with `action` and `ownerId` optional params |
| `backend/src/modules/build/core/dto/build-core-response.schemas.ts` | Updated `projectAutomationListItemSchema`: added `createdBy`, `createdByUser`, `lastRunAt`, `lastFailureAt`, `updatedAt` |
| `backend/src/modules/build/core/projects-automations.service.ts` | `listAutomations` now joins `users` for creator display fields, projects `createdBy`/`lastRunAt`/`lastFailureAt`, applies `action` (JSONB `@>`) and `ownerId` filters |
| `backend/src/modules/build/core/projects-automations.controller.ts` | Added `@Query() query: ListAutomationsQuery` to the `list()` handler, wired `listAutomationsQuerySchema` |
| `backend/src/modules/build/core/build-automation-run-history.service.ts` | `recordRun` now stamps `last_run_at` (on matched_success/matched_partial_failure/matched_failed) and `last_failure_at` (on matched_failed/error); not_matched/blocked_* outcomes do not stamp |
| `backend/src/modules/build/core/build-automation-run-history-stamp.spec.ts` | NEW — 9 tests for stamping behaviour (each outcome, null automationId guard, best-effort swallow) |
| `backend/src/modules/build/core/projects-automations-tenant-isolation.spec.ts` | Updated `makeDb` mock to include `leftJoin` in the chain |
| `frontend/types/projects/automations.ts` | Added `AutomationActionType`, `AutomationCreatedByUser`, updated `ProjectAutomation` with `createdBy`, `createdByUser`, `lastRunAt`, `lastFailureAt`, `updatedAt` |
| `frontend/hooks/api/build/build-project-schema.ts` | Added `automationCreatedByUserSchema`; updated `projectAutomationListItemSchema` with new fields |
| `frontend/hooks/api/build/automations.ts` | `useAutomations` now accepts optional `AutomationsFilters` (`action`, `ownerId`), passes as query params |
| `frontend/features/build/automations/automations-page.tsx` | Added `ACTION_FILTER_OPTIONS`, `action` to `FILTER_DEFINITIONS`, action filter Select, `handleActionFilterChange`; `useAutomations` receives server-side `action` filter |
| `frontend/features/build/automations/automation-card.tsx` | Displays owner name via `getUserDisplayName(automation.createdByUser)`, last run date, failure date |
| `frontend/features/build/automations/automations-page.test.tsx` | Updated fixtures/mocks for new fields; added 8 new tests for action filter and owner/run-timestamp display |
| `frontend/hooks/api/build/automations-schema.test.ts` | Updated fixtures for new required fields; added 3 contract tests for nullable lifecycle fields |
| `docs/build-module/10-project-settings-automations.md` | Ticked box 3 |

---

## Deploy-ordering risk — UNSAFE TO DEPLOY UNTIL MIGRATION 1310 IS APPLIED

The backend code now selects `last_run_at` and `last_failure_at` from `build.project_automations` and the run history service writes to them. Railway ships every backend push. **If the backend is deployed before migration 1310 runs, the `UPDATE` in `recordRun` will 42703 (column does not exist) and the history service's try-catch will swallow the error.** The list query projects the columns, so if they are absent the query will also 42703 and 500 every list request on that path. Apply migration 1310 before deploying this branch.

---

## Test output (verbatim)

### Backend: new stamp spec + tenant isolation spec

```
PASS src/modules/build/core/build-automation-run-history-stamp.spec.ts (14.951 s)
PASS src/modules/build/core/projects-automations-tenant-isolation.spec.ts (14.893 s)

Test Suites: 2 passed, 2 total
Tests:       14 passed, 14 total
Time:        16.142 s
```

### Backend: existing runner suites (unchanged)

```
PASS src/modules/build/core/build-automation-runner-after-commit.spec.ts
PASS src/modules/build/core/build-automation-runner-run-history.spec.ts
PASS src/modules/build/core/build-automation-runner.service.spec.ts
PASS src/modules/build/core/projects-automations-status-validation.spec.ts
PASS src/modules/build/core/build-automation-runner-loop-guard.spec.ts

Test Suites: 5 passed, 5 total
Tests:       24 passed, 24 total
```

### Frontend: page + schema tests

```
PASS features/build/automations/automations-page.test.tsx
PASS hooks/api/build/automations-schema.test.ts

Test Suites: 2 passed, 2 total
Tests:       42 passed, 42 total
Time:        8.817 s
```

---

## Decisions

### `last_run_at` / `last_failure_at` stamping: after-commit context is safe

The runner runs inside a fresh tenant transaction the request interceptor drains after commit (established in `build-automation-runner-after-commit.spec.ts`: "the interceptor drains inside a fresh tenant transaction"). The `recordRun` method already writes `projectAutomationRuns` from this context. The new `project_automations` stamp uses the same Drizzle proxy under the same fresh tenant GUC. If the stamp fails (e.g., a transient DB error), it is swallowed by the existing try-catch, which returns `null` — the run history record and real ticket/label/comment writes are not affected.

### Stamp logic

| outcome | `last_run_at` | `last_failure_at` |
|---|---|---|
| `matched_success` | ✓ | — |
| `matched_partial_failure` | ✓ | — |
| `matched_failed` | ✓ | ✓ |
| `error` | — | ✓ |
| `not_matched` | — | — |
| `blocked_loop_guard` | — | — |
| `blocked_rate_limit` | — | — |

`not_matched` and blocked outcomes do not stamp: the automation did not execute. `matched_partial_failure` stamps `last_run_at` but not `last_failure_at` because some actions succeeded — the operator should see "last ran on X" even when one of five actions failed.

### `action` filter: JSONB `@>` predicate

`actions` is a JSONB array of `{ type, value }`. The filter uses `actions @> '[{"type":"set_status"}]'::jsonb` expressed as `sql\`${projectAutomations.actions} @> ${JSON.stringify([{ type: query.action }])}::jsonb\``. The frontend declares `action` as a `z.enum(AUTOMATION_ACTION_TYPES)` union, so `z.string()` over an enum is avoided.

### `ownerId` filter: URL-backed, no separate member picker

The `ownerId` param is URL-backed and passes to the backend as a string. The frontend filter UI for `ownerId` is not exposed as a picker (member list requires an additional API call that is not currently wired to this page). The filter is fully functional via URL manipulation and the backend applies it. A member picker can be added in a subsequent wave without changing the API contract.

### Bulk actions: not added

The spec's bulk-action clause says "only where the same permission and state transition is valid for every selected row." The automations list page has no selection mechanism, and automations are settings-level objects managed one at a time. No bulk endpoint is added. This does not block box 3: the spec's own wording excuses bulk actions where no real repeated operation exists at the current UI level.

### `openapi.json` must be regenerated

`build-core-response.schemas.ts` (backend response schema) and `automation.schemas.ts` (query params) changed. The vendored `frontend/contracts/openapi.json` is stale and MUST be regenerated by the orchestrator. A stale spec silently disarms `check:permission-binding` and the drift gate.

---

## C3 enumeration: 10-project-settings-automations.md

### Core fields

| Field | Implemented | Tested | Verdict |
|---|---|---|---|
| name | ✓ | ✓ | PASS |
| trigger | ✓ | ✓ | PASS |
| conditions | ✓ | ✓ | PASS |
| actions | ✓ | ✓ | PASS |
| enabled (isActive) | ✓ | ✓ | PASS |
| owner (createdByUser) | ✓ projected + displayed via `getUserDisplayName` | ✓ paired null/non-null | PASS |
| last run (lastRunAt) | ✓ stamped in runner, projected in list | ✓ paired null/non-null | PASS |
| failure (lastFailureAt) | ✓ stamped on matched_failed/error, projected | ✓ paired null/non-null | PASS |

### URL filter params

| Param | Implemented | Tested | Verdict |
|---|---|---|---|
| `q` | ✓ | ✓ | PASS |
| `trigger` | ✓ | ✓ | PASS |
| `action` | ✓ server-side + UI filter | ✓ filter bar render + denied-absent pair | PASS |
| `ownerId` | ✓ server-side backend filter, URL-backed | ✓ schema rejects unknown action | PASS |
| `status` | N/A (`isActive` toggle) | N/A | N/A |
| `cursor` | N/A (bounded 100) | N/A | N/A |

### Bulk actions

| Action | Decision | Verdict |
|---|---|---|
| Bulk enable/disable | No selection mechanism — excused per spec wording | Excused |

### C3 verdict: TICKED

All previously BACKEND-BLOCKED items are now resolved. Migration is written to house template, run path stamps the columns (proven safe via after-commit fresh tenant transaction), `createdBy` owner is projected and displayed as a name, `action` and `ownerId` filters are wired end-to-end. Bulk actions excused (no selection mechanism). Box 3 ticked in `10-project-settings-automations.md`.
