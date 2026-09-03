# 23 — The benchmark manifest, and which regression gates are actually armed

**Status:** **2 of 8 boxes closed** — boxes 1 and 8. The other six are stated as fractions, not as
passes. The single thing that had blocked three of them — no authenticated request-level harness —
is now resolved, and §9 is the whole story of what that took and what it found.

Captured at **`ef3c1960`**, `2026-09-02T17:31:51Z`, load average 4.0.

Everything was measured on `scratch_perf_seed` as `streamline_app` (`rolbypassrls = false`) with
`app.organization_id` set, against **all four tenants** in the 89.93 / 9.0 / 0.90 / 0.18 percent
skew — never as the owner, whose `BYPASSRLS` hides the predicate that costs the most.

| artefact | path |
|---|---|
| the manifest | `contracts/benchmark-manifest.json` |
| the gate | `src/scripts/check-benchmark-manifest.mjs` |
| the regression decision | `src/scripts/benchmark-regression.mjs` |
| the module declaration | `test/perf/benchmark-modules.mjs` |
| the runner | `test/perf/measure-benchmark-manifest.mjs` + `-instruments` / `-environment` / `-noise-study` |
| retained plans | `test/perf/benchmark-plans/approved-complex-{large,mid,small,tiny}.txt` |

Commits: `0f81bbf7` (manifest, gate, runner, retained plans), `ee066df0` (package.json entries),
`a671414a` (subject-content stamping + re-capture at head) — all in `streamlineos-backend`.

---

## 1. The measurement that decided every design choice in this ticket

Three replicates of the same measurement, unchanged code, 154 benchmark×tenant pairs,
on the shared laptop under real contention. **How far did each metric move on its own?**

| metric | median swing | p90 | worst |
|---|---|---|---|
| shared buffer blocks (execution) | **0** | **0** | **0** — it did not move once, on any of 154 pairs |
| rows returned | **0** | **0** | **0** — likewise, 154/154 |
| planning buffer blocks | 0 | +155 blocks | **+2,313 blocks** (0% / 3,000% / 19,100% relative) — ratchetable on 101 of 154 pairs |
| statement p50 | 1.2% | 10.0% | 38.5% |
| statement p95 | 14.3% | 126.3% | **270.0%** |
| statement p99 | 61.9% | 225.9% | 464.0% |
| cold (first-sample) ms | 18.9% | 79.3% | 224.1% |

Plus: the dominant plan node changed shape on its own for **2 of
262** pairs.

Three things follow, and each is the difference between a gate and an alarm.

**(a) Count things, do not time them.** Buffers and rows did not move once across three replicates
of unchanged code, on any of 154 pairs. In the same window p95 moved by up to **270%**. No timing
statistic on this harness is stable enough to gate on. Timing is **DISARMED**: measured, recorded, printed on every run, but it does not
decide the exit code. `TIMING_ARM_THRESHOLD` is 25%; `policyFromNoise()` compares the measured worst
swing against it and arms or disarms on its own, so a dedicated CI box re-arms it with no code
change.

**(b) A gate may only ratchet what its noise study covered.** The three vector-ANN benchmarks issue
a *random* query vector on every run, so their k-nearest-neighbour row count legitimately differs
between two runs of identical code. They are driven by `measure-heavy-query-plans.mjs`, which runs
once rather than R times, so no replicate study ever saw them move — and an exact row-count ratchet
fired on all three the first time a genuinely independent re-measurement was gated. They are now
recorded and **not ratcheted**, along with every other pair the study did not cover, and the gate
prints that count.

**(c) The tolerance is per benchmark, never global.** The first version derived one tolerance from
the worst swing across every benchmark. On the second capture, two date-relative reads
(`leave-requests-mine`, `attendance-mine`) moved their row counts between replicates, and that one
fact took the global buffer allowance from **0 blocks to 2,314**. A 2,314-block allowance is not a
ratchet; it is a rubber stamp. Each benchmark now carries its own measured envelope: a benchmark
whose buffers never moved keeps a **zero** tolerance no matter what any other benchmark did, and a
benchmark whose exact metric moved on its own is excluded from that metric by name rather than
allowed to widen everyone else's band. `policy.deterministic` survives only as a documented fallback
for pairs with no per-pair record — which the coverage rule then declines to ratchet anyway.

**The proof, not the description.** Three independent checks, all run:

- the study's own replay — every replicate of unchanged code, on every tenant, through the *real*
  decision function: **0 of 308 comparisons (0.00%)** would have failed the gate;
- a completely separate re-measurement of the same database, gated against the recorded baseline:
  **155 comparisons, 0 ratcheted metrics moved** (89 pairs recorded but not ratcheted), exit 0;
- **twelve injected defects** into those same real artefacts — §6. Seven fire, three are correctly
  declined by the coverage and disarm rules, and both seed-emptiness refusals trip. A false-positive
  rate of zero is only half a proof; the other half is that the gate still bites.

---

## 2. The seed-validity warning, answered

The coordinator flagged that `seed-perf-scratch.mjs` violated
`chk_chat_channels_privacy_matches_type`, so a freshly bootstrapped seed could give the mid, small
and tiny tenants **no chat data at all** — and a benchmark over an empty table is worse than a
missing benchmark, because it holds steady through a real regression.

**1. Was this capture affected? No, and here is the count rather than an assurance.** Queried
directly on the live seed as the four perf tenants:

| tenant | chat_channels | chat_messages | chat_channel_members | chat_saved_messages |
|---|---|---|---|---|
| large | 168 | 12,000 | 2,000 | 200 |
| mid | 5 | 1,200 | 250 | 20 |
| small | 3 | 120 | 24 | 5 |
| tiny | 3 | 24 | 15 | 5 |

Every tenant holds chat rows, so nothing in the chat module was measured against an empty table.
**Re-verified independently for this report**, on the live seed, as `streamline_app` with
`app.organization_id` set once per connection — the four rows above came back byte-identical. `chat`
is also absent from the gate's seeding-gap list, which is the same fact reached from the artefact
rather than from a query. The manifest carries these counts itself, per module per tenant, so the
question is answerable from the artefact next time rather than by audit.

`scratch_perf_seed` therefore predates or escaped the constraint violation; it was **not** re-seeded
after `3d157c15`, so no re-capture was owed on that account. What *was* owed, and has been done, is a
re-capture at head — see point 3.

**2. Can the manifest DETECT this class of problem? It can now, at two severities**, because
conflating them is how one becomes noise and the other gets ignored:

- **hard violation** — a benchmark recorded as `measured` whose **own subject table** holds zero
  rows for that tenant. `tenantRows` is the read-cost runner's own count over the budget's
  `rowCountSql`, so this is the benchmark's actual subject, not a proxy. Self-tested.
- **hard violation** — a dataset table the harness could not count at all. An uncounted table
  cannot be a floor, and a silent zero is indistinguishable from an empty one.
- **warning** — a module holding rows on one tenant and zero on another. That is a seeding gap, and
  it *loses coverage* rather than producing a wrong number, because the read-cost runner's own
  `minRows` floor already refuses to record a below-floor measurement. Failing the build on it
  would teach people to ignore the gate.

Run against this capture: **0 hard violations, 7 seeding gaps** (the modules named in §7, finding 7).
Both severities are self-tested, and both were re-proved by injection against the real manifest — see
§6.

**3. Staleness is answerable from the artefact — and a release SHA alone is NOT ENOUGH.** This is
the sharpest thing this ticket learned, and it was learned by being wrong first.

The gate reads `environment.releaseSha`, asks git how far HEAD has moved past it, and prints the
intervening commit subjects. That much worked. But **the SQL this manifest measures does not live in
a commit** — it lives in `src/scripts/read-cost-budgets.mjs`, `test/perf/heavy-query-catalog.mjs` and
`contracts/route-budgets.json`, all three owned by other tickets and all three edited in the working
tree for hours before landing. Measured on this machine: the SHA stamp read **"2 commits behind"**
while **eight** read-cost entries had already changed shape on disk. The stamp said "nearly current"
about numbers describing statements the file no longer held.

