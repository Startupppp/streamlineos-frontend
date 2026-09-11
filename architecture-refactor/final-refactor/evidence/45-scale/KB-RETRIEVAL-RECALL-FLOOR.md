# KB retrieval recall — reproducible harness, plan-choice matrix, ef_search sweep, and the floor

**This is a local scratch-database measurement, not deployed evidence.** It is `.md`, not
`.json`, so `ops:evidence:check` and `manifest-readiness.mjs` will not mistake it for a
captured manifest. It sits beside its own artifact,
[`kb-retrieval-recall-2026-09-09.json`](./kb-retrieval-recall-2026-09-09.json), and beside the
latency run it completes,
[`KB-RETRIEVAL-LATENCY-HARNESS.md`](./KB-RETRIEVAL-LATENCY-HARNESS.md).

It closes a specific gap. The recall numbers that drove the whole KB retrieval finding — HNSW
losing 3–56% of the true top-k while returning exactly `cap` rows, so the in-service short-pool
guard never fires — came from **one-off `node -e` probes that were never committed**
(`KB-RETRIEVAL-LATENCY-HARNESS.md` §7c, §9). Only the latency/buffer table was reproducible by
name. Recall is now a first-class, named-runnable scenario, and this file records its first
real run.

---

## 1. What was wired

| Path | What it is |
| --- | --- |
| `backend/test/perf/ai/measure-kb-retrieval-recall.mjs` | **new** — the recall harness |
| `backend/test/perf/ai/kb-retrieval-probe.mjs` | **new** — connection guards, the rolled-back transaction helper, and the plan/buffer helpers, extracted so both harnesses obey the same rules from one copy |
| `backend/test/perf/ai/measure-kb-retrieval-latency.mjs` | **modified** — now imports those helpers instead of holding a private copy; **no scenario, SQL or sampling change**, so its §6 numbers stand |
| `backend/package.json` | one script entry: `measure:kb-retrieval-recall` |

```json
"measure:kb-retrieval-recall": "node test/perf/ai/measure-kb-retrieval-recall.mjs"
```

Like its two siblings it does **not** load `.env`: it requires its own `PERF_*` variables and
refuses any URL that does not name a `scratch_*` database.

### Why a second script rather than a `--recall` flag

The two harnesses answer different questions with different loop shapes. The latency harness
runs `EXPLAIN (ANALYZE, BUFFERS)` over four fixed scenarios and reports a distribution; this one
needs a ground-truth id set per (tenant, vector), a set intersection per sample, and a third
nested sweep dimension (`ef_search`) plus a fourth (planner-chosen vs forced ANN). Folding it in
would have taken `measure-kb-retrieval-latency.mjs` from 288 lines to roughly 550 — past the
500-line hard-review line in `CLAUDE.md` §7 — for two unrelated questions in one file. What they
genuinely share is now shared: `kb-retrieval-probe.mjs`, imported by both. The recall harness is
455 lines, inside the hard limit; roughly 40% of it is the rationale header this folder's files
carry by convention.

### The four things the harness enforces rather than assumes

1. **The ground truth provably does not use HNSW.** It is computed with `enable_indexscan`,
   `enable_indexonlyscan` and `enable_bitmapscan` off, and the plan is `EXPLAIN`ed and asserted
   to contain no `hnsw` node **before** any number is derived from it. An "exact" set that
   quietly came from the same approximate index would report 100% recall for a broken path. The
   asserted plan, identical for all four tenants, is
   `Incremental Sort > Subquery Scan > WindowAgg > Sort > Result > Nested Loop > Seq Scan > Materialize > Seq Scan`.
2. **The measured query is the production shape.** `vectorChunkIds`
   (`kb-candidate.service.ts:26-36`) sets `hnsw.iterative_scan = relaxed_order` and issues
   `... WHERE org_id = $1 ORDER BY embedding <=> $2::vector LIMIT $3` — an explicit tenant
   predicate **on top of** RLS, which changes the plan. The exact-cost rows use the exact
   re-scan production actually falls back to (`kb-candidate.service.ts:39-46`, the `OFFSET 0`
   fence), verbatim.
3. **The `ef_search` knob is read back, not trusted.** pgvector registers `hnsw.ef_search` only
   when its library loads into the backend; before that a `SET` lands on an unrecognised-prefix
   placeholder and `SHOW` raises. Every cell `SHOW`s the value inside its own transaction and
   throws rather than report a sweep point it could not prove was applied.
