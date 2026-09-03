# 22e / 23c — The declaration half of ticket 22 box 1, and the four structural halves of ticket 23

**Session: 2026-09-03. Backend commits `e9c99a84` (gate + derived census), `44921f09` (ten worker-batch
declarations), `285f4bf2` (plan assertions). All three in `streamlineos-backend`.**

## 0. NO TIMING NUMBER IN THIS REPORT WAS MEASURED

Load average was **5.64 / 4.55 / 4.01** at the time of the only database run, with ~7 agents
concurrent. **No latency, p50/p95/p99, wall-clock or throughput figure was recorded, and none is
reported here.** The one database run taken (`run-read-cost-budgets.mjs`) prints milliseconds; they
were discarded at the point of reading and never written into an artifact. What was kept from it is
**shared buffer blocks, rows scanned, result rows and plan node shape** — all four are deterministic
under load, and a plan is not a stopwatch.

The release already carries two stale calendar numbers (`measuredLatencyP95Ms: 915.944`,
`measuredBufferBlocks: 7072`). **Neither was touched.** No capture was re-run and no `measured*`
field was written.

---

## 1. Ticket 22, box 1 — what "critical" means here, stated

The manifest's own `surface.criticalSelection` has four clauses:

> (a) issued on every authenticated page load, (b) the primary list or detail read of an in-scope
> module, (c) the primary transactional write of an in-scope module, or (d) a scheduled worker batch
> that iterates tenant data.

**(a), (b) and (c) are product judgements and cannot be derived** — nothing in either repository
records request volume, so 3,613 operations cannot be ranked by traffic. That is R-13 and it stays
an accepted residual, unchanged.

**(d) is not a judgement.** A scheduled worker batch in this codebase *is* an operation on a
`@Controller("cron")` class. That set is readable out of source, so the criterion I applied is:

> **A cron operation is IN SCOPE by default, and out of it only by an explicit written reason.**

Default-in matters. A regex that tried to tell a "batch" from a "report" by its name would silently
drop every sweep whose name did not match — the same silent truncation the coverage fraction exists
to prevent.

## 2. The census, derived

`check:route-budgets` now reads **12 `@Controller("cron")` classes**, extracts **130 operations**,
folds GET/POST onto one path (they are the same private handler behind the same `withLease`), and
reports:

| | before | after |
|---|---|---|
| scheduled batches derived from source | — (asserted) | **67** |
| declaring a budget | 12 (17.9%) | **22 (32.8%)** |
| declared out of scope, with a reason | — | 2 |
| **undeclared — no ceiling of any kind enforced** | **55** | **43** |

The 2 out of scope are `/cron/outbox-events-metrics` and `/cron/outbox-events-report`, both reads
of publisher counters that drain nothing.

**It ratchets.** `surface.workerBatchScope.undeclaredWatermark` is 43; the gate fails when the
count *rises*, so a new scheduled sweep must declare its five ceilings or be named with a reason.
A stale exclusion — one naming a batch no controller serves — is also a violation, because a stale
exclusion reads as coverage.

**Bite-proved hermetically** (`git archive HEAD src contracts openapi.json` into a temp tree, never
in the shared working tree):

| bite | result |
|---|---|
| a new unbudgeted `@Get("brand-new-unbudgeted-sweep")` lands | census 53 → 54, **exit 1**, "above the recorded watermark of 53" |
| declare a budget for it | worker-batch violations **0** (the residual violation is the openapi staleness check, firing correctly) |
| `declaredOutOfScope` names a path no controller serves | **exit 1**, "a stale exclusion reads as coverage" |

Self-test **27 → 33 checks, exit 0**.

## 3. The ten declarations added, and the five that could not be counted

Every ceiling is derived from the code's shape:

- **`maxResponseBytes` 4096** — counted from the response shape. The controller returns
  `{ success, message?, ...result }` and `result` is a flat record of integer counters. No row, id
  list or payload rides the response.
