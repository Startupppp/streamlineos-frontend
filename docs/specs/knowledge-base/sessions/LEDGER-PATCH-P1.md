# LEDGER-PATCH-P1 — KB Migration Proof Session

**Date:** 2026-09-27  
**Database:** `replay_test` on `127.0.0.1:5432` (local PostgreSQL 18 + pgvector)  
**Role used for DDL:** `neondb_owner` (superuser, BYPASSRLS)  
**Role used for RLS probes:** `streamline_app` (confirmed functional)

---

## 1. Effective Head of `replay_test`

### Method

`drizzle.__drizzle_migrations` does not exist, so hash comparison is unavailable. Effective head was determined by probing for schema objects created by candidate migrations.

### Journal summary

```
Total journal entries: 1010
Max idx in journal:    1137  (tag: 1370_kb_chunk_acl_dead_index)
Journal HEAD:          idx 1137 — 1370_kb_chunk_acl_dead_index
```

The idx sequence has gaps (1138 possible slots, 1010 actual entries = 128 gaps), consistent with past deletions; per BE-59 these gaps are never renumbered.

### Probe results before this session

| Probe | SQL object | Present? | Conclusion |
|---|---|---|---|
| 1370 NOT applied | `idx_kb_chunks_org_page_acl` on `kb_article_chunks` | YES | 1370 unapplied |
| 1395 applied | `version` column on `build.cycles` | YES | idx 1135 applied |
| 1396 applied | idx 1136 registered; `build.cycles` exists (precondition passes) | n/a | accepted |
| 1350 unjournalled | `idx_kb_pages_org_created_by_id` on `kb_pages` | NO | never ran (unjournalled) |
| 1360 unjournalled | `app.search_kb_chunk_ids` | PRESENT | never dropped (unjournalled) |

### Conclusion

**Before this session:** `replay_test` had applied all 1009 journalled migrations except the final entry `1370_kb_chunk_acl_dead_index` (idx 1137). The effective head was idx 1136 (`1396_build_sprint_cycle_chain_repair`).

**After this session:** This session applied `1370_kb_chunk_acl_dead_index`. `replay_test` is now at the journal HEAD (idx 1137). See section 2 for the full transcript.

### Missing journalled entries (KB-relevant)

Exactly **one** journalled entry was missing from `replay_test` before this session:

| tag | idx | KB-relevant | Status |
|---|---|---|---|
| `1370_kb_chunk_acl_dead_index` | 1137 | YES — drops `idx_kb_chunks_org_page_acl` | Applied this session |

### Unjournalled KB migration files (separate from the above)

These files exist on disk but are NOT in `_journal.json` and therefore never ran during the migration chain replay:

| file | rollback | objects it creates/drops |
|---|---|---|
| `1350_kb_acl_branch_indexes.sql` | none | `idx_kb_pages_org_created_by_id`, `idx_kb_pages_org_created_by_membership_id` on `kb_pages` |
| `1360_retire_app_search_kb_chunk_ids.sql` | `rollback/1360_retire_app_search_kb_chunk_ids.down.sql` | drops `app.search_kb_chunk_ids(vector, integer)` |

---

## 2. Migration 1370 Proof Transcript

### File locations

- Forward: `backend/migrations/1370_kb_chunk_acl_dead_index.sql`
- Rollback: `backend/migrations/1370_kb_chunk_acl_dead_index_rollback.sql`

Note: the rollback file is directly in `backend/migrations/`, NOT in `backend/migrations/rollback/`. Other rollbacks use the convention `rollback/<tag>.down.sql`. This file uses `_rollback.sql` suffix and is a sibling of the forward migration — a naming convention deviation.

### Forward migration text (4 statements split on `-->statement-breakpoint`)

```sql
-- S1
SET lock_timeout = '5s';

-- S2
DO $$
BEGIN
  IF to_regclass('public.kb_article_chunks') IS NULL THEN
    RAISE EXCEPTION '1370 precondition: kb_article_chunks table is absent';
  END IF;
END $$;

-- S3
DROP INDEX IF EXISTS "idx_kb_chunks_org_page_acl";

-- S4
DO $$
BEGIN
  ASSERT NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'kb_article_chunks'
      AND indexname = 'idx_kb_chunks_org_page_acl'
  ), '1370 post-check: idx_kb_chunks_org_page_acl was not dropped';
END $$;
```

