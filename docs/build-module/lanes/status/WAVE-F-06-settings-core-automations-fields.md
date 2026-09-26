# WAVE-F-06 — Settings Core, Automations, Fields: C3 Audit

Pages:
- `docs/build-module/10-project-settings.md` (route `/build/[projectId]/settings`)
- `docs/build-module/10-project-settings-automations.md` (route `/build/[projectId]/settings/automations`)
- `docs/build-module/10-project-settings-fields.md` (route `/build/[projectId]/settings/fields`)

---

## Changes made this session

| File | Change |
|---|---|
| `frontend/features/build/settings/project-settings-page.tsx` | Added `useOnlineStatus` import and hook call; added offline banner in ready content (inside `{project && ...}` block) |
| `frontend/features/build/automations/automations-page.tsx` | Added `useOnlineStatus` import and hook call; modified `emptyContent` to show "You are offline" when `!isOnline` |
| `frontend/features/build/settings/project-settings-fields-page.tsx` | Added `useOnlineStatus` import and hook call; added offline banner before `PmPanel` in ready content |
| `frontend/features/build/settings/project-settings-page-states.test.tsx` | Added `useOnlineStatus` mock; added 2 offline tests (present when offline, absent when online) |
| `frontend/features/build/automations/automations-page.test.tsx` | Added `useOnlineStatus` mock; added 2 offline tests (empty state shows "You are offline" when offline) |
| `frontend/features/build/settings/project-settings-fields-page.test.tsx` | Added `useOnlineStatus` mock; added 2 offline tests (banner present when offline, absent when online) |

---

## Test output (verbatim)

```
Test Suites: 6 passed, 6 total
Tests:       104 passed, 104 total
Snapshots:   0 total
Time:        7.808 s
```

Suites: `project-settings-page-states.test.tsx`, `project-settings-section.test.tsx`,
`project-settings-fields-page.test.tsx`, `custom-fields-settings.test.tsx`,
`automations-page.test.tsx`, `use-build-list-keyboard.test.ts`

---

## Backend automations claims — verified

Route controller: `backend/src/modules/build/core/projects-automations.controller.ts`
Service: `backend/src/modules/build/core/projects-automations.service.ts`
Schema: `backend/src/db/schema/build/ticket-integrations.ts:69`

Route paths:
- `GET /build/:projectId/automations` — list (no query filter params)
- `GET /build/:projectId/automations/runs` — run history (cursor-paginated, `automationId?/limit/cursor`)
- `POST /build/:projectId/automations` — create
- `PATCH /build/:projectId/automations/:automationId` — update
- `DELETE /build/:projectId/automations/:automationId` — delete

Verified claims:
- `lastRunAt` and `lastFailureAt`: **NOT in `project_automations` schema** — confirmed. The table has only `createdAt` and `updatedAt`. Run history lives in the separate `automation_runs` table, accessible via `GET .../automations/runs`, but the list endpoint projects no run-time fields.
- `action` filter: **NOT supported** — `listAutomations` takes no query params; the controller's `list()` handler accepts only `projectId` as a param, no `@Query()` for filters.
- `ownerId` filter: **NOT supported** — same reason.
- Bulk endpoint: **absent** — no `POST/PATCH .../automations/bulk` handler in the controller.
- `createdBy`: **in schema** (`created_by text, references users`) but **not projected** — the `SELECT` in `listAutomations` omits it. The frontend contract cannot expose it.

---

## Search URL param — per-page analysis

### Settings page (`/build/[projectId]/settings`)

Spec URL state: `section and search`.

The settings page renders six named sections (General, Labels, Statuses, Custom Fields, Teams, Danger Zone) accessible via a side navigation. There is no searchable list of items — each section contains a form or a sub-settings component. The `section` URL param is fully implemented (`isSectionId` guard, `router.replace` on click). The `search` param has no implementable target: there are no rows to filter and no `SearchInput` on this page. Per the same logic CCG-4 applies to shortcuts (a shortcut whose target does not exist is not required), this URL param is not required. It is not a C3 blocker.

### Fields page (`/build/[projectId]/settings/fields`)

Spec URL state: `section and search`.

The fields page renders a custom-fields list. The `search` param is implemented as `q` (the codebase standard, same as all other list pages) via `useBuildListFilters({ withSearch: true })`, URL-backed, debounced 300 ms, resets cursor on change. The `section` param is not independently managed by this page — it belongs to the parent settings URL. **PASS.**

