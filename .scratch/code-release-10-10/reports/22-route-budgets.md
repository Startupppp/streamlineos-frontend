# 22 — Route budgets: what is declared, what is measured, and the fraction that is neither

**Status:** 4 of 6 boxes closed. Two stay open and are stated as fractions, not as passes.

Everything below was measured on `scratch_perf_seed` as `streamline_app`
(`rolbypassrls = false`) with `app.organization_id` set, at commit
`7d613642` (HEAD when the numbers were taken; this report and the manifest are its child).

---

## 1. The headline numbers

| | before | after |
|---|---|---|
| route budgets declared | 19 | **82** (70 routes + 12 worker batches) |
| declared as a share of the 3,613-operation OpenAPI surface | 0.5% | **2.3%** |
| route budgets with any measured field | **0** | **50** |
| declared ceilings measured | 0 of ~95 | **102 of 570 (17.9%)** |
| read-cost budgets measured | 60 of 70 (10 excluded) | **64 of 70**, 0 excluded |
| gate verdict | INCONCLUSIVE | **FAIL** — 2 measured breaches |

The verdict got *worse* on purpose. `INCONCLUSIVE` was the honest reading of a manifest with
nothing in it. `FAIL` is the honest reading of a manifest with two measured breaches in it. The
number that improved is coverage; the number that must not be improved by editing is the ceiling.

**2.3% is the true figure and it is small.** 82 of 3,613 operations carry a budget. The gate prints
that fraction on every run, recomputing the denominator from `openapi.json`, so scope cannot be
truncated silently. The critical set is defined in the manifest (`surface.criticalSelection`):
routes issued on every authenticated page load, each in-scope module's primary list read, each
module's primary transactional write, and the scheduled worker batches that iterate tenant data.

---

## 2. What "measured" means here, stated precisely

Three instruments, three different claims. Conflating them is how a gate ends up green over nothing.

| instrument | populates | what it does NOT prove |
|---|---|---|
| `run-read-cost-budgets.mjs` — `EXPLAIN (ANALYZE, BUFFERS)` of the route's dominant read, as the app role under RLS | `measuredBufferBlocks`, `measuredReadPathP50Ms/P95Ms/P99Ms` | the route's total call count, its response size, or its end-to-end latency |
| `route-db-call-budget.e2e-spec.ts` — `QueryTelemetryTracker` counting statements around a real service call | `measuredDbCalls` | anything about buffers or plans |
| *(none yet)* | `measuredLatencyP95Ms`, `measuredDownstreamCalls`, `measuredResponseBytes`, `measuredMemoryMb` | — these stay **null**, and the gate counts them as unmeasured |

**Buffer blocks ratchet; milliseconds are a lower bound.** The percentiles are taken on loopback
Postgres, so they exclude pool wait and network round trip. `measure-route-budgets.mjs` therefore
*refuses* to write a read-path millisecond figure into `measuredLatencyP95Ms` — writing a 5.7 ms
database read into a 300 ms end-to-end ceiling would report "within budget" for a route nobody has
timed. That refusal is asserted in its self-test (`end-to-end-fields-untouched`).

Percentiles are over **200 samples** per budget. Recorded per entry alongside `coldMs` (the first,
cold-cache sample), `resultRows`, `tenantRows` and the read-cost ceiling the measurement was taken
against.

---

## 3. Measured breaches — recorded, not smoothed

`check:route-budgets` exits 1 on two measured values above their ceiling. Neither ceiling was
raised. Raising a baseline to turn a regression green is itself a defect (ticket 35), and the gate
now says so in its own failure message.

1. **`GET /notifications` issues 5 database statements against a declared `maxDbCalls: 3`.**
   Found by the new ratchet on its first run against a real service. Not fixed here — the
   notifications module owns `NotificationsReadService.list`. Either two of the five calls are
   removable, or the ceiling of 3 was never counted and needs a deliberate, reasoned move.
   Cross-check that the harness measures the right thing: `GET /notifications/unread-count`
   measured **4**, exactly matching that budget's counted-call-path note
   (`resolveMembershipId(1) + fetchLastReadId's own resolveMembershipId(1) + watermark(1) + count(1)`).

2. **`GET /notifications/unread-count` reads 10,234 buffer blocks against a 3,000 ceiling.**
   Same defect the infra agent recorded, now attached to a route budget.

