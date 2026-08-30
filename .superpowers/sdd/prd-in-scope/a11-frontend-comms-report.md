# A11 Frontend Comms Report

Lane: A11 — notifications, chat, calendar, mail, wiki hooks and features.

---

## 1. Hook-Level Authorization — P0 Fix

### Permission keys verified in BOTH catalogs

Keys confirmed verbatim in:
- `frontend/lib/rbac/permissions/notifications.ts`
- `backend/src/modules/rbac/permissions/notifications.ts`

| Hook | File | Permission Key | Found in FE catalog | Found in BE catalog | `enabled` condition |
|---|---|---|---|---|---|
| `useNotificationProviders` | `hooks/api/notifications-admin.ts` | `notifications:providers:view` | ✅ line 6 | ✅ line 17 | `enabled: canView && (enabledOption ?? true)` |
| `useNotificationEventCatalog` | `hooks/api/notifications-admin.ts` | `notifications:events:view` | ✅ line 4 | ✅ line 5 | `enabled: canView && (enabledOption ?? true)` |
| `useNotificationPolicies` | `hooks/api/notifications-admin.ts` | `notifications:policy:view` | ✅ line 8 | ✅ line 29 | `enabled: canView && (enabledOption ?? true)` |
| `useNotificationTemplates` | `hooks/api/notifications-templates.ts` | `notifications:templates:view` | ✅ line 10 | ✅ line 41 | `enabled: canView && (enabledOption ?? true)` |
| `useBroadcasts` | `hooks/api/notifications-broadcasts.ts` | `notifications:broadcasts:view` | ✅ line 12 | ✅ line 53 | `enabled: canView && (enabledOption ?? true)` |

### Exact `enabled` lines in source (quoted)

Each of the five admin query hooks follows this pattern — `useCan` is called unconditionally before `useQuery`, `enabled` is destructured from `options` first, then combined after `...restOptions`:

**`useNotificationProviders`** (`hooks/api/notifications-admin.ts` lines 75, 76, 82):
```ts
const canView = useCan("notifications:providers:view");
const { enabled: enabledOption, ...restOptions } = options ?? {};
// ...
enabled: canView && (enabledOption ?? true),
```

**`useNotificationEventCatalog`** (`hooks/api/notifications-admin.ts` lines 135, 136, 142):
```ts
const canView = useCan("notifications:events:view");
const { enabled: enabledOption, ...restOptions } = options ?? {};
// ...
enabled: canView && (enabledOption ?? true),
```

**`useNotificationPolicies`** (`hooks/api/notifications-admin.ts` lines 177, 178, 184):
```ts
const canView = useCan("notifications:policy:view");
const { enabled: enabledOption, ...restOptions } = options ?? {};
// ...
enabled: canView && (enabledOption ?? true),
```

**`useNotificationTemplates`** (`hooks/api/notifications-templates.ts` lines 21, 22, 32):
```ts
const canView = useCan("notifications:templates:view");
const { enabled: enabledOption, ...restOptions } = options ?? {};
// ...
enabled: canView && (enabledOption ?? true),
```

**`useBroadcasts`** (`hooks/api/notifications-broadcasts.ts` lines 20, 21, 31):
```ts
const canView = useCan("notifications:broadcasts:view");
const { enabled: enabledOption, ...restOptions } = options ?? {};
// ...
enabled: canView && (enabledOption ?? true),
```

The check lives in the query's `enabled` condition — `useCan` returns `false` when the access data is loaded and the permission is absent, which prevents `queryFn` from firing. When the access query is still loading, `useCan` returns `false` (safe default), so the admin request is also suppressed until permissions are confirmed.

---

## 2. Hooks Left Universal (no permission gate)

