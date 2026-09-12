# FD1 — Calendar & Chat scoped request inventory

Source audit: 2026-09-12. Read-only; no files modified.

---

## 1. Confirmed defect (a) — Chat channel drain up to 20 pages per mount

**VERIFIED.**

`frontend/hooks/api/chat-core-read.ts:93`
```ts
export const MAX_CHANNEL_PAGES = 20;
```

`drainChannelPages` at lines 95–122 runs a `for (let page = 0; page < MAX_CHANNEL_PAGES; page += 1)` loop. Each iteration fires `apiClient.get(path, cursor ? {cursor} : undefined, signal, contract)` — one HTTP GET per iteration. The loop exits early only if `result.nextCursor === null` or a cursor repeats. The comment at lines 80–87 confirms the route returns one keyset page of **50 channels** per request.

**Constants:**
- Page cap: `MAX_CHANNEL_PAGES = 20` (`chat-core-read.ts:93`)
- Page size: 50 channels per server response (comment `chat-core-read.ts:82`)
- Worst-case requests per mount: **20 GETs** to `/chat/channels` (plus up to 20 more for archived, 20 for public if those hooks fire)
- Worst-case channels loaded: **1,000** for `useChatChannels`
- Response bytes: UNVERIFIED (backend unreadable); at even 2 KB/channel the worst case is ~2 MB ingested per mount

**Consumers that only need a small list** — all three share the same `queryKey` and receive the same drained array:

| Consumer | File:line | What it actually needs |
|---|---|---|
| `ChatChannelCombobox` | `components/ui/chat-channel-combobox.tsx:29` | First `MAX_CHANNEL_OPTIONS = 50` channels for a search dropdown (`chat-channel-combobox.tsx:9`) |
| `GlobalNotifications` | `features/chat/chat-ably-suite.tsx:21` | Channel list for notification routing — only needs membership, not the full set |
| `ForwardMessageDialog` | `features/chat/forward-message-dialog.tsx:39` | Filtered subset to pick a destination (`enabled: open`) |

The drain is sequential (cursor-driven), so it is not parallel HTTP — it is a single-consumer waterfall of up to 20 serial GETs. TanStack coalesces concurrent subscribers to the same key into one in-flight request, so multiple mounts (sidebar + ably-suite) do not multiply the drain, but each fresh mount after cache expiry (staleTime 300s) re-drains. The `refetchOnWindowFocus: true` on `useChatChannels` (line 134) can trigger a re-drain on focus.

---

## 2. Confirmed defect (b) — Calendar member search key omits `limit`

**VERIFIED.**

`frontend/hooks/api/calendar.ts:79–88`:

```ts
queryKey: isSearch
  ? platformHierarchyQueryKeys.calendar.memberSearch(term)  // ["streamlineos","calendar","memberSearch",term]
  : platformHierarchyQueryKeys.calendar.orgMembers(),
queryFn: ({ signal }) =>
  apiClient.get<CalendarOrgMember[]>(
    "/org/members",
    isSearch ? { search: term, limit: limit ?? 25 } : undefined,
    signal,
    calendarOrgMembersContract,
  ),
```

The key factory (`frontend/lib/query-keys/platform-hierarchy.ts:13–15`):
```ts
memberSearch: (search: string) =>
  [...base, "calendar", "memberSearch", search] as const,
```

`limit` is accepted by the hook signature but is **absent from the key** while being embedded in the request. Two callers passing `{ search: "alice", limit: 10 }` and `{ search: "alice", limit: 50 }` would get the same cache entry — whichever ran first wins, silently returning fewer results to the second caller.

**Existing org/user scope:** The key array has no `orgId` or `userId` segment — per `frontend/CLAUDE.md §2` this is correct. Scope is in the query **hash**, not the array, via `scopedQueryKeyHashFn` installed by `createAppQueryClient` (`components/providers/query-provider.tsx:79`). Adding `orgId`/`userId` to the array would break prefix-based `invalidateQueries`. **Must NOT be changed.**

**Current search callers:**
- `features/calendar/event-attendees-picker.tsx:36` — passes `{ search: debouncedSearch, enabled: hasSearch }` with no explicit `limit`, so all use default 25. No active collision today, but the contract is broken.

---

## 3. Calendar events key — by-design date-range-only

