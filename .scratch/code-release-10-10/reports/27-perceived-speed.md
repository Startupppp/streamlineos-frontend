# Ticket 27 — perceived speed, lazy loading, virtualization

**6 of 7 boxes closed** (box 4 closed in session 3, below; box 6 remains open and needs a real
browser). Everything below was run and read; numbers are from the command named beside them.

---

## Method — the map I worked from

I built a module-graph walker (static edges only, `import type` and `.css` excluded because the
bundler erases them) and ran it from all **640** route entries under `app/**`. That turns "is this
lazy?" from an opinion into a fact, and it is what caught that four of the repo's existing
`next/dynamic` boundaries were being bypassed by a sibling static import.

The walker is now a committed gate: **`frontend/features/__tests__/heavy-module-lazy-boundaries.test.ts`**.
I ran a negative control on it — adding `ably` to its list fails it with the exact offending files —
so it detects a regression rather than passing vacuously.

---

## Box 1 — request waterfalls ✔

Five **avoidable** waterfalls removed. In each, the second request's input was already in scope as
a route param or prop, and the code still waited for a round-trip that could not supply it.

| File | Was | Now |
|---|---|---|
| `features/calendar/calendar-view.tsx` | `/calendar/external-events` waited for `/integrations/connections` purely to ask "is it worth it" | fires optimistically while connections load, suppressed only once we *know* the count is 0 |
| `features/build/whiteboard/whiteboard-page.tsx` | board detail waited for the board *list* even when the URL named the board | falls back to `chosenBoardId` (the deep link) |
| `features/build/ticket-details/ticket-detail-page.tsx` | `useEpics/useModules/useCycles/useProjectBoardTickets` — all keyed on `projectId` alone — sat behind two ticket round-trips | warmed at page level; mobile keeps the drawer lists off via the hooks' own `!!projectId` gate, so no request is *added* |
| `features/build/cycles/cycle-detail-page.tsx` | `useTicketColumnCounts(projectId)` mounted only after the loading guard | warmed above the guard |
| `features/sign/builder/envelope-builder.tsx` | `useState` + `useEffect` relay before the preview could be queued | derived, so the preview starts in the envelope's own render |

Nine further chained reads were checked and are **inherent** — the second call is keyed on a value
only the first can produce (`employmentId` from `userId`, `country` from the org payroll policy,
`clientId` from the invoice, the stream token, the upload key). Two classes that *look* like
waterfalls are not: `useSession()` gates are free (the server session is passed into
`SessionProvider` in `app/layout.tsx`) and `useCan`/`useAccess` gates are free (`prefetchAccess()`
hydrates them in the authenticated layout). That is ~40 grep hits that should not be chased.

## Box 2 — bounded, authorized prefetch ✔

**The defect:** the sidebar renders one `<Link>` per authorized nav route — **354** across the
products, **57** for finance alone — at App Router's default, which prefetches every link that
enters the viewport. Each speculative RSC request re-runs the `(authenticated)` layout's session
and permission reads. One page load was fanning out into dozens of backend round-trips for routes
nobody opened. There was no explicit `prefetch` prop anywhere in the tree and no `router.prefetch`,
so this was invisible.

**The fix:** `components/layout/nav-intent-prefetch.ts` — `prefetch={false}` plus
`router.prefetch(href)` on hover / focus / touch, deduped per href for the life of the mount.
Applied to both sidebar nav items and the mobile overflow drawer. Keyboard focus prefetches too, so
tabbing is as fast as hovering. No route the sidebar has not already permission-filtered is ever
prefetched, so nothing tenant-specific is speculatively fetched.

`jest components/layout/__tests__/nav-intent-prefetch.test.tsx` → **5/5**: every link carries
`prefetch={false}`; **0** prefetches at rest; **1** for the hovered route; **1** after three hovers
of the same link.

## Box 3 — heavy surfaces lazy-loaded ✔

`jest features/__tests__/heavy-module-lazy-boundaries.test.ts` → **13/13**.

Twelve heavy libraries are now unreachable from any route without crossing a dynamic boundary.
What was eager before:

- **recharts** on 3 routes — `/build/[projectId]/reports` (5 sections), `/build/[projectId]/analytics`, `/settings/billing/ai-credits`. Fixed by extracting the recharts JSX into 5 new `*-chart.tsx` siblings behind `dynamic()` (matching the existing `hr/analytics` convention), a lazy façade over `project-charts-impl.tsx` that keeps the route's import specifier unchanged, and one `dynamic()` in the billing page.
- **@tiptap/react + starter-kit** — `features/hr/documents/document-editor-page.tsx` was the lone static importer of `TiptapEditor`; the other 11 call sites were already lazy.
- **@tiptap/html + starter-kit** — `features/wiki/lib/export-page.ts` loaded a whole editor to serve an export click; now `await import()` inside the handler.
- **react-easy-crop** — `components/ui/avatar-crop-dialog.tsx` on `/settings`, for a dialog that only opens after you pick a file.
- **papaparse** on 2 routes — the bank-import CSV parser and the sign bulk-send dialog; both now `await import()` at parse time.

`@excalidraw/excalidraw`, `@xyflow/react`, `platejs`, `pdfjs-dist` and `react-big-calendar` were
already correctly gated and the test now holds them there.

