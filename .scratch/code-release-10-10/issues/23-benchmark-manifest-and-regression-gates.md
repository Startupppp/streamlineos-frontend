# 23 — Publish the benchmark manifest and add performance-regression gates

**What to build:** A per-module benchmark manifest and automated regression gates for declared critical paths, so a latency, query-count, buffer, payload or memory regression fails rather than being noticed later.

**Blocked by:** 22.

**Status:** 2 of 8 closed (boxes 1 and 8), unchanged. **S16 (2026-09-03) — boxes 4 and 7 had their FIXABLE structural halves implemented and bite-proved; both stay open on their measurement halves.** Box 4: outage degradation, the null-key fill lease and TTL jitter all fixed; stale-while-revalidate still absent and needs a named opt-in set. Box 7: the unbounded pool wait queue now sheds in front of the driver, VirusTotal and Composio outbound calls are bounded, the URI-version admission hole is determined and fixed, and opt-in rate limiting is recorded as deliberate with its four gaps named. NO BENCHMARK WAS RUN and no `measured*` field was touched. Report: `reports/22f-cache-outage-and-pool-backpressure.md`. **S15 (2026-09-03) — the STRUCTURAL halves of boxes 4, 5, 6 and 7 were audited against source and are now recorded per clause, with verdicts, file:line and no stopwatch. NO TIMING NUMBER WAS MEASURED OR RECORDED** — load average was 5.64 with ~7 agents concurrent, and the one database run taken (plan shape and buffers only, as `streamline_app` with the tenant GUC) had its milliseconds discarded at the point of reading. `measuredLatencyP95Ms: 915.944` and `measuredBufferBlocks: 7072` are untouched; A-17 is unchanged and still open. Four of the six p95/measurement halves stay deferred to the quiet-machine pass. Report: `reports/22e-derived-critical-set-and-structural-clauses.md` §6.

**Historic status (S14):** the gates are now EXECUTED BY CI for the first time, and the calendar breach is re-measured and gone.

**Residual-risk disposition (2026-09-03):** every open box below now carries an ASSIGNABLE-or-ACCEPTED verdict, a named owner and a date, recorded inline under the box and in `reports/residual-risk-register-19-30.md`. Blockers were re-verified against source, a live gate run or a committed artifact rather than transcribed; where a stated blocker did not survive, the correction is inline.

**S13 (2026-09-03).** (1) **`test/perf/**` was outside jest's `roots`**, so `route-budget-http-harness.spec.ts`'s 20 cases had never been collected by `pnpm test` — the suite CI's `tests` job runs unfiltered. Added `<rootDir>/test/perf`: `jest --listTests` 1873 → 1874 files, the single new entry being that spec; focused run **20/20, exit 0**; a broken copy of the same spec run through the same config exits **1** (proved in a throwaway copy under the scratchpad, never by planting a defect in the shared tree). (2) **`GET /chat/channels` 436,371 → 6,876 response bytes** (63×, against a declared 131,072 ceiling), heap 8.1 → 3.5 MB, re-measured over HTTP on `scratch_t23_http` brought to **667/667 at head** and VACUUM ANALYZEd. The cause was an unqualified `with: { members: … }` shipping every member of every channel on the page — two seed channels hold 500 members each, ~245 KB of JSON apiece. (3) **`contracts/route-budgets.json`'s four request-level `measured*` fields went 0/82 → 70/82** from this ticket's own capture, so `check:route-budgets` coverage is 110/570 → **390/570 (68.4%)** and it fails on three real breaches instead of one. Reports: `reports/23-benchmark-manifest.md`, `reports/22-route-budgets.md`.

**S14 (2026-09-03) — the gates were wired in `package.json` and named by NO workflow step in EITHER repository.** Measured before touching anything: `grep -c 'benchmark\|perf:' .github/workflows/*.yml` returned **0** in both repos, so `check:benchmark-manifest`, the regression policy and the three perf self-tests had never executed in CI — the third shape of the masking defect 35b and ticket 35 already fixed twice (a gate under a red step; a red step skipping its successors; and now a gate no step names at all). Four hermetic steps added to backend `ci.yml`'s `gates` job, every one carrying `if: ${{ !cancelled() }}`, plus the seeded HTTP capture named separately in `tenant-isolation` with its four prerequisites and its measured local exit code. And **`GET /calendar/events` is re-measured on `scratch_t23_http` at head: 915.944 → 305.746 ms p95, 196 → 65 statements — UNDER its 800 ms ceiling.** Report: `reports/23b-ci-wiring-and-calendar-recheck.md`. Commit `07295b18` (backend).

- [x] The manifest records, per module: dataset size, concurrency, warm/cold state, machine and container limits, command, repetitions, p50/p95/p99, error rate and release SHA.
      All ten fields on all 15 modules, each a required field the gate refuses to pass without. Container limits reported as a fact (`containerised: false`, darwin, no cgroup), never the host's memory dressed as a limit. Warm/cold recorded as both: `coldMs`/`coldBufferBlocks` are the first sample, percentiles are the warm distribution. Beyond the ask: planning buffer blocks, per-replicate plan signatures, per-tenant row counts, and a **content digest of every SQL catalog measured** plus whether it was uncommitted at capture — a release SHA alone read "2 commits behind" while 8 read-cost entries had already changed shape on disk.
