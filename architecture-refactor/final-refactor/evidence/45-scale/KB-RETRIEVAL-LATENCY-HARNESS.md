# KB retrieval latency harness — wiring, runbook, and first measured run

**This is a local scratch-database measurement, not deployed evidence.** It is `.md`, not
`.json`, so `ops:evidence:check` and `manifest-readiness.mjs` will not mistake it for a
captured manifest. It sits beside its own artifact,
[`kb-retrieval-latency-2026-09-09.json`](./kb-retrieval-latency-2026-09-09.json), because
`45-scale/` is where this repository already keeps scale measurement evidence.

Until now the harness under `backend/test/perf/ai/` was **orphaned**: no CI workflow, no
package script, no documentation and no spec referenced it, and its only invocation path was a
command hand-typed out of its own header comment. No output artifact had ever been committed,
so there was not even a stale number to regress against. This file closes that, and records
the first real run.

---

## 1. What was wired

Two entries added to `backend/package.json`, following the file's existing `seed:*` /
`measure:*` convention (`measure:cache-hit` → `measure-cache-hit-latency.mjs`):

| Script | Command |
| --- | --- |
| `seed:kb-retrieval-corpus` | `node test/perf/ai/seed-kb-retrieval-corpus.mjs` |
| `measure:kb-retrieval` | `node test/perf/ai/measure-kb-retrieval-latency.mjs` |

Neither entry loads `.env`. That is deliberate: both scripts require their own `PERF_*`
variables and refuse any URL that does not name a `scratch_*` database, and folding `.env` in
would put the configured `DATABASE_URL` one typo away from a benchmark that bulk-loads 49,000
rows and rebuilds an index.

## 2. Required environment

**Two URLs are required, and they are not interchangeable.**

| Variable | Role | Used by |
| --- | --- | --- |
| `PERF_DATABASE_URL` | privileged owner (`neondb_owner`) — creates tenants, bulk-loads, drops and rebuilds the HNSW index, `VACUUM ANALYZE`, reads the probe-vector pool | seeder **and** measurement |
| `PERF_APP_DATABASE_URL` | application role (`streamline_app`) — every timed query | measurement only |

Why both: `backend/CLAUDE.md` §3 requires benchmarks to run as `streamline_app` with the
tenant GUC set. The owner has `BYPASSRLS`, so its plans omit the
`org_id = app.current_org_id()` qual that is the entire subject of this benchmark. The
measurement enforces this rather than trusting it — `assertAppRoleIsNotPrivileged()` refuses to
run if `PERF_APP_DATABASE_URL` resolves to a role with `rolbypassrls` or `rolsuper`, and
`assertRlsBites()` proves the GUC really gates the table by requiring a `42501` when it is
absent. Both guards passed in the run below.

Both URLs must match `/\/scratch_/` or the scripts exit 2.

## 3. Runbook

```bash
# 1. A scratch database carrying the full migrated schema (vector extension, RLS on
#    kb_article_chunks, idx_kb_chunks_embedding_hnsw, app.search_kb_chunk_ids).
#    Cheapest route when a migrated scratch DB already exists:
#      CREATE DATABASE scratch_ai_latency TEMPLATE scratch_local;
#    (requires no other session connected to the template)

export PERF_DATABASE_URL="postgresql://neondb_owner@127.0.0.1:5432/scratch_ai_latency?sslmode=disable"
export PERF_APP_DATABASE_URL="postgresql://streamline_app:<pw>@127.0.0.1:5432/scratch_ai_latency?sslmode=disable"

# 2. Seed. Loads 49,000 chunks across four deliberately unequal tenants, asserts the corpus
#    is not degenerate (49,000 distinct embeddings), rebuilds HNSW once, then VACUUM ANALYZE.
pnpm -C backend seed:kb-retrieval-corpus

# 3. Measure. --runs is floored at 100 so the p99 names a real observation.
pnpm -C backend measure:kb-retrieval -- --runs=100 \
  --json=architecture-refactor/final-refactor/evidence/45-scale/kb-retrieval-latency-<date>.json
```