So the subject is now stamped by **content**: `environment.subject` records a sha256 of every file
the manifest takes its subject from, plus whether each was uncommitted at capture. The gate re-hashes
them and reports drift.

It earned its keep on its first run. The committed capture reports both of these at once:

```
staleness: current — the manifest was measured at HEAD
subject:   DRIFTED — 1 measured SQL catalog(s) changed on disk since capture
  changed: src/scripts/read-cost-budgets.mjs (f8352725eb969c04 -> 595326fca4756862)
```

The catalog changed during the four minutes the capture itself took. A commit-only stamp would have
certified that manifest as describing HEAD. **Drift is a warning, not a violation** — the honest
response is to re-capture, and failing the build on another ticket's in-flight edit would teach
people to ignore the gate, which is the failure mode this whole report is about.

Two real movements were caught this way rather than assumed. Between the first re-capture and the
second, `bd47327c` re-pointed eight read-cost budgets at the columns their services actually use:
`GET /notifications` went from **5 counted database statements to 3** against its ceiling of 3, and
`GET /notifications/unread-count` from 4 to 2. The gate went from **exit 1 / FAIL** to **exit 0 /
PARTIAL** as a result — a real fix by another ticket, visible because the instrument could tell that
its subject had moved.

**4. Planning cost is recorded, and it is the coordinator's point made on my own instrument.**
`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` reports a `Planning` buffer block alongside the executor's,
and nothing else in this repo was capturing it. It is invisible to every wall-clock measurement and
to every execution-buffer measurement, because it is paid before the executor starts.

At this capture, `GET /notifications` reads **2,313 planning blocks against 121 execution blocks to
return 50 rows** — 19× — down from the 11,545 an earlier capture saw before the 41-partition prune in
`3d157c15`. The pruning fixed most of it; the ratio is still the worst in the manifest.

`planningBufferBlocks` is recorded on every benchmark. It is **ratcheted on the 101 of 154 pairs
whose planning cost did not move across replicates**, and recorded-but-not-ratcheted on the other 53
— because the first replicate pays a plan-cache cold cost the next two do not, so a naive ratchet
there would fire on a rerun. (An earlier draft of this report claimed it was "ratcheted on every
benchmark". It is not, and the injection proof in §6 is what showed that: the same +13,723-block
injection FIRES on a covered pair and is correctly declined on an uncovered one.) The worst
offenders in this capture:

| benchmark | planning blocks | execution blocks | rows |
|---|---|---|---|
| `notifications-list` | **2,313** | 121 | 50 |
| `employee-record-list-canonical` | 629 | 1,142 | 300 |
| `timesheets-pending-org` | 280 | 74 | 50 |
| `leave-requests-pending-org` | 280 | 11 | 50 |
| `chat-channel-list` | 269 | 17 | 4 |
| `deals-pipeline` | 266 | 165 | 50 |
| `leads-active` | 259 | 209 | 50 |

Four of those seven pay MORE to plan than to execute.

**5. One harness limitation, stated because it bit.** This manifest measures the *catalog's* SQL,
not the service. A service-level fix is invisible to it until ticket 22's `read-cost-budgets.mjs`
transcription is updated to match. That transcription *was* updated in `3d157c15` (the
`notifications-list` entry now carries the `created_at` window), which is why re-capturing moved the
numbers — but had it not been, this manifest would have gone on reporting the old plan while the
application ran the new one. The staleness check is the mitigation; catalog-versus-service parity is
ticket 22's territory.

---

## 3. Coverage, as a fraction

| | |
|---|---|
| modules with a benchmark record | **15** |
| benchmarks declared | **100** — 70 route read paths + 30 named heavy paths |
| read-cost budgets claimed by a module | **70 / 70 (100%)** |
| heavy-query paths claimed by a module | **30 / 36 (83.3%)** |
| statement-ceiling slots measured (benchmark × tenant) | **154 / 280 (55.0%)** |
| benchmarks measured on the reference tenant | **94 / 100** |
| plan signatures captured | large 70 · mid 65 · small 65 · tiny 62 of 70 |
| approved-complex statements with a retained plan | large 20 · mid 18 · small 18 · tiny 17 of 20 |
| pairs the replicate study covered, i.e. ratchetable | **154** — in the regression pass, 89 of 155 compared pairs are recorded but NOT ratcheted |
| database-statement ceilings with a **counted** figure | **2 / 70 (2.9%)** — the other 68 declare a ceiling nothing has counted |
| vacuous benchmarks (measured an empty result set) | **6** — counted as unmeasured, never as passes |

The six heavy-query ids not claimed by any module are the *losing arms* of head-to-head comparisons
in `heavy-query-catalog.mjs` — `fanout-roles-semijoin-rewrite`, `read-section-page-union-rewrite`,
`membership-unread-count-equivalent`, `search-ticket-ilike-under-rls`, `search-ilike-under-rls`,
`dashboard-recent-activity-fullrow`. The application does not issue them. Benchmarking a path
nothing calls would inflate coverage with numbers no regression could ever be attributed to.

**Milliseconds here are not a production estimate, in either direction.** They are taken over
loopback Postgres, so they exclude pool wait, network round trip, serialisation and the whole Nest
request path — a lower bound. They are simultaneously inflated by contention on a laptop running
several agents (load average 4.0 at capture, recorded in the manifest). Buffers and row
counts are the numbers that carry.

---

## 4. What was built, and what it reuses

The ticket asked for a manifest and a gate. It did not ask for a fifth SQL catalog, and there is not
one. Every benchmark resolves to an entry that already existed:

| instrument | owns | what this ticket added |
|---|---|---|
| `src/scripts/run-read-cost-budgets.mjs` (ticket 22) | 70 route read paths, EXPLAIN(ANALYZE,BUFFERS) under RLS, percentiles, vacuity detection | driven as a child process, four tenants × three replicates; its JSON consumed |
| `test/perf/measure-heavy-query-plans.mjs` | 36 named heavy paths, cold/warm buffers, full plan text | driven as a child process for large/mid/small |
| `contracts/route-budgets.json` (ticket 22) | counted database-statement figures | read-only; the two **counted** figures become exact ratchets, the 68 defaults are recorded as unarmed |

What is genuinely new is the provenance a percentile is worthless without, plus four dimensions no
existing instrument covered: **dataset size** per module per tenant (taken inside the tenant
transaction — taking the total with no GUC fails closed with `42501` on every policied table and
would have reported a dataset of zero, the exact shape of a benchmark that measures nothing);
**concurrency and error rate** (the real statement, not `EXPLAIN`, at concurrency 1 and 8 against a
pool sized to exactly that concurrency); **planning buffers**; and **per-replicate plan signatures**,
which is what made the plan-shape ratchet calibratable at all.

Two defects found and fixed in my own instrument along the way, both of which would have shipped a
gate that guards nothing:

1. the dominant-node picker seeded its "best" from the root's *inclusive* buffer count, so the root
   was unbeatable and every plan signature came back as the outermost node (`Limit`). A plan ratchet
   on `Limit` can never see an index change. It now seeds below zero and picks by *exclusive*
   buffers.
2. the global-tolerance flaw in §1(c).

### The gate

`node src/scripts/check-benchmark-manifest.mjs` answers three questions and never lets one stand in
for another:

1. **Is the manifest honest?** Release SHA, machine, container limits, the literal command, samples,
   replicates and the regression policy are required fields. A manifest measured as a `BYPASSRLS`
   role is rejected outright. A benchmark resolving to no catalog entry is a violation. A statement
   claiming the looser 200 ms COMPLEX ceiling without an approval reason is a violation. A benchmark
   whose query returned zero rows is VACUOUS and counted as unmeasured. Emptiness and staleness as
   in §2.