## Box 4 — large collections — **PARTIAL (5 of ~20)**

Closed:
- **`features/chat/new-dm-dialog.tsx` and `add-channel-members-dialog.tsx`** — `GET /chat/users`
  returns the **whole organisation with no cursor**, and both rendered every row into a fixed
  280–340px box. Now `features/chat/chat-user-virtual-list.tsx` (react-window v2). Test: 2,000
  users → **0** row buttons mounted, and the list keeps its `role="list"` + accessible name
  (react-window also supplies `aria-posinset`/`aria-setsize`, which the plain map did not).
- **The three grouped Build list-view paths** — a real defect: `ListView` capped its **flat** path
  at `LIST_RENDER_PAGE_SIZE` (100) but the DnD, flat-grouped and nested-grouped paths did not, so
  switching on `groupBy` silently mounted every autoloaded ticket (up to `BOARD_AUTOLOAD_LIMIT`,
  500). New `features/build/views/list-view-group-rows.tsx` gives every group the same cap plus a
  "Show N more (X of Y)". Drag indices stay correct because the visible slice starts at 0.
- **`features/build/tickets/ticket-activity-log.tsx`** — the endpoint returns the ticket's entire
  audit trail with no cursor; now paged 25 at a time.
- **`features/build/ticket-details/activity-feed.tsx`** — comments and every nested reply ride the
  ticket payload with **no pagination at all**; now paged 20 top-level at a time, and the page
  count expands so a **deep-linked comment (or its parent thread) is never hidden** — that was the
  correctness trap in capping this one.

Remaining, in priority order (each verified by reading the file *and* its hook):

| Surface | Why it matters | Shape |
|---|---|---|
| `features/chat/message-list.tsx` | infinite pages accumulate; thousands of messages | variable height, date-group nesting, sticky-bottom — needs a flattened row model first |
| `features/chat/channel-sidebar.tsx` | every channel rendered **twice** (compact rail + section) | fixed height; **and** `useChatChannels` throws `nextCursor` away, so it silently truncates — fix the hook first (ticket 28) |
| `features/chat/channel-members-section.tsx` | `channel.members` embeds the full member array | fixed height; needs its own sub-scroller |
| `features/chat/thread-panel.tsx`, `saved-messages-panel.tsx`, `shared-files-panel.tsx` | accumulating infinite queries | files panel is fixed-height and the easiest |
| `features/chat/chat-search-dialog.tsx` | three result lists with no `limit` and no slice | fixed height each |
| `features/build/views/gantt-view.tsx` | up to 500 SVG row groups | slice to the scroll band, not react-window |
| `features/build/inbox/inbox-list.tsx` | 100 unwindowed rows on a hot surface | near-fixed; note the repo already has `notification-virtual-list.tsx` — this second list missed it |
| `features/notifications/admin/notification-events-page.tsx` | the entire event catalog, grows with every feature | fixed height |
| `features/hr/employees/employees-list-page.tsx` | accumulating infinite pages; card branch is a responsive grid | needs a grid adapter; its table branch also has no `pagination` prop |
| `features/mail/mail-reading-pane.tsx` | whole thread, expand-on-click | variable height |
| `components/assistant/ask-os-chat-view.tsx` | full assistant history | variable height |

Cross-cutting: **`components/ui/data-table.tsx` windows neither branch** (`:318`, `:399`). When a
caller omits `pagination`, every row mounts. Windowing inside `DataTable` would cover a long tail
of call sites in one change — that is the highest-leverage remaining item and it is a shared
primitive, so it wants its own ticket.

## Box 5 — images, fonts, compression, async media ✔

- **0** raw `<img>` tags across `app/`, `features/`, `components/`; **31** `next/image` call sites.
- Fonts via `next/font/google` in `app/layout.tsx` — self-hosted, no render-blocking stylesheet.
- All **15** upload call sites are `await apiClient.upload(...)`. The only client-side media
  transformation is `canvas.toBlob` (async) in the avatar crop dialog and a small-canvas
  `toDataURL` in the signature pad. Nothing blocks the main thread.
- 12 `unoptimized` `next/image` sites remain; each is a tenant blob preview or a signed R2 URL
  where bypassing the optimizer is correct. Left alone deliberately.
- HTTP compression: `next.config.ts` does not disable Next's `compress` default. Explicit brotli is
  a proxy concern and `next.config.ts` belongs to **ticket 26**.

## Box 6 — measurement — **CLOSED** (was PARTIAL / BLOCKED)

Done: **render count measured, one avoidable rerender removed.** `ChannelListEntry` is rendered
twice per channel by the chat sidebar and re-rendered by every keystroke in its search box, while
all of its props are already referentially stable (`useMemo`'d lists and Sets, `useCallback`'d
handlers at `chat-home-page.tsx`). I wrote the test failing first: **4 renders for 3 unrelated
parent renders**; with `React.memo`, **1**. At ~100 channels × 2 placements that is ~200 avoidable
component renders per keystroke. This is the only place I added `memo` — per `frontend/CLAUDE.md`
§3, measured first.