`VACUUM ANALYZE` is **inside the seeder** (`seed-kb-retrieval-corpus.mjs:178-180`), immediately
after the HNSW rebuild. No separate step is needed; if you load rows by any other route, run it
yourself before measuring.

### One preparation step this run took that the seeder does not do

The seeder deletes only `org_id LIKE 'perf_kb_%'`. The template database already held **13,420
embedded chunks from an unrelated seed**, and the measurement computes each tenant's "share"
over `perf_kb_%` rows only — so those rows would have diluted the HNSW index by 21.5% while
being reported nowhere. They were deleted from the scratch copy before seeding
(`DELETE FROM public.kb_article_chunks WHERE org_id NOT LIKE 'perf_kb_%'` — 13,420 rows) so the
measured shares are the declared ones. Anyone reproducing this must do the same or state the
contamination.

---

## 4. Run identity

| Field | Value |
| --- | --- |
| Operator | unattested — executed by an automated agent. No named human operator. |
| Date | 2026-09-09, local (IST) |
| Host | Windows 11, 33.7 GB RAM, Node v24.15.0 |
| Database | **local** `scratch_ai_latency`, PostgreSQL **18.6** (msvc), created `TEMPLATE scratch_local` |
| PG settings | `shared_buffers` 3 GB · `work_mem` 32 MB · `maintenance_work_mem` 1 GB · `statement_timeout` 0 |
| Extensions | `vector`, `pg_trgm`, `btree_gist`, `pgcrypto`, `uuid-ossp` |
| RLS | `kb_article_chunks` `relrowsecurity = true`, policy `tenant_isolation` = `(org_id = current_org_id())` |
| Measured as | `streamline_app` — `rolsuper = false`, `rolbypassrls = false` (asserted by the script) |
| Backend SHA | HEAD at session start was `29344f56c`; **working tree was dirty and this task ran no git command**, so the SHA is not re-verified and must not be treated as the measured tree. |

Not a Neon branch, not a deployed cell, no application server running. Nothing here is a
production number.

## 5. Commands run, with real exit codes

| Command | Exit | Headline |
| --- | --- | --- |
| `pnpm -C backend seed:kb-retrieval-corpus` | **0** | 49,000 chunks, **49,000 distinct embeddings**, HNSW rebuild 48.2s, VACUUM ANALYZE 0.5s |
| `node test/perf/ai/measure-kb-retrieval-latency.mjs --runs=100 --json=…` | **0** | 1,648 queries, 32.0s wall; artifact written |
| `node -e "require('./package.json')"` | **0** | package.json still parses after the script additions |

Seeder output, verbatim:

```text
Seeding 49,000 chunks into scratch_ai_latency
  tenants — 0.1s
  vector pools (1536 topics × 4093 jitters) — 10.5s
  perf_kb_major: 40,000 chunks — 5.6s
  perf_kb_mid: 8,000 chunks — 1.5s
  perf_kb_minor: 800 chunks — 0.1s
  perf_kb_tiny: 200 chunks — 0.0s

Distinct embeddings: 49,000 of 49,000 rows
  HNSW rebuild — 48.2s
  VACUUM ANALYZE — 0.5s

Corpus:
  perf_kb_major      40000  81.6%
  perf_kb_mid         8000  16.3%
  perf_kb_minor        800  1.6%
  perf_kb_tiny         200  0.4%
  TOTAL              49000
```

## 6. Results — the harness's four scenarios

100 timed samples per cell after 3 discarded warm-ups. `buffers` is the median of
shared hit + shared read over the whole plan. Full data in the JSON artifact, including p95
buffers.

### `ann.cap24` — kb-rag public-ask pool (`SEARCH_POOL_K = DEFAULT_TOP_K * 4 = 24`, verified in `modules/ai/core/services/kb-rag-retrieval.service.ts:20-21`)

| org | share | p50 ms | p95 ms | p99 ms | buffers | rows | plan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| perf_kb_major | 81.6% | 2.00 | 3.95 | 5.49 | 2,136 | 24 | Limit > Index Scan(hnsw) |
| perf_kb_mid | 16.3% | 11.02 | 15.75 | 18.01 | 10,108 | 24 | Limit > Index Scan(hnsw) |
| **perf_kb_minor** | **1.6%** | **4.47** | **7.27** | **8.78** | **9,672** | **24** | Limit > Sort > Index Scan(`idx_kb_chunks_org_source`) |
| perf_kb_tiny | 0.4% | 1.22 | 1.98 | 2.29 | 2,427 | 24 | Limit > Sort > Index Scan(`idx_kb_chunks_org_source`) |

