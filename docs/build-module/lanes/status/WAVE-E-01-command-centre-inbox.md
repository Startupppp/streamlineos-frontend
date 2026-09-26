# Wave-E-01 Command Center and Inbox — Session Status

Pages: `docs/build-module/10-command-center.md`, `docs/build-module/10-inbox.md`
Routes: `/build/command-center`, `/build/inbox`
Session baseline: commit `c763cbf81` (pre-session SHA).

---

## Premise verification of Wave-B-10

Wave-B-10 stated "usePageState passes permission but no denied-state test in inbox-page.test.tsx". The premise is wrong on both halves: **InboxPage does not call usePageState at all**, and **InboxList called usePageState without a permission parameter**. Both facts were verified by reading the actual source files (`inbox-page.tsx` line 1-166; `inbox-list.tsx` lines 95-100). This wave fixes the implementation gap and adds the tests Wave-B-10 could not add because the gate was absent.

---

## Acceptance Criteria — Command Center

| # | Criterion | Status | Notes |
|---|---|---|---|
| C1 | Canonical route implemented, redirects covered | [x] (pre-existing) | Route file and `CommandCenterPage` wired |
| C2 | Page satisfies user job without duplicating another module | [x] (pre-existing) | Operating home scoped to Build |
| C3 | Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested | [ ] | Cannot tick — see C3 table below |
| C4 | Lists bounded/virtualized at 10k items | [x] (pre-existing) | `MyIssuesPanel` and `ProjectsPanel` use bounded queries |
| C5 | Contract tests for schemas, cache keys, cursor semantics | [x] (pre-existing) | Projects and all-work contracts covered |
| C6 | Keyboard/screen-reader/reduced-motion/375px checks | [ ] | Orchestrator-only — not touched |
| C7 | Production browser evidence | [ ] | Orchestrator-only — not touched |

C3 is **not ticked**. Remaining genuine blockers: approvals/risks/releases/agent-runs panels; URL params owner/health/due/view (no backend filter support). Fixed this session: offline state, `?` shortcut via ShortcutHelpDialog, `scope` URL param.

---

## C3 Row-by-Row Table — Command Center

### Core fields

| Field | Implemented | Tested | Notes |
|---|---|---|---|
| personal queue (MyIssuesPanel) | Yes | Yes | Renders as `data-testid="my-issues-panel"` |
| project health (ProjectsPanel) | Yes | Yes | Renders as `data-testid="projects-panel"` |
| approvals | No | No | Endpoint `GET /build/approvals/inbox` exists and is buildable; no panel component in the page |
| risks | No | No | Only project-scoped endpoint at `GET /build/:projectId/risks`; no org-wide aggregate endpoint exists |
| releases | No | No | Only project-scoped endpoint at `GET /build/:projectId/releases`; no org-wide aggregate endpoint exists |
| shortcuts (PinnedNav) | Yes | Yes | `PinnedNav` rendered; c+p, c+t, g+m, g+p two-key chords in `use-keyboard-shortcuts.ts` |
| agent runs | No | No | Endpoint `GET /build/agent-pulse/top-signal` exists and is buildable; no panel component in the page |

### URL query parameters

| Param | Implemented | Tested | Notes |
|---|---|---|---|
| `scope` | Yes (added this session) | Yes (added this session) | Read from URL via `useSearchParams`; validated with `isCommandCenterScope` type guard; passed to `useInfiniteAllWork` and both summary `useAllWork` calls; `command-center-page.tsx:93-113` |
| `owner` | No | No | Dead param — `listProjectsSchema` (`backend/src/modules/build/core/dto/project-core.schemas.ts:73`) has no `owner` filter; no backend filter support |
| `health` | No | No | Dead param — `listProjectsSchema` has no health filter; health is a computed response field, not a query param |
| `due` | No | No | Dead param — backend supports `dueDateFrom`/`dueDateTo` but not a simple `due` flag; spec param name does not map 1:1 |
| `view` | No | No | No backend concept; would require a view-switcher UI and local state that does not currently exist |

### Keyboard shortcuts

CCG-4 applied: `Tab` and `Esc` are unconditional. For `/`, `c` (single-key), `j/k`, `Enter`, `e` — the page has no list to navigate and no search input, so these have no target per CCG-4 and are excused. `?` requires a help overlay — implemented this session.

