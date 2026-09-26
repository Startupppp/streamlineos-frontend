# Wave-B-10 Command Center and Inbox — Session Status

Pages: `docs/build-module/10-command-center.md`, `docs/build-module/10-inbox.md`
Routes: `/build/command-center`, `/build/inbox`

## Acceptance Criteria — Command Center

| # | Criterion | Status | Notes |
|---|---|---|---|
| C1 | Canonical route implemented, redirects covered | [x] (pre-existing) | Route file and `CommandCenterPage` wired |
| C2 | Page satisfies user job without duplicating another module | [x] (pre-existing) | Operating home scoped to Build |
| C3 | Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission implemented and tested | [ ] | Cannot tick — see C3 table below |
| C4 | Lists bounded/virtualized at 10k items | [x] (pre-existing) | `MyIssuesPanel` and `ProjectsPanel` use bounded queries |
| C5 | Contract tests for schemas, cache keys, cursor semantics | [x] (pre-existing) | Projects and all-work contracts covered |
| C6 | Keyboard/screen-reader/reduced-motion/375px checks | [ ] | Orchestrator-only — not touched |
| C7 | Production browser evidence | [ ] | Orchestrator-only — not touched |

C3 is **not ticked**. Genuine gaps remain: URL params (scope, owner, health, due, view) not implemented; core fields approvals, risks, releases, agent runs not in the page; shortcuts /, e, Esc, ? not in `use-keyboard-shortcuts.ts`. The denied state is now tested (added this session).

---

## C3 Row-by-Row Table — Command Center

### Core fields

| Field | Implemented | Tested | Notes |
|---|---|---|---|
| personal queue (MyIssuesPanel) | Yes | Yes (mock in page tests) | Renders as `data-testid="my-issues-panel"` |
| project health (ProjectsPanel) | Yes | Yes (mock in page tests) | Renders as `data-testid="projects-panel"` |
| approvals | Not implemented | No | No approvals panel in `command-center-page.tsx`; blocked (Wave-B-12 chat, no build approvals panel yet) |
| risks | Not implemented | No | Not in any command center panel |
| releases | Not implemented | No | Not in any command center panel |
| shortcuts (PinnedNav) | Yes (partial) | Yes | `PinnedNav` rendered; c+p, c+t, g+m, g+p two-key chords in `use-keyboard-shortcuts.ts` |
| agent runs | Not implemented | No | No agent-runs panel in the page |

### URL query parameters

| Param | Implemented | Tested | Notes |
|---|---|---|---|
| `scope` | Not implemented | No | No `useSearchParams` in `command-center-page.tsx` |
| `owner` | Not implemented | No | |
| `health` | Not implemented | No | |
| `due` | Not implemented | No | |
| `view` | Not implemented | No | |

### Keyboard shortcuts

| Shortcut | Implemented | Tested | Notes |
|---|---|---|---|
| `c+p` / `c+t` create | Yes | Indirect (hook has own tests) | Two-key chords in `use-keyboard-shortcuts.ts` |
| `g+m` / `g+p` navigate | Yes | Indirect | |
| `/` search | Not implemented | No | Not in `use-keyboard-shortcuts.ts` |
| `c` create in scope | Not implemented | No | Only two-key chord variants exist |
| `j/k` move | Not implemented | No | |
| `Enter` open | Not implemented | No | |
| `e` edit | Not implemented | No | |
| `Esc` close/clear | Not implemented | No | |
| `?` shortcut help | Not implemented | No | |

### States

| State | Implemented | Tested | Notes |
|---|---|---|---|
| Loading (skeleton) | Yes | Yes (pre-existing: skeleton while access loading) | `StatCardGridSkeleton` used |
| Error with retry | Yes | Yes (pre-existing: retry test, 500 path) | `ErrorState` with retry calls refetch |
| Plan upgrade (402) | Yes | Yes (pre-existing: upgrade link test) | `ApiError` 402 renders upgrade link |
| Permission denied | Yes | Yes (added this session) | `usePageState` + `PageState` → "Access Restricted" |
| Empty | Yes | No explicit test | Passes isEmpty through PageState |

### Permissions

| Permission | Implemented | Tested | Notes |
|---|---|---|---|
| build:view gate | Yes | Yes (denied state test added this session) | `usePageState({ permission: "build:view" })` |
| Mutation controls fail closed | Yes (PinnedNav/QuickCreate gated) | Not tested separately | |