The `useCalendarEvents` key (`platform-hierarchy.ts:6–9`) has an optional `sources` param but `calendar.ts:99–103` never passes it. Source toggles (`hrEventsVisible`, `crmEventsVisible`, `attendanceEventsVisible`) are applied **client-side** via `useCalendarComputed` in `calendar-view.tsx:229`. The test at `hooks/api/calendar-source-key.test.ts:49–56` explicitly asserts: "key is the date range only, stable across source changes." This is intentional; the key is **correct** — no repair needed.

---

## 4. Module-specific calendar pages

**No module-specific calendar pages found.** Only `app/(authenticated)/calendar/page.tsx` exists, rendering `<CalendarView />` directly. No `/hr/calendar`, `/build/calendar` or other module paths. Compliant with `CLAUDE.md §8`.

---

## 5. Full request inventory

Default provider: staleTime 2 min (120 000 ms), gcTime 10 min (600 000 ms), `refetchOnWindowFocus: false` (`query-provider.tsx:74–77`).

### 5a. Calendar journey (`/calendar`)

| Screen / component (file:line) | Hook | Canonical query key (factory call) | API route + method | Trigger | staleTime / gcTime | Enabled / gating | AbortSignal | Verdict | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| `calendar-view.tsx:171` | `useCalendarEvents(rangeStart, rangeEnd)` | `platformHierarchyQueryKeys.calendar.events(start, end)` → `["streamlineos","calendar","events",start,end]` | GET `/calendar/events?start=&end=` | mount, range change | 2 min / 10 min (explicit `2 * 60 * 1000`) | `canView` (`calendar:read`) | yes | KEEP | `calendar.ts:97–112` |
| `calendar-view.tsx:211` | `useExternalCalendarEvents(rangeStart, rangeEnd, flag)` | `platformHierarchyQueryKeys.calendar.externalEvents(start, end)` → `["streamlineos","calendar","externalEvents",start,end]` | GET `/calendar/external-events?start=&end=` | mount (enabled while connections loading or >0 active) | 60 s / 10 min | `canView && (connectionsLoading \|\| activeConnectionCount > 0)` | yes | KEEP | `calendar.ts:142–157` |
| `calendar-source-panel.tsx:69` | `useCalendarSources()` | `platformHierarchyQueryKeys.calendar.sources()` → `["streamlineos","calendar","sources"]` | GET `/calendar/sources` | mount | 30 s / 10 min | `canView` (`calendar:read`) | yes | KEEP | `calendar.ts:114–123` |
| `use-calendar-source-deeplink.ts:24` | `useCalendarSources()` | SAME as above | GET `/calendar/sources` | mount (always — inside calendar view) | 30 s / 10 min | `canView` | yes | CONSOLIDATE — TanStack coalesces; 1 HTTP, 2 React mounts | `calendar.ts:114` |
| `event-attendees-picker.tsx:36` | `useCalendarMemberLookup({ search, enabled: hasSearch })` | `platformHierarchyQueryKeys.calendar.memberSearch(term)` → `["streamlineos","calendar","memberSearch",term]` (when searching) | GET `/org/members?search=&limit=25` | user action (search, debounced 300 ms) | 30 s / 10 min | `canView && hasSearch` | yes | **REPAIR** — `limit` absent from key; `calendar.ts:79–88` | `event-attendees-picker.tsx:36` |
| `use-event-create-dialog.ts:70` (inside `EventCreateDialog`) | `useCalendarMemberLookup()` | `platformHierarchyQueryKeys.calendar.orgMembers()` → `["streamlineos","calendar","orgMembers"]` | GET `/org/members` | mount (dialog conditionally mounted: `{isCreateOpen && <EventCreateDialog>}` at `calendar-view.tsx:396`) | 5 min / 10 min | `canView` | yes | KEEP — lazy (dynamic import, conditional render) | `calendar-view.tsx:63,396` |
| `crm/tasks/page.tsx:156` | `useCalendarMemberLookup()` | `["streamlineos","calendar","orgMembers"]` | GET `/org/members` | route mount (CRM tasks page) | 5 min / 10 min | `canView` (`directory:people:view`) | yes | KEEP — coalesces with above when warm | `crm/tasks/page.tsx:156` |
| `interview-form-sheet.tsx:55` | `useCalendarMemberLookup()` | `["streamlineos","calendar","orgMembers"]` | GET `/org/members` | sheet mount (HR recruitment) | 5 min / 10 min | `canView` | yes | KEEP — same key, coalesces | `interview-form-sheet.tsx:55` |

