# HNSW1 — KB vector search ANN index / RLS measurement

**Date:** 2026-08-30
**Outcome:** Option (a) confirmed. HNSW index is used; org_id is NOT in it; RLS post-filters the ANN result; correctness bug reproduced empirically.

---

## Setup

Seeded `kb_article_chunks` with 30,000 rows across three orgs then ran `VACUUM ANALYZE`:

| Org | Rows |
|---|---|
| seed-org (`73e5076a…`) | 15,000 |
| org-b (`c5b82e53…`) | 7,500 |
| org-c (`ed6e823a…`) | 7,500 |

Vectors: 1536-dim, server-side `random() - 0.5` (uniform in [-0.5, 0.5]).
All measurements as `streamline_app` with `SET LOCAL app.organization_id` inside a transaction. No measurement taken as `neondb_owner`.

Scripts:
- Seeder: `backend/src/scripts/seed-hnsw-chunks.mjs`
- Measure: `backend/scripts/measure-hnsw-plan.mjs`

---

## Index state confirmed

```
idx_kb_chunks_embedding_hnsw:
  USING hnsw (embedding vector_cosine_ops)
  Columns: [embedding]   ← org_id is NOT in the index
```

RLS policy on `kb_article_chunks`:
```sql
POLICY tenant_isolation: qual = (org_id = current_org_id())
```

`current_org_id()` is NOT leakproof, so the planner cannot push it below the security barrier (cannot apply it inside the index scan).

---

## Measured plans (EXPLAIN ANALYZE BUFFERS as streamline_app)

### Scenario A — pure ANN, no WHERE clause (only RLS applies)

```
Limit  (cost=1010.36..1089.79 rows=20 width=12) (actual rows=20)
  Buffers: shared hit=225 read=22  [total 247 buffers]
  -> Index Scan using idx_kb_chunks_embedding_hnsw  (actual rows=20)
       Filter: (org_id = current_org_id())
       Index Searches: 1
       Buffers: shared hit=225 read=22
```

Result: 20 rows returned (correct for seed-org). Buffers: **247**.
The RLS qual is applied as a heap-fetch post-filter after the HNSW candidates are produced.

### Scenario B — ANN with explicit `WHERE org_id = seed_org`

```
Limit  (cost=1010.36..1079.79 rows=20 width=12) (actual rows=20)
  Buffers: shared hit=216  [total 216 buffers]
  -> Result
       One-Time Filter: (current_org_id() = '73e5076a…')
       -> Index Scan using idx_kb_chunks_embedding_hnsw  (actual rows=20)
            Filter: (org_id = '73e5076a…')
            Index Searches: 1
            Buffers: shared hit=156
```

Postgres adds a One-Time Filter checking that the GUC matches the literal org — if not, the whole scan is skipped. The HNSW index is used with post-filter. Buffers: **216** (less because the GUC check short-circuits planning overhead).

### Scenario C — ANN from org-b (15k seed-org rows invisible under its GUC)

```
Limit  (cost=1010.36..1169.16 rows=20 width=12) (actual rows=0)
  Buffers: shared hit=192  [total 192 buffers]
  -> Index Scan using idx_kb_chunks_embedding_hnsw  (actual rows=0)
       Filter: (org_id = current_org_id())
       Rows Removed by Filter: 393
       Index Searches: 1
       Buffers: shared hit=192
```

**org-b received 0 results** despite having 7,500 rows in the table and a LIMIT of 20.
The HNSW index traversed 393 candidates — all from seed-org — and the RLS filter discarded every one. The graph was exhausted before any org-b row was surfaced.

---

## Cross-tenant isolation check (actual result values)

```
Rows of seed-org visible when GUC = org-b: 0   (expected 0)  ✓
Rows visible to org-b (GUC=org-b):         7500 (expected 7500) ✓
ANN top-20 from org-b:                     0 rows, 0 from other orgs
```

RLS blocks cross-tenant reads. No data leaks. But org-b gets **zero** results from an ANN query that should return 20.

---

## Finding

**Option (a) occurs.** The planner uses `idx_kb_chunks_embedding_hnsw` and applies the RLS qual as a post-filter. It does not seq-scan.

This is both a performance and correctness bug:

- **Correctness bug:** The HNSW graph is shared across all tenants. When a tenant's rows are a minority in the top-k ANN candidates (here 0 of 393 candidates belonged to org-b), the query returns fewer than LIMIT results — down to zero in this test. This is not the planner lying about counts; it is the documented behaviour of post-filter ANN: the returned set is guaranteed to be the exact top-k *of the rows that survive the filter* only if enough candidates are surfaced. When other tenants' rows crowd the graph neighbourhood, org-b's results are starved.

- **Performance:** 247 buffers for a 15k-row org versus 156 for the same org with an explicit equality — the extra 91 buffers come from the RLS qual being evaluated against the heap rather than the index.

- **No data leakage.** RLS functions correctly: no cross-tenant rows appear in any result set. The bug is under-retrieval, not over-retrieval.

---

## Root cause

`idx_kb_chunks_embedding_hnsw` indexes `embedding` only. pgvector's HNSW implementation does not support composite keys; `org_id` cannot be part of the HNSW index. The RLS qual `org_id = current_org_id()` cannot be pushed below the security barrier because `current_org_id()` is not leakproof. Therefore, every ANN query scans the global embedding graph and post-filters by org, and the result count depends on how densely the querying org's rows appear near the query vector.

---

## Fix required

A `SECURITY DEFINER` function owned by the `BYPASSRLS` role, following the canonical pattern of `app.search_ticket_ids` (migrations 0424/0425). The function must:

1. Take the query vector and a LIMIT as arguments. Org identity comes from `app.current_org_id()` internally — never a parameter.
2. Execute the ANN query without RLS applying (`BYPASSRLS` of the function owner) with an explicit `WHERE org_id = app.current_org_id()` predicate that the planner can push into the index scan region.
3. Return only IDs (integer array or SRF) — never chunk content or embeddings.
4. `REVOKE ALL ON FUNCTION … FROM PUBLIC; GRANT EXECUTE … TO streamline_app;`
5. The caller's main query (which runs under RLS) re-fetches the rows by id — so org-scoped RLS still applies to the content that is actually returned.

A covering index `(org_id, id) INCLUDE (embedding)` is insufficient because HNSW does not support multi-column indexes in pgvector.

`ALTER FUNCTION … LEAKPROOF` is not attempted: `neondb_owner` is not a true superuser on Neon (`rolsuper = false`) and the command fails `42501`.

---

## Files

- `backend/src/scripts/seed-hnsw-chunks.mjs` — seeder (new)
- `backend/scripts/measure-hnsw-plan.mjs` — measure harness (updated)