---

## Acceptance Criteria — Inbox

| # | Criterion | Status | Notes |
|---|---|---|---|
| C1 | Canonical route implemented, redirects covered | [x] (pre-existing) | Route file and `InboxPage` wired |
| C2 | Page satisfies user job without duplicating another module | [x] (pre-existing) | Build-scoped notifications, drafts recovery |
| C3 | Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission implemented and tested | [ ] | Cannot tick — see C3 table below |
| C4 | Lists bounded/virtualized at 10k items | [x] (pre-existing) | Cursor-paginated with render-window (INBOX_RENDER_PAGE_SIZE) |
| C5 | Contract tests for schemas, cache keys, cursor semantics | [x] (pre-existing) | bounded/type-filter/badge-invalidation tests |
| C6 | Keyboard/screen-reader/reduced-motion/375px checks | [ ] | Orchestrator-only — not touched |
| C7 | Production browser evidence | [ ] | Orchestrator-only — not touched |

C3 is **not ticked**. Enter key shortcut added this session. Chat notification persistence gap is a Wave-B-12 dependency (see defect verdict below). Spec URL param naming differs from implementation ("unread" vs "section", "projectId" vs "project") — alignment deferred. Shortcuts c, e, ? not implemented.

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
| unread filter | `unread` | `section` | Yes (as `section`) | Yes (type-filter test: section forwarded) |
| type | `type` | `type` | Yes | Yes (type-filter test) |
| project | `projectId` | `project` | Yes (as `project`) | Yes (type-filter test: projectId forwarded to query) |
| q | `q` | `q` | Yes | Yes |
| cursor | `cursor` | `cursor` | Yes | Yes (bounded test) |

Note: spec says "unread" and "projectId"; implementation uses "section" and "project". Alignment request filed.

### Bulk actions

| Action | Implemented | Tested | Notes |
|---|---|---|---|
| Mark read | Yes | Yes (bulk-toolbar tests) | `useBulkMarkRead` |
| Archive | Yes | Yes (bulk-toolbar tests) | `useBulkArchive` |
| Delete | Yes | Yes (bulk-toolbar tests) | `useBulkDelete` |

### Keyboard shortcuts

| Shortcut | Implemented | Tested | Notes |
|---|---|---|---|
| `j/k` move | Yes | Yes (pre-existing: 11 tests) | Handles forward/back, clamping, input guard, modifier guard |
| `Enter` open | Yes (added this session) | Yes (added this session: 3 tests) | Activates selected notification; inert on null/input |
| `/` focus search | Yes | Yes (pre-existing) | `searchInputRef.current?.focus()` |
| `Esc` clear selection | Yes | Yes (pre-existing) | `onClearSelection` |
| `c` create | Not implemented | No | |
| `e` edit | Not implemented | No | |
| `?` shortcut help | Not implemented | No | |

### States

| State | Implemented | Tested | Notes |
|---|---|---|---|
| Loading (skeleton) | Yes | Yes (pre-existing) | `InboxListSkeleton` |
| Error with retry | Yes | Pre-existing | PageState error branch |
| Empty (online) | Yes | Yes (added this session) | "All caught up" via `EmptyState` when `isOnline && total===0` |
| Empty suppressed (offline) | Yes | Yes (added this session) | `isEmpty: false` when `!isOnline`; empty list not empty-state |
| Chat gap renders as empty not error | Documented gap | Yes (added this session) | Shows "All caught up" when chat notifications never persist — correct silent failure; Wave-B-12 dependency |
| Permission denied | Not explicitly tested in inbox page | No | `usePageState` passes `permission` but no denied-state test in `inbox-page.test.tsx` |

### Permissions

| Permission | Implemented | Tested | Notes |
|---|---|---|---|
| Mutation controls fail closed | Yes (bulk actions gated) | Yes (bulk-toolbar tests) | |
| build:view page gate | In `inbox-page.tsx` via `usePageState` | No explicit denied test | Partially tested through page test; no explicit denied assertion |

---

## Inbox Defect Verdicts

### Defect 1: Chat notifications never persist — inbox cannot see them

**Root cause:** Chat uses Ably for real-time delivery (`useChatGlobalNotifications` → toast). The chat module never calls `notifications.service.create`, so no row lands in the `notifications` table. `GET /notifications?sourceModule=build` returns zero results for chat mentions.