The 20 read-cost breaches behind these are unchanged in kind from the infra report: 11
`notifications-list` partition scans (3,860–6,267 rows each against `maxScanRows 2000`, an `Append`
over 11 monthly partitions with no `created_at` filter, growing one partition per month),
`notifications-unread-count` and `dashboard-personal-notifications-count` over their block
ceilings, `dashboard-announcements` resolving a 2-row table by Seq Scan, and six newly-detected
vacuous budgets (§5).

---

## 4. The four findings handed over, and what happened to each

### 4.1 Ten stale exclusions — **removed**

`read-cost-budgets.mjs` carried `excluded: "CRM/Inventory module not seeded on scratch_e2e"` on ten
budgets. The perf seed populates both modules across four tenants, so the premise was false. All
ten `excluded:` lines are deleted; the catalog now has **zero** exclusions and the runner reports
`0 EXCL`. Nine of the ten now measure and pass; the tenth (`leads-assigned-to-me`) is vacuous (§5).

The header of the catalog now records why: *an exclusion is a claim about the database, and a stale
claim is indistinguishable from coverage.*

### 4.2 The ticket-status predicate — **the seed is the deviant side, not the budget**

The finding was that `t.status IN ('TODO','IN_PROGRESS','IN_REVIEW')` matches zero rows, which is
true — measured, 0 of 20,572. The conclusion needs correcting, and the correction matters because
acting on the original would have made things worse.

```
src/modules/build/core/lib/default-statuses.ts:1  DEFAULT_PROJECT_STATUSES =
  [{ name: "TODO" }, { name: "IN_PROGRESS" }, { name: "IN_REVIEW" }, { name: "DONE" }]
src/modules/dashboard/dashboard-personal.service.ts:28  ACTIVE_TICKET_STATUSES =
  ["TODO", "IN_PROGRESS", "IN_REVIEW"]
```

The **application** provisions and filters on UPPER_SNAKE, and the two agree with each other. The
**seed scripts** write title-case (`seed-perf-scratch.mjs:483`, `seed-scratch-e2e.mjs:411`), and
`build.project_statuses` on `scratch_perf_seed` holds `Todo / In Progress / In Review / Done`. So
the budget faithfully mirrors production and the fixture does not. Retuning the budget to the
seed's vocabulary would have made it measure a query the application never runs — a budget that
passes and guards nothing. Left as-is, now reported as VACUOUS, with the trap written into the
catalog beside the entry. **The fix belongs in the seed scripts** (infra territory).

### 4.3 Fourteen genuine breaches — **reported, ceilings untouched**

See §3. `dashboard-announcements` (2 rows, Seq Scan) is a fixture problem rather than a plan defect;
the honest options are to seed announcements or to drop the `forbid-seq-scan` assertion with a
reason. I did neither — the assertion is correct for a table that grows, and silently deleting it
to get green is the pattern this ticket exists to remove. It needs the announcements owner's call.

### 4.4 Minority-tenant measurement — **fixed, and it changes the picture**

`SEED_ORG_ID=<tiny>` previously reported `9 PASS / 43 FAIL`. Every one of those 43 "failures" was
`seed too small` — a budget whose org-scoped row count sits under a floor calibrated for the
majority tenant. On a 0.18%-share tenant most floors are unreachable *by construction*, so calling
them failures buried the nine real results.

`--profile=minority` now reclassifies below-floor and empty-result outcomes as **UNMEASURED** and
reports coverage as a fraction. The reference profile keeps both as hard failures, so a shrinking
seed on the primary tenant can never go quiet.

| tenant | share | verdict | exit | measured | breaches |
|---|---|---|---|---|---|
| large `…0001` | 89.93% | FAIL | 1 | **64/70 (91.4%)** | 20 |
| mid `…0003` | 9.0% | FAIL | 1 | **47/70 (67.1%)** | 1 budget, 10 partitions |
| small `…0002` | 0.90% | PARTIAL | 0 | **34/70 (48.6%)** | 0 |
| tiny `…0004` | 0.18% | PARTIAL | 0 | **9/70 (12.9%)** | 0 |

The tenant-dependent plans the infra agent demonstrated now reproduce through the budget runner
itself, which is the point — this is a property of the workload, not of a one-off probe:

| budget | large (89.9%) | mid (9.0%) | small (0.90%) | tiny (0.18%) |
|---|---|---|---|---|
| `inv-stock-transactions` | **1,223 blk** | 6 blk | 6 blk | 6 blk |
| `notifications-unread-count` | **10,234 blk** | 2,243 blk | 225 blk | below floor |
| `notifications-list` | 2,838 blk | 1,039 blk | 876 blk | below floor |
| `my-work` | 1,304 blk | 93 blk | 69 blk | below floor |

