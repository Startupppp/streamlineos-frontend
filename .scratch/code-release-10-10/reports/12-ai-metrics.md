# 12 — Tenant-safe AI metrics, and retrieval latency on a realistic corpus

**Boxes: 6 closed / 0 open.**

Territory: `streamlineos-backend/src/modules/ai/core/telemetry/**` and
`streamlineos-backend/test/perf/ai/**`. Everything else named below is a read-only
verification or a cross-territory finding.

---

## What was already on disk, and what was wrong with it

A previous session committed `ai-call-metrics.ts`, its two specs, and three files under
`test/perf/ai/`. The telemetry side was sound and is closed on its own evidence (below).
**The benchmark side was not.** It had never produced a number, and it could not have:

**1. The seeder died at chunk 20,506 with `22003 integer out of range`, every run.**
`(g * 104729) % 512` is `int4` arithmetic and `20506 × 104729 = 2,147,532,074`, past
`int4`'s 2,147,483,647. The declared corpus is 49,000 chunks; the database I inherited held
**20,000 rows of one organisation** and no HNSW index, because the crash happened between
`DROP INDEX` and the rebuild. Reproduced before changing anything — the second seed run
failed identically at the same row.

**2. The corpus was 1,536 distinct vectors however many rows were seeded.** Two causes,
compounding. `TOPIC_VECTOR_SQL` keyed its dominant coordinate on `t % 1536`, so a
`TOPIC_POOL` of 4096 held 1536 distinct vectors. And `JITTER_VECTOR_SQL` was
`round((random() * 0.06)::numeric, 4)` over `generate_series(d)` **with no reference to the
outer `j`** — an uncorrelated scalar subquery, which Postgres evaluates once as an InitPlan.
Measured directly:

```
SELECT count(*), count(DISTINCT emb) FROM perf_jitter_pool;
 pool_rows | distinct_jitters
      4093 |                1
```

4,093 pool rows, **one** distinct vector. So every chunk was `topic + <the same noise>`, and
20,000 seeded rows carried 1,536 distinct embeddings — roughly 13 exact copies each. HNSW over
a table of duplicates answers from the first neighbourhood it enters; the post-filter cost this
whole ticket exists to measure would never have appeared.

**3. Pool sizes could not have fixed that on their own.** A chunk's point is
`(topic[g·A mod T], jitter[g·B mod J])`, so the pair repeats with period `lcm(T, J)`. With
`T = 4096, J = 512`, `512 | 4096` and the pair cycled every 4096 rows regardless.

**4. No p99, and no per-org separation.** The runner reported p50/p95 only, with a default of
25 samples — below the 100 a p99 needs to name a real observation rather than the maximum.
And every org walked the pools from `g = 0`, so the minority tenant's rows were an exact
duplicate subset of the majority's.

### Fixes (all inside `test/perf/ai/`)

- `::bigint` on both pool-index expressions, in `topicIndexSql` / `jitterIndexSql`.
- `TOPIC_POOL = 1536` (exactly the dimension count, so each topic is a genuinely distinct
  dominant coordinate) and `JITTER_POOL = 4093` (prime, coprime with 1536 →
  `lcm = 6,286,848`, far beyond any corpus this seeds).
- `JITTER_VECTOR_SQL` correlates on `j` via `hashint8((j::bigint << 21) + d)` — correlation
  defeats the InitPlan hoist, and a hash instead of `random()` makes the corpus reproducible.
- A per-org `seed` offset, so orgs share the topic space without sharing points.
- `assertCorpusIsNotDegenerate()` runs **before** the 69-second HNSW build and refuses to
  proceed if `count(DISTINCT embedding) < count(*)`, per org and overall. This is what caught
  defect 2 — the first patched run failed on it rather than producing a flattering number.
- p50 / **p95** / **p99** latency and median/p95 buffers; `--runs` floored at 100.

---

## The corpus actually measured