2. **Are measured statements inside their PRD §12.1 ceiling?** Ordinary 50 ms p95, approved complex
   200 ms p95.
3. **Has anything regressed?** `--against=<fresh measurement>`, decided by the policy and the
   per-benchmark stability the manifest itself carries.

Verdict is `OK` / `PARTIAL` / `FAIL` / `INCONCLUSIVE`, with `--strict` making the distinction
readable from the exit code alone. There is no path from an unmeasured field to `OK`.

---

## 5. Box by box

### ✓ Box 1 — the manifest records, per module: dataset size, concurrency, warm/cold state, machine and container limits, command, repetitions, p50/p95/p99, error rate and release SHA

**Closed.** All ten fields, all 15 modules, and each is a required field the gate refuses to pass
without — `method.command` and `environment.releaseSha` included, both with their own self-test
case. Container limits are reported as a *fact* (`containerised: false`, darwin, no cgroup) rather
than silently reporting the host's memory as if it were a limit. Warm/cold is recorded as both:
`coldMs` and `coldBufferBlocks` are the first sample, the percentiles are the warm distribution, and
the warm buffer count is what ratchets.

### ✗ Box 2 — ordinary authenticated reads and mutations meet their p95 ceiling and approved complex aggregates meet theirs, excluding provider time

**BLOCKED on infrastructure.** The 300 ms / 800 ms ceilings are *request-level*, and nothing in this
ticket timed a route over HTTP. `test/helpers/seeded-e2e-app.ts` is the right vehicle and requires
`AUTH_SIGNING_KEYS`, absent from `.env` here. I did **not** substitute a database-side proxy:
writing a 5 ms statement into a 300 ms end-to-end ceiling would report "within budget" for a route
nobody has timed. Listed under `coverage.notMeasured`; the gate prints it on every run.

Provider time *is* correctly excluded where measured: `mail-inbox-cached` benchmarks the cached
metadata read, not the provider fetch — that is the whole point of the cached path.

**A harness for exactly this is being built in `test/perf/` by another agent**
(`route-budget-http-harness.ts`, `route-budget-http.seeded-e2e-spec.ts`, untracked at the time of
writing). It instruments db calls, downstream calls, response bytes and heap in one request window.
When it lands, this box and the four `notMeasured` dimensions close together. Nothing here was
written against it, to avoid duplicating it.

### ~ Box 3 — ordinary database statements meet their p95 ceiling on the production-shaped seed; plans are retained for every approved exception

**PARTIAL, and the ceiling half is the weak half.**

Measured: **154 / 280 (55.0%)** of benchmark×tenant slots, and **0 of those 154 are over their class
ceiling**. Every declared complex statement carries an approval reason, checked by the gate. The 126
unmeasured slots are 120 the seed is too small to reach plus 6 vacuous — reported as unmeasured,
never as passes. **The coverage fraction is why this box is not ticked.**

The classification rule is written down and applied uniformly rather than case by case: COMPLEX when
the statement aggregates over the tenant's set, does similarity/full-text/vector search, or joins
three or more base tables. 20 of 70 qualify. `notifications-list` is deliberately **ORDINARY**,
because it is a plain paginated list — a slow statement is not reclassified to make it pass.

**Plans are retained** for every approved-complex statement, per tenant, as
`test/perf/benchmark-plans/approved-complex-<tenant>.txt` (large 20 · mid 18 · small 18 · tiny 17 of 20). Plan *signatures*
are recorded for 70/70 read paths on the reference tenant.

Why the ceiling half is weak, stated plainly: a 50 ms p95 on loopback Postgres is an easy bar and
passing it is not evidence that production passes it. `notifications-unread-count` reads
**16 buffer blocks** on the majority tenant and still finishes in single-digit
milliseconds locally, because the pages are in cache. **The buffer count is the finding; the
millisecond is the artefact.**

### ~ Box 4 — cache-hit paths meet their ceiling while preserving authorization correctness; a miss or a cache outage degrades safely without a request storm

**PARTIAL — the storm half verified structurally, the latency half NOT MEASURED.**

No Redis runs against this seed, so every number in the manifest is the **cache-MISS** path. The
100 ms cache-hit ceiling is unmeasured and declared as such.

Verified by reading `src/common/cache/cache.service.ts` (not my territory, not modified):

- concurrent fills of the same key are coalesced through an in-process `inFlight` map, and the
  coalescing wraps `loadOrFetch`, which returns `fetcher()` directly when the Redis client is
  `null` — so **a cache outage still single-flights** rather than turning every concurrent request
  into its own fill;
- `cachedVersioned` puts the namespace generation in the key, so invalidation is an O(1) counter
  bump with no `SCAN`, and old generations expire rather than stampeding;
- `cache.service.spec.ts` asserts TTL jitter across keys filled together, so they cannot re-expire in
  lockstep.

**The gap:** single-flight is **in-process only**. There is no distributed fill lease, so N instances
produce up to N concurrent fills of one hot key — which is what `backend/CLAUDE.md` §6 calls for on
hot shared keys. `cache-multi-instance.spec.ts` passes all 16 cases
(`jest --testPathPattern=cache-multi-instance`, exit 0), including one titled *"concurrent reads
across two instances run the fetcher exactly once"* — but two `CacheService` instances hold two
separate `inFlight` maps, so that title claims more than an in-process single-flight can deliver.

### ~ Box 5 — Home loads sections concurrently and independently, renders available sections without waiting for the slowest, and never starts an unbounded fanout

**PARTIAL. Three of the four clauses hold server-side; the fourth is not a server-side property.**

`src/modules/dashboard/dashboard-personal.service.ts` (read, not modified):

- **Concurrently** — one `Promise.all` over the section reads. ✓
- **Independently** — each arm is wrapped in a `settle()` helper that catches, logs, records the
  source into a `degraded[]` array and returns a fallback, so one failing section degrades to empty
  instead of failing the response. ✓
- **Never an unbounded fanout** — the arm list is a fixed literal, each arm gated by module
  entitlement resolved once up front. No per-row or per-member fanout. ✓
- **Renders available sections without waiting for the slowest** — **it does not.** `Promise.all`
  means the single aggregate response waits for the slowest arm by construction. Streaming
  section-by-section needs either per-section endpoints or a streaming response. **Open on a product
  decision, not on infrastructure.**

The dashboard-home module's own dataset is small (it owns only `announcements`) because its section
reads live over other modules' tables; those row counts are recorded under the modules that own
them, and the manifest says so under `method.datasetAttribution`.

### ~ Box 6 — Chat, Calendar, Inbox and Notifications list, unread/count, range/history and realtime-token paths meet budget without table scans, N+1 or per-item calls

**PARTIAL, and it carries the report's sharpest numbers.**

All four modules are declared and measured. Calendar carries 11 benchmarks including
`export-calendar-range`, `freebusy-conflict-*`, `recurrence-series-page` and the reminder sweep;
Notifications 10, including both fan-out shapes; Chat 4; Inbox (mail) 1.

`GET /notifications` — the state at this capture:

| metric | value | note |
|---|---|---|
| execution buffer blocks | **121** | after the 41-partition prune in `3d157c15` |
| **planning buffer blocks** | **2,313** | **19× its execution cost, to return 50 rows** |
| rows returned | 50 | |
| statement p95 | 0.063 ms | a warm-cache artefact, not a finding |
| tenant rows | 235,297 | the subject is not empty |
| plan | `Index Scan on notifications_y2026_m02 via …_org_id_membership_id_id_idx` | |
| database statements | **3 against a ceiling of 3 — no breach** | was 5; `bd47327c` re-pointed the budget |

**The `GET /notifications` statement breach is RESOLVED, and was resolved by another ticket while
this one was measuring.** An earlier capture recorded 5 database statements against a declared
ceiling of 3, `dbCallRatchet.breach = true`, and the gate failed on it (exit 1). `bd47327c` then
re-pointed eight read-cost budgets at the columns and indexes their services actually use. The
re-capture at `ef3c1960` reads **3 against 3, no breach**, and `GET /notifications/unread-count`
**2 against 5** (was 4). The gate now exits **0 at PARTIAL**.