- [ ] Ordinary authenticated reads and mutations meet their p95 ceiling and approved complex aggregates meet theirs, excluding provider time.
      **RESIDUAL-RISK REGISTER 2026-09-03 — one count in this box is wrong, and three of its four remainders are
      assignable work rather than blockers.** `pnpm -s check:benchmark-manifest` at head → **exit 1**; refusals by
      route×tenant slot: `12 provider-backed mail · 7 HTTP 500 · 7 HTTP 402 · 1 no client to bill · 1 no payroll
      run`; 136/164 (82.9%) request-level slots measured.
      **TICKET CORRECTION: the box says "4 routes answer HTTP 500"; at contract level it is 3** —
      `POST /build/{projectId}/tickets`, `POST /chat/channels/{channelId}/messages` and
      `GET /cron/notifications-retention-sweep`. `GET /clients` now answers 200 and is measured. Report 23b §6
      records that recovery; this box does not, and a reader would go looking for a fourth.
      **A-18 (ASSIGNABLE, triage).** The 3 remaining 500s. **Owner: build / chat / notifications owners. Deadline:
      2026-09-10.**
      **A-19 (ASSIGNABLE).** The four 402s — `POST /leads`, `POST /deals`, `POST /invoices`, `POST /support` — are
      refused because the **majority tenant's plan limit is already reached in the seed**. That is a seed
      condition, not a route defect, and it is fixable in `src/scripts/seed-perf-scratch.mjs`. Two of the four are
      CRM and stay excluded. **Owner: seeding owner. Deadline: 2026-09-17.**
      **A-17 (ASSIGNABLE) — the calendar half is NOT closed in any artifact.** `contracts/route-budgets.json` still
      carries `measuredLatencyP95Ms: 915.944` and `check:benchmark-manifest` still fails
      `GET /calendar/events@reference: request p95 915.944 ms > 800 ms`. Needs one uninterrupted full 164-slot
      capture plus `perf:merge-route-budgets --write`. **Owner: perf-harness owner. Deadline: 2026-09-08.**
      **R-14 (ACCEPTED RESIDUAL · INFRA).** The 6 provider-backed mail routes need a connected mail account.
      **Owner: infrastructure operator. Deadline: 2026-09-30.**
      PARTIAL: the ceilings are now MEASURED, and nothing measured is over one. `test/perf/route-budget-http.seeded-e2e-spec.ts` times each declared route over HTTP against a live Nest app on the seeded database as non-owner `streamline_app`, Redis off, 40 samples plus a separate 5-sample post-GC heap pass, both control probes required to hold. **115 scored route×tenant slots, 0 over ceiling** (ordinary 300 ms, approved complex 800 ms); worst scored is `GET /calendar/events` at **583.79 ms p95 against its 800 ms complex ceiling, 79 database statements and 64.2 MB of heap in one request**. 22 further slots are `/cron/*` sweeps, recorded but excluded by name with the reason. Provider time is excluded structurally: the 12 mail slots are declined because no mail account is connected, never approximated. **What keeps it open:** 4 routes answer HTTP 500 on both tenants and therefore have no p95 at all — `GET /clients` (SQLSTATE **25P02**, an earlier statement in the same request transaction failed and was swallowed, leaving it aborted), `POST /build/{projectId}/tickets`, `POST /chat/channels/{channelId}/messages`, `GET /cron/notifications-retention-sweep`. Four write paths answer 402 on the majority tenant because its plan limit is already reached, so their cost is measured on the minority tenant only. Two seed gaps had to be fixed before any of this was reachable at all — see the report.
      **S13 (2026-09-03) — re-measured at head (667/667), and it got WORSE, not better, for a reason outside this territory.** Full 164-slot re-capture on `scratch_t23_http`: 136/164 measured, 0 failed, both control probes held on both tenants. **`GET /calendar/events` is now OVER its 800 ms approved-complex ceiling — 915.94 ms p95, up from 583.79, on 196 request statements up from 79, holding 75.8 MB of heap in one request.** It is the only route over a PRD ceiling in the capture. The statement count is deterministic and cannot be load, so this is a real movement in the route between the two captures, not measurement noise. The movement almost certainly belongs to the calendar owner's in-flight refactor — `d93676ad` (split the range branches and fetch by candidate id) and `971e8c5d` both landed in the shared tree before the commit this capture recorded — so it is routed to them as a measurement, not raised as a mystery.
      BLOCKED: on the **calendar/dashboard owner** (`src/modules/calendar/**`, `CalendarEventSourceLoader`) for the 196 statements, and on the **CRM / Build / Chat / notifications owners** for the four routes that still answer HTTP 500 and therefore still have no p95 at all. Nothing here is blocked on infrastructure or on this territory.
      **S14 (2026-09-03) — the calendar regression is CLOSED, measured not inferred.** The calendar owner fixed it and explicitly did NOT re-run the HTTP harness, so the claim was an inference. Re-measured twice on `scratch_t23_http` (667/667 at head, `streamline_app` `rolbypassrls=false`, RLS live, Redis off, 40 samples, both control probes held, subject hash STABLE, 9/9 exit 0): **`GET /calendar/events` reference tenant 915.944 → 305.746 ms p95 on 196 → 65 request statements**, heap 75.8 → 60.2 MB; a separate single-route run gave 276.415 ms / 82 statements, and the minority tenant 52.25 ms / 41 statements. **Under the 800 ms approved-complex ceiling.** The statement count is the load-bearing figure because it is deterministic and cannot be machine load. No ceiling was raised. `GET /clients` also answered **HTTP 200** in this capture (19.991 ms, 24 statements) — it was one of the four 500s.
      BLOCKED (unchanged in shape): on the **CRM / Build / Chat / notifications owners** for the routes that still answer HTTP 500 or 402 and therefore still have no p95. The contracts still carry the S13 numbers for calendar, because the replacement full capture was stopped at ~81 of 164 slots on a 5%-battery laptop and a half capture must never be merged — the merger would clear the 80+ routes it never reached.

- [ ] Ordinary database statements meet their p95 ceiling on the production-shaped seed; plans are retained for every approved exception.
      **RESIDUAL-RISK REGISTER 2026-09-03 — A-20 (ASSIGNABLE). Not blocked; unowned.** 154/280 (55.0%) measured,
      0 over ceiling. The 120 unreachable slots are seed rows for modules the perf seed does not populate;
      `src/scripts/seed-perf-scratch.mjs` exists (51,709 B) and is the whole of the change. **Owner: seeding owner.
      Deadline: 2026-09-17.** The box's own caveat that "a 50 ms p95 on loopback Postgres is an easy bar" is a
      methodology statement, correctly recorded, and is not a blocker.
      PARTIAL: the plan half is done — every approved-complex statement has a retained plan per tenant (`test/perf/benchmark-plans/approved-complex-<tenant>.txt`, large 20 · mid 18 · small 18 · tiny 17 of 20), and the gate rejects a statement claiming the looser 200 ms COMPLEX ceiling with no approval reason. The ceiling half is measured on 154/280 (55.0%) of benchmark×tenant slots with **0 over ceiling** — but 120 slots the seed is too small to reach and 6 vacuous are reported as unmeasured, and a 50 ms p95 on loopback Postgres is an easy bar. The buffer count is the finding; the millisecond is the artefact.
      NOT ADVANCED (S13): the statement half is `run-read-cost-budgets.mjs` + `read-cost-budgets.mjs`, neither of which is in this territory. The 120 unreachable slots need seed rows for modules the perf seed does not populate — `src/scripts/seed-perf-scratch.mjs`, the seeding owner.
