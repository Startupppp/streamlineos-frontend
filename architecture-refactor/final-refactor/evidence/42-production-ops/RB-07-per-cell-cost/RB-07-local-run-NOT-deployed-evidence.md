# RB-07 — per-cell cost and capacity: LOCAL RUN, NOT DEPLOYED EVIDENCE

**This file is not a captured evidence bundle and must never be treated as one.**
It records what the capacity and unit-cost scripts actually computed against an
essentially unpopulated local database, together with every input and assumption that fed
those numbers, so that nobody mistakes a model output for a measurement.
It is deliberately written as `.md`, not `.json`, so that
`pnpm -C backend ops:evidence:check` does not pick it up as a manifest. That gate must keep
reporting `missing passing deployed evidence for RB-07`, and after this file it still does.

Ticket: `34-production-ops-alerts-cost` — work item `34-capacity-cost`
Criteria addressed: PRD-C172 (and the capacity-model half of PRD-C167)
Runbook: `architecture-refactor/runbooks/RB-07-per-cell-cost.md` (its own status line reads
`OPEN — operator-blocked`)

---

## Run identity

| Field | Value |
| --- | --- |
| Operator | unattested — executed by an automated agent, no named human operator |
| Date (UTC) | 2026-09-03, 16:20:31Z – 16:21:47Z |
| Backend branch / SHA | `release/code-10-10-v2` / `138709f35befcd558c86ab04f65edf8344f6a545` |
| Frontend branch / SHA | `release/code-10-10-v2` / `7469d27895add587f9427e7c50c457f56e0048bf` |
| Host | macOS 26.6.2, aarch64, 15 cores, 24 GB RAM, Node v25.9.0 |
| Database | LOCAL `scratch_head_1010`, PostgreSQL 18.4 (Homebrew), 944 public tables, REACHED_HEAD 677/677 |
| `CELL_ID` | `local-scratch-1010` (a label on a laptop database, not a provisioned cell) |
| Cell topology | none — no pooler, no per-cell cache, no per-cell queue, no per-cell object store, no replica |

Same exported env as `../RB-05-production-load/RB-05-local-run-NOT-deployed-evidence.md`;
`PGSSLMODE=disable` proves the connections were local, since the remote Neon endpoint requires
`sslmode=require`.

---

## Commands run, with real exit codes

| Command | Exit | Headline | Raw output |
| --- | --- | --- | --- |
| `npm run cell:capacity:verify` | 0 | 30/30 unit assertions pass | `cell-capacity-verify.txt` |
| `npm run cell:unit-cost:verify` | 0 | 31/31 unit assertions pass | `cell-unit-cost-verify.txt` |
| `npm run cell:capacity:self-test` | 0 | `SELF-TEST PASS: breach detected — guard can fail` | `cell-capacity-self-test.txt` |
| `npm run cell:unit-cost:self-test` | 0 | `SELF-TEST PASS: anomaly detector fired on 500-cost outlier — guard can fail` | `cell-unit-cost-self-test.txt` |
| `npm run cell:capacity` | 0 | limiting resource `table-bloat` at 53.1%; cell OPEN | `cell-capacity.txt` |
| `npm run cell:capacity:json` | 0 | `[{"cellId":"local-scratch-1010","limitingResource":"table-bloat","used":0.15899…,"limit":0.3,"measuredAt":1788452461234}]` | `cell-capacity-json.txt` |
| `npm run cell:unit-cost` | 0 | snapshot printed; every derived figure self-refused | `cell-unit-cost.txt` |

Two side effects, both intended by the scripts and both local:
`backend/.cell-capacity-history.json` and `backend/.cell-cost-history.json` were created (both
are already in `backend/.gitignore`), and one row was inserted into
`cell_capacity_measurements` in `scratch_head_1010` (`measurement_id=1`).

---

## The capacity model output, with every input

`cell:capacity` measured five budgets. This is what it printed:

```
OK    connections                      used=25 / limit=100 (25.0%)
OK    database-size                    used=112498367 / limit=3221225472 (3.5%)  [vendor-declared ceiling]
OK    table-bloat                      used=0.15916575192096596 / limit=0.3 (53.1%) [operational-judgment ceiling]
ADV   index-size-vs-buffers            used=40386560 / limit=134217728 (30.1%)
OK    outbox-queue-depth               used=0 / limit=10000 (0.0%) [operational-judgment ceiling]

Limiting resource: table-bloat (53.1%)
Admission threshold: 60% — cell is OPEN
```

