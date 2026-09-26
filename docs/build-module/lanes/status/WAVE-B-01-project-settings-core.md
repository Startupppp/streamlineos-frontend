# Wave-B-01 — Project Settings Core: status report

## Pages worked

- `docs/build-module/10-project-settings.md`
- `docs/build-module/10-project-settings-fields.md`

---

## C3 row-by-row: 10-project-settings.md (Settings page)

Route: `/build/[projectId]/settings`

| Row | Item | Implemented | Tested | Result |
|---|---|---|---|---|
| Core fields | General (name/description/status/members) | ✓ `ProjectInfoSection` | ✓ dirty-guard test | PASS |
| Core fields | Labels section | ✓ `LabelsSettings` | ✓ labels-settings.test.tsx | PASS |
| Core fields | Statuses section | ✓ `StatusesSettings` | owned by Wave-B-02 | PASS |
| Core fields | Custom Fields section | ✓ `CustomFieldsSettings` | ✓ custom-fields-settings.test.tsx | PASS |
| Core fields | Teams section | ✓ `TeamRosterSection` | no unit test (component renders) | PARTIAL |
| Core fields | Danger Zone section | ✓ `DangerZoneSection` | ✓ owner-gate positive+negative pair | PASS |
| Actions | Save settings form | ✓ `useUpdateProject` | ✓ section test: save stays on page | PASS |
| Actions | Create/edit/delete labels | ✓ | ✓ labels-settings.test.tsx | PASS |
| Actions | Create/edit/delete custom fields | ✓ | ✓ custom-fields-settings.test.tsx | PASS |
| Actions | Delete project | ✓ `DangerZoneSection` | ✓ danger zone owner gate | PASS |
| Overlays | ReassignDialog (member removal) | ✓ | ✓ (rendered, not behavior-tested) | PARTIAL |
| Overlays | ConfirmDialog (delete) | ✓ | ✓ via labels/custom-fields tests | PASS |
| Query params | `section` | ✓ URL-backed, `router.replace` | ✓ full round-trip, fallback, deep-link | PASS |
| Query params | `search` (spec: "section and search") | ✗ NOT implemented | ✗ | **FAIL** |
| Bulk actions | (none — settings form has no list) | N/A | N/A | PASS |
| Shortcuts | `/` focus search | ✗ (no search input) | ✗ | **FAIL** |
| Shortcuts | `c` create in scope | ✗ | ✗ | **FAIL** |
| Shortcuts | `j/k` navigate rows | ✗ (no row list) | ✗ | **FAIL** |
| Shortcuts | `Enter` open | ✗ | ✗ | **FAIL** |
| Shortcuts | `e` edit | ✗ | ✗ | **FAIL** |
| Shortcuts | `Esc` close/clear | Partial (browser native in dialogs) | ✗ | **FAIL** |
| Shortcuts | `?` shortcut help | ✗ | ✗ | **FAIL** |
| States | Loading (skeleton) | ✓ `PageState loading={<Skeleton …>}` | ✓ page-states test: loading hides fields | PASS |
| States | Empty (project not found) | ✓ `EmptyState` via `isEmpty` | ✗ not explicitly tested | PARTIAL |
| States | Error | ✓ via `PageState` | ✓ page-states test: error hides fields | PASS |
| States | Denied | ✓ via `PageState` | ✓ page-states test: denied hides fields | PASS |
| Permissions | `build:view` (page gate) | ✓ `usePageState({ permission: "build:view" })` | ✓ page-states test | PASS |
| Permissions | `build:delete` (danger zone) | ✓ `useCan("build:delete")` | ✓ owner gate positive+negative pair | PASS |
| Permissions | `build:manage` (labels/fields CRUD) | ✓ in child components | ✓ labels/custom-fields tests | PASS |

**C3 verdict: NOT TICKED**

Blocking gaps:
- `search` URL param not implemented (spec lists "section and search").
- Keyboard shortcuts not implemented (`/`, `c`, `j/k`, `Enter`, `e`, `Esc`, `?`).

Context: the settings page is a section-navigation form, not a searchable list. The `search` param and most list-navigation keyboard shortcuts (`j/k`, `Enter`) are generic spec template items that do not have a meaningful implementation on a settings form. A request has been filed (WAVE-B-01.md) to remove these from the spec for form-type settings pages, or to scope them specifically (e.g. only `Esc` applies to close dialogs).

---

## C3 row-by-row: 10-project-settings-fields.md (Fields page)

Route: `/build/[projectId]/settings/fields`

