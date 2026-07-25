# KB Schema — Indexes, Search Fix & Vector ANN Index — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.
> **⚠️ MIGRATION GATE:** This plan changes the database. Do NOT run `db:generate`/`db:push`/`db:migrate` until Aditya has reviewed and approved the target SQL. Every DB step is behind an explicit approval checkpoint.

**Goal:** Make KB search and RAG correct and scalable with additive, non-breaking schema changes: fix the broken keyword-search path (missing `fts` column), add the missing vector ANN index, and add the missing tenant-scoped composite indexes.

**Architecture:** Three additive phases, each its own migration (CLAUDE.md §19 "one purpose per migration"). Plain btree composite indexes go through Drizzle schema + `db:generate`. The `fts` generated `tsvector` columns + GIN and the HNSW vector indexes are expressed in the Drizzle schema AND land via a reviewed migration; where drizzle-kit can't emit the exact DDL, a hand-authored raw SQL migration mirroring `backend/migrations/0007_search_trgm_indexes.sql` is used. **No column drops, no data rewrites, no API changes** — this plan is purely additive.

**Tech Stack:** Drizzle ORM `0.45.2` · drizzle-kit `0.31.8` · Neon/Postgres · `pgvector` (already installed — `vector(1536)` in use) · `pg_trgm` (already installed via `0007`).

**Migration strategy (decided, repo-aligned):**
- **Btree composite indexes** → add to the Drizzle schema, `db:generate`, review, `db:migrate`. Round-trips cleanly.
- **`fts` generated `tsvector` + GIN** and **HNSW** → add the Drizzle representation (so future `db:generate` sees the DB as in-sync), then generate; if drizzle-kit's emitted SQL does not exactly match the target SQL below, ship a hand-authored raw SQL migration instead (mirroring `0007`) and confirm `db:generate` afterwards reports **no** pending diff.
- **Non-`CONCURRENTLY` is acceptable at current scale** (early-stage; tables are small) — matches `0007`, which uses plain `CREATE INDEX`. `drizzle-kit migrate` wraps each migration in a transaction, and `CREATE INDEX CONCURRENTLY` cannot run in a transaction, so CONCURRENTLY is intentionally NOT used here. At large scale, rebuild these indexes CONCURRENTLY out-of-band (documented in Phase C notes).
- **Verify the vector operator ↔ opclass match** before building HNSW: the query uses `<=>` (cosine distance) → the index must use `vector_cosine_ops`. Confirm in `kb-search.service.ts` / `kb-rag.service.ts` at Phase C step 1.

**Pre-flight facts (verified against source 2026-07-25):**
- `kb_article_chunks.embedding vector(1536)` has only btree indexes (`kb-chunks.ts:48-53`) — **no ANN index**. Every `<=>` query is a seq-scan.
- `kb-search.service.ts` filters/ranks on `fts` for `kb_articles` (L372/376) and `kb_pages` (L296/299), but **neither table has an `fts` column** (verified: the only `fts` in all 18 migrations is on `workspace_search_chunks`, `0000_light_vance_astro.sql:11285`). Keyword search is broken/degraded.
- tsvector column precedent: `workspace-search.ts:5` `const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });`.
- Missing `org_id`-leading composite indexes: `kb_article_restrictions` (`restrictions.ts:28-31`), `kb_article_versions` (`versions.ts:27-29`), `kb_article_translations` (`translations.ts:29-31`), `kb_page_versions` (`page-collab.ts:29-31`), `kb_space_members` (`spaces.ts:56-60`).
- `kb_page_comments.parentId` (`page-collab.ts:41`) is a bare `integer` — no FK, no index. `kb_categories.parentId` (`kb.ts:40-44`) is the `foreignKey({...}).onDelete("set null")` precedent.
- Backend `tsc --noEmit` needs `NODE_OPTIONS=--max-old-space-size=8192` in this sandbox.

---

## File Structure