### Rollback text (2 statements)

```sql
-- R-S1
SET lock_timeout = '5s';

-- R-S2
CREATE INDEX IF NOT EXISTS "idx_kb_chunks_org_page_acl"
  ON "kb_article_chunks" ("org_id", "page_visibility", "page_project_id", "page_created_by_id", "page_created_by_membership_id")
  WHERE page_id IS NOT NULL;
```

### Apply (first run)

Pre-condition: `idx_kb_chunks_org_page_acl` EXISTS (confirmed via `SELECT indexname FROM pg_indexes ...`).

```
S1: SET                        EXIT:0
S2: DO                         EXIT:0
S3: DROP INDEX                 EXIT:0
S4: DO                         EXIT:0
```

Post-check: `SELECT indexname FROM pg_indexes WHERE ... AND indexname='idx_kb_chunks_org_page_acl'` → **(0 rows)**

### Idempotent re-apply (second run)

```
S1: SET                        EXIT:0
S2: DO                         EXIT:0
S3: NOTICE:  index "idx_kb_chunks_org_page_acl" does not exist, skipping
    DROP INDEX                 EXIT:0
S4: DO                         EXIT:0
```

The `IF EXISTS` clause on S3 allows the second run to complete without error. The post-check DO block (`ASSERT NOT EXISTS`) also passes because the index is already absent. **Migration is idempotent.**

### Rollback

```
R-S1: SET                      EXIT:0
R-S2: CREATE INDEX             EXIT:0
```

Post-check: `SELECT indexname FROM pg_indexes WHERE ... AND indexname='idx_kb_chunks_org_page_acl'` → **idx_kb_chunks_org_page_acl (1 row)**. Index restored.

### Re-apply after rollback

```
FA-S1: SET                     EXIT:0
FA-S2: DO                      EXIT:0
FA-S3: DROP INDEX              EXIT:0
FA-S4: DO                      EXIT:0
```

Index confirmed absent. `replay_test` is now at journal HEAD.

---

## 3. Unjournalled Migrations: 1350 and 1360

### 3.1 Migration 1350 — `1350_kb_acl_branch_indexes.sql`

**Journal status:** NOT in `_journal.json`. Confirmed by `grep "1350" migrations/meta/_journal.json` — the only matches are `when` timestamp values ending in `1350xx`, no tag match.

**Rollback file:** None. `Glob("1350*.sql", path=backend/migrations/rollback)` → no results.

**Objects created by 1350:**
- `idx_kb_pages_org_created_by_id` on `kb_pages(org_id, created_by_id)` WHERE `deleted_at IS NULL`
- `idx_kb_pages_org_created_by_membership_id` on `kb_pages(org_id, created_by_membership_id)` WHERE `deleted_at IS NULL`

**Present in replay_test?**

```sql
SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='kb_pages'
  AND indexname LIKE 'idx_kb_pages_org_created_by%';
-- (0 rows)
```

Neither index exists. As expected: the migration never ran.

**Live code dependency check:**

`grep -rn "created_by" backend/src/modules/kb/ --include="*.ts"` (excluding specs) → no results.

No production TypeScript path queries `kb_pages` filtered by `created_by_id` or `created_by_membership_id` in a way that would plan-fail without these indexes. Missing indexes cause a performance regression only, not a functional failure. This is not a deploy landmine for correctness, but the query plans for ACL-filtered page reads that filter by creator are suboptimal.

**BE-58 violation:** This file is unjournalled. Per BE-58: "an unjournalled file never runs and `db:migrate` still prints success." The fact that `kb_pages.created_by_id` and `created_by_membership_id` columns exist (confirmed: both present in replay_test) means the indexes *could* be created; there is no missing precondition. The migration just never executes.

### 3.2 Migration 1360 — `1360_retire_app_search_kb_chunk_ids.sql`

**Journal status:** NOT in `_journal.json`. Confirmed: `grep "1360" migrations/meta/_journal.json` → only timestamp matches, no tag match.

**Rollback file:** `backend/migrations/rollback/1360_retire_app_search_kb_chunk_ids.down.sql` — exists.

**Function present in replay_test before test:**

```sql
SELECT n.nspname || '.' || p.proname AS fn, pg_get_function_arguments(p.oid) AS args
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'search_kb_chunk_ids';
-- app.search_kb_chunk_ids | p_vec vector, p_limit integer   (1 row)
```

