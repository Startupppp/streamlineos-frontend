# 23b — the perf gates are wired into CI, and `GET /calendar/events` is re-measured

**Session S14, 2026-09-03.** Territory: backend `test/perf/**`,
`src/scripts/check-route-budgets.mjs`, `check-benchmark-manifest.mjs`,
`benchmark-regression.mjs`, `contracts/route-budgets.json`,
`contracts/benchmark-manifest.json`, and both repos' `.github/workflows/**`.

---

## 1. The finding: the perf gates existed and CI never named them

Everything ticket 23 built was wired in `package.json` and invoked by **no workflow step
in either repository**. Measured before touching anything:

```
grep -c 'benchmark\|perf:' streamlineos-backend/.github/workflows/*.yml    -> 0
grep -c 'benchmark\|perf:' streamlineos-frontend/.github/workflows/*.yml   -> 0
```

So `check:benchmark-manifest`, the regression policy in `benchmark-regression.mjs` and the
three perf-capture self-tests had **never executed in CI**. This is the third shape of the
same defect this release has now hit three times: 35b found the gates sequenced under a red
`Lint`; ticket 35 found one red step skipping the 74 gates below it; this is a gate that
exists, passes locally, and is simply never invoked. A green tick over a gate nobody calls
is indistinguishable from a green tick over a gate that passed.

`check:route-budgets` was the one exception — it was already wired, and already red.

## 2. What was added

`streamlineos-backend/.github/workflows/ci.yml`, commit `07295b18`, +144 lines, one file.

Four steps at the end of the **`gates`** job — the job with no `needs:`, so nothing upstream
can mask them. **Every one carries `if: ${{ !cancelled() }}`**, for the reason stated at the
top of that job: without it a single red step turns every gate after it into `-`, which is
how a prefix of the suite gets reported as the suite.

| Step | Command | Measured at head |
|---|---|---|
| Benchmark manifest and regression policy self-tests | `check:benchmark-manifest:self-test && check:benchmark-regression:self-test` | exit 0 · 47/47 and 25/25 |
| Benchmark manifest | `check:benchmark-manifest` | **exit 1** · FAIL, see §3 |
| Perf capture harness self-tests | `check:benchmark-http:self-test`, `perf:prepare-http-seed:self-test`, `check:route-budgets-http:self-test` | exit 0 · 19/19, 10/10, 27/27 |
| Route budgets agree with the HTTP capture they were merged from | `check:route-budgets-http` | exit 0 · 69/82, 0 written, 0 cleared |

All four are **hermetic** — they read committed JSON artifacts plus source, no database, no
network, no secret. Verified by running `check:benchmark-manifest` in a shell with
`DATABASE_URL` and `APP_DATABASE_URL` unset: same exit 1, same output.

The harness's own 20-case unit spec is deliberately **not** named: `test/perf` entered jest's
`roots` on 2026-09-03, so the unfiltered `pnpm test` in the `tests` job collects it. Naming
it again would make that job look filtered.

A fifth step went into **`tenant-isolation`**, not `gates`, because it boots the real Nest
app against a seeded database:

- **`Route-budget HTTP capture (perf) — needs a seeded database`**, `continue-on-error`,
  with its four prerequisites named in the step comment: owner + **non-owner** URLs on the
  same seed (owner-only passes every case while BYPASSRLS removes the RLS predicate that
  costs the most), two tenants at opposite ends of the skew, a local placeholder
  `AUTH_SIGNING_KEYS`, and `--expose-gc` (the harness refuses to record heap without it,
  which is why the step does not reuse `pnpm test:e2e:seeded` — that script has no
  `--expose-gc`). Measured locally with all four present: **exit 0, 9/9**.
  It is named separately because `Seeded isolation suite` **already collects this file**
  (its config matches `test/**/*.seeded-e2e-spec.ts`) and has always silently skipped it.
  A skip folded into another job's green tick is indistinguishable from a pass.

## 3. `check:benchmark-manifest` is wired BLOCKING and is red

It exits 1 on figures the contract already declares, not on a placeholder:

```
GET /cron/storage-sweep@reference  downstream calls 8 > declared 0
GET /cron/storage-sweep@minority   downstream calls 8 > declared 0
```

The ceiling of 0 is **not** raised. `forEachOrg` makes the count O(organisations swept), so
no fixed per-request integer describes the route on any deployment but this seed. It is
wired blocking for the same reason `Route budgets` beside it is: a gate exiting 1 on a real
measured breach is a gate working.

## 4. `GET /calendar/events` — re-measured, and the breach is GONE

The calendar owner fixed the regression and explicitly did **not** re-run the HTTP harness,
so the claim that the 915.9 ms breach was gone was an inference. It is now a measurement.

Two independent runs on `scratch_t23_http` (journal head **667/667**, asserted by the suite),
as `streamline_app` with `rolbypassrls = false` and RLS live, Redis off (cache-MISS ceiling),
40 samples + a separate `--expose-gc` heap pass, both control probes required to hold and
the subject hash required to stay stable. Both passed 9/9, exit 0.

| | reference (89.93%) | minority (9.00%) |
|---|---|---|
| **S13 baseline, full capture** | **915.944 ms p95 · 196 statements · 75.8 MB** | — |
| S14 single-route run | 276.415 ms · 82 statements · 60.089 MB · 197,493 B | 52.25 ms · 41 statements · 17.951 MB · 177,513 B |
| S14 full capture (partial) | **305.746 ms · 65 statements · 60.229 MB · 197,493 B** | not reached (run stopped, §6) |

The full-capture row is the directly comparable one — same driver, same sample count, same
position in a multi-route run as the 915.9 ms figure. **305.7 ms against the 800 ms approved-
complex PRD §12.1 ceiling.** The route is **UNDER** its ceiling, and it is no longer the one
route in the capture over a PRD ceiling.