| | |
|---|---|
| Database | `scratch_ai_latency` (local Postgres, `neondb_owner`-owned) |
| pgvector | **0.8.6**, confirmed present in `pg_extension` before measuring |
| Rows | **49,000 chunks**, **49,000 distinct embeddings** (asserted, not assumed) |
| ANN index | `idx_kb_chunks_embedding_hnsw`, `hnsw (embedding vector_cosine_ops)`, **383 MB**, built once after load, then `VACUUM ANALYZE` |
| Index definition | byte-identical to `migrations/0016_volatile_nicolaos.sql:10` |
| Measured as | `streamline_app` — `rolbypassrls = f`, `rolsuper = f`, asserted at run start |
| RLS | `kb_article_chunks` policy `tenant_isolation` = `org_id = app.current_org_id()`; with no GUC the table raises `42501 no tenant context`, verified |
| Repetitions | **100 timed samples per cell**, after 3 discarded warm-ups; 1,648 `EXPLAIN (ANALYZE, BUFFERS)` executions total |

**Tenant shares.** The measuring organisations are deliberately lopsided:

| org | chunks | share |
|---|---|---|
| `perf_kb_major` | 40,000 | 81.6% |
| `perf_kb_mid` | 8,000 | 16.3% |
| **`perf_kb_minor`** | **800** | **1.6%** |
| `perf_kb_tiny` | 200 | 0.4% |

---

## Measured retrieval latency

Command:

```
PERF_DATABASE_URL=<neondb_owner @ scratch_ai_latency> \
PERF_APP_DATABASE_URL=<streamline_app @ scratch_ai_latency> \
  node test/perf/ai/measure-kb-retrieval-latency.mjs --runs=100
```

Exit 0. Every row is 100 samples.

### ANN, cap 24 — the `kb-rag` public-ask pool

| org | share | p50 ms | p95 ms | p99 ms | buffers (p50) | plan |
|---|---|---|---|---|---|---|
| major | 81.6% | **1.77** | 3.01 | 3.78 | 1,976 | Index Scan (HNSW) |
| mid | 16.3% | **15.03** | 18.54 | 19.15 | 10,018 | Index Scan (HNSW) |
| minor | 1.6% | 2.78 | 3.01 | 3.31 | 9,678 | Sort > Index Scan (**`idx_kb_chunks_org_source`**) |
| tiny | 0.4% | 0.49 | 0.61 | 0.63 | 2,424 | Sort > Index Scan (**`idx_kb_chunks_org_source`**) |

### ANN, cap 120 — KB search at limit 10

| org | share | p50 ms | p95 ms | p99 ms | buffers (p50) | plan |
|---|---|---|---|---|---|---|
| major | 81.6% | 15.61 | 19.24 | 20.00 | 8,970 | Index Scan (HNSW) |
| mid | 16.3% | **32.97** | 36.87 | 37.11 | **96,683** | Sort > Bitmap Heap Scan |
| minor | 1.6% | 2.12 | 3.30 | 3.58 | 9,678 | Sort > Index Scan (org btree) |
| tiny | 0.4% | 0.48 | 0.51 | 0.54 | 2,424 | Sort > Index Scan (org btree) |

### `app.search_kb_chunk_ids` fence, cap 120

| org | share | p50 ms | p95 ms | p99 ms | buffers (p50) | plan |
|---|---|---|---|---|---|---|
| major | 81.6% | **160.55** | **218.54** | **255.50** | **161,135** | ProjectSet > Result |
| mid | 16.3% | 22.86 | 25.53 | 27.06 | 32,228 | ProjectSet > Result |
| minor | 1.6% | 2.05 | 2.25 | 2.42 | 3,229 | ProjectSet > Result |
| tiny | 0.4% | 0.52 | 0.59 | 0.64 | 811 | ProjectSet > Result |

---

## What the numbers say

**1. The tenant that suffers is not the smallest one — it is the one just below the majority.**
At cap 24 the mid tenant holds a fifth of the majority's rows and pays **8.5× the p50 latency
(15.03 vs 1.77 ms) and 5.1× the buffers (10,018 vs 1,976)**. That is the post-filter effect the
ticket predicted, and measuring only `perf_kb_major` would have reported 1.77 ms as *the* ANN
latency — 8.5× optimistic for the tenant next door.

**2. Minority tenants never touch the HNSW index at all.** For `perf_kb_minor` (1.6%) and
`perf_kb_tiny` (0.4%) the planner abandons ANN entirely and takes
`idx_kb_chunks_org_source` with an exact `Sort`. Their latency looks fine — 2.12 ms, 0.48 ms —
but it is fine because their corpora are small, not because the index helped. Both pay a flat
**~12.1 buffers per own-row** (9,678/800 and 2,424/200), identical at cap 24 and cap 120: the
cost is linear in the tenant's own corpus and independent of the limit. A minority tenant that
grows to the mid tenant's size inherits the mid tenant's numbers, not the majority's. **The
383 MB HNSW index buys these tenants nothing today.**