4. **A diluted index is refused, not silently averaged over.** The seeder deletes only
   `org_id LIKE 'perf_kb_%'` and the shares are computed over `perf_kb_%` only, so foreign rows
   dilute the HNSW graph while being reported nowhere — this is exactly what happened to the
   template database (13,420 chunks from an unrelated seed, 21.5% of the index). The recall
   harness now counts **all** `kb_article_chunks` rows and aborts if any sit outside
   `perf_kb_%`. See §3.

## 2. Required environment

Identical to the latency harness, and for the same reason (`backend/CLAUDE.md` §3, §7):

| Variable | Role |
| --- | --- |
| `PERF_DATABASE_URL` | privileged owner (`neondb_owner`) — reads `pg_settings`/`pg_index`, builds the probe-vector table |
| `PERF_APP_DATABASE_URL` | application role (`streamline_app`) — **every** measured query, inside a rolled-back transaction with `SET LOCAL app.organization_id` |

`assertAppRoleIsNotPrivileged()` refuses to run if the app URL resolves to a role with
`rolbypassrls` or `rolsuper`; `assertRlsBites()` requires a `42501` when the GUC is absent. Both
passed in the run below. Both URLs must match `/\/scratch_/` or the script exits 2.

## 3. Runbook

```bash
export PERF_DATABASE_URL="postgresql://neondb_owner@127.0.0.1:5432/scratch_ai_latency?sslmode=disable"
export PERF_APP_DATABASE_URL="postgresql://streamline_app:<pw>@127.0.0.1:5432/scratch_ai_latency?sslmode=disable"

# Seed only if the corpus is not already present. VACUUM ANALYZE is inside the seeder.
pnpm -C backend seed:kb-retrieval-corpus

# --vectors is floored at 100 so the p5 names a real observation.
pnpm -C backend measure:kb-retrieval-recall -- --vectors=100 \
  --json=architecture-refactor/final-refactor/evidence/45-scale/kb-retrieval-recall-<date>.json
```

### The corpus was reused, not reseeded — and it was checked first

`scratch_ai_latency` from the 2026-09-09 latency run was still present (1,795 MB), so it was
reused rather than reseeded (a reseed costs ~18 s of load plus a 48 s HNSW rebuild, and would
have produced a different graph). Before measuring, four things were verified directly:

| Check | Result |
| --- | --- |
| Row counts | `perf_kb_major` 40,000 · `perf_kb_mid` 8,000 · `perf_kb_minor` 800 · `perf_kb_tiny` 200 |
| **Foreign rows** | **none** — every `kb_article_chunks` row is `perf_kb_%`; the 13,420 contaminating chunks had already been deleted in the earlier session, and the harness now re-asserts this on every run and aborts if it fails |
| HNSW index | `idx_kb_chunks_embedding_hnsw … USING hnsw (embedding vector_cosine_ops)` present, default `m`/`ef_construction` |
| `VACUUM ANALYZE` | `last_vacuum`/`last_analyze` both `2026-09-09 13:31`, `n_dead_tup = 0`, `reltuples = 49000` |

No `VACUUM ANALYZE` was re-run because no rows were written; the harness only reads, inside
transactions that roll back.

---

## 4. Run identity

| Field | Value |
| --- | --- |
| Operator | unattested — executed by an automated agent. No named human operator. |
| Date | 2026-09-09, local (IST) |
| Host | Windows 11, 33.7 GB RAM, Node v24.15.0 |
| Database | **local** `scratch_ai_latency`, PostgreSQL **18.6** (msvc), pgvector **0.8.6** |
| PG settings | `shared_buffers` 3 GB (393,216 blocks) · `work_mem` 32 MB · `maintenance_work_mem` 1 GB |
| pgvector defaults | `hnsw.ef_search` 40 · `hnsw.iterative_scan` off (the harness sets `relaxed_order`, as production does) · `hnsw.max_scan_tuples` 20,000 · `hnsw.scan_mem_multiplier` 1 |
| RLS | `kb_article_chunks` `relrowsecurity = true`, policy `(org_id = current_org_id())` |
| Measured as | `streamline_app` — `rolsuper = false`, `rolbypassrls = false` (asserted by the script) |
| Probe vectors | 100, the first 100 by id from `perf_topic_pool` — a strict superset of the 12 used by the uncommitted §7c probes, so the two are directly comparable |
| Backend SHA | HEAD at session start was `29344f56c`; **the working tree was dirty and this task ran no git command**, so the SHA is not attested and must not be treated as the measured tree. |