### Where every number came from

| Budget | Usage source | Ceiling | Ceiling provenance | Gates admission? |
| --- | --- | --- | --- | --- |
| `connections` | `count(*) FROM pg_stat_activity WHERE state IS NOT NULL` | `current_setting('max_connections')` = **100** | measured — but measured on a **Homebrew dev Postgres**, not a cell pooler | yes |
| `database-size` | `pg_database_size(current_database())` = 112,498,367 B | **3,221,225,472 B (3 GiB)** | vendor-declared **default constant in code** = Neon Free plan; `CELL_STORAGE_LIMIT_BYTES` was **not set**, so the default applied | yes |
| `table-bloat` | `sum(n_dead_tup)/(sum(n_live_tup)+sum(n_dead_tup))` over `pg_stat_user_tables` | **0.30** | operational judgment; the code's own note says "No vendor declares it" | yes |
| `index-size-vs-buffers` | `sum(pg_indexes_size(...))` = 40,386,560 B | `shared_buffers` = **134,217,728 B (128 MiB)** | measured — the **laptop's** `shared_buffers` | **no** (advisory; the code refuses to gate on an unbounded ratio) |
| `outbox-queue-depth` | `count(*) FROM outbox_events WHERE delivery_state IN ('PENDING','IN_FLIGHT')` | **10,000** | operational judgment; the code's own note says "no external reference establishes it" | yes |

**None of the four admission-gating ceilings is the production cell's ceiling.** Two are
declared operational judgment by the code itself, one is a hard-coded Neon *Free-plan* default
that nobody has confirmed matches the intended plan, and the one "measured" ceiling is this
laptop's `max_connections=100`. A headroom percentage computed against those ceilings is a
statement about a MacBook, not about a cell.

### Why the limiting resource is an artefact of emptiness

`table-bloat` is limiting at 53.1% — 6.9 points from the 60% admission threshold. Probing
`pg_stat_user_tables` directly at the same moment explains it:

```
 live_tup | dead_tup | dead_fraction | user_tables | tables_with_live_rows | tables_with_dead_rows
      767 |      150 |      0.163577 |        1028 |                    16 |                    29
```

The "limiting resource of the cell" is a ratio whose denominator is **917 tuples across 1,028
tables**, of which only 16 tables contain any live row at all. The largest contributors are
`permissions` (39 live / 39 dead), `organizations` (2/13) and `organization_members` (3/11) —
migration and smoke-test churn. A single `VACUUM` would drive it to 0%; a handful of test
inserts and deletes moves it by whole percentage points. Between the `cell:capacity` sample
(16:21:00.754Z, per the row it wrote) and the `cell:capacity:json` sample (16:21:01.234Z) —
**480 milliseconds apart, with no workload at all** — it drifted from 0.1591658 to 0.1589912.
This dimension carries no capacity information at this scale.

`connections` at 25% is contaminated in a different way. A `pg_stat_activity` sample taken
seconds later showed 26 live backends of which **24 were attached to a different database
(`scratch_t30_browser`)** belonging to another agent running concurrently on this laptop, and
exactly **1** to `scratch_head_1010`. `pg_stat_activity` and `max_connections` are both
cluster-wide, so the budget is internally consistent — but on a shared development cluster it
measures the laptop, not the cell.

### The recorded per-organization cost is a fallback constant, not a measurement

The row written to `cell_capacity_measurements` reads:

```
cell_id           | local-scratch-1010
limiting_resource | table-bloat
used              | 0.15916575192096596
limit_value       | 0.3
per_org_cost      | 0.3
ceiling_source    | operational-judgment
```

`per_org_cost = 0.3` is not a cost. `measurePerOrgCost()` counts `organization_placement`
rows with `status='ACTIVE'`, finds **zero**, and returns `limiting.limit` — the ceiling itself —
as a divide-by-zero fallback. The printed line
`per-organization cost 0.30 dead-row fraction` is the 0.30 bloat ceiling wearing a cost label.
Admission reads this row, so on an empty cell admission is driven by a placeholder.

### Saturation forecast: refused by the script, correctly

All five dimensions reported:

```
REFUSED — 1 well-spaced sample(s) of 1 total; need 3 samples each ≥1d apart.
```

