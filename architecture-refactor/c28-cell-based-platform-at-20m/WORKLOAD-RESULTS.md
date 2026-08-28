# Workload and SLO results — cell `cell-2`, 2026-08-28

Per the PRD's release rule, **published workload and SLO results are the only basis for a
`20M-ready` claim**. This is that publication. It does not support the claim, and says so.

Reproduce with `pnpm -C backend load:drive`. Raw output is written to
`backend/.load-driver-results.json`.

## Run conditions

Declared in `src/scripts/load-driver/load-profile.mjs`, not scattered through flags.

| Condition | Value |
|---|---|
| Concurrency | 16 sustained, 32 burst |
| Duration | 15s sustained + 5s burst per workload, 2s warmup |
| Page size | 50 |
| Tenant | the 100,004-member fixture |
| Geography | **not the PRD's reference** — one machine to Neon `ap-southeast-1` over the public internet |
| Device | not applicable, no browser involved |
| Network floor | **a bare `SELECT 1` at concurrency 1 is p50 = 80.1ms, p95 = 97.9ms** |

**The network floor is the single most important number here.** Every latency below includes it.
A four-round-trip transaction cannot measure under ~320ms from this machine. The PRD's targets
assume the application and its database are colocated, so a `BREACHED` verdict below is a
statement about where the driver ran, not about the code path it measured.

## Latency objectives — 7 measured of 14

| Objective | Verdict | Measured | Target |
|---|---|---:|---:|
| cross-org-data-exposure | **MET** | 0 rows | 0 |
| durable-event-loss-after-ack | **MET** | 0 of 20 acked | 0 |
| permission-revocation-explicit | **MET** | 712 ms | 5,000 ms |
| p95-redis-operation | BREACHED | 138.5 ms | 2 ms |
| p95-simple-db-roundtrip | BREACHED | 480.8 ms | 20 ms |
| p95-transactional-write | BREACHED | 575.9 ms | 500 ms |
| p95-complex-db-read | BREACHED | 605.9 ms | 50 ms |

**Not driven — 7**, each with what it would need, in `NOT_DRIVEN_REASONS`:
`authenticated-interactive-availability` (a month of production traffic) ·
`p99-in-process-authorization` (a harness that constructs the real `AccessService` with primed
caches — a benchmark that reimplements the warm path measures the benchmark) ·
`p95-browser-cached-read` and `p75-first-useful-view` (a browser on a reference device and
network) · `node-failure-committed-loss` (a node killed mid-commit; Neon offers no handle) ·
`regional-rpo` (a Neon control-plane property) · `cell-rto` (a timed recovery drill).

`permission-revocation-explicit` is a **database floor**, not the full path: it measures the
grant write and read-back. The live application adds a 1s in-process version cache TTL, and
`bumpPermissionsVersion` publishes on `accessVersionChannel` to flush it. Both fit inside the
5,000ms target with room, but the number below is the floor and not the whole journey.

## Burst behaviour

Doubling concurrency from 16 to 32:

| Objective | Sustained p95 | Burst p95 |
|---|---:|---:|
| p95-simple-db-roundtrip | 481 ms | 901 ms |
| p95-transactional-write | 576 ms | 1,271 ms |
| p95-complex-db-read | 606 ms | 1,697 ms |
| p95-redis-operation | 139 ms | 147 ms |

Every database seam roughly doubles; the cache is flat. That is the shape of a connection-bound
workload. **It is a degradation curve, not the PRD's 40% headroom figure** — headroom needs CPU,
memory, IOPS and connection saturation measured against the 50 req/s per-cell target on a
colocated deployment.

## Achieved rate

```
requests completed        5,092
achieved                  63.6 req/s
per-cell sustained target 50 req/s
```

The achieved rate exceeds the per-cell sustained target, and **that means very little**: it is
one machine driving a managed database over the internet, not a cell under production load. It
says nothing about a cell's ceiling.

## What the run found

The declared member-list surface read **every row of a 100,004-member organization to return
fifty**:

```
Limit (actual rows=50)
  ->  Sort  Sort Key: joined_at DESC  Sort Method: top-N heapsort
        ->  Bitmap Heap Scan on organization_members (actual rows=100004)
              Heap Blocks: exact=1431   Buffers: shared hit=1513
```

1,513 blocks is inside the declared 5,000-block ceiling, so `org-members-list` **passes** as a
read-cost budget. The budget counts blocks; it cannot see that the cost is linear in tenant size
and only survivable because 100,000 members is the largest fixture that exists. Migration `0626`
adds `(org_id, joined_at DESC)` — org_id leads because the RLS policy is predicated on it:

```
buffers   1513 → 53
in-db     92.8ms → 0.24ms
driver    p95 1883.7ms → 605.9ms, samples 191 → 465 in the same window
```

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

Of those: a second cell exists and is reproducible from cold; a relocation has been exercised
and rolled back with the source intact. **Recovery has not been drilled, the cells are not
independently resourced, and no headroom figure exists.** Seven of fourteen objectives are
unmeasured, and four of the seven measured ones breach targets that assume a deployment
topology this run did not have.

**Nothing here supports a `20M-ready` claim, and nothing here should be read as approving one.**