**3. `hnsw.iterative_scan = relaxed_order` is load-bearing, and it is the majority tenant it
saves.** With it off, `LIMIT 120` under-delivers — reproduced over 5 distinct query vectors:

```
perf_kb_major   iterative_scan=off            rows: 34, 32, 35, 34, 35
perf_kb_major   iterative_scan=relaxed_order  rows: 120, 120, 120, 120, 120
perf_kb_mid/minor/tiny, both settings         rows: 120 everywhere
```

Default `ef_search = 40`, of which ~81.6% survive the tenant qual ≈ 33. Only the majority
under-delivers because it is the only tenant whose plan still uses HNSW at that cap. Production
does set it — `src/modules/kb/retrieval/kb-candidate.service.ts:27`,
`SET LOCAL hnsw.iterative_scan = relaxed_order` — so this is a **control confirming that line
must not be removed**, not a live defect.

**4. Report 20's `AS MATERIALIZED` finding holds and gets worse with scale.** Report 20
measured the fence at 36,882 buffers on a 12,000-chunk org. At 40,000 chunks it is
**161,135 buffers and a 255 ms p99** — ~4.0 buffers per chunk, linear, no index. Note the
inversion: the fence is *cheaper* than the ANN path for the two small tenants (3,229 vs 9,678
buffers for the minority) and ~80× more expensive for the majority. `vectorChunkIds` reaches it
only when the ANN returns zero rows, so it is a fallback — but the fix report 20 specifies
(drop `AS MATERIALIZED`) is now corroborated at realistic volume. **Migration territory, not
mine; recorded, not applied.**

**Caveat, stated because a measurement without its conditions is not evidence:** this is local
Postgres on a shared laptop, not Neon. Wall-clock milliseconds are indicative; the buffer
counts and the plan shapes are the transferable numbers, and every ratio above is drawn from
those or from same-run comparisons.

---

## Telemetry: the six dimensions, and tenant safety

`AiCallMetrics` (`src/modules/ai/core/telemetry/ai-call-metrics.ts`) emits one span per gateway
call through the shared `LogSpanExporter`. I verified each dimension has a **real feed site**,
not just an attribute slot — a metric nothing writes is not a metric:

| dimension | attribute | fed at |
|---|---|---|
| queue time | `ai.queue_ms` | `ai-gateway.service.ts:101,121,153,205`, `chat-assistant:106`, `kb-rag:143` |
| application overhead | `ai.overhead_ms` | derived: `elapsed − queue − provider` |
| provider latency | `ai.provider_ms` | `ai-gateway-embed.helper.ts:53,80`, `ai-gateway-runner.helper.ts:114,267,395` |
| time-to-first-token | `ai.ttft_ms` | `chat-assistant.service.ts:213`, `kb-rag.service.ts:189` (`onChunk`) |
| tokens | `ai.tok_in` / `ai.tok_out` | `finish(...)` facts |
| credits | `ai.credits_milli` | `finish(...)` facts |
| cache hit | `ai.cache_hit` | `ai-gateway.service.ts:144,174,276,306` |
| cancellation | `ai.outcome = cancelled` | `ai-gateway-runner.helper.ts:177,331,456`, `kb-rag:236`, `chat-assistant:281` |
| retry | `ai.retries` | `ai-gateway-runner.helper.ts:122,276,401` (`onRetry`) |
| failure | `ai.outcome` + span status | `finish(cancelled ?? "error")`, `kb-rag:244`, `chat-assistant:288,294` |

**Provider time cannot absorb application time, or vice versa.** `providerMs` brackets only the
provider call; `overheadMs` is the residue after queue and provider are subtracted from the
wall clock. `ai-call-metrics.spec.ts` pins this with an explicit bite test — *"a slow provider
cannot be reported as application overhead"* — and TTFT is measured from `providerOpenedAt`,
not from request start, with a second test proving a token signalled before the provider opened
counts for nothing.

