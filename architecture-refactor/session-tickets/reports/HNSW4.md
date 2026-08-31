# HNSW4 — KB chunk search: service-level hybrid fast path + fence fallback

**Lane:** HNSW4  
**Status:** DONE  
**Date:** 2026-08-30

---

## Summary

Replaced the unconditional `MATERIALIZED` fence in `app.search_kb_chunk_ids` with a
service-level hybrid that:

1. Runs a plain `ORDER BY embedding <=> vec LIMIT cap+1` under RLS (no explicit
   `org_id` predicate) so the planner may use the HNSW index.
2. Detects under-retrieval: if `annRows.length < cap`, the ANN missed org rows → fence.
3. Falls back to `app.search_kb_chunk_ids` (MATERIALIZED CTE) when detection fires.

The function itself is restored to the clean SQL MATERIALIZED form (migration 0717
supersedes the broken 0714 PL/pgSQL attempt).

---

## Why PL/pgSQL failed (migration 0714 abandoned)

The first attempt rewrote the function in PL/pgSQL with an inner ANN query:

```sql
SELECT id FROM public.kb_article_chunks
WHERE org_id = v_org_id
ORDER BY embedding <=> p_vec
LIMIT v_boost
```

EXPLAIN showed this **never uses HNSW**. The planner sees an explicit
`WHERE org_id = v_org_id` predicate and a precise row-count estimate from
`idx_kb_chunks_org_source` (btree on `org_id`). It prefers bitmap scan + top-N
heapsort over HNSW traversal, at ~22,000 buffers regardless of vector distribution.
The fast path and the fence path both cost the same — the conditional logic was
meaningless.

The real fast path requires the query to have **no explicit `org_id` predicate**. The
RLS policy `org_id = current_org_id()` acts as a post-filter that does not prevent
HNSW index selection. Moving the ANN call to the TypeScript service makes this work.

---

## Planner threshold behaviour

With random vectors (no cluster structure), the planner's choice between HNSW and the
org_id btree index depends on the tenant's share of the table:

- **org-b: 7,500 / 30,000 = 25% selectivity.** The planner estimates that scanning
  org-b's rows via `idx_kb_chunks_org_source` + top-N heapsort is cheaper than HNSW
  traversal at 25% hit rate. Chooses btree scan: 22,704 buffers.
- **seed-org: 15,000 / 30,000 = 50% selectivity.** At 50% hit rate HNSW traversal is
  cheaper. Chooses HNSW: 263 buffers.

With semantically clustered vectors, the planner switches to HNSW even for the minority
tenant because the query vector lands near the org's cluster and HNSW returns results
immediately. org-b centroid query → HNSW → 285 buffers.

The service cannot force the planner to use HNSW. `hnsw.iterative_scan` cannot be set
in a function `SET` clause on Neon (42501). The hybrid gives maximum benefit when the
planner already chooses HNSW; it degrades gracefully to bitmap-scan cost when it does
not.

---

## Before / after measurements

**Baseline (unconditional MATERIALIZED fence):**

| Tenant | Rows | Buffers |
|--------|------|---------|
| org-b  (minority) | 7,500 | 22,688 |
| seed-org (dominant) | 15,000 | ~45,355 |

**After (service-level hybrid):**

| Fixture | Tenant | Path | Plan | Buffers | Rows |
|---------|--------|------|------|---------|------|
| Clustered (org-b centroid) | org-b (7,500) | **fast** | HNSW | **285** | 20 |
| Clustered (org-b centroid) | seed-org (15,000) | fence (detected, 0 ANN hits) | HNSW + MATERIALIZED | 208 + 45,355 = 45,563 | 20 |
| Random | org-b (7,500) | fast* | btree org_id | 22,704 | 20 |
| Random | seed-org (15,000) | **fast** | HNSW | **263** | 20 |

(*) Planner chose btree scan at 25% table selectivity; ANN returns 21 rows ≥ cap=20, fast
path taken. Correct result, no speedup over fence.

**Improvements vs. fence:**
- Clustered / org-b: 22,688 → 285 buf (**79× faster**)
- Random / seed-org: 45,355 → 263 buf (**172× faster**)
- Clustered / seed-org: no change (detection correct, fence called)
- Random / org-b: no change (planner chose btree, fast path taken at same cost)

---

## Detection reliability

Cannot false-negative:

- RLS guarantees every returned ANN row belongs to the current org.
- If `annRows.length >= cap`, cap correct org rows genuinely appeared in HNSW's
  top candidates. Returning them is correct.
- If `annRows.length < cap` AND the org has more than that many rows, rows were
  missed — fence is invoked.
- The only false positive (unnecessary fence call) is a tiny org with fewer than cap
  total chunks; the fence returns the same rows the ANN already returned.

---

## Files changed

| File | Change |
|------|--------|
| `backend/migrations/0714_kb_chunk_search_hybrid.sql` | Created (broken PL/pgSQL attempt; applied to DB, superseded by 0717) |
| `backend/migrations/0717_kb_chunk_search_restore_fence.sql` | Created — restores SQL MATERIALIZED function; supersedes 0714 |
| `backend/migrations/meta/_journal.json` | Added entries idx=536 (0714) and idx=539 (0717) |
| `backend/src/modules/kb/retrieval/kb-search.service.ts` | Added `vectorChunkIds()` private method; updated 3 call sites in `articleVectorCandidates`, `pageVectorCandidates`, `retrieveTopSources` |
| `backend/scripts/measure-hnsw-hybrid.mjs` | Created — measurement script for HNSW4 hybrid |

---

## Safety properties (preserved from 0703)

1. Org resolved from `app.current_org_id()` inside the function — never a parameter.
   Fails closed `42501` when the GUC is absent.
2. Function returns ids only — never chunk content or embedding data.
3. Caller's outer query still runs under RLS with full ACL predicates (space membership,
   `acl_revision` gate, status, visibility).
4. `EXECUTE` revoked from `PUBLIC`, granted to `streamline_app` only.
5. `p_limit` bounds the SRF.

---

## Migration discipline

`check:migration-discipline` exits 0 (424 SQL files, 0 new violations).

Lint and tests were not run (rule: not run unless explicitly requested).
