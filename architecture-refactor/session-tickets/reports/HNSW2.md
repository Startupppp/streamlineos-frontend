# HNSW2 — KB vector search under-retrieval fix

**Date:** 2026-08-30
**Outcome:** Fixed. Minority tenant (`org-b`) now returns 20 results where it previously returned 0.

---

## Root cause (from HNSW1)

`idx_kb_chunks_embedding_hnsw` indexes `embedding` only. The HNSW traversal is global across all tenants. RLS applies `org_id = current_org_id()` as a post-filter on ANN candidates. When a tenant's rows are a minority of the neighbourhood (org-b held 7,500 of 30,000 rows), the 393 HNSW candidates were all from seed-org; the RLS filter discarded every one; the query returned 0 rows against a LIMIT of 20.

---

## Fix

**Migration:** `0703_kb_chunk_search_function.sql` (journal idx 521, when 1798000020000).

Creates `app.search_kb_chunk_ids(p_vec vector, p_limit integer) RETURNS SETOF integer`, `SECURITY DEFINER`, owned by `neondb_owner` (BYPASSRLS role). The function uses a `MATERIALIZED` CTE to force the planner to materialize the org's rows first (sequential scan of org_id = current_org_id()), then sort the materialized set by distance. This prevents the HNSW index from being chosen for the ORDER BY — without materialization the planner still used HNSW globally even inside SECURITY DEFINER and returned 0 rows.

Five safety properties are enforced:
1. Org identity comes from `app.current_org_id()` inside the function — never a parameter. Calling without the GUC fails `42501`.
2. Returns chunk IDs only — never embedding data or content.
3. The caller's outer query still runs under RLS and applies all ACL predicates (space membership, `acl_revision` gate, status, page visibility).
4. `REVOKE ALL ON FUNCTION … FROM PUBLIC; GRANT EXECUTE … TO streamline_app`.
5. `p_limit` bounds the SRF so the materialized set is never fully returned unbounded.

**Why MATERIALIZED CTE is required:** A plain `SELECT … WHERE org_id = current_org_id() ORDER BY embedding <=> p_vec LIMIT n` inside the SECURITY DEFINER function still chose the HNSW index (verified: first attempt returned 0 rows for org-b). The `WITH org_chunks AS MATERIALIZED (…)` creates an optimization fence — the inner scan is executed before the ORDER BY is planned, so the distance sort is over the 7,500 materialized org-b rows instead of traversing the global 30,000-row HNSW graph.

---

## Call sites updated

Three methods in `backend/src/modules/kb/retrieval/kb-search.service.ts` now call `app.search_kb_chunk_ids` via `db.execute(sql\`SELECT app.search_kb_chunk_ids(${vector}::vector, ${cap}) AS id\`)` and filter the returned IDs in the RLS-gated outer query:

- `articleVectorCandidates` — article ANN candidates; replaced `eq(kbArticleChunks.orgId, orgId)` with `inArray(kbArticleChunks.id, chunkIds)`
- `pageVectorCandidates` — wiki page ANN candidates; same swap
- `retrieveTopSources` — source chunk ANN candidates; same swap

In all three, the ACL predicates (space membership, `eq(kbArticleChunks.aclRevision, kbArticles.aclRevision)` join, status, visibility) remain in the outer query which runs under RLS. The `acl_revision` gate has no NULL-skipping arm.

`retrieveAttachmentSnippets` is unchanged: its scope filter (`articleId IN (...)` or `pageId IN (...)`) is highly selective, causing the planner to use `idx_kb_chunks_org_article` / `idx_kb_chunks_org_page` rather than HNSW, so the under-retrieval bug does not manifest there.

---

## Measured before/after (as `streamline_app` with GUC inside transaction)

| Scenario | Before fix | After fix |
|---|---|---|
| Seed-org ANN LIMIT 20 (scenario A) | 20 rows | 20 rows |
| Org-b ANN LIMIT 20 — direct query (scenario C) | **0 rows**, 393 candidates removed by RLS | 0 rows (unchanged — direct HNSW still broken) |
| Org-b via `app.search_kb_chunk_ids` LIMIT 20 (scenario D) | — | **20 rows** ✓ |
| `app.search_kb_chunk_ids` without GUC | — | 42501 error ✓ |
| Cross-tenant leakage | 0 | 0 |

Scenario D plan (org-b, LIMIT 20):
```
ProjectSet  (actual time=48.141..48.237 rows=20 loops=1)
  Buffers: shared hit=22680
```
The 22,680 buffer hits correspond to a sequential scan of org-b's 7,500 rows (materialized), then a distance sort. Result is exact, not approximate.

---

## Files changed

- `backend/migrations/0703_kb_chunk_search_function.sql` — new migration
- `backend/migrations/meta/_journal.json` — entry added (idx 521, when 1798000020000)
- `backend/src/modules/kb/retrieval/kb-search.service.ts` — three vector candidate methods updated
- `backend/scripts/measure-hnsw-plan.mjs` — scenario D added for before/after comparison

---

## Migration discipline

`node src/scripts/check-migration-discipline.mjs` exits 0. The migration includes `SET lock_timeout`, has no FK without NOT VALID, no SET NOT NULL, and has a journal entry with strictly increasing `when` and unique `idx`.