- **`maxBatchSize`** — the page-size constant in the service file.
- **`maxLatencyP95Ms` / `maxDurationMs`** — the sweep's own **lease window**
  (`RETENTION_JOBS.leaseSeconds`, `src/modules/cron/retention-schedule.ts`) in milliseconds, carried
  with `latencyCeilingBasis: "lease-window-derived — UNMEASURED"`. This is **not** a performance
  target and not a percentile. It is the one time bound the code declares: run past it and
  `CronLeaseService`'s key expires while the tick is still running, so the next tick acquires
  cleanly and two sweeps drain the same rows concurrently. **Nothing here was timed.**
- **`maxDbCalls` + `maxDbCallsPerOrg`** — see below.

### 3.1 The per-organisation unit, generalised from downstream calls to database calls

`forEachOrg` (`src/common/tenant/for-each-org.ts:168`) is one enumeration `SELECT` and then a
strictly sequential `for` loop, one tenant transaction each. A sweep's statement count is therefore
`1 + organisations × (per-org statements)` — **O(organisations) by construction**, so a flat
per-request integer describes only the seed it was written against. That is exactly the wrong-UNIT
argument already recorded on `GET /cron/storage-sweep` for `maxDownstreamCalls`.

`check-route-budgets.mjs` already had `maxDownstreamCallsPerOrg` with a fail-closed rule. It is now
generalised: `maxDbCallsPerOrg` composes the same way —
`effective = maxDbCalls + maxDbCallsPerOrg × measuredOrgsSwept` — applying **only** when the harness
has recorded a positive `measuredOrgsSwept`, and applying to those two fields and no others.
Five new self-test cases, including one proving the allowance cannot leak onto an unrelated field.

### 3.2 Five counted call paths

| batch | fixed | per org | derivation |
|---|---|---|---|
| `/cron/outbox-events-retention-sweep` | 1 | **100** | 2 × `batchedOrgDelete`, each `MAX_BATCHES = 50` × 1 statement |
| `/cron/notification-outbox-retention-sweep` | 1 | **50** | one bounded loop, `MAX_BATCHES = 50` × 1 statement |
| `/cron/announcements-retention-sweep` | 1 | **201** | `sweepExpired` 100 + `sweepAged` 100 + 1 audit insert |
| `/cron/mail-metadata-retention-sweep` | 1 | **101** | `MAX_BATCHES = 100` + 1 audit insert |
| `/cron/helpdesk-retention-sweep` | 1 | **101** | `MAX_BATCHES = 100` + 1 audit insert |

`set_config` / tenant setup is not counted, matching the `countDbCalls` convention.

### 3.3 FIVE THAT COULD NOT BE COUNTED, AND THAT IS THE FINDING

A budget that cannot be declared as a constant is a **code shape that has no bound**. Five sweeps
have no per-tick budget at all:

| batch | shape |
|---|---|
| `/cron/ai-usage-retention-sweep` | `cron-ai-usage-retention.service.ts:73` — `for (;;)`, **no `MAX_BATCHES`** |
| `/cron/build-retention-prune` | `cron-build-retention.service.ts:23` — `for (;;)`, no cap, 2 statements per 500-row page |
| `/cron/kb-chat-history-purge` | `cron-kb-chat-retention.service.ts:53` — `for (;;)`, no cap |
| `/cron/kb-chunk-retention-sweep` | `cron-kb-chunk-retention.service.ts:42` **and** `:74` — two uncapped drains |
| `/cron/hr-policy-retention-sweep` | drains ARE bounded, but run inside `for (const policy of policies)` at `cron-hr-retention.service.ts:88`, so the count is O(policies × 101) and grows with configuration |

Each runs inside **one** tenant transaction under `forEachOrg`, so a large backlog holds one pool
connection and one open transaction for an unbounded number of round trips. **No
`maxDbCallsPerOrg` was declared for any of them** — a per-unit allowance over an unbounded loop is
an escape hatch, not a ceiling. Each entry names the file:line and the owner.
**Owner: cron/worker owner.** The fix is a per-tick cap in the service — the shape its five bounded
siblings already use — not a larger number in the manifest.