`inv-stock-transactions` is the sharp one: **1,223 blocks on the majority tenant against 6 on every
minority tenant**, for the identical query — the majority tenant declines the org-leading index and
walks the org-less `created_at` index. A benchmark that only ever measured the largest tenant would
have called `notifications-unread-count` a 10,234-block route and stopped there; a benchmark that
only measured a small one would have called it 225 and declared it cheap. Both are true. The
manifest now records the minority number alongside the primary one in `minorityMeasurement`.

---

## 5. A fifth finding: six budgets were passing over an empty result set

The runner now records the top-level `Actual Rows` of every measured plan and fails a budget that
returns **zero rows**. A budget over an empty result set satisfies every ceiling trivially and no
plan assertion it declares can ever fire: it reads as measured while measuring nothing. The
ticket's boxes 4 and 5 are about exactly this shape.

Six of the seventy were in that state on the reference tenant, and only one was previously known:

| budget | tenant rows | rows returned | why |
|---|---|---|---|
| `dashboard-personal-my-tasks` | 18,500 | 0 | status vocabulary — §4.2 |
| `leads-assigned-to-me` | 8,000 | 0 | no lead assigned to the fixture user |
| `chat-saved-messages` | 12,000 | 0 | no saved message for the fixture membership |
| `kb-page-visits-mine` | 50 | 0 | no page visit for the fixture user |
| `kb-page-id-probe-sdf` | 600 | 0 | search term matches no seeded page |
| `module-access-roster` | 4 | 0 | no `hr`-module role assignment for the tenant |

All six are **fixture** defects, not plan defects, and all six live in the seed scripts (infra
territory). None was waived. `allowEmptyResult: true` exists as an escape hatch and requires an
`allowEmptyReason` string beside it — validated, so the waiver cannot be silent — and it is used
**zero** times.

`measure-route-budgets.mjs` refuses to copy a vacuous measurement into the route manifest, so the
four route budgets backed by one of these read `"status": "unmeasured"` with the reason attached
rather than carrying a number that means nothing.

---

## 6. Box by box

### ✗ Box 1 — every critical route and worker batch declares all five ceilings

**PARTIAL.** 82 budgets, each declaring `maxDbCalls`, `maxDownstreamCalls`, `maxResponseBytes`,
`maxLatencyP95Ms` and `maxMemoryMb` (plus `maxReadPathP95Ms`, and `maxBatchSize`/`maxDurationMs` on
worker batches) — up from 19. Every key is validated against `openapi.json`, so none is imaginary.

What is *not* closed, stated plainly:

- **63 of 82 `maxDbCalls` values are the manifest default (10), not a counted call path.** Five are
  counted query-by-query, 14 are reasoned estimates. Every entry declares which, in `dbCallBasis`,
  and the gate prints the split on every run. A default ceiling is a placeholder wearing a number's
  clothes, and it is now labelled as one instead of being indistinguishable from a measurement.
- **The critical set is asserted, not derived.** There is no request-volume telemetry in this repo
  to rank 3,613 operations by traffic, so the selection rule in `surface.criticalSelection` is a
  documented judgement. It is auditable and it is not evidence.

### ✗ Box 2 — p50/p95/p99 recorded at the release commit, measured fields populated

**PARTIAL.** Read-path p50/p95/p99 over 200 samples are recorded for **50 of 82** budgets, with
provenance (commit, database, role, tenant, profile, sample count, result rows) on every entry.
Database-call counts are recorded for 2. Overall **102 of 570 declared ceilings (17.9%)** are
measured; **0 of 82 budgets are measured on every field**.

What blocks the rest:

- **End-to-end latency, response bytes, memory and downstream calls need an HTTP-level harness.**
  `test/helpers/seeded-e2e-app.ts` boots the whole `AppModule` and signs real tokens, which is the
  right vehicle, but it requires `AUTH_SIGNING_KEYS` — absent from `.env` on this machine — and a
  seeded user holding the permissions each route gates on. Not infrastructure I can stand up inside
  this ticket without spending the shared machine on a full app boot.
- **32 budgets have no read-cost budget behind them** (the 8 writes, the 8 provider-backed mail
  routes, 12 worker batches, and 4 reads with no catalog entry), so the read-path instrument has
  nothing to measure for them.

