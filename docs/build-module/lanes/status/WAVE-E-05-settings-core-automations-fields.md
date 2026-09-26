# WAVE-E-05 — Settings Core, Automations, Fields: C3 Audit

Pages worked:
- `docs/build-module/10-project-settings.md` (route `/build/[projectId]/settings`)
- `docs/build-module/10-project-settings-automations.md` (route `/build/[projectId]/settings/automations`)
- `docs/build-module/10-project-settings-fields.md` (route `/build/[projectId]/settings/fields`)

---

## Changes made this session

| File | Change |
|---|---|
| `frontend/features/build/shared/use-build-list-keyboard.ts` | Added `onShortcutHelp?: () => void` option; wires `?` key to call it when provided |
| `frontend/features/build/shared/shortcut-help-dialog.tsx` | New: shared `ShortcutHelpDialog` component with standard shortcut table (filed in WAVE-B-05 R4) |
| `frontend/features/build/automations/automations-page.tsx` | Added `ShortcutHelpDialog` wiring: `shortcutHelpOpen` state, `handleShortcutHelp` callback, `onShortcutHelp` passed to `useBuildListKeyboard` |
| `frontend/features/build/settings/project-settings-fields-page.tsx` | Added `ShortcutHelpDialog` wiring: `shortcutHelpOpen` state, `handleShortcutHelp` callback, `onShortcutHelp` passed to `useBuildListKeyboard` |
| `frontend/features/build/settings/project-settings-page-states.test.tsx` | Added empty state tests (3 new); updated `PageState` mock to handle `kind: "empty"` |
| `frontend/features/build/shared/use-build-list-keyboard.test.ts` | Added 3 tests for `?` key: calls callback, no-op without callback, inert in inputs |
| `frontend/features/build/automations/automations-page.test.tsx` | Updated keyboard hook mock to capture args; added `ShortcutHelpDialog` mock; added 3 tests for `?` wiring |
| `frontend/features/build/settings/project-settings-fields-page.test.tsx` | Added `ShortcutHelpDialog` mock; added 3 tests for `?` wiring (including positive FE-122 pair) |

---

## Test output (verbatim)

```
Test Suites: 6 passed, 6 total
Tests:       98 passed, 98 total
Snapshots:   0 total
Time:        7.784 s
```

Suites: `project-settings-page-states.test.tsx`, `project-settings-section.test.tsx`,
`project-settings-fields-page.test.tsx`, `custom-fields-settings.test.tsx`,
`automations-page.test.tsx`, `use-build-list-keyboard.test.ts`

---

## C3 enumeration: 10-project-settings.md

Route: `/build/[projectId]/settings`

### URL state

| Param | Implemented | Tested | Result |
|---|---|---|---|
| `section` | ✓ URL-backed via `router.replace` | ✓ section round-trip tests | PASS |
| `search` | ✗ No search input on form | ✗ | FAIL |

### Core fields (sections)

| Field | Implemented | Tested | Result |
|---|---|---|---|
| General (name/description/status/members) | ✓ `ProjectInfoSection` | ✓ section + save tests | PASS |
| Labels | ✓ `LabelsSettings` | ✓ labels-settings.test.tsx | PASS |
| Statuses | ✓ `StatusesSettings` | owned by Wave-B-02 | PASS |
| Custom Fields | ✓ `CustomFieldsSettings` | ✓ custom-fields-settings.test.tsx | PASS |
| Teams | ✓ `TeamRosterSection` | no dedicated unit test | PARTIAL |
| Danger Zone | ✓ `DangerZoneSection` | ✓ owner gate positive+negative | PASS |

### Actions

| Action | Implemented | Tested | Result |
|---|---|---|---|
| Save settings | ✓ `useUpdateProject` | ✓ saves, stays on page | PASS |
| Create/edit/delete labels | ✓ | ✓ labels tests | PASS |
| Create/edit/delete custom fields | ✓ | ✓ custom-fields tests | PASS |
| Delete project | ✓ | ✓ danger zone owner gate | PASS |

### Overlays

| Overlay | Implemented | Tested | Result |
|---|---|---|---|
| `ReassignDialog` (member removal) | ✓ | rendered, not behavior-tested | PARTIAL |
| `ConfirmDialog` (delete) | ✓ | ✓ | PASS |