## 4. Two more findings inside box 1

**`GET /cron/hr-policy-retention-sweep` is a SECOND worker batch that leaves the process.**
`cron-hr-retention.service.ts:268-275` is a nested loop calling
`this.storage.deleteFileIfPresent(orgId, key)` — **one outbound object-store call per retired
object key**, i.e. a per-item outbound call, O(objects retired). `maxDownstreamCalls` is declared 0
and is *expected to be exceeded once measured*, for the same recorded reason as the storage sweep.
The storage-sweep note claiming it is "the ONLY worker batch in this manifest that leaves the
process" was true of the twelve and is **false over the 67 the source declares**; the correction is
written into the new entry.

**`/cron/gdpr-export-artifact-retention` is served by a controller and described by no OpenAPI
operation** (`cron-gdpr.controller.ts:29`), so **no budget key can ever reference it** — the gate
would flag any such key as stale. It is a real leased sweep on `RETENTION_JOBS`. The gate now
reports this class explicitly. **Owner: whoever owns the OpenAPI emission for `@Public()` cron
controllers.**

## 5. Honest cost of the declarations

Measurement coverage **falls**: `387/570 (67.9%) → 387/640 (60.5%)`. Seventy newly *declarable*
ceilings landed unmeasured. That is the truth being revealed, not a regression — those seventy
ceilings were previously not declared and therefore not counted as missing. `maxDbCalls` basis moved
`13 counted / 14 estimate / 55 default` → **`18 counted / 19 estimate / 55 default`**.
**Zero existing `max*` ceilings were changed** in either commit.

---

## 6. Ticket 23 — per-clause verdicts on four boxes

### Box 4 — "a miss or a cache outage degrades safely without a request storm"

`CacheService` is at `src/common/cache/cache.service.ts` (391 lines). Backend CLAUDE.md §6 line 145
requires, verbatim: *"Fills for the same key are single-flight in-process; hot shared keys also need
a short distributed fill lease, TTL jitter and stale-while-revalidate where safe."*

| clause | verdict | evidence |
|---|---|---|
| in-process single-flight | **HOLDS** | `inFlight` Map `:14`, gate `:78-88`, identity-checked delete `:86` |
| **distributed fill lease** | **HOLDS** | `:126-137` `SET cache:fill-lease:<key> <uuid> EX 10 NX`, compare-and-delete Lua release `:161-170`. It is not opt-in: `loadOrFetch` is the single fill path behind all 213 call sites |
| TTL jitter | **PARTIAL** | `applyJitter` `:299-301` is ±15%, but wired into only `cachedForOrg` `:345` and `cachedVersionedForOrg` `:371` — **30 of 213 call sites (14%)**. Absent from `cached` (88 sites) and `cachedVersioned` (95 sites), *the path §6 line 146 names as canonical*. TTLs are 5 shared constants (`cache-keys.ts:261-267`), so un-jittered keys filled in one second expire in one second |
| stale-while-revalidate | **FAILS — absent** | no soft/hard TTL pair, no stored `staleAt`, no background refresh. `loadOrFetch` has one read `:120` and one branch `:121`. The only `stale-while-revalidate` in `src/` is a `Cache-Control` header on two public routes (`public.controller.ts:143,356`) — that is §6 bullet 1, the CDN half, not this |
| **cache outage** | **FAILS** | provider-null `:118` and all three runtime-throw catches (`:122-124`, `:134-136`, `:145-147`) `return fetcher()`. The distributed lease is **unreachable** in the first and **abandoned** in the second. `inFlight` holds *promises* and deletes on settle `:86` — there is no value memo — so only *temporally overlapping* requests coalesce. **Serialized traffic hits the database at 100% for the whole outage, on every one of the 213 call sites.** No Redis circuit breaker (three exist, all outbound HTTP) |
| negative caching | **FAILS — absent by design** | `:121` `if (hit !== null) return hit;` — a cached `null` reads as a miss forever. Pinned deliberately by `cache.service.spec.ts:211-224` for authorization correctness |