### `ann.cap120` — kb search at limit 10 (`pool = max(limit*3, limit) = 30`, `cap = pool*4 = 120`, verified in `kb-search.service.ts:213` / `kb-candidate.service.ts:99`)

| org | share | p50 ms | p95 ms | p99 ms | buffers | rows | plan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| perf_kb_major | 81.6% | 7.85 | 11.52 | 13.97 | 8,958 | 120 | Limit > Index Scan(hnsw) |
| perf_kb_mid | 16.3% | **63.85** | **101.28** | **146.57** | **96,678** | 120 | Limit > Sort > Index Scan(`idx_kb_chunks_org_source`) |
| **perf_kb_minor** | **1.6%** | **7.29** | **9.42** | **11.99** | **9,672** | **120** | Limit > Sort > Index Scan(`idx_kb_chunks_org_source`) |
| perf_kb_tiny | 0.4% | 1.65 | 2.24 | 2.69 | 2,427 | 120 | Limit > Sort > Index Scan(`idx_kb_chunks_org_source`) |

### `ann.cap120.noiter` — same, `hnsw.iterative_scan = off`

| org | share | p50 ms | p95 ms | p99 ms | buffers | rows | plan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| perf_kb_major | 81.6% | 2.19 | 3.21 | 3.68 | 2,246 | **34 of 120** | Limit > Index Scan(hnsw) |
| perf_kb_mid | 16.3% | 69.56 | 101.06 | 144.74 | 96,678 | 120 | Limit > Sort > Index Scan(`idx_kb_chunks_org_source`) |
| perf_kb_minor | 1.6% | 6.88 | 8.59 | 9.42 | 9,672 | 120 | Limit > Sort > Index Scan(`idx_kb_chunks_org_source`) |
| perf_kb_tiny | 0.4% | 1.81 | 2.52 | 2.93 | 2,427 | 120 | Limit > Sort > Index Scan(`idx_kb_chunks_org_source`) |

### `fence.cap120` — `app.search_kb_chunk_ids(vector, 120)`

| org | share | p50 ms | p95 ms | p99 ms | buffers | rows | plan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| perf_kb_major | 81.6% | 10.70 | 13.65 | 14.98 | 4,481 | 120 | ProjectSet > Result |
| perf_kb_mid | 16.3% | 65.02 | 73.05 | **77.26** | **32,228** | 120 | ProjectSet > Result |
| perf_kb_minor | 1.6% | 7.45 | 8.71 | 9.10 | 3,226 | 120 | ProjectSet > Result |
| perf_kb_tiny | 0.4% | 2.22 | 2.89 | 3.11 | 811 | 120 | ProjectSet > Result |

Aggregate, reported once over the whole run and never per call: 1,648 queries, 32.0s wall,
2,124 ms client CPU.

### The headline the table gives up

**The minority tenant is not the victim. The mid tenant is.** `perf_kb_mid` at cap 120 is the
worst cell in the matrix on every axis — 96,678 buffers, p50 63.85 ms, p99 146.57 ms — and it
is 10× the minority tenant's size. The reason is visible in the `plan` column: the planner
takes HNSW for the majority tenant and abandons it for an exact `(org_id, source_id)` index
scan plus top-N sort once a tenant is small enough, and the crossover lands between the
majority and the mid tenant. Below the crossover the cost is linear in the tenant's own chunk
count against a TOASTed 1536-dimension column (`attstorage = 'e'`, 793 MB of TOAST against an
11 MB heap), which is ~12 buffers per chunk.

So the corpus was built to expose an ANN post-filter penalty on a 1.6% tenant, and what it
actually exposed is a **planner crossover that turns vector search into a linear TOAST scan for
every tenant below it**. That is a real finding, and it is not the one the corpus was designed
for.

---

## 7. Supplementary probes — run once, not part of the committed harness