The ceiling was never raised to achieve that. The number moved because the code did, and the reason
this report can say so with a date rather than a hope is the subject-content stamp in §2.3 — without
it, the manifest would have gone on reporting a breach that no longer existed.

What the numbers still say about that route: **2,313 planning buffer blocks against 121 execution
blocks to return 50 rows.** The statement count is fixed; the planning cost is not.

**The realtime-token path is verified by reading it rather than measured**:
`POST /notifications/events/token` calls `NotificationEventService.generateToken`, which is
`crypto.randomUUID()` plus a `Map.set` and a prune — **zero database statements by construction**,
single-use (`consumeToken` deletes), rate-limited at 30 requests per 60 s
(`notifications:stream-token`). No table scan, no N+1, no per-item call is possible.

**What keeps this box open:** every claim above is *statement-level*. Whether these routes meet a
*request* budget is box 2's blocker.

### ~ Box 7 — connection-pool, worker-concurrency, queue, provider and per-tenant limits apply backpressure rather than exhausting memory, sockets or connections

**PARTIAL — the mechanism is real and wired; the exhaustion behaviour is not measured.**

Measured, per module, at concurrency 1 and 8 against a pool sized to exactly the concurrency, 48
iterations each: **error rate 0.0 on every one of the 15 modules**, with per-statement latency rising
and throughput flattening — the signature of *queueing*, not of exhaustion. Recorded per module in
the manifest.

Read (not modified), the limits that exist:

| limit | where | default |
|---|---|---|
| request concurrency | `AdmissionService`, global `APP_GUARD` | `ADMISSION_MAX_CONCURRENT` 200 |
| request queue depth | same | `ADMISSION_MAX_QUEUE_DEPTH` 400 |
| **per-tenant** concurrency | same | `ADMISSION_ORG_MAX_CONCURRENT` 50 |
| reserved capacity for high-class work | same | `ADMISSION_RESERVED_FRACTION` 0.2 |
| shed response | `AdmissionGuard` | 503 + `Retry-After` |
| admission on by default | `resolveAdmissionConfig` | `enabled: true` |
| database pool | `src/db/pool.config.ts` | 10 direct Neon / 20 pooled / 5 dev, with a boot warning when `DB_POOL_MAX` exceeds a direct endpoint's safe max |
| outbox relay batch | `outbox-publisher.service.ts` | `BATCH_SIZE` 50 |
| body size | admission config | 3 MB |

So: **it sheds rather than exhausts, and it has a per-tenant rung**, and the concurrency probe shows
graceful degradation to 8. **Not measured:** behaviour at or past the pool ceiling, provider-limit
backpressure, and worker/queue concurrency under load. Those need the process running, not the
database.

### ✓ Box 8 — regression gates fail on statistically meaningful movement, not on noise

**Closed, by measuring the noise rather than by choosing a threshold, and then by injecting twelve
defects into the real artefacts to see which ones the gate actually catches.** See §1 for the
calibration and §6 for the twelve injections. The load-bearing result is the pair of planning-buffer
injections: the same +13,723-block change FIRES on a pair whose planning cost never moved and is
correctly DECLINED on a pair whose own planning cost moved 9 → 0 across replicates. A gate that
fired on both would be an alarm; a gate that fired on neither would be decoration.

| ratchet | kind | tolerance | why |
|---|---|---|---|
| shared buffer blocks | deterministic | **each benchmark's own envelope** — 0 where it never moved | never moved on any of 154 pairs across 3 replicates |
| rows returned | exact | **0**, per benchmark | never moved on any of 154 pairs |
| planning buffer blocks | deterministic | per benchmark | newly recorded this ticket |
| database statements | exact, up only | **0** | only the 2 **counted** figures are armed; the 68 default ceilings are reported unarmed rather than failed on |
| dominant plan node | exact | **DISARMED** | changed on its own for 2 of 262 pairs |
| statement p50/p95/p99 | timing | **DISARMED** | worst unchanged-code swing 270% against a 25% arming threshold |

Worth noting about the disarmed plan ratchet: it is not the loss it looks like. **A plan flip that
matters always costs buffers** — an `Index Scan` degrading to a `Seq Scan` reads far more pages — and
the buffer ratchet is exact with a zero tolerance on every benchmark that earned one. The plan
signature is valuable as the *explanation* of a regression, and it is recorded for that; the
*detection* is already covered.

The two instabilities behind the disarm are understood rather than mysterious: both are pairs where
two plan nodes hold near-equal exclusive buffer counts on tiny tables, so which one is "dominant"
flips between runs. That is a property of the summarising rule, not of the plans. Making the
tie-break deterministic is the obvious next step and would likely arm it.

---

## 6. Commands run, exit codes, numbers

Every line below was executed and its output read. Nothing is inferred.

```
node src/scripts/benchmark-regression.mjs --self-test                    exit 0   25/25 checks
node src/scripts/check-benchmark-manifest.mjs --self-test                exit 0   31/31 checks
node test/perf/measure-benchmark-manifest.mjs --self-test                exit 0   18 checks, PASSED
node test/perf/benchmark-environment.mjs --self-test                     exit 0   7 checks, PASSED

APP_DATABASE_URL=…streamline_app…/scratch_perf_seed PGSSLMODE=disable \
  node test/perf/measure-benchmark-manifest.mjs \
    --samples=200 --replicates=3 --concurrency=8 --iterations=48 --plans --write
                                                                         exit 0   15 modules · 100 benchmarks · 94 on the reference tenant
  (same, --replicates=1 --write --out=<fresh-final.json>)                exit 0   same shape, 1 replicate

node src/scripts/check-benchmark-manifest.mjs                            exit 0   PARTIAL · 154/280 (55.0%) · 0 violations · 0 over ceiling · 0 db-call breaches
node src/scripts/check-benchmark-manifest.mjs --strict                   exit 2   PARTIAL is not OK, and --strict says so from the exit code alone
node src/scripts/check-benchmark-manifest.mjs --against=<fresh-final>    exit 0   155 comparisons · 0 ratcheted metrics moved · 89 recorded-not-ratcheted
node src/scripts/check-file-sizes.mjs                                    exit 0   3565 files, all within 500 (7 registered exceptions)
pnpm run check:benchmark-manifest:self-test                              exit 0   31/31
pnpm run check:benchmark-regression:self-test                            exit 0   25/25
```

**Row counts read directly off the seed** as `streamline_app` with `app.organization_id` set per
connection, to answer the seed-emptiness question from the database rather than from the manifest:
chat_channels / chat_messages / chat_channel_members / chat_saved_messages =
`large 168/12000/2000/200 · mid 5/1200/250/20 · small 3/120/24/5 · tiny 3/24/15/5`. Identical to the
manifest's own recorded dataset. Exit 0.

### The twelve injected defects

Each injects **one** defect into a **real** captured measurement and runs the **real** gate. Nothing
here is a fixture. `--manifest=<path>` was added so this runs without overwriting the committed
artefact.

```
# each injects ONE defect into the real captured measurement, then runs the real gate
#   regression pass, --against=<injected fresh-final.json>
  bufferBlocks +1 on a covered pair       FIRES   org-members-list@large 4 -> 5, band 4
  resultRows +1                           FIRES   100 -> 101 (exact ratchet, no tolerance)
  planningBufferBlocks +13,723            FIRES   ticket-org-assigned-to-me@large 5 -> 13,728
  planningBufferBlocks on an UNCOVERED pair  no fire  correct: its own planning buffers moved 9 -> 0
  planSignature -> "Seq Scan on injected"  no fire  correct: DISARMED, printed as advisory
  p50/p95/p99 x100                        no fire  correct: DISARMED, printed as advisory
  benchmark deleted from the fresh run    FIRES   "missing from the fresh measurement"

#   honesty pass, --manifest=<injected manifest>
  measured while its subject table has 0 rows   VIOLATION  the seed-emptiness refusal
  a subject table that could not be counted     VIOLATION  "an uncounted table cannot be a floor"
  a module with 0 rows on every tenant          VIOLATION  "measures nothing"
  a counted db-statement figure over ceiling    BREACH     6 > 5 on unread-count
  role recorded as BYPASSRLS                    VIOLATION  rejected outright
  method.command removed                        VIOLATION  missing required provenance
```

