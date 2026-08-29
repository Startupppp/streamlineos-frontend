# Workload and SLO results — cell `cell-2`, 2026-08-29

Per the PRD's release rule, **published workload and SLO results are the only basis for a
`20M-ready` claim**. This is that publication. It does not support the claim, and says so.

Reproduce with `pnpm -C backend load:drive`. Raw output is written to
`backend/.load-driver-results.json`. Browser results from `pnpm -C backend browser:measure`
→ `backend/.browser-driver-results.json`. Authorization benchmark from `pnpm -C backend
auth:benchmark` → `backend/.auth-benchmark-results.json`.

## Run conditions

Declared in `src/scripts/load-driver/load-profile.mjs`, not scattered through flags.

| Condition | Value |
|---|---|
| Concurrency | 16 sustained, 32 burst |
| Duration | 30 s sustained + 10 s burst per workload, 3 s warmup |
| Page size | 50 |
| Tenant | the 100,004-member fixture |
| Geography | **not the PRD's reference** — one machine to Neon `ap-southeast-1` over the public internet |
| Browser | headless Chrome on the developer machine, loopback network |
| Network floor | **a bare `SELECT 1` at concurrency 1 is p50 = 80 ms, p95 = 90 ms** |

**The network floor is the single most important number here.** Every latency below includes it.
A four-round-trip transaction cannot measure under ~350 ms from this machine. The PRD's targets
assume the application and its database are colocated, so a `BREACHED` verdict below is a
statement about where the driver ran, not about the code path it measured.

## Latency objectives — all 14 measured

| Objective | Verdict | Measured | Target | Conditions |
|---|---|---:|---:|---|
| authenticated-interactive-availability | **MET** | 100.0000 % (98/98 over 60 s) | ≥ 99.95 % | run-window ratio, NOT a monthly figure |
| cross-org-data-exposure | **MET** | 0 rows | 0 | RLS enforced; second org present |
| p99-in-process-authorization | **MET** | 15.58 µs CPU (batch mean p99); 22.40 µs wall p99 | ≤ 100 µs | real `AccessService`, all 4 caches primed, zero I/O |
| durable-event-loss-after-ack | **MET** | 0 of 20 acked | 0 | ack tx aborted; 20 remaining PENDING |
| permission-revocation-explicit | **MET** | 648 ms | ≤ 5,000 ms | DB floor only — live app adds in-process cache delay |
| node-failure-committed-loss | **MET** | 0 of 20 committed | 0 | `pg_terminate_backend` fired; connection/process failure only |
| p75-first-useful-view | **MET** | 326 ms FCP p75 | ≤ 1,000 ms | localhost loopback, headless Chrome, login-redirect page |
| p95-browser-cached-read | **MET** | 52 ms TTFB p95 | ≤ 150 ms | localhost loopback; warm-cache navigation, 92 observed cache replays |
| p95-redis-operation | BREACHED | 135 ms | 2 ms | Upstash REST over public internet |
| p95-simple-db-roundtrip | BREACHED | 512 ms | 20 ms | 80 ms network floor; 4 round trips |
| p95-complex-db-read | BREACHED | 545 ms | 50 ms | 100 k-member org; index migration `0626` applied |
| p95-transactional-write | BREACHED | 537 ms | 500 ms | committed insert through RLS on the cell probe table |
| regional-rpo | **BREACHED** | 360 min | ≤ 5 min | timed drill; the **operational** figure (backup interval), not the drill's best case |
| cell-rto | **MET** | 19.6 min | ≤ 60 min | timed drill, `CELL_DB_FAILURE`; elapsed is inside target, but the recovered cell fails 2 RLS checks |

All seven objectives that previously carried a "cannot be driven" reason are now driven.

**`authenticated-interactive-availability`** is a run-window figure. A 60-second window with
100 % success does not convert to a monthly SLO — that requires a month of production traffic
and a real failure budget. It is recorded as 98/98 requests over 60 s and nothing more.

