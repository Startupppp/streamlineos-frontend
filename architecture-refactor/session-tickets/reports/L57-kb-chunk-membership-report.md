# L57 — KB chunk membership-id gap

**Column added:** `page_created_by_membership_id integer` (nullable, no FK) in `src/db/schema/support/kb-chunks.ts`. The ACL index `idx_kb_chunks_org_page_acl` definition updated to include the column (migration SQL below applies it).

**Index-time population:** `KbIndexingService.indexPage` (`src/modules/kb/retrieval/kb-indexing.service.ts`). `createdByMembershipId` is now fetched from the page query, checked in ACL-change detection, written in the ACL-only UPDATE path, and included in every full INSERT alongside the existing `pageCreatedById`, `pageVisibility`, `pageProjectId`. `getPageChunkState` also returns `pageCreatedByMembershipId` so the stale-check covers it.

**Backfill approach:** SQL-only, batched by 1 000 rows, resumable via a `WHERE page_created_by_membership_id IS NULL` guard; loops until zero rows updated. No JS Date involved — the column is integer. Migration SQL below.

**Buffer measurement:** Requires post-migration run as `streamline_app` with `SET app.organization_id = '<org>'` and `EXPLAIN (ANALYZE, BUFFERS)` on a representative vector search. Measurement was not possible without a live DB connection.

**Tests:** `node ./node_modules/jest/bin/jest.js --testPathPattern="kb" --maxWorkers=1` → 63 PASS, 1 FAIL (`src/modules/public/kb-tenant-isolation.spec.ts`) pre-existing unrelated mock bug. `kb-chunk-visibility.spec.ts` and `kb-indexing-hash-guard.spec.ts` both PASS. `tsc --noEmit` clean. `check:tenant-indexes` 753/753 OK. `check:tenant-isolation` 61-service gap pre-existing (93% covered, unchanged).

---

## OUT-OF-OWNERSHIP — migration SQL (apply in order, one journal entry each)

### Migration A — add column + batched backfill

```sql
-- journal tag: <next-tag>_add-page-created-by-membership-id-to-kb-chunks
SET lock_timeout = '5s';

ALTER TABLE kb_article_chunks
  ADD COLUMN IF NOT EXISTS page_created_by_membership_id integer;

-- Batched backfill: run until 0 rows updated
DO $$
DECLARE
  rows_updated integer;
BEGIN
  LOOP
    UPDATE kb_article_chunks c
    SET page_created_by_membership_id = p.created_by_membership_id
    FROM (
      SELECT c2.id, p2.created_by_membership_id
      FROM kb_article_chunks c2
      JOIN kb_pages p2 ON c2.page_id = p2.id AND c2.org_id = p2.org_id
      WHERE c2.page_id IS NOT NULL
        AND c2.page_created_by_membership_id IS NULL
        AND p2.created_by_membership_id IS NOT NULL
      LIMIT 1000
    ) sub
    WHERE c.id = sub.id;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    PERFORM pg_sleep(0.02);
  END LOOP;
END $$;
```

### Migration B — replace ACL index

```sql
-- journal tag: <next-tag+1>_update-kb-chunks-acl-index
DROP INDEX CONCURRENTLY IF EXISTS idx_kb_chunks_org_page_acl;

CREATE INDEX CONCURRENTLY idx_kb_chunks_org_page_acl
  ON kb_article_chunks (
    org_id,
    page_visibility,
    page_project_id,
    page_created_by_id,
    page_created_by_membership_id
  )
  WHERE page_id IS NOT NULL;
```

> Measure post-index as `streamline_app` with `SET app.organization_id = '<org>'` and `EXPLAIN (ANALYZE, BUFFERS)` on the vector-candidate query. The RLS policy adds `org_id = app.current_org_id()`, so the index must contain `org_id` for an Index-Only Scan to be possible.