| File | Change |
|---|---|
| `backend/src/db/schema/kb/restrictions.ts` | + `index("idx_kb_article_restrictions_org_article").on(orgId, articleId)` |
| `backend/src/db/schema/kb/versions.ts` | + `index("idx_kb_article_versions_org_article").on(orgId, articleId)` |
| `backend/src/db/schema/kb/translations.ts` | + `index("idx_kb_article_translations_org_article").on(orgId, articleId)` |
| `backend/src/db/schema/kb/page-collab.ts` | + `index("idx_kb_page_versions_org_page").on(orgId, pageId)`; + FK + index on `kbPageComments.parentId` |
| `backend/src/db/schema/kb/spaces.ts` | + `index("idx_kb_space_members_org_space").on(orgId, spaceId)` |
| `backend/src/db/schema/support/kb.ts` | + generated `fts` tsvector column + GIN index on `kb_articles` |
| `backend/src/db/schema/kb/pages.ts` | + generated `fts` tsvector column + GIN index on `kb_pages` |
| `backend/src/db/schema/support/kb-chunks.ts` | + HNSW index on `kb_article_chunks.embedding` |
| `backend/src/db/schema/workspace-search.ts` | + HNSW index on `workspace_search_chunks.embedding` + GIN on `fts` |
| `backend/migrations/<generated or hand-authored>.sql` | The reviewed migration(s) |

---

### Task 1 (Phase A): Tenant-scoped composite btree indexes

**Files:** `restrictions.ts`, `versions.ts`, `translations.ts`, `page-collab.ts`, `spaces.ts`

- [ ] **Step 1: `restrictions.ts` — add org-leading composite index**

Replace the index array (currently L28-31):

```ts
  (table) => [
    index("idx_kb_article_restrictions_article").on(table.articleId),
    index("idx_kb_article_restrictions_user").on(table.userId),
    index("idx_kb_article_restrictions_org_article").on(table.orgId, table.articleId),
  ],
```

- [ ] **Step 2: `versions.ts` — add org-leading composite index + `index` import**

Line 7 imports currently `uniqueIndex` only; add `index`:

```ts
import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
```

Replace the index array (L27-29):

```ts
  (table) => [
    uniqueIndex("uniq_kb_article_versions").on(table.articleId, table.versionNumber),
    index("idx_kb_article_versions_org_article").on(table.orgId, table.articleId),
  ],
```

- [ ] **Step 3: `translations.ts` — add org-leading composite index + `index` import**

Add `index` to the L1-8 import (alongside `uniqueIndex`), then replace L29-31:

```ts
  (table) => [
    uniqueIndex("uniq_kb_article_translations").on(table.articleId, table.locale),
    index("idx_kb_article_translations_org_article").on(table.orgId, table.articleId),
  ],
```

- [ ] **Step 4: `page-collab.ts` — org-leading index on versions + FK/index on comment parent**

`kbPageVersions` index array (L29-31) — add the composite (`index` is already imported L8):

```ts
  (table) => [
    uniqueIndex("uniq_kb_page_versions_page_version").on(table.pageId, table.versionNumber),
    index("idx_kb_page_versions_org_page").on(table.orgId, table.pageId),
  ],
```

`kbPageComments` — add `foreignKey` to the L1-10 import:

```ts
import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core";
```

Replace the `kbPageComments` index array (L47-49):

```ts
  (table) => [
    index("idx_kb_page_comments_org_page").on(table.orgId, table.pageId),
    index("idx_kb_page_comments_parent").on(table.parentId),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "fk_kb_page_comments_parent",
    }).onDelete("cascade"),
  ],
```

