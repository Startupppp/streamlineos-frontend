# 29: Performance and Web Vitals

**What to build:** Database, API, cache, worker, bundle, rendering, and interaction paths meet reproducible budgets on production-shaped data and builds.

**Blocked by:** 06–23 — product and platform slices; 27 — Cleanup contraction; 28 — File cohesion and named handlers

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C006** — **Frontend speed:** complete v2 ticket 29's production-build Web Vitals, bundle, rendering and interaction budgets while preserving completed lazy-loading, virtualization and hydration gains.
- [ ] **PRD-C139** — Performance/SEO/tests: verify bundle boundaries, lazy loading, rendering/Web Vitals budgets and public metadata without changing landing visuals/animations; run representative browser E2E.
- [ ] **PRD-C140** — Publish a benchmark manifest for every module: dataset size, concurrency, warm/cold state, machine/container limits, command, repetitions, p50/p95/p99, error rate and release SHA.
- [ ] **PRD-C141** — Keep application-controlled overhead for ordinary authenticated reads/mutations at p95 ≤ 300 ms and approved complex aggregate/search operations at p95 ≤ 800 ms, excluding internet/provider time.
- [ ] **PRD-C142** — Keep ordinary database statements at p95 ≤ 50 ms and explicitly approved complex statements at p95 ≤ 200 ms on the production-shaped seed; retain plans for every exception.
- [ ] **PRD-C143** — Keep cache-hit application paths at p95 ≤ 100 ms while preserving authorization correctness; a cache miss or Redis outage must degrade safely without a request storm.
- [ ] **PRD-C145** — Prove Chat, Calendar, Inbox and Notifications list, unread/count, range/history and realtime-token paths meet their budgets without table scans, N+1 or per-item cache/database calls.
- [ ] **PRD-C148** — Add automated performance-regression gates for declared critical paths; fail on statistically meaningful latency, query-count, buffer, payload or memory regression.
- [ ] **PRD-C149** — Meet Core Web Vitals targets on production builds for in-scope authenticated routes: LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at the defined reference viewport/device profile.
- [ ] **PRD-C151** — Record route-level JavaScript, CSS, server payload, image/font and third-party budgets; lazy-load module editors, charts, calendars, chat media and AI interfaces not required for first render.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
