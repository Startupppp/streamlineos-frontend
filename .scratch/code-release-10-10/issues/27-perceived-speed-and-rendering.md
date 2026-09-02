# 27 — Eliminate waterfalls, lazy-load heavy surfaces and virtualize large collections

**What to build:** The remaining §12.2 work: removing known request waterfalls, making prefetch safe and bounded, deferring the heavy module surfaces out of first render, and rendering large collections without blocking the main thread.

**Blocked by:** 25.

**Status:** partially-complete — 4 of 7 closed, 3 left open with a precise remainder.

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
  PARTIAL: 5 of ~20 audited surfaces closed — the two org-wide chat user pickers
  (`react-window`, `jest features/chat/chat-user-virtual-list.test.tsx` 2/2: 2,000 users, 0 rows
  mounted, list stays labelled), the three grouped Build list-view paths (which bypassed the flat
  path's 100-row cap entirely — `jest features/build/views/list-view-group-rows.test.tsx` 3/3),
  the ticket activity log and the ticket comment feed (both had no pagination at all; the comment
  feed keeps a deep-linked comment visible past the cap). 15 further surfaces are inventoried in
  the report with row counts, hook pagination status and row-height shape — the largest,
  `features/chat/message-list.tsx`, is deliberately not attempted here because flattening its
  date-group nesting and sticky-bottom behaviour is a change of its own.
- [x] Images, fonts and eligible static assets are optimized; text responses use HTTP compression; upload and media transformation stay asynchronous.
  Evidence: `grep -rn "<img "` over app/features/components → **0** raw image tags; 31 `next/image`
  call sites; fonts via `next/font/google` in `app/layout.tsx` (self-hosted, no render-blocking
  stylesheet). All 15 upload call sites are `await apiClient.upload(...)`; the only client-side
  media transformation is `canvas.toBlob` in the avatar crop dialog (async) and a signature-pad
  `toDataURL` on a small canvas. HTTP compression is Next's `compress` default (`next.config.ts`
  does not disable it); explicit brotli belongs to the proxy and to ticket 26, which owns
  `next.config.ts`.
- [ ] Memory, render count, long tasks and hydration mismatches are measured on representative Home and module journeys, and avoidable rerenders removed.
  PARTIAL / BLOCKED: render count measured and one avoidable rerender removed —
  `ChannelListEntry` is rendered twice per channel by the chat sidebar and re-rendered on every
  keystroke in its search box; measured 4 renders for 3 unrelated parent renders, now 1
  (`jest features/chat/channel-list-entry-renders.test.tsx`, the test was written failing first).
  BLOCKED: memory, long tasks and hydration mismatches cannot be measured here. They need a
  production build driven in a real browser, and `next build` is owned by ticket 26 (only one
  build may run at a time); dev-server numbers would not be comparable. Ticket 26 owns the Web
  Vitals capture and should take these three on the Home and module journeys.
- [x] Server prefetch actually hydrates the client cache — a prefetch whose key hash disagrees with the client's is dead work that renders a spinner anyway.
  Evidence: all 6 server prefetch factories (`access`, `roles`, `directory`, `hr` documents,
  `hr` assets, `payroll` runs) build their client through `createServerQueryClient`, and
  `jest lib/prefetch` → 8 suites / **30 tests** pass, including `hydration-contract.test.ts`,
  which hydrates each factory's real dehydrated snapshot into a `createAppQueryClient` and
  asserts `getQueryData(key)` returns the payload — plus a negative control proving a plain
  `QueryClient` lands an entry the app can never look up. No new server prefetch was added, so
  the contract's coverage is complete: 6 factories, 6 assertions.
