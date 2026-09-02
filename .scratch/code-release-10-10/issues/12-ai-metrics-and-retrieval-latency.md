# 12 — Emit tenant-safe AI metrics and measure retrieval latency on a realistic corpus

**What to build:** Observable AI operations: queue time, application overhead, provider latency, time-to-first-token, tokens, credits, cache hit, cancellation, retry and failure — none of which may log prompts or content. Plus a real retrieval latency measurement, taken under conditions that reflect production rather than an empty index.

**Blocked by:** 10, 11.

**Status:** done — 6/6 boxes closed. Report: `reports/12-ai-metrics.md`.

- [x] Metrics cover every named dimension and are tenant-safe. No prompts, completions, file contents, tokens or sensitive bind values are logged.
      Every one of the ten dimensions verified to have a real feed site, not just an attribute slot (table in the report). `pnpm check:log-secrets` exit 0 over 3,517 files. `jest --testPathPattern="modules/ai/core/telemetry"` exit 0, 2 suites / 47 tests.
- [x] Provider time-to-first-token is recorded separately from application overhead, so provider-bound latency is not hidden inside our own numbers.
      `providerMs` brackets the provider call alone; `overheadMs` is the residue after queue and provider are subtracted from the wall clock. Pinned by the bite test "a slow provider cannot be reported as application overhead"; TTFT measured from `providerOpenedAt`, fed at `chat-assistant.service.ts:213` and `kb-rag.service.ts:189`.
- [x] Retrieval latency is measured on a realistic corpus, not a seeded handful of rows.
      49,000 chunks / **49,000 distinct embeddings**, 383 MB HNSW, pgvector 0.8.6, 100 timed samples per cell after 3 warm-ups, 1,648 `EXPLAIN (ANALYZE, BUFFERS)` executions. The committed seeder could not do this: it overflowed `int4` at chunk 20,506 and its jitter pool held 4,093 rows with **one** distinct vector. Both fixed; the seeder now refuses to build the index if the corpus is degenerate.
- [x] Measure as a **minority-tenant** organization: row-level security post-filters ANN search, so a majority tenant makes the index look faster than it is for everyone else.
      Four tenants at 81.6% / 16.3% / **1.6%** / 0.4%, measured as `streamline_app` (`rolbypassrls = f`) with the GUC set and RLS proven to fail closed at `42501`. Result: the 16.3% tenant pays 8.5× the majority's p50 and 5.1× its buffers, and the 1.6% and 0.4% tenants never use the HNSW index at all.
- [x] Any alert predicate is verified to match the string the emitting log line actually produces.
      Emitter `log-span-exporter.ts:19` = `message: "SPAN"`; `alert-p95.mjs:86` and `alert-seam-latency.mjs:44` both `record.message !== "SPAN"`. Compared literally by grep, and `ai-metric-alert-parity.spec.ts` parses both sides rather than restating either.
- [x] Per-call CPU percentiles are not used as evidence — the CPU clock ticks too coarsely to measure a single call.
      The runner takes `process.cpuUsage()` once around the whole run (1,648 queries, 32.3 s wall, 620 ms client CPU) and never percentiles it. Repository swept: the only other CPU measurement, `src/scripts/benchmark-access-service.ts`, already reports percentiles of batch means and says so explicitly. Nothing to remove.