Three things the four committed scenarios cannot answer were probed directly against the same
seeded database, as `streamline_app` with the GUC set. **These were one-off `node -e`
invocations; no script was committed for them, so they were not reproducible by name.** They are
reported because the deferred decision in §8 cannot be answered without them.

> **SUPERSEDED 2026-09-09 (same day, later session).** §7a and §7c are now measured by a
> committed harness — `backend/test/perf/ai/measure-kb-retrieval-recall.mjs`, runnable as
> `pnpm -C backend measure:kb-retrieval-recall` — over **100 probe vectors** instead of 12, with
> an `hnsw.ef_search` sweep and a plan-choice matrix. Read
> [`KB-RETRIEVAL-RECALL-FLOOR.md`](./KB-RETRIEVAL-RECALL-FLOOR.md) for the current numbers and
> the recall floor; the tables below are kept as the historical record of the probe that raised
> the finding. The larger sample moved several figures (e.g. `perf_kb_mid` at cap 24 measured
> 43.21% mean over 100 vectors against 43.75% over 12), and it contradicts one framing below:
> §7c's "the minority tenant is *protected*" holds only because the **planner** chose exact for
> it. When HNSW is priced at that size directly, the 800-chunk tenant scores 44.73–86.87% and
> costs 5.4–8.8× more buffers than exact — ANN is worse for small tenants on both axes, not
> better.

### 7a. The harness's `ann.*` SQL is not the production query

`measure-kb-retrieval-latency.mjs:69,75,81` issues
`SELECT id FROM public.kb_article_chunks ORDER BY embedding <=> $1 LIMIT n`, relying on RLS
alone for the tenant qual. Production `KbCandidateService.vectorChunkIds`
(`kb-candidate.service.ts:29-34`) issues the same query **with an explicit
`WHERE org_id = $orgId`** on top of RLS. Migration `0717`'s own notes say an explicit `org_id`
predicate changes the plan, so this is not a cosmetic difference and the harness's header claim
that it runs `vectorChunkIds` "verbatim" is inaccurate.

Production shape, 30 timed samples per cell, `hnsw.iterative_scan = relaxed_order` (production
sets this at `kb-candidate.service.ts:28`):

| org | cap | p50 ms | median buffers | min rows | short of cap | plan |
| --- | --- | --- | --- | --- | --- | --- |
| perf_kb_major | 24 | 3.57 | 3,108 | 24 | 0/30 | Limit > Result > IdxScan(hnsw) |
| perf_kb_mid | 24 | 15.40 | 14,994 | 24 | 0/30 | Limit > Result > IdxScan(hnsw) |
| perf_kb_minor | 24 | 8.70 | 9,696 | 24 | 0/30 | Limit > Sort > Result > IdxScan(org_source) |
| perf_kb_tiny | 24 | 2.36 | 2,436 | 24 | 0/30 | Limit > Sort > Result > IdxScan(org_source) |
| perf_kb_major | 120 | 13.91 | 12,957 | 120 | 0/30 | Limit > Result > IdxScan(hnsw) |
| perf_kb_mid | 120 | 99.58 | 96,904 | 120 | 0/30 | Limit > Sort > Result > IdxScan(org_source) |
| perf_kb_minor | 120 | 8.90 | 9,696 | 120 | 0/30 | Limit > Sort > Result > IdxScan(org_source) |
| perf_kb_tiny | 120 | 2.31 | 2,436 | 120 | 0/30 | Limit > Sort > Result > IdxScan(org_source) |

**Zero under-retrieval in 240 samples.** The explicit predicate does not change the qualitative
picture; it costs the majority tenant somewhat more (12,957 vs 8,958 buffers at cap 120).

### 7b. `app.search_kb_chunk_ids` is no longer the fenced body the decision was framed around

The deferred question was framed against migration `0703`, which defines the function with a
`WITH … AS MATERIALIZED` CTE that forbids pushing `ORDER BY` into HNSW — an exact scan. **That
body is three migrations stale.** `0714` rewrote it in PL/pgSQL, `0717` restored `0703`, and
**`1000_s08_plan_measured_indexes_and_kb_ann.sql` removed the CTE**, on the measured grounds
that it was ~3.0 buffers per chunk with no index at every tenant size. The live body in the
database is:

```sql
SELECT c.id FROM public.kb_article_chunks c
WHERE c.org_id = app.current_org_id()
ORDER BY c.embedding <=> p_vec
LIMIT p_limit
```

confirmed by `pg_get_functiondef`. Migration `1000` also installs a `DO` block that raises if
the body ever contains `MATERIALIZED` again. So `fence.cap120` measures a SECURITY-DEFINER
wrapper around the *same query shape* as the ANN path, not an exact alternative to it.

Consequence, measured: with `hnsw.iterative_scan = off`, the fence returns **34 of 120 rows for
the majority tenant** — the identical under-retrieval the ANN path shows in
`ann.cap120.noiter`. The fence inherits the ANN failure mode because it now *is* the ANN path.

### 7c. Recall — the number that actually decides this, and the harness does not measure it

Recall of each path's id set against the exact top-k for the same tenant and vector (ground
truth computed as the owner with a `MATERIALIZED` CTE, which forbids HNSW). 12 probe vectors
per cell.

| org | cap | plan taken | mean recall | min recall | perfect probes |
| --- | --- | --- | --- | --- | --- |
| perf_kb_major | 24 | HNSW | 96.53% | 75.00% | 8/12 |
| perf_kb_mid | 24 | HNSW | **43.75%** | **37.50%** | 0/12 |
| perf_kb_minor | 24 | exact | 100.00% | 100.00% | 12/12 |
| perf_kb_tiny | 24 | exact | 100.00% | 100.00% | 12/12 |
| perf_kb_major | 120 | HNSW | **45.56%** | **40.00%** | 0/12 |
| perf_kb_mid | 120 | exact | 100.00% | 100.00% | 12/12 |
| perf_kb_minor | 120 | exact | 100.00% | 100.00% | 12/12 |
| perf_kb_tiny | 120 | exact | 100.00% | 100.00% | 12/12 |

The fence was measured the same way and produced **identical recall in all eight cells, to the
digit** — as §7b predicts, since it is now the same query shape.

Two conclusions follow, and both invert the premise the harness was built on.

1. **Recall tracks the plan, not the tenant's share.** Every cell where the planner chose the
   exact `(org_id, source_id)` scan has 100% recall; every cell where it chose HNSW loses
   between 3% and 56% of the true top-k. The minority tenant is *protected* by being small
   enough that the planner abandons HNSW. The majority and mid tenants are the ones losing
   authorized results.
2. **The production under-retrieval guard cannot see this.** `vectorChunkIds` detects a short
   pool by cardinality — `if (annIds.length >= cap) return annIds;`
   (`kb-candidate.service.ts:36`) — and falls back to an exact re-scan only when fewer than
   `cap` ids come back. In every recall-losing cell above, the ANN path returned **exactly
   `cap` rows**. The guard never fires. Recall is lost silently at full cardinality, which is
   the one failure shape the existing safety net is blind to.

---

## 8. The deferred vector-recall decision

**Question:** should KB retrieval switch its ANN pre-pass to the ACL-fenced
`app.search_kb_chunk_ids`?

**What the harness would need to show to justify the switch:**

1. That the current path loses authorized results — measured as **recall against exact top-k**,
   per tenant, not as a row count.
2. That the fence recovers them — the same recall metric, materially higher.
3. That the fence's cost is acceptable at the sizes the product actually has — buffers as
   `streamline_app` with the GUC, at the real caps (24 and 120), across tenant sizes.
4. That the fence keeps the five safety properties `backend/CLAUDE.md` §3 requires of a
   `SECURITY DEFINER` search function.

**What was produced, and what it says:**

- (1) **Yes, and worse than framed.** Recall falls to 43.75% mean / 37.50% min for the mid
  tenant at cap 24 and 45.56% / 40.00% for the majority tenant at cap 120. But the loss lands
  on the *large* tenants, not the minority one, and it happens at full row count, so the
  in-service short-pool guard never fires.
