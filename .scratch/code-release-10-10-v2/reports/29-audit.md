# Ticket 29 — Performance and Web Vitals — head audit

Auditor: read-only wave, 2026-09-03.
No prior report existed for this ticket; all evidence below was reconstructed from scratch.

**Heads audited**
- frontend `release/code-10-10-v2` @ `26df21488854b5ca72b938802295965783f8b948`
- backend  `release/code-10-10-v2` @ `66f09164f7056b377331bcc1fff5f128ada06b95`

**Caveat on the working tree.** 26 agents share this checkout. At the time of the audit
`streamlineos-backend/contracts/benchmark-manifest.json` (mtime 21:42) and
`contracts/route-budgets.json` (mtime 22:40) carried *uncommitted* edits from a concurrent lane.
Wherever a number depends on those two files I state which version it came from, and I
re-derived the load-bearing ones against `git show HEAD:` content so the finding does not rest
on another agent's in-flight work. I wrote no file except this report; I verified that
`merge-http-route-budgets.mjs --check` mutates only an in-memory object
(`test/perf/merge-http-route-budgets.mjs:302-327`; `writeFileSync` at :378 is reachable only
under `--write`).

---

## 1. What I read, with numbers

### Frontend corpus

| Thing | Size / count |
|---|---|
| `app/**/page.tsx` | 600 total, **556 under `app/(authenticated)`** |
| `lib/module-manifest.json` | **22** declared product modules |
| Files importing `next/dynamic` | **91** files, **155** `dynamic(` call sites (`features` 75, `components` 11, `app` 5) |
| `React.lazy` sites | 1 |
| Virtualized list components | **6** — calendar, inbox, chat, mail, build kanban, notifications |
| `contracts/route-bundle-manifest.json` | **13** routes × **9** budget dimensions, 3 `budgetExceptions`, 9 `measurementNotes` |
| `.browser-driver-results.json` | **13 routes × 2 profiles × 8 repeats = 208 navigations**, 26 route×profile metric blocks |
| Perf/E2E harness source read | `check-web-vitals-budget.mjs` 745 L, `check-route-bundle-budget.mjs` 200 L, `measure-web-vitals.mjs` 1,419 L, `measure-route-bundles.mjs` 231 L, `browser-journeys.mjs` 1,494 L = **4,089 lines** |
| Production build re-measured | `.next` BUILD_ID `jsZ4Sk8mVF-4XGtxc465O`, **13 route client-reference manifests**, all `static/chunks/**.js` scanned for 11 library markers |

Frontend gates I ran (exit codes are the script's own, not `tail`'s):

| Gate | Exit | Corpus it reported |
|---|---|---|
| `check:web-vitals-budget` | **1** | 13 routes, 1 violation |
| `check:route-bundle-budget` | **1** | 13 routes, 13 measured, 0 pending, **18 breaches** |
| `check:query-scope` | 0 | 5,370 files |
| `check:seo-metadata` | 0 | 1,224 route files |
| `check:gated-reads` | 0 | (self-declared weak; defers to `check:permission-binding`) |
| `check:client-pages` | 0 | 141 client pages of 600 (ceiling 304) |
| `check:module-manifest` | 0 | consistent |
| `check:gate-wiring` | 0 | 35 gates, 32 able to fail, **3 registered non-blocking** |

### Backend corpus

| Thing | Size / count |
|---|---|
| `src/modules/` directories | **74** (76 entries − 2 stray spec files) |
| `contracts/benchmark-manifest.json` | **15** modules, **100** benchmarks (70 read-cost + 30 heavy-query), `requestLevel` with **164** route×tenant slots |
| `contracts/route-budgets.json` | **92** budgets (HEAD) against **3,613** OpenAPI operations = 2.5 % |
| `src/scripts/read-cost-budgets.mjs` | **71** declared read-cost budgets |
| Statements EXPLAINed by me | 3, on `scratch_perf_seed` (1,729 MB, the production-shaped seed) |
| Targeted jest run | `cache-degradation` — **21/21 pass**, 0.9 s |

Backend gates I ran:

| Gate | Exit | Headline |
|---|---|---|
| `check:benchmark-manifest` | **1** | `STATUS: FAIL — 154/280 (55.0%) statement ceilings measured, 137/164 (83.5%) request slots` |
| `check:route-budgets` | 0 | `PARTIAL — 387 of 640 declared ceilings measured; 253 unmeasured and unenforced` |
| `check:route-budgets-http` | **1** | `contracts/route-budgets.json is out of date with the capture` |
| `check:cache-key-shapes` | 0 | — |
| `check:cache-invalidation` | 0 | 1,076 service files; 187 write sites / 177 shapes / 475 invalidate sites / 131 factories |
| `check:n1-growing-loops` | 0 | **97 growing sites across 73 files** (ratchet 102) |
| `check:unbounded-reads` | 0 | 3 unbounded reads remain (target 0) |
| `check:query-projections` | 0 | 1,378 unprojected reads (ceiling 1,383) |
| `check:db-call-count` | 0 | 3 files with an N+1 the patterns cannot see |
| `check:relation-hydration` | 0 | 186 unprojected relations (ratchet 186) |
| `check:tenant-indexes` | 0 | **840/840 tenant tables** carry a leading tenant index |
| `check:bounded-contracts` | 0 | 0 in-scope violations |
| `check:bulk-id-limits` | 0 | 3,389 schema files |
| `check:compression` | 0 | compression middleware present |
| `db:check-read-budgets` (mine, on `scratch_perf_seed`) | 0 | **71/71 PASS**, 0 unmeasured, 0 vacuous |

---

## 2. Per-criterion assessment

### PRD-C005 — Query/database cost (complete ticket 18, retain evidence here) — **PARTIALLY MET**

The precondition is unsatisfiable from here: there is **no `18-audit.md`** in
`.scratch/code-release-10-10-v2/reports/`. The only ticket-18 artifact is the v1
`18-query-cache-contracts.md` (17:14). So "complete v2 ticket 18's criteria" is not evidenced
at head, and this criterion cannot close on ticket 29's side alone.

The evidence-retention half I *did* discharge, by measurement:

- **Bounded projection.** `check:query-projections` exit 0 — but the enforced number is a
  ratchet at 1,378 unprojected reads (287 `findMany`, 488 `findFirst`, 603 bare `.select()`)
  against a ceiling of 1,383. Unprojected *count/existence* paths are 0 in scope. Full-row
  reads of vector/tsvector/bytea tables: 0 over 5 such tables.
- **N+1.** `check:n1-growing-loops` exit 0 at 97 growing sites across 73 files (ratchet 102);
  its own output says "this is a ratchet to drive to zero, not a clean repository".
  `check:db-call-count` names 3 files whose N+1 is invisible to the patterns
  (`hr-effective-change-applier`, `leave-approver`, `timesheets approvals-bulk`).
  I found one more the patterns do not name — F5 below.
- **Tenant predicate.** `check:tenant-indexes` 840/840. I found no read missing an org
  predicate. `chat-channel-list.service.ts:111-121` omits `org_id` on `chat_channel_members`
  but constrains it through the join to `chat_channels.org_id`, so it is scoped.
- **Index.** One measured hole, F1: a hot authenticated read keyed on a column no index leads.
  `check:tenant-indexes` cannot see it because it only asserts the *leading* tenant column.