| Hook | File | Why universal |
|---|---|---|
| `useNotifications` | `notifications-inbox.ts` | Personal inbox — platform core for every active member (root CLAUDE.md §8) |
| `useInfiniteNotifications` | `notifications-inbox.ts` | Personal inbox — platform core |
| `useUnreadNotifications` | `notifications-inbox.ts` | Personal inbox — platform core |
| `useUnreadNotificationCount` | `notifications-inbox.ts` | Personal inbox counter, polled by notification bell |
| `useMarkNotificationRead` | `notifications-inbox.ts` | Mutation on own notification |
| `useMarkAllNotificationsRead` | `notifications-inbox.ts` | Mutation on own notifications |
| `useArchiveNotification` | `notifications-inbox.ts` | Mutation on own notification |
| `useUnarchiveNotification` | `notifications-inbox.ts` | Mutation on own notification |
| `useDeleteNotification` | `notifications-inbox.ts` | Mutation on own notification |
| `usePinNotification` | `notifications-inbox.ts` | Mutation on own notification |
| `useUnpinNotification` | `notifications-inbox.ts` | Mutation on own notification |
| `useSnoozeNotification` | `notifications-inbox.ts` | Mutation on own notification |
| `useBulkMarkRead` | `notifications-inbox.ts` | Mutation on own notifications |
| `useBulkArchive` | `notifications-inbox.ts` | Mutation on own notifications |
| `useBulkDelete` | `notifications-inbox.ts` | Mutation on own notifications |
| `useNotificationPreferences` | `notifications-admin.ts` | Personal preferences (`/notification-preferences`) — gated by `!!orgId` only |
| `useUpdateNotificationPreferences` | `notifications-admin.ts` | Mutation on own preferences |
| `useApproveNotification` | `notifications-admin.ts` | Workflow action on own notification |
| `useRejectNotification` | `notifications-admin.ts` | Workflow action on own notification |
| `useSuppressions` | `notifications-admin.ts` | Personal suppressions (`/notification-preferences/suppressions`) — gated by `!!orgId` only |
| `useCreateSuppression` | `notifications-admin.ts` | Mutation on own suppressions |
| `useRemoveSuppression` | `notifications-admin.ts` | Mutation on own suppressions |
| `useEmitNotificationEvent` | `notifications-admin.ts` | Mutation — gate belongs at the call site (component uses `useCan("notifications:events:manage")`) |
| All mutation-only hooks in templates/broadcasts | `notifications-templates.ts`, `notifications-broadcasts.ts` | Mutations — no `enabled`; call-site components gate the UI with `useCan` on the manage key |

---

## 3. File Splits — Before / After

### mail-compose-sheet.tsx

| File | Before | After |
|---|---|---|
| `features/mail/mail-compose-sheet.tsx` | 541 lines | 319 lines |
| `features/mail/mail-compose-header-fields.tsx` (new) | — | 267 lines |

Extracted: `MailComposeHeaderFields` owns the From/To/CC/BCC/Subject fields UI including account selectors, email chip inputs, and CC/BCC visibility toggling. The sheet retains form setup, state management, submit handlers, AI toolbar, editor, and footer — a genuine reduction in responsibility, not a forwarding wrapper.

### Cohesive-exception records for files over 500 lines

#### `features/chat/channel-sidebar.tsx` — 535 lines

**Interface:** `ChannelSidebar` is the single navigation pane rendered inside the chat shell. It accepts `activeChannelId`, `onSelectChannel`, `currentUserId`, `isCollapsed`, `onStartCall`, `onOpenSettings`.

**One responsibility:** Owns the entire channel-list navigation surface — loading channel data, filtering/searching across all channel types (DM, group, public, favorites, archived), section collapse state, the collapsed-rail variant, and the three action dialogs (new DM, new group, search). Every piece of state is read or toggled by the same filter query. The dialogs (`NewDMDialog`, `NewGroupDialog`, `ChatSearchDialog`) are already in separate files; what remains is the navigation rendering tree that references every section through a shared `filteredChannels` list. A split would require either a context (new indirection layer) or threading `filteredChannels`, `favorites`, `groups`, `dms`, `publicChannels`, `onlineUserIds` and five collapse booleans into child components — more lines added than removed.

**Owner:** Lane A11. Exception recorded here so the file-size contract has a documented reason rather than a silent violation. The correct follow-up is introducing a `ChatSidebarContext` that holds the derived lists and collapse state, after which the rendering sections become standalone components with stable interfaces.

#### `features/chat/huddle-panel.tsx` — 513 lines

**Interface:** `HuddlePanel({ huddle, channelId, currentUserId })` is the floating call panel that appears when the current user is in a huddle.