**The sharpest item: clauses 2 and 6 interact destructively.** For a hot key whose value is
legitimately `null`, the lease makes it *worse than no lease*. The winner fills `null`; every loser
enters the poll loop `:138-150`, reads `null` at `:143`, `:144` treats that as *not yet filled*,
never checks whether the lease is still held, and after `FILL_WAIT_MS = 2_000` calls `fetcher()`
anyway. Per losing request: **+2 s, 40 extra Redis GETs, and the database query regardless.**

**Correction to the ticket.** A-21 records "single-flight is in-process only, so N instances produce
up to N fills of one hot key" and marks `cache-multi-instance.spec.ts`'s name misleading. **That is
stale.** A distributed lease exists and is asserted across two `CacheService` instances on one Redis
(`cache.service.spec.ts:48`). The blast radius A-21 describes is real, but only **during a Redis
outage** — where it is worse than A-21 says, because it is continuous rather than once.

**VERDICT: the box's structural clause FAILS as written** — for a null-valued hot key with Redis
healthy, and for any cache outage.

### Box 5 — "Home loads sections concurrently and independently, renders available sections without waiting for the slowest, and never starts an unbounded fanout"

Home is `/dashboard`; `app/(authenticated)` has no `page.tsx`.

- **Concurrently — PARTIAL.** `dashboard-personal.service.ts:80` is one `Promise.all` over **5**
  arms, confirmed. But two arms contain serial 2-hop chains the caller cannot see:
  `DashboardProjectService.getMyIssues` (`dashboard-project.service.ts:84` then `:87`) and
  `NotificationsService.unreadCount` (`notifications-read.service.ts:122` then `:348`). And there
  is a sequential prefix — `:45` then `:55` — so the critical path is **4 sequential hops, not 1**.
  `:84` re-fetches the exact membership row the caller already read at `:55`.
  The frontend is **not** one aggregate call: **≈29 distinct endpoints**, of which `/dashboard/personal`
  is one, shared by 3 widgets. Two dependency gates serialise them: `useCan`→`useAccess`
  (`hooks/api/access.ts:53-59`, mitigated by the layout prefetch at `layout.tsx:45`) and an
  `IntersectionObserver` (`deferred-dashboard-content.tsx:31-34`).
- **Independently — PARTIAL.** `/dashboard/personal` settles per arm and records `degraded[]`
  (`:57-72`, `:206`). **`/dashboard/stats` logs but records no `degraded[]`** — a broken section is
  byte-identical to a denied one. **`/dashboard/executive` has no `settle()` at all**
  (`dashboard-crm.service.ts:164-196`): one failing `count()` of 8 rejects the endpoint. Frontend
  containment is strong (22 widgets wrapped in `HomeSectionBoundary`, enforced by a source-scanning
  test) with **four holes above the fold** — `ClockInWidget`, `QuickActions`, `ModuleSetupBanners`,
  `ExecutiveKpiWidget` (`dashboard-client.tsx:150,199,202,206`) are unwrapped, so a render throw
  there blanks the page.
- **Without waiting for the slowest — FAILS**, and for a second reason the ticket does not record.
  Three aggregates are a single `Promise.all` returning one JSON body. **Zero `Suspense` in the
  entire Home tree** — no per-section server components, no streamed response; `loading.tsx` is the
  route-level whole-page skeleton. And `shouldRenderDashboardLoading`
  (`dashboard-hydration.ts:14-20`, used `dashboard-client.tsx:113-137`) replaces the **whole page**
  with a skeleton while `setupBannersPending` — *one query*, `/onboarding/module-checklists` — is in
  flight, bounded at 1500 ms. For up to 1.5 s every available section is withheld while one section
  loads. That is the clause, negated, on the client as well as the server.