### ✓ Box 3 — regression tests fail when an implementation adds unexpected database calls

**Closed, and it bit on its first run.**

`src/scripts/route-budget-db-calls.ts` counts statements through `QueryTelemetryTracker`, which
wraps `client.unsafe` — the single entry point Drizzle's postgres-js driver uses for every
statement, so it counts round trips rather than call sites. `SELECT set_config(...)` is classified
separately, so arming tenant isolation never inflates a route's count.

Two assertions, deliberately different:

- `assertWithinDbCallBudget` — is the route inside its declared budget? This is the gate's question,
  and `check-route-budgets.mjs` fails on the recorded answer.
- `assertNoDbCallRegression` — did this change *add* a statement? The line is the last recorded
  measurement when there is one, the ceiling otherwise. A route at 4 against a ceiling of 5 ratchets
  at 4, so creeping to 5 is caught rather than tolerated; a route already over budget ratchets at
  its measured value so it cannot get worse while its owner fixes it, with the breach still failing
  the gate. It never raises `maxDbCalls`.

Proofs: 12 unit tests (`src/scripts/__tests__/route-budget-db-calls.spec.ts`, no database) and 5
live tests against real services over the seed (`test/perf/route-db-call-budget.e2e-spec.ts`).

**Coverage: 2 of 82 routes are ratcheted live.** The mechanism is general; extending it is one
`countDbCalls` call per service. The live suite skips loudly when `APP_DATABASE_URL` is absent.

### ✓ Box 4 — PARTIAL when some budgets are unmeasured; OK only when all are measured and within ceiling

**Closed.** `verdict()` in `check-route-budgets.mjs` has no path from an unmeasured field to OK, and
coverage is counted **per field**, not per entry — the previous gate lumped every entry into
"pending measurement", so buffer blocks on 50 routes and call counts on none read as one state.
Four self-test cases pin the verdict function (`ok-verdict`, `partial-verdict`,
`inconclusive-verdict`, `fail-verdict`).

The read-cost runner gained the same three-way verdict: `STATUS: OK | PARTIAL | FAIL`, with
`--strict` / `STREAMLINE_STRICT_BUDGETS=1` turning a non-OK verdict into exit 2 so a CI job reading
only the exit code can tell them apart.

### ✓ Box 5 — coverage stated as a fraction of the total route surface

**Closed.** Every run prints `82/3613 operations carry a budget (2.3%)`, with the denominator
recomputed from `openapi.json`, not read from the manifest. The manifest's own recorded total is
printed as a drift note when the two disagree, so a stale denominator is visible rather than
authoritative. The PARTIAL message repeats the fraction so a reader skimming the last line cannot
mistake "53 ceilings within budget" for coverage of the API.

### ✓ Box 6 — the read-cost guard's own coverage is stated too

**Closed.** `check-route-budgets.mjs` imports the read-cost catalog directly and prints, every run:

```
Read-cost guard: 70 read-cost budgets declared (0 excluded), covering 70/3613 operations at most
(1.9%); 54/82 route budgets are backed by one (65.9%).
```

Importing the catalog also bought two structural checks the gate did not have: a `readCostBudgetId`
that resolves to nothing is a violation (a budget that *looks* measured and is not), and a
`maxBufferBlocks` that disagrees with the linked read-cost budget's ceiling is a violation (one
number, two ratchets, the looser winning silently). Where `maxBufferBlocks` is not declared at all,
it resolves from the linked read-cost budget, so the ceiling has exactly one home.

---

## 7. Commands run

```
node src/scripts/check-route-budgets.mjs --self-test                       exit 0   21 checks
node src/scripts/check-route-budgets.mjs                                   exit 1   82 budgets, 102/570 ceilings, 2 exceeded
node src/scripts/measure-route-budgets.mjs --self-test                     exit 0   8 checks
node src/scripts/run-read-cost-budgets.mjs --self-test                     exit 0   5 breach types
node src/scripts/run-read-cost-budgets.mjs --samples=200 (org …0001)        exit 1   60 PASS / 20 FAIL, 64/70 measured
node src/scripts/run-read-cost-budgets.mjs --profile=minority (org …0003)   exit 1   46 PASS / 10 FAIL, 47/70 measured
node src/scripts/run-read-cost-budgets.mjs --profile=minority (org …0002)   exit 0   34 PASS /  0 FAIL, 34/70, PARTIAL
node src/scripts/run-read-cost-budgets.mjs --profile=minority (org …0004)   exit 0    9 PASS /  0 FAIL,  9/70, PARTIAL
jest --testPathPattern=route-budget-db-calls                               exit 0   12 passed
jest --config jest-e2e.json --testPathPattern=route-db-call-budget         exit 0    5 passed
pnpm typecheck                                                             exit 2   20 errors, none in these paths
```