Three of those twelve are **negatives that are supposed to be negative**, and they are reported as
proofs rather than hidden: a disarmed metric that quietly fired would be worse than one that does
not fire at all.

**Reproduce** (also recorded in the manifest as `method.reproduce`):

```bash
export APP_DATABASE_URL='postgres://streamline_app@127.0.0.1:5432/scratch_perf_seed' PGSSLMODE=disable
node test/perf/measure-benchmark-manifest.mjs --samples=200 --replicates=3 \
  --concurrency=8 --iterations=48 --plans --write
node src/scripts/check-benchmark-manifest.mjs
```

**Not run, and not claimed:** `pnpm lint`, `pnpm typecheck` (no `.ts` file changed — this ticket's
code is all `.mjs`), the backend jest suite, `pnpm test:e2e`.

## 7. Cross-territory findings

1. **RESOLVED by ticket 22 during this ticket.** `GET /notifications` issued 5 database statements
   against a ceiling of 3. `bd47327c` re-pointed eight read-cost budgets; the re-capture reads 3/3,
   and `unread-count` 2/5. No action needed — recorded because the *mechanism* that made it visible
   (§2.3) is the reusable part.
2. **The read-cost catalog is a transcription of service SQL, and nothing enforces the pairing.**
   The staleness+drift check now *detects* divergence between the manifest and the catalog; it
   cannot detect divergence between the catalog and the service, which is the transcription itself.
   While that drifts, every number here describes a query the application may not run. → ticket 22.
3. **`scratch_perf_seed` is one migration behind the repo.** `ef3c1960` added
   `1027_t07b_dashboard_my_tasks_assignee_updated_index`; the index is **not present** in the seed
   (`pg_indexes` returns nothing for it). So the `my-work` and `dashboard-personal-my-tasks`
   numbers in this manifest describe the plan *without* that index. I did not apply another ticket's
   migration to a database other agents cite as evidence. → infra / ticket 07b.
4. **The cache has no distributed fill lease.** Single-flight is in-process only, so N instances
   produce up to N fills of one hot key; `backend/CLAUDE.md` §6 calls for a lease on hot shared keys.
   Separately, `cache-multi-instance.spec.ts`'s case titled *"concurrent reads across two instances
   run the fetcher exactly once"* claims more than two separate `inFlight` maps can deliver.
   → cache owner.
5. **Realtime stream tokens live in a process-local `Map`** (`NotificationEventService`), so a token
   minted on one instance cannot be consumed on another. → notifications module.
6. **Home cannot render sections as they arrive** — the backend returns one `Promise.all` aggregate,
   so the response waits for the slowest section. Product decision. → dashboard owner.
7. **7 modules hold rows on some tenants and zero on others**, which loses coverage on those
   tenants: notifications, calendar, search and kb hold rows on large/mid/small and none on tiny;
   dashboard-home, finance-accounting and payroll hold rows on large only. Reported by the gate as
   warnings, deliberately not as failures — this loses coverage, it does not produce a wrong number.
   → infra / seed scripts.
8. **6 vacuous read-cost budgets remain** on this database (`chat-saved-messages`,
   `dashboard-personal-my-tasks`, `kb-page-id-probe-sdf`, `kb-page-visits-mine`,
   `module-access-roster`, `leads-assigned-to-me`) — each measures an empty result set, so every
   ceiling it declares is satisfied trivially. `3d157c15` fixed the seed *scripts*; the live
   `scratch_perf_seed` has not been re-seeded since. A re-seed would raise measured coverage from
   55.0%. → infra.
9. **An HTTP-level route harness exists in `test/perf/` (`route-budget-http-harness.ts`,
   `route-budget-http.seeded-e2e-spec.ts`), untracked, owned by another agent.** It measures the
   four dimensions this manifest reports as NOT MEASURED. Nothing here was written against it; when
   it lands, box 2 and `coverage.notMeasured` should be revisited together.
10. **`package.json` now carries the three gate entries** (`ee066df0`), added when the file was clean
   at HEAD and committed by pathspec within the same minute. It was left alone by the previous pass
   because it then held three other agents' uncommitted entries.

---

## 8. Honest gaps

Stated as gaps, not as passes. "Not run" appears wherever something was not run.

- **End-to-end request latency, response bytes, resident memory and downstream-provider calls are
  unmeasured for all 100 benchmarks.** Declared in `coverage.notMeasured`, printed by the gate on
  every run, never approximated by a database-side proxy. This is what keeps box 2 open.
- **Cache-hit latency is unmeasured** — no Redis against this seed; every number is the cache-MISS
  path. This is half of what keeps box 4 open.
- **Coverage is 154/280 (55.0%) of statement ceilings.** The 126 unmeasured are 120 slots the seed
  is too small to reach and 6 vacuous. The tiny tenant reaches only 9 of 100 benchmarks by
  construction at 0.18% share.
- **2 of 70 database-statement ceilings are counted.** The other 68 are ticket 22's manifest default
  and are explicitly reported unarmed rather than failed on.
- **The plan-shape and timing ratchets are disarmed** on this harness — recorded and printed, they
  do not fail a build. Re-running the study on a quiet machine arms them with no code change.
- **planningBufferBlocks is ratcheted on 101 of 154 pairs**, not on all of them: on the other 53 the
  first replicate pays a plan-cache cold cost the next two do not.
- **The manifest is already 4 commits behind HEAD as this is written**, and its `route-budgets.json`
  digest has drifted (ticket 22 regenerated it in `91f3107e`). This is not a defect to be chased —
  a 4-minute capture on a repository taking a commit every few minutes can never be permanently
  current. **The point is that the artefact says so out loud** rather than presenting stale numbers
  as fresh ones. The gate prints both the commit distance and the content drift on every run.
- **Milliseconds are a loopback lower bound AND contention-inflated.** Both directions, both stated
  in the manifest's `honesty` field. Load average 4.0 at capture, recorded.
- **`scratch_perf_seed` was not re-seeded** after `3d157c15`, so that commit's six vacuous-fixture
  fixes are not reflected in this database. The chat data it also fixed was verified present
  regardless (§2).
- **`pnpm lint` — not run. The backend jest suite — not run. `pnpm test:e2e` — not run.**
  `pnpm typecheck` — **not run**, and not applicable: every file this ticket touched is `.mjs`.
- **`test/perf/benchmark-plans/plans-{large,mid,small}.{json,txt}`** (~4 MB) are the heavy-query
  runner's regenerable dumps and are now `.gitignore`d rather than left as permanent untracked
  noise; only the `approved-complex-*.txt` retained plans are committed.
- `check-benchmark-manifest.mjs` (856 lines), `measure-benchmark-manifest.mjs` (554) and
  `benchmark-environment.mjs` (456) sit over the 300-line target in `CLAUDE.md` §7; the first two are
  over the 500-line review threshold. The repo's `check:file-sizes` gate scans `.ts` only and passes
  (exit 0, 3565 files). The runner is already split four ways; splitting further would separate each
  self-test from the thing it tests.

---

## 9. The request level, measured

Three of this ticket's six open boxes were blocked on one thing: **nothing had ever timed a route
over HTTP.** `measuredLatencyP95Ms`, `measuredDownstreamCalls`, `measuredResponseBytes` and
`measuredMemoryMb` were `null` for all 100 benchmarks, and two prior passes refused to fill them
from a database-side proxy. That refusal was right — a 5.7 ms statement inside a 300 ms end-to-end
ceiling reports "within budget" for a route nobody has timed. This section is what it took to make
the real measurement possible, and what the real measurement said.