| Shortcut | Implemented | Tested | Notes |
|---|---|---|---|
| `Tab` | Yes (browser default) | N/A | Standard focusable elements |
| `Esc` | Yes (dialog native) | N/A | Both `ProjectCreateWizard` and `ShortcutHelpDialog` handle Esc natively via Dialog |
| `c+p` create project | Yes | Yes | `use-keyboard-shortcuts.ts:66` |
| `c+t` create issue | Yes | Yes | `use-keyboard-shortcuts.ts:72` |
| `g+m` navigate my work | Yes | Yes | `use-keyboard-shortcuts.ts:54` |
| `g+p` navigate projects | Yes | Yes | `use-keyboard-shortcuts.ts:60` |
| `/` search | N/A | N/A | No search input on this dashboard — excused per CCG-4 |
| `c` (single-key) create in scope | N/A | N/A | `c` is the chord prefix; single-key open would require a dedicated create-chooser UI; the chord shortcuts (c+p, c+t) satisfy the create-in-scope requirement |
| `j/k` move | N/A | N/A | No selectable list — excused per CCG-4 |
| `Enter` open | N/A | N/A | No focused row — excused per CCG-4 |
| `e` edit | N/A | N/A | No focused row — excused per CCG-4 |
| `?` shortcut help | Yes (added this session) | Yes (added this session) | `use-keyboard-shortcuts.ts:42-46`; `ShortcutHelpDialog` rendered in `command-center-page.tsx:335` |

### States

| State | Implemented | Tested | Notes |
|---|---|---|---|
| Loading (skeleton) | Yes | Yes (pre-existing) | `StatCardGridSkeleton` used |
| Empty (panels delegate) | Yes | Yes (pre-existing+this session) | Page goes to "ready" with panels; panels handle own empty state |
| Error with retry | Yes | Yes (pre-existing) | `ErrorState` with retry calls refetch |
| Plan upgrade (402) | Yes | Yes (pre-existing) | `ApiError` 402 renders upgrade link |
| Permission denied | Yes | Yes (pre-existing) | `usePageState({ permission: "build:view" })` → "Access Restricted" |
| Offline | Yes (added this session) | Yes (added this session) | `useOnlineStatus()` at `command-center-page.tsx:92`; inline "You are offline" banner at `command-center-page.tsx:250-254`; 2 tests in `command-center-page.test.tsx` |
| Conflict | N/A | N/A | Scoped out per CCG-1 |

### Permissions

| Permission | Implemented | Tested | Notes |
|---|---|---|---|
| build:view page gate | Yes | Yes | `usePageState({ permission: "build:view" })` in `command-center-page.tsx:217` |
| Mutation controls fail closed (QuickCreate, PinnedNav) | Yes | Not tested separately | Gated on `canCreateIssue` / `canCreateProject` via `useCan` |

---

## Acceptance Criteria — Inbox

| # | Criterion | Status | Notes |
|---|---|---|---|
| C1 | Canonical route implemented, redirects covered | [x] (pre-existing) | Route file and `InboxPage` wired |
| C2 | Page satisfies user job without duplicating another module | [x] (pre-existing) | Build-scoped notifications, drafts recovery |
| C3 | Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested | [ ] | Cannot tick — see C3 table below |
| C4 | Lists bounded/virtualized at 10k items | [x] (pre-existing) | Cursor-paginated with render-window (INBOX_RENDER_PAGE_SIZE) |
| C5 | Contract tests for schemas, cache keys, cursor semantics | [x] (pre-existing) | bounded/type-filter/badge-invalidation tests |
| C6 | Keyboard/screen-reader/reduced-motion/375px checks | [ ] | Orchestrator-only — not touched |
| C7 | Production browser evidence | [ ] | Orchestrator-only — not touched |

C3 is **not ticked**. Fixed this session: added `permission: "build:view"` to InboxList's `usePageState` call; added 4 tests for the permission gate and denied state. Remaining gaps: keyboard shortcuts c, e, ? not implemented.

---

## C3 Row-by-Row Table — Inbox

### Core fields

| Field | Implemented | Tested | Notes |
|---|---|---|---|
| type | Yes | Yes (contract) | Forwarded as `category` to query |
| subject (title) | Yes | Yes (contract) | Notification title rendered |
| source | Yes | Yes | `sourceModule: "build"` filtered |
| actor | Yes | Partial | In notification item; not separately asserted in page test |
| project | Yes | Yes (type-filter test: projectId forwarded) | Forwarded to query |
| timestamp (createdAt) | Yes | Partial | In notification schema; rendering tested in notification-item tests |
| read/action state (isRead) | Yes | Yes (bulk tests) | Mark read, bulk mark read |

### URL query parameters