**RESOLVED 2026-09-02 by ticket 26 — this box is now closed.** The three blocked items were taken
on ticket 26's authenticated production capture (build `qlh_3k7hMskrlYGND5MMp`, 12 routes covering
Home and the module journeys × 2 profiles × 8 repetitions = **192 samples**, 0 unauthorized,
0 off-route, 0 unusable, `routeFailures: 0`):

- **Hydration mismatches — 0 of 192**, read from the console over CDP, negative control in the
  driver's self-test. Reproduced at 0 of 72 on a second pass. The `MessageChannel`/jsdom blocker
  named below is real and is simply routed around: a real browser needs no polyfill.
- **Long tasks — desktop 0 ms p75 on every one of the 12 routes**; mobile at 4× CPU throttling
  **275 ms** profile-wide, worst `/dashboard` **408 ms**, best `/settings` 198 ms.
- **Memory — no leak, and the naive reading says there is one.** Read without forcing a collection
  the heap climbs monotonically across a session (59 MB → 362 MB over 12 navigations), which is
  exactly the shape of a retention leak. With `HeapProfiler.collectGarbage` immediately before every
  read, the same routes measure **13–17 MB, flat**, p75 15.5 MB desktop / 15.7 MB mobile.

Numbers, method and reproduction: `reports/26-web-vitals.md` §6 and §6a.

## Box 7 — server prefetch actually hydrates ✔ (the subtle one)

All **6** server prefetch factories — `access`, `roles`, `directory` workers, `hr` documents,
`hr` assets, `payroll` runs — build their client through `createServerQueryClient`, which installs
`scopedQueryKeyHashFn(authenticatedScope(orgId, userId))`. I did not take that on trust:
`lib/prefetch/hydration-contract.test.ts` runs each **real** factory, hydrates its dehydrated
snapshot into a `createAppQueryClient`, and asserts `getQueryData(key)` returns the payload — not
that the prefetch call happened. It carries its own negative control proving a plain `QueryClient`
lands an entry holding its data that the app can never look up.

`jest lib/prefetch` → 8 suites, **30 tests**, all pass. No new server prefetch was added, so
coverage is complete at 6 factories / 6 assertions. The sidebar intent prefetch is a *route* (RSC)
prefetch, not a Query prefetch, so it does not touch this contract.

---

## Gates run (output read)

| Gate | Result |
|---|---|
| `tsc --noEmit` (8 GB heap) | clean on every file I touched; see "not mine" below |
| `jest features/build features/chat features/calendar features/inbox features/mail features/notifications features/settings features/wiki features/accounting features/sign features/billing features/hr/documents features/__tests__ components/layout lib/prefetch` | **90 suites / 603 tests, all pass** |
| `jest features/__tests__/heavy-module-lazy-boundaries.test.ts` | 13/13 (+ negative control fails as designed) |
| `jest lib/prefetch` | 8 suites / 30 tests |
| `eslint` over all 36 changed source files | **0 errors, 4 warnings** — every warning pre-existing and none caused by this work (2 imports that were already unused before I opened the file, a `react-hooks/refs` and an `exhaustive-deps` that predate this ticket) |

## Red typechecks that are NOT mine

Three appeared mid-session in files I never opened, from concurrent agents:

1. **P1, since fixed by its owner:** `features/build/feedbucket/project-submissions-inbox.tsx:15` and
   `features/settings/organization/org-branding-section.tsx:28` each had
   `import { resolveImageUrl } from "@/lib/utils";` inserted **into the middle of a multi-line
   import block**, producing `TS1003/TS1005` syntax errors. Gone on a later run.
2. **Since fixed by its owner:** `components/ai/use-ai-inline-action.ts:9,28` — `Property 'status' does not
   exist on type 'AiInlineSession'` (×2).
3. **Since fixed by its owner:** `components/assistant/global-ask-os.tsx:439` — `Cannot find name 'handleRetrySend'`.

I did not touch any of them. All three were gone by my final run: `tsc --noEmit` at handoff
is clean apart from the 22 known stale `.next/types/validator.ts` errors. Recorded here only
so that a mid-session red typecheck in this window is not misattributed to ticket 27.

## For other agents