### Keyboard shortcuts

| Shortcut | Implemented | Tested | Result |
|---|---|---|---|
| `/` focus search | ✗ no search input on form | ✗ | FAIL |
| `c` create | ✗ inapplicable (section-nav form) | ✗ | FAIL |
| `j/k` navigate | ✗ inapplicable (no row list) | ✗ | FAIL |
| `Enter` open | ✗ inapplicable | ✗ | FAIL |
| `e` edit | ✗ inapplicable | ✗ | FAIL |
| `Esc` close/clear | Partial (browser native in dialogs) | ✗ | FAIL |
| `?` shortcut help | ✗ | ✗ | FAIL |

### States

| State | Implemented | Tested | Result |
|---|---|---|---|
| Loading | ✓ skeleton | ✓ page-states test | PASS |
| Empty (project not found) | ✓ `EmptyState` | ✓ new tests (this session) | PASS |
| Error | ✓ `PageState` | ✓ page-states test | PASS |
| Denied | ✓ `PageState` | ✓ page-states test | PASS |
| Offline | ✗ shared PWA infra | ✗ | FAIL |
| Conflict | N/A (CCG-1) | N/A | N/A |

### Permissions

| Permission | Implemented | Tested | Result |
|---|---|---|---|
| `build:view` (page gate) | ✓ `usePageState` | ✓ page-states test | PASS |
| `build:delete` (danger zone) | ✓ `useCan("build:delete")` | ✓ owner gate +/- pair | PASS |
| `build:manage` (CRUD) | ✓ in child components | ✓ labels/custom-fields tests | PASS |
| Module gate (when module enabled) | Handled via 402 → `pageStateFromError` | Covered by `usePageState` contract | PASS |

### C3 verdict: NOT TICKED

Blockers:
1. `search` URL param: not implemented. This page is a section-navigation form without a searchable list; the item is a spec template element that does not map to a meaningful implementation here. See WAVE-B-01 request 1.
2. Keyboard shortcuts `/`, `c`, `j/k`, `Enter`, `e`, `Esc` (explicit), `?`: inapplicable to a form-oriented page without a navigable item list. See WAVE-B-01 request 1 and request 2.
3. Offline state: requires PWA-level infrastructure not implemented anywhere in the build module. This is a cross-cutting infrastructure gap — not a page-level deficiency — analogous to CCG-1.

---

## C3 enumeration: 10-project-settings-automations.md

Route: `/build/[projectId]/settings/automations`

### URL state / query parameters

| Param | Implemented | Tested | Result |
|---|---|---|---|
| `q` (search) | ✓ client-side via `useBuildListFilters` | ✓ filter bar test | PASS |
| `trigger` | ✓ URL-backed filter dropdown | ✓ filter test | PASS |
| `status` | N/A (automations use `isActive` toggle) | N/A | N/A |
| `action` | ✗ backend has no actionType filter | ✗ | FAIL |
| `ownerId` | ✗ backend has no ownerId filter | ✗ | FAIL |
| `cursor` | N/A (bounded list) | N/A | N/A |

### Core fields

| Field | Implemented | Tested | Result |
|---|---|---|---|
| name | ✓ | ✓ | PASS |
| trigger | ✓ `TRIGGER_EVENTS` enum | ✓ filter test | PASS |
| conditions | ✓ up to 50 | ✓ contract | PASS |
| actions | ✓ 5 action types | ✓ enum test | PASS |
| enabled (isActive) | ✓ | ✓ toggle test | PASS |
| owner (createdBy) | ✗ not shown on card | ✗ | FAIL |
| last run | ✗ no `lastRunAt` column | ✗ | FAIL |
| failure | ✗ no `lastFailureAt`/`lastError` column | ✗ | FAIL |

### Actions

| Action | Implemented | Tested | Result |
|---|---|---|---|
| Create automation | ✓ | ✓ permission gate tests | PASS |
| Edit automation | ✓ | ✓ opens sheet | PASS |
| Toggle enable/disable | ✓ | ✓ card switch | PASS |
| Delete automation | ✓ | ✓ `ConfirmDialog` | PASS |

### Overlays

| Overlay | Implemented | Tested | Result |
|---|---|---|---|
| `AutomationSheet` (create/edit) | ✓ | ✓ (mocked in page tests) | PASS |
| `ConfirmDialog` (delete) | ✓ | ✓ | PASS |

