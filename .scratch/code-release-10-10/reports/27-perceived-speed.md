# Ticket 27 — perceived speed, lazy loading, virtualization

**4 of 7 boxes closed. 2 partial, 1 partially blocked.** Everything below was run and read;
numbers are from the command named beside them.

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

## Box 6 — measurement — **PARTIAL / BLOCKED**

Done: **render count measured, one avoidable rerender removed.** `ChannelListEntry` is rendered
twice per channel by the chat sidebar and re-rendered by every keystroke in its search box, while
all of its props are already referentially stable (`useMemo`'d lists and Sets, `useCallback`'d
handlers at `chat-home-page.tsx`). I wrote the test failing first: **4 renders for 3 unrelated
parent renders**; with `React.memo`, **1**. At ~100 channels × 2 placements that is ~200 avoidable
component renders per keystroke. This is the only place I added `memo` — per `frontend/CLAUDE.md`
§3, measured first.

**BLOCKED:** memory, long tasks and hydration mismatches. They need a production build driven in a
real browser; `next build` is ticket 26's and only one may run at a time, and dev-server numbers
are not comparable. **Ticket 26 owns the Web Vitals capture and should take these three on the Home
and module journeys.**

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
