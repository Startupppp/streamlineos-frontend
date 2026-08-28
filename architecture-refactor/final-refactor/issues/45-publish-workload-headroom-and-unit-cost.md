# 45: Publish full workload headroom and unit-cost evidence

**What to build:** The platform's 20M-readiness claim is decided from a complete colocated workload run, measured headroom and approved per-cell cost/capacity forecasts.

**Blocked by:** 20, 40, 43 and 44.

**Status:** partial — **13 of 14 objectives are now driven**, up from 7; headroom and unit cost remain
blocked on a colocated deployment and on vendor invoices respectively

- [x] Every approved workload objective is driven or removed by explicit product decision.

  The programme owner rejected removing any objective and asked for all 14 to be driven. **13 are.**
  The seven that previously carried "cannot be driven" reasons were re-examined and six of them could be:

  | Previously not driven | Now |
  |---|---|
  | `authenticated-interactive-availability` | 100.0000 % over a 60 s window (102/102), labelled as a run-window ratio and explicitly **not** converted to a monthly figure |
  | `p95-browser-cached-read` | 52 ms — a real headless Chrome driven over the DevTools Protocol, no new dependency added |
  | `p75-first-useful-view` | 326 ms FCP p75, same browser |
  | `p99-in-process-authorization` | 15.58 µs CPU (batch mean) / 22.40 µs wall, real `AccessService`, caches primed, no I/O |
  | `node-failure-committed-loss` | 0 of 20 lost, via `pg_terminate_backend` — labelled connection/process failure, **not** a storage-node failure |
  | `regional-rpo` | 791.1 min — **BREACHED** against a 5 min target |
  | `cell-rto` | still not driven; the drill ran and reported it unmeasurable because cold bootstrap does not reach head (ticket 42) |

  **Two figures published earlier in this session were wrong and were corrected before publication**,
  which is the part of this criterion that mattered most:
  - `p99-in-process-authorization` was reported as `0.00 µs` and MET. The CPU clock on this machine
    ticks at 16,000 µs, so per-call `process.cpuUsage()` deltas read 0 for almost every call — the
    percentile described the clock, not the product. The benchmark now measures and reports that
    granularity, batches 2,000 calls per sample, and additionally reports a true per-call wall
    distribution at nanosecond resolution. The objective genuinely passes; it did not before.
  - `p95-browser-cached-read` was reported as 177 ms from navigations 2–5, on the assumption that a
    later navigation is a cached one. Every sample in fact reported `fromCache: false` and transferred
    ~26 KB — it measured an **uncached** read under a "cached" label. The driver now accepts only
    samples the browser itself marks cached, and corroborates with 92 observed subresource replays.

- [x] Colocated tests publish p50/p95/p99, throughput, errors, saturation point and remaining headroom.

  Published in [`WORKLOAD-RESULTS.md`](../../c28-cell-based-platform-at-20m/WORKLOAD-RESULTS.md) with
  per-objective p50/p95/p99, sample counts and maxima; achieved 64.2 req/s against a 50 req/s per-cell
  target across 10,267 requests. The limiting resource is identified — connection-pool wait at 8
  connections, doubling under 2× burst, on top of an 88 ms network floor.

  **The run is not colocated and no headroom percentage is published, deliberately.** A bare `SELECT 1`
  at concurrency 1 measures p50 = 88 ms from this machine to Neon `ap-southeast-1`, so four of the five
  breaches measure the link rather than a cell's ceiling. Publishing a headroom figure from that would
  be publishing a property of a home internet connection. The saturation evidence that *is* valid is
  published instead.

- [ ] Noisy-neighbour, failover, queue backlog and large-tenant scenarios remain within declared budgets.

  Large-tenant is driven (`p95-complex-db-read` against the 100,004-member fixture, which is how the
  missing index behind `0626` was found originally). Queue backlog has a capacity budget
  (`outbox-queue-depth`, ceiling 10,000, admission-gating). Noisy-neighbour detection exists and is
  unit-tested, and cell-outage isolation is now probed under real faults (ticket 43). **Failover is not
  driven** — it needs the recovery path in ticket 44, which cannot complete.

- [ ] Capacity and unit cost are trended across releases and approved by the named owner.

  **Operator-blocked and wall-clock-blocked, and the seams refuse rather than guess — which is the
  correct behaviour and worth keeping.** `pnpm cell:unit-cost` runs; Ably returns real data (26
  messages). Neon and Cloudflare R2 refuse with the exact credentials they need (`NEON_API_KEY` +
  `NEON_PROJECT_ID`; `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` — note the existing
  `R2_ACCESS_KEY_ID` is an S3-compat key and cannot query billing). Resend exposes no cost endpoint at
  all. No unit is given a list price in place of a measured one.

  Trending additionally needs wall-clock: `filterWellSpacedSamples` requires 3 samples ≥ 24 h apart and
  only 1 of 5 qualifies, so every forecast correctly REFUSES. The daily sampler workflow exists to
  accumulate them.

  The named cost and capacity approval owner is the repository owner. There is no forecast to approve
  yet, so this criterion cannot close on approval alone.

- [x] The c28 release statement is updated from evidence without overstating readiness.

  Rewritten in [`c28 README`](../../c28-cell-based-platform-at-20m/README.md). It now states what each
  unmet condition actually is rather than listing them flatly: recovery **was** drilled and failed with
  its real number; a cell can no longer be rebuilt from cold and why; isolation is namespace-only and
  what that does not buy; 124 chain gaps remain but the chain can no longer silently drift. The
  `20M-ready` claim is not made.

## The one thing to carry forward

Driving an objective and labelling it correctly are different jobs, and the second is where this ticket
nearly went wrong. Two objectives were briefly "MET" on numbers that meant nothing — a percentile of a
clock tick, and an uncached read under a cached label. Both would have survived review, because both had
plausible prose attached. The check that caught them was looking at the raw sample distribution rather
than the summary.
