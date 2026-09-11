-- C187 downstream-deletion probe: SEARCH INDEX (GIN over a GENERATED tsvector) and
-- VECTOR STORE (pgvector HNSW). Both live inside the same Postgres as the row, so the
-- claim under test is: deleting the row removes the entry from the INDEX, not merely
-- from a sequential scan of the table.
--
-- enable_seqscan is turned OFF for every probe query so a "0 rows" result cannot come
-- from a table scan; the plan must use the index.
--
-- Target: LOCAL scratch_head_1010 only. Synthetic org/subject created by compliance:drill.
\set ON_ERROR_STOP on
SET enable_seqscan = off;

\echo '=== 1. SEARCH INDEX: insert a page carrying a unique token ==='
INSERT INTO kb_pages (org_id, title, content_text, created_by_id, status, visibility, content_type)
VALUES ('drill-4373b133', 'zqxwvutsrp erasure probe page',
        'zqxwvutsrp unique token authored by the synthetic erasure subject',
        'drill-user-nonowner-a', 'published', 'org', 'note')
RETURNING id AS probe_page_id \gset

\echo '--- plan must be an index scan on idx_kb_pages_fts:'
EXPLAIN (COSTS OFF) SELECT id FROM kb_pages WHERE fts @@ to_tsquery('english','zqxwvutsrp');
\echo '--- rows found BEFORE delete (expect 1):'
SELECT count(*) AS rows_before FROM kb_pages WHERE fts @@ to_tsquery('english','zqxwvutsrp');

\echo '=== 2. SEARCH INDEX: delete the row, re-query THROUGH THE INDEX ==='
DELETE FROM kb_pages WHERE id = :probe_page_id;
\echo '--- rows found AFTER delete (expect 0):'
SELECT count(*) AS rows_after FROM kb_pages WHERE fts @@ to_tsquery('english','zqxwvutsrp');

\echo '=== 3. VECTOR STORE: insert a chunk with a known embedding ==='
INSERT INTO kb_article_chunks (org_id, source, chunk_index, content, embedding, embedding_model, page_created_by_id)
SELECT 'drill-4373b133', 'page', 0,
       'zqxwvutsrp vector probe chunk',
       ('[' || string_agg(CASE WHEN g = 1 THEN '1' ELSE '0' END, ',') || ']')::vector,
       'probe-model', 'drill-user-nonowner-a'
FROM generate_series(1, 1536) g
RETURNING id AS probe_chunk_id \gset

\echo '--- plan must use idx_kb_chunks_embedding_hnsw:'
EXPLAIN (COSTS OFF)
SELECT id FROM kb_article_chunks
ORDER BY embedding <=> ('[' || (SELECT string_agg(CASE WHEN g = 1 THEN '1' ELSE '0' END, ',') FROM generate_series(1,1536) g) || ']')::vector
LIMIT 1;
\echo '--- nearest-neighbour hit BEFORE delete (expect the probe chunk):'
SELECT id, left(content, 40) AS content FROM kb_article_chunks
ORDER BY embedding <=> ('[' || (SELECT string_agg(CASE WHEN g = 1 THEN '1' ELSE '0' END, ',') FROM generate_series(1,1536) g) || ']')::vector
LIMIT 1;

\echo '=== 4. VECTOR STORE: delete the chunk, re-query THROUGH THE HNSW INDEX ==='
DELETE FROM kb_article_chunks WHERE id = :probe_chunk_id;
\echo '--- nearest-neighbour hits AFTER delete (expect 0 rows):'
SELECT count(*) AS chunks_after FROM (
  SELECT id FROM kb_article_chunks
  ORDER BY embedding <=> ('[' || (SELECT string_agg(CASE WHEN g = 1 THEN '1' ELSE '0' END, ',') FROM generate_series(1,1536) g) || ']')::vector
  LIMIT 1
) t;

\echo '=== 5. Confirm no EXTERNAL search or vector engine exists in this deployment ==='
SELECT count(*) AS tsvector_columns FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_type t ON t.oid=a.atttypid
  WHERE t.typname='tsvector' AND n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped;
SELECT count(*) AS vector_columns FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_type t ON t.oid=a.atttypid
  WHERE t.typname='vector' AND n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped;