**Non-idempotency test — run 1 (function exists):**

```
S1: SET lock_timeout                                EXIT:0
S2: DO $$ precondition check $$                     ERROR: invalid byte sequence for encoding "UTF8": 0x97
S3: DROP FUNCTION app.search_kb_chunk_ids(...)      DROP FUNCTION   EXIT:0
```

The byte 0x97 is a Windows-1252 em dash (—) in the `RAISE EXCEPTION` message text. PostgreSQL (UTF-8 database) rejects the statement before execution. **The precondition DO block is broken by an encoding defect in the migration file.** The `DROP FUNCTION` (no `IF EXISTS` guard) runs unconditionally.

Confirmed function gone after run 1:
```sql
SELECT n.nspname || '.' || p.proname FROM pg_proc p ... WHERE p.proname = 'search_kb_chunk_ids';
-- (0 rows)
```

**Non-idempotency test — run 2 (function already dropped):**

```
S1: SET lock_timeout                                EXIT:0
S2: DO $$ precondition check $$                     ERROR: invalid byte sequence for encoding "UTF8": 0x97
S3: DROP FUNCTION app.search_kb_chunk_ids(...)      ERROR: function app.search_kb_chunk_ids(vector, integer) does not exist
```

**Migration 1360 is NOT idempotent.** The second run fails at S3 with `ERROR: function app.search_kb_chunk_ids(vector, integer) does not exist`.

Note: The *intended* non-idempotency guard (the precondition DO block that raises "has it already been dropped?") never fires due to the 0x97 encoding defect. The actual non-idempotency arises from the plain `DROP FUNCTION` without `IF EXISTS`.

**Rollback applied** to restore the function:

```
R-S1: SET                EXIT:0
R-S2: CREATE OR REPLACE FUNCTION app.search_kb_chunk_ids    CREATE FUNCTION   EXIT:0
R-S3: REVOKE ALL ON FUNCTION                                 REVOKE   EXIT:0
R-S4: GRANT EXECUTE ON FUNCTION ... TO streamline_app        GRANT    EXIT:0
```

Function restored, replay_test left in pre-1360-test state.

**Live code dependency check:**

```
grep -rn "search_kb_chunk_ids" backend/src/ --include="*.ts"
```

Result: `backend/src/modules/kb/retrieval/kb-vector-minority-tenant.spec.ts:51` — one hit, a spec file that branches on the function name to simulate historic behavior. **No production TypeScript path invokes the function.**

**Deploy landmine assessment:** Since `app.search_kb_chunk_ids` is not called by any production code path, and 1360 is unjournalled (never runs), there is no deploy landmine. The function exists but is inert. Applying 1360 to production would be safe from a call-site perspective; the unjournalled status is still a BE-58 violation.

---

## 4. RLS and Grant Census — 40 KB Tables

Measured on `replay_test` as of 2026-09-27. Probe executed as `neondb_owner`.

| table | rls_enabled | policy (`tenant_isolation`) | `streamline_app` DML grants | `org_id` column |
|---|---|---|---|---|
| kb_ai_interactions | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_article_attachments | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_article_chunks | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_article_comments | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_article_feedback | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_article_restrictions | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_article_tags | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_article_translations | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_article_versions | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_articles | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_categories | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_chat_conversations | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_chat_messages | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_events | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_export_jobs | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_health_items | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_import_jobs | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_indexed_bytes_quota | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_ingestion_checkpoints | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_linked_document_audiences | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_linked_documents | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_page_attachments | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_page_comments | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_page_favorites | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_page_grants | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_page_links | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_page_purge_ledger | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_page_reviews | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_page_templates | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_page_versions | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_page_visits | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_pages | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_research_briefs | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_settings | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_sources | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_space_members | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_spaces | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| kb_tags | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |
| **kb_tenant_backfill_issues** | **NO** | **NO** | SELECT,INSERT,UPDATE,DELETE | **NO** |
| kb_version_restore_audit | YES | YES | SELECT,INSERT,UPDATE,DELETE | YES |

**Summary:** 39/40 tables have RLS enabled, a `tenant_isolation` policy, full DML grants to `streamline_app`, and an `org_id` column. The outlier is `kb_tenant_backfill_issues`.

### 4.1 kb_tenant_backfill_issues: exposure or justified?