- **Never an unbounded fanout — HOLDS.** Every `Promise.all` in `src/modules/dashboard/` is over a
  compile-time constant arm list (5, 3+3, 2/3/5, 3, 2, 2, 3). The single `Promise.all(x.map(...))`
  (`dashboard-scope.ts:42-44`) maps `DASHBOARD_HOME_SECTIONS`, a frozen literal — exactly 3 distinct
  modules. **Zero `.map(async …)` over a query result** anywhere in the module. Row-derived ids feed
  one `IN (…)`, capped at 200 (`dashboard-read-limits.ts:17`); list caps 100 / 500 declared.
  Frontend: no `useQueries`, no `.map()` producing a hook.

**VERDICT: 1 clause HOLDS, 2 PARTIAL, 1 FAILS.** The box stays open; the fanout clause is now
positively proved rather than assumed.

### Box 6 — the N+1 and per-item halves (table-scan half in §6.1)

| path | statements | verdict |
|---|---|---|
| `GET /chat/channels` | 6 constant **+ 1 SQL per entity-linked channel returned** | **N+1** |
| `GET /chat/channels/{id}/messages` | 5 constant | NO-N+1 |
| `GET /chat/channels/{id}/members` | 4 constant | NO-N+1 |
| `GET /chat/unread` | 2 constant | NO-N+1 |
| `GET /chat/saved` | 1 + fixed adapters | NO-N+1 |
| `GET /chat/ably-token` | 2 SQL + 1 outbound | NO-N+1 |
| `GET /calendar/events` | ~25–35 constant over **7 compile-time-fixed sources** | NO-N+1, **no per-id loop** |
| `GET /mail/messages` | 1 SQL + 1 provider call **per connected account** | no per-item call |
| `GET /mail/threads/{id}` | 1 SQL + 1 provider call | no per-item call |
| `GET /mail/messages/{id}` | 1 SQL + 1 (gmail) / 2 (outlook) | no per-item call |
| `GET /notifications` | 3 constant | NO-N+1 |
| `GET /notifications/unread-count` | 2 constant | NO-N+1 |
| realtime-token | 0 statements | constant by construction |

**The N+1, verified at source by me and not taken on report:**
`chat-channel-list.service.ts:278-280` is
`Promise.allSettled(channels.map((ch) => this.resolveEntityChannelDisplayName(ch, actor)))`, and
`resolveEntityChannelDisplayName` `:58-60` calls `this.entities.resolve(actor, [ONE reference])` —
a **single-element batch per channel**, which defeats the batching machinery. Each resolves to one
real `SELECT` in `crm-entity.adapter.ts:107/:146` or `build-entity.adapter.ts:86-94`. A 50-channel
page of entity channels issues **50 extra SELECTs**. The fix shape is in the same file:
`withResolvedReferences` (`entity-reference.service.ts:46-86`) flattens references across all rows
into one dispatch, and the message paths already use it. **Owner: chat owner. Not fixed here.**

**The calendar answer, positively:** the source set is a `Set` written only by `register()`, and
every caller is an `onModuleInit` — **7 sources, compile-time fixed**. `HrCalendarSource`'s wide
11-way load is *never registered* and does not run on this route. There is no "birthdays" calendar
source. The recent "fetch by candidate id" change did **not** introduce a per-id loop:
`calendar-event-source.loader.ts:257` and `:286` both use `inArray(...)`, and `:170` resolves
creator names once per request. The one loop, `:139`, is a keyset drain in 500-row batches capped at
`CALENDAR_EVENTS_CAP = 2000` → ≤4 iterations.

**Unbounded relation hydration still on these paths** (not N+1, but the same defect class as the
436 KB chat payload already fixed):
- `chat-saved.service.ts:42` — `attachments: true`, **no `limit` and no `columns`** projection
- `chat-message-timeline.service.ts:156, 224, 261, 302` — `attachments` unqualified by a limit
- `GET /chat/channels/{channelId}` — `chat-channel-members-implementation.ts:94-105` still has the
  unqualified `with: { members: … }`, including `user.email`. The list route was fixed; **the detail
  route was not.**