### 5b. Chat journey (route `/chat/*` and cross-route consumers)

| Screen / component (file:line) | Hook | Canonical query key (factory call) | API route + method | Trigger | staleTime / gcTime | Enabled / gating | AbortSignal | Verdict | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| `app-sidebar.tsx:194` (shell, every route) | `useChatUnreadTotal(...)` | `collaborationQueryKeys.chat.unreadTotal()` → `["streamlineos","chat","unreadTotal"]` | GET `/chat/unread` | mount + `refetchOnWindowFocus: true` | 300 s / 10 min | `!!orgId && chatEnabled && canReadChat` | yes | KEEP | `chat-core-read.ts:226–238` |
| `chat-ably-suite.tsx:21` (chat route) | `useChatChannels()` | `collaborationQueryKeys.chat.myChannels()` → `["streamlineos","chat","myChannels"]` | GET `/chat/channels` drain ≤20 GETs | mount (chat route) + `refetchOnWindowFocus: true` | 300 s / 10 min | `!!orgId && chatEnabled && canRead` | yes | **REPAIR** — drain + no consumer needs all 1 000 channels | `chat-core-read.ts:124–137`, `chat-ably-suite.tsx:21` |
| `channel-sidebar.tsx:92` (chat route) | `useChatChannels()` | SAME as above | same drain | mount | 300 s / 10 min | `!!orgId && chatEnabled && canRead` | yes | **REPAIR** (coalesces with ably-suite; still triggers drain on first mount) | `channel-sidebar.tsx:92` |
| `channel-sidebar.tsx:93` | `useArchivedChannels()` | `collaborationQueryKeys.chat.archivedChannels()` → `["streamlineos","chat","archivedChannels"]` | GET `/chat/channels/archived` drain ≤20 GETs | mount (chat route) | 2 min / 10 min | `canRead` | yes | **REPAIR** — sidebar only shows archived when `showArchived` is true; drain fires even before toggle | `chat-core-read.ts:139–152`, `channel-sidebar.tsx:93` |
| `channel-sidebar.tsx:94` | `useChatOnlineUsers()` | `collaborationQueryKeys.chat.onlineUsers()` → `["streamlineos","chat","onlineUsers"]` | GET `/chat/presence/online` | mount + `refetchInterval: 60 s` | 65 s / 10 min | `canRead` | yes | KEEP | `chat-core-read.ts:240–249` |
| `use-message-panel-data.ts:52` (open channel) | `useChatChannel(channelId)` | `collaborationQueryKeys.chat.channel(channelId)` | GET `/chat/channels/${channelId}` | mount | 2 min / 10 min | `canRead && channelId > 0` | yes | KEEP | `chat-core-read.ts:169–177` |
| `use-message-panel-data.ts:65` | `useChatMessages(channelId)` | `collaborationQueryKeys.chat.messages(channelId)` | GET `/chat/channels/${channelId}/messages` (infinite, load-more on scroll) | mount | provider default 2 min / 10 min | `canRead && channelId > 0` | yes | KEEP | `chat-core-read.ts:179–193` |
| `use-message-panel-data.ts:78` | `useChatOnlineUsers()` | SAME as sidebar | GET `/chat/presence/online` | mount | 65 s / 10 min | `canRead` | yes | CONSOLIDATE — 2nd React mount of same key; TanStack coalesces | `use-message-panel-data.ts:78` |
| `use-message-panel-data.ts:135` | `useChatOrgUsers()` | `collaborationQueryKeys.chat.orgUsers()` → `["streamlineos","chat","orgUsers"]` | GET `/chat/users` | mount | 2 min / 10 min | `canRead` | yes | KEEP | `chat-core-read.ts:251–259` |
| `channel-info-panel.tsx:82` | `useChatChannel(channelId)` | same as `use-message-panel-data.ts:52` | same | mount (info panel) | 2 min / 10 min | `canRead && channelId > 0` | yes | CONSOLIDATE — coalesces | `channel-info-panel.tsx:82` |
| `channel-info-panel.tsx:83` | `useChatOnlineUsers()` | same as `channel-sidebar.tsx:94` | same | mount | 65 s / 10 min | `canRead` | yes | CONSOLIDATE — 3rd React mount of same key | `channel-info-panel.tsx:83` |
| `use-message-panel-data.ts:227` | `useChatPoll(channelId, since, !ablyConnected)` | `collaborationQueryKeys.chat.poll(channelId, since)` | GET `/chat/channels/${channelId}/messages/poll` | interval (30 s) only while Ably disconnected | 2 min / 10 min | `!ablyConnected && canRead && channelId > 0` | yes | KEEP — correct fallback gating | `chat-core-read.ts:205–224` |
| `components/ui/chat-channel-combobox.tsx:29` (support ticket detail, build goals) | `useChatChannels()` | `["streamlineos","chat","myChannels"]` (same as sidebar key) | drain ≤20 GETs | mount (support ticket-detail-sheet, build goal-form-sheet) — no `enabled` guard | 300 s / 10 min | none (no `enabled` prop) | yes | **REPAIR** — fires full drain on Support and Build routes; add `enabled` guard or use a bounded variant | `chat-channel-combobox.tsx:29`, `ticket-external-links-section.tsx:109`, `goal-form-sheet.tsx:53` |
| `channels-discovery-page.tsx:27` | `usePublicChannels(true)` | `collaborationQueryKeys.chat.publicChannels()` → `["streamlineos","chat","publicChannels"]` | GET `/chat/channels/public` drain ≤20 GETs | mount (channels discovery page only) | 2 min / 10 min | `canRead` | yes | **REPAIR** — drains all public channels; discovery page only needs a browsable first page | `chat-core-read.ts:154–167` |

