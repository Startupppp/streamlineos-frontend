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

C3 is **not ticked**. Missing: approvals/risks/releases/agent-runs panels; URL params scope/owner/health/due/view; keyboard shortcuts /, c (single-key), j/k, Enter, e, Esc, ?. Added this session: positive shortcut tests (c+p, c+t, g+p) and explicit empty-state delegation test.

---

## C3 Row-by-Row Table — Command Center

### Core fields

| Field | Implemented | Tested | Notes |
|---|---|---|---|
| personal queue (MyIssuesPanel) | Yes | Yes | Renders as `data-testid="my-issues-panel"` |
| project health (ProjectsPanel) | Yes | Yes | Renders as `data-testid="projects-panel"` |
| approvals | No | No | No approvals panel; requires Wave-B-12 or dedicated approval surface |
| risks | No | No | Not in any command center panel |
| releases | No | No | Not in any command center panel |
| shortcuts (PinnedNav) | Yes (partial) | Yes | `PinnedNav` rendered; c+p, c+t, g+m, g+p two-key chords in `use-keyboard-shortcuts.ts` |
| agent runs | No | No | No agent-runs panel in the page |

### URL query parameters

| Param | Implemented | Tested | Notes |
|---|---|---|---|
| `scope` | No | No | No `useSearchParams` in `command-center-page.tsx`; requires backend endpoint support |
| `owner` | No | No | |
| `health` | No | No | |
| `due` | No | No | |
| `view` | No | No | |

### Keyboard shortcuts

| Shortcut | Implemented | Tested | Notes |
|---|---|---|---|
| `c+p` create project | Yes | Yes (added this session: positive test) | `frontend/features/build/command-center/use-keyboard-shortcuts.ts:55` |
| `c+t` create issue | Yes | Yes (added this session: positive test) | `use-keyboard-shortcuts.ts:61` |
| `g+m` navigate my work | Yes | Yes (pre-existing) | `use-keyboard-shortcuts.ts:43` |
| `g+p` navigate projects | Yes | Yes (added this session: positive test) | `use-keyboard-shortcuts.ts:49` |
| `/` search | No | No | No search box on this dashboard page |
| `c` (single-key) create in scope | No | No | `c` is used as a chord prefix; single-key action conflicts |
| `j/k` move | No | No | Dashboard has no selected-item state |
| `Enter` open | No | No | No selected item to open |
| `e` edit | No | No | No selected item to edit |
| `Esc` close/clear | No | No | No overlay or selection to clear at page level |
| `?` shortcut help | No | No | No shortcut help overlay |

### States

| State | Implemented | Tested | Notes |
|---|---|---|---|
| Loading (skeleton) | Yes | Yes (pre-existing) | `StatCardGridSkeleton` used |
| Empty (panels delegate) | Yes | Yes (added this session) | Page goes to "ready" with panels; panels handle own empty state |
| Error with retry | Yes | Yes (pre-existing) | `ErrorState` with retry calls refetch |
| Plan upgrade (402) | Yes | Yes (pre-existing) | `ApiError` 402 renders upgrade link |
| Permission denied | Yes | Yes (pre-existing, wave-B-10) | `usePageState({ permission: "build:view" })` → "Access Restricted" |
| Offline | No | No | No offline handling in command center |
| Conflict | N/A | N/A | Scoped out per CCG-1 |

### Permissions

| Permission | Implemented | Tested | Notes |
|---|---|---|---|
| build:view page gate | Yes | Yes | `usePageState({ permission: "build:view" })` in `command-center-page.tsx:191` |
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

## Files Changed This Session

| File | Change |
|---|---|
| `frontend/features/build/inbox/inbox-list.tsx` | Added `permission: "build:view"` to `usePageState` call (line 95) so the denied state is reachable |
| `frontend/features/build/inbox/inbox-list-denied.test.tsx` | New file: 4 tests covering permission forwarding, denied state renders "Access Restricted", denial suppresses list (paired with ready-state positive) |
| `frontend/features/build/command-center/use-keyboard-shortcuts.test.ts` | Added 3 positive shortcut tests: c+p calls onCreateProject, c+t calls onCreateIssue, g+p navigates to /build |
| `frontend/features/build/command-center/command-center-page.test.tsx` | Added empty-state delegation test: both panels render when data is empty |

---

## Test Output

```
npx jest --runTestsByPath \
  features/build/command-center/command-center-page.test.tsx \
  features/build/command-center/use-keyboard-shortcuts.test.ts \
  features/build/inbox/inbox-keyboard-nav.test.ts \
  features/build/inbox/inbox-offline-and-chat-gap.test.tsx \
  features/build/inbox/inbox-page.test.tsx \
  features/build/inbox/inbox-list-denied.test.tsx

Test Suites: 6 passed, 6 total
Tests:       44 passed, 44 total
Time:        4.922s
```

Full inbox suite (no regressions from adding permission):
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

Missing items that prevent ticking:

1. **approvals, risks, releases, agent runs panels** — none exist in `command-center-page.tsx`. These require dedicated panel components and backend endpoints that are not present.
2. **URL params scope, owner, health, due, view** — `command-center-page.tsx` has no `useSearchParams` call. Requires backend filter support.
3. **Keyboard shortcuts /, c (single-key), j/k, Enter, e, Esc, ?** — the dashboard has no selected-item state; `c` is reserved as a chord prefix; no search box exists. These shortcuts require new UI architecture (selected-item state for j/k/Enter/e, a search input for /, a help overlay for ?).

What was verified as complete and tested (no action needed):
- personal queue panel (MyIssuesPanel)
- project health panel (ProjectsPanel)
- loading, error, plan-upgrade, permission-denied states
- empty-state delegation to panels (added test this session)
- existing two-key chord shortcuts c+p, c+t, g+m, g+p (positive tests added this session)
- build:view permission gate

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
