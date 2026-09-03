# RB-07 — independent re-run: capacity headroom and unit cost are UNMET locally

**This file is not a captured evidence bundle and must never be treated as one.**
It is `.md`, not `.json`, so `manifest-readiness.mjs` and `ops:evidence:check` will not
mistake it for a manifest. Those gates must keep reporting RB-07 as missing deployed
evidence, and after this file they still do.

Ticket `34-production-ops-alerts-cost`, work item `34-capacity-cost`.
Criteria: **PRD-C167** (SLOs proven with ≥40% capacity headroom), **PRD-C172** (per-cell and
active-tenant cost).
Runbook: `architecture-refactor/runbooks/RB-07-per-cell-cost.md` — its own status line reads
`OPEN — operator-blocked`.

This is a **second, independent execution** of the same scripts an earlier agent ran at
16:20Z on the same day. That run is recorded in `RB-07-local-run-NOT-deployed-evidence.md`
and its raw captures (`cell-capacity.txt`, `cell-unit-cost.txt`, …). This file does not
replace it. It exists because **the re-run produced a different verdict from the same
guard against the same database with no application traffic in between**, and that
instability is the single most important thing this exercise established.

---

## Run identity

| Field | Value |
| --- | --- |
| Operator | unattested — executed by an automated agent. No named human operator. |
| Date (UTC) | 2026-09-03, 16:36:54Z – 16:40:12Z |
| Backend branch / SHA | `release/code-10-10-v2` / `45f8a2e99494483526e357e27f18c76961ebf266` |
| Frontend branch / SHA | `release/code-10-10-v2` / `7469d27895add587f9427e7c50c457f56e0048bf` |
| Host | macOS 26.6.2, arm64, 15 cores, 24 GB RAM, Node v25.9.0 |
| Database | LOCAL `scratch_head_1010`, PostgreSQL 18.4 (Homebrew), 944 public tables |
| `CELL_ID` | `local-scratch-1010` — a label on a laptop database, not a provisioned cell |
| Cell topology | none: no pooler, no per-cell cache, no per-cell queue, no per-cell object store, no replica |

Environment exported for every command below (explicit vars beat `backend/.env`, because
dotenv v17 `config()` defaults to `override: false`):

```
APP_DATABASE_URL=postgresql://streamline_app:***@localhost:5432/scratch_head_1010
DATABASE_URL=postgresql://tarunchintakunta@localhost:5432/scratch_head_1010
DIRECT_DATABASE_URL=postgresql://tarunchintakunta@localhost:5432/scratch_head_1010
PGSSLMODE=disable
CELL_ID=local-scratch-1010
ABLY_API_KEY=""  RESEND_API_KEY=""  NEON_API_KEY=""  NEON_PROJECT_ID=""
CLOUDFLARE_API_TOKEN=""  CLOUDFLARE_ACCOUNT_ID=""
```

`PGSSLMODE=disable` proves the connections were local: the shared remote Neon endpoint in
`backend/.env` requires `sslmode=require` and would have refused. The scripts' own banner
confirms the override took effect — it reads `injected env (53) from .env`, two fewer than
the earlier run's `(55)`, exactly the two vendor keys (`ABLY_API_KEY`, `RESEND_API_KEY`)
that were pre-set to empty so dotenv would skip them.

**The vendor billing keys were blanked deliberately.** `backend/.env` does hold a live
`ABLY_API_KEY` and `RESEND_API_KEY`, but they belong to a shared development tenancy, not to
this cell. Fetching that tenancy's channel-minutes and printing them under
`Cell: local-scratch-1010` would attribute another environment's spend to this one. The
`REFUSED` lines below are the truthful result of not having per-cell vendor accounts.

---

## Commands run, with real exit codes

| Command | Exit | Headline | Raw capture |
| --- | --- | --- | --- |
| `npm run cell:capacity:self-test` | **0** | `SELF-TEST PASS: breach detected — guard can fail` | `c167-rerun-cell-capacity-self-test.txt` |
| `npm run cell:capacity:verify` | **0** | 30 / 30 assertions pass | `c167-rerun-cell-capacity-verify.txt` |
| `npm run cell:capacity` | **1** | limiting resource `table-bloat` at **298.5%**; **cell CLOSED, ADMISSION REFUSED** | `c167-rerun-cell-capacity.txt` |
| `npm run cell:capacity:json` | **1** | `used=0.8955933682373473 limit=0.3` | `c167-rerun-cell-capacity-json.txt` |
| `npm run cell:capacity:json` (2 min later) | **0** | `used=0.13642908567314616 limit=0.3` | `c167-cell-capacity-json-variance.txt` |
| `npm run cell:unit-cost:self-test` | **0** | `SELF-TEST PASS: anomaly detector fired on 500-cost outlier — guard can fail` | `c172-rerun-cell-unit-cost-self-test.txt` |
| `npm run cell:unit-cost:verify` | **0** | 31 / 31 assertions pass | `c172-rerun-cell-unit-cost-verify.txt` |
| `npm run cell:unit-cost` | **0** | snapshot printed; **every derived cost figure self-refused** | `c172-rerun-cell-unit-cost.txt` |