- **Pagination.** `check:unbounded-reads` 3 remaining; `check:bounded-contracts` and
  `check:bulk-id-limits` both clean in scope.
- **Cache key / invalidation.** Backend `check:cache-key-shapes` and `check:cache-invalidation`
  both exit 0 over 1,076 service files. On the frontend the tenant dimension is not in the key
  literals (e.g. `queryKeys.inbox.unified({limit, kinds, unreadOnly, infinite})`,
  `hooks/api/inbox.ts:24`) but is applied *globally*: `components/providers/query-provider.tsx:87-97`
  derives `authenticatedScope(orgId, userId)`, feeds it to `scopedQueryKeyHashFn(scope)`, and
  remounts the whole `QueryClient` on `key={scope}`. That is a sound design and
  `check:query-scope` enforces it over 5,370 files. **No cross-tenant cache leak found.**
- **Performance evidence retained.** Yes — §3 and §4 of this report, plus my
  `db:check-read-budgets` run (71/71) and three `EXPLAIN (ANALYZE, BUFFERS)` plans.

### PRD-C006 — Frontend speed, preserving lazy-loading / virtualization / hydration gains — **PARTIALLY MET**

The *gains* are present and I verified them:

- **Lazy-loading:** 155 `dynamic()` sites in 91 files. I mapped 11 heavy libraries into each
  route's first-load chunk set from the head build. `recharts` (54 chunks), `@tiptap`
  (4 chunks), `pdfjs-dist`, `jspdf`, `react-markdown`, `DOMPurify` and `emoji-mart` appear in
  **zero** of the 13 measured routes' first-load sets. Charts, editors, PDF and markdown are
  genuinely split out.
- **Virtualization:** 6 virtual list components covering exactly the C145 modules.
- **Hydration:** the capture reports `hydration.mismatchesFound: 0` over 208 navigations.

The *budgets* are not met, and the evidence for them does not describe head — F2, F10, F12.

### PRD-C139 — bundle boundaries, lazy loading, Web Vitals, public metadata, representative browser E2E — **PARTIALLY MET**

- Bundle boundaries / lazy loading: measured above; charts and editors are split, `framer-motion`
  is not (F12).
- Web Vitals budgets: see C149.
- **Public metadata: MET.** `check:seo-metadata` exit 0 over **1,224 route files**.
- Landing visuals/animations: unchanged — nothing in this audit touches them.
- **Representative browser E2E: NOT MET as a deliverable.**
  `frontend/scripts/browser-journeys.mjs` exists and is serious (1,494 lines: authenticated
  shell assertions, terminal-state assertions, one-`<h1>`/named-`<main>`, no horizontal overflow
  at 375/768/1280, WCAG AA against painted colour, axe on the painted tree, and
  `WRITE_JOURNEYS` that drive a real mutation through the UI and require it to survive a reload).
  But: `.browser-journeys-results.json` **does not exist anywhere in the tree** (the file the
  script writes at line 1070/1423), and `grep -rn "browser:journeys\|browser-journeys" .github/`
  returns **nothing** — no workflow step invokes it. `check:gate-wiring` cannot catch this
  because it governs `check:*` names only. See F11.

### PRD-C140 — benchmark manifest for every module — **PARTIALLY MET**

A real, unusually honest manifest exists: 15 modules, 100 benchmarks, `environment.releaseSha`,
machine limits (Apple M5 Pro, 15 cpu / 24,576 MB, container false), database
(`scratch_perf_seed`, 1,702 MB, PG 18.4, role `streamline_app` bypassrls=false), the exact
command, 200 samples × 3 replicates, concurrency [1, 8], 4 tenants with declared skew shares,
per-module p95 at c1 and c8, and error rate 0 on every module.

What C140 asks for and is missing:

1. **Not every module.** 15 covered against **22** declared in `frontend/lib/module-manifest.json`.
   Absent: `billing`, `blog`, `directory`, `feedbucket`, `settings`, `sign` (e-sign), `surveys`,
   `timesheets` (present only as a table under `build`), `workflows` — **9 of 22**. `billing` is
   a money module.
2. **The manifest is 361 commits stale.** The gate's own output:
   `staleness: measured 361 commit(s) BEHIND HEAD (ef3c1960 -> 66f09164). Every number below
   describes the older commit.` It also reports `subject: DRIFTED — 2 measured SQL catalog(s)
   changed on disk since capture` and `the request-level capture ran on a DIRTY working tree at
   2f37e1bb`. Credit where due: the backend gate **detects and prints** its own staleness. The
   frontend gates do not (F2).
3. **Coverage.** 154/280 (55.0 %) statement ceilings measured; 6 vacuous benchmarks (0 rows, so
   every ceiling satisfied trivially); 9 seeding gaps; `dbCallRatchetsArmed: 2` of 70 linked read
   paths (2.9 %).

Verdict: the *format* of C140 is fully satisfied for the 15 modules it covers. The *scope*
("every module") and the freshness are not.

### PRD-C141 — p95 ≤ 300 ms ordinary, ≤ 800 ms approved complex, excluding provider time — **PARTIALLY MET**

Measured, from `requestLevel.routes` (137 measured slots, 115 scored, 22 worker batches excluded
from the request ceiling):

- **median scored p95 = 9.6 ms; the 95th percentile of the scored p95s = 23.2 ms.** The ordinary
  ceiling is comfortably met across the measured surface.
- **2 scored slots over 300 ms**, both `POST /chat/channels/{channelId}/messages`:
  5,043.1 ms @reference and 670.6 ms @minority.
- **1 scored slot over 800 ms**: the same route @reference.
- Nearest approved-complex: `GET /calendar/events@reference` 269.0 ms against an 800 ms ceiling
  (65 request DB statements, 220,339 response bytes, 59.5 MB heap).

Honesty on the 5 s figure: p50 is 65.8 ms and p95 = max over only 12 write samples, so the
5,043 ms is a single outlier dominated by the synchronous Ably publish — which C141 excludes as
provider time. What is **not** excludable is application-controlled and over declared ceilings:
53 request DB statements against `maxDbCalls: 12`, and 1–3 `downstreamCalls` against
`maxDownstreamCalls: 0`. See F4.

Coverage caveat: 92 budgets over 3,613 operations (2.5 %), and 253 of 640 declared ceilings are
unmeasured and therefore unenforced (`check:route-budgets` own words).

### PRD-C142 — DB statements p95 ≤ 50 ms ordinary, ≤ 200 ms approved complex, plans retained — **MET on the measured set, coverage incomplete**

I ran the instrument myself against the production-shaped seed:

```
APP_DATABASE_URL=postgres://streamline_app@127.0.0.1:5432/scratch_perf_seed PGSSLMODE=disable \
  node src/scripts/run-read-cost-budgets.mjs
-> --- Tally: 71 PASS / 0 FAIL / 0 UNMEASURED / 0 EXCL / 0 SKIP ---
   Coverage: 71/71 (100.0%), profile=reference. 0 unmeasured (0 vacuous, 0 below seed floor).
   STATUS: OK — all 71/71 declared budgets measured and within ceiling.   [exit 0]
```

Worst statement p95 in that run: `calendar-events-visible-batch` at **22.002 ms** — the only
budget above 5 ms; everything else is sub-4 ms. Nothing approaches 50 ms.

