# Wave-B-05 Automations — Session Status

Page: `docs/build-module/10-project-settings-automations.md`
Route: `/build/[projectId]/settings/automations`

## Acceptance Criteria

| # | Criterion | Status | Notes |
|---|---|---|---|
| C1 | Canonical route implemented, redirects covered | [x] (pre-existing) | Route file and `AutomationsPage` wired correctly |
| C2 | Page satisfies user job without duplicating another module | [x] (pre-existing) | Automation config scoped to project settings |
| C3 | Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission implemented and tested | [ ] | Partial — see C3 table below |
| C4 | Lists bounded/virtualized at 10k items | [x] (pre-existing) | Array is bounded, automations are few per project |
| C5 | Contract tests for schemas, cache keys, cursor semantics | [x] (pre-existing + extended) | 11 contract tests pass |
| C6 | Keyboard/screen-reader/reduced-motion/375px checks | [ ] | Orchestrator-only — not touched |
| C7 | Production browser evidence | [ ] | Orchestrator-only — not touched |

C3 is **not ticked** because two row categories remain open (see blocked rows below).

---

## C3 Row-by-Row Table

### Core fields

| Field | Implemented | Tested | Notes |
|---|---|---|---|
| name | Yes | Yes (contract + UI tests) | Form field + card display |
| trigger | Yes | Yes (filter test) | `TRIGGER_EVENTS` enum, URL-backed filter |
| conditions | Yes | Yes (contract) | Up to 50 conditions per rule |
| actions | Yes | Yes (contract + enum test) | 5 action types, enum-validated |
| enabled/isActive | Yes | Yes (toggle test) | Switch on card, form toggle |
| owner (createdBy) | Display missing | No | `createdBy` in row schema but not shown on card — blocked (no schema column in list item schema) |
| last run | Not implemented | No | **BLOCKED** — no `lastRunAt` column in `projectAutomationListItemSchema`; would require DB migration |
| failure | Not implemented | No | **BLOCKED** — no `lastFailureAt`/`lastError` column; requires migration |

### Actions (page-level)

| Action | Implemented | Tested |
|---|---|---|
| Create automation | Yes | Yes (permission gate tests) |
| Edit automation | Yes | Yes (opens sheet with pre-filled form) |
| Toggle enable/disable | Yes | Yes (card switch) |
| Delete automation | Yes | Yes (ConfirmDialog wraps delete) |

### Overlays

| Overlay | Implemented | Tested |
|---|---|---|
| AutomationSheet (create/edit) | Yes | Yes (mock in page tests) |
| ConfirmDialog (delete) | Yes | Yes (in card) |

### URL query parameters

| Param | Implemented | Tested |
|---|---|---|
| `q` (search) | Yes | Yes (BLD-X-FE-SETTINGS-004c) |
| `trigger` (filter) | Yes | Yes (BLD-X-FE-SETTINGS-004d) |
| `status` | N/A | N/A | Automations have `isActive` toggle, not a multi-status filter |
| `action` | Not implemented | No | Backend list endpoint has no action-type filter; deferred |
| `ownerId` | Not implemented | No | Backend list endpoint has no owner filter; deferred |
| `cursor` | N/A | N/A | List is bounded/non-paginated |

### Bulk actions

| Action | Implemented | Notes |
|---|---|---|
| Bulk assign/archive/export | Not implemented | **BLOCKED** — backend exposes no bulk automation endpoints; no `DELETE /build/{projectId}/automations` or similar |

### Keyboard shortcuts

| Shortcut | Implemented | Tested |
|---|---|---|
| `/` focus search | Yes | Via `useBuildListKeyboard` (hook has own tests) |
| `c` create | Yes (when `canManage`) | Via `useBuildListKeyboard` |
| `j/k` navigate | Yes | Via `useBuildListKeyboard` |
| `Enter` open/edit | Yes | Via `useBuildListKeyboard` |
| `e` edit focused | Yes | Via `useBuildListKeyboard` |
| `Esc` clear/close | Yes | Via `useBuildListKeyboard` |
| `?` shortcut help | Not implemented | No `ShortcutHelpDialog` exists repo-wide for automations; deferred |

### States

