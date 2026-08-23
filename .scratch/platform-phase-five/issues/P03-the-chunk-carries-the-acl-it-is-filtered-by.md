# P03 — The chunk carries the ACL it is filtered by

**What to build:** `kb_article_chunks` stores the visibility columns its retrieval filter needs, so the filter is an indexed predicate instead of a rejoin.

`kbArticleChunks` holds `orgId`, `articleId`, `pageId`, `sourceId`, content and embedding — nothing about who may read it. Every vector query therefore joins back to `kb_pages` (or `kb_articles` and `kb_spaces`) to re-evaluate the ACL, on a table that is scanned by distance and then filtered.

That rejoin is also what let the predicates drift in the first place: a filter you have to re-write at each call site is a filter that will eventually be re-written differently. P01 and P02 make the expression singular; this makes it cheap, and removes the join that tempted the divergence.

**Owns (exclusive):**
- `backend/src/modules/kb/kb-indexing.service.ts`
- `backend/src/modules/kb/kb-indexing-hash-guard.spec.ts`
- `backend/src/db/schema/kb/**`
- one new file under `backend/migrations/`

**Blocked by:** P02
**Wave:** 2
**Status:** ready-for-agent

- [ ] The chunk row carries the page's `visibility`, `projectId` and `createdById`, written at index time.
- [ ] Re-indexing a page updates those columns, so a page moved between projects does not keep stale ACL on its chunks.
- [ ] The vector candidate query filters on the chunk's own columns and no longer joins `kb_pages` for visibility.
- [ ] The predicate is still built by `pageVisibleTo` — over the chunk's columns, not a second expression. **If that needs a second function, stop and say so:** two functions is the defect this stream exists to remove.
- [ ] A covering index leads with `org_id`, then the ACL columns. Under RLS an index-only scan is impossible unless `org_id` is in the index, and the planner will refuse the index outright — which reads as "the index didn't help".
- [ ] The migration is additive: add nullable → backfill in batches → set not-null separately, each with a `lock_timeout`. No `ADD CONSTRAINT` that takes `ACCESS EXCLUSIVE` in one step.
- [ ] `VACUUM ANALYZE` after the backfill is stated in the migration or the runbook. A rewrite empties the visibility map and stale stats have cost this codebase 53 → 201,875 blocks on one list.
- [ ] A test asserts a chunk whose page moved project is not returned to a member of the old project after re-index.
- [ ] `kb-page-indexable.spec.ts` passes **unchanged**. Indexing eligibility is a different question from read access and is not in scope.
- [ ] `migration-integrity.spec.ts` passes.
- [ ] `tsc --noEmit` exit 0.
- [ ] **Measured, or explicitly not:** buffers before and after, as `streamline_app` with the tenant GUC set — never as the owner, which has `BYPASSRLS` and whose plans omit the cost that matters. If it was not measured, say so rather than claiming the optimization.