Per-module c1/c8 p95 from the manifest: c1 ranges 0.37–1.70 ms, c8 ranges 10.9–17.0 ms. All
inside 50 ms.

Plans: `approvedComplexPlansRetained` = 20/18/18/17 across the four tenants, and
`test/perf/benchmark-plans/plans-{large,mid,small,tiny}.txt` hold the retained plan text.
`approvedComplexStatements: 20`.

Coverage is the gap, not the ceilings: 154/280 (55.0 %) of benchmark×tenant slots, 6 vacuous,
120 unmeasured. `measuredPerTenant` is large 94 / mid 77 / small 64 / **tiny 9** — the tiny
tenant is essentially unmeasured because of the 9 declared seeding gaps.

### PRD-C143 — cache-hit p95 ≤ 100 ms, authorization preserved, safe degradation without a request storm — **HALF MET, HALF NOT MEASURED**

**Degradation and authorization: MET, and I measured it.** `src/common/cache/cache-fill.ts`
implements single-flight coalescing (`inFlight` map, :91) with a degraded-path memo that keeps a
settled promise for the outage window (:32-38) and TTL jitter (:173-185). Targeted run:

```
npx jest --runInBand --testPathPattern="cache-degradation"
-> Tests: 21 passed, 21 total
```

Including 9 assertions that the outage memo **never** caches an authorization answer —
`user:session:*`, `membership:account:*`, `access:version:*`, `access:perms:*`, `rbac:matrix:*`,
`mfa:org-policy:*`, `mfa:user-totp:*`, `revoked:session:*` — plus one anti-vacuity assertion
that an ordinary read *is* memoised, so the exclusion list is not trivially satisfied. There is
also a distributed fill lease so waiters stop when the lease is gone rather than polling.

**The ≤ 100 ms cache-hit ceiling: NOT MEASURED.** `contracts/benchmark-manifest.json:15-16`
declares `"cacheHitPath": 100` and then states: *"The cache-hit ceiling remains unmeasured — no
Redis runs against this seed."* `coverage.notMeasured` repeats it. Every latency number in the
whole manifest is the cache-MISS path. Note that this is a harness-configuration gap, **not**
missing infrastructure: `redis-server` is listening on `127.0.0.1:6379` on this host
(`lsof -iTCP -sTCP:LISTEN`). See F7.

### PRD-C145 — Chat, Calendar, Inbox, Notifications: list, unread/count, range/history, realtime-token — **NOT MET**

Walked dimension by dimension.

| Path | Benchmark | Route budget | Measured | Verdict |
|---|---|---|---|---|
| Notifications **list** | `notifications-list` | `GET /notifications` | 121 buffers, 50 rows, p95 0.063 ms; request p95 18.1 ms, 3 db calls | clean |
| Notifications **unread count** | `notifications-unread-count` | `GET /notifications/unread-count` | 16 buffers, p95 0.020 ms; request p95 10.1 ms | clean |
| Notifications **search** | `notification-list-search-ilike` | none | 561 buffers, leading-wildcard `ILIKE` — the shape backend CLAUDE.md §3 bans | shape flagged by the harness itself |
| **Unified inbox list** | `unified-inbox-list-by-user` | **none** | 2,073 buffers, 42,865 rows scanned for 20 result rows | **F1** |
| **Unified inbox unread count** | `unified-inbox-unread-count-by-user` | **none** | 10,234 buffers, 23,418 rows scanned for one integer | **F1** |
| Chat channel list | `chat-channel-list` | `GET /chat/channels` | 17 buffers, request p95 24.2 ms | clean |
| Chat **messages page (history)** | `chat-messages-page` | `GET /chat/channels/{id}/messages` | 12 buffers, p95 0.015 ms, request p95 10.7 ms | clean |
| Chat unread | — | `GET /chat/unread` | request p95 8.4 ms; `measuredBufferBlocks: null` | latency clean, read path unmeasured |
| Chat **message write** | — | `POST /chat/channels/{id}/messages` | p95 5,043 ms, **53 db calls** vs ceiling 12, 1–3 downstream vs ceiling 0 | **F4** |
| Calendar **range** | `export-calendar-range` | `GET /calendar/events` | 5,511 buffers for 500 rows; request p95 269 ms, **65 db calls** vs ceiling 15, 220 KB, 59.5 MB heap | over its db-call ceiling |
| Calendar reminder fanout | `reminder-attendee-fanout-page` | none | 5,010 buffers, **121,628 rows scanned** for 1,000 rows | worker path, unbudgeted |
| Mail inbox | `mail-inbox-cached` | `GET /mail/messages` | 29 buffers, p95 0.019 ms | clean; module has **1** benchmark on 4,000 rows |
| **Realtime token — chat** | **none** | **none** | **not measured at all** | **F9** |
| **Realtime token — support** | **none** | **none** | **not measured at all** | **F9** |

C145 asks to *prove* these paths meet their budgets without table scans, N+1 or per-item calls.
Two of the four named surfaces have a proven table scan on their primary user-facing read (F1),
the realtime-token paths named in the criterion have no budget, no benchmark and no number (F9),
and the chat write path exceeds its declared db-call and downstream-call ceilings (F4). The
per-item shape appears in the chat push fanout (F5).

### PRD-C148 — automated performance-regression gates on latency, query-count, buffer, payload, memory — **PARTIALLY MET**

`contracts/benchmark-manifest.json.metrics` declares **9** metrics. Mapping them onto C148's
five named axes:

| C148 axis | Metric | State |
|---|---|---|
| buffer | `bufferBlocks`, `planningBufferBlocks`, `scanRows` (deterministic) | **ARMED** — exact on 154/154 pairs |
| query-count | `measuredDbCalls` (exact) | armed, but only **2/70 (2.9 %)** of linked read paths carry a counted figure |
| latency | `p50Ms` / `p95Ms` / `p99Ms` (timing) | **DISARMED** — `"armed": false`, "unchanged code moved by up to 270 % between replicates against a 25 % arming threshold" |
| payload | *(none)* | **ABSENT** — no `responseBytes` metric exists in `metrics` |
| memory | *(none)* | **ABSENT** — no `memoryMb` metric exists in `metrics` |
| (plan shape) | `planSignature` (exact) | **DISARMED** — 2 of 262 pairs changed shape across replicates with no code change |

And the comparison itself is never invoked: `check:benchmark-manifest` prints
`Regression pass: NOT RUN — pass --against=<fresh measurement json> to ratchet`, and
`grep -rn "\-\-against" .github/workflows/ package.json` returns **nothing** in the backend repo.
So even the two armed axes never actually compare two runs in CI.

Genuine credit: the disarming is *derived*, not asserted — a 3-replicate noise study whose
provenance and worst swings are recorded, plus a false-positive proof
(`0 of 308 unchanged-code comparisons would have failed the gate`). That is the right way to
build such a gate. It is simply not yet a regression gate on three of five axes.

Frontend side: `check:route-bundle-budget` and `check:web-vitals-budget` are *ceiling* checks,
not regression checks — there is no previous-run baseline anywhere in the frontend — and both are
`continue-on-error: true` in `.github/workflows/frontend.yml` (registered in
`NON_BLOCKING_BY_DESIGN`).

### PRD-C149 — Core Web Vitals on production builds: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 — **PARTIALLY MET, and the evidence does not describe head**