- **Ticket 28 (hooks / query) — P1 bundle leak.** `lib/ably.ts` and `features/chat/use-ably-connection.ts`
  are eagerly reachable from **27 routes**, including `/build/[projectId]/backlog` and `/support`,
  which have nothing to do with realtime. The chain is
  `hooks/api/index.ts → hooks/api/chat.ts → hooks/api/chat-entities.ts → { lib/ably.ts,
  hooks/common/use-realtime-poll-interval.ts → features/chat/use-ably-connection.ts }`. Ably weighs 9.2 MB on disk across its builds. The entry points are all in `hooks/**`, your territory: `chat-entities.ts` imports
  `reauthorizeAblyClients` at module scope, and eight `chat-*.ts` hook files import
  `useRealtimePollInterval`, which imports `ably/react` (also a `hooks/ → features/` import, which
  the repo's layering bans). Fix it there and my gate will hold it — add `"ably"` to
  `MUST_STAY_LAZY` in `features/__tests__/heavy-module-lazy-boundaries.test.ts` once it is clean.
- **Ticket 28 — `useChatChannels` (`hooks/api/chat-core-read.ts:48`) drops `nextCursor`.** The route
  returns `{ channels, nextCursor }` and the `select` throws the cursor away, so the chat sidebar
  silently truncates to one server page. Fixing it makes windowing the sidebar mandatory, so pair
  the two.
- **Ticket 26 (budgets / Web Vitals):** please take memory, long tasks and hydration mismatch on the
  Home and module journeys (box 6). Also worth an explicit `formats` in `next.config.ts` `images`
  and confirming brotli at the proxy.
- **New ticket suggestion:** window `components/ui/data-table.tsx` itself.

## Files changed (41) — all inside `frontend/`

**New source (9)**
`features/build/reports/{velocity,burnup,cfd,cycle-time,lead-time}-chart.tsx` ·
`features/build/analytics/project-charts-impl.tsx` ·
`features/build/views/list-view-group-rows.tsx` ·
`features/chat/chat-user-virtual-list.tsx` ·
`components/layout/nav-intent-prefetch.ts`

**New tests (5)**
`features/__tests__/heavy-module-lazy-boundaries.test.ts` ·
`components/layout/__tests__/nav-intent-prefetch.test.tsx` ·
`features/chat/chat-user-virtual-list.test.tsx` ·
`features/chat/channel-list-entry-renders.test.tsx` ·
`features/build/views/list-view-group-rows.test.tsx`

**Modified (27)**
`features/build/reports/{velocity,burnup,cfd,cycle-time,lead-time}-section.tsx` ·
`features/build/analytics/project-charts.tsx` ·
`features/build/views/{list-view.tsx,list-view-group.tsx}` ·
`features/build/tickets/ticket-activity-log.tsx` ·
`features/build/ticket-details/{activity-feed.tsx,ticket-detail-page.tsx}` ·
`features/build/cycles/cycle-detail-page.tsx` ·
`features/build/whiteboard/whiteboard-page.tsx` ·
`features/chat/{new-dm-dialog.tsx,add-channel-members-dialog.tsx,channel-list-entry.tsx}` ·
`features/calendar/calendar-view.tsx` ·
`features/billing/ai-credits-settings-page.tsx` ·
`features/hr/documents/document-editor-page.tsx` ·
`features/settings/settings-profile.tsx` ·
`features/wiki/lib/export-page.ts` · `features/wiki/components/page-document-toolbar.tsx` ·
`features/accounting/banking/lib/parse-csv.ts` ·
`features/sign/{bulk-send/create-bulk-send-dialog.tsx,builder/envelope-builder.tsx}` ·
`components/layout/sidebar/sidebar-section.tsx` ·
`components/layout/mobile/mobile-module-bottom-nav.tsx`

Nothing outside `features/**` and `components/**` was edited. `next.config.ts`, `scripts/`,
`hooks/**`, `lib/query*` and `app/(public)/**` were read only. No git command was run.

---

# Session 2 — boxes 4 and 6 (virtualization + measurement)

**Territory this session:** `features/{chat,notifications,directory,hr,build,calendar}` and the
shared `components/**` list/table primitives. **`features/inbox/**` and `features/mail/**` were
another agent's and were not touched**, so box 4's coverage below is six of the seven named
modules, not seven.

## The defect that mattered most: `components/ui/data-table.tsx` lost rows

The previous session's report said "`DataTable` windows neither branch — when a caller omits
`pagination`, every row mounts." **That is not what the code did, and the truth was worse.**

`getPaginationRowModel()` was attached unconditionally on the client branch with
`pageSize = clientPag?.pageSize ?? 50`, so the row model *was* sliced to 50. But the footer was
gated on `pagination !== undefined`:

```ts
const showPagination = pagination !== undefined && totalItems > 0 && (totalPages > 1 || …);
```

So a caller who omitted `pagination` got **50 rows and no way to reach row 51**. Silently. Across
**380 of 476** `<DataTable` call sites repo-wide, and **79 of the 97** inside my six trees — 34 of
which are fed by a genuinely unbounded array (accumulating `useInfiniteQuery`, or a hook that sends
no `limit` at all). `features/hr/employees/employees-list-page.tsx` is the clearest case: it has a
"Load more employees" button that appends a server page to an accumulating infinite query, into a
table that could never show past row 50.

I wrote the test first and watched it fail (4 of 5), then fixed the gate to
`totalItems > 0 && (totalPages > 1 || hasPageSizeControl)`. A table whose data fits one window is
unchanged — `totalPages === 1`, no footer — so the 300-odd small tables see no difference.

## What else changed in the primitive

| Change | Why |
|---|---|
| `aria-rowcount` on the table, `aria-rowindex` on header + body rows | a windowed table otherwise tells a screen reader "row 3 of 50" when it is row 3 of 4,000 |
| `role="navigation" aria-label="Pagination"` on `DataTablePagination` | the control had no landmark and no accessible name |
| `clientPage = Math.min(internalPage, clientPageCount - 1)` | a filter that shrinks the data left the reader on a dead page with the footer hidden (`totalPages === 1`), i.e. an empty table and no way back. **Negative control:** reverting just this line fails exactly one test, so it is load-bearing and not a duplicate of TanStack's `autoResetPageIndex` |
| header markup extracted to `components/ui/data-table-header.tsx` | it was duplicated verbatim between the loading and loaded branches; extracting it took the file **501 → 396 lines** and off the `check:file-sizes` over-500 list |

## Cursor correctness — proved, not assumed

The brief's constraint was that windowing must not duplicate or skip records at a page boundary,
and that changing filter or sort resets pagination. Four assertions in
`components/ui/__tests__/data-table-unbounded-rows.test.tsx`:

- **No second pager on a cursor page.** Every `CursorPageControls` surface in the repo pages at
  ≤ 50 (`directory` 20, accounting 25, the two largest at exactly 50), so `totalPages === 1` and
  the internal footer stays hidden. Verified by reading all 20-odd `PAGE_SIZE` constants, and
  pinned by a test that a 20-row page renders no pagination landmark.
- **Page boundary.** Replacing page one's rows with page two's renders page two from its first row;
  the assertion checks that no page-one row survives into the page-two render.
- **Sort resets position.** From the last page, sorting returns `aria-rowindex` to `2` (row 1).
- **Filter resets position.** 180 rows → last page → data shrinks to 10: all 10 render, from Row 0.

Plus a full walk: paging through 180 rows in 50s collects exactly 180 distinct rows, first `Row 0`,
last `Row 179` — no gap, no repeat.

## Chat

- **`channel-sidebar.tsx` + `channel-archived-section.tsx`.** The sidebar mounted **2N**
  `ChannelListEntry` per member — once in the compact rail, once in the section. And the previous
  report's note that `useChatChannels` "drops `nextCursor` and silently truncates" is **stale**: it
  now runs `drainChannelPages`, a `for(;;)` loop that pulls *every* cursor page into one array. The
  cursor bug is fixed and the render bug is therefore worse, not better. New
  `features/chat/channel-section-list.tsx` renders a 30-row page with `role="list"`, per-row
  `aria-posinset` and `aria-setsize` **set to the true total**, and a "Show N more (x of y)" reveal.
  It replaced five duplicated `.map` blocks. 9 assertions, including that a 500-channel member
  mounts 30 rows, that walking the reveals reaches channel 500 with no repeat, and that the first
  row is still the first tab stop.
- **`message-list.tsx`** — the item the previous session deliberately deferred. `useChatMessages`
  sends no `limit` and its pages accumulate, so a channel read back far enough mounts its entire
  history. Chat reads newest-last, so the window is a *tail*, and the whole change fits behind the
  hook — `message-list.tsx` itself is untouched, because `use-message-panel-data.ts` already owns
  `groupedMessages`, `hasNextPage` and `fetchNextPage`. "Load older messages" now widens the window
  before asking the server for another page, so it is still one control.
  **The trap was the unread divider.** It is drawn on one specific message; a window starting after
  it makes it vanish, telling the reader they have nothing unread when they do. `resolveMessageWindowStart`
  therefore always reaches back far enough to include it, and that is asserted directly.
- **`chat-search-dialog.tsx` is NOT a finding.** The previous report listed it as "three result
  lists with no limit and no slice". The backend caps them: `searchMessages` at 20,
  `searchChannels` and `searchUsers` at 10 each. Verified in
  `backend/src/modules/chat/chat-search.service.ts`. Nothing to do.

## Calendar, directory, notifications

- **Calendar is clean.** `calendar-events-panel.tsx` is already `react-window`; the grid is
  `react-big-calendar`; the remaining `.map`s are per-connection and per-attendee, structurally
  small. No change needed.
- **Directory is clean.** Both pages cursor-paginate at `PAGE_SIZE = 20` with `CursorPageControls`,
  and the cursor page *replaces* rather than accumulates. Verified rather than assumed — and this
  is exactly the surface my DataTable change had to not disturb.
- **Notifications** — the inbox is already `notification-virtual-list.tsx`. The admin tables
  (templates, providers, broadcasts, suppressions) are `DataTable` and are bounded by the fix above.
  `notification-events-page.tsx` maps a code-sized catalog and grows with features, not tenants.

## Box 6 — measurement

**The journey: HR employees list, grid view, three server pages loaded (60 employees), five
keystrokes in the search box.** `useInfiniteHrEmployees` accumulates, so the grid mounts one
`EmployeeCard` per employee ever loaded, and the page re-renders on every keystroke while every card
prop is already stable (`employees` is a `useMemo` over the query pages; `department` is a string).

Measured, test written failing first:

| | Card body renders |
|---|---|
| Mount | 60 |
| **5 keystrokes, before** | **+300** |
| **5 keystrokes, after `memo`** | **+0** |

This is the only `memo` I added, and it was measured first per `frontend/CLAUDE.md` §3.

The same file's grid was also unbounded, so `GRID_RENDER_PAGE_SIZE = 24` now bounds it and the
existing "Load more employees" button reveals cards already in hand before fetching — one control,
so nothing loaded is stranded behind a second one.

**What I could not measure, and exactly why:**

- **Memory** — `performance.memory` is Chrome-only; jsdom has no real heap. `process.memoryUsage()`
  measures the jest Node heap, which is not comparable to a browser's. Needs a browser.
- **Long tasks** — `PerformanceObserver` does not implement `entryTypes: ["longtask"]` in jsdom.
  Needs a browser.
- **Hydration mismatches** — I attempted a real harness rather than declaring it blocked:
  `renderToString` → `hydrateRoot` → collect `onRecoverableError` and hydration `console.error`,
  with a negative control component that drifts between server and client render. It cannot run
  here. `react-dom/server.browser` schedules through `MessageChannel`, which this jsdom environment
  does not define; polyfilling from `node:worker_threads` gets past the import and then **hangs the
  jest runner**, because the message ports keep the event loop alive and are never closed. Ticket 26
  should either add a `MessageChannel` polyfill that calls `port.unref()` in `jest.setup.js`, or
  take this on the real browser it already drives. I removed the spike rather than leave a hanging
  test in the tree.

`next build` was not run (the brief forbids it), so **no number here is a production measurement.**

## Gates run this session (output read)

| Command | Exit | Number |
|---|---|---|
| `pnpm -C frontend type-check` | **0** | **0** errors |
| `jest --runInBand --testPathPattern="features/(chat\|notifications\|directory\|hr\|build\|calendar)\|components/(ui\|shared)\|features/__tests__"` | 1 | **75/76 suites, 629/630 tests** — the one failure is not mine, see below |
| `jest --runInBand --testPathPattern="data-table-unbounded-rows"` | 0 | 12/12 |
| `jest --runInBand --testPathPattern="features/chat"` | 0 | 13 suites / 91 tests |
| `jest --runInBand --testPathPattern="employee-grid-renders"` | 0 | 2/2 (300 → 0) |
| `jest --runInBand --testPathPattern="message-render-window"` | 0 | 10/10 |
| `pnpm check:icon-labels` | **0** | 3796 files, 0 unlabelled icon buttons |
| `pnpm check:query-scope` | **0** | 5207 files, 0 violations |
| `pnpm check:effect-fetches` | **0** | 5207 files, 0 violations |
| `pnpm check:empty-states` | 1 | 1 violation, **not mine** — `features/workflows/builder/workflow-builder-canvas.tsx:118`, committed at `8e9c7a11c`, unmodified in the working tree, outside my territory |
| `pnpm check:over-300` | 0 | 519 of 5193 vs baseline 519 |
| `pnpm check:file-sizes` | 0 | `data-table.tsx` **left** the over-500 list (501 → 396) |
| `eslint` over the 14 changed files | 0 errors | **0 errors, 8 warnings**, all pre-existing lines in `use-message-panel-data.ts` (`scrollToBottomRef`, `pendingMentionsRef`, `setTicketSelectedIndex`) — verified present at `HEAD` |

**The one red test is not mine:** `features/hr/expenses/components/receipt-manager.storage-key.test.tsx`
expects `${API}/storage/image` and gets `/api/media/image`. It turns entirely on
`resolveImageUrl`/`storageObjectUrl` in `lib/utils.ts` — **ticket 28's territory** — and imports
nothing I touched. Both the test and `lib/utils.ts` are committed and unmodified in the tree.

## For other agents

- **Ticket 28 — `receipt-manager.storage-key.test.tsx` is red.** `storageObjectUrl` now returns
  `/api/media/image` while the spec still expects the absolute backend `/storage/image`. One of the
  two is wrong; both are in your territory.
- **Ticket 28 — `drainChannelPages` (`hooks/api/chat-core-read.ts:28`) is an unbounded `for(;;)`.**
  It fixes the dropped-cursor bug the previous report flagged, but it now pulls the member's entire
  channel set on mount with no ceiling. The rendering side is bounded now; the fetching side is not.
- **Ticket 26 — hydration.** The blocker is specific: `MessageChannel` is missing from jsdom and the
  `node:worker_threads` polyfill hangs the runner. Details above.
- **Still open in box 4:** `features/chat/{thread-panel,saved-messages-panel,shared-files-panel}.tsx`,
  `features/build/views/gantt-view.tsx`, `features/build/inbox/inbox-list.tsx`, and the CSV
  import/preview tables (bounded by upload size, not tenant size — a 5k-row CSV still mounts 5k rows).

## Files changed this session (14, all inside `frontend/`)

**Modified (7)** — `components/ui/data-table.tsx` · `components/shared/data-table-pagination.tsx` ·
`features/chat/channel-sidebar.tsx` · `features/chat/channel-archived-section.tsx` ·
`features/chat/use-message-panel-data.ts` · `features/hr/employees/employee-card.tsx` ·
`features/hr/employees/employees-list-page.tsx`

**New source (3)** — `components/ui/data-table-header.tsx` ·
`features/chat/channel-section-list.tsx` · `features/chat/message-render-window.ts`

**New tests (4)** — `components/ui/__tests__/data-table-unbounded-rows.test.tsx` ·
`features/chat/channel-section-list.test.tsx` · `features/chat/message-render-window.test.ts` ·
`features/hr/employees/employee-grid-renders.test.tsx`

Nothing outside `features/**` and `components/**` was edited. `features/inbox/**`, `features/mail/**`,
`features/**/ai*`, `lib/**`, `hooks/api/**`, `app/**` and `next.config.ts` were read only.

---

# Session 3 — box 4 closed

**Territory:** `features/chat/**`, `features/build/**` and the CSV preview tables.
**Not touched:** `components/**` (ticket 30), `lib/` and `hooks/api/` (ticket 28),
`features/inbox|mail/**`, `app/**`, `next.config.ts` (ticket 26). `features/inbox/**` was **read**
to settle whether it needed anything; it did not.

## The first thing I did was decide, per surface, which defect it had

The previous session's finding — that `DataTable` was *truncating*, not *over-rendering* — is the
reason each surface got audited before it got windowed. Two of the five remaining surfaces turned
out to be the opposite of what "virtualize" implies, and windowing them would have made them worse.

| Surface | Actual defect | Fix |
|---|---|---|
| `features/chat/{thread,saved-messages,shared-files}-panel.tsx` | unbounded on restore — `useInfiniteQuery` pages accumulate, so re-opening a panel mounts every page ever fetched | 25-row window, reveal-held-before-fetch |
| `features/chat/channel-members-section.tsx` | unbounded — `channel.members` rides the channel payload with no cursor and no cap | same window, per group |
| `features/build/views/gantt-view.tsx` | unbounded — one SVG `<g>` (4 nodes) per dated ticket, up to `BOARD_AUTOLOAD_LIMIT` = 500 | scroll-band window |
| `features/build/inbox/inbox-list.tsx` | **truncating** — one `limit: 100` read, no cursor, no pager: notification 101 unreachable | cursor read + window |
| `features/hr/expenses/import-validation-preview.tsx` | **truncating** — sliced to 50 *before* the table, so an invalid line 51 could never be shown | hand every row to `DataTable`, let it page |
| the other 7 CSV previews | already bounded | nothing |

Backend caps were read, not assumed: saved messages 30/page (`chat-saved.controller.ts`, capped at
100), channel files 20/page (`chat-channel-members-implementation.ts:460`), thread replies
`pageSizeField(50)`. All ≤ 50, so no surface sprouts a second pager.

## What each fix is

**`features/chat/panel-render-window.ts`** — one 25-row window shared by the four chat panels.
Two things make it more than a `.slice()`:

- **Reveal held rows before fetching.** A click widens the window if anything is held and only asks
  the server for another page when nothing is. One click therefore never both fetches a page and
  mounts it, and nothing is skipped between a reveal and the fetch after it. Asserted both ways:
  revealing fires **0** `fetchNextPage` calls, and a panel with nothing held fires exactly **1**.
- **The window resets on the surface's identity, in render, not in an effect.** Switching thread or
  channel goes back to the newest page (asserted). Written as a render-phase state adjustment rather
  than `useEffect` + `setState`, so it costs no extra commit and trips no `react-hooks` warning.

Saved messages and shared files window the head (newest-first); thread replies window the **tail**,
because the thread reads oldest-first and the newest reply is the one you came for. The tail window
covers every index exactly once as it widens — proved by walking it.

**`features/build/views/gantt/gantt-row-window.ts` + `gantt-ticket-rows.tsx`** — rows are positioned
absolutely by `computeBarGeometry`, so only the ones inside the scrolled band need to exist. The SVG
keeps its full height and the scrollbar its length, so nothing moves. 500 rows → **~24 mounted**,
and scrolling to row 200 mounts it. Writing the band test found a real bug in my own first cut:
`firstRow` was not clamped to `rowCount`, so a scroll past the content produced `firstRow` **5002**
against a 500-row board. Caught by "never runs past the last row", fixed before it shipped.

**`features/build/inbox/inbox-list.tsx`** — this was the data-loss one. `useNotifications(...,
limit: 100)` is a plain `useQuery` against a cursor route, so notification 101 did not exist as far
as the Build inbox was concerned, and the Mentions tab filtered that same fixed page client-side —
a mention older than the newest 100 notifications was unreachable, and the surface said "No
mentions" rather than "there are more pages". It now reads `useInfiniteNotifications`
(cursor-correct: its `getNextPageParam` uses the *lowest* id on the page, not the last element), and
the empty state no longer fires while `hasNextPage` is true.

## Accessibility — added, not traded

Every windowed list is a real `role="list"` with `role="listitem"` rows carrying `aria-posinset`.
`aria-setsize` is the true accumulated total, and **`-1` — the ARIA value for an unknown total —
while the cursor still has pages**, rather than a number that is confidently wrong. The thread
panel's tail window numbers a reply by its position in the whole thread (`aria-posinset="476"` for
the first visible row of 500), not by its position in the window.