- `chat-channels.service.ts:95` (`createChannel`) — same shape on the write path
- `chat-channel-list.service.ts:80` — no `LIMIT`; returns every non-archived channel the caller is in

#### 6.1 The table-scan half — plan shape, measured, no stopwatch

Run: `run-read-cost-budgets.mjs` on **`scratch_perf_seed`** (local, at head) as **`streamline_app`,
`rolbypassrls = false`**, tenant GUC set, reference tenant
`aaaaaaaa-1111-0000-0000-000000000001`. **Buffers, rows scanned and plan node type only.**

**Five of the ten read-cost budgets backing these four families carried `planAssertions: []`** — they
passed on a block ceiling alone, so a plan falling to a Seq Scan would still read as PASS. (Across
the whole catalog it is **53 of 71**.) `forbid-seq-scan` was added to the five, on the growing
relation of each.

Result — **10/10 PASS**, and the full catalog **71/71 PASS, 0 FAIL, exit 0**:

| budget | warm blocks | rows scanned / returned | tenant rows |
|---|---|---|---|
| `notifications-list` | 121 | 42 / 50 | 235,297 |
| `notifications-unread-count` | 16 | 0 / 1 | 235,297 |
| `dashboard-personal-notifications-count` | 16 | 0 / 1 | 235,297 |
| `chat-channel-list` | 11 | 2 / 2 | 56 |
| `chat-messages-page` | 10 | 50 / 50 | 12,000 |
| `chat-channel-members` | 9 | **500 / 100** | 1,000 |
| `chat-saved-messages` | 81 | 230 / 25 | 12,000 |
| `mail-inbox-cached` | 30 | 51 / 51 | 4,000 |
| `dashboard-personal-calendar-events` | **24** | 4 / 3 | 60,025 |
| `calendar-events-visible-batch` | 697 | 517 / 500 | 60,025 |

`chat-channel-members` over-scans **5×** (500 rows for a 100-row page) — the seed's two 500-member
channels ordered by `joined_at` with no matching index prefix. Inside its ceiling; recorded rather
than tolerated silently.

**Bite-proved** in a temp tree from `git archive HEAD src`: defeating the index on
`chat-messages-page` gives **exit 1**, *"chat_messages resolved by Seq Scan"*, at **13,344 rows
scanned for a 50-row page and 243 blocks — INSIDE the unchanged 10,000-block ceiling.** The block
ceiling could not have caught it. The assertion is the only thing that does. No ceiling was raised.

**VERDICT: table-scan half CLOSED for these ten budgets and now enforced. N+1 half FAILS on one
route (`GET /chat/channels`) and holds on the other twelve.** Inbox stays provider-declined (R-14).

### Box 7 — "Connection-pool, worker-concurrency, queue, provider and per-tenant limits apply backpressure rather than exhausting memory, sockets or connections"

| limit | verdict |
|---|---|
| connection pool | **DECLARED + ENFORCED + QUEUES-UNBOUNDED** |
| admission control | DECLARED + ENFORCED + **SHEDS** (two holes) |
| worker concurrency / queue | batch size SHEDS; **runtime deadline ABSENT**; lease **fails open** |
| provider limits | shared seam SHEDS; **Composio and VirusTotal ABSENT**; **outbound concurrency cap ABSENT** |
| per-tenant | body cap SHEDS; **rate limiter opt-in only**; pagination **silently clamps** |