Side effects, all local and all intended by the scripts: one entry appended to the
gitignored `backend/.cell-capacity-history.json` and `backend/.cell-cost-history.json`, and
one row inserted into `cell_capacity_measurements` in `scratch_head_1010`
(`measurement_id=2`). The `--json` path returns before both writes, so the two `--json`
readings mutated nothing.

---

## The finding: the limiting-resource reading swung 6.6× with zero application traffic

Three executions of the same guard, against the same database, inside 49 minutes. No load
generator ran. No HTTP server was serving. No tenant existed to generate work.

| Time (UTC) | `table-bloat` used | Ceiling | % of ceiling | Verdict | Exit |
| --- | --- | --- | --- | --- | --- |
| 16:21:00 (earlier agent) | 0.1592 | 0.30 | 53.1% | cell OPEN | 0 |
| **16:37:27 (this run)** | **0.8956** | 0.30 | **298.5%** | **cell CLOSED — ADMISSION REFUSED** | **1** |
| 16:40:11 (this run) | 0.1364 | 0.30 | 45.5% | cell OPEN | 0 |

### Why

`table-bloat` is `sum(n_dead_tup) / (sum(n_live_tup) + sum(n_dead_tup))` over
`pg_stat_user_tables`. At 16:37 the database held 2,393 live rows and **20,527 dead** rows,
of which **20,000 were in `tickets`** — a table with 60,000 inserts, 0 live rows and 0
deletes, i.e. the residue of another agent's aborted bulk insert on this shared scratch
database. By 16:39:46 autovacuum had reclaimed them and the dead count was 378. Measured
directly:

```
-- 16:37 (at the CLOSED reading)
 relname |  n_live_tup | n_dead_tup | n_tup_ins | n_tup_del
 tickets |           0 |      20000 |     60000 |         0

-- 16:39:46 (after autovacuum; tickets no longer in the dead-row list at all)
 live_rows | dead_rows | nonempty_tables | stat_tables
      2394 |       378 |              20 |        1028
```

Database size moved with it: 112,498,367 → 179,500,735 → 177,501,887 bytes across the same
window. `index-size-vs-buffers` moved 30.1% → 77.5% over the same period.

### What that means for PRD-C167

The number the capacity model reports is **dominated by unrelated concurrent activity on a
laptop**, not by tenant workload. A headroom figure derived from it is not a property of the
system under load; it is a property of what else happened to be running on this machine in
the preceding sixty seconds. Reporting "45.5% of ceiling, therefore 54.5% headroom, therefore
C167 satisfied" from the 16:40 reading would be picking the friendliest of three readings and
calling it capacity. Every reading is recorded above precisely so that cannot be done.

**No re-run was performed in order to obtain a passing number.** The `cell:capacity` run that
mutated state exited **1** and that exit code stands. The second `--json` reading was taken
with the side-effect-free code path specifically to measure the variance, and it is reported
alongside, not instead of, the failing one.

---

## The capacity model: every input and every assumption

`cell:capacity` measures five budgets from `src/scripts/cell-capacity-budgets.mjs`. Values
below are from the 16:37:27Z run (`c167-rerun-cell-capacity.txt`).

| Budget | Used | Limit | % | Ceiling source | Gates admission? |
| --- | --- | --- | --- | --- | --- |
| `connections` | 29 | 100 | 29.0% | **measured** (`current_setting('max_connections')`) | yes |
| `database-size` | 179,500,735 B | 3,221,225,472 B | 5.6% | **vendor-declared** | yes |
| `table-bloat` | 0.8956 | 0.30 | **298.5%** | **operational-judgment** | yes |
| `index-size-vs-buffers` | 104,046,592 B | 134,217,728 B | 77.5% | measured (`shared_buffers`) | **no — advisory** |
| `outbox-queue-depth` | 0 | 10,000 | 0.0% | **operational-judgment** | yes |

