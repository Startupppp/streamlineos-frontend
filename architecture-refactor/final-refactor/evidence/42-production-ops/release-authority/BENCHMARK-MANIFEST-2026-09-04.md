# Benchmark manifest capture — 2026-09-04

Covers PRD-C140, C141, C142, C143, C145 and C148. **The manifest is now current. Several budgets are
measurably breached.** Those are separate results and are kept separate.

## Why this had never been run

`measure-benchmark-manifest.mjs` **could not execute on Windows at all.** Line 103 did:

```js
await import(join(BACKEND_ROOT, "src", "scripts", "read-cost-budgets.mjs"))
```

On Windows that resolves to `D:\projects\...`, and the ESM loader rejects it —
`ERR_UNSUPPORTED_ESM_URL_SCHEME: On Windows, absolute paths must be valid file:// URLs`. The failure
happens before a single measurement, and `--self-test` passes cleanly because the self-test path never
reaches that import. That is the whole explanation for the recorded blocker *"the manifest is 366
commits stale and was captured on a dirty tree."* Fixed with `pathToFileURL(...).href`.

## Provenance

```
release a92f242c · scratch_boot_d 675 MB · role streamline_app (bypassrls=false) · 12 cpu / 32096 MB
staleness: current — the manifest was measured at HEAD
subject: the measured SQL catalogs are byte-identical to the ones on disk
30 samples · 3 replicates · concurrency 1 and 8 · tenants large/mid/small/tiny
```

`bypassrls=false` matters: measured as the application role under RLS, not as the owner whose
`BYPASSRLS` hides exactly the costs this criterion exists to catch.

## Result — 15 modules, 105 benchmarks, 88 measured on the reference tenant

| Module | Benchmarks | Reference rows | c1 p95 | c8 p95 | Errors |
|---|---:|---:|---:|---:|---:|
| notifications | 12 | 240,500 | 520.7 ms | 3437.5 ms | 0 |
| calendar | 12 | 180,535 | 575.9 ms | 1647.0 ms | 0 |
| search | 12 | 12,000 | 496.8 ms | 1478.6 ms | 0 |
| dashboard-home | 15 | 400 | 593.1 ms | 1526.6 ms | 0 |
| build | 10 | 18,779 | 520.7 ms | 1495.5 ms | 0 |
| hr | 9 | 11,500 | 584.1 ms | 1535.4 ms | 0 |
| finance-accounting | 6 | 110 | 560.9 ms | 1512.6 ms | 0 |
| chat | 5 | 1,556 | 568.3 ms | 1470.6 ms | 0 |
| crm | 5 | 25 | 612.2 ms | 1550.9 ms | 0 |
| inventory | 5 | 0 | 591.9 ms | 1575.2 ms | 0 |
| kb | 4 | 12,606 | 616.1 ms | 1537.0 ms | 0 |
| org-access | 3 | 504 | 623.2 ms | 1544.2 ms | 0 |
| payroll | 3 | 36 | 519.8 ms | 1574.6 ms | 0 |
| support | 3 | 60 | 593.6 ms | 1582.9 ms | 0 |
| mail | 1 | 4,000 | 575.9 ms | 1535.0 ms | 0 |

Error rate is 0 across all 105. `notifications` is the one module whose c8 p95 (3437 ms) diverges
sharply from the rest, on much the largest reference dataset.

## What is measured, and what is honestly not

- **Statement ceilings: 63/300 (21.0%)** of benchmark×tenant slots, 3 vacuous, 234 unmeasured. This is
  the principal coverage gap and it is declared, not inferred from a proxy.
- **Request level: 137/164 (83.5%)** slots — but **carried forward** from commit `2f37e1bb`, not
  re-measured by this run. The producer says so itself.
- **Cache-hit latency: NOT MEASURED.** No Redis runs against this seed, so every figure is the
  cache-MISS ceiling. PRD-C143 asks specifically about the cache-HIT path, so it cannot be answered here.
- 27 request slots were **refused** with reasons recorded rather than silently skipped: 12 provider-backed
  (no connected mail account in the seed), 7 HTTP 402, 6 HTTP 500, 1 no client to bill, 1 no payroll run.
  A non-2xx response measures the failure path, not the route.

## Measured breaches

Two routes over the PRD §12.1 300 ms request ceiling:

| Route | p95 | Ceiling |
|---|---:|---:|
| `POST /chat/channels/{channelId}/messages@reference` | **5043.1 ms** | 300 ms |
| `POST /chat/channels/{channelId}/messages@minority` | 670.6 ms | 300 ms |

Five declared-budget breaches against `contracts/route-budgets.json`, including
`POST /chat/.../messages@reference` at 5043 ms against a declared 1000 ms, and three routes making
downstream calls where the contract declares 0. The gate's own words: *"Raising the ceiling to turn one
green is itself a defect."* No ceiling was raised.

## The regression gate (PRD-C148) is four-fifths armed

| Dimension | State |
|---|---|
| Buffers | **EXACT** on 63/63 pairs |
| Rows | **EXACT** on 63/63 |
| Statement counts | **EXACT** |
| Plan shape | **EXACT** — 0 of 221 pairs changed shape across replicates with no code change |
| Timing | **DISARMED** |

Timing is disarmed for a measured reason: unchanged code moved by up to **81.7%** between replicates on
this harness, against a 25% arming threshold. Thresholds are derived from that measured envelope rather
than guessed, and the harness proves it does not cry wolf — **0 of 126 unchanged-code comparisons would
have failed (0.00%)**. Arming latency here would produce a gate that fires on this machine's noise and
is muted within a week; that is a worse outcome than an honestly disarmed dimension, and the decision
belongs to the owner.

## Verdict

| Criterion | Verdict |
|---|---|
| C140 | **OPEN** — manifest is current and complete in shape, but only 21.0% of statement ceilings are measured |
| C141 | **OPEN** — measured breach: chat message send at p95 5043 ms against a 300 ms ceiling |
| C142 | **OPEN** — 63/300 statement ceilings measured; coverage, not a missing capture, is the gap |
| C143 | **OPEN** — cache-HIT latency not measurable without Redis against this seed |
| C145 | **OPEN** — confirmed with a number: the chat message path is 16.8× its ceiling |
| C148 | **OPEN** — 4 of 5 dimensions armed and proved false-positive-free; latency disarmed at a measured 81.7% noise floor |

Every one of these moved from *"depends on C140, no evidence exists"* to a measured number with a named
cause. Nothing was closed by moving a ceiling, adding an allowlist, or narrowing a corpus.