### 9.1 Two seed defects, both wearing someone else's error

The harness existed (`route-budget-http-harness.ts` + `route-budget-http.seeded-e2e-spec.ts`,
committed by a previous agent in `0defe4c4` / `92f1d96f` / `853add95`, sound and reused as-is). It
did not work, and the reason was not the harness.

**1. Every authenticated request answered `403 ORG_MEMBERSHIP_INACTIVE`.** Not an auth defect. The
chain is: `withTenant` resolves an organisation's placement before opening a tenant transaction →
`RegionRegistry.resolvePlacement` **throws** when the organisation has no `organization_placement`
row → `MembershipStateService.fetchMembershipState` catches *every* throw into `UNKNOWN` →
`JwtAuthGuard` turns `UNKNOWN` into `403 ORG_MEMBERSHIP_INACTIVE`. Measured on the seed:
**8 organisations, 0 placement rows, `organizations.region` NULL on all 8.** A placement defect
wearing an authorization error's clothes, and invisible to every database-side instrument in this
release — which is precisely why 100 benchmarks could be captured against this database while no
route had ever been served.

**2. With that fixed, 36 of 82 route pairs answered `402 PAYMENT_REQUIRED`.** `org_modules` held
**zero rows**, so `ModuleGuard` refused HR, CRM, inventory, payroll, timesheets, support, invoices
and accounting. An organisation with no enabled module is not production-shaped, and a benchmark
against it measures the guard rather than the route.

`test/perf/prepare-perf-http-seed.mjs` fixes both — placement rows matching exactly what
`placeOrganization()` writes (region `primary`, cell `legacy-1`, ACTIVE, a fresh fence lease, because
`resolvePlacement` refuses a placement whose cell differs from the configured one), and one enabled
`org_modules` row per organisation per catalog key. It refuses any database whose name lacks
`scratch`, refuses `cornerstone_*` outright, is `ON CONFLICT DO NOTHING`, and self-tests 10/10.
Both are now **preconditions in the spec**, each naming the fix, so the next reader sees the cause
instead of a wall of refusals.

Measured coverage as each was fixed: **33 → 67 → 68** of 82 route pairs on the reference tenant.

### 9.2 What was measured, and on what

| | |
|---|---|
| instrument | `test/perf/route-budget-http.seeded-e2e-spec.ts` (harness + plan by a previous agent, reused) |
| database | **`scratch_t23_http`** — an isolated `pg_dump`/`pg_restore` copy of `scratch_perf_seed`, `VACUUM ANALYZE`d after restore (a restore carries no planner statistics) |
| at head | **yes — 666 applied of 666 journal entries.** `1042_t29_kb_page_attachments` was applied to the copy only |
| role | `streamline_app`, `rolbypassrls = false`, asserted against `pg_roles` at `beforeAll`; RLS live on 899 relations |
| cache | **Redis OFF — every count is the cache-MISS ceiling**, and this is *asserted*: the spec fails unless the `REDIS` provider is `null`, and the artifact's `cache` field is derived from that same read rather than written by hand |
| tenants | reference (89.93%) and minority (0.90%) |
| samples | 40 per read route, 12 per write, 3 warm-ups, plus a **separate** 5-sample post-GC heap pass |
| credentials | a throwaway Ed25519 keyring minted in the test process. **Nothing was written to either repository**, and no value was read from any deployment |
| commit | `06b9d725`, working tree dirty (recorded, not hidden) |

**Why a copy.** The harness's write entries insert on purpose, and several reports in this release
quote `scratch_perf_seed`'s row counts to the unit. A template `createdb -T` was impossible for
nine minutes — five to thirteen other agent sessions held the source open the whole time — so the
copy went through `pg_dump`/`pg_restore` instead. A read-only mode was added in the meantime
(`ROUTE_BUDGET_HTTP_SKIP_WRITES=1`) which turns the write entries into **declared refusals with a
stated reason** rather than silent absences; the final capture did not need it.

### 9.3 The result

```
node src/scripts/check-benchmark-manifest.mjs        exit 1   STATUS FAIL
  Request level (http-harness, scratch_t23_http, at head):
    137/164 (83.5%) of route×tenant slots measured · 27 refused · 0 failed
    22 recorded but excluded from the request ceiling
    no scored route is over its PRD request ceiling
    3 DECLARED BUDGET BREACHES
```

**115 scored route×tenant slots, 0 over the PRD §12.1 request ceiling** (ordinary 300 ms, approved
complex 800 ms). Both control probes held on both tenants — authenticated `GET /me/access` → 200,
anonymous → **401** — and the subject hash was stable on every table the harness does not declare it
writes.

The slowest scored routes, and the numbers a statement could never have produced:

| route | tenant | p95 | request db calls | response bytes | post-GC heap |
|---|---|---|---|---|---|
| `GET /calendar/events` | reference | **583.8 ms** (ceiling 800) | **79** | 197,493 | **64.2 MB** |
| `GET /contacts` | reference | 106.7 ms (ceiling 300) | 28 | 24,285 | 3.5 MB |
| `GET /calendar/events` | minority | 47.8 ms | 42 | 177,513 | 11.8 MB |
| `POST /leads` | minority | 35.0 ms | 31 | 955 | 5.2 MB |
| `GET /chat/channels` | reference | 27.1 ms | 31 | **436,371** | 8.1 MB |
| `GET /dashboard/personal` | reference | 20.0 ms | 17 | 1,830 | 3.7 MB |
| `GET /notifications` | reference | 19.1 ms | 12 | 15,353 | 3.0 MB |
| `GET /me/access` | reference | 6.0 ms | 6 | 21,596 | 2.4 MB |

**Three declared-budget breaches — the gate fails on these, and they are the point of the ticket:**

1. `GET /chat/channels@reference` — **436,371 response bytes against a declared 131,072**, 3.3×.
   A payload regression that no statement-level instrument can see, because the bytes are produced
   by serialisation, not by the query.
2. `GET /cron/storage-sweep@reference` and `@minority` — **8 downstream calls against a declared
   ceiling of 0**. The only route in the entire capture that leaves the process.

**Four routes answer HTTP 500 on both tenants** and are recorded as refusals, never as latencies:

| route | note |
|---|---|
| `GET /clients` | SQLSTATE **`25P02`** — the transaction was *already aborted*. An earlier statement in the same request transaction failed and was swallowed, and the logged failure is the innocent query that ran afterwards. No earlier error is logged at all. → CRM owner |
| `POST /build/{projectId}/tickets` | 500 on both tenants |
| `POST /chat/channels/{channelId}/messages` | 500 on both tenants |
| `GET /cron/notifications-retention-sweep` | 500; the log carries `Failed query: update "email_outbox" …` |

**Four write paths answer 402 on the majority tenant** (`POST /leads`, `/deals`, `/invoices`,
`/support`) because its plan limit is already reached, and are measured on the minority tenant
instead. That is the application behaving correctly, recorded rather than worked around.

**The request count is a strict superset of the handler count, and is kept in its own field.**
`GET /notifications` issues 3 statements at the service level and **12 at the request level** —
authentication, permission resolution and module entitlement are the other nine. Writing the
superset into `maxDbCalls` would silently raise every service-level ceiling, so it is recorded as
`requestDbCalls` and the two instruments stay distinguishable. Tenant-GUC statements are counted
separately again (`gucCalls`), so arming the GUC never inflates a route's count: `GET /chat/channels`
opens **11 tenant transactions** in one request, which is itself worth knowing.

### 9.4 What the gate now refuses

`evaluateRequestLevel` in `check-benchmark-manifest.mjs` keeps three severities apart, because
conflating them is how a gate becomes an alarm.

