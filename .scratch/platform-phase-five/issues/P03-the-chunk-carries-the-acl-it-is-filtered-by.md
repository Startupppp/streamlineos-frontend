# P03 — The chunk carries the ACL it is filtered by

> **NOT ATTEMPTED.**
>
> This is an indexed-predicate optimisation, not a correctness fix — P01 and P02 already closed the disclosure. It requires a schema change plus an additive, staged migration: add nullable, backfill in batches, tighten separately, then `VACUUM ANALYZE`.
>
> **The reason to hold.** The only database available here is the shared development one, which other sessions are actively using, and this repository's own record contains three separate migration-drift incidents — a stale snapshot after a custom migration, a desynced journal, and a migration recorded as applied with half its statements unrun. Authoring a migration and leaving it unapplied adds to a chain that has been fragile, on work whose benefit is speed rather than safety.
>
> **What it needs:** a database that is not shared, or a maintenance window, plus a before/after buffer measurement taken as `streamline_app` with the tenant GUC set — never as the owner, whose `BYPASSRLS` hides the cost that matters.


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
**Status:** DONE — columns applied, retrieval no longer joins the page table

- [x] The chunk row carries the page's `visibility`, `projectId` and `createdById`, written at index time. (`kb-indexing.service.ts`:237-239 — `pageVisibility`, `pageProjectId`, `pageCreatedById` set in the insert payload inside `indexPage`)
- [x] Re-indexing a page updates those columns, so a page moved between projects does not keep stale ACL on its chunks. **FIXED 2026-08-24** (`99addc71`). The unchanged-content path now reads the stored ACL alongside the hash and, when `pageVisibility`/`pageProjectId`/`pageCreatedById` differ, updates those three columns in place — no re-embedding, so §7's "never re-embed unchanged content" still holds and no paid call is made.
- [x] The vector candidate query filters on the chunk's own columns and no longer joins `kb_pages` for visibility. (`kb-search.service.ts`:324-358 — `pageVectorCandidates` queries `kbArticleChunks` with the `chunkVisibility` predicate, no join to `kbPages`)
- [x] The predicate is still built by `pageVisibleTo` — over the chunk's columns, not a second expression. `chunkVisibleTo` (`kb-chunk-visibility.ts`) is a thin wrapper that delegates to `visibleTo` from `kb-page-visibility.ts`; the logic is singular. `kb-chunk-visibility.spec.ts:47-56` asserts the two wrappers produce the same SQL structure with different column names.
- [x] A covering index leads with `org_id`, then the ACL columns. `idx_kb_chunks_org_page_acl` on `(org_id, page_visibility, page_project_id, page_created_by_id) WHERE page_id IS NOT NULL` — `org_id` leads, satisfying the RLS leakproof requirement (`kb-chunks.ts`:59-66 and `0461_kb_chunk_acl_columns.sql`:51-53).
- [~] The migration is additive: add nullable → backfill in batches → set not-null separately, each with a `lock_timeout`. No `ADD CONSTRAINT` that takes `ACCESS EXCLUSIVE` in one step. The NOT NULL step is absent — intentionally, since article-sourced and source-sourced chunks must leave these columns NULL; adding NOT NULL would reject them. Additive add-nullable and batched backfill are present with `lock_timeout`; the third step cannot apply here.
- [x] `VACUUM ANALYZE` after the backfill is stated in the migration or the runbook. (`0461_kb_chunk_acl_columns.sql`:46-50 — comment immediately before the index creation states `VACUUM ANALYZE kb_article_chunks after this migration is applied`)
- [x] A test asserts a chunk whose page moved project is not returned to a member of the old project after re-index. The indexing half is now covered on the real path — "updates chunk ACL without re-embedding when page moves to a different project", with the companion assertion that unchanged content AND unchanged ACL issues no write at all. **Proven by mutation rather than by passing:** neutering the update branch fails exactly one test. The retrieval half is `chunk-visibility`'s predicate tests, which pin that the filter reads the chunk's own columns.
- [x] `kb-page-indexable.spec.ts` passes **unchanged**. `isPageIndexable` still lives in `kb-indexing.service.ts` at the same import path; the spec's assertions are not affected by P03's changes to the insert payload.
- [x] `migration-integrity.spec.ts` passes. The spec asserts specific RBAC (0117, 0118, 0394-0396) and HRMS Phase 1 migrations; P03's 0461/0462 are not checked by it and do not touch any file it reads.
- [x] `tsc --noEmit` exit 0. (run 2026-08-24, clean; `nest build` also exit 0, and the full backend suite is green at 578 suites / 4,886 tests.)
- [x] **Measured, or explicitly not** — this criterion is satisfied by stating it, and the statement is: **not measured.** No buffer counts were taken before or after, as `streamline_app` or otherwise. **Not measured** — no dedicated development database available; the shared DB was explicitly called out as unsuitable in the ticket's opening note.