(Cascade: deleting a parent comment removes its replies — correct for threaded comments. Precedent `kb_categories` uses `set null`; here cascade is intended so replies don't orphan.)

- [ ] **Step 5: `spaces.ts` — add org+space composite index on members**

Replace the `kbSpaceMembers` index array (L56-60):

```ts
  (table) => [
    index("idx_kb_space_members_space").on(table.spaceId),
    index("idx_kb_space_members_user").on(table.userId),
    index("idx_kb_space_members_org_role").on(table.orgId, table.role),
    index("idx_kb_space_members_org_space").on(table.orgId, table.spaceId),
  ],
```

- [ ] **Step 6: Typecheck**

Run: `cd backend && NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit`
Expected: no new errors in these files (pre-existing unrelated test-file errors may remain — do not fix them here).

- [ ] **Step 7: Generate the migration (⚠️ approval gate — do NOT db:migrate without sign-off)**

Run: `pnpm -C backend db:generate`
Inspect the newly-created `backend/migrations/00XX_*.sql`. Expected content: six `CREATE INDEX ... ON kb_article_restrictions/kb_article_versions/kb_article_translations/kb_page_versions/kb_space_members ...` plus one `ALTER TABLE kb_page_comments ADD CONSTRAINT fk_kb_page_comments_parent ...` and its index. **Stop here and show the SQL to Aditya.** Only after approval:

- [ ] **Step 8: Apply + commit**

Run (after approval): `pnpm -C backend db:migrate`
Then, in the **backend** repo:
```bash
git add src/db/schema/kb/restrictions.ts src/db/schema/kb/versions.ts src/db/schema/kb/translations.ts src/db/schema/kb/page-collab.ts src/db/schema/kb/spaces.ts migrations/
git commit -m "perf(kb): add org-scoped composite indexes + kb_page_comments.parentId FK

Adds (org_id, <fk>) leading indexes on kb_article_restrictions/versions/translations, kb_page_versions, kb_space_members; FK + index on kb_page_comments.parent_id. Additive only.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2 (Phase B): Fix keyword search — generated `fts` tsvector + GIN

**Files:** `support/kb.ts` (`kb_articles`), `kb/pages.ts` (`kb_pages`)

**Target SQL (the authoritative DDL — the migration must produce exactly this):**

```sql
-- kb_articles
ALTER TABLE "kb_articles" ADD COLUMN IF NOT EXISTS "fts" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("excerpt", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("content_text", '')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS "idx_kb_articles_fts" ON "kb_articles" USING gin ("fts");

-- kb_pages
ALTER TABLE "kb_pages" ADD COLUMN IF NOT EXISTS "fts" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("content_text", '')), 'B')
  ) STORED;
CREATE INDEX IF NOT EXISTS "idx_kb_pages_fts" ON "kb_pages" USING gin ("fts");
```

- [ ] **Step 1: `support/kb.ts` — declare the tsvector customType and the generated column**

Add to imports (after L13 `import { relations } from "drizzle-orm";`):

```ts
import { sql } from "drizzle-orm";
```
Add `customType` and `index` are already imported (`index` yes; add `customType`) to the pg-core import list (L1-12). Then, above `kbArticles` (after the enums, ~L18), add:

```ts
const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });
```

Add the column to `kbArticles` (after `tags` at L67):

```ts
    fts: tsvector("fts").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') || setweight(to_tsvector('english', coalesce(content_text, '')), 'C')`,
    ),
```

Add the GIN index to the `kbArticles` index array (after L83):

```ts
    index("idx_kb_articles_fts").using("gin", table.fts),
```

- [ ] **Step 2: `kb/pages.ts` — same for `kb_pages`**

`sql` is already imported (L12). Add `customType` to the pg-core import (L1-11). Add the tsvector customType near the top (after L15). Add the column to `kbPages` (after `contentText` at L32):

```ts
    fts: tsvector("fts").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(content_text, '')), 'B')`,
    ),
```

Add the GIN index to the `kbPages` index array (after L64):

```ts
    index("idx_kb_pages_fts").using("gin", table.fts),
```

- [ ] **Step 3: Typecheck**

Run: `cd backend && NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit`
Expected: clean for these files.

- [ ] **Step 4: Generate + reconcile against the target SQL (⚠️ approval gate)**