Not a Neon branch, not a deployed cell, no application server running. Nothing here is a
production number.

## 5. Commands run, with real exit codes

| Command | Exit | Note |
| --- | --- | --- |
| `node test/perf/ai/measure-kb-retrieval-recall.mjs --vectors=100 --json=…` (planner mode only, first cut) | **0** | 100 vectors × 4 tenants × 2 caps × 5 ef |
| `node test/perf/ai/measure-kb-retrieval-recall.mjs --vectors=100 --json=…` (both modes) | **1** | died after the header with no stderr; not reproduced — see the caveat in §10 |
| `node test/perf/ai/measure-kb-retrieval-recall.mjs --vectors=100 --json=…` (both modes, rerun) | **0** | the recorded run; artifact written |
| `node --check` on all three `.mjs` files | **0** | |
| `node -e "require('./package.json')"` | **0** | package.json still parses after the script addition |

The planner-mode half of the recorded run **reproduced the first run's numbers exactly** — every
recall figure and every buffer count identical to the digit across all 40 planner cells. Recall
and buffers on this harness are deterministic; only the millisecond columns move.

Lint and tests were **not run**. `tsc` was not run: this task added two `.mjs` files, edited a
third, and added one `package.json` script string — none of which TypeScript reads. No
`backend/src/**` file was touched.

---

## 6. Exact search — ground truth and its cost

Ground truth is the exact top-120 per (tenant, probe vector), computed once per tenant in a
single cross-joined pass. Per-vector exact scans would have cost ~440 s for the majority tenant
alone; the shared pass costs 62.7 s for the identical answer, because a 1536-dimension `vector`
column is TOASTed and the shared scan pays the detoast once per row instead of once per row per
vector.

| tenant | chunks | ground truth build | plan (asserted free of `hnsw`) |
| --- | --- | --- | --- |
| perf_kb_major | 40,000 | 62.7 s | `Incremental Sort > Subquery Scan > WindowAgg > Sort > Result > Nested Loop > Seq Scan > Materialize > Seq Scan` |
| perf_kb_mid | 8,000 | 18.0 s | same |
| perf_kb_minor | 800 | 3.0 s | same |
| perf_kb_tiny | 200 | 0.4 s | same |

**Exact re-scan cost** — the shape production falls back to (`kb-candidate.service.ts:39-46`),
as `streamline_app` with the GUC, 10 samples per cell:

| tenant | chunks | cap | buffers | buffers/chunk | p50 ms | plan |
| --- | --- | --- | --- | --- | --- | --- |
| perf_kb_major | 40,000 | 24 | 647,040 | 16.18 | 387.32 | `Limit > Sort > Subquery Scan > Result > Seq Scan` |
| perf_kb_major | 40,000 | 120 | 647,040 | 16.18 | 356.67 | same |
| perf_kb_mid | 8,000 | 24 | 129,130 | 16.14 | 67.86 | `Limit > Sort > Subquery Scan > Result > Index Scan(idx_kb_chunks_org_source)` |
| perf_kb_mid | 8,000 | 120 | 129,130 | 16.14 | 67.07 | same |
| perf_kb_minor | 800 | 24 | 12,920 | 16.15 | 8.18 | same |
| perf_kb_minor | 800 | 120 | 12,920 | 16.15 | 6.78 | same |
| perf_kb_tiny | 200 | 24 | 3,245 | 16.23 | 1.76 | same |
| perf_kb_tiny | 200 | 120 | 3,245 | 16.23 | 1.93 | same |

Two things fall out of this table and both matter downstream.

- **Exact cost is linear in the tenant's own chunk count and independent of the cap** —
  16.14 to 16.23 buffers per chunk across a 200× range of tenant sizes. The cap changes only the
  size of the top-N heap, not the scan.
- **The `OFFSET 0` fence costs about a third more than the exact plan the planner picks
  unaided.** Where the planner chooses exact by itself inside the ANN query (§7) it spends
  12.1 buffers per chunk — 96,904 at 8,000 chunks, 9,696 at 800, 2,436 at 200 — against 16.2 for
  the fenced fallback. The fence buys plan determinism and pays 33% for it.

## 7. recall@k — the planner's choice, i.e. what production does today

