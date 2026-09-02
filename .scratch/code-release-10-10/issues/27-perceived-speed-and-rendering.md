# 27 — Eliminate waterfalls, lazy-load heavy surfaces and virtualize large collections

**What to build:** The remaining §12.2 work: removing known request waterfalls, making prefetch safe and bounded, deferring the heavy module surfaces out of first render, and rendering large collections without blocking the main thread.

**Blocked by:** 25.

**Status:** partially-complete — 4 of 7 closed, 2 left open with a precise remainder (both advanced materially this session; neither closeable here).

- [x] Request waterfalls are eliminated where the dependency is known in advance.
  Evidence: 5 avoidable waterfalls fixed (calendar external events, whiteboard deep link, ticket
  detail sidebar/relations, cycle-detail column counts, sign envelope preview). `tsc --noEmit`
  clean on all five; `jest features/build features/chat features/calendar` → 113/113 pass.
  The 9 remaining chained reads were each verified INHERENT (the second call is keyed on a value
  only the first can produce) and are listed in the report.
- [x] Prefetch covers only likely and authorized routes; speculative prefetch must not leak tenant data or overload the backend.
  Evidence: sidebar rendered 354 nav `<Link>`s across products (57 for finance) at App Router's
  default viewport prefetch — every visible one firing an RSC request that re-runs the
  authenticated layout. Now `prefetch={false}` + `router.prefetch` on hover/focus/touch, deduped
  per href. `jest components/layout/__tests__/nav-intent-prefetch.test.tsx` → 5/5, asserting
  0 prefetches at rest, 1 for the hovered route, and 1 for three hovers of the same link.
  No prefetch is added for a route the sidebar has not already permission-filtered.
- [x] Module editors, charts, calendars, chat media and AI interfaces are lazy-loaded when not needed for first render.
  Evidence: `jest features/__tests__/heavy-module-lazy-boundaries.test.ts` → 13/13. It walks the
  real module graph from all 640 route entries following static edges only and asserts recharts,
  @tiptap/{react,core,starter-kit,html}, react-easy-crop, papaparse, @xyflow/react, platejs,
  pdfjs-dist, @excalidraw/excalidraw and react-big-calendar are unreachable without crossing a
  dynamic boundary. Before: recharts eager on 3 routes, tiptap on 1, react-easy-crop on 1,
  papaparse on 2. Negative control run: adding `ably` to the list fails the gate with the exact
  offending files, so the gate detects a regression rather than passing vacuously.