**Tenant safety.** The emitted `message` is the exporter's own constant `"SPAN"`; every
attribute is an identifier, an enum member or a number, so there is no template a prompt or a
bind value could reach a log through. One subtlety worth keeping: the token counts are
`ai.tok_in` / `ai.tok_out` **and the abbreviation is load-bearing** —
`common/observability/redact.ts` withholds any key whose normalised form contains `token` or
`prompt`, so `ai.prompt_tokens` would arrive at the log as `[redacted]`: a metric that looks
emitted and carries nothing. The spec asserts both directions (the chosen keys survive; the
rejected names really would be eaten).

## Alert-predicate parity

The emitter and both predicates, compared literally:

| file | line |
|---|---|
| `src/common/observability/log-span-exporter.ts:19` | `message: "SPAN",` |
| `src/scripts/alert-p95.mjs:86` | `if (record.message !== "SPAN") continue;` |
| `src/scripts/alert-seam-latency.mjs:44` | `if (record.message !== "SPAN") continue;` |

They match. `ai-metric-alert-parity.spec.ts` does not restate that — it *parses* the literal
out of the exporter source and out of each script and compares them, so a change to either side
fails the test. It also proves, with a genuine `AiCallMetrics.finish()` serialised by a genuine
`LogSpanExporter`, that the emitted line carries `name`, `latencyMs`, `status`, `timestamp` and
the surviving `ai.*` attributes; that `AI_CALL_SPAN_NAME` contains no space so `alert-p95`'s
normaliser passes it through unchanged (one bucket, not one per correlation id); and that the
span sets no `seam` attribute, so `alert-seam-latency` cannot mis-bucket it into another seam's
budget.

## Per-call CPU percentiles

None are claimed. `measure-kb-retrieval-latency.mjs` takes `process.cpuUsage()` once around the
**entire** run and reports it as one aggregate — *1,648 queries, 32.3 s wall, 620 ms client
CPU* — never as a percentile.

Swept the repository for the anti-pattern. The only other CPU measurement is
`src/scripts/benchmark-access-service.ts`, and it is already correct: it measures the CPU clock's
granularity, batches calls above the tick, and its `measurement` field states in full that the
reported percentiles are *"percentiles OF BATCH MEANS, not of individual calls"*. Nothing to
remove. (Outside my territory in any case — read-only verification.)

---

## Gates run

| command | exit | result |
|---|---|---|
| `pnpm check:log-secrets` | **0** | 3,517 files scanned; "no plaintext secret logging found … every name this gate guards is withheld by the runtime redactor" |
| `heavy.sh 2 -- pnpm exec jest --runInBand --testPathPattern="modules/ai/core/telemetry"` | **0** | **2 suites, 47 tests, all passed** |
| `pnpm exec eslint test/perf/ai/*.mjs` (3 files) | **0** | clean |
| `node test/perf/ai/seed-kb-retrieval-corpus.mjs` | **0** | 49,000 chunks / 49,000 distinct embeddings; HNSW rebuild 68.6 s |
| `node test/perf/ai/measure-kb-retrieval-latency.mjs --runs=100` | **0** | 1,648 queries; tables above |

**Not run:** backend `typecheck` and `check:spec-typecheck`. My three changed files are `.mjs`
under `test/perf/` — not in any `tsconfig` include and not compiled by `tsc`; the one `.ts` file
in my territory is unmodified. I ran `eslint` on the changed files instead, which is the gate
that actually covers them. Reported as not run, not as passing.

## Cross-territory findings (recorded, not fixed)

1. **`app.search_kb_chunk_ids` still carries `AS MATERIALIZED`.** Confirmed live in
   `scratch_ai_latency` via `pg_get_functiondef`. At 40,000 chunks it costs 161,135 buffers and
   a 255 ms p99. Report 20 already specifies the exact replacement body; it needs a migration,
   which is ticket 08's territory.
2. **`hnsw.iterative_scan = relaxed_order` at `kb-candidate.service.ts:27` must not be
   removed.** Without it the majority tenant silently returns ~34 candidates for a `LIMIT 120`.
   `src/modules/kb/retrieval/kb-hnsw-iterative-scan.spec.ts` already guards it; this measurement
   is the quantity behind that guard.
3. **The HNSW index does nothing for small tenants.** Minority and tiny tenants get an exact
   sort over an org btree, at ~12.1 buffers per own-row, linear in their own corpus. An
   `org_id`-leading partitioned or filtered ANN strategy is the structural answer; that is a
   schema decision, not a benchmark change.
