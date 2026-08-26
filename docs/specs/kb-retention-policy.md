# KB Chunk Retention Policy

Covers `kb_article_chunks` rows produced by `KbIndexingService` for support articles and wiki pages.

## What is retained and for how long

| Content type | Lifecycle state | Chunks retained? | Rationale |
|---|---|---|---|
| Support article | `published` | Yes — indefinitely while in state | Only published articles are searchable |
| Support article | `draft`, `in_review`, `archived` | No — pruned by next sweep | Non-published articles must not appear in AI retrieval |
| Support article | Parent row deleted | No — pruned by next sweep | FK cascade also fires on hard-delete |
| Wiki page | `published`, `draft`, `in_review` | Yes — indefinitely while in state | All non-archived pages are indexable for internal search |
| Wiki page | `archived` | No — pruned by next sweep | Archived pages are explicitly removed from the index |
| Wiki page | Soft-deleted (`deleted_at IS NOT NULL`) | No — pruned by next sweep | Deleted pages must not surface in retrieval |
| Wiki page | Parent row deleted | No — pruned by next sweep | FK cascade also fires on hard-delete |

Sweep runs via `POST /cron/kb-chunk-retention-sweep` (`CronKbChunkRetentionService.pruneStaleChunks`), lease 600 s, batch 500 rows per org. Source: `backend/src/modules/cron/cron-kb-chunk-retention.service.ts`.

## Legal hold

Not representable in the current schema. Neither `kb_articles` nor `kb_pages` carry a legal-hold column. The `hr_legal_holds` / `hr_legal_hold_items` tables scope to HR records and are not connected to KB entities.

Smallest future change to close this gap: add `legal_hold_at TIMESTAMPTZ` to both `kb_articles` and `kb_pages`; update `pruneArticleChunksForOrg` and `prunePageChunksForOrg` to exclude rows where the parent's `legal_hold_at IS NOT NULL`; update `indexArticle` and `indexPage` to refuse de-indexing held content.

## Restore / rebuild

Re-running ingestion from current source content is safe and idempotent:

- Migration `0510` (`uniq_kb_chunks_article_revision`, `uniq_kb_chunks_page_revision`) enforces uniqueness on `(org_id, content_id, chunk_index, content_revision, acl_revision, embedding_model)`, so a concurrent replay cannot insert duplicate chunks.
- `indexArticle` and `indexPage` both use delete-then-insert inside a transaction, so a fresh run fully replaces stale chunks.
- The `isContentUnchanged` / `getPageChunkState` checks short-circuit when source content is unchanged, making repeated re-indexing cheap.

Re-index endpoints:

| Scope | Endpoint | Permission |
|---|---|---|
| Single article | `POST /support/kb/articles/:articleId/reindex` | `support:kb:manage` |
| All articles for org | `POST /support/kb/reindex-all` | `support:kb:manage` |
| Single wiki page | `POST /kb/pages/:pageId/reindex` | `kb:pages:manage` |
| All wiki pages for org | `POST /kb/pages/reindex-all` | `kb:settings:manage` |

A full re-index of an org therefore works today by calling `POST /support/kb/reindex-all` for articles and `POST /kb/pages/reindex-all` for pages.

## Erasure propagation

| Target | Covered? | Mechanism |
|---|---|---|
| Chunks — article deleted | Yes | `ON DELETE CASCADE` on `kb_article_chunks.article_id` |
| Chunks — page deleted | Yes | `ON DELETE CASCADE` on `kb_article_chunks.page_id` |
| Chunks — org purged | Yes | `purge-user.mjs` deletes all rows with `org_id = ANY(orgIds)` from every table; `kb_article_chunks` has `org_id` and is covered |
| Chunks — stale lifecycle sweep | Yes | `CronKbChunkRetentionService` (see table above) |
| Cache invalidation | No | `KbIndexingService` does not invalidate any Redis cache after chunk writes or deletes; cached search results may be stale until TTL |
| Export pruning | No | No KB export pruning is wired to article/page deletion |
| Provider-side files | N/A | Vectors are stored in Postgres (`vector` columns), not an external vector database; no provider-side erasure is required |

Cache invalidation is the only actionable gap within normal operations. The smallest fix: call `CacheService.invalidatePattern` (or `invalidateNamespace`) on the org's search cache key after chunk deletions in `KbIndexingService.removeArticleChunks` / `removePageChunks`.

## Milestone snapshots

No measurement of storage overhead from full snapshots has been done. The optimization is not justified (YAGNI) until a concrete measurement shows it is warranted.