The Gantt gained semantics it never had: its rows were bare `<g onClick>` with no role, no name and
no keyboard path at all. They are now `role="listitem"` inside a named list, with `aria-label`,
`tabIndex` and Enter/Space activation — a windowed row is keyboard-reachable where the unwindowed
one was not. `check:icon-labels` → exit 0 (3806 files).

## Cursor page sizes are now a test, not a reading

`features/__tests__/cursor-page-size-bounds.test.ts` replaces the previous session's hand-read
"all ~20 `PAGE_SIZE` constants are ≤ 50". It reads `DataTable`'s own default out of
`components/ui/data-table.tsx` (so it follows the primitive), scans **61** files that pair a
`<DataTable` with a cursor pager, resolves **27** page-size constants through `limit:`/`pageSize:`,
and asserts none exceeds the table's effective window. **0 violations.** It carries a negative
control: a synthetic surface with `const PAGE_SIZE = 80` is reported, and the same surface with
`pagination={{ pageSize: 80 }}` is not.

It resolves *named constants only*, deliberately. A first cut that also read inline `limit: 100`
literals flagged 5 files; I read all five and every one was a false positive (the literal belonged to
a different query in the same file — an aging widget, an export mutation). A gate that cries wolf
five times out of five is worse than no gate. The three I checked by hand are genuinely fine:
`general-ledger-page.tsx` pages at `GL_LIMIT = 50`, `vendor-payments-page.tsx` at `PAGE_SIZE = 25`,
`customers-page.tsx` passes `pagination={{ pageSize: 100 }}` to match its own 100-row cursor page.