**Schema (migration 0653):**
```sql
CREATE TABLE IF NOT EXISTS kb_tenant_backfill_issues (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name text NOT NULL,
  row_id text NOT NULL,
  issue text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Purpose:** A migration-time diagnostics table. Migration 0653 inserts rows describing any cross-tenant integrity issues found during a KB backfill, then raises an exception if any rows exist. If migration 0653 applied successfully (as it must have, given that `replay_test` has 928 tables), the table is guaranteed empty.

**Confirmed empty in replay_test:**
```sql
SELECT count(*) FROM kb_tenant_backfill_issues;  -- 0
```

**Access by `streamline_app` without tenant GUC:**
```sql
-- connected as streamline_app, no SET app.current_org_id:
SELECT count(*) FROM kb_tenant_backfill_issues;  -- 0  (success, no 42501)
```

No RLS fence prevents a tenant session from reading or writing this table.

**`PLATFORM_GLOBAL_TABLES` in `src/scripts/db-verify-rls.mjs`:** Contains 8 entries (all `organization_*` and placement control-plane tables). `kb_tenant_backfill_issues` is NOT listed. `db-verify-rls.mjs` would flag it as an RLS violation.

**Verdict:** This is a **justified platform-global table** in purpose (migration-time diagnostics, not tenant business data, always empty in a healthy database, no production code path reads or writes it) but it is **structurally unregistered** — it is not in `PLATFORM_GLOBAL_TABLES` and therefore fails the `db-verify-rls.mjs` check. The practical cross-tenant exposure is zero (the table is empty and no tenant-facing endpoint reaches it), but the structural omission is a BE-75 violation. It should be added to `PLATFORM_GLOBAL_TABLES` in `src/scripts/db-verify-rls.mjs` with a comment explaining it is a migration-diagnostics artifact that holds no tenant data.

---

## 5. Previously "Blocked-on-a-Database" Ledger Boxes Now Answerable

| Ledger box / note | Previously blocked because | Now answered |
|---|---|---|
| `1370_kb_chunk_acl_dead_index` idempotency proof | No non-production PG to run against | Applied, idempotency confirmed, rollback confirmed, re-apply confirmed (section 2) |
| `1370` rollback exact filename | Could not check without DB | `backend/migrations/1370_kb_chunk_acl_dead_index_rollback.sql` (sibling of forward migration, not in `rollback/` subdir, `_rollback.sql` suffix) |
| `1350` unjournalled — does replay reach head from cold? | No replay environment | `idx_kb_pages_org_created_by_id` absent in replay_test confirms 1350 never ran; no live code depends on these indexes |
| `1360` unjournalled — does running it twice fail? | No non-production PG to run against | Confirmed: second run fails with `ERROR: function app.search_kb_chunk_ids(vector, integer) does not exist`; encoding defect (0x97) also confirmed in precondition DO block |
| KB RLS census — 40 tables | Could not run against a real schema | Full 40-row census now measured (section 4) |
| `kb_tenant_backfill_issues` — genuine exposure or justified? | Could not probe RLS behavior | Confirmed no RLS fence; `streamline_app` reads without GUC; table is empty; NOT in PLATFORM_GLOBAL_TABLES — structural BE-75 violation, practical exposure zero |
| 1360 live code dependency | Spec file vs production code distinction | Confirmed: only `kb-vector-minority-tenant.spec.ts:51` references the function; no production path |

---

## 6. Encoding Defect in 1360

The precondition DO block in `1360_retire_app_search_kb_chunk_ids.sql` contains a Windows-1252 em dash (byte 0x97) in the string `'1360 precondition: app.search_kb_chunk_ids not found — has it already been dropped?'`. This byte is invalid in UTF-8. PostgreSQL rejects the statement before execution with:

```
ERROR:  invalid byte sequence for encoding "UTF8": 0x97
```

Effect: the precondition check NEVER runs. The file was authored on Windows with cp1252 encoding and not converted to UTF-8 before committing. The net behavior is still non-idempotent (the DROP FUNCTION fails on the second run), but the intended guard does not fire and the file would also fail to apply in any migration runner that streams the file bytes directly to PostgreSQL. The file must be re-saved as UTF-8 (replacing 0x97 with the UTF-8 em dash U+2014 = 0xE2 0x80 0x94) before it can be journalled and applied.