100 probe vectors per cell. `recall@k = |ann ∩ exact_k| / k`. `100%` is the count of probes with
perfect recall; `short` is the count of probes that returned fewer than `cap` rows — the only
signal the in-service guard at `kb-candidate.service.ts:36` can see.

### recall@24 (`SEARCH_POOL_K = DEFAULT_TOP_K * 4`, `kb-rag-retrieval.service.ts:20-21`)

| tenant | chunks | ef_search | mean | min | p5 | 100% | short | buffers | p50 ms | plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| perf_kb_major | 40,000 | 40 | 94.25% | **0.00%** | 75.00% | 56 | 0 | 3,108 | 2.57 | HNSW |
| perf_kb_major | 40,000 | 100 | 95.46% | 66.67% | 75.00% | 56 | 0 | 7,497 | 5.05 | HNSW |
| perf_kb_major | 40,000 | 200 | 95.58% | 66.67% | 79.17% | 56 | 0 | 14,496 | 13.15 | HNSW |
| perf_kb_major | 40,000 | 400 | 96.42% | 75.00% | 83.33% | 60 | 0 | 25,896 | 22.31 | HNSW |
| perf_kb_major | 40,000 | 1000 | 97.21% | 79.17% | 83.33% | 65 | 0 | 55,131 | 41.94 | HNSW |
| perf_kb_mid | 8,000 | 40 | **43.21%** | 25.00% | 33.33% | 0 | 0 | 15,066 | 10.37 | HNSW |
| perf_kb_mid | 8,000 | 100 | 100.00% | 100.00% | 100.00% | 100 | 0 | 96,904 | 67.14 | exact(`org_source`) |
| perf_kb_mid | 8,000 | 200 | 100.00% | 100.00% | 100.00% | 100 | 0 | 96,904 | 77.29 | exact(`org_source`) |
| perf_kb_mid | 8,000 | 400 | 100.00% | 100.00% | 100.00% | 100 | 0 | 96,904 | 76.16 | exact(`org_source`) |
| perf_kb_mid | 8,000 | 1000 | 100.00% | 100.00% | 100.00% | 100 | 0 | 96,904 | 88.82 | exact(`org_source`) |
| perf_kb_minor | 800 | 40…1000 | 100.00% | 100.00% | 100.00% | 100 | 0 | 9,696 | 7.16–8.96 | exact(`org_source`) |
| perf_kb_tiny | 200 | 40…1000 | 100.00% | 100.00% | 100.00% | 100 | 0 | 2,436 | 1.65–2.34 | exact(`org_source`) |

### recall@120 (kb search at `limit` 10: `pool = max(limit*3, limit) = 30`, `cap = pool*4 = 120`)

| tenant | chunks | ef_search | mean | min | p5 | 100% | short | buffers | p50 ms | plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| perf_kb_major | 40,000 | 40 | **44.57%** | 31.67% | 37.50% | 0 | 0 | 12,957 | 12.06 | HNSW |
| perf_kb_major | 40,000 | 100 | 48.77% | 35.00% | 40.83% | 0 | 0 | 15,603 | 13.73 | HNSW |
| perf_kb_major | 40,000 | 200 | 48.77% | 35.00% | 40.83% | 0 | 0 | 15,606 | 13.82 | HNSW |
| perf_kb_major | 40,000 | 400 | 67.06% | 51.67% | 57.50% | 0 | 0 | 26,994 | 22.60 | HNSW |
| perf_kb_major | 40,000 | 1000 | **88.18%** | 72.50% | 80.83% | 0 | 0 | 56,244 | 39.68 | HNSW |
| perf_kb_mid | 8,000 | 40…1000 | 100.00% | 100.00% | 100.00% | 100 | 0 | 96,904 | 55.14–103.06 | exact(`org_source`) |
| perf_kb_minor | 800 | 40…1000 | 100.00% | 100.00% | 100.00% | 100 | 0 | 9,696 | 7.30–8.52 | exact(`org_source`) |
| perf_kb_tiny | 200 | 40…1000 | 100.00% | 100.00% | 100.00% | 100 | 0 | 2,436 | 2.05–2.46 | exact(`org_source`) |

### The plan-choice matrix, by (tenant, cap, ef_search)

`H` = `Limit > Result > Index Scan(idx_kb_chunks_embedding_hnsw)`.
`E` = `Limit > Sort > Result > Index Scan(idx_kb_chunks_org_source)` — exact, 100% recall.
Every cell was unanimous across all 100 probes; no cell mixed plans.