### Bulk actions

| Action | Implemented | Result |
|---|---|---|
| Bulk assign/archive/export | ✗ no backend bulk endpoint | FAIL |

### Keyboard shortcuts

| Shortcut | Implemented | Tested | Result |
|---|---|---|---|
| `/` focus search | ✓ `useBuildListKeyboard` | ✓ hook tests | PASS |
| `c` create | ✓ when `canManage` | ✓ hook tests | PASS |
| `j/k` navigate | ✓ | ✓ hook tests | PASS |
| `Enter` open | ✓ | ✓ hook tests | PASS |
| `e` edit | ✓ | ✓ hook tests | PASS |
| `Esc` clear | ✓ | ✓ hook tests | PASS |
| `?` shortcut help | ✓ `ShortcutHelpDialog` wired (this session) | ✓ `onShortcutHelp` wiring tests | PASS |

### States

| State | Implemented | Tested | Result |
|---|---|---|---|
| Loading | ✓ skeleton | ✓ BLD-X-FE-SETTINGS-002a | PASS |
| Empty (first-run) | ✓ `EmptyState` + Create action | ✓ BLD-X-FE-SETTINGS-003a/c | PASS |
| Filtered-empty | ✓ `EmptyState` + Clear filters | ✓ BLD-X-FE-SETTINGS-003b/d | PASS |
| Error | ✓ `PageState` with `onRetry` | ✓ BLD-X-FE-SETTINGS-002c | PASS |
| Denied | ✓ `PageState` | ✓ BLD-X-FE-SETTINGS-002b | PASS |
| Module disabled / plan gated | ✓ via `pageStateFromError` 402 | Covered by `usePageState` contract | PASS |
| Offline | ✗ shared PWA infra | ✗ | FAIL |
| Conflict | N/A (CCG-1) | N/A | N/A |

### Permissions

| Standing | Implemented | Tested | Result |
|---|---|---|---|
| `build:view` (page gate) | ✓ `usePageState` | ✓ access state tests | PASS |
| `build:manage` (create/edit/delete) | ✓ `useCan("build:manage")` | ✓ gate +/- pair | PASS |
| Module gate (when module enabled) | ✓ via 402 → `pageStateFromError` | Covered | PASS |

### C3 verdict: NOT TICKED

Blockers (all backend-blocked or shared infrastructure):
1. **last run / failure fields**: `lastRunAt` and `lastFailureAt` not in `project_automations` table. Requires DB migration. See WAVE-B-05 R1.
2. **owner (createdBy) display**: `createdBy` exists in schema but not shown on card. Minor but unimplemented.
3. **bulk actions**: No backend bulk endpoint (`POST/PATCH /build/{projectId}/automations/bulk`). See WAVE-B-05 R2.
4. **`action`/`ownerId` URL filters**: Backend list endpoint has no these filter params. See WAVE-B-05 R3.
5. **Offline state**: shared PWA infrastructure gap (same as Settings page).

---

## C3 enumeration: 10-project-settings-fields.md

Route: `/build/[projectId]/settings/fields`

### URL state / query parameters

| Param | Implemented | Tested | Result |
|---|---|---|---|
| `q` (search, URL-backed) | ✓ `useBuildListFilters` + `debouncedSearch` | ✓ itemCount filtering tests | PASS |
| `section` | N/A (fields page IS a section) | N/A | N/A |

### Core fields

| Field | Implemented | Tested | Result |
|---|---|---|---|
| name | ✓ | ✓ create/edit tests | PASS |
| type (9 variants) | ✓ `FIELD_TYPES` enum | ✓ schema all-9-types test | PASS |
| options (select/multi_select) | ✓ | ✓ edit pre-fill test | PASS |
| required flag | ✓ shown in row | ✓ rendered in field row | PASS |

### Actions

| Action | Implemented | Tested | Result |
|---|---|---|---|
| Create custom field | ✓ inline form | ✓ `build:manage` gate + form test | PASS |
| Edit custom field | ✓ `EntityFormDialog` | ✓ opens, pre-fills, submits | PASS |
| Delete custom field | ✓ `ConfirmDialog destructive` | ✓ delete button gate | PASS |

### Overlays

