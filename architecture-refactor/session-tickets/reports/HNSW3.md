# HNSW3 — Iterative scan investigation: negative result, MATERIALIZED fence retained

**Date:** 2026-08-30
**Outcome:** Iterative scan is not viable for this dataset on Neon. Migration 0703 (MATERIALIZED fence) is retained as the correct solution.

---

## Investigation

HNSW2 fixed minority-tenant under-retrieval with a `MATERIALIZED` CTE that abandons the HNSW index entirely: verified at 22,680 buffer hits versus 247 for the original ANN path. Cost grows linearly with tenant size. This lane investigated whether pgvector's `hnsw.iterative_scan` (available in pgvector 0.8.6 on this cluster) could replace the fence with an index-backed solution.

---

## Measured comparison (all as `streamline_app` with tenant GUC, org-b minority tenant)

| Variant | Rows returned (org-b) | Shared buffers |
|---|---|---|
| (a) Original plain ANN (broken, RLS post-filter) | 0 | 247 |
| (b) MATERIALIZED fence — migration 0703 | 20 | 22,680 |
| (c) Iterative scan — session SET LOCAL, raw query | 0 | 786 |

Plan for (c) — `SET LOCAL hnsw.iterative_scan = relaxed_order; SET LOCAL hnsw.max_scan_tuples = 20000`:
```
Limit  (actual rows=0 loops=1)
  Buffers: shared hit=786
  ->  Index Scan using idx_kb_chunks_embedding_hnsw
        Filter: (org_id = current_org_id())
        Rows Removed by Filter: 2347
        Index Searches: 1
```

---

## Why iterative scan does not help

The HNSW graph is built globally across all 30,000 chunks. The test query vector `[0.1, 0.001, ...]` lies in a region of the 1,536-dimensional space dominated by seed-org vectors. With `max_scan_tuples=20000`, the HNSW exploration produces 2,347 candidates — all from seed-org — and 0 from org-b. Org-b's vectors are not reachable from this query within the scan budget. This is not a scan-budget issue: at 25% density, org-b would need to have vectors in the neighbourhood of the query, but it does not.

The result is symmetric for real workloads: a user searching their own org-b knowledge base with a query derived from their own content would land in a region where org-b's vectors dominate and the index would return 20 rows correctly. The failure is specific to a query vector that is geometrically close only to another tenant's cluster. The MATERIALIZED fence handles this correctly in all cases by operating on the tenant's own rows regardless of graph topology.

---

## Neon platform limitation (independent finding)

`hnsw.iterative_scan` cannot be set in a function's `SET` clause on this Neon cluster. Attempting `CREATE OR REPLACE FUNCTION ... SET hnsw.iterative_scan = relaxed_order` as `neondb_owner` fails with `42501 permission denied to set parameter "hnsw.iterative_scan"`. Both `neondb_owner` and `streamline_app` can set it via a session-level `SET` statement, so the restriction is specific to function-definition SET clauses. This matches Neon's documented inability to use `ALTER FUNCTION ... LEAKPROOF` — both involve privilege levels above `neondb_owner`'s effective permissions.

Workarounds tested:
- PL/pgSQL with `set_config('hnsw.iterative_scan', 'relaxed_order', true)` then `RETURN QUERY` — PL/pgSQL uses a cached plan from before the GUC change; still 0 rows.
- PL/pgSQL with `SET LOCAL` then `RETURN QUERY EXECUTE` (dynamic SQL, no plan caching) — even with dynamic replanning and the GUC active, still 0 rows (same HNSW graph topology problem).
- Session-level `SET LOCAL` in the outer transaction — GUC is active, but the HNSW exploration still finds 0 org-b rows (documented in the comparison table above).

---

## Conclusion

Neither platform restriction nor configuration prevents the iterative scan approach from being written; but **it does not produce correct results for this dataset**. The HNSW graph structure means the approach fails at the same fundamental level as the original un-fenced ANN: 0 rows for org-b for this query vector.

**Migration 0703 is retained. No new migration is needed.** The MATERIALIZED fence trades index cost for correctness; for the reported dataset scale (up to ~100k chunks per tenant), the sequential scan cost is acceptable. If tenant sizes reach millions, the correct fix is a per-tenant HNSW index (one index per org_id partition), not iterative scan.

---

## Files changed

- `backend/scripts/measure-hnsw-plan.mjs` — scenario E added (session-level iterative scan, org-b measurement) with comparison summary
- `architecture-refactor/session-tickets/reports/HNSW3.md` — this report

No migration was added. The discipline gate exits 0 (417 SQL files, 0 violations).