**1. Connection pool — the failure.** `src/db/pool.config.ts:148-154`: `max` 20 pooled / 10 direct,
`connect_timeout` 30 s, `idle_timeout` 15 s, `max_lifetime` 240 s; transaction guards
`statement_timeout` 30 s, `lock_timeout` 5 s, `idle_in_transaction_session_timeout` 60 s
(`:88-92`, applied `with-tenant.ts:22-28`). **There is no acquire/queue timeout and postgres-js has
none to set** — its option parser (`node_modules/postgres/src/index.js:447`) has no such key, and
its pool handler `:329-342` ends `busy.length ? go(busy.shift(), query) : queries.push(query)`:
when every connection is checked out the query is pushed onto an **unbounded FIFO and waits
forever**. Only `end()`/`destroy()` reject a waiter. `connect_timeout` bounds a *new* connection's
handshake, not waiting for a checked-out one to return. The code knows: `pool-telemetry.ts:96-98`
increments `waiting` and `:221-229` logs *"Database pool saturated — tenant transactions are
queueing for a connection"*. **It logs; it does not shed.** In-request traffic is bounded
*incidentally* by admission's 400; anything bypassing admission — cron sweeps, the outbox drain, the
detached `void this.run(...)` webhook dispatch — queues with no ceiling at all.

**2. Admission — verified, and it IS registered.** `admission.config.ts:55-66`: `maxConcurrent 200`,
`maxQueueDepth 400`, `orgMaxConcurrent 50`, `reservedFraction 0.2`, `maxBodyBytes 3_145_728`,
`enabled true` — every number confirmed. Registered as `APP_GUARD` at **`app.module.ts:207`** and
`APP_INTERCEPTOR` at `:210` (I read this myself). `tryAdmit` is **synchronous** — no waiter array,
no promise pile — and refusal is **503 + `Retry-After: 6`** (`admission.guard.ts:59-66`). It sheds;
it never queues. Two holes:
- **the per-tenant 50 does not apply to reserved classes** — `admission.service.ts:30-33` returns
  admitted before the org check at `:39-41`, so one tenant can hold all 400 slots on
  auth/billing/payroll/audit;
- **the URI version prefix defeats reserved-route classification.** `main.ts:85-87` enables
  `VersioningType.URI`, so `@Controller("auth")` is mounted at `/auth/...` *and* `/v1/auth/...`;
  `normalisePath` (`reserved-routes.ts:23-28`) does not strip the version segment, so `/v1/auth/login`
  classifies as `ordinary-write` and sheds at 160 instead of being protected to 400.
  `reserved-routes.spec.ts` only ever tests the unversioned form. **Whether this is live depends on
  which URL the frontend calls — not determinable from source.**
- `maxExecutionMs` is **DECLARED-NOT-ENFORCED** as a deadline: its only consumer is the `Retry-After`
  arithmetic. No `server.requestTimeout`/`headersTimeout` is set in `main.ts`.

**3. Worker concurrency.** `forEachOrg` is a **strictly sequential** `for` loop — fanout **1**, not
O(tenants); no `Promise.all` over orgs exists. Outbox `BATCH_SIZE = 50` is a *global* cap across
orgs (`outbox-publisher.service.ts:23`, `remaining` at `:138-139`), with `FOR UPDATE SKIP LOCKED`
and a lease fence on every state write. `drainPages` (`cron/drain.ts`) bounds pages per tick and
distinguishes *selected* from *processed* so a stalled page cannot spin. **But:** `CronLeaseService`
**fails open** — Redis unavailable and it runs anyway with no dedup (`cron-lease.service.ts:41-44`,
`:53-56`); and the lease TTL is **not a deadline on `fn`**, so an over-running tick is overtaken by
the next one. **There is no max-runtime, abort signal or org-count cap on any sweep.**
(`/cron/notifications-retention-detach` *does* take a lease — inside the service
(`notification-retention.service.ts:48-52`), not the controller. I checked; it is not a gap.)

**4. Provider limits.** The shared seam is genuinely good: `callProvider`
(`common/outbound/call-provider.ts:102-145`) has a per-attempt timeout, a circuit-breaker check
before each attempt and full-jitter backoff; `outboundRequest`
(`common/http/outbound-request.ts:10,42-44`) makes `timeoutMs` a **required** field, so a caller
cannot forget it. Three holes:
- **Composio has no timeout** — `composio.gateway.ts:104` is `new Composio({ apiKey })` with no
  `signal`, no `callProvider` wrapper, no breaker (I read the line). **This is the mail path**
  (`gmail-mail.provider.ts:61,83,97,125,147,169,187,202`). The SDK accepts `{ signal }` and we never
  pass one.