## Gates run (output read)

| Command | Exit | Number |
|---|---|---|
| `jest --runInBand --testPathPattern="features/(chat\|build\|hr\|notifications\|__tests__)\|components/ui/__tests__"` | 0 | **60 suites / 526 tests pass** |
| negative control — chat panel window widened to 5000 | 1 | 10 of 16 fail |
| negative control — Gantt overscan widened to 5000 | 1 | 2 of 8 fail |
| `eslint` over all 21 files I touched | 0 | 0 errors, 3 warnings — all 3 pre-existing `react-hooks/refs` in `inbox-list.tsx`'s ref block, untouched by this work |
| `pnpm check:icon-labels` | 0 | 3806 files, 0 findings |
| `pnpm check:query-scope` | 0 | 5228 files, 0 findings |
| `pnpm check:effect-fetches` | 0 | 5228 files, 0 findings |
| `pnpm check:over-300` | 0 | 519 of 5224 (baseline 519) — was **521, red**, when I started |
| `pnpm check:file-sizes` | 1 | 3 files over 500, **none mine** — see below |
| `pnpm type-check` | 2 | 70 errors, **none in a file I touched** — see below |

## Red that is NOT mine

- **`type-check` went 0 → 1 → 70 errors during this session**, all from ticket 28's in-flight
  `hooks/api/**` work landing under me. The signature is unmistakable:
  `Property 'data' does not exist on type 'NonNullable<NoInfer<TQueryFnData>>'` (×many) plus
  `OrgMember` / `Role` / `Payment` assignability failures in the callers of `hooks/api/roles.ts`,
  `hooks/api/access/*`, `hooks/api/accounting/banking.ts`, `hooks/api/subscription.ts`.
  26 files are affected; **zero** are files I wrote or edited. Two sit under `features/build/`
  (`approvals/project-approvals-page.tsx`, `members/pm-access-sheet.tsx`) — nominally my tree, but
  both fail purely on a hook signature I am not allowed to touch, so they belong to ticket 28.