Reproduce the measurement:

```bash
export APP_DATABASE_URL='postgres://streamline_app@127.0.0.1:5432/scratch_perf_seed' PGSSLMODE=disable
SEED_ORG_ID=aaaaaaaa-1111-0000-0000-000000000001 node src/scripts/run-read-cost-budgets.mjs --samples=200 --json=/tmp/ref.json
SEED_ORG_ID=aaaaaaaa-1111-0000-0000-000000000002 node src/scripts/run-read-cost-budgets.mjs --samples=200 --profile=minority --json=/tmp/min.json
SEED_ORG_ID=aaaaaaaa-1111-0000-0000-000000000001 ROUTE_BUDGET_DB_CALL_ARTIFACT=/tmp/calls.json \
  pnpm exec jest --config ./jest-e2e.json --runInBand --forceExit --testPathPattern=route-db-call-budget
node src/scripts/measure-route-budgets.mjs --from=/tmp/ref.json --minority=/tmp/min.json --db-calls=/tmp/calls.json --write
node src/scripts/check-route-budgets.mjs
```

---

## 8. Cross-territory findings

1. **`GET /notifications` issues 5 database statements against a declared ceiling of 3.**
   → notifications module. Recorded as `measuredDbCalls: 5`; the gate fails on it. Not fixed here.
2. **Six vacuous read-cost budgets, all fixture defects in the seed scripts** (§5) →
   `src/scripts/seed-perf-scratch.mjs` / `seed-scratch-e2e.mjs`, infra territory. Seeding a lead
   assigned to the fixture user, a saved chat message, a KB page visit, a searchable page title and
   an `hr`-module role assignment would take measured read-cost coverage from 64/70 to 69/70.
3. **The seed writes title-case ticket statuses; the application writes UPPER_SNAKE** (§4.2) →
   infra territory. This is the sixth vacuous budget and the one with a live consequence: any query
   in the seeded database that filters on the application's own status vocabulary returns nothing,
   so a reader could mistake a correct query for a broken one.
4. **`dashboard-announcements` asserts `forbid-seq-scan` on a 2-row table** → announcements owner.
   Seed it or drop the assertion with a reason; do not leave it failing on table size.
5. **`notifications` list is an `Append` over 11 monthly partitions with no `created_at` filter**,
   3,860–6,267 rows scanned in each → notifications module. Unchanged from the infra report; now
   also reproduced at the 9%-share tenant (2,044–2,263 rows per partition), so it is not an artefact
   of the largest tenant.
6. **Backend `pnpm typecheck` is red with 20 errors, none in these paths** — schema files under
   `src/db/schema/**` gained required columns while their consuming services in
   `hr/recruitment`, `e-sign`, `support/core`, `kb/wiki`, `build/core` and `automation` have not
   been updated. Every erroring file is uncommitted work in the shared tree.

---

## 9. Honest gaps

- **End-to-end latency, response bytes, memory and downstream calls are unmeasured for all 82
  budgets.** They are declared, and the gate counts them as unmeasured. Nobody has timed a route
  over HTTP in this ticket.
- **Millisecond percentiles are loopback-Postgres numbers.** They exclude pool wait and network
  round trip and are a lower bound on production. The buffer-block figures are the ones that carry.
- **The live database-call ratchet covers 2 routes.** The other 80 declare a ceiling nothing checks
  at runtime.
- **The live spec skips when `APP_DATABASE_URL` is unset**, printing why. In an environment without
  the perf seed it proves nothing, and says so.
- **63 of 82 `maxDbCalls` ceilings are the default**, labelled as such and never measured.
- `pnpm lint` — **not run.**
- The full backend jest suite — **not run.** Two focused patterns were run and are reported above.
- The full `pnpm test:e2e` suite — **not run**; only `--testPathPattern=route-db-call-budget`.
- `p99` over 200 samples is the 198th value; it is a real percentile, but taken in a single
  process against a warm local cache, so it describes the query, not the deployment.