The statement count is the load-bearing number, because it is deterministic and cannot be
machine load: **196 → 65**. That matches the mechanism the owner described (the loop bounded
at the projector's own cap instead of paging the tenant's whole window) rather than a
quieter machine. The minority tenant was measured at 41 statements / 52.25 ms; the warning
that minority tenants now do more total work did not show up as a request-level breach.

Heap did not move much (75.8 → 60.2 MB): still the most memory-hungry request in the product,
still inside its declared budget.

**Not reconciled into the contracts.** `contracts/route-budgets.json` still carries
`measuredLatencyP95Ms: 915.944` for this route and `contracts/benchmark-manifest.json` still
carries the S13 capture, because the replacement full capture was **stopped at ~81 of 164
slots** (§6) and a half capture must not be merged — the merger would clear the 80+ routes it
never reached. The number above is measured and reported; the artifact refresh is the next
session's first job and needs one uninterrupted full capture plus
`perf:merge-route-budgets --write`.

`check:route-budgets`'s other breach, `measuredBufferBlocks=7072 > 2000`, is the
**statement-level** read-cost figure, produced by `run-read-cost-budgets.mjs` /
`measure-route-budgets.mjs` — not this instrument, and not this territory. The calendar owner
measured that same benchmark at **7,063 → 706 blocks** on `scratch_perf_seed`; re-running the
read-cost writer is what clears it from the contract.

## 4b. The per-organisation downstream unit — implemented, and nothing went green

Backend commit `55ca701e`, `src/scripts/check-route-budgets.mjs` only.
`effectiveDownstreamCeiling(entry, absoluteMax)`:

```
effective = maxDownstreamCalls + maxDownstreamCallsPerOrg * measuredOrgsSwept
```

`maxDownstreamCalls` keeps its meaning as the FIXED, organisation-independent component, so the
declared `0` is not raised and the invariant it encodes for the other eleven worker batches — a
worker batch does not leave the process — is untouched.

**It fails closed.** The allowance applies only when a positive integer `measuredOrgsSwept` has
been recorded on the entry. A per-unit ceiling with no measured unit count is an unbounded escape
hatch, and one field typed into a contract must never be able to silence a route on its own.

Six self-test cases, the two load-bearing ones first: `per-org-fails-closed` (no org count grants
no allowance) and `per-org-bites` (one call above the allowance still fires, and the issue names
`0 fixed + 1/org x 8 organisations swept`). Plus `per-org-zero-orgs`, `per-org-boundary`,
`per-org-composes` (the fixed term ADDS, it is not replaced) and `per-org-validated`.

`check:route-budgets:self-test` exit 0. **`check:route-budgets` still exit 1 on the same two
breaches** — no contract entry declares the new field yet, which is the proof that the mechanism
landed without silencing anything.

What remains is the measurement half, and it is small: `CronStorageSweepService.sweep()` already
returns `organizations` in its response body, so the harness has to read a number that is already
there, `merge-http-route-budgets.mjs` has to write the pair, and the two `/cron/storage-sweep`
entries declare `maxDownstreamCallsPerOrg: 1`.

## 5. Commands run, with exit codes

```
grep -c 'benchmark|perf:' <both repos>/.github/workflows/*.yml        0      (the finding)
pnpm check:benchmark-manifest:self-test                        exit 0  47/47
pnpm check:benchmark-regression:self-test                      exit 0  25/25
pnpm check:benchmark-http:self-test                            exit 0  19/19
pnpm perf:prepare-http-seed:self-test                          exit 0  10/10
pnpm check:route-budgets-http:self-test                        exit 0  27/27
pnpm check:route-budgets:self-test                             exit 0  SELF-TEST PASSED (+6 per-org cases)
pnpm check:benchmark-manifest                                  exit 1  FAIL, 2 declared breaches
pnpm check:route-budgets                                       exit 1  386/570, 2 breaches
pnpm check:route-budgets-http                                  exit 0  69/82, contract agrees
node -e '<js-yaml parse of ci.yml>'                            exit 0  gates 85 steps, 0 run-steps without `if`
<HTTP harness, ONLY=GET /calendar/events, both tenants>        exit 0  9/9, subjects STABLE
<HTTP harness, full plan>                                      STOPPED at ~81/164 slots
```

**Not run:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm check:spec-typecheck`. No
frontend workflow change was needed — `check:web-vitals-budget` and
`check:route-bundle-budget` are already named in `frontend.yml`'s `gates` job.

## 6. Honest gaps

- The full re-capture was **stopped at ~81 of 164 slots** on a laptop at 5% battery. Nothing
  was merged from it; the two calendar numbers quoted above are read from its live output and
  from the completed single-route run.
- **`GET /clients` answered HTTP 200 in this capture** (`p95=19.991 ms`, 24 statements). It
  was one of the four routes answering HTTP 500 in S13 (SQLSTATE 25P02). Somebody fixed it;
  recorded here so the next capture is not surprised by the coverage moving up.
- `check:tenant-isolation` is **929/930, exit 1** — `src/modules/storage/storage-pending-purge.service.ts`
  has no cross-tenant negative spec. Assigned to a storage agent. The workflow steps added
  here do not touch it and do not paper over it: that gate is `Cross-tenant isolation
  coverage`, still blocking, unchanged.
- **The frontend repository is mid-`git merge`** (`.git/MERGE_HEAD` present, another agent's), so
  `git commit -- <path>` refuses with "cannot do a partial commit during a merge". This report's
  §4b and the matching ticket-23 box-7 edit are **on disk but uncommitted** in that repo. Nothing
  was staged, resolved or reset — the merge belongs to another agent.
- Cache-hit latency is still unmeasured for the reason recorded in ticket 23 box 4.
