# L09 KB/Search report

**Status:** PARTIAL — headline security fix applied; items 6–9 OPEN (token budget exhausted)

## ACL predicate (quoted)

Before fix — `kb-search.service.ts` line 302 (article vector) and line 373 (page vector):
```
sql`(${kbArticleChunks.aclRevision} IS NULL OR ${kbArticleChunks.aclRevision} = ${kbArticles.aclRevision})`
```
ACL IS enforced inside the JOIN before `.limit(pool * 4)` top-k selection. Tenant, space membership, published status, and restriction filter are all WHERE predicates; `chunkVisibleTo(user, projectIds)` passes the full `visibleTo` predicate directly.

## IS NULL bypass — WAS LIVE, NOW FIXED

- `articleVectorCandidates` JOIN condition changed from `IS NULL OR =` to `eq(kbArticleChunks.aclRevision, kbArticles.aclRevision)`
- `pageVectorCandidates` JOIN condition changed identically
- NULL chunks (indexed before migration 0498) now fail closed — they are excluded from vector search until reindexed.

File edited: `backend/src/modules/kb/retrieval/kb-search.service.ts`

## SECURITY DEFINER seam — VERIFIED DONE

`app.search_kb_article_ids` (migration 0453) and `app.search_kb_page_ids` (migration 0498) are wired in `resolveArticleKeywordCondition` and `resolvePageKeywordCondition`. Global search (`search.service.ts`) does not include KB content — by design, the global bar covers tickets/leads/deals/contacts/clients only.

## Guard audit — VERIFIED DONE (0 undeclared)

`pnpm check:route-classification` reports 3,533 handlers, 0 UNDECLARED. All KB controllers carry `@UseGuards(JwtAuthGuard, PermissionGuard)` at class level with `@RequirePermission` on every handler. `KbPageCommentsController` correctly uses per-method `@UseGuards(PermissionGuard)` to allow auth without permission for future universal reads. `KbPublicPagesController` uses `@Public()`.

## OUT-OF-OWNERSHIP (exact file, line, change)

1. `backend/src/db/schema/support/kb-chunks.ts:53` — change `aclRevision: integer("acl_revision"),` to `.notNull().default(1)` so no future chunk can have a NULL revision.
2. `backend/src/db/schema/support/kb-chunks.ts` — add `pageCreatedByMembershipId: integer("page_created_by_membership_id"),` field so `chunkVisibleTo` can mirror `pageVisibleTo` fully (fixes pre-existing `kb-chunk-visibility.spec.ts` parity failure).
3. Write backfill migration: `UPDATE kb_article_chunks SET acl_revision = (SELECT acl_revision FROM kb_articles WHERE id = article_id) WHERE acl_revision IS NULL AND article_id IS NOT NULL; UPDATE kb_article_chunks SET acl_revision = (SELECT acl_revision FROM kb_pages WHERE id = page_id) WHERE acl_revision IS NULL AND page_id IS NOT NULL;`

## Test summary

`node ./node_modules/jest/bin/jest.js --testPathPattern="kb|search" --maxWorkers=1`: 352 passed, 2 failed (pre-existing), 1 skipped.
- `kb-chunk-visibility.spec.ts` failure: pre-existing parity gap (`pageCreatedByMembershipId` not in chunk table — OUT-OF-OWNERSHIP above).
- `degradation/search-index.spec.ts` failure: pre-existing (not in ownership; live DB state issue).

`check:route-classification`: PASS (0 undeclared). `check:record-access`: PASS. `check:tenant-isolation`: FAIL repo-wide (384 missing, 51% covered — pre-existing; only `ai/core/services/kb-rag.service.ts` is in my scope). `pnpm typecheck`: FAIL on billing/finance (pre-existing, outside ownership).

## OPEN items

- Item 6 (decompose `kb-indexing.service.ts` 690 lines): token budget exhausted before split.
- Items 7–9 (support/CSAT, outbox consumers, tenant isolation coverage): not reached.
- `kb-indexing.service.ts` `indexSource`/`indexAttachment`/`indexPageDocument` do not store `aclRevision` — those chunks have NULL and now fail closed on vector search. A reindex is needed.