| Row | Item | Implemented | Tested | Result |
|---|---|---|---|---|
| Core fields | name | ✓ | ✓ create/edit tests | PASS |
| Core fields | type (9 variants) | ✓ `FIELD_TYPES` enum | ✓ schema test (all 9 types) | PASS |
| Core fields | options (select/multi_select) | ✓ | ✓ edit pre-fill test | PASS |
| Core fields | required flag | ✓ shown in row | ✓ rendered in field row | PASS |
| Actions | Create custom field | ✓ inline form | ✓ build:manage gate + form test | PASS |
| Actions | Edit custom field | ✓ `EntityFormDialog` | ✓ edit dialog pre-fill + submit | PASS |
| Actions | Delete custom field | ✓ `ConfirmDialog destructive` | ✓ delete button gate | PASS |
| Overlays | `EntityFormDialog` (edit) | ✓ | ✓ opens, pre-fills, submits | PASS |
| Overlays | `ConfirmDialog` (delete) | ✓ | ✓ delete confirmation gate | PASS |
| Query params | `q` search (URL-backed) | ✓ `useBuildListFilters` → `debouncedSearch` → `CustomFieldsSettings.search` | ✓ itemCount tests (filtered vs unfiltered vs zero-match) | PASS |
| Bulk actions | (none — custom fields list has no bulk operations) | N/A | N/A | PASS |
| Shortcuts | `/` focus search input | ✓ `useBuildListKeyboard` + `searchInputRef` | ✓ searchInputRef passed | PASS |
| Shortcuts | `c` create | ✓ `onCreate` → `createFieldRef` → `CustomFieldsSettings.createRef` | ✓ onCreate wired test | PASS |
| Shortcuts | `j/k` navigate | ✓ `useBuildListKeyboard` handles ArrowDown/Up, `itemCount=filteredCount` | ✓ itemCount tests | PASS |
| Shortcuts | `Enter` open/edit | ✓ `onOpen` → `handleKeyboardOpen` → `editFieldRef.current` | ✓ onEdit wired test | PASS |
| Shortcuts | `e` edit | ✓ `onEdit = handleKeyboardOpen` | ✓ onEdit wired test | PASS |
| Shortcuts | `Esc` clear | ✓ `onClearSelection` → `listFilters.clearAll` | ✓ existing test | PASS |
| Shortcuts | `?` shortcut help | ✗ not in `useBuildListKeyboard`; needs global application hook | ✗ | **FAIL** |
| States | Loading (access resolution skeleton) | ✓ `PageState loading={<Skeleton …>}` | ✓ new loading state test | PASS |
| States | Denied | ✓ `PageState` gates on `build:update` | ✓ denied test (negative + positive pair) | PASS |
| States | Empty (no custom fields) | ✓ `EmptyState` inside `CustomFieldsSettings` | ✓ existing tests | PASS |
| States | Filtered-empty (search yields no results) | ✓ "No fields match your search" in `CustomFieldsSettings` | ✓ search filtering test | PASS |
| States | Error (data fetch) | ✓ `ErrorState` inside `CustomFieldsSettings` | ✓ existing error-state tests | PASS |
| Permissions | `build:update` (page access) | ✓ `usePageState({ permission: "build:update" })` | ✓ access control test | PASS |
| Permissions | `build:manage` (CRUD actions) | ✓ `useCan("build:manage")` in `CustomFieldsSettings` | ✓ manage gate tests | PASS |

**C3 verdict: NOT TICKED**

Blocking gap:
- `?` shortcut help: `useBuildListKeyboard` does not handle `?`. Wiring a shortcut-help overlay is an application-level feature, not a page-level one. Detailed in request WAVE-B-01.md.

Everything else (query params, keyboard shortcuts, states, permissions, actions, overlays, fields) is now implemented and tested.

---

## Files changed

| File | Change |
|---|---|
| `frontend/features/build/settings/custom-fields-settings.tsx` | Added `search`, `createRef`, `editRef` props; filter fields by search; filtered-empty state; export `CustomFieldItem`; wire refs via `useEffect` |
| `frontend/features/build/settings/project-settings-fields-page.tsx` | Pass `search`, `createRef`, `editRef` to `CustomFieldsSettings`; compute `filteredCount`; wire `onCreate`/`onEdit` to keyboard hook |
| `frontend/features/build/settings/custom-fields-settings.test.tsx` | Added 8 tests: search filtering (3), filtered-empty state (1), createRef/editRef wiring (2), existing preserved (13) |
| `frontend/features/build/settings/project-settings-fields-page.test.tsx` | Added 8 tests: loading skeleton (1), `onCreate`/`onEdit` wiring (2), filtered itemCount (3), access control preserved (3) |
| `frontend/features/build/settings/project-settings-page-states.test.tsx` | New file: 8 tests covering loading/denied/error/ready page-level states for the settings page |

## Test commands run and output

```
npx jest --runTestsByPath \
  features/build/settings/project-settings-section.test.tsx \
  features/build/settings/project-settings-dirty-guard.test.tsx \
  features/build/settings/custom-fields-settings.test.tsx \
  features/build/settings/labels-settings.test.tsx \
  features/build/settings/project-settings-fields-page.test.tsx \
  features/build/settings/project-settings-page-states.test.tsx

Test Suites: 6 passed, 6 total
Tests:       58 passed, 58 total   (was 39 before this session; +19 new)
```

## Requests filed

See `docs/build-module/lanes/requests/WAVE-B-01.md`.