- **VirusTotal has three bare `fetch` calls with no `AbortSignal`** —
  `virustotal-av-scanner.ts:49, 67, 85` (verified: `headers` only). Node's `fetch` has no default
  request timeout. `:67` uploads a whole file body unbounded.
- **No outbound concurrency cap anywhere.** The only limiter is `AiConcurrencyLimiter`
  (cap 20, per-org, and it **fails open** on a Redis error). `webhooks-dispatch.service.ts:107` is
  `void this.run(...)` — detached from the request, so invisible to admission and uncapped in number
  — and `:124-126` is `Promise.allSettled(active.map(...))` over an **unlimited** `findMany` at
  `:114-117` with no per-org endpoint cap. 500 endpoints ⇒ 500 concurrent sockets per event, each up
  to 5 attempts with backoff to 30 s.

**5. Per-tenant.** Body cap **enforced at the boundary** (`main.ts:114-122`, `bodyParser: false` at
`:66`). **`RateLimitGuard` is NOT an `APP_GUARD`** — zero occurrences in `app.module.ts` (I counted);
it is opt-in per controller (~30) and `rate-limit.guard.ts:27` **no-ops when no tier is declared**,
a failure mode the tier table's own comments record as having bitten before. **Pagination silently
clamps** — `pagination.ts:14,17` `Math.min(pageSize, 100)`, so `pageSize=100000` returns 100 rows
and **200, not 400**. Hard 400s exist only where a module's Zod schema declares one (3 call sites).

**Unbounded in-memory accumulation** (the "exhausting memory" half): a family of *drain every page
into one array* helpers — `hr-keyset-batch.ts:17-32`, `payroll-keyset-batch.ts:18-30`,
`calendar-keyset-drain.ts:6-15`, `gdpr-subject-erasure-paging.ts:4-18`,
`gdpr-export-types.ts:87-104` (which hard-codes `truncated: false`),
`role-grant-reconciler.service.ts:185-204`, `calendar-conflict.service.ts:104`,
`mail.service.ts:111`, `for-each-org.ts:157-161`, and `outbox-report.service.ts:71-95` — one object
per tenant, **HTTP-reachable**. Page size is bounded; the total is not.

**VERDICT: 1 limit FAILS outright (pool), 2 have material holes (provider, per-tenant), 1 has an
absent deadline (worker), 1 holds with two classification holes (admission). The box stays open.**

---

## 7. Commands, exit codes, files

| command | exit | number |
|---|---|---|
| `node src/scripts/check-route-budgets.mjs --self-test` | **0** | 33 checks (was 27) |
| `node src/scripts/check-route-budgets.mjs` | **1** | 2 pre-existing measured breaches (`GET /calendar/events` buffers, `GET /cron/storage-sweep` downstream) — neither mine, neither moved |
| `node src/scripts/check-benchmark-manifest.mjs` | **1** | unchanged, not touched |
| `run-read-cost-budgets.mjs` (10 ids, then all 71) | **0** | 71 PASS / 0 FAIL / 0 UNMEASURED |
| bite: new unbudgeted cron endpoint | **1** | census 53 → 54 |
| bite: stale `declaredOutOfScope` | **1** | "a stale exclusion reads as coverage" |
| bite: index defeated on `chat-messages-page` | **1** | Seq Scan, 13,344 rows, 243 blocks, inside a 10,000 ceiling |

**Not run:** `pnpm typecheck`, `pnpm check:spec-typecheck`, jest. Nothing I changed is TypeScript —
all three files are `.mjs`/`.json` and outside `tsconfig.build.json`. Say "not run", not "passing".

Files changed (backend only):
- `src/scripts/check-route-budgets.mjs`
- `src/scripts/read-cost-budgets.mjs`
- `contracts/route-budgets.json`