### Automations page (`/build/[projectId]/settings/automations`)

Spec URL state: `status, trigger, action, ownerId, q, cursor`.

- `q`: implemented via `useBuildListFilters`, URL-backed, debounced. **PASS.**
- `trigger`: implemented via `useBuildListFilters` + `Select`, URL-backed. **PASS.**
- `status`: N/A — automations use an `isActive` boolean toggle, not a lifecycle status. The `status` param is a template artifact here.
- `action`: backend list endpoint accepts no filter params; cannot be implemented until the backend adds it. **BACKEND-BLOCKED.**
- `ownerId`: same reason. **BACKEND-BLOCKED.**
- `cursor`: N/A — bounded list (100 rows, no pagination needed).

---

## C3 enumeration: 10-project-settings.md

Route: `/build/[projectId]/settings`

### URL state

| Param | Implemented | Tested | Verdict |
|---|---|---|---|
| `section` | ✓ `isSectionId` guard + `router.replace` | ✓ section round-trip tests | PASS |
| `search` | no target (form page) | N/A | Not required — no searchable list |

### Core fields (sections)

| Section | Implemented | Tested | Verdict |
|---|---|---|---|
| General (name/description/status/members) | ✓ `ProjectInfoSection` | ✓ section + save tests | PASS |
| Labels | ✓ `LabelsSettings` | ✓ labels-settings.test.tsx | PASS |
| Statuses | ✓ `StatusesSettings` | owned by Wave-B-02 | PASS |
| Custom Fields | ✓ `CustomFieldsSettings` | ✓ custom-fields-settings.test.tsx | PASS |
| Teams | ✓ `TeamRosterSection` | no dedicated unit test | PARTIAL |
| Danger Zone | ✓ `DangerZoneSection` | ✓ owner gate +/- | PASS |

### Actions

| Action | Implemented | Tested | Verdict |
|---|---|---|---|
| Save settings | ✓ `useUpdateProject` | ✓ saves + toast | PASS |
| Create/edit/delete labels | ✓ | ✓ labels tests | PASS |
| Create/edit/delete custom fields | ✓ | ✓ custom-fields tests | PASS |
| Delete project | ✓ `DangerZoneSection` | ✓ owner gate | PASS |

### Overlays

| Overlay | Implemented | Tested | Verdict |
|---|---|---|---|
| `ReassignDialog` (member removal) | ✓ rendered | rendered only, behavior not tested at page level | PARTIAL |
| `ConfirmDialog` (delete) | ✓ | ✓ | PASS |

### Keyboard shortcuts

| Shortcut | Target exists? | Verdict |
|---|---|---|
| `Tab` visual order | yes (always required) | browser-native, CCG-4 |
| `Esc` close overlays | yes (ReassignDialog, section overlays) | Radix-native, CCG-4 |
| `/` focus search | no search input | excused, CCG-4 |
| `c` create | no create action at page level | excused, CCG-4 |
| `j/k` navigate | no row list | excused, CCG-4 |
| `Enter` open | no row list | excused, CCG-4 |
| `e` edit | no row list | excused, CCG-4 |
| `?` shortcut help | no shortcuts to display | excused, CCG-4 |

### States

| State | Implemented | Tested | Verdict |
|---|---|---|---|
| Loading | ✓ skeleton | ✓ | PASS |
| Empty (not found) | ✓ `EmptyState` | ✓ | PASS |
| Error | ✓ `PageState` | ✓ | PASS |
| Denied | ✓ `PageState` | ✓ | PASS |
| Offline | ✓ inline banner | ✓ paired (this session) | PASS |
| Conflict | N/A (CCG-1) | N/A | N/A |

### Permissions

| Permission | Implemented | Tested | Verdict |
|---|---|---|---|
| `build:view` (page gate) | ✓ | ✓ | PASS |
| `build:delete` (danger zone) | ✓ `useCan("build:delete")` | ✓ +/- pair | PASS |
| `build:manage` (CRUD) | ✓ child components | ✓ | PASS |
| Module gate | ✓ 402 → `pageStateFromError` | covered by `usePageState` contract | PASS |

### C3 verdict: NOT TICKED

Remaining blockers:
1. `ReassignDialog` behavior (member removal + reassign flow): rendered but the reassignment workflow is not exercised at the page level. The overlay is mocked to `null` in `project-settings-page-states.test.tsx`.
2. `TeamRosterSection`: no dedicated unit test; the section renders but its behavior is untested.