---

## 6. Three separate counts

### Duplicate HTTP requests: **0**

No two distinct query keys hit the same API endpoint with equivalent effective params simultaneously. All same-key consumers coalesce (TanStack deduplicates in-flight requests). The drain loop (≤20 sequential GETs per `drainChannelPages` call) is a sequential waterfall within one hook's `queryFn`, not simultaneous duplicate requests from two hooks.

### Repeated SQL — named endpoints (SQL counts UNVERIFIED, backend unreadable)

| Endpoint | Repetition driver | Estimated backend cost |
|---|---|---|
| `GET /chat/channels` | drain re-runs 20 queries to `chat_channels` on cache expiry or focus | ≤20 DB reads per mount |
| `GET /chat/channels/archived` | same drain on `useArchivedChannels` | ≤20 DB reads per mount |
| `GET /chat/channels/public` | same drain on `usePublicChannels` | ≤20 DB reads per mount |
| `GET /org/members` | called from CRM tasks, HR interviews, calendar create, attendees picker — all share key; WARM cache coalesces; COLD each fires one query | 1 DB read per cold mount |
| `GET /chat/presence/online` | polled every 60 s from up to 3 React mounts (all coalesced) | 1 DB read per interval |

### Duplicate React subscriptions: **5 coalescing pairs (0 extra HTTP)**

All pairs share the exact query key and are coalesced by TanStack into a single in-flight request. Extra React hook mounts are architectural noise but not correctness defects.

| Key | React mount count on open channel | Extra HTTP |
|---|---|---|
| `useChatOnlineUsers()` | 3 (sidebar, message-panel, info-panel) | 0 |
| `useChatChannels()` | 2 (ably-suite + sidebar) | 0 |
| `useChatChannel(channelId)` | 2 (message-panel + info-panel) | 0 |
| `useChatOrgUsers()` | up to 4 (message-panel + thread-panel + saved-messages + add-members-dialog when open) | 0 |
| `useCalendarSources()` | 2 (source-panel + source-deeplink hook) | 0 |

---

## 7. Calendar range key canonicality

The `events` key is `["streamlineos","calendar","events", startISO, endISO]` (no sources, no timezone, no projection segment). Source toggles are client-side filters (verified: `calendar-view.tsx:229` `useCalendarComputed({ hrVisible, crmVisible, attendanceVisible })`). The test at `hooks/api/calendar-source-key.test.ts:49–56` asserts this is intentional. The key is **canonical for the request it makes** — all enabled sources come from the server; the client filters. No REPAIR needed.

The key does NOT include timezone. If the backend interprets `start`/`end` as UTC ISO strings (they are passed as `.toISOString()`), this is correct. If the backend supports a `timezone` param that changes returned events, the key would need it. UNVERIFIED (backend unreadable).

---

## 8. Realtime subscription count on open channel