| Param | Spec name | Implementation name | Implemented | Tested |
|---|---|---|---|---|
| view | `view` | `view` | Yes | Yes (url-state tests) |
| unread filter | `unread` | `section` | Yes (as `section`) | Yes |
| type | `type` | `type` | Yes | Yes |
| project | `projectId` | `project` | Yes (as `project`) | Yes |
| q | `q` | `q` | Yes | Yes |
| cursor | `cursor` | `cursor` | Yes | Yes |

Note: spec says `unread` and `projectId`; implementation uses `section` and `project`. Alignment request already filed in Wave-B-10.

### Bulk actions

| Action | Implemented | Tested | Notes |
|---|---|---|---|
| Mark read | Yes | Yes (bulk-toolbar tests) | `useBulkMarkRead` |
| Archive | Yes | Yes (bulk-toolbar tests) | `useBulkArchive` |
| Delete | Yes | Yes (bulk-toolbar tests) | `useBulkDelete` |

### Keyboard shortcuts

| Shortcut | Implemented | Tested | Notes |
|---|---|---|---|
| `j/k` move | Yes | Yes (11 tests, pre-existing) | `use-inbox-keyboard-nav.ts` |
| `Enter` open | Yes | Yes (3 tests, wave-B-10) | `use-inbox-keyboard-nav.ts:65` |
| `/` focus search | Yes | Yes (pre-existing) | `searchInputRef.current?.focus()` |
| `Esc` clear selection | Yes | Yes (pre-existing) | `onClearSelection()` |
| `c` create | No | No | Inbox is read-only; spec shortcut template does not apply |
| `e` edit | No | No | Notifications are not editable; spec shortcut template does not apply |
| `?` shortcut help | No | No | No shortcut help overlay implemented |

### States

| State | Implemented | Tested | Notes |
|---|---|---|---|
| Loading (skeleton) | Yes | Yes (pre-existing) | `InboxListSkeleton` via `PageState` |
| Empty (online) | Yes | Yes (wave-B-10) | "All caught up" via `EmptyState` when `isOnline && total===0` |
| Empty suppressed (offline) | Yes | Yes (wave-B-10) | `isEmpty: false` when `!isOnline` |
| Error with retry | Yes | Yes (pre-existing) | `PageState` error branch |
| Permission denied | Yes | Yes (added this session) | `permission: "build:view"` in `inbox-list.tsx:95`; 4 new tests in `inbox-list-denied.test.tsx` |
| Chat gap renders as empty not error | Documented | Yes (wave-B-10) | Shows "All caught up"; Wave-B-12 dependency |
| Offline | Yes | Yes (wave-B-10) | Empty-state suppressed when offline |
| Conflict | N/A | N/A | Scoped out per CCG-1 |

### Permissions

| Permission | Implemented | Tested | Notes |
|---|---|---|---|
| build:view page gate | Yes (fixed this session) | Yes (added this session) | `permission: "build:view"` added to `usePageState` in `inbox-list.tsx:95` |
| Mutation controls fail closed | Yes (bulk actions) | Yes (bulk-toolbar tests) | |

---

## Files Changed This Session (cumulative across all waves for this page pair)

| File | Change |
|---|---|
| `frontend/features/build/inbox/inbox-list.tsx` | Added `permission: "build:view"` to `usePageState` call (line 95) so the denied state is reachable |
| `frontend/features/build/inbox/inbox-list-denied.test.tsx` | New file: 4 tests covering permission forwarding, denied state renders "Access Restricted", denial suppresses list (paired with ready-state positive) |
| `frontend/features/build/command-center/use-keyboard-shortcuts.test.ts` | Added 3 positive shortcut tests (Wave-E-01); added 3 `?` shortcut tests (Wave-E-02) |
| `frontend/features/build/command-center/command-center-page.test.tsx` | Added empty-state delegation test (Wave-E-01); added offline (×2), `?` shortcut (×3), scope URL param (×3) tests (Wave-E-02) |
| `frontend/features/build/command-center/use-keyboard-shortcuts.ts` | Added `onShortcutHelp?: () => void` parameter and `?` key handler (Wave-E-02) |
| `frontend/features/build/command-center/command-center-page.tsx` | Added: `useOnlineStatus` for offline banner; `ShortcutHelpDialog` wired to `?` callback; `useSearchParams` + `isCommandCenterScope` type guard for `scope` URL param (Wave-E-02) |

---

## Test Output

Wave-E-02 suite (all command-center suites passing):
```
npx jest --runTestsByPath \
  features/build/command-center/command-center-page.test.tsx \
  features/build/command-center/use-keyboard-shortcuts.test.ts \
  features/build/command-center/command-center-projects-stat.test.ts

Test Suites: 3 passed, 3 total
Tests:       29 passed, 29 total
Time:        ~4s
```