| tenant | chunks | cap 24 · ef 40 | 100 | 200 | 400 | 1000 | cap 120 · ef 40 | 100 | 200 | 400 | 1000 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| perf_kb_major | 40,000 | H | H | H | H | H | H | H | H | H | H |
| perf_kb_mid | 8,000 | **H** | E | E | E | E | E | E | E | E | E |
| perf_kb_minor | 800 | E | E | E | E | E | E | E | E | E | E |
| perf_kb_tiny | 200 | E | E | E | E | E | E | E | E | E | E |

**Three findings the matrix gives up.**

1. **Recall tracks the plan, not the tenant's share.** Of the 40 planner cells, all **29** that
   took the exact plan scored 100.00% mean, min and p5. All **11** that took HNSW lost between
   2.79% and 56.79% of the true top-k. There is no partial credit in between.
2. **`ef_search` is not only a recall knob — it moves the plan.** `perf_kb_mid` at cap 24 flips
   from HNSW to exact between ef 40 and ef 100, and its recall goes from 43.21% to 100.00% in
   that one step. That is the pgvector cost model: a larger `ef_search` raises the estimated
   HNSW cost above the index-scan-plus-top-N-sort alternative. A strategy that sets `ef_search`
   without knowing this will believe it tuned an ANN search when it in fact switched the query
   to exact — and the buffer cost jumps 6.4× (15,066 → 96,904) at the same instant.
3. **The under-retrieval guard is blind here, exactly as §7c reported.** `short = 0` in every
   one of the 40 planner cells. `vectorChunkIds` returns early whenever
   `annIds.length >= cap` (`kb-candidate.service.ts:36`), so in the worst cell in the table —
   44.57% recall — it returned a full 120 rows and the exact re-scan never ran.

## 8. recall@k with HNSW forced — what ANN actually costs at each tenant size

Below roughly 8,000 chunks the planner abandons HNSW, so a planner-only table has an empty cell
exactly where the crossover decision needs a number. This mode adds `SET LOCAL enable_sort = off`,
which removes the top-N sort from consideration and leaves the HNSW ordered scan as the only
path. **It does not change the ANN algorithm** — it prices the index scan production would run
if it chose it. Every cell asserts the plan really did use the HNSW index; all 40 did.

### recall@24, forced

| tenant | chunks | ef 40 | ef 100 | ef 200 | ef 400 | ef 1000 |
| --- | --- | --- | --- | --- | --- | --- |
| perf_kb_major | 40,000 | 94.25% / 3,108 b | 95.46% / 7,497 b | 95.58% / 14,496 b | 96.42% / 25,896 b | 97.21% / 55,131 b |
| perf_kb_mid | 8,000 | 43.21% / 15,066 b | 45.00% / 15,084 b | 45.54% / 15,078 b | 62.00% / 26,391 b | 85.00% / 55,578 b |
| perf_kb_minor | 800 | 69.29% / 69,813 b | 70.46% / 71,403 b | 72.50% / 75,363 b | 76.71% / 82,461 b | 86.87% / 94,161 b |
| perf_kb_tiny | 200 | 48.92% / 86,523 b | 49.96% / 86,790 b | 52.00% / 89,811 b | 56.04% / 96,276 b | 66.33% / 107,640 b |

### recall@120, forced

| tenant | chunks | ef 40 | ef 100 | ef 200 | ef 400 | ef 1000 |
| --- | --- | --- | --- | --- | --- | --- |
| perf_kb_major | 40,000 | 44.57% / 12,957 b | 48.77% / 15,603 b | 48.77% / 15,606 b | 67.06% / 26,994 b | 88.18% / 56,244 b |
| perf_kb_mid | 8,000 | 64.47% / 50,988 b | 65.36% / 53,583 b | 65.99% / 58,014 b | 66.13% / 66,177 b | 72.33% / 58,179 b |
| perf_kb_minor | 800 | 44.73% / 90,102 b | 45.66% / 91,086 b | 47.86% / 94,629 b | 51.97% / 102,483 b | 62.22% / 114,273 b |
| perf_kb_tiny | 200 | 37.84% / 126,730 b | 38.76% / 128,693 b | 40.48% / 135,652 b | 44.07% / 149,709 b | 53.34% / 172,824 b |