All three blockers from WAVE-E-05 (search URL param, keyboard shortcuts, offline state) are now resolved or excused. The two remaining items above are the only blockers.

---

## C3 enumeration: 10-project-settings-automations.md

Route: `/build/[projectId]/settings/automations`

### URL state

| Param | Implemented | Tested | Verdict |
|---|---|---|---|
| `q` (search) | ✓ `useBuildListFilters` | ✓ filter bar test | PASS |
| `trigger` | ✓ URL-backed `Select` | ✓ filter test | PASS |
| `status` | N/A (`isActive` toggle, not lifecycle status) | N/A | N/A |
| `action` | ✗ no backend filter param | ✗ | BACKEND-BLOCKED |
| `ownerId` | ✗ no backend filter param | ✗ | BACKEND-BLOCKED |
| `cursor` | N/A (bounded 100-row list) | N/A | N/A |

### Core fields

| Field | Implemented | Tested | Verdict |
|---|---|---|---|
| name | ✓ | ✓ | PASS |
| trigger | ✓ `TRIGGER_EVENTS` enum | ✓ | PASS |
| conditions | ✓ up to 50 | ✓ contract | PASS |
| actions | ✓ 5 action types | ✓ | PASS |
| enabled (isActive) | ✓ | ✓ toggle | PASS |
| owner (createdBy) | ✗ not projected by `listAutomations` | ✗ | BACKEND-BLOCKED |
| last run (lastRunAt) | ✗ no column in schema | ✗ | BACKEND-BLOCKED |
| failure (lastFailureAt) | ✗ no column in schema | ✗ | BACKEND-BLOCKED |

### Keyboard shortcuts

| Shortcut | Target | Verdict |
|---|---|---|
| `Tab` visual order | always required | CCG-4 |
| `Esc` clear/close | `onClearSelection` → `clearAll` | ✓ |
| `/` focus search | `SearchInput` exists | ✓ hook wired |
| `c` create | `canManage` gate | ✓ hook wired |
| `j/k` navigate | automation list | ✓ hook wired |
| `Enter` open | opens edit sheet | ✓ hook wired |
| `e` edit | opens edit sheet | ✓ hook wired |
| `?` shortcut help | `ShortcutHelpDialog` | ✓ wired, tested |

### States

| State | Implemented | Tested | Verdict |
|---|---|---|---|
| Loading | ✓ skeleton | ✓ | PASS |
| Empty (first-run) | ✓ `EmptyState` | ✓ | PASS |
| Filtered-empty | ✓ `EmptyState` + clear | ✓ | PASS |
| Error | ✓ `PageState` onRetry | ✓ | PASS |
| Denied | ✓ `PageState` | ✓ | PASS |
| Offline | ✓ `EmptyState` "You are offline" | ✓ paired (this session) | PASS |
| Conflict | N/A (CCG-1) | N/A | N/A |

### Permissions

| Permission | Implemented | Tested | Verdict |
|---|---|---|---|
| `build:view` (page gate) | ✓ | ✓ | PASS |
| `build:manage` (create/edit/delete) | ✓ `useCan("build:manage")` | ✓ +/- pair | PASS |
| Module gate | ✓ via 402 | covered | PASS |

### C3 verdict: NOT TICKED

Blockers (all backend-blocked):
1. `lastRunAt` / `lastFailureAt`: not in `project_automations` schema. Requires migration.
2. `owner (createdBy)` display: `createdBy` is in the schema but not projected in `listAutomations`. Not a migration — needs the service SELECT to include it and the frontend contract to declare it.
3. `action` / `ownerId` URL filter params: backend list endpoint accepts no filter query params.
4. Bulk actions: no `POST/PATCH .../automations/bulk` endpoint.

Offline state: now implemented and tested — this blocker is removed.

---

## C3 enumeration: 10-project-settings-fields.md

Route: `/build/[projectId]/settings/fields`

### URL state

| Param | Implemented | Tested | Verdict |
|---|---|---|---|
| `q` (search, spec calls it `search`) | ✓ `useBuildListFilters({ withSearch: true })`, URL-backed, debounced 300 ms, resets cursor | ✓ itemCount filtering tests | PASS |
| `section` | N/A (page IS a settings subsection; no internal sections) | N/A | N/A |