- (2) **No. The fence changes nothing.** Because migration `1000` removed the `MATERIALIZED`
  CTE, `app.search_kb_chunk_ids` is now the same query shape as the inline ANN pass, and its
  recall was identical in all eight measured cells. **Switching to the fence as it exists today
  would buy zero recall.** The premise of the deferral — that `0703` offers an exact
  alternative — is stale.
- (3) The fence is nonetheless **cheaper**: 32,228 vs 96,904 buffers for the mid tenant at cap
  120 (3.0×), 3,226 vs 9,696 for the minority (3.0×), 811 vs 2,436 for the tiny (3.0×), and a
  p99 of 77.26 ms against 146.57 ms. It costs the majority tenant latency (p50 10.70 vs
  7.85 ms). That is a genuine efficiency case, but it is not the recall case.
- (4) Not re-verified in this run beyond confirming `prosecdef`, the `current_org_id()` body,
  the `p_limit` argument and that `1000`'s property-assertion `DO` block is present.

**Therefore the decision cannot be taken on these numbers, and the shape of the open question
has changed.** It is no longer "ANN pre-pass vs fence"; both are the same pre-pass. The real
options are: raise `hnsw.ef_search` / rely harder on iterative scan; rebuild the HNSW graph with
higher `m`/`ef_construction`; add a partitioned or `org_id`-leading vector index so the tenant
qual is an index condition rather than a post-filter; or accept approximate recall explicitly
and change the in-service guard from a cardinality check to something that can actually observe
it. Recommending among those needs a further measurement this harness does not perform.

> **The first of those options is now measured.** `KB-RETRIEVAL-RECALL-FLOOR.md` §9 sweeps
> `hnsw.ef_search` over 40 / 100 / 200 / 400 / 1000 at both caps and all four tenant sizes: it
> clears a 0.95 mean-recall floor at cap 24 (ef ≥ 100) and **cannot** clear it at cap 120 at any
> legal value, topping out at 88.18% at pgvector's maximum of 1000. Raising `ef_search` is
> therefore a partial answer, and the remaining options — a higher-`m` rebuild, or an
> `org_id`-leading / partitioned vector index — are still unmeasured.

**No production retrieval code was changed by this task.**

---

## 9. What this does not claim

- Not deployed evidence. A local Windows PostgreSQL 18.6 on a laptop, not Neon, not a cell.
- **The recall and production-shape numbers in §7 came from one-off `node -e` probes.** No
  script was committed for them at the time. **Closed later the same day:**
  `pnpm -C backend measure:kb-retrieval-recall` now reproduces them by name at 100 probe
  vectors, and [`KB-RETRIEVAL-RECALL-FLOOR.md`](./KB-RETRIEVAL-RECALL-FLOOR.md) supersedes §7a
  and §7c. The §6 table remains reproducible via `pnpm -C backend measure:kb-retrieval`.
- **Run-to-run variance on this host is large and the §6 latencies should be read as one
  observation, not a budget.** A second full run of the identical command (used to confirm that
  `pnpm … -- --runs= --json=` forwards its arguments) took 49.7s wall against 32.0s, and its
  `fence.cap120` row for `perf_kb_mid` read p50 98.57 / p95 145.54 / p99 167.51 ms against
  65.02 / 73.05 / 77.26 ms in the recorded run — a 1.5× swing on a quiescent-looking laptop.
  **The buffer counts did not move at all** between the two runs (4,481 / 32,228 / 3,226 / 811,
  identical), which is exactly why `backend/CLAUDE.md` §7 says to measure in buffers. Treat the
  buffer columns as the finding and the millisecond columns as colour.
- 12 probe vectors per recall cell is a small sample. The effect sizes are large (44% vs 100%)
  and the minimum equals the mean's neighbourhood in every cell, but a tighter bound would need
  more vectors.
- The corpus is synthetic: `topic + jitter` vectors with one dominant coordinate, not real
  embeddings. Real KB embeddings from `text-embedding-3-small` have a different neighbourhood
  structure, and HNSW recall is sensitive to exactly that. The absolute recall percentages
  should not be quoted as the product's recall.
- Lint and tests were **not run**. Typecheck was not run — this task changed only two
  `package.json` script strings and one new markdown file, neither of which `tsc` reads.
- No git command was run, so no SHA is attested and nothing was committed by this task.