- [ ] Cache-hit paths meet their ceiling while preserving authorization correctness; a miss or a cache outage degrades safely without a request storm.
      **S15 — STRUCTURAL HALF AUDITED PER CLAUSE. IT DOES NOT HOLD, AND A-21 IS STALE.** Read at head in
      `src/common/cache/cache.service.ts` (391 lines); CLAUDE.md §6:145 quoted verbatim in the report.
      **(1) in-process single-flight HOLDS** — `inFlight` Map `:14`, gate `:78-88`, identity-checked delete `:86`.
      **(2) a DISTRIBUTED FILL LEASE EXISTS AND HOLDS** — `:126-137` `SET cache:fill-lease:<key> <uuid> EX 10 NX`
      with a compare-and-delete Lua release `:161-170`, on the single fill path behind all 213 call sites, asserted
      across two `CacheService` instances on one Redis (`cache.service.spec.ts:48`). **A-21's premise — "single-flight
      is in-process only" — is FALSE at head and should be retired as written.** The blast radius it describes is
      real but belongs to the outage case below, where it is worse than A-21 says because it is continuous rather
      than once. **(3) TTL jitter PARTIAL** — `applyJitter` `:299-301` is +/-15% but is wired into only
      `cachedForOrg` `:345` and `cachedVersionedForOrg` `:371`: **30 of 213 call sites (14%)**. It is absent from
      `cached` (88 sites) and `cachedVersioned` (95 sites) — the path §6:146 names as canonical — and the TTLs are
      five shared constants (`cache-keys.ts:261-267`), so un-jittered keys filled in one second expire in one
      second. No spec asserts jitter on either uncovered method. **(4) stale-while-revalidate FAILS — ABSENT.**
      `loadOrFetch` has one read `:120` and one branch `:121`; no soft/hard TTL pair, no stored `staleAt`, no
      background refresh, and values are written raw `:156` so SWR cannot be added without changing the on-wire
      shape. The only `stale-while-revalidate` in `src/` is a `Cache-Control` header on two public routes
      (`public.controller.ts:143,356`) — that is §6 bullet 1, the CDN half, not this. **(5) CACHE OUTAGE FAILS.**
      Provider-null `:118` and all three runtime-throw catches (`:122-124`, `:134-136`, `:145-147`) `return
      fetcher()`; the distributed lease is UNREACHABLE in the first and ABANDONED in the second. `inFlight` holds
      promises and deletes on settle `:86` — **there is no value memo** — so only temporally overlapping requests
      coalesce and **serialized traffic hits the database at 100% for the whole outage, on all 213 call sites**.
      No Redis circuit breaker exists (three do, all outbound HTTP). Partial mitigations exist only outside
      `CacheService`: `AccessService`'s in-process `permsCache`/`versionCache` (`access.service.ts:74-77`) and
      `JwtAuthGuard`'s `orgCtxCache`/`revocationCache` (`jwt-auth.guard.ts:51-52`, explicit outage fallback
      `:100-113`). **(6) negative caching FAILS — absent by design** (`:121` `if (hit !== null)`), pinned
      deliberately by `cache.service.spec.ts:211-224` for authorization correctness.
      **SHARPEST FINDING — clauses 2 and 6 interact destructively.** For a hot key whose value is legitimately
      `null`, the lease is STRICTLY WORSE than no lease. The winner fills `null`; every loser enters the poll loop
      `:138-150`, reads `null` at `:143`, `:144` treats that as "not yet filled", never checks whether the lease is
      still held, and after `FILL_WAIT_MS = 2_000` calls `fetcher()` anyway. Per losing request: **+2 s, 40 extra
      Redis GETs, and the database query regardless.** The stampede is delayed two seconds and amplified 40x in
      Redis traffic, not prevented. **Owner: cache owner.**
      STRUCTURAL VERDICT: **the clause FAILS as written** — for a null-valued hot key with Redis healthy, and for
      any cache outage. The latency half (the 100 ms cache-hit ceiling) is UNCHANGED and still blocked on R-15.
      **RESIDUAL-RISK REGISTER 2026-09-03 — R-15 (ACCEPTED RESIDUAL · INFRA), and this box names the WRONG missing
      thing.** Verified: `package.json:360` carries `@upstash/redis` and there is **no `ioredis`, no `redis` and no
      docker-compose** in the backend repo; `cache.module.ts:25-38` builds
      `new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN, … })` and returns **null** when
      either is absent; both variable names ARE present in the repo `.env`, i.e. a shared remote instance. So the
      harness's assertion that `REDIS` is `null` is exactly what keeps every recorded number honestly a cache MISS.
      **A plain local `redis-server` will NOT satisfy this** — `@upstash/redis` is a REST client and does not speak
      the Redis wire protocol. The precise missing thing is **a locally hosted Upstash-REST-compatible endpoint**,
      after which the change is env-only (two variables, zero code). The in-process alternative this box also
      offers is not free either: `CacheService` injects the concrete `Redis | null` class rather than an interface,
      so binding a double means widening the provider type. **Owner: infrastructure operator. Deadline:
      2026-09-30.**
      **A-21 (ASSIGNABLE) — raised inside this box and never routed.** Single-flight is in-process only, so N
      instances produce up to N fills of one hot key while `cache-multi-instance.spec.ts`'s "runs the fetcher
      exactly once" claims more than two separate `inFlight` maps can deliver. A misleading test name over real
      multi-instance behaviour. *Taken on trust from this ticket — that spec was not read or run.* **Owner: cache
      owner. Deadline: 2026-09-17.**
      PARTIAL: the storm half is verified by reading `cache.service.ts`: concurrent fills coalesce through an `inFlight` map that wraps `loadOrFetch`, so a **cache outage still single-flights**; `cachedVersioned` makes invalidation an O(1) generation bump with no `SCAN`; TTL jitter is spec-asserted. The latency half is NOT MEASURED — no Redis runs against this seed, so every number in the manifest is the cache-MISS path. That is now ASSERTED rather than narrated: the HTTP spec fails if the `REDIS` provider is anything but `null`, and the artifact's `cache` field is derived from that same read, so it cannot claim a miss ceiling while a warm cache was serving it. The 100 ms cache-hit ceiling stays unmeasured; the Upstash client is a REST client pointed at a shared remote instance, so measuring a hit here would both pollute other people's cache and time a network round trip instead of a cache. Gap found and routed: single-flight is **in-process only**, so N instances produce up to N fills of one hot key, and `cache-multi-instance.spec.ts`'s "runs the fetcher exactly once" claims more than two separate `inFlight` maps can deliver.
      BLOCKED (S13, unchanged): on **infrastructure — specifically, a Redis this seed may talk to**. The only Redis configured here is an Upstash REST client pointed at a shared remote instance, so measuring a cache hit would both pollute other sessions' cache and time a network round trip instead of a cache. The named missing thing is a **local Redis (or an in-process cache provider the seeded harness can bind)**; with one, the HTTP harness measures the hit ceiling unchanged, since it already asserts and records which of the two paths it ran.
      **S16 (2026-09-03) — THREE OF THE FOUR STRUCTURAL CLAUSES NOW HOLD; THE BOX STAYS OPEN ON THE LATENCY HALF.** Backend commits `e1a016ef` and `d4650152`.
      **(a) OUTAGE — FIXED.** 22e's finding is confirmed and closed. Every degraded return in `loadOrFetch` was a bare `fetcher()` and `inFlight` deletes on settle, so it coalesced only requests overlapping in time. Measured with a Redis whose every command rejects (`ECONNREFUSED`), not merely a cold one: **20 sequential requests for one key produced 20 database calls; they now produce 1.** A degraded fill retains its settled promise for **1 s** — process-local, armed only when Redis could not answer, against a smallest declared TTL of 30 s (`CACHE_TTL.SHORT`), so it can never outlive what the call site already accepts from Redis.
      **(b) THE NULL-LEASE PATHOLOGY — FIXED.** The waiter polled only the value key, so it could not distinguish "the leader has not written yet" from "the leader finished and the answer is null" — and a null is never cached. Measured: **the follower waited 2,045 ms; it now returns in 61 ms**, and the leader no longer writes a null the read can never serve. The waiter now also reads the lease, whose absence means no fill is coming — which also releases a waiter when the leader crashes.
      **(c) TTL JITTER — FIXED, all 213 sites.** `applyJitter` moved to where the TTL is resolved for the write, which no caller can bypass; the two ForOrg sites no longer double-jitter, and a caller-supplied TTL function jitters inside its own bound so a declared `maxTtl` still holds.
      **(d) STALE-WHILE-REVALIDATE — STILL ABSENT.** Not attempted. It needs either a stored-shape change or a companion freshness key, and — unlike the three above — it has no safe default: it lengthens an entry's life, which is the one thing §6 forbids for authorization. It needs a named opt-in set, which is a per-call-site product judgement across 213 sites. **Owner: cache owner.**
      **AUTHORIZATION INTERACTION, STATED.** `degradation/redis.spec.ts` pinned "no stale value served" when Redis is dead. That invariant is **kept where it was earned and narrowed elsewhere, not overruled**: an authorization-scoped key is never memoised (`CacheService.AUTHZ_KEY_MARKERS`), asserted against `CACHE_KEYS` in both the bare and tenant-prefixed spelling so a renamed factory fails the spec instead of silently becoming memoisable. Two paths were already immune and are now stated rather than assumed — `revoked:session:<id>` is read with a raw `redis.get` in `JwtAuthGuard` and never enters this fill path, and the permission cache carries the access version IN its key, read from the database when Redis is down, so a `bumpPermissionsVersion` produces a key no memo can answer. A `null` is still never retained, so a denial re-queries every time; an explicit `invalidate` drops the memo before the `!redis` early return, so it bites during the outage too.
      **A-21 IS NOW FULLY RETIRED.** 22e showed its premise false at head; the outage case it actually described is the one fixed in (a).
      PARTIAL: the **cache-HIT latency ceiling is still not measured** and is unchanged — same blocker as below, a Redis this seed may talk to. Every number above is a deterministic counter (fetcher calls, Redis GETs) from a focused jest run, not a benchmark; the two millisecond figures are poll-count consequences of `FILL_POLL_MS = 50`, not timings. **Box stays open on (d) and on the latency half.**
