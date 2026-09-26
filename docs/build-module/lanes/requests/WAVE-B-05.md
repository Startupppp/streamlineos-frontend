# Wave-B-05 Filed Requests

## R1 — Schema: add `lastRunAt` and `lastFailureAt` to automation list items

**Page:** `docs/build-module/10-project-settings-automations.md`
**C3 row:** Core fields — last run, failure
**Blocker:** `projectAutomationListItemSchema` has no `lastRunAt` or `lastFailureAt` fields. The spec names both as core display fields. The `automationRunHistory` table exists but run aggregates are not joined into the automation list query.

**Request:** Add a DB migration that adds `last_run_at TIMESTAMPTZ` and `last_failure_at TIMESTAMPTZ` (nullable) to `project_automations`, maintained by `BuildAutomationRunHistoryService` on every run. Update `ProjectsAutomationsService.listAutomations` projection and the Zod schemas in `projectAutomationListItemSchema`. Update `ProjectAutomation` TypeScript type and `AutomationCard` to display "Last run: N ago" and a failure badge.

**Migration range needed:** Any free slot above current HEAD (Wave-B-05 has no reserved range).

---

## R2 — Backend: bulk automation endpoints

**Page:** `docs/build-module/10-project-settings-automations.md`
**C3 row:** Bulk actions
**Blocker:** No `POST /build/{projectId}/automations/bulk` (or equivalent) endpoint exists. The C3 spec requires bulk assign/archive/export where the same state transition is valid for every selected row.

**Request:** Add a `PATCH /build/{projectId}/automations/bulk` endpoint that accepts `{ ids: number[], patch: { isActive?: boolean } }`, scoped to `build:manage`, tenant-isolated, returning per-record success/failure. Wire the frontend bulk action bar (already used in approvals) once the endpoint lands.

---

## R3 — Backend: `action` and `ownerId` list filters

**Page:** `docs/build-module/10-project-settings-automations.md`
**C3 row:** URL query parameters — `action`, `ownerId`
**Blocker:** `GET /build/{projectId}/automations` currently accepts no filter query params. Frontend already has URL state for `trigger` and `q` (client-side) but `action` and `ownerId` filters require server-side support to be meaningful on large lists.

**Request:** Add `actionType` and `ownerId` query params to `listAutomationRunsQuerySchema` (or the automation list endpoint) so the backend filters before returning. Frontend can then wire these as additional URL-backed filters using the existing `useBuildListFilters` pattern.

---

## R4 — `?` shortcut help overlay for automations

**Page:** `docs/build-module/10-project-settings-automations.md`
**C3 row:** Keyboard shortcuts — `?` shortcut help
**Blocker:** No shared `ShortcutHelpDialog` component exists for Build module list pages. The approvals and all-work pages also lack `?` help. Needs a shared component (second consumer promotes it to `components/shared`).

**Request:** Create a shared `ShortcutHelpDialog` component in `features/build/shared/` with a standard shortcut table (`/`, `c`, `j/k`, `Enter`, `e`, `Esc`). Wire it into `useBuildListKeyboard` as the `?` handler, then reuse across automations, approvals, and all-work pages.
