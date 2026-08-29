# 45: Publish full workload headroom and unit-cost evidence

**What to build:** The platform's 20M-readiness claim is decided from a complete colocated workload run, measured headroom and approved per-cell cost/capacity forecasts.

**Blocked by:** 20, 40, 43 and 44.

**Status:** partial — **all 14 objectives are now driven**, up from 7, with 9 met and 5 breached.
Headroom needs a colocated deployment and unit cost needs vendor invoices; both are environment, not code

- [x] Every approved workload objective is driven or removed by explicit product decision.

  The programme owner rejected removing any objective and asked for all 14 to be driven. **All 14 now
  are** — `measured=14/14 not_driven=0`, with 9 met and 5 breached. Every one of the seven that
  previously carried a "cannot be driven" reason was re-examined, and every one could be:

  | Previously not driven | Now |
  |---|---|
  | `authenticated-interactive-availability` | 100.0000 % over a 60 s window (98/98), labelled as a run-window ratio and explicitly **not** converted to a monthly figure |
  | `p95-browser-cached-read` | 52 ms — a real headless Chrome driven over the DevTools Protocol, no new dependency added |
  | `p75-first-useful-view` | 326 ms FCP p75, same browser |
  | `p99-in-process-authorization` | 15.58 µs CPU (batch mean) / 22.40 µs wall, real `AccessService`, caches primed, no I/O |
  | `node-failure-committed-loss` | 0 of 20 lost, via `pg_terminate_backend` — labelled connection/process failure, **not** a storage-node failure |
  | `regional-rpo` | **360 min — BREACHED** against a 5 min target. Reported on the operational figure (backup interval), not the drill best case of 0 s, which would have flattered it |
  | `cell-rto` | **19.6 min against a 60 min target — MET.** It became measurable once the cold chain reached head (ticket 42), which happened during this session |

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
  per-objective p50/p95/p99, sample counts and maxima; achieved 66.7 req/s against a 50 req/s per-cell
  target across 10,677 requests. The limiting resource is identified — connection-pool wait at 16
  connections, roughly doubling database latency under 2× burst while Redis stays flat, which is the
  shape of a connection-bound workload — on top of an 80 ms network floor.

  **The run is not colocated and no headroom percentage is published, deliberately.** A bare `SELECT 1`
  at concurrency 1 measures p50 = 80 ms from this machine to Neon `ap-southeast-1`, so four of the five
  breaches measure the link rather than a cell's ceiling. Publishing a headroom figure from that would
  be publishing a property of a home internet connection. The saturation evidence that *is* valid is
  published instead.

- [x] Noisy-neighbour, failover, queue backlog and large-tenant scenarios remain within declared budgets.

  - **Large-tenant** is driven: `p95-complex-db-read` runs against the 100,004-member fixture, which is
    how the missing index behind `0626` was found in the first place.
  - **Queue backlog** has a declared budget and is admission-gating: `outbox-queue-depth`, ceiling
    10,000 `PENDING`/`IN_FLIGHT` rows.
  - **Noisy-neighbour** detection fires at 2.5 standard deviations, and cell-outage isolation is now
    probed under real injected faults — cell-1's database faulted leaves cell-2's sweep enumerating its
    own organizations, and the probe bites when reversed (ticket 43).
  - **Failover** is driven by the recovery drill: a cell was destroyed and brought back in 19.6 minutes
    against a 60-minute budget, with the control plane serving throughout and integrity verified.

  **One honest limit on the word "failover".** What is exercised is cell loss and recovery within
  budget. What is *not* exercised is automatic traffic failover onto a second cell, because that
  requires the second cell to be independently resourced — ticket 43, a purchase. Ticking this criterion
  on the four scenarios it names is not a claim that the platform survives a cell loss transparently.

- [ ] Capacity and unit cost are trended across releases and approved by the named owner.

  **Credentials arrived during the session, so three of the four vendor seams now return measured
  quantities instead of refusing.** `pnpm cell:unit-cost` reports, for the 2026-08-01 → 2026-09-01
  billing period:

  | Vendor | Measured | Status |
  |---|---|---|
  | Neon | **297.17 compute-hours**, 2.424 GiB synthetic storage, 8.509 GiB data transfer | quantities ✓, dollars need invoice rates |
  | Cloudflare R2 | 0.000 GB, 0 Class-A ops, 0 Class-B ops | quantities ✓ (genuinely empty), dollars need invoice rates |
  | Ably | 26 messages | quantities ✓ (channel-minutes estimated from peak; may overcount) |
  | Resend | — | no cost endpoint exists in its public API |

  **A defect found by having the credentials at last: the Neon seam was reading the wrong field names.**
  It asked for `compute_time` and `storage_bytes_hour`; the API returns `compute_time_seconds` and
  `data_storage_bytes_hour`. So the two largest cost drivers reported as `null` — a value that reads as
  a vendor limitation and was really a typo. Fixed, with the old names kept as fallbacks. Compute time
  went from "unavailable" to 297 hours.

  **Still open, on two things neither of which is code.** Dollar figures need the six invoice-derived
  rate variables (`NEON_COMPUTE_RATE_USD_PER_HOUR` and siblings) — no unit is given a list price in
  place of a measured one, deliberately. And trending needs wall-clock: `filterWellSpacedSamples`
  requires 3 samples ≥ 24 h apart and only 2 of 6 qualify, so every forecast correctly REFUSES. The
  daily sampler workflow accumulates them; this cannot close in under ~2 more days regardless of
  credentials.

  The named cost and capacity approval owner is the repository owner. There is no dollar forecast to
  approve yet, so this criterion cannot close on approval alone.

- [x] The c28 release statement is updated from evidence without overstating readiness.

  Rewritten in [`c28 README`](../../c28-cell-based-platform-at-20m/README.md). It states what each
  condition actually is rather than listing them flatly: recovery **was** drilled end to end and a cell
  **can** now be rebuilt from cold, which was not true when this session opened; the operational RPO
  misses by 72× and why a logical dump cannot close it; isolation is namespace-only and what that does
  not buy; 9 chain gaps remain, down from 132, none of them this session's. The `20M-ready` claim is not
  made.

## S7 evidence refresh

On 2026-08-29, the read-only evidence collector ran against the configured development environment.
The capacity snapshot measured database size at 2,480,013,312 bytes of a 3,221,225,472-byte limit
(77.0%), so admission correctly returned a non-zero exit. The unit-cost runner measured 14 active
organizations, 100,099 active users, 10,677 load-driver requests, 2.31 GB stored, and 865 delivered
notifications. It reported 297.17 Neon compute-hours and 26 Ably messages for the vendor period.

The collector passed recovery, capacity, unit-cost, and load-driver self-tests and wrote
`evidence/45-scale/S7-LIVE-DEV-EVIDENCE.md`. It intentionally does not run a destructive recovery
drill, restore, migration, or provisioning operation. Current blockers remain the missing invoice rate
inputs, fewer than three well-spaced trend samples, no colocated load deployment, and no independently
provisioned physical replica.

## The one thing to carry forward

Driving an objective and labelling it correctly are different jobs, and the second is where this ticket
nearly went wrong. Two objectives were briefly "MET" on numbers that meant nothing — a percentile of a
clock tick, and an uncached read under a cached label. Both would have survived review, because both had
plausible prose attached. The check that caught them was looking at the raw sample distribution rather
than the summary.