The measured numbers, on the capture at `.browser-driver-results.json`
(`serverMode: production`, buildId `iTIKVvc-wqpbkjxEiy548`, repeat 8, 208 navigations,
desktop 1440×900 unthrottled / mobile 390×844@3× with 4× CPU + 1.6 Mbps + 150 ms RTT):

| route | LCP p75 d/m | INP p75 d/m | CLS p75 d/m |
|---|---|---|---|
| /dashboard | 717 / 1592 | 32 / 106 | 0.002 / 0.057 |
| /mail | 399 / 558 | 32 / 66 | 0.001 / 0.002 |
| /inbox | 85 / 294 | 32 / 84 | 0.001 / 0.000 |
| /notifications | 88 / 311 | 32 / 116 | 0.001 / 0.000 |
| /chat | 73 / 1251 | 24 / n/a | 0.001 / 0.000 |
| /calendar | 747 / 1636 | 32 / 120 | 0.002 / 0.001 |
| /settings | 81 / 597 | 32 / 80 | 0.008 / 0.007 |
| /parties | 384 / 1565 | 32 / 74 | 0.002 / 0.000 |
| /support/inbox | 98 / 1442 | 40 / 80 | 0.006 / 0.000 |
| /build/inbox | 81 / 276 | 32 / 68 | 0.014 / 0.001 |
| /build/my-work | 139 / 299 | 58 / 144 | 0.001 / 0.000 |
| /crm/inbox | 78 / 300 | 26 / 68 | 0.001 / **0.109** |
| /crm/leads | 389 / 1527 | 32 / 64 | 0.001 / 0.000 |

Every LCP, INP and CLS is inside budget except mobile `/crm/inbox` CLS 0.109. CRM is out of
release scope, and the breach carries a written, route-scoped `budgetExceptions` entry that the
gate still counts as a failure — which is the honest arrangement and the gate's self-test
asserts an exception can never reduce the failure count.

Two things stop this being MET:

1. **The capture declares itself unusable and the gate does not look.** `contentAssertion.verdict`
   in the very file the gate reads is `"capture is NOT usable evidence"` — 16 of 208 samples (all
   8 desktop and all 8 mobile samples of `/crm/leads`) rendered an **error boundary**, not the
   product. `grep -n "contentAssertion\|unusable\|errorBoundary\|verdict" scripts/check-web-vitals-budget.mjs`
   returns **nothing**: the gate consults none of the capture's five verdicts. It therefore
   published LCP 389 ms desktop / 1,527 ms mobile and CLS 0.001 for `/crm/leads` — figures taken
   over an error page. See F13.
2. **Staleness.** F2: the capture predates 91 commits, 33 of which touch
   `frontend/{app,components,features,lib,hooks}`, including five `perf(…)` commits that moved
   lazy boundaries.

Coverage: **13 of 556** authenticated pages (2.3 %). "In-scope authenticated routes" is not
defined anywhere I could find, so I cannot say whether 13 is the intended set; the 13 are a
defensible representative selection (one per major module family).

### PRD-C151 — record route-level JS/CSS/payload/image/font/third-party budgets; lazy-load editors, charts, calendars, chat media, AI — **PARTIALLY MET**

**Budgets recorded: yes, all six dimensions.** `defaults` declares `maxFirstLoadJsBytes` 524,288,
`maxPageChunkBytes` 204,800, `maxCssBytes` 65,536, `maxImageBytes` 524,288, `maxThirdPartyBytes`
102,400, `maxFontBytes` 131,072, `maxServerPayloadBytes` 40,960, `maxScriptBytes` 524,288,
`maxTotalBytes` 1,048,576. All 13 routes carry measured values for all of them.

**Budgets met: no.** `check:route-bundle-budget` exit 1, **18 breaches**:

- `measuredScriptBytes` over 524,288 on **13 of 13 routes** — /support/inbox +201,663,
  /chat +292,720, /build/my-work +259,808, /crm/leads +248,829, /calendar +174,253,
  /mail +115,074, /parties +94,262, /settings +81,566, /dashboard +80,705, /crm/inbox +76,931,
  /notifications +62,698, /build/inbox +50,701, /inbox +48,830.
- `measuredPageChunkBytes` over 204,800 on /chat, /build/my-work, /crm/leads.
- `measuredFirstLoadJsBytes` over 524,288 on /build/my-work, /crm/leads.

CSS (58,161 B), fonts (55,206 B), images (2,907–10,531 B), third-party (0 B) and server payload
(20,289–25,747 B) are inside budget on every route.

**Lazy-loading of the named categories.** I measured this against the head build by mapping
library markers into each route's client-reference chunk set:

| Library | Chunks containing it | In any measured route's first load? |
|---|---|---|
| recharts (charts) | 54 | **no** |
| @tiptap / ProseMirror (module editors) | 4 | **no** |
| pdfjs-dist | 1 | no |
| jspdf | 1 | no |
| react-markdown | 1 | no |
| DOMPurify | 2 | no |
| emoji-mart | 0 | n/a |
| @tanstack/react-table | 1 | /parties, /crm/leads |
| ably (realtime/chat) | 4 | **/chat, /support/inbox** |
| cmdk (command palette) | 50 | **/build/my-work, /crm/inbox** |
| framer-motion | 57 | **all 13 routes** |

So charts, editors, PDF, markdown and sanitisation are correctly split out — the criterion's core
demand is honoured for those. Two gaps: `framer-motion` is in every route's first load (F12), and
`cmdk` still lands in two routes' first load despite commit `2bf373c45` "perf(shell): defer the
command palette and workspace dialog".

**A budget-recording defect.** Six routes raised `maxFirstLoadJsBytes` to 614,400 and carry a
note reading *"PASSES: 507kB < 614kB ceiling"* while the same entries breach the default
`maxScriptBytes` by 49–202 kB. No route declares a per-route `maxScriptBytes`, so the
"route-level JavaScript budget" C151 asks for is in practice one global default that every
measured route exceeds. See F10.

---

## 3. Measurements I took myself (reproducible)

**M1 — read-cost budgets on the production-shaped seed.** 71/71 PASS, exit 0.
`APP_DATABASE_URL=postgres://streamline_app@127.0.0.1:5432/scratch_perf_seed PGSSLMODE=disable node src/scripts/run-read-cost-budgets.mjs`

**M2 — the unified-inbox unread count, `EXPLAIN (ANALYZE, BUFFERS)` on `scratch_perf_seed`:**

```
Aggregate (actual time=31.739..31.745 rows=1.00 loops=1)
  Buffers: shared hit=987 read=9244 written=12          <-- 10,231 blocks ≈ 80 MB
  ->  Append (actual time=2.457..31.705 rows=564.00 loops=1)
        ->  Seq Scan on notifications_y2024_m01 ...     <-- and every other partition
```

The membership-keyed equivalent on the same tenant: `Buffers: shared hit=4 read=32` — **36
blocks, 284× fewer.** The list read by `user_id` (`LEFT JOIN users`, `LIMIT 20`):
`Buffers: shared hit=367 read=1676` = 2,043 blocks for 20 rows.

**M3 — route bundles re-measured against the head build** (`node scripts/measure-route-bundles.mjs`,
report-only, BUILD_ID `jsZ4Sk8mVF-4XGtxc465O`, baseline `/dashboard` 35 chunks / 308,707 B):