**ANN gets worse — on both axes — as the tenant gets smaller.** The HNSW index has no `org_id`
in it, so the tenant qual is a post-filter on graph output: a tenant holding 0.41% of the index
has roughly 244 of every 245 visited candidates discarded, and the scan walks further to find `cap`
survivors. At cap 120 the 200-chunk tenant does not find them at all — **100 of 100 probes
returned short of 120 rows** at ef 40 through 400, and 98 of 100 at ef 1000. That is the one
place the existing cardinality guard *would* fire; it fires for the tenant that needed it least.

## 9. The recall floor — the three numbers

### (a) Minimum recall the product should hold: **mean recall@k ≥ 0.95**, measured over ≥ 100 probe vectors

Rows that justify it:

| what | rows |
| --- | --- |
| Every exact cell clears it outright | all **29** planner-exact cells: mean = min = p5 = **100.00%**, 100/100 perfect probes |
| Only four ANN cells clear it, all on the 40,000-chunk tenant at cap 24 | ef 100 **95.46%**, ef 200 **95.58%**, ef 400 **96.42%**, ef 1000 **97.21%** |
| Every other ANN cell fails, by a lot | the **11** HNSW planner cells span **43.21%** to 97.21%. At the production default `ef_search = 40` the two losing cells are `perf_kb_mid` / cap 24 at **43.21%** and `perf_kb_major` / cap 120 at **44.57%** |

**The mean does not bound the tail, and the floor must be stated as a mean because of it.** The
four passing ANN cells carry min recall 66.67–79.17% and p5 75.00–83.33%; one probe at
`perf_kb_major` / cap 24 / ef 40 scored **0.00%** — HNSW returned 24 rows, none of them in the
true top-24. Only the exact path has a tail guarantee (min = p5 = 1.00 in all 33 cells). If the
product needs a per-query guarantee rather than an average, ANN cannot supply it at any
`ef_search` this sweep reached.

### (b) Tenant chunk-count threshold below which exact is 100%-recall and cheaper: **≤ 800 measured; set the constant at 8,000**