`forecastSaturation` requires three samples at least 24 h apart, excludes samples taken during
bulk load, and refuses a flat trend. **There is no saturation forecast.** RB-07's pass threshold
asks for "at least 7 daily snapshots"; there is 1. The earliest a second qualifying sample can
be taken is 2026-09-04 16:21 UTC.

---

## The unit-cost snapshot, with every input

`cell:unit-cost` printed nine units for `local-scratch-1010`:

| Unit | Quantity | Source | Note |
| --- | --- | --- | --- |
| per active organization | **0** | measured | `organizations JOIN subscriptions WHERE s.status='ACTIVE'`; 1 organization exists, 0 subscriptions, so 0 qualify |
| per active user | **1** | measured | `users WHERE deleted_at IS NULL` |
| per 1,000 requests | UNMEASURED | needs `.load-driver-results.json` | the load driver never ran — see RB-05 evidence |
| per 1,000 realtime minutes | UNMEASURED | needs Ably channel-minutes | see vendor note below |
| per GB stored | **0.105** | measured | `pg_database_size()/2^30` — 944 empty tables' schema, catalogue and index overhead |
| per million indexed chunks | **0** | measured | `kb_article_chunks` is empty |
| per million outbox events | **0** | measured | `outbox_events` is empty |
| per notification delivered | **0** | measured | `notifications` is empty |
| per AI token | **0 tokens · 0 credits · $0.0000** | ledger | `ai_usage_logs` is empty |

**Every unit denominator is zero or one.** No dollar figure per active org, per member, per
message or per job can be divided out of this, and the script does not pretend otherwise.

### What the script refused, in its own words

```
Cost-per-unit trends:      AI cost/token: REFUSED — 1 well-spaced sample(s) of 1 total; need 3 each ≥1d apart
Monthly cost + saturation: REFUSED — only 0 active org(s); cell may be empty; forecast would be misleading
AI cost anomaly check:     REFUSED — only 0 org(s) with AI usage; need at least 3 for anomaly detection
Per-org DB/cache:          SKIPPED — APP_LOG_FILE not set
Load driver:               .load-driver-results.json not found
Sampling status:           Total 1 · Well-spaced 1 of 3 needed · Trend ready NO
```

This is the correct behaviour and it is the most important line of evidence in this file: the
unit-cost script, run against an empty cell, declines to publish a cost. A cheap empty cell is
not a finding.

### Vendor cost inputs — three of four unavailable, one not attributable

| Vendor | Result | Meaning |
| --- | --- | --- |
| Neon | `REFUSED — Set NEON_API_KEY and NEON_PROJECT_ID` | compute-hours and storage-GiB-hours, the two largest cost drivers, are unavailable; no network call was made |
| Cloudflare R2 | `REFUSED — Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID` | object storage and Class-A/B operations unavailable; the S3-compat `R2_ACCESS_KEY_ID` present in `.env` cannot query billing analytics |
| Resend | `KEY PRESENT` | Resend exposes no billing API; a per-email dollar rate must come off an invoice by hand |
| Ably | `channel-minutes n/a · 52 messages` | **the only live vendor call made.** It used the `ABLY_API_KEY` already in `backend/.env` and returned account-wide month-to-date stats for the team's real Ably app. Those 52 messages were **not** produced by this local database and are **not attributable to this "cell"**. Channel-minutes came back `n/a`, so even the realtime-minutes denominator is missing. |

No dollar rate env var (`NEON_COMPUTE_RATE_USD_PER_HOUR`,
`NEON_STORAGE_RATE_USD_PER_GIB_MONTH`, `CLOUDFLARE_R2_*_RATE_*`) is set anywhere, so no cost
model exists to divide even if the quantities were real.

### Per-tenant attribution is available in principle and absent in fact

`reportPerOrgDbCache` skipped with `APP_LOG_FILE not set`. The mechanism is sound — every
`db.query.execute` and `cache.roundtrip` span carries `org.id` from `ObservabilityContext`, and
the script's own note correctly explains that `pg_stat_statements` and `pg_stat_database` are
per-database and therefore cannot attribute per org. But no application process was running,
so there are no spans. **Active-tenant cost, the second half of PRD-C172, has no measured input
at all.**

---

## What the passing self-tests do and do not establish