- **`check:file-sizes`**: `hooks/api/notifications-inbox.ts` (534), `hooks/api/accounting/banking.ts`
  (501), `features/hr/cases/cases-page-content.tsx` (501). None mine; the gate was already red on the
  first of these when I started.

## Cross-territory findings

- **Ticket 28 — `useNotifications` is a `useQuery` against a cursor route.** Any caller passing a
  `limit` to it silently truncates and offers no way past that limit. The Build inbox was one; the
  hook itself invites the mistake. Worth either documenting or narrowing.
- **Ticket 28 — `useHrEvents` (`hooks/api/hr/enterprise-ops-event-stream.ts:51`) sends no `limit`,**
  so its page size is whatever the backend defaults to. `features/hr/enterprise/ops/event-stream/`
  feeds that page straight into a `DataTable` beside a `CursorPageControls`; if the server default is
  above 50 that surface has two pagers today. Not checkable from the frontend, and not my tree.
- **`features/mail/mail-reading-pane.tsx` and `components/assistant/ask-os-chat-view.tsx`** remain
  unwindowed (variable-height, expand-on-click). Neither is one of box 4's seven module families and
  both are other territories, so they are noted, not fixed.

## Files changed (21) — all inside `frontend/`

**New source (5)** `features/chat/panel-render-window.ts` · `features/chat/thread-message.tsx` ·
`features/build/views/gantt/gantt-row-window.ts` · `features/build/views/gantt/gantt-ticket-rows.tsx` ·
`features/build/inbox/inbox-render-window.ts`

**New tests (8)** `features/chat/panel-render-window.test.ts` ·
`features/chat/chat-side-panels-bounded.test.tsx` · `features/chat/channel-members-section.test.tsx` ·
`features/build/views/gantt/gantt-row-window.test.ts` · `features/build/views/gantt-view-rows.test.tsx` ·
`features/build/inbox/inbox-list-bounded.test.tsx` ·
`features/hr/expenses/import-validation-preview-rows.test.tsx` ·
`features/__tests__/cursor-page-size-bounds.test.ts`

**Modified (8)** `features/chat/{thread-panel,saved-messages-panel,shared-files-panel,channel-members-section}.tsx` ·
`features/build/views/gantt-view.tsx` · `features/build/inbox/inbox-list.tsx` ·
`features/hr/expenses/import-validation-preview.tsx` ·
`features/hr/recruitment/candidates/bulk-import-page.tsx`
