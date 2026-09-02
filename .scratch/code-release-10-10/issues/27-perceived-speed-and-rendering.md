# 27 — Eliminate waterfalls, lazy-load heavy surfaces and virtualize large collections

**What to build:** The remaining §12.2 work: removing known request waterfalls, making prefetch safe and bounded, deferring the heavy module surfaces out of first render, and rendering large collections without blocking the main thread.

**Blocked by:** 25.

**Status:** ready-for-agent

- [ ] Request waterfalls are eliminated where the dependency is known in advance.
- [ ] Prefetch covers only likely and authorized routes; speculative prefetch must not leak tenant data or overload the backend.
- [ ] Module editors, charts, calendars, chat media and AI interfaces are lazy-loaded when not needed for first render.
- [ ] Large chat, calendar, inbox, notification, directory, HR and Build collections are virtualized or incrementally rendered while preserving accessibility and cursor correctness.
- [ ] Images, fonts and eligible static assets are optimized; text responses use HTTP compression; upload and media transformation stay asynchronous.
- [ ] Memory, render count, long tasks and hydration mismatches are measured on representative Home and module journeys, and avoidable rerenders are removed.
- [ ] Server prefetch actually hydrates the client cache — a prefetch whose key hash disagrees with the client's is dead work that renders a spinner anyway.