`cell:capacity:self-test` rewrites one budget's ceiling to `1` and confirms the resulting
over-threshold ratio is reported as a breach: the admission guard can close a cell.
`cell:unit-cost:self-test` feeds 19 orgs costing 10–12 units plus one costing 500 and confirms
the 2σ detector flags the outlier: the anomaly guard can fire.
`cell:capacity:verify` (30 assertions) and `cell:unit-cost:verify` (31 assertions) pin the
arithmetic — that `ADMISSION_THRESHOLD` is exactly 0.6, that a ratio *equal* to the threshold
closes rather than admits, that an advisory resource can never become the limiting resource
however high its ratio, that `forecastSaturation` refuses fewer than three well-spaced samples
and excludes bulk-load samples, and that unmeasured units cannot contribute a quantity.

These prove the instruments are honest and cannot be quietly satisfied. **They prove nothing
about capacity or cost**, and none of them touches a deployed cell.

---

## Honest classification

- **PRD-C172 — "Measure/approve per-cell and active-tenant cost using RB-07."**
  - *Measure* → **BLOCKED: needs a deployed environment.** The measurement path is complete and
    verified, and it ran end to end; it produced 0 active organizations, 0 messages, 0 jobs,
    0 AI tokens and no vendor consumption data. RB-07's preconditions name `CELL_DB_URL`,
    Neon/Upstash/Cloudflare billing API keys, a time-series store, and "at least one cell
    running with real or production-shaped workload". None exists here. It further requires
    "at least 7 daily snapshots"; there is 1, and the second cannot be taken before
    2026-09-04 16:21 UTC.
  - *Approve* → **BLOCKED: needs a named human signature.** RB-07's pass threshold says
    "Saturation forecast is **approved by the operator**". There is no saturation forecast to
    approve, and no agent may sign as the operator. An unsigned record is offered below.
- **PRD-C167 (capacity-model half)** → **BLOCKED: needs a deployed environment.** The 60%
  admission threshold *is* a 40%-headroom rule, and on this database the limiting resource sits
  at 53.1%, i.e. 46.9% headroom. **That figure must not be reported as satisfying C167.** It is
  a dead-row fraction over 917 tuples, measured against an operational-judgment ceiling, on a
  laptop, with a placeholder per-org cost, and it drifted on its own between two samples taken
  480 ms apart with zero workload. See `../RB-05-production-load/` for the SLO half.

---

## Unsigned decision record — for a named human to complete

Reproduced here rather than filed in `architecture-refactor/decisions/` so that no unsigned
record is mistaken for a signed one. **Every signature field is deliberately empty. An agent
must not fill them.**

```
DECISION: Per-cell and active-tenant unit cost, and saturation forecast (PRD-C172, RB-07)
STATUS:   NOT APPROVED — prerequisites unmet; nothing is presented for approval

Prerequisites still unmet at 2026-09-03T16:21Z:
  [ ] A provisioned cell with production-shaped workload (RB-07 precondition 1)
  [ ] CELL_DB_URL / CELL_REDIS_URL / CELL_R2_SPEND_API for the cell
  [ ] NEON_API_KEY + NEON_PROJECT_ID + NEON_COMPUTE_RATE_USD_PER_HOUR
        + NEON_STORAGE_RATE_USD_PER_GIB_MONTH + NEON_TRANSFER_RATE_USD_PER_GIB
  [ ] CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID + the three R2 rate variables
  [ ] A per-email rate transcribed from the Resend invoice
  [ ] ABLY_API_KEY scoped to the cell's own Ably app (the current key is account-wide)
  [ ] APP_LOG_FILE pointing at a running app's span log, for per-org DB/cache attribution
  [ ] cell:cost:record and cell:capacity:record scheduled daily; >= 7 snapshots accumulated
  [ ] A confirmed storage ceiling in CELL_STORAGE_LIMIT_BYTES (the 3 GiB Neon Free default
        currently in code is almost certainly not the intended plan)
  [ ] Named-operator review of the two operational-judgment ceilings: table-bloat 0.30
        and outbox-queue-depth 10,000

Figures to be approved once measured (all currently unmeasured):
  cost_per_active_org_usd     : ____________
  cost_per_active_member_usd  : ____________
  cost_per_message_usd        : ____________
  cost_per_job_usd            : ____________
  saturation_forecast_days    : ____________
  trend_7d_pct                : ____________

Operations sign-off   name: ______________  role: ______________  date: __________  sig: ______
Finance sign-off      name: ______________  role: ______________  date: __________  sig: ______
Accepted residual risk (if any): ____________________________________________________
```