Assumptions that a reader must not skip:

1. **`ADMISSION_THRESHOLD = 0.6`.** The 40% headroom of PRD-C167 is encoded as "the limiting
   resource must sit below 60% of its ceiling." That is the *only* sense in which this script
   speaks to C167.
2. **Two of the three ceilings that can gate admission are not measurements of anything.**
   `table-bloat` at 0.30 and `outbox-queue-depth` at 10,000 are declared
   `operational-judgment` by the source file itself, which says of the queue depth: *"no
   external reference establishes it."* `database-size` at 3 GiB is `vendor-declared` and its
   note reads *"Default 3 GiB = Neon Free plan"* — the free tier, not any tier this product
   would run on. So the limiting resource is being compared against a number a developer
   chose, and the storage ceiling is 3 GiB against a real cell's terabytes.
3. **`max_connections = 100` is this laptop's Homebrew Postgres default**, and 29 of those
   backends are other agents' psql sessions across 4 different databases — not application
   pool connections. The connections budget is measuring the machine, not a pool.
4. **`shared_buffers = 16384 × 8 kB = 128 MiB`** is likewise the Homebrew default. The
   advisory index-vs-buffers ratio therefore compares a real index footprint against a
   laptop's cache, which is exactly why the source declares it non-gating.
5. **The saturation forecast could not run.** All five resources returned
   `REFUSED — 1 well-spaced sample(s) of 2 total; need 3 samples each ≥1d apart`. RB-07's own
   pass threshold requires *"at least 7 daily snapshots"*. There are 2 samples 16 minutes
   apart, and the script correctly flagged the second `tooCloseToPrevious`. There is no trend,
   therefore no forecast, therefore no time-to-saturation.

### `per_org_cost` in the recorded row is an artefact, not a cost

`cell_capacity_measurements` now holds `per_org_cost = 0.30` for both rows. That is not
0.30 of anything meaningful. `measurePerOrgCost()` counts
`organization_placement WHERE status='ACTIVE'`, and when the count is zero it returns
`limiting.limit` — the *ceiling* — as the per-org figure. At the time of the earlier run
there were 0 active placements, so the column stores the bloat ceiling, in units of
"dead-row fraction". Anyone reading that column as a cost per organisation would be reading
a fallback constant.

---

## PRD-C172 — per-cell and active-tenant cost: MEASURED AND REFUSED

`cell:unit-cost` exited 0, but exit 0 here means *"the script ran and correctly declined to
produce numbers."* This is what it produced (`c172-rerun-cell-unit-cost.txt`):

| Unit | Quantity | Dollar cost |
| --- | --- | --- |
| per active organization | **0** | not derivable |
| per active user | 2 | not derivable |
| per 1,000 requests | UNMEASURED — needs `.load-driver-results.json` | — |
| per 1,000 realtime minutes | UNMEASURED — needs `ABLY_API_KEY` | — |
| per GB stored | 0.167 | not derivable |
| per million indexed chunks | 0 | not derivable |
| per million outbox events | 0 | not derivable |
| per notification delivered | 0 | not derivable |
| per AI token | 0 tokens · 0 credits · $0.0000 | — |

Every derived figure refused itself:

```
Monthly cost + saturation forecast:
  REFUSED — only 0 active org(s); cell may be empty; forecast would be misleading

AI cost anomaly check:
  REFUSED — only 0 org(s) with AI usage; need at least 3 for anomaly detection

Cost-per-unit trends:
  AI cost/token: REFUSED — 1 well-spaced sample(s) of 2 total; need 3 each ≥1d apart

Vendor cost data:
  Neon:   REFUSED — Set NEON_API_KEY and NEON_PROJECT_ID
  Ably:   REFUSED — Set ABLY_API_KEY
  Resend: REFUSED — Set RESEND_API_KEY
  R2:     REFUSED — Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID
```

The guard's refusal note — *"a cheap empty cell is not a finding"* — is the correct verdict.
There is **no cost per active organization**, because there are no active organizations. The
denominator is zero. This is not a number that needs a caveat; it is the absence of a number.

Per-org DB and cache attribution was also `SKIPPED — APP_LOG_FILE not set`. The script names
the correct source for it (spans carrying `org.id` from `ObservabilityContext`), and notes
that `pg_stat_statements` and `pg_stat_database` cannot attribute per org because they are
per-database. Producing this needs a running application serving real tenant traffic.