| route | recorded FLJS | **head FLJS** | recorded pageChunk | **head pageChunk** |
|---|---|---|---|---|
| /build/my-work | 550,153 | **362,709** | 271,503 | **83,143** |
| /crm/leads | 550,951 | **356,527** | 268,155 | **72,815** |
| /parties | 414,075 | **334,621** | 135,425 | **55,055** |
| /chat | 497,147 | **445,208** | 218,497 | **165,642** |
| /crm/inbox | 336,754 | 332,737 | 53,958 | 49,025 |
| the other 8 | — | within ±930 B | — | within ±150 B |

All five `measuredFirstLoadJsBytes`/`measuredPageChunkBytes` breaches the gate reports are
against numbers the head build no longer produces. The 13 `measuredScriptBytes` breaches are
over-the-wire figures I could not re-measure (see §5); the manifest's own note that
`measuredScriptBytes ≈ 2 × measuredFirstLoadJsBytes` implies they persist, but I did **not**
measure that and do not claim it.

**M4 — heavy-library first-load map**, §2/C151 table above, from the head build's
`page_client-reference-manifest.js` chunk sets cross-referenced against every
`.next/static/chunks/**.js`.

**M5 — cache degradation spec**: 21/21 pass, including 9 authorization-key exclusions and one
anti-vacuity assertion.