| severity | what triggers it |
|---|---|
| **violation** | a tenant whose control probe did not hold — the run is refused, not scored · a route recorded as measured with no p95 · a heap figure recorded while the capture ran without `--expose-gc` · a capture recorded as a BYPASSRLS role · a capture with no reproduction command |
| **over ceiling** | a scored route's p95 above its PRD §12.1 class ceiling |
| **breach** | a measured latency, downstream count, byte count or heap figure above the ceiling `contracts/route-budgets.json` already declares |
| **warning** | not at journal head · a read-only capture (no mutation has a request-level number) · a dirty working tree |

Two exclusions are deliberate and named in the artifact rather than implied. `/cron/*` sweeps are
`class: "worker"`: an all-organisation sweep is not an authenticated user request, so it is
**recorded and not scored** — its numbers are still there, and `GET /cron/storage-sweep`'s 8
downstream calls still breach its declared budget. And the 12 mail slots are declined because no
provider account is connected, which is how "excluding provider time" is honoured structurally
rather than by subtraction.

Twenty-three new self-test cases cover all of it (**47/47** for the gate as a whole), including the
three negatives that matter: a worker route at 5 s does **not** fail a request ceiling, an approved
complex aggregate at 301 ms does **not** fail, and a tenant whose control probe failed contributes
**zero** routes rather than a partial table.

### 9.5 Honest limits of this measurement

- **Serial by construction.** The telemetry tracker is a module-level singleton and the heap
  baseline is process-wide, so two concurrent requests would each count the other's work. These are
  single-request costs, not a load test, and box 7's exhaustion question is still unanswered.
- **Loopback, one process, cold cache.** No pooler, no network, no CDN, no compression — the byte
  figure is the uncompressed payload the application produced, deliberately, because a gzip ratio is
  a property of the deployment.
- **Two tenants, not four.** The plan's fixtures resolve per tenant; the 9.00% and 0.18% tenants
  were not run for time.
- **27 of 164 slots are unmeasured**, each with a stated reason, and the count is printed on every
  gate run so an unmeasured route is visibly unmeasured.
- **`contracts/route-budgets.json` still holds `null` in all five `measured*` fields.** That file is
  ticket 22's. This capture is exactly what fills them, and the artifact records a content hash of
  the file it read the ceilings from.

### 9.6 Cross-territory findings from this pass

1. **`GET /clients` 500s on every tenant, SQLSTATE `25P02`** — a swallowed statement failure leaves
   the request transaction aborted, and the logged error is the next innocent query. → CRM owner.
2. **`POST /build/{projectId}/tickets` and `POST /chat/channels/{channelId}/messages` 500** on both
   tenants. → Build / Chat owners.
3. **`GET /cron/notifications-retention-sweep` 500**, with `Failed query: update "email_outbox" …`
   in the log. → notifications owner.
4. **`GET /chat/channels` returns 436 KB against a 131 KB budget** and opens 11 tenant transactions
   in one request. → Chat owner.
5. **`GET /cron/storage-sweep` makes 8 downstream calls against a declared 0.** → storage owner.
6. **`GET /calendar/events` costs 79 statements and 64 MB of heap** for one request on the majority
   tenant. Inside its ceilings, but it is the most expensive request in the product. → calendar owner.
7. **The perf seed cannot serve an authenticated request as built** — no `organization_placement`
   rows and no `org_modules` rows. Fixed for measurement by `test/perf/prepare-perf-http-seed.mjs`;
   the seed script itself still produces neither. → infra / seed scripts.
8. **`test/perf/**` is outside jest's configured `roots`** (`src`, `evals`, `test/security`), so
   `route-budget-http-harness.spec.ts` is never collected by `pnpm test` and its 20 cases have never
   run in CI. Run explicitly they pass 20/20. → whoever owns `package.json`'s jest block.
9. **`src/scripts/apply-journalled-migration.mjs` hardcodes `ssl: "require"`**, so it cannot apply a
   migration to a local scratch database — it dies with a TLS handshake error that reads like a
   network fault. → scripts owner.

### 9.7 Commands run in this pass, with exit codes

Every line was executed and its output read.

```
node test/perf/prepare-perf-http-seed.mjs --self-test                       exit 0   10/10
DATABASE_URL=<scratch_perf_seed> node test/perf/prepare-perf-http-seed.mjs --write
                                                                            exit 0   8 placements, 160 module rows
DATABASE_URL=<scratch_t23_http>   node test/perf/prepare-perf-http-seed.mjs --write
                                                                            exit 0   0 placements, 160 module rows
node test/perf/merge-http-measurement.mjs --self-test                        exit 0   19/19
node src/scripts/check-benchmark-manifest.mjs --self-test                    exit 0   47/47 (24 pre-existing + 23 new)
node src/scripts/benchmark-regression.mjs --self-test                        exit 0   25/25

# the capture itself — 3 runs, each read in full
AUTH_SIGNING_KEYS=<local placeholder Ed25519, minted in-process, never written to disk> \
DATABASE_URL=<owner@scratch_t23_http> APP_DATABASE_URL=<streamline_app@scratch_t23_http> \
UPSTASH_REDIS_REST_TOKEN= PGSSLMODE=disable \
node --expose-gc ./node_modules/jest/bin/jest.js --config ./jest-e2e-seeded.json \
  --runInBand --forceExit --testPathPattern=route-budget-http
                                exit 0   9/9 tests passed · reference 68 measured / 14 refused / 0 failed
                                         minority 69 measured / 13 refused / 0 failed · both subjects STABLE

node test/perf/merge-http-measurement.mjs --artifact=<capture> --write       exit 0   137 measured / 27 refused / 0 failed of 164
node src/scripts/check-benchmark-manifest.mjs                                exit 1   FAIL · 3 declared-budget breaches
node src/scripts/check-benchmark-manifest.mjs --strict                       exit 2

pnpm -C streamlineos-backend check:spec-typecheck                            exit 0
pnpm -C streamlineos-backend typecheck                                       exit 0
pnpm exec jest --runInBand --roots '<rootDir>/test/perf' \
  --testPathPattern=route-budget-http-harness                                exit 0   20/20
psql -d scratch_t23_http -c 'VACUUM ANALYZE'                                 exit 0   8.1 s
```

`pnpm lint` — **not run**. The backend jest suite — **not run**. `pnpm test:e2e` — **not run**.
The 9.00% and 0.18% tenants — **not run** at request level.

**The gate exits 1 on purpose.** It fails on three measured figures above ceilings the contract
already declares, not on a placeholder. Raising one of those ceilings to turn it green would be the
defect this whole ticket exists to prevent.

---

## 10. S13 (2026-09-03) — the harness runs in CI, the chat payload is fixed, the budgets are filled

Four things this pass, in the order they mattered.

### 10.1 `test/perf/**` was outside jest's `roots`, so the harness had never run

`package.json`'s jest block had `roots: [src, evals, test/security]`. CI's `tests` job runs
`pnpm test` **unfiltered** — deliberately, per the workflow's own comment — and it had never
collected `test/perf/route-budget-http-harness.spec.ts`. Twenty cases asserting the properties
every number in this manifest depends on, none of them ever executed by CI. A harness nothing runs
is not a gate.

```
jest --listTests --roots src --roots evals --roots test/security   1873 files, 0 under test/perf
jest --listTests   (after adding <rootDir>/test/perf)              1874 files, delta exactly 1
jest --runInBand --testPathPattern=route-budget-http-harness       exit 0   20/20
```

**Proved it bites.** A copy of the spec with ONE expectation flipped (`expect(probe.ok).toBe(true)`
→ `toBe(false)`), run through the repository's own jest config — same transform, same
`moduleNameMapper`, same `setupFiles` — with `--roots` pointed at a scratchpad directory:

```
jest --runInBand --roots <scratchpad>/perf-red --testPathPattern=route-budget-http-harness-red
  exit 1   Tests: 1 failed, 19 passed
```

The defect went into a throwaway copy under the scratchpad, never into the shared tree. The two
halves together are the proof: `--listTests` shows the file is in the set CI executes, and the red
run shows a failing spec of that shape exits non-zero.

