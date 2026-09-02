# 12 — Emit tenant-safe AI metrics and measure retrieval latency on a realistic corpus

**What to build:** Observable AI operations: queue time, application overhead, provider latency, time-to-first-token, tokens, credits, cache hit, cancellation, retry and failure — none of which may log prompts or content. Plus a real retrieval latency measurement, taken under conditions that reflect production rather than an empty index.

**Blocked by:** 10, 11.

**Status:** ready-for-agent

- [ ] Metrics cover every named dimension and are tenant-safe. No prompts, completions, file contents, tokens or sensitive bind values are logged.
- [ ] Provider time-to-first-token is recorded separately from application overhead, so provider-bound latency is not hidden inside our own numbers.
- [ ] Retrieval latency is measured on a realistic corpus, not a seeded handful of rows.
- [ ] Measure as a **minority-tenant** organization: row-level security post-filters ANN search, so a majority tenant makes the index look faster than it is for everyone else.
- [ ] Any alert predicate is verified to match the string the emitting log line actually produces.
- [ ] Per-call CPU percentiles are not used as evidence — the CPU clock ticks too coarsely to measure a single call.
