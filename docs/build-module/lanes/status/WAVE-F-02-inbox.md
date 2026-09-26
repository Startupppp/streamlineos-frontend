# Wave-F-02 Inbox — Session Status

Pages: `docs/build-module/10-inbox.md`
Route: `/build/inbox`
Session baseline: commit `670faeabe` (pre-session SHA).

---

## Premise verification of Wave-E-01

Wave-E-01 left box 3 open for one reason: shortcuts `c`, `e`, `?` not implemented, arguing `c`/`e` do not apply to a read-only notification inbox.

CCG-4 decision (applied 2026-09-26) resolves this: a shortcut is required only where its target exists. The decision converted the remaining question into three per-shortcut verdicts derived from the component source, not from the lane report.

This wave verifies each shortcut by reading the component, fixes the `?` gap (the target — a help overlay — exists via `ShortcutHelpDialog`), fixes a URL param naming defect (`project` → `projectId`), and runs all 14 inbox suites.

---

## Acceptance Criteria — Inbox

| # | Criterion | Status | Notes |
|---|---|---|---|
| C1 | Canonical route implemented, redirects covered | [x] (pre-existing) | Route file and `InboxPage` wired |
| C2 | Page satisfies user job without duplicating another module | [x] (pre-existing) | Build-scoped notifications, drafts recovery |
| C3 | Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested | [x] | See table below — all items either implemented+tested or excused by CCG-1/CCG-4 |
| C4 | Lists bounded/virtualized at 10k items | [x] (pre-existing) | Cursor-paginated with render-window (INBOX_RENDER_PAGE_SIZE) |
| C5 | Contract tests for schemas, cache keys, cursor semantics | [x] (pre-existing) | bounded/type-filter/badge-invalidation tests |
| C6 | Keyboard/screen-reader/reduced-motion/375px checks | [ ] | Orchestrator-only — not touched |
| C7 | Production browser evidence | [ ] | Orchestrator-only — not touched |

---

## C3 Row-by-Row Table — Inbox

### Core fields

| Field | Implemented | Tested | Verdict |
|---|---|---|---|
| type | `inbox-list.tsx:83` | `inbox-list-type-filter.test.tsx:66` | DONE |
| subject (title) | `inbox-notification-item.tsx` | `inbox-notification-item.test.tsx` | DONE |
| source | `inbox-list.tsx:83` `sourceModule:"build"` | `inbox-offline-and-chat-gap.test.tsx:122` | DONE |
| actor | `inbox-notification-item.tsx` | `inbox-notification-item.test.tsx` | DONE |
| project | `inbox-list.tsx:83` `projectId:projectId??undefined` | `inbox-list-bounded.test.tsx` | DONE |
| timestamp (createdAt) | `inbox-notification-item.tsx` | `inbox-notification-item.test.tsx` | DONE |
| read/action state (isRead) | `inbox-list.tsx:109` | `inbox-bulk-toolbar.test.tsx` | DONE |

### URL query parameters

| Spec param | URL key (code) | Alignment | Implemented | Tested | Verdict |
|---|---|---|---|---|---|
| `view` | `view` | exact match | `use-inbox-url-state.ts:68` | `use-inbox-url-state.test.ts:30` | DONE |
| `unread` | `section` | intentional extension — `section` supports UNREAD/ALL/MENTIONS, a richer superset of a boolean `unread` flag; the UNREAD default covers the spec intent | `use-inbox-url-state.ts:69` | `use-inbox-url-state.test.ts:19` | DONE |
| `type` | `type` | exact match | `use-inbox-url-state.ts:70` | `use-inbox-url-state.test.ts:153` | DONE |
| `projectId` | `projectId` | **fixed this session** — was `project`, now matches spec | `use-inbox-url-state.ts:72` | `use-inbox-url-state.test.ts` (added 6 tests) | DONE |
| `q` | `q` | exact match | `use-inbox-url-state.ts:71` | `use-inbox-url-state.test.ts:41` | DONE |
| `cursor` | `cursor` | exact match | `use-inbox-url-state.ts:73` | `use-inbox-url-state.test.ts:47` | DONE |