- [ ] Large chat, calendar, inbox, notification, directory, HR and Build collections are virtualized or incrementally rendered while preserving accessibility and cursor correctness.
  PARTIAL: six of the seven named modules are covered — inbox was another agent's territory this
  session and was not touched. The cross-cutting fix is `components/ui/data-table.tsx`: it attached
  `getPaginationRowModel()` with a 50-row default but gated the pagination control on
  `pagination !== undefined`, so **380 of 476 call sites silently rendered 50 rows and made row 51+
  unreachable** — a data-loss bug, not just a perf one. Now the control appears whenever the table
  slices, so every row is reachable and the mounted count stays bounded. That bounds 79 of the 97
  DataTables in the six trees (34 of which feed a genuinely unbounded array). Also closed:
  `features/chat/channel-sidebar.tsx` + `channel-archived-section.tsx` (the sidebar mounted 2N
  entries — rail plus section — and `useChatChannels` now drains *every* cursor page, so N is the
  member's whole channel set), `features/chat/message-list.tsx` via a tail render window in
  `use-message-panel-data.ts`, and the `features/hr/employees` card grid.
  Accessibility was added, not traded: `aria-rowcount`/`aria-rowindex` on DataTable so AT reports
  the true total rather than the page, `role="list"`/`aria-posinset`/`aria-setsize` on the channel
  lists, and a `Pagination` landmark on `DataTablePagination`. `check:icon-labels` → exit 0.
  Cursor correctness is proved, not assumed: all cursor surfaces page at ≤50 so no second pager
  appears; a next-cursor page renders from its first row with no skip or repeat; a sort resets to
  the first row; and a filter that shrinks the data clamps a stale page index instead of stranding
  the reader on an empty one (negative control confirms the clamp is load-bearing).
  Verified stale claims from the previous report: `chat-search-dialog.tsx` is NOT unbounded (the
  backend caps at 20/10/10), and `useChatChannels` no longer drops `nextCursor` — it now drains
  every page, which made windowing the sidebar mandatory rather than optional.
  REMAINS: `features/chat/{thread-panel,saved-messages-panel,shared-files-panel}.tsx` (accumulating
  infinite queries), `features/build/views/gantt-view.tsx` (up to 500 SVG row groups),
  `features/build/inbox/inbox-list.tsx` (100 unwindowed rows), and the CSV import/preview tables
  which are bounded by upload size rather than tenant size.
- [x] Images, fonts and eligible static assets are optimized; text responses use HTTP compression; upload and media transformation stay asynchronous.
  Evidence: `grep -rn "<img "` over app/features/components → **0** raw image tags; 31 `next/image`
  call sites; fonts via `next/font/google` in `app/layout.tsx` (self-hosted, no render-blocking
  stylesheet). All 15 upload call sites are `await apiClient.upload(...)`; the only client-side
  media transformation is `canvas.toBlob` in the avatar crop dialog (async) and a signature-pad
  `toDataURL` on a small canvas. HTTP compression is Next's `compress` default (`next.config.ts`
  does not disable it); explicit brotli belongs to the proxy and to ticket 26, which owns
  `next.config.ts`.
- [ ] Memory, render count, long tasks and hydration mismatches are measured on representative Home and module journeys, and avoidable rerenders removed.
  PARTIAL: render count is measured on a named journey and the avoidable renders are gone.
  Journey — *HR employees list, grid view, three server pages loaded (60 employees), five keystrokes
  in the search box*: measured **300** avoidable `EmployeeCard` body renders (60 per keystroke, all
  props already stable), now **0** (`jest features/hr/employees/employee-grid-renders.test.tsx`,
  2/2, written failing first). Mount counts on the chat sidebar journey went from 2N per channel
  (unbounded) to a 30-row page with the rest revealed on request
  (`jest features/chat/channel-section-list.test.tsx`, 9/9).
  BLOCKED — memory: `performance.memory` is Chrome-only and jsdom has no real heap;
  `process.memoryUsage()` would measure the jest Node heap, not the browser's, so it is not a
  comparable number. Needs a browser.
  BLOCKED — long tasks: `PerformanceObserver` with `entryTypes: ["longtask"]` is not implemented in
  jsdom, so there is nothing to observe here. Needs a browser.
  BLOCKED — hydration mismatches: attempted a real harness (`renderToString` + `hydrateRoot` +
  `onRecoverableError`, with a negative control). It cannot run in this setup:
  `react-dom/server.browser` schedules through `MessageChannel`, which this jsdom environment does
  not define, and polyfilling it from `node:worker_threads` hangs the jest runner because the ports
  keep the event loop alive. That is a concrete blocker for ticket 26 to route around, not a vague
  one. All three still want a production build driven in a real browser, which is ticket 26's.
- [x] Server prefetch actually hydrates the client cache — a prefetch whose key hash disagrees with the client's is dead work that renders a spinner anyway.
  Evidence: all 6 server prefetch factories (`access`, `roles`, `directory`, `hr` documents,
  `hr` assets, `payroll` runs) build their client through `createServerQueryClient`, and
  `jest lib/prefetch` → 8 suites / **30 tests** pass, including `hydration-contract.test.ts`,
  which hydrates each factory's real dehydrated snapshot into a `createAppQueryClient` and
  asserts `getQueryData(key)` returns the payload — plus a negative control proving a plain
  `QueryClient` lands an entry the app can never look up. No new server prefetch was added, so
  the contract's coverage is complete: 6 factories, 6 assertions.
