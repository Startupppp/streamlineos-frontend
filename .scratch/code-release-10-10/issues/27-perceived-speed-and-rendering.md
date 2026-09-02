# 27 — Eliminate waterfalls, lazy-load heavy surfaces and virtualize large collections

**What to build:** The remaining §12.2 work: removing known request waterfalls, making prefetch safe and bounded, deferring the heavy module surfaces out of first render, and rendering large collections without blocking the main thread.

**Blocked by:** 25.

**Status:** complete — 7 of 7 closed. Box 6 closed by ticket 26's authenticated production capture: hydration 0 mismatches of 192, long tasks desktop 0 ms / mobile p75 275 ms, and memory flat at 13–17 MB once the heap is read after a forced collection (the un-collected reading climbs to 362 MB and would have shipped a false leak report).

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
- [x] Memory, render count, long tasks and hydration mismatches are measured on representative Home and module journeys, and avoidable rerenders removed.
  Render count: closed last session. Journey — *HR employees list, grid view, three server pages
  loaded (60 employees), five keystrokes in the search box*: **300** avoidable `EmployeeCard` body
  renders (60 per keystroke, all props already stable), now **0**
  (`jest features/hr/employees/employee-grid-renders.test.tsx`, 2/2, written failing first). Chat
  sidebar mount counts went from 2N per channel (unbounded) to a 30-row page
  (`jest features/chat/channel-section-list.test.tsx`, 9/9).
  The other three were blocked on a real browser and are now measured on ticket 26's authenticated
  production capture — build `qlh_3k7hMskrlYGND5MMp`, 12 routes covering Home (`/dashboard`,
  `/inbox`, `/notifications`, `/mail`) and the module journeys (`/chat`, `/calendar`, `/parties`,
  `/crm/inbox`, `/support/inbox`, `/build/inbox`, `/build/my-work`, `/settings`) × 2 profiles,
  **192 samples**, `authorization.verdict` = "every measured sample rendered an authorized shell",
  0 unusable, 0 off-route, `routeFailures: 0`.
  **Hydration mismatches: 0 of 192**, read from the console over CDP, with a negative control in the
  driver's self-test proving an unrelated console error is not counted. Reproduced at 0 of 72 on a
  second pass.
  **Long tasks** (total blocking per navigation, p75): desktop **0 ms** on every one of the 12
  routes; mobile at 4× CPU throttling **275 ms** profile-wide, worst `/dashboard` **408 ms**, best
  `/settings` 198 ms. That is the number a mid-range phone experiences and it is why mobile INP
  (96 ms) is twice desktop's (48 ms), both still inside the 200 ms budget.
  **Memory: no leak, and the naive reading says there is one.** Read without forcing a collection,
  `usedJSHeapSize` climbs monotonically across a session — /dashboard 59 MB → /calendar 290 →
  /support/inbox 362 MB — which reads exactly like a retention leak. The driver now calls
  `HeapProfiler.collectGarbage` immediately before every heap read; re-measured over the same 12
  routes and both profiles (72 samples), the heap is **13–17 MB and flat**, p75 **15.5 MB desktop /
  15.7 MB mobile**. The app retains nothing across navigation. A heap read without a forced GC is
  not a memory measurement.
  Full numbers and method: `reports/26-web-vitals.md` §6/§6a.
- [x] Server prefetch actually hydrates the client cache — a prefetch whose key hash disagrees with the client's is dead work that renders a spinner anyway.
  Evidence: all 6 server prefetch factories (`access`, `roles`, `directory`, `hr` documents,
  `hr` assets, `payroll` runs) build their client through `createServerQueryClient`, and
  `jest lib/prefetch` → 8 suites / **30 tests** pass, including `hydration-contract.test.ts`,
  which hydrates each factory's real dehydrated snapshot into a `createAppQueryClient` and
  asserts `getQueryData(key)` returns the payload — plus a negative control proving a plain
  `QueryClient` lands an entry the app can never look up. No new server prefetch was added, so
  the contract's coverage is complete: 6 factories, 6 assertions.