- [ ] Home loads sections concurrently and independently, renders available sections without waiting for the slowest, and never starts an unbounded fanout.
      **S15 — ALL FOUR CLAUSES AUDITED, BOTH SIDES. 1 HOLDS, 2 PARTIAL, 1 FAILS — and R-16 understates it.**
      Home is `/dashboard`; `app/(authenticated)` has no `page.tsx`.
      **CONCURRENTLY — PARTIAL.** `dashboard-personal.service.ts:80` is one `Promise.all` over **5** arms, confirmed.
      But two arms hide a serial 2-hop chain behind a service boundary: `getMyIssues`
      (`dashboard-project.service.ts:84` then `:87`) and `unreadCount` (`notifications-read.service.ts:122` then
      `:348`) — and `:84` **re-fetches the exact membership row the caller already read** at
      `dashboard-personal.service.ts:55`. With the sequential prefix `:45` then `:55`, the critical path is
      **4 sequential DB hops, not 1**. The spec that pins this (`dashboard-section-isolation.spec.ts:411-452`)
      mocks all three collaborators, so its "1 findFirst" is true only of the file under test.
      **R-16's frontend half is WRONG: Home is NOT a single query.** It issues **~29 distinct endpoints**;
      `/dashboard/personal` is one of them, shared by 3 widgets. Two dependency gates serialise them into stages —
      `useCan`->`useAccess` (`hooks/api/access.ts:53-59`) and an `IntersectionObserver`
      (`deferred-dashboard-content.tsx:31-34`).
      **INDEPENDENTLY — PARTIAL, not the clean pass recorded.** `/dashboard/personal` settles per arm and records
      `degraded[]` (`:57-72`, `:206`). **`/dashboard/stats` logs but records NO `degraded[]`** — a broken section is
      byte-identical to a denied one (`dashboard-stats.service.ts:98,117,136` vs `:100,119,138`).
      **`/dashboard/executive` has NO `settle()` at all** (`dashboard-crm.service.ts:164-196`): one failing `count()`
      of eight rejects the endpoint. Frontend containment is strong — 22 widgets wrapped in `HomeSectionBoundary`,
      enforced by a source-scanning test — with **four holes above the fold**: `ClockInWidget`, `QuickActions`,
      `ModuleSetupBanners`, `ExecutiveKpiWidget` (`dashboard-client.tsx:150,199,202,206`) are unwrapped, so a render
      throw there blanks the page via `dashboard/error.tsx`.
      **WITHOUT WAITING FOR THE SLOWEST — FAILS, for a second reason this box does not record.** Three aggregates
      are one `Promise.all` returning one body. **Zero `Suspense` anywhere in the Home tree** — no per-section server
      components, no streamed response; `loading.tsx` is the route-level whole-page skeleton. AND
      `shouldRenderDashboardLoading` (`dashboard-hydration.ts:14-20`, used `dashboard-client.tsx:113-137`) replaces
      the **ENTIRE PAGE** with a skeleton while `setupBannersPending` — ONE query, `/onboarding/module-checklists` —
      is in flight, bounded at 1500 ms. **For up to 1.5 s every available section is withheld while one section
      loads.** That is the clause negated on the client as well as the server, and it is a deliberate CLS fix, so
      closing it is a product decision on both sides, not just the backend one R-16 names.
      **NEVER AN UNBOUNDED FANOUT — HOLDS, positively proved.** Every `Promise.all` in `src/modules/dashboard/` is
      over a compile-time constant arm list (5 / 3+3 / 2,3,5 / 3 / 2 / 2 / 3). The single `Promise.all(x.map(...))`
      (`dashboard-scope.ts:42-44`) maps `DASHBOARD_HOME_SECTIONS`, a frozen literal — exactly 3 distinct modules.
      **Zero `.map(async ...)` over a query result anywhere in the module.** Row-derived ids feed one `IN (...)`
      capped at 200 (`dashboard-read-limits.ts:17`); list cap 100, attendance cap 500. Frontend has no `useQueries`
      and no `.map()` producing a hook — the query set is the component tree, a constant ~29.
      STRUCTURAL VERDICT: the fanout clause is CLOSED (proved, not assumed); "concurrently" and "independently" are
      PARTIAL with named defects; "without waiting for the slowest" FAILS on both sides. Box stays open.
      **RESIDUAL-RISK REGISTER 2026-09-03 — R-16 (ACCEPTED RESIDUAL · DECISION). Confirmed, and it is false on
      BOTH sides, which this box only says of the backend.** `dashboard-personal.service.ts:80` is
      `await Promise.all([...])` with `settle()` on the arms (`:82, :89, :109, :115, :169`), so the response waits
      for the slowest arm by construction — and the frontend fetches it as a **single** query
      (`hooks/api/dashboard.ts:379` → `/dashboard/personal`), so there is nothing to render section by section
      either. Streaming needs per-section endpoints or a streamed response, which changes the Home contract for an
      aggregate presently costing 20.04 ms p95 over 17 statements. **Owner: release owner (product). Deadline:
      2026-09-10.**
      PARTIAL: three clauses of four hold server-side in `dashboard-personal.service.ts`. Concurrently: one `Promise.all`. Independently: each arm wrapped in `settle()`, so one failing section degrades to empty and is recorded in `degraded[]`. No unbounded fanout: fixed arm list, module entitlement resolved once, no per-row or per-member fanout. **"Without waiting for the slowest" does NOT hold** — `Promise.all` returns one aggregate, so the response waits for the slowest arm by construction. Streaming section-by-section needs per-section endpoints or a streaming response. Open on a **product decision**, not on infrastructure. Now costed at request level: `GET /dashboard/personal` is 20.04 ms p95 over 17 request statements on the majority tenant, so today the aggregate is cheap and the cost of waiting for the slowest arm is small — the clause is still false by construction, and the decision is whether to pay for streaming before an arm becomes slow.
      BLOCKED (S13, unchanged): on a **product decision**, not on infrastructure or on another territory. Streaming needs per-section endpoints or a streaming response, which changes the Home contract; nobody has decided to pay for it while the aggregate costs 20 ms.