| Overlay | Implemented | Tested | Result |
|---|---|---|---|
| `EntityFormDialog` (edit) | ✓ | ✓ opens, pre-fills, submits | PASS |
| `ConfirmDialog` (delete) | ✓ | ✓ | PASS |

### Keyboard shortcuts

| Shortcut | Implemented | Tested | Result |
|---|---|---|---|
| `/` focus search | ✓ `searchInputRef` via `useBuildListKeyboard` | ✓ searchInputRef passed | PASS |
| `c` create | ✓ `onCreate` → `createFieldRef` | ✓ onCreate wired test | PASS |
| `j/k` navigate | ✓ `itemCount` drives the hook | ✓ itemCount tests | PASS |
| `Enter` open | ✓ `onOpen` → `handleKeyboardOpen` | ✓ onEdit wired test | PASS |
| `e` edit | ✓ `onEdit = handleKeyboardOpen` | ✓ onEdit wired test | PASS |
| `Esc` clear | ✓ `onClearSelection` → `listFilters.clearAll` | ✓ existing test | PASS |
| `?` shortcut help | ✓ `ShortcutHelpDialog` wired (this session) | ✓ `onShortcutHelp` +/- pair | PASS |

### States

| State | Implemented | Tested | Result |
|---|---|---|---|
| Loading | ✓ `PageState loading` skeleton | ✓ loading state test | PASS |
| Empty (no custom fields) | ✓ `EmptyState` inside `CustomFieldsSettings` | ✓ existing tests | PASS |
| Filtered-empty (search yields 0) | ✓ "No fields match your search" | ✓ search filtering test | PASS |
| Error (data fetch) | ✓ `ErrorState` inside `CustomFieldsSettings` | ✓ error-state tests | PASS |
| Denied | ✓ `PageState` on `build:update` | ✓ denied test +/- pair | PASS |
| Offline | ✗ shared PWA infra | ✗ | see below |
| Conflict | N/A (CCG-1) | N/A | N/A |

### Permissions

| Permission | Implemented | Tested | Result |
|---|---|---|---|
| `build:update` (page access) | ✓ `usePageState({ permission: "build:update" })` | ✓ access control +/- pair | PASS |
| `build:manage` (CRUD actions) | ✓ `useCan("build:manage")` in `CustomFieldsSettings` | ✓ manage gate tests | PASS |
| Module gate (when module enabled) | ✓ via 402 → `pageStateFromError` in `CustomFieldsSettings` | Covered | PASS |

### C3 verdict: NOT TICKED

One remaining blocker:
- **Offline state**: requires PWA-level infrastructure not implemented anywhere in the build module. This is a cross-cutting infrastructure gap — not a page-level deficiency — consistent with how CCG-1 scopes out the Conflict state. Previous wave agents (WAVE-B-01, WAVE-B-05) consistently excluded Offline from their C3 blocker lists, treating it as shared infrastructure out-of-scope for lane agents.

All other C3 items are implemented and tested. Once the Offline state is addressed as a cross-cutting gap (analogous to adding CCG-4), this page satisfies C3.

---

## Notes

### Offline state as a cross-cutting gap

The Offline state appears in every spec's states section:
> "Offline: show freshness; allow local drafts and approved idempotent commands only."

No page in the build module implements this. It requires service workers, background sync, and local data persistence — PWA-level architecture changes. This is analogous to CCG-1 (Conflict state) and CCG-2 (C7 production browser), both of which are cross-cutting gaps scoped out from per-page C3 criteria.

Previous wave agents consistently excluded Offline from their blocker lists. A CCG entry for this should be filed when the orchestrator addresses it, at which point the fields page C3 can close.

### `?` shortcut help — WAVE-B-05 R4 implemented

`ShortcutHelpDialog` has been created at `frontend/features/build/shared/shortcut-help-dialog.tsx` and wired into both the automations page and the fields page. The `useBuildListKeyboard` hook has been extended with an optional `onShortcutHelp` callback (backward-compatible).

### Settings page keyboard shortcuts and search

The settings page (`/build/[projectId]/settings`) is a section-navigation form, not a list page. The generic spec template items (`search` URL param, `j/k`/`Enter`/`e` shortcuts) do not have a meaningful implementation on a form page. This was filed in WAVE-B-01 request 1. Until the spec is updated to reflect the actual page type, C3 cannot close on this page.