**`p99-in-process-authorization`** drives the real `AccessService.resolveUserPermissions`
through its public entry point with all four in-process caches primed. Stub dependencies throw
on any call; none fired.

> **An earlier version of this table published `0.00 µs` for this objective, and that number was
> meaningless.** The CPU clock on this machine ticks at **16,000 µs** — the benchmark now measures
> and reports that granularity — so a per-call `process.cpuUsage()` delta reads 0 for almost every
> call and its percentiles describe the clock, not the product. The measurement now batches 2,000
> calls per sample so each sample sits well above the tick, and reports the p99 **of batch means**;
> it is not a per-call p99 and a single slow call is averaged into its batch. Alongside it,
> `process.hrtime.bigint()` gives a true per-call distribution at nanosecond resolution: p99 wall is
> 22.40 µs. Wall approximates CPU here only because the measured path performs no I/O, which the
> throwing stubs prove. The verdict requires **both** figures inside target.

**`p95-browser-cached-read`** was also republished. The earlier 177 ms figure was taken from
navigations 2–5 on the assumption that a later navigation is a cached one; every sample in fact
reported `fromCache: false` and transferred ~26 KB, so it measured an **uncached** read under a
"cached" label. The driver now accepts a sample only when the browser itself reports caching, and
records 92 subresource replays (`transferSize: 0` with a non-zero decoded body) across the warm
navigations. The authenticated navigation document is deliberately `no-store` and is therefore never
HTTP-cached, so the figure is the browser-visible TTFB of a warm-cache navigation, not a document
cache replay. Subresource replay durations round to 0 ms and are deliberately **not** used as the
number, because they would report a meaninglessly favourable result.

**`node-failure-committed-loss`** commits 20 transactions, then fires `pg_terminate_backend`
against its own connection and counts survivors. Zero were lost. The failure class is
connection/process failure — **not** a Neon storage-node failure, which this environment provides
no handle to induce.

**`regional-rpo` is reported as 360 minutes, and the drill also measured 0 seconds. Both are true,
and publishing the 0 would have been dishonest.** The drill backs up seconds before it declares the
disaster, so its `rpo_seconds` of 0 proves the *restore itself* is lossless — every row committed
before the backup came back, digests matching. What an operator actually loses is the age of the most
recent backup, which is the backup interval. Backups were previously manual (the earlier run recorded
791 minutes, meaning "whenever somebody last remembered"); a scheduled workflow now bounds it to
6 hours. So the objective is judged on `rpo_operational_seconds` and **breaches by 72×**. A logical
dump cannot reach 5 minutes — it reads every table. Neon PITR is the mechanism that can, and it needs
a `NEON_API_KEY` that does not exist here.

**`cell-rto` is 19.6 minutes against a 60-minute target, so the timing objective is MET** — the
exercise the PRD asks for ran end to end. Breakdown: backup 94 s, rebuild 1,171 s, restore 2.7 s,
verify 1.5 s, with integrity verified across 3 tables and every digest matching.

The drill records one thing the timing verdict deliberately does not absorb. It now separates elapsed
recovery time from whether the recovered cell is *healthy*, and reports both: `rto_elapsed_within_target`
is true, while the drill's own `rto_met` is false because the rebuilt cell fails two RLS checks —
`chat_message_reactions` and `communication_backfill_issues` carry `org_id` with no policy. Those are
another session's tables and are recorded in `CROSS-SESSION.md` as a cross-tenant defect in their own
right. Folding them into the timing number would hide a security finding inside a latency figure, so
they are tracked separately and neither is allowed to mask the other.

**`p75-first-useful-view`** is measured over loopback with headless Chrome. The PRD's reference is
a same-region device on a declared network, so this captures the product's own rendering cost with
no network to cross — a floor, not a comparable figure.

`permission-revocation-explicit` is a **database floor**, not the full path: it measures the
grant write and read-back at the DB. The live application adds a 1 s in-process version cache
TTL and Redis-published invalidation. Both fit inside the 5,000 ms target with room, but the
number here is the floor and not the whole journey.