**One responsibility:** Implements the full lifecycle of a live audio/video huddle session — WebRTC peer management (`useWebRTCHuddle`), Ably realtime event subscription (`useHuddleEvents`), mute/deafen/screen-share/raise-hand controls, heartbeat keep-alive, device selection, participant roster, invite flow, and the expand/collapse toggle. Every sub-panel (chat, screenshare, audio levels, participant cards) is already in a separate file. The remaining body is a single coordinated state machine: no sub-section can stand alone because all controls mutate shared WebRTC and Ably state. Extracting the UI controls would require passing the WebRTC handle and all mutation hooks down, producing a prop object larger than the component it would replace.

**Owner:** Lane A11. Exception recorded here. The correct follow-up is introducing a `HuddleContext` holding the WebRTC/Ably state so that control sub-components can read it without prop-drilling.

#### `features/calendar/calendar-view.tsx` — 506 lines

**Interface:** `CalendarView()` is the top-level component for the `/calendar` route — no props (it reads search params directly).

**One responsibility:** Orchestrates the full unified calendar surface: date/view navigation, range-scoped event fetching from four sources (internal, external/OAuth, HR, attendance), source visibility toggles, slot selection guards, the create-event/create-ticket/slot-choice dialogs, event detail sheets for three source types, account management sheet, and OAuth connection finalization from URL params. All dialogs and sheets are already extracted. What remains is the orchestration layer that coordinates those 12 interrelated state variables and the data fetch range derived from them. A split of JSX alone produces a forwarding wrapper (`CalendarOverlays` that receives every handler and every open/close boolean) with no responsibility reduction.

**Owner:** Lane A11. Exception recorded here. The correct follow-up is introducing a `useCalendarViewState` hook (state + handlers, ~200 lines) that the render function consumes — this is a clean split because the hook owns no JSX and the component owns no state.

---

## 4. Import Cleanup

| File | Removed unused imports |
|---|---|
| `notifications-admin.ts` | `useInfiniteQuery`, `QueryKey`, `SHARED_UNREAD_PARAMS`, `toStringParams`, 12 unused type imports |
| `notifications-templates.ts` | `useInfiniteQuery`, `QueryKey`, `useSession`, `SHARED_UNREAD_PARAMS`, `useNotificationInboxInvalidation`, 20 unused type imports |
| `notifications-broadcasts.ts` | `useInfiniteQuery`, `QueryKey`, `useSession`, `SHARED_UNREAD_PARAMS`, `useNotificationInboxInvalidation`, 20 unused type imports |
| `mail-compose-sheet.tsx` | `useId`, `Controller`, `Select*`, `Input`, `Label`, `EmailChipsInput` (all moved to header fields) |

---

## 5. Missing Catalog Keys

**NONE.** All 10 notification permission keys exist verbatim in both the frontend (`frontend/lib/rbac/permissions/notifications.ts`) and backend (`backend/src/modules/rbac/permissions/notifications.ts`) catalogs:

`notifications:events:view` · `notifications:events:manage` · `notifications:providers:view` · `notifications:providers:manage` · `notifications:policy:view` · `notifications:policy:manage` · `notifications:templates:view` · `notifications:templates:manage` · `notifications:broadcasts:view` · `notifications:broadcasts:manage`

---

## 6. Premise Verdicts

| Premise | Verdict |
|---|---|
| Admin hooks fire without `enabled` gate | VERIFIED TRUE — confirmed in source before edit |
| Keys exist in both catalogs | VERIFIED TRUE — confirmed by reading both files |
| Personal inbox hooks must stay universal | VERIFIED TRUE — root CLAUDE.md §8 explicitly names notifications as platform core |
| mail-compose-sheet.tsx was 541 lines | VERIFIED TRUE |
| channel-sidebar.tsx was 535, huddle-panel.tsx was 513, calendar-view.tsx was 506 | VERIFIED TRUE |

---

## 7. Validation Results

Commands run on 2026-08-30. All commands run from `D:/projects/personal/Streamlineos/frontend`.

### 1. `pnpm type-check`

```
> streamlineos@0.1.0 type-check D:\projects\personal\Streamlineos\frontend
> tsc --noEmit

app/(authenticated)/workflows/[workflowId]/page.tsx(169,15): error TS2339: Property 'total' does not exist on type 'WorkflowCursorPage<WorkflowExecution>'.
app/(authenticated)/workflows/executions/page.tsx(106,5): error TS2353: Object literal may only specify known properties, and 'page' does not exist in type 'ExecutionListParams'.
app/(authenticated)/workflows/executions/page.tsx(112,44): error TS2339: Property 'total' does not exist on type 'WorkflowCursorPage<WorkflowExecution>'.
app/(authenticated)/workflows/executions/page.tsx(200,50): error TS2339: Property 'total' does not exist on type 'WorkflowCursorPage<WorkflowExecution>'.
ELIFECYCLE  Command failed with exit code 2.
```