**M6 — contract-vs-capture drift recomputed on `git show HEAD:` content** (so it does not depend
on the concurrent lane's uncommitted edits): 68 reference slots are measured and have a budget;
**12 of them disagree** on `measuredLatencyP95Ms`, e.g. `GET /cron/storage-sweep` 1679.353 in the
contract vs 1494.833 in the capture, `GET /mail/messages` 7.446 vs 5.759, `GET /cron/ai-reservations-sweep`
65.692 vs 58.671.

---

## 4. Findings

| # | Sev | file:line | Summary |
|---|---|---|---|
| F1 | **P1** | `streamlineos-backend/src/modules/notifications/unified-inbox.service.ts:386` | Unified-inbox unread count seq-scans every `notifications` partition — 10,231 buffers for one integer — because no index leads `(org_id, user_id)` |
| F2 | **P1** | `streamlineos-frontend/frontend/scripts/check-web-vitals-budget.mjs:651` | Frontend budget evidence is 33 frontend-source commits stale and neither budget gate can detect it |
| F3 | **P1** | `streamlineos-backend/contracts/route-budgets.json:1` | The route-budget contract disagrees with the capture it was merged from; the blocking CI step that enforces this exits 1 at head |
| F4 | **P1** | `streamlineos-backend/src/modules/chat/chat-messages.service.ts:265` | Chat message write: 53 DB statements vs a declared 12, and 1–3 downstream provider calls vs a declared 0 |
| F5 | **P1** | `streamlineos-backend/src/modules/realtime/web-push.service.ts:135` | Chat push fanout is O(members) DB reads + O(members) ledger writes with no LIMIT, and throws on every message when Web Push is unconfigured |
| F6 | P2 | `streamlineos-backend/contracts/benchmark-manifest.json` (`metrics`) | Two of C148's five regression axes (payload, memory) have no metric at all; latency and plan shape are disarmed; `--against` is never passed in CI |
| F7 | P2 | `streamlineos-backend/contracts/benchmark-manifest.json:16` | The ≤ 100 ms cache-hit ceiling is unmeasured although Redis is running on this host |
| F8 | P2 | `streamlineos-backend/contracts/benchmark-manifest.json` (`modules`) | 15 of 22 product modules have a benchmark; 9 are absent, including `billing` |
| F9 | P2 | `streamlineos-backend/src/modules/chat/chat-realtime.controller.ts:25` | The realtime-token paths C145 names have no route budget, no benchmark and no measurement |
| F10 | P2 | `streamlineos-frontend/frontend/contracts/route-bundle-manifest.json` (`/mail.note`) | Six route notes claim "PASSES" while the same entries breach the default `maxScriptBytes`; no route declares a per-route script budget |
| F11 | P2 | `streamlineos-frontend/frontend/scripts/browser-journeys.mjs:1070` | The browser E2E harness exists but has no committed results artifact and is invoked by no workflow step |
| F12 | P2 | `streamlineos-frontend/frontend/contracts/route-bundle-manifest.json` (`notes.framerMotionScope2026_09_03`) | `framer-motion` is in the first-load chunk set of all 13 measured routes |
| F13 | **P1** | `streamlineos-frontend/frontend/scripts/check-web-vitals-budget.mjs:663` | The Web Vitals gate ignores all five of the capture's own verdicts, including `"capture is NOT usable evidence"` |

### F1 — P1 — `src/modules/notifications/unified-inbox.service.ts:386` (and `:239`)

`countNotificationUnread` filters `eq(notifications.orgId, …), eq(notifications.userId, …),
eq(notifications.isRead, false), isNull(deletedAt), isNull(archivedAt)`. Every index on
`notifications` leads `(org_id, membership_id, …)` or `(org_id, category|created_at|event_key)`
— I listed all 9 from `pg_indexes` on `scratch_perf_seed`. There is **no** `(org_id, user_id, …)`
index.

*Failure scenario.* A tenant with 235,297 notifications (the reference tenant in the shipped
perf seed) opens any page that renders the unified-inbox badge. Postgres sequentially scans every
monthly partition of `notifications`: **10,231 shared buffer blocks ≈ 80 MB of buffer traffic and
31.7 ms of execution for a single integer**, measured by me. The membership-keyed equivalent is
36 blocks. The list read (`fetchNotifications`, :239, same `user_id` predicate) is 2,043 blocks
for 20 rows. Both grow linearly with tenant notification volume, and both run under RLS as the
app role in production. Neither `GET /me/inbox/unified` nor `GET /me/inbox/unified/count`
(`src/me/inbox.controller.ts:41,47`) has a route budget, a read-cost budget or a benchmark, so
nothing in the release harness would notice.

This is the *unmeasured twin* of a defect already fixed: `GET /notifications/unread-count` once
measured `measuredBufferBlocks=10234` (recorded verbatim in the backend CI comment at
`.github/workflows/ci.yml:928`) and now measures 16, because that route keys on `membership_id`.
The identical query on the unified inbox was never budgeted and still scans.

*Proposed fix.* Either key the unified inbox off `membership_id` the way
`notifications-read.service` already does, or add
`CREATE INDEX idx_notifications_user_unread ON notifications (org_id, user_id, id DESC)
WHERE deleted_at IS NULL AND archived_at IS NULL AND is_read = false` plus a non-partial
`(org_id, user_id, id DESC) WHERE deleted_at IS NULL AND archived_at IS NULL` for the list. Then
declare route budgets for both `/me/inbox/unified` paths and add them to
`src/scripts/read-cost-budgets.mjs` so the ceiling is enforced.

### F2 — P1 — `frontend/scripts/check-web-vitals-budget.mjs:651` and `scripts/check-route-bundle-budget.mjs:46`

`.browser-driver-results.json` records `generatedAt: 2026-09-03T07:15:47.093Z` and
`buildId: iTIKVvc-wqpbkjxEiy548`. `.next/BUILD_ID` at head is `jsZ4Sk8mVF-4XGtxc465O`.
`git log --since="2026-09-03 12:45:47 +0530"` = **91 commits**, of which **33** touch
`frontend/{app,components,features,lib,hooks}`, including `61c3510aa perf(chat,calendar): defer
25 interaction-gated subtrees`, `778f7d467 perf(inbox family): defer heavy sheets`,
`372cbc10c perf(dashboard): defer six below-the-fold cards`, `2bf373c45 perf(shell): defer the
command palette`, and `5582f4309 perf(hooks): resolve response contracts lazily`.

`check-web-vitals-budget.mjs` validates exactly two preconditions —
`results.serverMode !== "production"` (:651) and `authenticatedRoutes.length === 0` (:663). It
never compares `results.buildId` to `.next/BUILD_ID`, never records or checks a commit, and has
no max-age. `check-route-bundle-budget.mjs` asserts nothing about provenance whatsoever: it
reads `manifest.budgets` and compares numbers.

*Failure scenario.* A month-old capture sits in the repo. Someone lands a change that doubles the
`/chat` bundle. Both gates keep reporting the month-old numbers — green or red for reasons
unrelated to the code under test. That already happened in the benign direction: five of the 18
bundle breaches the gate reports at head (F10's `/build/my-work` ×2, `/crm/leads` ×2, `/chat`
pageChunk) are against numbers the head build no longer produces — I re-measured
`/build/my-work` at 362,709 B where the manifest records 550,153 B.

*Proposed fix.* Record `buildId` and the frontend release SHA in both
`.browser-driver-results.json` (already present) and `contracts/route-bundle-manifest.json`
(absent), and make both gates fail when the recorded build id does not equal `.next/BUILD_ID` or
the recorded SHA is not an ancestor of HEAD within N commits. The backend
`check:benchmark-manifest` already implements exactly this and prints
`staleness: measured 361 commit(s) BEHIND HEAD` — port that block.

### F3 — P1 — `streamlineos-backend/contracts/route-budgets.json`

`pnpm check:route-budgets-http` exits **1** with
`contracts/route-budgets.json is out of date with the capture` and
`69/93 budgets carry an HTTP measurement (148 values written, 4 stale values cleared)`. The CI
step that runs it (`.github/workflows/ci.yml:1006-1007`, "Route budgets agree with the HTTP
capture they were merged from") is **blocking** and its own comment records the last measured
state as `exit 0, 69/82 budgets ... 0 values written, 0 stale values cleared`.

I confirmed this is not an artifact of the concurrent lane's uncommitted edits by recomputing
against `git show HEAD:` content: 12 of the 68 measured reference slots' `measuredLatencyP95Ms`
in the contract disagree with `requestLevel.routes[…].latencyMs.p95` in the manifest
(§3 M6).

*Failure scenario.* CI on this branch fails at the "Route budgets agree with the HTTP capture"
step, and every consumer of `contracts/route-budgets.json` — including the release evidence for
C140 and C141 — reads latency figures from a capture that was superseded. At HEAD-committed,
`POST /chat/channels/{channelId}/messages` carries all-`null` measured fields while the capture
in the working tree measures it at 5,043 ms and flags `overPrdCeiling: true`; the contract shows
a route with no known problem.

*Proposed fix.* Run `pnpm perf:merge-route-budgets` (the `--write` half) in the same commit that
lands a capture, and never hand-edit a `measured*` value — the gate exists precisely to catch
that.

### F4 — P1 — `src/modules/chat/chat-messages.service.ts:265`, budget in `contracts/route-budgets.json`

Measured (working-tree capture at 2026-09-03T16:10:03Z, commit `2f37e1bb`, dirty tree, 12 write
samples per tenant):

| slot | p50 | p95 | requestDbCalls | downstreamCalls | declared |
|---|---|---|---|---|---|
| `POST /chat/channels/{channelId}/messages@reference` | 65.8 ms | **5,043.1 ms** | **53** | **1** | 1,000 ms / 12 / 0 |
| `POST /chat/channels/{channelId}/messages@minority` | 30.9 ms | **670.6 ms** | **44** | **3** | 1,000 ms / 12 / 0 |

The request path calls `dispatchRealtime` synchronously after commit
(`chat-message-fanout.service.ts:42-75`), which issues `ably.publishChatMessage` — an HTTP call
to a third party — inside the request. It is correctly *after* the transaction commits, so this
is not the "provider call inside a transaction" shape.

*Failure scenario.* A user sends a chat message. In the measured run one of twelve sends took
5.0 s wall clock; the contract declares this route makes **zero** downstream calls and at most
12 DB statements, so neither the 53 statements nor the provider hop is budgeted. On a channel in
a large tenant the statement count is what grows: 53 @reference vs 44 @minority on the same code
tracks tenant size, not code path.

*Proposed fix.* Raise `maxDownstreamCalls` to 1 for this route with a written reason (the
realtime publish is intentional), and either move the Ably publish behind the outbox the way
`dispatchDeferred` already is, or split the p95 into `applicationMs` and `providerMs` so C141's
"excluding internet/provider time" clause can actually be evaluated. Separately, instrument where
the 53 statements come from — the declared ceiling of 12 is 4× under the measurement and one of
them is wrong.

### F5 — P1 — `src/modules/realtime/web-push.service.ts:123-161` and `:47-97`

```ts
const members = await this.db.select({ userId: organizationMembers.userId })
  .from(chatChannelMembers).innerJoin(organizationMembers, …)
  .where(and(eq(chatChannelMembers.orgId, orgId), eq(chatChannelMembers.channelId, channelId), ne(…)));
// no LIMIT
const results = await Promise.allSettled(members.map((m) => this.sendToUser(orgId, m.userId, …)));
```

`sendToUser` (:55) then issues its **own** `SELECT … FROM push_subscriptions` per user, and for
each subscription an `effects.execute` ledger write (:85-95). For a channel with N members
holding M subscriptions each that is 1 + N reads plus N×M ledger writes plus N×M provider calls,
per message.

Second defect in the same block, :130-133:

```ts
if (!this.configured) {
  if (idempotencyKey) throw new Error("Web Push is not configured");
  return;
}
```

The chat path **always** supplies an `idempotencyKey` (`chat-message-fanout.service.ts:105`), so
on any deployment without VAPID keys every chat message's deferred fanout throws, the
`.catch` records a failure, and `dispatchDeferred` ends with
`throw new AggregateError(failures, …)` (:159-162). That fails the outbox event, which retries
and then dead-letters.

*Failure scenario.* An org creates a 500-member announcement channel. One message produces
≥ 501 database round trips and 500+ external effect ledger rows in the outbox consumer. If VAPID
is unset — which is the default in every environment file I saw — every chat message instead
dead-letters its fanout event, and the mention/DM notifications that share the same
`Promise.all` never land either.

This is a worker-path finding, not a request-path one (`dispatch()` is called only from
`chat-fanout-outbox.consumer.ts:70-71`), so it does not move C141. It does move C145's
"per-item cache/database calls" clause, and no route budget covers the chat fanout consumer.

*Proposed fix.* Page the member read (it already has `chat-channel-member-batches.ts` next to it),
batch the subscription read into one `inArray(userId, page)` query, and make the unconfigured
case a no-op that records a skipped effect rather than a throw.

### F6 — P2 — `contracts/benchmark-manifest.json` (`metrics`, `regressionPolicy`)

Nine declared metrics, none of which is a payload or memory metric. `regressionPolicy.timing.armed:
false` and `regressionPolicy.exact.planSignatureArmed: false`. `check:benchmark-manifest` prints
`Regression pass: NOT RUN`, and `--against` appears in no workflow step and no package script.

*Failure scenario.* A change adds an eager relation hydration that triples a list endpoint's
response from 200 KB to 600 KB and doubles its heap. `measuredResponseBytes` and
`measuredMemoryMb` are recorded in `route-budgets.json` and checked against a *ceiling*, so as
long as the new value stays under `maxResponseBytes` (524,288 default) nothing fires — and no
regression axis exists to notice the tripling.

*Proposed fix.* Add `responseBytes` and `memoryMb` to `metrics` with `kind: "deterministic"`,
derive their tolerance from the same replicate study, and wire one CI step that runs
`check:benchmark-manifest --against=<capture from the merge base>`.

### F7 — P2 — `contracts/benchmark-manifest.json:15-16`

`"cacheHitPath": 100` is declared and then explicitly not measured: *"no Redis runs against this
seed"*. `redis-server` is listening on `127.0.0.1:6379` on this host. The blocker is that
`test/perf/measure-benchmark-manifest.mjs` runs with Redis disabled, not that Redis is absent.

*Proposed fix.* Add a second pass of the HTTP harness with `REDIS_URL` pointed at the local
instance and a warm-up request per route, and record `cacheHit.latencyP95Ms` beside the existing
miss-path figure. C143's authorization clause is already proven separately (M5), so this is
purely the latency half.

### F8 — P2 — `contracts/benchmark-manifest.json` (`modules`)

15 modules covered, 22 declared in `frontend/lib/module-manifest.json`. Absent: `billing`,
`blog`, `directory`, `feedbucket`, `settings`, `sign`, `surveys`, `timesheets`, `workflows`.
`billing` is a money module and `settings` and `directory` are both in-release-scope tickets
(05, 07). Additionally 6 benchmarks are vacuous (0 rows returned, so every ceiling is satisfied
trivially — the manifest correctly counts them as unmeasured) and 9 modules have seeding gaps
that leave the `tiny` tenant at 9 measured benchmarks out of 94.

*Proposed fix.* Add a module entry per missing module with its owned tables and one primary list
read, and seed the four tenants uniformly enough that `tiny` is not 9/94.

### F9 — P2 — `src/modules/chat/chat-realtime.controller.ts:25`, `src/modules/support/core/support-realtime.controller.ts:17`

`GET /chat/ably-token` and `GET /support/ably-token` — the exact "realtime-token paths" C145
requires proof for — appear in **no** entry of `contracts/route-budgets.json`
(`[k for k in budgets if 'ably' or 'realtime' or 'token' in k]` returns `[]`) and in no benchmark.

The chat handler calls `channels.listMemberChannelIds(orgId, userId)` →
`chat-channel-list.service.ts:108-123`, which selects every non-archived channel row for that
membership **with no LIMIT**, before `ably.service.ts:57` slices the result to
`MAX_CAPABILITY_CHANNELS = 500`. The token itself is bounded; the read that feeds it is not.

*Failure scenario.* A user in 5,000 channels requests a realtime token on every page that opens
a chat socket. 5,000 rows are read and 4,500 discarded, and no budget would report it.

*Proposed fix.* `LIMIT MAX_CAPABILITY_CHANNELS + 1` on the read (and log when it truncates, which
`ably.service.ts:41-46` already does for the capability), and declare a route budget for both
token endpoints.

### F10 — P2 — `frontend/contracts/route-bundle-manifest.json`

Six routes (`/mail`, `/build/inbox`, `/crm/inbox`, `/support/inbox`, and two others) raised
`maxFirstLoadJsBytes` to 614,400 and carry notes of the form *"PASSES: 507kB < 614kB ceiling"*.
The gate's `MEASURED_PAIRS` (`check-route-bundle-budget.mjs:32-42`) also compares
`measuredScriptBytes` against `maxScriptBytes`, and **no route declares a per-route
`maxScriptBytes`**, so all 13 fall back to `defaults.maxScriptBytes = 524,288` and all 13 breach
it. The note and the verdict contradict each other in the same file.

*Failure scenario.* A reader of the manifest concludes six routes pass their JS budget; the gate
says they breach by 49–202 kB. Whichever is acted on, the other is wrong.

*Proposed fix.* Either delete the "PASSES" notes (they describe a different dimension than the
one that fails), or declare a per-route `maxScriptBytes` with the same written justification the
`maxFirstLoadJsBytes` raise carries — and note that raising a ceiling to go green is the defect
the manifest's own `budgetExceptionsNote` warns about.

### F11 — P2 — `frontend/scripts/browser-journeys.mjs:1070`

The script writes `.browser-journeys-results.json` (line 1070 default, written at 1423). That
file exists nowhere in the tree, is not tracked by git, and is not gitignored.
`grep -rn "browser:journeys\|browser-journeys" .github/` returns nothing.
`check:gate-wiring` reports "35 gates ... all invoked by a run: step" but only governs `check:*`
names, so a `browser:*` or `measure:*` script is invisible to it.

*Failure scenario.* C139's "run representative browser E2E" has a capable harness and zero
recorded runs. The one artifact that *was* refreshed under the name "browser-journey results"
(commit `8560e1748`) is `.browser-driver-results.json` — the **vitals** driver's output, which
contains no axe results at all (`'axe' in json.dumps(d)` → `False`).

*Proposed fix.* Add a `browser:journeys` step to `frontend.yml` beside the vitals steps, commit
its results artifact, and extend `check-gate-wiring.mjs`'s matcher to cover `browser:*` and
`measure:*` so an unwired evidence producer fails the same way an unwired gate does.

### F12 — P2 — `framer-motion` in every route's first load

Measured: `framerAppearId`/`AnimatePresence` markers appear in 57 chunks, at least one of which
is in the first-load chunk set of **all 13** measured routes. The manifest's own note records
95,216 B raw / 30,554 B gzip across "first load of 601 of 601 routes". 282 frontend files import
it; only 13 of those files also use `next/dynamic`.

*Failure scenario.* Every route pays 30.5 kB gzip of animation runtime, including
`/notifications` and `/inbox` which the capture measures at CLS 0.000. C151's per-route JS budget
cannot be reached on any route while an unconditional 30 kB library sits in the shell.

*Proposed fix.* Replace the shell's uses with CSS transitions or `motion/react`'s lazy
`domAnimation` feature bundle, and keep the full runtime behind `next/dynamic` in the handful of
surfaces that need layout animation. (Note: the animation work is explicitly out of scope for
*landing-page visuals*; this is the authenticated shell.)

### F13 — P1 — `frontend/scripts/check-web-vitals-budget.mjs` (no reference to `contentAssertion` anywhere in the file)

The capture records five verdicts. Four are green. The fifth,
`contentAssertion.verdict`, reads **`"capture is NOT usable evidence"`** — 16 of 208 samples had
`errorBoundary: true`, all 16 on `/crm/leads` (8 desktop + 8 mobile, i.e. *every* sample of that
route). `grep -n "contentAssertion\|unusable\|errorBoundary\|verdict\|routeFailures\|hydration\|authorization\|settle"`
over the 745-line gate returns **nothing**.

*Failure scenario.* The gate publishes `/crm/leads` desktop LCP 389 ms, mobile LCP 1,527 ms, CLS
0.001, INP 32/64 ms — every one of them measured on an error page, and reports them as budgets
met. If `/chat` or `/dashboard` started rendering an error boundary tomorrow, the capture would
again say "NOT usable evidence" and the gate would again publish the error page's (excellent)
vitals as a pass. This is the "a 500 looks like no data" shape, inverted into "a 500 looks like a
fast route".

*Proposed fix.* Make the gate refuse the capture when any verdict is not green: at minimum
`contentAssertion.unusableSamples.length > 0`, `contentAssertion.offRouteSamples.length > 0`,
`routeFailures.count > 0`, `authorization.unauthorizedSamples.length > 0`,
`hydration.mismatchesFound > 0` and `settle.cappedSamples > 0`. The producer already refuses —
`measure-web-vitals.mjs` prints `REFUSED as evidence: 16/208 sample(s) did not render real page
content` — the consumer just does not listen.

---

## 5. What head already gets right

These are not concessions; each is something I checked and found sound.

1. **Read-path statement cost is genuinely good.** 71/71 read-cost budgets measured and inside
   ceiling on the 1,729 MB production-shaped seed, worst p95 22.0 ms against a 50 ms ceiling.
   Per-module c1 p95 is 0.37–1.70 ms and c8 p95 is 10.9–17.0 ms with error rate 0 across all 15
   modules. C142's *ceilings* are met on everything that is measured.
2. **Request-level latency is well inside the PRD ordinary ceiling.** Median scored p95 9.6 ms,
   95th percentile of scored p95s 23.2 ms, 113 of 115 scored slots under 300 ms.
3. **Cache degradation is correct and proven.** Single-flight coalescing, a degraded-path memo
   scoped to the outage, TTL jitter on all three fill paths, a distributed lease that stops
   waiters instead of polling, and — the part that matters most — a hard exclusion list so no
   authorization answer is ever memoised during an outage, with an anti-vacuity assertion that an
   ordinary read *is*. 21/21.
4. **Tenant scoping.** 840/840 tenant tables carry a leading tenant index. The frontend's query
   cache is org+user scoped at the client level (`query-provider.tsx:87-97`) with a full remount
   on scope change, enforced across 5,370 files. I found no cross-tenant read or cache path.
5. **Lazy boundaries where they matter most.** recharts, @tiptap, pdfjs, jspdf, react-markdown,
   DOMPurify and emoji-mart are all out of every measured route's first-load set. 155 `dynamic()`
   sites; 6 virtualized lists covering exactly the C145 modules; 0 hydration mismatches over 208
   navigations.
6. **Web Vitals themselves pass.** On the build that was measured, 25 of 26 route×profile pairs
   meet LCP, INP, CLS, FCP and TTFB, and the one breach (mobile `/crm/inbox` CLS 0.109) is in an
   out-of-scope module and carries a written, route-scoped exception that the gate still counts
   as a failure. Perceived responsiveness p75 is 1 ms desktop / 5 ms mobile against a 100 ms
   target.
7. **The backend benchmark harness is unusually honest.** It reports its own staleness in
   commits, digests the SQL catalogs it measured and flags drift, refuses a BYPASSRLS role,
   marks 0-row benchmarks vacuous rather than passing, records 9 seeding gaps as coverage loss,
   derives its regression tolerances from a replicate study and disarms the axes the study says
   are too noisy, and publishes a false-positive proof (0/308). Almost every gap I list under
   C140/C148 is a gap the manifest itself names first.
8. **The `budgetExceptions` mechanism is built correctly.** It annotates a failure with an owner
   and a reason, is scoped to a route so it cannot bleed onto the next breach, never changes the
   exit code, and its self-test asserts exactly that.
9. **`check:gate-wiring`, `check:seo-metadata`, `check:cache-invalidation`, `check:tenant-indexes`,
   `check:bulk-id-limits`, `check:bounded-contracts`, `check:compression`** all pass over
   non-trivial corpora (35 gates / 1,224 route files / 1,076 service files / 840 tables / 3,389
   schema files) — these are real greens, not empty ones.

---

## 6. Not measured, and exactly what would measure it

1. **Over-the-wire bytes at head** (`measuredScriptBytes`, `measuredTotalBytes`,
   `measuredCssBytes`, `measuredImageBytes`, `measuredFontBytes`, `measuredThirdPartyBytes`,
   `measuredServerPayloadBytes`) — 13 of the 18 reported bundle breaches. These come only from
   the cache-disabled pass inside `measure-web-vitals.mjs`, which drives Chrome over CDP.
   **Command:** `node scripts/measure-web-vitals.mjs --base-url=http://localhost:1000
   --routes=<13 routes> --repeat=8 --cookie-file=<minted authjs.session-token>
   --out=<path> --write-manifest` against a fresh `next build && next start`.
   **Why I did not run it:** the reference profile applies a 4× CPU throttle and a 150 ms RTT,
   and the manifest's own `conditions.host` note states *"A throttled mobile profile on a
   contended host measures the host… a 1m average above the CPU count means the numbers are not
   the application's."* With ~26 agents on 15 cores, any number I produced would describe the
   laptop. Running it also writes an artifact, which this wave forbids.
2. **Core Web Vitals at head.** Same instrument, same blocker. The 25/26 pass in §2/C149 is real
   but describes build `iTIKVvc-wqpbkjxEiy548`, not `jsZ4Sk8mVF-4XGtxc465O`.
3. **Browser E2E journeys.** `node scripts/browser-journeys.mjs --base-url=http://localhost:1000
   --cookie-file=<…> --widths=375,768,1280`. Same Chrome/host constraint, plus it drives real
   writes through the UI against the shared backend, which is not a read-only action.
4. **Cache-hit p95.** Needs the HTTP harness re-run with `REDIS_URL=redis://127.0.0.1:6379` and a
   warm-up request per route: `node test/perf/measure-benchmark-manifest.mjs --samples=200
   --replicates=3 --concurrency=8 --iterations=48 --plans --write` with Redis enabled. Cheap and
   entirely possible on this host — see F7.
5. **A regression comparison.** `check:benchmark-manifest --against=<fresh capture>` was never
   run because there is no second capture to compare against. Producing one requires re-running
   the measurement harness at head.
6. **`measuredDbCalls` for 68 of 70 linked read paths.** Needs the `QueryTelemetryTracker`
   instrument (`src/db/query-telemetry.ts`) wrapped around each read path; the harness records
   `requestDbCalls` (a superset including auth, permission and entitlement) and deliberately
   refuses to write it into `measuredDbCalls`.
7. **`POST /chat/channels/{channelId}/messages` split into application vs provider time.** C141
   excludes provider time and nothing in the harness separates them, so the 5,043 ms figure
   cannot be adjudicated against the 300 ms ceiling either way.

---

## 7. Verdict

**PARTIALLY MET.** Two criteria are met on the measured set (C142 ceilings, C143's degradation
and authorization half). Seven are partially met with named gaps. Two — C145 and C139's E2E
clause — are not met: the unified inbox's primary read is a proven partition-wide sequential
scan with no budget covering it, the realtime-token paths the criterion names have no measurement
at all, and the browser E2E harness has never produced a committed result. Underneath all of it
sits an evidence-integrity problem: the frontend budget gates cannot tell that their input is 33
frontend-source commits stale (F2) and do not read the capture's own
`"capture is NOT usable evidence"` verdict (F13), while the backend route-budget contract has
drifted from the capture it was merged from (F3).