**Inbox behavior:** When a user receives only chat mentions, the inbox shows "All caught up" — the correct empty state — with no error. The inbox cannot distinguish "no events" from "events never persisted."

**Fix ownership:** Wave-B-12 (chat module). The fix requires the chat module to call `notifications.service.create` for `@mention` events, using `sourceModule: "chat"` so they appear in a future `sourceModule=chat` inbox query (or in the unified inbox via `GET /me/inbox/unified`).

**What this session did:** Covered the current behavior with two tests in `inbox-offline-and-chat-gap.test.tsx`: one verifying the empty-not-error behavior, one verifying `sourceModule: "build"` is passed to the query (confirming chat's Ably path is excluded by design). C3 cannot be ticked on this row until Wave-B-12 ships.

**Request filed:** `docs/build-module/lanes/requests/WAVE-B-10.md` → chat persistence.

### Defect 2: Leave approvals are double-counted in the unified inbox

**Root cause:** Two independent paths both contribute leave items to `GET /me/inbox/unified`:
1. `dispatchLeaveRequested` persists a `notifications` row with `dedupKey: "notification:{id}"` (fired from `leaves-write.service.ts`)
2. `HrTimeApprovalAdapter.fetchLeaves` reads `leave_requests` directly via the `ApprovalAdapterRegistry`, adding items with `dedupKey: "approval:leave:{id}"`

These two `dedupKey` namespaces are different strings, so the unified inbox merges them without collision detection, doubling every leave item.

**Scope:** Affects `GET /me/inbox/unified` (HR module territory). The Build inbox (`GET /notifications?sourceModule=build`) is **not affected** because leave notifications have `sourceModule: "hr"`.

**Fix location:** `backend/src/me/unified-inbox.service.ts` — add dedup at the merge layer, OR remove the `dispatchLeaveRequested` notification from the unified inbox query, OR normalize `dedupKey` prefixes so `"notification:{id}"` and `"approval:leave:{id}"` resolve to the same item. This is NOT in owned files (`features/build/approvals/**` is file-only for this wave).

**What this session did:** Root-caused the two sources. No code change made (outside owned scope).

**Request filed:** `docs/build-module/lanes/requests/WAVE-B-10.md` → leave double-count.

---

## Files Changed This Session

| File | Change |
|---|---|
| `frontend/features/build/inbox/use-inbox-keyboard-nav.ts` | Added Enter key handler (activates selected notification; inert on null selection or input target) |
| `frontend/features/build/inbox/inbox-keyboard-nav.test.ts` | Added 3 Enter key tests (calls onSelect, inert on null, inert on input target) |
| `frontend/features/build/command-center/command-center-page.test.tsx` | Added denied state test (Access Restricted renders, ready panels absent) |
| `frontend/features/build/inbox/inbox-offline-and-chat-gap.test.tsx` | New file: 6 tests covering offline empty-state suppression, chat-gap empty-not-error behavior, sourceModule filter, INBOX_FETCH_PAGE_SIZE constant |

---

## Scoped Test Commands and Output

```
cd frontend && node_modules/.bin/jest --runTestsByPath \
  features/build/inbox/inbox-keyboard-nav.test.ts \
  features/build/command-center/command-center-page.test.tsx \
  features/build/inbox/inbox-offline-and-chat-gap.test.tsx
```

**Result:** Tests: **25 passed**, 25 total. Test Suites: 3 passed, 3 total. Time: 4.472s.

Breakdown:
- `inbox-keyboard-nav.test.ts`: 14 tests (11 pre-existing j/k/Esc/slash + 3 new Enter tests)
- `command-center-page.test.tsx`: 5 tests (4 pre-existing skeleton/402/heading/retry + 1 new denied state)
- `inbox-offline-and-chat-gap.test.tsx`: 6 tests (new file)

---

## Requests Filed

See `docs/build-module/lanes/requests/WAVE-B-10.md` for:
1. Chat notification persistence (Wave-B-12 dependency)
2. Leave approval double-count in unified inbox (backend `unified-inbox.service.ts`)
3. Inbox URL param alignment: spec "unread" → code "section"; spec "projectId" → code "project"
4. Command center missing features: URL-backed filters, approvals/risks/releases/agent-runs panels