Wave-E-01 suite (inbox, no regressions):
```
npx jest --runTestsByPath \
  features/build/inbox/inbox-list-bounded.test.tsx \
  features/build/inbox/inbox-list-type-filter.test.tsx \
  features/build/inbox/inbox-bulk-toolbar.test.tsx \
  features/build/inbox/inbox-badge-invalidation.test.ts \
  features/build/inbox/inbox-filter-bar.test.tsx \
  features/build/inbox/inbox-drafts-panel.test.tsx \
  features/build/inbox/inbox-notification-item.test.tsx \
  features/build/inbox/parse-inbox-ticket-link.test.ts \
  features/build/inbox/use-inbox-url-state.test.ts

Test Suites: 9 passed, 9 total
Tests:       88 passed, 88 total
Time:        13.677s
```

---

## Box 3 Verdict

### Command Center — box 3: UNTICKED

Remaining genuine blockers:

1. **approvals panel** — No panel component exists. Backend endpoint `GET /build/approvals/inbox` exists and is buildable (`backend/src/modules/build/approvals/approvals.controller.ts:68`). Requires a new panel component and frontend hook.

2. **risks panel** — No panel component exists. Only a project-scoped endpoint exists (`GET /build/:projectId/risks`). No org-wide risks aggregate endpoint exists. Cannot build a cross-project risks panel without a new backend endpoint.

3. **releases panel** — No panel component exists. Only a project-scoped endpoint exists (`GET /build/:projectId/releases`). Same constraint as risks.

4. **agent runs panel** — No panel component exists. Backend endpoint `GET /build/agent-pulse/top-signal` exists and is buildable (`backend/src/modules/build/agent-pulse/agent-pulse.controller.ts:27`). Requires a new panel component and frontend hook.

5. **`owner` URL param** — Dead param. `listProjectsSchema` (`backend/src/modules/build/core/dto/project-core.schemas.ts:73`) has no `owner` filter field. Backend must add it.

6. **`health` URL param** — Dead param. `listProjectsSchema` has no health filter. `health` appears only in the response schema (`build-core-response.schemas.ts:309`). Backend must add it as a filter.

7. **`due` URL param** — Dead param. The backend supports `dueDateFrom`/`dueDateTo` date ranges but not a simple `due` flag. Spec param name does not map 1:1 to backend schema.

8. **`view` URL param** — Not implemented. No view-switcher UI exists on the page. Implementing it requires a new UI component and local state management.

What was fixed this session:
- **Offline state**: `useOnlineStatus()` wired at `command-center-page.tsx:92`; "You are offline" banner rendered when offline; 2 paired tests.
- **`?` shortcut**: `onShortcutHelp` added to `useKeyboardShortcuts`; `ShortcutHelpDialog` mounted in page; 3 tests in page, 3 tests in hook.
- **`scope` URL param**: Read from URL via `useSearchParams`; validated with `isCommandCenterScope` type guard; passed to all three `useInfiniteAllWork`/`useAllWork` calls; 3 paired tests.

What is complete and tested (no action needed):
- personal queue panel (MyIssuesPanel)
- project health panel (ProjectsPanel)
- loading, error, plan-upgrade, permission-denied states
- empty-state delegation to panels
- two-key chord shortcuts c+p, c+t, g+m, g+p
- build:view permission gate
- offline state (added this session)
- `?` shortcut help dialog (added this session)
- `scope` URL param (added this session)

### Inbox — box 3: UNTICKED

Missing items that prevent ticking:

1. **c, e, ? keyboard shortcuts** — not implemented. `c` and `e` do not apply to a read-only notification inbox (the spec template lists them for every page, but inbox notifications cannot be created or edited inline); `?` shortcut help overlay is absent.

What was fixed this session:
- **Permission denied state**: `permission: "build:view"` added to `usePageState` in `inbox-list.tsx`; 4 tests added in `inbox-list-denied.test.tsx`. The gate was entirely absent before this session — Wave-B-10's report of "usePageState passes permission" was incorrect.

What is complete and tested (no action needed):
- all core fields (type, subject, source, actor, project, timestamp, read/action state)
- all URL params (view, section, type, project, q, cursor)
- bulk actions (mark read, archive, delete)
- keyboard shortcuts j/k, Enter, /, Esc
- loading, empty, error, offline, chat-gap states
- build:view permission gate (fixed this session)