| tenant size | exact | best forced ANN | verdict |
| --- | --- | --- | --- |
| **200 chunks** | 100% · 3,245 b · 1.76 ms | cap 24: 66.33% @ 107,640 b · cap 120: 53.34% @ 172,824 b (98/100 short) | exact wins on both axes, **27–53× fewer buffers** |
| **800 chunks** | 100% · 12,920 b · 8.18 ms | cap 24: 86.87% @ 94,161 b · cap 120: 62.22% @ 114,273 b | exact wins on both axes, **5.4–8.8× fewer buffers** |
| **8,000 chunks** | 100% · 96,904 b (planner's own plan) / 129,130 b (fenced fallback) · 67.9 ms | cap 24: 85.00% @ 55,578 b · cap 120: 72.33% @ 58,179 b | **ANN is 1.7–2.2× cheaper here and still fails the floor by 10–28 points** |
| **40,000 chunks** | 100% · 647,040 b · 387 ms | cap 24: 97.21% @ 55,131 b · cap 120: 88.18% @ 56,244 b | ANN is 11.5× cheaper; exact is the only path that clears cap 120 |

- **The literal answer to "both 100% and cheaper" is 800 chunks.** That is the largest size at
  which exact beat every one of the ten forced-ANN cells measured for it, on recall and on
  buffers simultaneously.
- **The threshold the strategy should carry is 8,000.** Between 800 and 8,000 exact stops being
  cheaper but remains the only path over the floor, and at 8,000 it is *already what the planner
  chooses* in 9 of the 10 production cells — so pinning it there is not a regression, it makes
  the planner's existing behaviour deterministic and fixes the one cell (cap 24, ef 40) where
  the planner took HNSW and scored 43.21%.
- ⚠ **`KB_EXACT_SCAN_MAX_CHUNKS = 2_000` in `kb-retrieval-strategy.ts:33` sits inside the
  unmeasured band.** No tenant between 800 and 8,000 chunks exists in this corpus, so no ANN cell
  was measured at 2,000. The value is not contradicted; it is **unverified**, and it routes every
  tenant from 2,000 to 8,000 chunks onto ANN, where the nearest measured size (8,000) scored
  43.21–85.00% at cap 24. Verifying it needs a fifth tenant seeded in that band and an HNSW
  rebuild.

### (c) `ef_search` for tenants above the threshold: **`min(max(8 × cap, cap), 1000)` — but gate the ANN path on `cap`, not only on tenant size**

| cap | `8 × cap` | measured points bracketing it | verdict |
| --- | --- | --- | --- |
| 24 | 192 | ef 100 = **95.46%**, ef 200 = **95.58%** | **clears the 0.95 floor**; 192 is bracketed by two passing points |
| 120 | 960 | ef 1000 = **88.18%** (the sweep's ceiling; pgvector's `hnsw.ef_search` max is 1000) | **fails the floor by 6.8 points, and no legal `ef_search` fixes it** |

So the multiplier itself is right and should stay at 8, but it is not sufficient on its own:

- **ANN is only justified at caps where it was measured to clear the floor — cap 24 today.**
  Every larger cap, including the kb-search cap of 120, must take the exact path regardless of
  tenant size.
- ⚠ **The existing `if (cap > KB_ANN_EF_SEARCH_MAX) return { kind: "exact" }` guard
  (`kb-retrieval-strategy.ts:54`) never fires for the real caps.** It compares `cap` (24 or 120)
  against 1000. The condition that actually bites is `8 × cap > 1000`, i.e. `cap > 125` — and
  even that is too generous, because cap 120 is *under* it and still measured 88.18%.
- ef 100 (multiplier ≈ 4.2) already clears the floor at cap 24 for **half the buffers of ef 200**
  (7,497 vs 14,496) and a third of ef 1000 (55,131). If the extra 0.12 percentage points at
  ef 200 are not worth 2× the reads, the multiplier can drop to 4 — but ef 96 was not measured,
  only ef 100, so 8 is the value both bracketing points support.

**What (c) costs.** Holding the floor at cap 120 means a 40,000-chunk tenant's kb-search runs
exact: **647,040 buffers and p50 ~357–387 ms**, against 12,957 buffers and 12 ms today at 44.57%
recall. That is the honest price of a 0.95 floor with the current index. The structural
alternative — an `org_id`-leading or per-tenant partitioned vector index, so the tenant qual is
an index condition rather than a post-filter on graph output — would change all of these numbers
and **is not evaluated here**.

---

## 10. What this does not claim

- Not deployed evidence. A local Windows PostgreSQL 18.6 on a laptop, not Neon, not a cell, no
  application server in the loop.
- **The corpus is synthetic.** `topic + jitter` vectors with one dominant coordinate, not real
  `text-embedding-3-small` output. Beyond the ~26 same-topic chunks a probe has in the majority
  tenant, the ordering is jitter noise with no cluster structure — which is close to adversarial
  for a graph index. **The absolute recall percentages must not be quoted as the product's
  recall.** What transfers is the *shape*: exact = 1.00 always, HNSW loses recall silently at
  full cardinality, `ef_search` moves the plan as well as the recall, and ANN degrades as the
  tenant's share of the index shrinks.
- **No tenant between 800 and 8,000 chunks was measured**, so the crossover in §9(b) is a
  bracket, not a point. Nothing here justifies a specific threshold inside that band.
- **The `ef_search` sweep has five points, not a curve.** ef 192 and ef 960 were never run; the
  claims about them rest on the two measured points that bracket each, and recall was monotone
  non-decreasing in `ef_search` in all 40 sweep rows.
- `enable_sort = off` in §8 is a diagnostic device. It prices the HNSW index scan at sizes where
  the planner refuses it; it is not a configuration anyone should ship, and it does not change
  what the ANN scan itself does.
- Millisecond columns are one observation on a noisy host. The latency harness's own §9 records
  a 1.5× swing between two identical runs, and this harness saw exact-scan p50 move from 478.6
  to 387.32 ms between two runs while **the buffer counts stayed identical to the digit**. Read
  the buffer columns as the finding.
- **One run of the two-mode harness exited 1 after printing only its header, with nothing on
  stderr.** It was not reproduced — the immediate rerun completed with exit 0 and its
  planner-mode half matched the earlier planner-only run in every cell — but the failure was not
  explained, and a reader should know a run can die silently on this host.
- 100 probe vectors per cell, drawn from the corpus's own topic pool. A different probe
  distribution would give different absolute numbers.
- Lint and tests were **not run**; `tsc` was not run because nothing TypeScript reads was
  changed. No git command was run, so no SHA is attested and nothing was committed by this task.
- **No production retrieval code was changed by this task.** `kb-retrieval-strategy.ts` is
  another agent's file; §9 states the three numbers and the rows behind them, and flags two
  constants in it that this measurement does not support, but did not edit it.