- [ ] Chat, Calendar, Inbox and Notifications list, unread/count, range/history and realtime-token paths meet budget without table scans, N+1 or per-item calls.
      **S15 — THE TABLE-SCAN HALF IS NOW ENFORCED AND MEASURED (plan shape, no stopwatch). THE N+1 HALF FAILS ON
      ONE ROUTE, verified at source.**
      **Table scans.** Run on `scratch_perf_seed` (local, at head) as **`streamline_app`, `rolbypassrls = false`**,
      tenant GUC set, reference tenant. **Buffers, rows scanned and plan node type only — the milliseconds this run
      printed were discarded and are recorded nowhere.** **Five of the ten read-cost budgets backing these four
      families carried `planAssertions: []`** and passed on a block ceiling alone (across the whole catalog it is
      **53 of 71**). `forbid-seq-scan` added to all five on the growing relation of each — `chat-channel-list` and
      `chat-channel-members` (`chat_channel_members`), `chat-messages-page` and `chat-saved-messages`
      (`chat_messages`), `dashboard-personal-notifications-count` (`notifications`, 235,297 tenant rows, whose two
      siblings over the same table already forbade one). Result **10/10 PASS**, whole catalog **71/71 PASS / 0 FAIL,
      exit 0**. Warm blocks / rows scanned for rows returned: notifications-list 121 / 42:50 · unread-count 16 / 0:1
      · dashboard-personal-notifications-count 16 / 0:1 · chat-channel-list 11 / 2:2 · chat-messages-page 10 / 50:50
      · chat-channel-members 9 / **500:100** · chat-saved-messages 81 / 230:25 · mail-inbox-cached 30 / 51:51 ·
      dashboard-personal-calendar-events **24** / 4:3 · calendar-events-visible-batch 697 / 517:500.
      **Bite-proved** in a temp tree from `git archive HEAD src`: defeating the index on `chat-messages-page` gives
      exit **1**, "chat_messages resolved by Seq Scan", at **13,344 rows scanned for a 50-row page and 243 blocks —
      INSIDE the unchanged 10,000-block ceiling**. The block ceiling could not have caught it; the assertion is the
      only thing that does. No ceiling raised. Commit `285f4bf2`.
      **N+1 — `GET /chat/channels` IS AN N+1, and it is the only one of the thirteen paths that is.** Verified at
      source, not taken on report: `chat-channel-list.service.ts:278-280` is
      `Promise.allSettled(channels.map((ch) => this.resolveEntityChannelDisplayName(ch, actor)))`, and
      `resolveEntityChannelDisplayName` `:58-60` calls `this.entities.resolve(actor, [ONE reference])` — a
      **single-element batch per channel**, defeating the batching machinery. Each resolves to one real `SELECT`
      (`crm-entity.adapter.ts:107`/`:146`, `build-entity.adapter.ts:86-94`). A 50-channel page of entity channels
      issues **50 extra SELECTs**. The fix shape is in the same file: `withResolvedReferences`
      (`entity-reference.service.ts:46-86`) flattens references across all rows into one dispatch and the message
      paths already use it. **Owner: chat owner. Not fixed here.**
      **Everything else is constant.** messages 5 · members 4 · unread 2 · saved 1+fixed · ably-token 2 SQL + 1
      outbound · notifications 3 · unread-count 2 · realtime-token 0 by construction. **Mail is per-ACCOUNT, not
      per-message** (`mail.service.ts:92` fans out over connected accounts; `gmail-mail.provider.ts:61` uses
      `include_payload: true` so a 100-message page is still one call); threads and message detail are 1 and 1-2
      fixed calls.
      **CALENDAR ANSWERED POSITIVELY: the source set is COMPILE-TIME FIXED at 7** — a `Set` written only by
      `register()`, every caller an `onModuleInit`. `HrCalendarSource`'s wide 11-way load is **never registered** and
      does not run on this route; there is no birthdays calendar source. **The "fetch by candidate id" change did NOT
      introduce a per-id loop**: `calendar-event-source.loader.ts:257` and `:286` both use `inArray(...)`, and `:170`
      resolves creator names once per request. The one loop `:139` is a keyset drain in 500-row batches capped by
      `CALENDAR_EVENTS_CAP = 2000` -> <=4 iterations. Caveat: `calendar-exception-loader.ts:53` is a `for (;;)` drain
      with no overall cap — a batch drain, not an N+1, but the one place the statement count is not constant.
      **UNBOUNDED RELATION HYDRATION STILL ON THESE PATHS — the same defect class as the 436 KB chat payload already
      fixed.** `chat-saved.service.ts:42` is `attachments: true` with **no `limit` AND no `columns`** projection;
      `chat-message-timeline.service.ts:156,224,261,302` hydrate `attachments` unqualified; and
      **`GET /chat/channels/{channelId}` still carries the unqualified `with: { members: ... }`**, including
      `user.email` (`chat-channel-members-implementation.ts:94-105`) — the LIST route was fixed, the DETAIL route was
      not. Same shape on the write path at `chat-channels.service.ts:95`. `chat-channel-list.service.ts:80` has no
      `LIMIT` at all. **Owner: chat owner.**
      STRUCTURAL VERDICT: table-scan half CLOSED and enforced for these ten budgets; per-item half CLOSED (none
      found); **N+1 half FAILS on `GET /chat/channels`**. Inbox stays provider-declined (R-14). Box stays open.
      **RESIDUAL-RISK REGISTER 2026-09-03 — the FRONTEND FOLLOW-UP below is a LIVE USER-VISIBLE REGRESSION and it
      is owned by nobody.** Verified all three halves at head: backend
      `src/modules/chat/chat-channel-member-preview.ts:159-163` returns
      `{ ...channel, members, memberCount, membersTruncated }`; frontend `types/chat.ts:103` already declares
      `memberCount: number`; and `features/chat/use-message-panel-data.ts:326` still reads
      `const memberCount = channel?.members?.length ?? 0;`. Since S13 bounded the preview at 8, **every channel
      header in the product reports at most 8 members** — the two seed channels holding 500 each read "8 members".
      The field is on the wire and in the type. **A-22 (ASSIGNABLE). Owner: frontend chat owner. Deadline:
      2026-09-08.**
      Also holding this box: **A-17** (the artifact still records the calendar breach — `check:route-budgets` exit
      1 at `measuredBufferBlocks=7072`), **R-14** (inbox is provider-declined, INFRA) and **R-17 (ACCEPTED
      RESIDUAL · TOOL)** — realtime-token is `randomUUID()` plus a `Map.set`, zero statements by construction, so
      there is nothing an instrument would add. **R-17 owner: perf-harness owner. Deadline: 2026-09-17.**
      PARTIAL, and it is no longer statement-only — these four now have request-level numbers, and one of them BREACHES its declared budget. `GET /chat/channels` returns **436,371 bytes on the majority tenant against a declared 131,072-byte ceiling** (3.3×), in 31 database statements and 11 tenant transactions, at 27.1 ms p95. `GET /calendar/events` costs **79 database statements and 64.2 MB of heap** for one request. `GET /notifications` 19.1 ms p95 / 12 request statements / 15,353 bytes; `unread-count` 6.97 ms / 11 / 35 bytes; `GET /chat/unread` 7.04 ms / 11 / 35 bytes. The request counts are a strict superset of the handler counts (authentication, permission resolution, module entitlement), recorded in their own field so the service-level ratchet is not silently widened. Inbox is provider-backed and correctly declined, not approximated. The statement-level `GET /notifications` breach stays RESOLVED (3/3), and its **2,313 planning buffer blocks against 121 execution blocks** remain the sharpest number in the manifest. Realtime-token is still verified by reading it, not measured: `generateToken` is `randomUUID()` plus a `Map.set`, zero statements by construction.
      **S13 — the chat breach is CLOSED at the payload, not at the ceiling.** `GET /chat/channels` **436,371 → 6,876 response bytes** on the majority tenant (63×, against the unchanged 131,072 ceiling), p95 **27.1 → 18.5 ms**, heap **8.1 → 2.7 MB**, re-measured over HTTP at head. Cause: `db.query.chatChannels.findMany` carried an unqualified `with: { members: … }`, so every row of `chat_channel_members` for every channel on the page rode the list — the page size bounded the channels and nothing bounded the members inside them, and two seed channels hold 500 members each (~245 KB of JSON apiece). Fixed by a bounded preview (8) plus the TRUE member count in one statement, `count(*) over (partition by channel_id)` taken before the rank filter, the caller's own row ranked first. Each member row keeps exactly the shape it had. `src/modules/chat/__tests__/chat-channel-member-preview.spec.ts` — 11 cases — is the regression gate. The 11 tenant transactions were a max across samples; the steady state is 3.
      What keeps the box open: **`GET /calendar/events` regressed** (79 → 196 statements, 583.8 → 915.9 ms, now over its ceiling) — calendar owner. Inbox stays provider-declined. Realtime-token is still verified by reading, not measured.
      **S14 — the calendar half is now GREEN too**: 196 → 65 statements, 915.944 → 305.746 ms p95, under the 800 ms ceiling, re-measured over HTTP at head (see box 2). Chat stays fixed: `GET /chat/channels` re-measured **6,876 bytes / 15 statements / 21.0 ms** in the same run. What still keeps the box open is unchanged and is NOT calendar: Inbox is provider-backed and correctly declined (no connected mail account in the seed), and realtime-token is still verified by reading `generateToken` rather than measured.
      FRONTEND FOLLOW-UP RAISED, NOT FIXED: `use-message-panel-data.ts` derives its member count as `channel.members.length`, which is now the preview length. The response carries `memberCount` and `membersTruncated` for exactly this; the one-line change is `channel.memberCount ?? channel.members.length` and it belongs to `streamlineos-frontend/frontend/features/chat/**`. Separately, that file and five others read `m.user?.id` on list members, but the payload has always nested it as `m.membership.user` — a pre-existing contract drift this change neither caused nor fixed.