### Core fields

| Field | Implemented | Tested | Verdict |
|---|---|---|---|
| name | ✓ | ✓ create/edit tests | PASS |
| type (9 variants) | ✓ `FIELD_TYPES` enum | ✓ schema all-9-types test | PASS |
| options (select/multi_select) | ✓ | ✓ edit pre-fill test | PASS |
| required flag | ✓ | ✓ rendered in field row | PASS |

### Actions

| Action | Implemented | Tested | Verdict |
|---|---|---|---|
| Create custom field | ✓ inline form | ✓ `build:manage` gate + form test | PASS |
| Edit custom field | ✓ `EntityFormDialog` | ✓ opens, pre-fills, submits | PASS |
| Delete custom field | ✓ `ConfirmDialog destructive` | ✓ delete button gate | PASS |

### Overlays

| Overlay | Implemented | Tested | Verdict |
|---|---|---|---|
| `EntityFormDialog` (edit) | ✓ | ✓ opens, pre-fills, submits | PASS |
| `ConfirmDialog` (delete) | ✓ | ✓ | PASS |

### Keyboard shortcuts

| Shortcut | Target | Verdict |
|---|---|---|
| `Tab` visual order | always required | CCG-4 |
| `Esc` clear | `onClearSelection` → `clearAll` | ✓ wired |
| `/` focus search | `searchInputRef` | ✓ wired |
| `c` create | `createFieldRef` | ✓ wired |
| `j/k` navigate | `filteredCount` drives hook | ✓ wired |
| `Enter` open | `handleKeyboardOpen` → `editFieldRef` | ✓ wired |
| `e` edit | `handleKeyboardOpen` | ✓ wired |
| `?` shortcut help | `ShortcutHelpDialog` | ✓ wired, tested |

### States

| State | Implemented | Tested | Verdict |
|---|---|---|---|
| Loading | ✓ `PageState loading` skeleton | ✓ | PASS |
| Empty (no custom fields) | ✓ `EmptyState` inside `CustomFieldsSettings` | ✓ | PASS |
| Filtered-empty | ✓ "No fields match" | ✓ search filtering test | PASS |
| Error | ✓ `ErrorState` inside `CustomFieldsSettings` | ✓ | PASS |
| Denied | ✓ `PageState` on `build:update` | ✓ +/- pair | PASS |
| Offline | ✓ inline banner | ✓ paired (this session) | PASS |
| Conflict | N/A (CCG-1) | N/A | N/A |

### Permissions

| Permission | Implemented | Tested | Verdict |
|---|---|---|---|
| `build:update` (page access) | ✓ `usePageState({ permission: "build:update" })` | ✓ +/- pair | PASS |
| `build:manage` (CRUD actions) | ✓ `useCan("build:manage")` in `CustomFieldsSettings` | ✓ | PASS |
| Module gate | ✓ via 402 | covered | PASS |

### C3 verdict: TICKED

The offline state was the only remaining blocker from WAVE-E-05. It is now implemented (`useOnlineStatus` hook wired, offline banner rendered when `!isOnline`) and tested with a paired assertion. All other items are implemented and tested or excused (CCG-1, CCG-4).

---

## Notes

### Offline implementation details

All three pages import `useOnlineStatus` from `frontend/hooks/common/use-online-status.ts`. The hook uses `useSyncExternalStore` over `navigator.onLine` — no PWA or service-worker dependency.

- **Settings page**: an inline `role="status"` div with "You are offline — changes will not be saved until you reconnect." rendered inside `{project && (...)}` above the nav/content flex row.
- **Automations page**: the `emptyContent` `EmptyState` title switches to "You are offline" and description to "Reconnect to see your automations." when `!isOnline`; the action button is suppressed when offline.
- **Fields page**: same `role="status"` div pattern, rendered inside the `PmSection` before the `PmPanel`.

Each page has a `describe("... offline state")` block with two tests: one that asserts the surface is present when offline, one that asserts it is absent when online. Both tests set and reset the mock in `beforeEach` to avoid cross-test contamination.

### CCG-5 correction applied

The WAVE-E-05 report incorrectly treated offline as "PWA-level infrastructure not implemented anywhere in the build module." The hook exists at `hooks/common/use-online-status.ts:22` and is consumed by at least eight build pages. This was a false absence claim. The correction is in CCG-5 and is applied here.