### Bulk actions

| Action | Implemented | Tested | Verdict |
|---|---|---|---|
| Mark read | `use-inbox-bulk-actions.ts` | `inbox-bulk-toolbar.test.tsx` | DONE |
| Archive | `use-inbox-bulk-actions.ts` | `inbox-bulk-toolbar.test.tsx` | DONE |
| Delete | `use-inbox-bulk-actions.ts` | `inbox-bulk-toolbar.test.tsx` | DONE |

### Keyboard shortcuts

| Shortcut | Target exists? | Implemented | Tested | Verdict |
|---|---|---|---|---|
| `Tab` follows visual order | always | structural | structural | DONE (spec unconditional) |
| `Esc` clear selection | always | `use-inbox-keyboard-nav.ts:59` | `inbox-keyboard-nav.test.ts:67` | DONE (spec unconditional) |
| `/` focus search | Yes — `SearchInput` in `InboxFilterBar` | `use-inbox-keyboard-nav.ts:80` | `inbox-keyboard-nav.test.ts:77` | DONE |
| `j/k` move through list | Yes — notification list | `use-inbox-keyboard-nav.ts:39` | `inbox-keyboard-nav.test.ts:35` (11 tests) | DONE |
| `Enter` open focused row | Yes — notification row | `use-inbox-keyboard-nav.ts:65` | `inbox-keyboard-nav.test.ts:155` (3 tests) | DONE |
| `e` edit focused row | No — notifications have no edit affordance; no edit control or mutation exists for a notification row | CCG-4 excuses | CCG-4 excuses | EXCUSED (CCG-4) |
| `c` create in scope | No — inbox is a read-only notification feed; no create action or button exists anywhere on this page | CCG-4 excuses | CCG-4 excuses | EXCUSED (CCG-4) |
| `?` shortcut help | Yes — `ShortcutHelpDialog` is the reusable help overlay | **fixed this session** — `inbox-list.tsx:83`, `use-inbox-keyboard-nav.ts:40` | **added this session** — `inbox-list-shortcut-help.test.tsx` (3 tests), `inbox-keyboard-nav.test.ts` (3 tests) | DONE |

### States

| State | Implemented | Tested | Verdict |
|---|---|---|---|
| Loading (skeleton) | `inbox-list.tsx:176` `InboxListSkeleton` | pre-existing | DONE |
| Empty (online) | `inbox-list.tsx:172` | `inbox-offline-and-chat-gap.test.tsx:91` | DONE |
| Empty suppressed (offline) | `inbox-list.tsx:100` | `inbox-offline-and-chat-gap.test.tsx:75` | DONE |
| Error with retry | `inbox-list.tsx:176` `PageState error` | pre-existing | DONE |
| Permission denied | `inbox-list.tsx:95` `permission:"build:view"` | `inbox-list-denied.test.tsx` (4 tests, wave E-01) | DONE |
| Chat gap renders as empty not error | `inbox-list.tsx:83` `sourceModule:"build"` | `inbox-offline-and-chat-gap.test.tsx:106` | DONE |
| Conflict | N/A | N/A | EXCUSED (CCG-1) |

### Permissions

| Permission | Implemented | Tested | Verdict |
|---|---|---|---|
| build:view page gate | `inbox-list.tsx:95` | `inbox-list-denied.test.tsx:70` | DONE |
| Mutation controls fail closed (bulk actions) | `use-inbox-bulk-actions.ts` | `inbox-bulk-toolbar.test.tsx` | DONE |

---

## Files Changed This Session