- [ ] Connection-pool, worker-concurrency, queue, provider and per-tenant limits apply backpressure rather than exhausting memory, sockets or connections.
      **S15 — AUDITED PER LIMIT AGAINST SOURCE. THE POOL FAILS, AND TWO PROVIDERS HAVE NO TIMEOUT AT ALL.**
      **1. CONNECTION POOL — DECLARED + ENFORCED + QUEUES-UNBOUNDED.** `src/db/pool.config.ts:148-154`: `max` 20
      pooled / 10 direct, `connect_timeout` 30 s, `idle_timeout` 15 s, `max_lifetime` 240 s; transaction guards
      `statement_timeout` 30 s / `lock_timeout` 5 s / `idle_in_transaction_session_timeout` 60 s (`:88-92`, applied
      `with-tenant.ts:22-28`). **There is NO acquire/queue timeout, and postgres-js has none to set** — its option
      parser (`node_modules/postgres/src/index.js:447`) has no such key and its pool handler `:329-342` ends
      `busy.length ? go(busy.shift(), query) : queries.push(query)`: with every connection checked out the query is
      pushed onto an **unbounded FIFO and waits forever**; only `end()`/`destroy()` reject a waiter. `connect_timeout`
      bounds a NEW connection's handshake, not waiting for a checked-out one. The code knows and only measures it:
      `pool-telemetry.ts:96-98` increments `waiting` and `:221-229` logs "Database pool saturated — tenant
      transactions are queueing for a connection". **It logs; it does not shed.** In-request traffic is bounded only
      INCIDENTALLY by admission's 400; anything bypassing admission — cron sweeps, the outbox drain, the detached
      `void this.run(...)` webhook dispatch — queues with no ceiling at all. **Owner: db/platform owner.**
      **2. ADMISSION — DECLARED + ENFORCED + SHEDS, and it IS registered.** Every number verified in
      `admission.config.ts:55-66` (200 / 400 / 50 / 0.2 / 3 MiB / enabled). Registered `APP_GUARD`
      **`app.module.ts:207`** and `APP_INTERCEPTOR` `:210`. `tryAdmit` is **synchronous** — no waiter array, no
      promise pile — and refuses with **503 + `Retry-After: 6`** (`admission.guard.ts:59-66`). Two holes:
      **(a) the per-tenant 50 does not apply to reserved classes** (`admission.service.ts:30-33` returns admitted
      before the org check at `:39-41`), so one tenant can hold all 400 slots on auth/billing/payroll/audit; and
      **(b) the URI version prefix defeats reserved-route classification** — `main.ts:85-87` enables
      `VersioningType.URI` so `@Controller("auth")` is mounted at `/auth/...` AND `/v1/auth/...`, while
      `normalisePath` (`reserved-routes.ts:23-28`) does not strip the version segment, so `/v1/auth/login`
      classifies `ordinary-write` and sheds at 160 instead of being protected to 400. `reserved-routes.spec.ts`
      only tests the unversioned form. Whether this is live depends on which URL the frontend calls — **not
      determinable from source.** Also `maxExecutionMs` is **DECLARED-NOT-ENFORCED** as a deadline (its only
      consumer is the `Retry-After` arithmetic), and no `server.requestTimeout`/`headersTimeout` is set in `main.ts`.
      **3. WORKER CONCURRENCY / QUEUE — batch size SHEDS, deadline ABSENT, lease FAILS OPEN.** `forEachOrg`
      (`for-each-org.ts:168`) is a **strictly sequential** `for` loop — fanout **1**, not O(tenants); no
      `Promise.all` over orgs exists anywhere. Outbox `BATCH_SIZE = 50` is a GLOBAL cap across orgs
      (`outbox-publisher.service.ts:23`, `remaining` `:138-139`) with `FOR UPDATE SKIP LOCKED` and a lease fence on
      every state write. `drainPages` (`cron/drain.ts`) bounds pages per tick and separates *selected* from
      *processed* so a stalled page cannot spin. **But `CronLeaseService` fails OPEN** — Redis unavailable and it
      runs anyway with no dedup (`cron-lease.service.ts:41-44`, `:53-56`) — and **the lease TTL is not a deadline on
      `fn`**, so an over-running tick is overtaken by the next. **There is no max-runtime, abort signal or org-count
      cap on any sweep.** (`/cron/notifications-retention-detach` DOES take a lease, inside the service at
      `notification-retention.service.ts:48-52` rather than the controller — checked; not a gap.)
      **4. PROVIDER LIMITS — good shared seam, three holes.** `callProvider` (`common/outbound/call-provider.ts:102-145`)
      has a per-attempt timeout, a breaker check before each attempt and full-jitter backoff, and `outboundRequest`
      (`common/http/outbound-request.ts:10,42-44`) makes `timeoutMs` a **required** field so a caller cannot forget
      it. Then: **(a) Composio has NO timeout** — `composio.gateway.ts:104` is `new Composio({ apiKey })` with no
      `signal`, no `callProvider` wrapper and no breaker, and **this is the mail path**
      (`gmail-mail.provider.ts:61,83,97,125,147,169,187,202`); the SDK accepts `{ signal }` and none is passed.
      **(b) VirusTotal makes three bare `fetch` calls with no `AbortSignal`** — `virustotal-av-scanner.ts:49, 67, 85`
      (verified: `headers` only); Node's `fetch` has no default request timeout and `:67` uploads a whole file body
      unbounded. **(c) There is NO outbound concurrency cap anywhere.** The only limiter is `AiConcurrencyLimiter`
      (cap 20, per-org, and it **fails open** on a Redis error). `webhooks-dispatch.service.ts:107` is
      `void this.run(...)` — detached from the request, invisible to admission, uncapped in number — and `:124-126`
      is `Promise.allSettled(active.map(...))` over an **unlimited** `findMany` `:114-117` with no per-org endpoint
      cap: 500 endpoints means 500 concurrent sockets per event, each up to 5 attempts with backoff to 30 s.
      **5. PER-TENANT — body cap SHEDS, rate limiting is OPT-IN, pagination SILENTLY CLAMPS.** Body cap enforced at
      the boundary (`main.ts:114-122`, `bodyParser: false` `:66`). **`RateLimitGuard` is NOT an `APP_GUARD`** — zero
      occurrences in `app.module.ts`; it is per-controller opt-in (~30) and `rate-limit.guard.ts:27` **no-ops when no
      tier is declared**, a failure mode the tier table's own comments record as having bitten before. So the
      majority of authenticated tenant routes have no rate limit and rely entirely on admission's 50 slots.
      **Pagination is NOT a hard 400**: `pagination.ts:14,17` is `Math.min(pageSize, 100)`, so `pageSize=100000`
      returns 100 rows and **200**. Hard 400s exist only where a module's Zod schema declares one (3 call sites).
      **MEMORY HALF — a family of "drain every page into one array" helpers.** `hr-keyset-batch.ts:17-32`,
      `payroll-keyset-batch.ts:18-30`, `calendar-keyset-drain.ts:6-15`, `gdpr-subject-erasure-paging.ts:4-18`,
      `gdpr-export-types.ts:87-104` (which hard-codes `truncated: false`), `role-grant-reconciler.service.ts:185-204`,
      `calendar-conflict.service.ts:104`, `mail.service.ts:111`, `for-each-org.ts:157-161`, and
      `outbox-report.service.ts:71-95` — one object per tenant and **HTTP-reachable via the cron controller**. Page
      size is bounded; the total is not. Each carries a comment justifying it, so this is intentional and still an
      unbounded growth path proportional to tenant row count.
      STRUCTURAL VERDICT: **1 limit FAILS outright (pool), 2 have material holes (provider, per-tenant), 1 has an
      absent deadline (worker), 1 holds with two classification holes (admission).** The exhaustion MEASUREMENT half
      is unchanged and still needs a concurrent driver (R-18); A-23 is unchanged. Box stays open.
      **RESIDUAL-RISK REGISTER 2026-09-03 — one half is free, the other is a genuine tool absence.**
      **A-23 (ASSIGNABLE).** The measurement half needs no new instrumentation, and this was verified rather than
      taken from the note: `CronStorageSweepService` declares `organizations: number`
      (`cron-storage-sweep.service.ts:43`, assigned at `:83`) and `cron-storage.controller.ts:44` returns
      `{ success: true, ...outcome.result }`, so the batch size is already in the HTTP response body. What remains
      is reading it in `route-budget-http-harness.ts`, writing the pair in `merge-http-route-budgets.mjs`, and
      declaring `maxDownstreamCallsPerOrg: 1` on the two `/cron/storage-sweep` entries. **Owner: perf-harness
      owner. Deadline: 2026-09-17.**
      **R-18 (ACCEPTED RESIDUAL · TOOL).** The exhaustion half is confirmed blocked: `src/db/query-telemetry.ts:181`
      is `export const queryTelemetry = new QueryTelemetryTracker()` — a module-level singleton — and the heap
      baseline is process-wide, so two concurrent in-process requests cannot be attributed separately. Closing it
      needs a **new concurrent driver**, not a re-run of this one. **Owner: perf-harness owner. Deadline:
      2026-09-30.**
      PARTIAL: the mechanism is real and wired, and the process is now measurable, but the exhaustion behaviour is still not measured. Measured per module at concurrency 1 and 8 against a pool sized to exactly the concurrency, 48 iterations: **error rate 0.0 on all 15 modules**, latency rising and throughput flattening — queueing, not exhaustion. Newly measured through HTTP: per-request **heap above a forced-GC baseline** across 137 slots, worst `GET /calendar/events` at 64.2 MB and `GET /cron/monthly-leave-reset` at 44.5 MB, both inside their declared MB budgets; and **downstream socket counts** — `GET /cron/storage-sweep` makes **8 outbound calls against a declared ceiling of 0**, the only route in the capture that leaves the process. The limits exist and were read: `AdmissionService` (200 concurrent / 400 queue depth / **50 per tenant** / 0.2 reserved / 503 + `Retry-After`), pool max 10 direct Neon, outbox batch 50, 3 MB body cap. NOT MEASURED: behaviour at or past the pool ceiling, provider-limit backpressure, worker/queue concurrency under load — the harness measures serially by construction, because its telemetry tracker is a module-level singleton and its heap baseline is process-wide.
      **S13 — the socket half is now reconcilable.** `DownstreamCounter` records the per-ORIGIN tally beside the count (scheme + host + port only, so a pre-signed URL's credential can never reach an artifact). Measured: **`GET /cron/storage-sweep`'s 8 calls all go to one origin, `https://streamlineos.<bucket>.r2.cloudflarestorage.com`** — the object store the sweep exists to reconcile, one call per organisation over the 8 in the seed. Not a stray provider call. **The declared ceiling of 0 is NOT raised**: `forEachOrg` makes the count O(organisations swept), so no fixed per-request integer describes the route on any deployment but this one, and writing 8 would make the gate green here and meaningless in production. The basis and the derivation are recorded in the budget entry and `check:route-budgets` deliberately stays red on it.
      **S14 — the socket half is reconciled and the gate is now EXECUTED.** `check:benchmark-manifest` was named by no CI step at all; it is now a BLOCKING step in backend `ci.yml`'s `gates` job and it is **red on exactly this**, exit 1, `GET /cron/storage-sweep@reference` and `@minority` at 8 downstream calls against a declared 0. The ceiling stays at 0 and the gate stays red: the eight calls all go to one origin (the R2 bucket the sweep exists to reconcile, one per organisation over the 8 in the seed), so `maxDownstreamCalls: 0` is the wrong UNIT, not the wrong magnitude, and writing 8 would make it green here and meaningless in production.
      BLOCKED: on the per-organisation `max`/`measured` pair in **`src/scripts/check-route-budgets.mjs`** — designed and specified this session (`maxDownstreamCallsPerOrg` as a per-unit allowance added to the fixed `maxDownstreamCalls` term, applied ONLY when the harness has recorded a positive `measuredOrgsSwept`, so it fails closed and can never become an unbounded escape hatch), **IMPLEMENTED in `check-route-budgets.mjs`** (backend commit `55ca701e`, `effectiveDownstreamCeiling`): `effective = maxDownstreamCalls + maxDownstreamCallsPerOrg * measuredOrgsSwept`, so the declared 0 keeps its meaning as the organisation-independent component and the invariant it encodes for the other eleven worker batches is untouched. Six self-test cases, self-test exit 0, and the **live gate is still exit 1 on the same two breaches** — nothing went green, because no contract entry declares the new field and the allowance refuses to apply without a measured org count. What REMAINS is the measurement half: `test/perf/route-budget-http-harness.ts` (read `organizations` off the sweep's own response body, which already returns it — `CronStorageSweepService.sweep()` sets `result.organizations` from `forEachOrg`), `test/perf/merge-http-route-budgets.mjs` (write the pair) and the two `/cron/storage-sweep` budget entries (`maxDownstreamCallsPerOrg: 1`) — the sweep's own response body already returns `organizations`, so nothing new has to be instrumented, only read. Alternatively a **product decision** that a per-request cap is the right shape for an all-tenant sweep. The exhaustion half is unchanged and still needs a concurrent driver; this harness is serial by construction — its telemetry tracker is a module-level singleton and its heap baseline is process-wide, so it cannot drive a pool past its ceiling without measuring a different process than the one it reports on.
      **S16 (2026-09-03) — THE POOL FAILURE AND BOTH PROVIDER HOLES ARE FIXED; THE BOX STAYS OPEN ON THE EXHAUSTION MEASUREMENT.** Backend commits `1ffac8fe`, `a94e64b3`, `baf88d27`, `7a6c1b7e`.
      **1. CONNECTION POOL — FIXED.** 22e's reading is confirmed: postgres-js has no acquire or queue timeout to set. The bound now sits **in front of the driver**, not around it (`src/db/pool-admission.ts`, taken in `withPoolBorrow`): a bounded semaphore sized to the pool's own `max`, a queue capped at 4x `max`, and a 5 s acquire deadline, refusing with 503 + `retryAfterMs`. The load-bearing property is that **a shed caller was never handed to postgres-js and therefore executes no statement** — racing `sql.begin()` would shed the caller and still run the query later, which on a write is a phantom write. Bite-proved both ways in a temp tree: neutering the gate fails 5 of 10, and moving the shed to *after* the body fails exactly the one test that pins it. Capacity is per lane because `region.module.ts` opens one pool per region with the same `max`. Defaults env-tunable; `DB_POOL_ADMISSION_ENABLED=false` restores the unbounded wait as a deliberate deployment line. Inert until configured, so specs and scripts with no pool are never gated.
      **4. PROVIDER LIMITS — BOTH HOLES FIXED, with one correction to 22e.** VirusTotal's three bare `fetch` calls genuinely had **no timeout** (Node's `fetch` has no default) and now go through a helper that takes the deadline as a required argument. **Composio was NOT "no timeout at all"**: `ComposioConfig` (SDK 0.14.0) exposes no timeout key, but the `@composio/client` it builds defaults to `DEFAULT_TIMEOUT = 60000` with `maxRetries: 2`, so the true exposure was **~180 s plus backoff per SDK call** — bounded, but far past the 30 s `statement_timeout` around it. The per-call `ComposioRequestOptions` `signal` is the only lever the SDK gives; all **7** SDK calls now carry a fresh 15 s deadline. The outbound-concurrency cap is unchanged and still absent. **Owner (concurrency cap): webhooks owner.**
      **2. ADMISSION — the version-prefix hole is DETERMINED AND FIXED.** 22e recorded it as "not determinable from source". Determined: the **frontend does not reach it** — `NEXT_PUBLIC_API_URL` carries no path segment and `frontend/lib/api-client.ts:254` concatenates an unversioned path, so every `/v1/` in that repo is a literal controller prefix (`agent/v1`, `portal/v1`, both second segments and unaffected) or Razorpay's CDN. It stays reachable by any direct API consumer, which is what the OpenAPI document advertises, so `normalisePath` now strips a leading declared version segment after normalisation. The **reserved-class-bypass hole (`admission.service.ts:30-33` returning admitted before the per-org check) is UNFIXED** — narrowing it is a capacity decision about whether one tenant may hold all 400 reserved slots. **Owner: platform/admission owner.**
      **5. PER-TENANT — the rate-limiter question is ANSWERED AND RECORDED.** Opt-in is **deliberate**. Promoting `RateLimitGuard` to `APP_GUARD` would change nothing on its own — `rate-limit.guard.ts:27` returns true with no tier — and ambient limiting needs a **default tier for ~3,500 handlers**, a capacity decision. §4 asks for limits on abusable flows and on login, which is a targeted instruction; the ambient layer here is admission control, which IS an `APP_GUARD`. What targeting lacked was a way to notice a flow that never opted in, so that is now pinned (`rate-limit-coverage.spec.ts`): an unauthenticated write with no limiter of any kind fails the gate. **Four measured gaps, named with owners rather than exempted:** `POST /internal/audit` (the FOURTH `INTERNAL_API_SECRET` route — the TIERS comments record that the other three were limited precisely because a leaked secret was otherwise unbounded), `POST /careers/apply` (`"public:job-apply"` is declared at 3/hour and wired to nothing), `POST /csat/:surveyId/responses` (its sibling controller is limited, this one is not), `POST /crm/mailboxes/push` (every comparable webhook is limited). **Three tiers name no route:** `auth:login` — **there is no `POST /auth/login` in this repository**; the only credentials provider is a magic-link token verified at `POST /auth/magic-link/verify` (`auth:magic-link-verify`, 60/60) with issuance at `auth:magic-link` (3/60), and Google at `auth:google` (10/60), so §4's "rate limiting on login" is met by that pair and NOT by this entry — plus `sign:bulk-send-create` and `ai:vision`. **`auth:login` MUST NOT BE DELETED: `src/scripts/check-log-secrets.mjs:279` asserts the key exists.**
      **3. WORKER CONCURRENCY — UNCHANGED.** The absent runtime deadline and the fail-open `CronLeaseService` are not touched. **Owner: cron/worker owner.**
      PARTIAL: the **exhaustion measurement is unchanged and still blocked** on a concurrent driver (R-18) — nothing above was measured under load, and no benchmark was run: every number is a deterministic unit-test counter or a source census. Box stays open on the exhaustion half, the reserved-class-bypass hole, the outbound concurrency cap, the worker runtime deadline, and the four named unlimited public writes.

- [x] Regression gates fail on statistically meaningful movement, not on noise.
      Closed by measuring the noise, then by injecting twelve defects into the real artefacts. Three replicates of unchanged code over 154 benchmark×tenant pairs: buffers and rows moved by **exactly 0**, p95 by up to **270%**. So buffers, rows, planning buffers and statement counts ratchet; timing and plan shape are DISARMED — recorded, printed, not deciding the exit code — and `policyFromNoise()` re-arms them on a quieter machine with no code change. Tolerances are **per benchmark from its own envelope**, never global: a global tolerance let two wobbly reads take the buffer allowance from 0 blocks to 2,314, which is a rubber stamp, not a ratchet. False-positive proof: **0 of 308** unchanged-code comparisons would have failed. Independent re-measurement: **155 comparisons, 0 ratcheted metrics moved**, exit 0. Injections: buffers +1, rows +1, planning buffers +13,723, and a deleted benchmark all FIRE; the same planning-buffer injection is correctly DECLINED on a pair whose own planning cost moved 9 → 0; plan-flip and 100× timing correctly do not fail while disarmed; and all five honesty injections (empty subject table, uncountable table, empty module, counted db-calls over ceiling, BYPASSRLS role, missing command) are violations.