**Status: FAIL — 4 errors, all outside A11 ownership.**

Files: `app/(authenticated)/workflows/[workflowId]/page.tsx` and `app/(authenticated)/workflows/executions/page.tsx`. Both are under `app/` (lane A4) and the workflows domain (lane A9). None of my changed files are involved. The errors concern `WorkflowCursorPage<WorkflowExecution>.total` and `ExecutionListParams.page` — properties of the workflow execution type, unrelated to notifications, chat, calendar, mail, or wiki. These are pre-existing errors that must be fixed by lane A4/A9.

### 2. `pnpm check:query-scope`

```
> streamlineos@0.1.0 check:query-scope D:\projects\personal\Streamlineos\frontend
> node scripts/check-query-scope.mjs

✔  No query-scope violations found.
```

**Status: PASS**

### 3. `pnpm check:formatters`

```
> streamlineos@0.1.0 check:formatters D:\projects\personal\Streamlineos\frontend
> node scripts/check-no-local-formatters.mjs

✔  No local Intl.NumberFormat formatters found outside lib/format-utils.ts (4718 files scanned).
```

**Status: PASS**

### 4. `pnpm check:empty-states`

```
> streamlineos@0.1.0 check:empty-states D:\projects\personal\Streamlineos\frontend
> node scripts/check-no-handrolled-empty-states.mjs

✔  No hand-rolled empty states found outside EmptyState.
```

**Status: PASS**

### 5. `pnpm check:effect-fetches`

```
> streamlineos@0.1.0 check:effect-fetches D:\projects\personal\Streamlineos\frontend
> node scripts/check-no-effect-fetches.mjs

✔  No useEffect-driven API fetches found.
```

**Status: PASS**

### 6. `pnpm check:icon-labels`

```
> streamlineos@0.1.0 check:icon-labels D:\projects\personal\Streamlineos\frontend
> node scripts/check-no-unlabeled-icon-buttons.mjs

✔  No icon-only buttons without an accessible name found.
```

**Status: PASS**

### 7. Jest — notification|chat|calendar|mail|wiki

```
PASS features/calendar/calendar-source-panel.test.tsx
PASS features/notifications/notification-bell.test.tsx
PASS features/calendar/calendar-toolbar.test.tsx
PASS features/calendar/calendar-accounts-sheet.test.tsx
PASS features/calendar/calendar-month-year-picker.test.tsx
PASS features/mail/mail-accounts-sheet.test.tsx
PASS features/chat/__tests__/use-network-quality.test.ts
PASS features/calendar/use-calendar-connections.test.ts
PASS features/calendar/event-form-state.test.ts
PASS features/chat/chat-mobile-chrome-layout.test.ts
PASS features/chat/chat-shell.test.tsx

Test Suites: 12 passed, 12 total
Tests:       41 passed, 41 total
Snapshots:   0 total
Time:        13.772 s, estimated 16 s
Ran all test suites matching /notification|chat|calendar|mail|wiki/i.
```

**Status: PASS — 12 suites / 41 tests, all green.**

---

## 8. Files Changed

| Path | Change |
|---|---|
| `frontend/hooks/api/notifications-admin.ts` | Added `useCan` gate to 3 admin query hooks; added `!!orgId` gate to 2 personal query hooks; removed 12 unused type imports + 3 unused function imports |
| `frontend/hooks/api/notifications-templates.ts` | Added `useCan` gate to `useNotificationTemplates`; removed 20 unused imports |
| `frontend/hooks/api/notifications-broadcasts.ts` | Added `useCan` gate to `useBroadcasts`; removed 20 unused imports |
| `frontend/features/mail/mail-compose-header-fields.tsx` | NEW — 267 lines, owns From/To/CC/BCC/Subject fields UI |
| `frontend/features/mail/mail-compose-sheet.tsx` | Split: 541 → 319 lines; replaced header fields JSX with `<MailComposeHeaderFields>`; converted inline `onOpenChange` arrow to named `handleOpenChange` |