Run: `pnpm -C backend db:generate`
Compare the emitted SQL to the **Target SQL** above.
- If it matches (generated column + `USING gin`) → proceed to approval.
- If drizzle-kit 0.31 does NOT emit the `GENERATED ALWAYS AS ... STORED` expression correctly (a known limitation for custom-type generated columns), **discard the generated file** and hand-author `backend/migrations/00XX_kb_fts_search.sql` containing exactly the Target SQL (mirroring `0007`'s raw-SQL style), register it in `migrations/meta/_journal.json` with the next idx/tag, then re-run `pnpm -C backend db:generate` and confirm it reports **"No schema changes"** (proving the schema representation matches the DB). Show the final SQL to Aditya.

- [ ] **Step 5: Apply + verify the search bug is actually fixed (⚠️ needs a real DB — rule 11)**

After approval + `pnpm -C backend db:migrate`, verify against the dev DB that the previously-broken query now runs:
```sql
SELECT id, ts_rank(fts, websearch_to_tsquery('english', 'test')) AS rank
FROM kb_articles
WHERE fts @@ websearch_to_tsquery('english', 'test')
LIMIT 1;
```
Expected: executes without `column "fts" does not exist`. Repeat for `kb_pages`. (If a live DB isn't reachable in the sandbox, mark "verify in staging" — do NOT claim fixed without this run.)

- [ ] **Step 6: Commit**

```bash
git add src/db/schema/support/kb.ts src/db/schema/kb/pages.ts migrations/
git commit -m "fix(kb): add generated fts tsvector + GIN to kb_articles/kb_pages (search was querying a nonexistent column)

kb-search.service filtered/ranked on fts@@tsquery + ts_rank(fts,...) but neither table had an fts column — keyword search was broken/degraded. Adds a STORED generated tsvector (title/excerpt/content_text, weighted) + GIN index.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3 (Phase C): HNSW ANN index on embeddings

**Files:** `support/kb-chunks.ts`, `workspace-search.ts`

**Target SQL:**
```sql
CREATE INDEX IF NOT EXISTS "idx_kb_chunks_embedding_hnsw"
  ON "kb_article_chunks" USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS "idx_wsc_embedding_hnsw"
  ON "workspace_search_chunks" USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS "idx_wsc_fts_gin"
  ON "workspace_search_chunks" USING gin ("fts");
```

- [ ] **Step 1: Confirm the distance operator matches the opclass**

Run: grep `<=>` / `<->` / `<#>` in `backend/src/modules/kb/kb-search.service.ts` and `kb-rag.service.ts`. Expected: `<=>` (cosine). If instead `<->` (L2) or `<#>` (inner product) is used, change the opclass to `vector_l2_ops` / `vector_ip_ops` accordingly in the Target SQL and schema below. Do not proceed until this matches.

- [ ] **Step 2: `kb-chunks.ts` — add the HNSW index**

Append to the `kbArticleChunks` index array (after L52):

```ts
    index("idx_kb_chunks_embedding_hnsw").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
```

- [ ] **Step 3: `workspace-search.ts` — add HNSW on embedding + GIN on fts**

Append to the `workspaceSearchChunks` index array (after L30):

```ts
    index("idx_wsc_embedding_hnsw").using("hnsw", table.embedding.op("vector_cosine_ops")),
    index("idx_wsc_fts_gin").using("gin", table.fts),
```

- [ ] **Step 4: Typecheck**

Run: `cd backend && NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Generate + reconcile (⚠️ approval gate)**

Run: `pnpm -C backend db:generate`. Compare to Target SQL. drizzle-kit 0.31 supports HNSW via `.using("hnsw", col.op(...))`; if the emitted `WITH (m=..., ef_construction=...)` params are absent, hand-author the raw SQL (Target SQL above) as with Phase B. Show to Aditya.

- [ ] **Step 6: Apply + spot-check the index is used**

After approval + `db:migrate`, on the dev DB:
```sql
EXPLAIN SELECT id FROM kb_article_chunks
WHERE org_id = '<some-org>'
ORDER BY embedding <=> '[...]'::vector LIMIT 6;
```
Expected: plan shows an Index Scan using `idx_kb_chunks_embedding_hnsw` (not Seq Scan). Note: HNSW does not support partial indexes; the `org_id` filter is a post-filter (acceptable at current scale). At large scale, tune `hnsw.ef_search` per query and rebuild the index CONCURRENTLY out-of-band.

- [ ] **Step 7: Commit**

```bash
git add src/db/schema/support/kb-chunks.ts src/db/schema/workspace-search.ts migrations/
git commit -m "perf(kb): add HNSW ANN index on kb_article_chunks + workspace_search_chunks embeddings (+ GIN on wsc.fts)

Every <=> similarity query was a full seq-scan over the chunks table. Adds hnsw(embedding vector_cosine_ops). Unblocks RAG at scale; the pgvector-vs-Qdrant decision is HNSW-now / Qdrant-later per the audit.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: PAGES.md + wrap-up

- [ ] **Step 1: Note the schema work in PAGES.md** (KB Wiki section, dated line — working tree only; do not commit the root repo, which holds unrelated in-flight changes).

```md
> 2026-07-25 — schema pass (additive migrations): generated `fts` tsvector + GIN on kb_articles/kb_pages (fixes keyword search querying a nonexistent column); HNSW index on kb_article_chunks + workspace_search_chunks embeddings (RAG was full-scanning); org-scoped composite indexes on restrictions/versions/translations/page_versions/space_members; FK+index on kb_page_comments.parent_id.
```

- [ ] **Step 2: Full backend build + lint + types (green gate)**

Run: `cd backend && NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit && pnpm lint && pnpm build`
Expected: pass (modulo the 6 known pre-existing unrelated test-file tsc errors).

---

## Deferred to a later plan (NOT in this additive pass — each needs API/service changes + data backfill)

These are real audit findings but are **breaking/data-touching** and must not ride an additive index migration:

1. **`kb_articles.tags text[]` → normalize onto `kb_article_tags`** — the array duplicates the existing junction table. Requires: backfill array → junction rows, switch all reads/writes in `kb-tags.service.ts` / `kb-articles.service.ts`, then drop the column (add-nullable → backfill → cut over → drop, per §19). Pair with the Core-APIs plan.
2. **`support_knowledge_gaps` JSONB FK-arrays** (`sampleTicketIds`, `evidence.relatedTicketIds`, `searchQueries`) → junction/child tables. Requires service changes in `support-kb-gap.service.ts` + backfill.
3. **`kb_articles` mutable counters** (`views`, `helpful_count`, `not_helpful_count`) → aggregate from `kb_events` (avoids row-lock contention at scale). Requires read-path changes + a rollup.
4. **`kb_events` partitioning** (`PARTITION BY RANGE (occurred_at)`, monthly) — do before the table is large; needs a partitioned-table migration + backfill.
5. **`serial` → `generatedAlwaysAsIdentity()`** across KB tables — cosmetic vs §19; defer unless a broader PK migration is undertaken (not worth a standalone breaking change now).

Each of the above gets its own plan with the add-nullable → backfill-in-batches → cut-over → drop sequence and its own tests.

---

## Self-Review

**Spec coverage (schema-audit P0/P1):** HNSW missing → Task 3 ✓. `fts` missing (broken search) → Task 2 ✓. Missing org-composite indexes (5 tables) → Task 1 ✓. `kb_page_comments.parentId` no FK/index → Task 1 ✓. Normalization (`tags[]`, gap JSONB), counters, partitioning, identity PKs → explicitly deferred with rationale ✓.

**Additive-safety:** No column drops, no NOT NULL added to existing columns, no data rewrites. `fts` is a generated STORED column (auto-populated, app never writes it). Every index is `IF NOT EXISTS`. FK on `kb_page_comments.parentId` is validating — safe at current scale; if any orphan `parent_id` exists it will fail loudly (add a pre-check `SELECT count(*) FROM kb_page_comments c LEFT JOIN kb_page_comments p ON c.parent_id = p.id WHERE c.parent_id IS NOT NULL AND p.id IS NULL;` before Task 1 Step 8 — must be 0).

**Migration-mechanism risk:** The generated-tsvector and HNSW DDL may not round-trip through drizzle-kit 0.31; Tasks 2 & 3 each carry an explicit reconcile-or-hand-author checkpoint with the authoritative Target SQL, and a "re-generate reports no diff" proof. The user-approval gate precedes every `db:migrate`.

**Type consistency:** `tsvector` customType matches `workspace-search.ts:5`. `.using("gin"/"hnsw", ...)` and `.op("vector_cosine_ops")` are drizzle-kit 0.31 APIs. Index/`foreignKey`/`customType`/`sql` imports added where first used.

**Placeholder scan:** none — exact schema edits, authoritative Target SQL, and reconcile steps throughout.
