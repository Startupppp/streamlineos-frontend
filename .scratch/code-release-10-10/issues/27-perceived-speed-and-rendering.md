# 27 — Eliminate waterfalls, lazy-load heavy surfaces and virtualize large collections

**What to build:** The remaining §12.2 work: removing known request waterfalls, making prefetch safe and bounded, deferring the heavy module surfaces out of first render, and rendering large collections without blocking the main thread.

**Blocked by:** 25.

**Status:** partially-complete — 6 of 7 closed. Box 4 closed this session; box 6 remains open and is blocked on a real browser (ticket 26's).

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
- [x] Large chat, calendar, inbox, notification, directory, HR and Build collections are virtualized or incrementally rendered while preserving accessibility and cursor correctness.
  Evidence: all seven named module families are now bounded, and every bound is asserted by a test
  that also proves row 51+ is still reachable. The cross-cutting fix stays
  `components/ui/data-table.tsx` (it sliced to 50 and hid the pager, so **380 of 476 call sites**
  rendered 50 rows and made row 51+ unreachable — data loss, not a perf bug).
  Closed this session, each with a render-count/row-count test and a negative control:
  `features/chat/{thread-panel,saved-messages-panel,shared-files-panel,channel-members-section}.tsx`
  via a shared `features/chat/panel-render-window.ts` (25-row window, reveal-held-before-fetch);
  `features/build/views/gantt-view.tsx` via a scroll-band window
  (`features/build/views/gantt/gantt-row-window.ts` + `gantt-ticket-rows.tsx`) — 500 SVG row groups
  became ~24; and `features/build/inbox/inbox-list.tsx`, which was the opposite defect — a single
  `limit: 100` read with no cursor, so notification 101 was unreachable and the Mentions tab
  filtered that fixed page client-side. It now reads `useInfiniteNotifications` and windows.
  CSV preview: `features/hr/expenses/import-validation-preview.tsx` pre-sliced to 50 before the
  table saw the rows, so an invalid line 51 could never be shown — it now hands every row to
  `DataTable`, which pages them. `features/hr/recruitment/candidates/bulk-import-page.tsx` dropped
  rows past 500 silently; it now says so. The other 7 CSV previews were checked and are already
  bounded (5 slice to 5/10 deliberately, 2 hand `DataTable` a `pagination` prop).
  `features/inbox/**` — the one module family the previous session could not touch — was read (not
  edited, another territory) and is already virtualized by `features/inbox/inbox-virtual-list.tsx`
  (react-window), so the box's seventh family is covered.
  Accessibility was added, not traded: `role="list"`/`role="listitem"` with `aria-posinset` and a
  true `aria-setsize` (`-1`, the ARIA value for an unknown total, while a cursor still has pages) on
  every windowed list, and the Gantt rows gained `role`, `aria-label`, `tabIndex` and Enter/Space
  activation they never had — a windowed SVG row is now keyboard-reachable where the unwindowed one
  was not. `check:icon-labels` → exit 0.
  Cursor correctness: a reveal of already-held rows fires **no** cursor request (asserted), a fetch
  happens only when nothing is held, changing the tab or the thread or the channel resets the window
  (asserted), and the tail window covers every index exactly once as it widens (asserted).
  `features/__tests__/cursor-page-size-bounds.test.ts` turns the previous session's hand-read
  "all ~20 PAGE_SIZE constants are ≤ 50" into an executed gate: it reads `DataTable`'s own default
  out of the source, scans 61 files that pair a `<DataTable` with a cursor pager, resolves 27
  page-size constants, and carries a negative control proving an 80-row cursor page is caught.
  Proofs: `jest features/(chat|build|hr|notifications|__tests__) components/ui/__tests__`
  → **60 suites / 526 tests pass**. Negative controls run and read: widening the chat panel window
  fails 10 of 16 assertions; widening the Gantt overscan fails 2 of 8.
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