---

## What this run does and does not establish

**Established (A — runnable here, and run):**

- The capacity guard can detect a breach and does: `cell:capacity:self-test` exit 0.
- The capacity model is internally correct: 30/30 assertions, including that an advisory
  resource can never become the limiting one and that saturation forecasting refuses fewer
  than three well-spaced samples.
- The unit-cost anomaly detector fires on a 500-cost outlier: exit 0.
- The unit-cost model is internally correct: 31/31 assertions.
- Both scripts, pointed at a real 944-table database, connect, execute every query, and
  report honestly — including exiting **1** when the limiting resource is over threshold.
- Every derived cost and every saturation forecast **refuses** rather than estimating.

**Not established — and not claimable from this machine:**

- **PRD-C167 is not met.** The one run that gated exited 1 with the cell CLOSED. The one
  reading that would have passed came from a metric that moved 6.6× on its own in 19 minutes
  with no traffic. Neither is a proof of 40% headroom under load. Two of the three
  admission-gating ceilings are developer judgment; the third is a free-tier storage figure.
- **PRD-C172 is not met.** Zero active organizations, zero tokens, zero events, zero
  notifications, and no per-cell vendor billing account. Cost per active org, per member, per
  message and per job are all undefined here.
- RB-07's own pass threshold requires 7 daily snapshots and an operator-approved saturation
  forecast. There are 2 samples 16 minutes apart and no forecast.

**Classification: (B) needs a deployed environment**, for both C167 and C172 — specifically a
provisioned cell with its own Neon project, Ably app, Resend domain and R2 bucket, carrying
real tenant workload, with `cell:cost:record` and `cell:capacity:record` on a daily schedule
for at least a week. **Plus (C) a named human signature**: RB-07 requires *"Saturation
forecast is approved by the operator."* No such person has reviewed anything here, and this
agent must not sign for one.

---

## The evidence gate was left red, and verified red

Nothing written for this work item is a `.json` manifest, so nothing here can be picked up as
a captured bundle. Confirmed by running the gate after writing these files:

```
$ npm run --silent ops:evidence:check          # exit 1
Error: PRODUCTION OPS EVIDENCE GATE FAILED
- missing passing deployed evidence for RB-05
- missing passing deployed evidence for RB-07
```

Full output in `c166-c172-ops-evidence-check-still-red.txt`. That failure is the correct
current state for both C166 and C172 and must not be waived.

The pre-flight index behaved correctly on the one synthetic artifact produced for this work
item: `manifest-readiness.mjs` marks
`../RB-05-production-load/c166-cell-load-vacuity-guard-probe.txt` and its input file
`REFUSED: self-test/dry-run/mock/fixture/fake/simulation wording`, so the guard probe cannot be
promoted into a deployed bundle.

### Incidental finding: the forbidden-wording check misses npm-alias self-tests

Both `manifest-readiness.mjs:38` and the real gate
`streamlineos-backend/src/scripts/production-ops-evidence.mjs:60` use the identical pattern:

```js
const FORBIDDEN = /(?:--self-test|--dry-run|\bmock\b|\bfixture\b|\bfake\b|\bsimulat(?:e|ed|ion)\b)/i;
```

It matches the **flag** form `--self-test` but not the **npm-alias** form `:self-test`. Verified
against the real capture files in this directory:

| Text | Result |
| --- | --- |
| `node src/scripts/run-cell-capacity.mjs --self-test` | CAUGHT |
| `npm run --silent cell:capacity:self-test` | **MISSED** |
| `c167-rerun-cell-capacity-self-test.txt` (whole file) | **MISSED** |
| `c166-rerun-cell-load-self-test.txt` (whole file) | **MISSED** |

So a self-test transcript captured through its npm alias passes the wording check at
`production-ops-evidence.mjs:155`, and an `execution.command` of
`npm run cell:capacity:self-test` passes the check at line 136. The gate's own self-test at
line 237 uses the flag form (`pnpm cell:isolation --self-test`), so it does not surface this.

This is defence-in-depth only, not an open door: such a bundle would still fail on
`environment.target must be a non-local https endpoint`, `dataset.activeOrganizations must be
positive`, and `named operator is required`. It is recorded here because the wording check is
the specific defence against passing a self-test off as a deployed run, and it should also
match `:self-test` / `:dry-run`. Not fixed here — this work item's write scope is the evidence
directories only.