Three distinct Ably subscriptions when a channel is open:

1. **Presence channel** — `useChatPresence()` at `features/chat/use-chat-presence.ts:21`, subscribes to `chatPresenceChannelName(orgId, userId)` (org-wide presence heartbeat)
2. **Message channel** — `useChatRealtime(channelId)` at `hooks/api/chat-realtime.ts:116`, subscribes to `chatChannelName(orgId, channelId)` for 5 events: `message`, `typing`, `message:updated`, `message:deleted`, `reaction:updated`
3. **Huddle channel** — `useHuddleRealtime(channelId)` at `features/chat/huddle-realtime.ts:23`, subscribes to the same `chatChannelName` for huddle lifecycle events

All three are distinct Ably channel/event combinations. No duplicates found. No Ably subscription fires from the shell (app-sidebar or authenticated layout) — all three are scoped to the chat route via `ChatAblySuite` and `useMessagePanelData`.

---

## 9. Is the message-list drain on the shell or only on the chat route?

`useChatChannels()` fires from:
- `chat-ably-suite.tsx:21` → mounted only inside `chat-home-page.tsx:219`, which is only rendered on the `/chat` route
- `channel-sidebar.tsx:92` → only rendered on the `/chat` route  
- `chat-channel-combobox.tsx:29` → **fires on Support route** when a ticket detail sheet with a `chat_channel` link type is opened (`ticket-external-links-section.tsx:107–116`), and on Build route when a goal-form-sheet is opened (`goal-form-sheet.tsx:53`)

`useChatUnreadTotal()` is in the shell (app-sidebar) and fires on every authenticated route — this is a single lightweight GET to `/chat/unread`, not a drain.

**The full drain is NOT in the initial shell waterfall.** It fires on chat-route navigation, and also on Support and Build routes when certain sheets open.

---

## 10. Top 5 REPAIR items

| # | File:line | Issue | Repair |
|---|---|---|---|
| 1 | `chat-core-read.ts:93–136` | `useChatChannels` drains ≤20 pages (up to 1 000 channels, ≤20 serial GETs) on every cache-cold mount, including from `ChatChannelCombobox` which shows only the first 50 | Introduce a bounded variant (e.g. `useChatChannelsList(limit: number)`) that stops after page 1 for combobox/notification consumers; keep the drain only where the full set is required (sidebar) |
| 2 | `calendar.ts:79–88` | `memberSearch` key is `[..., "memberSearch", term]` but the request embeds `limit: limit ?? 25`; two callers with different limits share the same cache entry | Add `limit ?? 25` to the key: `memberSearch(search, limit)` at `platform-hierarchy.ts:13` and the call site at `calendar.ts:79` |
| 3 | `chat-core-read.ts:139–152` | `useArchivedChannels` drains ≤20 pages unconditionally on chat-sidebar mount; sidebar only shows archived when `showArchived` toggle is active | Pass `enabled: showArchived` from `channel-sidebar.tsx:93` so the drain only runs after the user expands archived channels |
| 4 | `chat-channel-combobox.tsx:29` | `useChatChannels()` has no `enabled` prop — fires the full drain when combobox is rendered anywhere (Support ticket detail, Build goal form) | Add an `enabled?: boolean` prop to `ChatChannelCombobox` and thread it into `useChatChannels(enabled)` at line 29; callers that open it via a dialog should pass `enabled: open` |
| 5 | `chat-core-read.ts:154–167` (`usePublicChannels`) | Channels discovery page fires full ≤20-page drain of public channels; discovery only needs a browsable first page | Use `useInfiniteQuery` (consistent with messages) or add a `firstPageOnly` mode, loading more on demand |

---

## 11. UNVERIFIED items

- **Response payload size** per channel drain page — backend unreadable; estimate only
- **Timezone handling** in `/calendar/events` — whether the backend interprets ISO-string start/end in org-local time; if it accepts a `tz` param the key is incomplete
- **SQL query count** per drain call — backend unreadable; named endpoint cost is directional only
- **`channel-info-panel` mounting strategy** — whether it is always mounted (hidden via CSS) or conditionally rendered; if always mounted, the 3rd `useChatOnlineUsers` and 2nd `useChatChannel` mount is unconditional, not conditional on the panel being open

---

*Anchors checked against source at revision recorded in git status (branch: main, 2026-09-12).*