| State | Implemented | Tested |
|---|---|---|
| Loading (skeleton) | Yes — `PageState loading` | Yes (BLD-X-FE-SETTINGS-002a) |
| Error | Yes — `PageState error` with `onRetry` | Yes (BLD-X-FE-SETTINGS-002c) |
| Permission denied | Yes — `PageState denied` → `DeniedView` | Yes (BLD-X-FE-SETTINGS-002b) |
| Module disabled / plan gated | Yes — `PageState` handles 402 → `DeniedView` | Covered by `pageStateFromError` |
| First-run empty | Yes — `EmptyState` + Create action | Yes (BLD-X-FE-SETTINGS-003a, 003c) |
| Filtered-empty | Yes — `EmptyState` + Clear filters | Yes (BLD-X-FE-SETTINGS-003b, 003d) |
| Populated | Yes — stats + list | Yes (BLD-X-FE-SETTINGS-005) |

### Permissions

| Standing | View gated | Create gated | Edit gated | Delete gated |
|---|---|---|---|---|
| `build:view` | Yes (`usePageState`) | N/A | N/A | N/A |
| `build:manage` | N/A | Yes (`useCan`) | Yes (`canManage` prop) | Yes (`canManage` prop) |

---

## C3 Not Ticked Because

Two categories remain open:
1. **Last run / failure fields** — core spec fields with no corresponding columns in the list schema; require a migration to `project_automations` table.
2. **Bulk actions** — no backend bulk endpoint; all five bulk variants require new backend work.
3. **`action`/`ownerId` URL filters** — backend list has no filter params for these; deferred to backend work.

---

## Four Established Issues — Verdicts

### 1. After-commit hooks have no tenant context
**VERDICT: FIXED.** `BuildAutomationRunnerService.runForTicketEvent` uses `registerAfterCommit` (line 286 of runner service). When no ambient context exists (background sweeps), it runs inline. The after-commit spec (`build-automation-runner-after-commit.spec.ts`) verifies: (a) DB is not touched while the request transaction is open, (b) the hook runs correctly after commit drains, (c) inline fallback works. All 3 tests pass.

### 2. Event ledger defeats its own retry
**VERDICT: NOT APPLICABLE.** The automation runner does NOT use the event ledger. It uses `registerAfterCommit` directly for deferred execution and records outcomes in `automationRunHistory`. There is no retry mechanism — failed actions are recorded in history (`outcome: "matched_partial_failure"` or `"matched_failed"`) but not retried. This is a design gap (a transient DB error on an action permanently marks the run as failed) but does not match the "event ledger defeats retry" pattern.

### 3. Approval adapters need approver routing at CREATE time
**VERDICT: NOT APPLICABLE.** None of the 5 automation action types (`set_status`, `set_assignee`, `set_priority`, `add_label`, `add_comment`) creates an approval. Automations cannot trigger the approval flow.

### 4. Confirmable AI actions never worked in production
**VERDICT: NOT APPLICABLE.** No automation action type is AI-driven or requires user confirmation. The `add_comment` action inserts a static string, not an AI-generated comment. There is no AI action type in the automation system.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/types/projects/automations.ts` | Added `AutomationTriggerEvent` union type; `ProjectAutomation.triggerEvent` now uses it instead of `string` |
| `frontend/hooks/api/build/build-project-schema.ts` | Fixed `triggerEvent: z.string()` → `z.enum([...])` in both `projectAutomationListItemSchema` and `projectAutomationRowSchema` |
| `frontend/hooks/api/build/automations-schema.test.ts` | Added test: rejects unknown `triggerEvent` value (enum gate test) |
| `frontend/features/build/automations/automations-page.tsx` | Full rewrite: added `PageState`/`usePageState`, URL-backed `q`+`trigger` filters via `useBuildListFilters`, keyboard shortcuts via `useBuildListKeyboard`, `SearchInput`, trigger filter dropdown, first-run vs filtered-empty distinction, `error` passed to `usePageState` (FE-41) |
| `frontend/features/build/automations/automations-page.test.tsx` | Expanded from 3 → 16 tests covering: access states, empty state distinction, filter bar behavior, populated state |

---

## Test Commands Run

```
# Frontend page tests (16/16 pass)
cd frontend && npx jest --runTestsByPath "features/build/automations/automations-page.test.tsx" --no-coverage

# Frontend schema contract tests (11/11 pass)
cd frontend && npx jest --runTestsByPath "hooks/api/build/automations-schema.test.ts" --no-coverage

# Backend automation runner tests (24/24 pass)
cd backend && npx jest "src/modules/build/core/build-automation" --no-coverage
```

---

## Filed Requests

See `docs/build-module/lanes/requests/WAVE-B-05.md`.