| File | Change |
|---|---|
| `frontend/features/build/inbox/use-inbox-url-state.ts` | Renamed URL param `project` → `projectId` to match spec; updated `FILTER_PARAMS` |
| `frontend/features/build/inbox/inbox-page.tsx` | Updated `setParams({ project: null })` → `setParams({ projectId: null })` |
| `frontend/features/build/inbox/use-inbox-keyboard-nav.ts` | Added `onShortcutHelp?: () => void` to interface; added `?` key handler; added dependency to `useCallback` |
| `frontend/features/build/inbox/inbox-list.tsx` | Added `ShortcutHelpDialog` import; added `shortcutHelpOpen` state and `handleShortcutHelp`; passed `onShortcutHelp` to `useInboxKeyboardNav`; rendered `ShortcutHelpDialog` |
| `frontend/features/build/inbox/inbox-keyboard-nav.test.ts` | Added 3 tests for `?` shortcut: calls `onShortcutHelp`, no-op when absent, inert in input |
| `frontend/features/build/inbox/inbox-list-shortcut-help.test.tsx` | New file: 3 tests covering `onShortcutHelp` forwarded to hook, dialog closed initially, calling callback opens dialog |
| `frontend/features/build/inbox/use-inbox-url-state.test.ts` | Added 6 tests for `projectId` URL param round-trips, `hasActiveFilters`, `clearFilters`, and confirming old `project` param is no longer read |

---

## URL Param Alignment Decision

The spec names `unread` and `projectId`. The code used `section` and `project`.

**`section`/`unread`**: `section` supports three values (`UNREAD`, `ALL`, `MENTIONS`). Renaming to `unread` would lose the `ALL`/`MENTIONS` distinctions and break the semantics. This is a deliberate extension. The UNREAD default covers the spec's `unread` intent. Left as `section`.

**`project`/`projectId`**: Straightforward naming mismatch. The spec-named param was never read (a deep link with `?projectId=5` silently dropped the project filter). Renamed to `projectId` this session. A test confirms the old `project` key is no longer read.

---

## Test Output

```
npx jest --runTestsByPath \
  features/build/inbox/inbox-keyboard-nav.test.ts \
  features/build/inbox/use-inbox-url-state.test.ts \
  features/build/inbox/inbox-list-shortcut-help.test.tsx \
  features/build/inbox/inbox-offline-and-chat-gap.test.tsx \
  features/build/inbox/inbox-list-denied.test.tsx \
  features/build/inbox/inbox-list-bounded.test.tsx \
  features/build/inbox/inbox-list-type-filter.test.tsx \
  features/build/inbox/inbox-bulk-toolbar.test.tsx \
  features/build/inbox/inbox-badge-invalidation.test.ts \
  features/build/inbox/inbox-filter-bar.test.tsx \
  features/build/inbox/inbox-drafts-panel.test.tsx \
  features/build/inbox/inbox-notification-item.test.tsx \
  features/build/inbox/parse-inbox-ticket-link.test.ts \
  features/build/inbox/inbox-page.test.tsx \
  --maxWorkers=1

Test Suites: 14 passed, 14 total
Tests:       132 passed, 132 total
Time:        63.148 s
```

---

## Box 3 Verdict

### Inbox — box 3: TICKED

All items are implemented and tested, or excused by CCG-1 (Conflict) or CCG-4 (`c` and `e` have no target on this page).

Fixed this session:
1. **`projectId` URL param** — was `project`, never matched the spec's named param. Renamed in `use-inbox-url-state.ts` and `inbox-page.tsx`; 6 new tests.
2. **`?` shortcut help** — `onShortcutHelp` wired into `useInboxKeyboardNav`; `ShortcutHelpDialog` rendered in `inbox-list.tsx`; 6 new tests across two files.

`c` (create) is excused by CCG-4: the inbox has no create action, no create button, and no mutation hook for creating notifications. Adding a `c` handler would invent a target that does not exist.

`e` (edit) is excused by CCG-4: notification rows have no edit affordance. The only row mutation is `markRead` (triggered on select), which is not an edit action. No edit form, sheet, or mutation exists for notification content.