## Burst behaviour

Doubling concurrency from 16 to 32:

| Objective | Sustained p95 | Burst p95 |
|---|---:|---:|
| p95-simple-db-roundtrip | 512 ms | 887 ms |
| p95-transactional-write | 537 ms | 1,090 ms |
| p95-complex-db-read | 545 ms | 1,040 ms |
| p95-redis-operation | 135 ms | 133 ms |

Database seams roughly double under 2× load. Redis is flat. That is the shape of a
connection-bound workload, not a CPU-bound one.

## Achieved rate

```
requests completed        10,677
achieved                  66.7 req/s
per-cell sustained target 50 req/s
ratio                     133.4 % of target
```

The achieved rate exceeds the per-cell sustained target, and that is **not** a capacity statement: one machine
driving a managed database over the public internet cannot hit 50 req/s when each request spends
~500 ms waiting for network. This says nothing about a cell's ceiling in its reference geography.

## Headroom analysis

Headroom requires measuring resource saturation against the 50 req/s target in the reference
geography. **That measurement is not available from this driver.** What can be concluded:

- **Connection pool** was fully saturated (8 workers, 8 connections) during all sustained windows
  and 2× saturated during burst. The doubling in DB latency under burst is consistent with pool
  wait as the binding constraint at this connection count.
- **Redis** is effectively flat between sustained and burst (135 ms vs 133 ms p95). The Upstash
  REST API is not connection-bound in the same way, so the cache seam does not saturate under 2×.
- **In-process authorization** consumed 7.50 µs CPU per resolution averaged over 50,000 calls,
  p99 15.58 µs by batch mean and 22.40 µs by per-call wall clock. At 50 req/s with a conservatively
  assumed 2 authorization checks per request, the warm-path CPU budget is well under 1 ms/s per
  core — negligible, and negligible by a margin large enough that the measurement's remaining
  imprecision cannot change the conclusion.
- **No headroom figure in percent** is available. The PRD requires headroom be published against
  the 50 req/s ceiling after a same-region, colocated run. This run cannot produce that figure.

The **limiting resource** at this machine is the network round-trip floor (80–90 ms to Neon
ap-southeast-1). In a colocated deployment the round-trip floor would be ≤1 ms, which would
reduce 4-round-trip transaction latency from ~350 ms to ≤4 ms — bringing every database
objective inside its target.

## Rollout and rollback

`pnpm -C backend cell:rollout --regressed-canary`, measured against the live database:

```
baseline p99=1382.3ms → regressed p99=2803.8ms
latency increase 102.8% exceeds 20% rollback threshold
ROLLBACK FIRED on legacy-1, cells to revert: [legacy-1]
```

The regression is a real unindexed sort over 200,000 generated rows, not a mocked number.

## The claim this does not support

The architecture may be called `20M-ready` only when Phase 0 is complete, at least two cells are
operating, relocation and recovery have been exercised, and the acceptance workload passes with
published headroom.

Of those: a second cell exists, a relocation has been exercised and rolled back with the source
intact, and **recovery has now been drilled end to end** — the cell was destroyed and rebuilt from a
logical backup in 19.6 minutes with every digest matching. That is a real advance on "not drilled".

What it did **not** clear: `regional-rpo` breaches by 72× (360 min against 5 min) because a logical
dump cannot be taken every five minutes; the recovered cell comes back with two tables lacking an RLS
policy; **the cells are still not independently resourced**; and **no same-region headroom figure
exists**.

All 14 objectives are now measured and 5 breach. Four of those (`p95-redis-operation`,
`p95-simple-db-roundtrip`, `p95-complex-db-read`, `p95-transactional-write`) sit on top of an 80 ms
network floor and are statements about where the driver ran, not about the code path measured. The
fifth, `regional-rpo`, is **not** a geography artefact — it is a real operational gap. Reporting it
alongside the network-bound four would understate it.

**Nothing here supports a `20M-ready` claim, and nothing here should be read as approving one.**