### 10.2 `GET /chat/channels` — 436,371 → 6,876 bytes, at the payload

`db.query.chatChannels.findMany` carried an unqualified `with: { members: … }`. Drizzle returns
**every** row of `chat_channel_members` for **every** channel on the page, so the page size bounded
the channels and nothing bounded the members inside them. Measured on the seed:

```sql
-- as streamline_app, app.organization_id = the 89.93% tenant
channels 56 · member rows 1000 · members per channel min/avg/max = 500/500/500
-- the members array as the route shaped it, per channel:
channel 2  500 members  245,569 bytes
channel 1  500 members  245,458 bytes
```

Two channels of 500 carried ~245 KB of JSON apiece. The declared 131,072-byte ceiling was right and
the payload was wrong — column projection alone gets it to ~206 KB, so bounding was not optional.

The fix (`src/modules/chat/chat-channel-member-preview.ts`) takes a bounded preview of 8 **plus the
true member count in one statement**: `count(*) over (partition by channel_id)` is taken before the
rank filter cuts the rows, so a truncated array never has to be counted to be reported.
`row_number() over (partition by channel_id order by (membership_id = actor) desc, (role='ADMIN')
desc, id asc)` puts the caller's own row first — the list row's controls read its `isFavorite`,
`role` and `lastReadAt` and must never miss it — then admins, then oldest membership, so the preview
is deterministic. Each member row keeps **exactly** the shape it had: this is fewer rows, not a new
contract. `memberCount` and `membersTruncated` ride beside the array. The channel row is projected
too (`message_count`, `is_pinned`, `linked_deal_id`, `created_by_membership_id` rode 50 rows of a
list that renders none of them).

Measured over HTTP at head, majority tenant:

| | before | after |
|---|---|---|
| response bytes | 436,371 | **6,876** |
| p95 | 27.10 ms | **18.49 ms** |
| post-GC heap | 8.10 MB | **2.73 MB** |
| request db calls | 14 | 15 |

Minority tenant 12,152 → 10,448 bytes.

**The first attempt shipped a 500, and only the HTTP harness caught it.** A subquery projection
keeps each column's own name, so `chat_channel_members.id`, `organization_members.id` and
`users.id` all arrived as `"id"` and the outer SELECT was ambiguous. `pnpm typecheck` was exit 0 and
all 36 chat suites passed over it; the route answered `500 Failed to load channels`. That is the
argument for a request-level instrument in one line.

`src/modules/chat/__tests__/chat-channel-member-preview.spec.ts` — 11 cases — is the regression
gate: the cap exists, the count is taken across the partition and not from the array, the caller's
own row survives, one statement for the whole page, no statement at all for an empty page, and the
member row shape is unchanged.

### 10.3 `contracts/route-budgets.json` — four `measured*` fields, 0/82 → 69/82

`test/perf/merge-http-route-budgets.mjs` folds this ticket's own capture into ticket 22's contract.
It **never** writes `measuredDbCalls`: the capture's `requestDbCalls` is a strict superset of the
handler statement count `maxDbCalls` describes (12 vs 3 on `GET /notifications`), so writing it
would either fail a correct route or, once someone raised the ceiling to go green, widen every
service-level ratchet in the file. It is recorded as `requestDbCalls` under `httpMeasurement`.

It refuses a capture whose control probe did not hold, whose role had BYPASSRLS, that was off
journal head, or that recorded heap without `--expose-gc`. It refuses **per route** when the
declared ceiling moved after the capture — the capture records `declared*` beside every measurement
for exactly that. A route that stopped being measurable has its stale number **cleared**, never
carried forward (8 were cleared on the re-capture). Self-test **27/27**.

```
check-route-budgets   before  110/570 measured (19.3%)   FAIL on 1
                      after   386/570 measured (67.7%)   FAIL on 2
```

Zero `max*` keys changed, across both commits: `git diff | grep '^[-+][^-+].*"max'` → **0**.

### 10.4 `GET /cron/storage-sweep` — the 8 downstream calls, named

`DownstreamCounter` now keeps a per-**origin** tally beside the count. Only scheme, host and port
are recorded, because a pre-signed object-store URL carries its credential in the query string.

```
GET /cron/storage-sweep@reference  downstreamCalls 8
  https://streamlineos.<bucket>.r2.cloudflarestorage.com : 8
```

All eight go to the Cloudflare R2 bucket the sweep exists to reconcile — one per organisation over
the 8 in the seed. Not a stray provider call. **The ceiling of 0 is not raised.** `forEachOrg` makes
this count O(organisations swept), so no fixed per-request integer describes the route on any
deployment but this one; writing 8 would make the gate green here and meaningless in production.
`maxDownstreamCalls: 0` is the wrong *unit*, not the wrong *magnitude*, and the entry now says so in
`downstreamCallBasis` / `downstreamCallNote` while `check:route-budgets` stays red on it. The other
11 worker batches genuinely measure 0, so the invariant the ceiling encodes — a worker batch does
not leave the process — is worth keeping for them.

### 10.5 A regression this pass found and did not fix

`GET /calendar/events` moved **79 → 196 request statements** and **583.79 → 915.94 ms p95** between
the `06b9d725` capture and this one, and is now the only route in the capture **over** a PRD §12.1
ceiling (800 ms, approved complex). It holds **75.8 MB of heap in one request**. The statement count
is deterministic, so this is not machine load. → calendar / dashboard owner.

**Attribution corrected, same session.** The calendar movement is almost certainly the calendar owner's own in-flight refactor, not an unexplained regression: `d93676ad` *"perf(calendar): split the range branches and fetch by candidate id in GET /calendar/events"* and `971e8c5d` *"perf(calendar): merge the two range branches in memory and route the source double on projection"* both landed in the shared tree **before** the commit this capture recorded (`295e55cb`, working tree dirty). A fetch-by-candidate-id split is exactly the shape that turns 79 statements into 196. Reported as a measurement, routed to the owner who is already in that file — not as a mystery.


### 10.6 Commands run, exit codes, numbers

```
pnpm exec jest --listTests | wc -l                                       1874 (was 1873)
pnpm exec jest --runInBand --testPathPattern=route-budget-http-harness   exit 0   20/20
pnpm exec jest --runInBand --roots <scratchpad>/perf-red ...             exit 1   1 failed / 19 passed
pnpm typecheck                                                           exit 0
pnpm exec jest --runInBand --testPathPattern="modules/chat"              exit 0   37 suites / 319 tests
node test/perf/merge-http-route-budgets.mjs --self-test                   exit 0   27/27
node test/perf/merge-http-measurement.mjs --self-test                     exit 0   19/19
node src/scripts/check-benchmark-manifest.mjs --self-test                 exit 0   47/47
node src/scripts/benchmark-regression.mjs --self-test                     exit 0   25/25
node test/perf/prepare-perf-http-seed.mjs --self-test                     exit 0   10/10
DATABASE_URL=<owner@scratch_t23_http> node src/scripts/db-bootstrap.mjs   exit 0   REACHED_HEAD 667/667
psql -U neondb_owner -d scratch_t23_http -c 'VACUUM ANALYZE'              exit 0
<full HTTP capture, both tenants, 40 samples>                             exit 0   9/9 · 136/164 measured · 0 failed
node test/perf/merge-http-measurement.mjs --artifact=<capture> --write    exit 0   136/164
node test/perf/merge-http-route-budgets.mjs --write                       exit 0   69/82 · 143 written · 8 cleared
node src/scripts/check-route-budgets.mjs                                  exit 1   386/570 · 2 breaches
node src/scripts/check-benchmark-manifest.mjs                             exit 1   FAIL
```

**Not run:** `pnpm lint`, `pnpm test` in full, `pnpm test:e2e`, `pnpm check:spec-typecheck`. The
9.00% and 0.18% tenants were not measured at request level.
