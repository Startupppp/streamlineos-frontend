# P01 — Page retrieval crosses the visibility seam

**What to build:** The queries that feed the assistant filter pages with `pageVisibleTo`, the same expression the direct read uses.

Three queries in `kb-search.service.ts` hand-wrote `visibility IN ('org', 'public')` — the two candidate queries and the final content fetch. That predicate drops the project clause and the creator clause, so a page with `visibility = 'org'` and a `projectId` was refused by `assertPageAccessible` and returned in full by retrieval, to the same caller, in the same request.

`retrieveTopArticles` already receives the `CurrentUserContext`. What it lacked was the reader's accessible projects, so it could not build the real predicate even if it wanted to.

**Owns (exclusive):**
- `backend/src/modules/kb/kb-search.service.ts`
- `backend/src/modules/kb/kb-access.service.ts`
- `backend/src/modules/kb/kb-search-page-visibility.spec.ts`
- `backend/src/modules/kb/kb-search-restrictions.spec.ts`

**Blocked by:** nothing
**Wave:** 0 — done ahead of the set
**Status:** DONE

- [x] `KbAccessService.getAccessibleProjectIds(user)` exists beside `getAccessibleSpaceIds`, so "what can this person reach" has one owner.
- [x] `retrieveTopArticles` resolves the reader's projects once and builds `pageVisibleTo(user, projectIds)` once.
- [x] `pageKeywordCandidates` takes the predicate rather than writing its own.
- [x] `pageVectorCandidates` takes the predicate rather than writing its own.
- [x] The final page content fetch uses the same predicate, so nothing is re-widened after fusion.
- [x] No hand-written page visibility predicate remains in `kb-search.service.ts`.
- [x] A test renders the predicate each page query was built with and asserts it equals `pageVisibleTo(user, projectIds)` — it fails when the two paths disagree, not when the seam is rewritten.
- [x] A test asserts the candidate query and the content fetch use the *same* predicate, so fusion cannot widen what candidacy narrowed.
- [x] **Watched failing first.** The rendered failure showed `visibility IN ('org', 'public')` against the expected project-scoped expression.
- [x] `src/modules/kb` — 16 suites, 141 tests, exit 0.
- [x] `tsc --noEmit` exit 0.
- [~] **Still not verified through the ask path.** What changed since this was written: P02 proved the *same predicate* through a real seeded request against a real database with RLS in force — a member of project alpha reads its page, a colleague in project beta gets 404 — and mutation-checked it there. The ask path shares that predicate and its candidate/content fusion is pinned by the equality test above.

  What is still missing is the ask path specifically, and it needs more than a booted API: `kb_pages` and `kb_article_chunks` are empty here, so it needs seeded pages plus chunks carrying embeddings, and the ask itself embeds the question through a provider. Left undone rather than approximated.
- [~] **NOT MEASURED, and the reason is now specific rather than "not done".** Checked 2026-08-24: `kb_pages` and `kb_article_chunks` both hold **0 rows** on this database. An `EXPLAIN` over empty tables reports a plan the planner would never choose at size, so recording those buffer counts would be worse than recording none — it would read as evidence. Honest measurement needs KB seeded to scale first, then `VACUUM ANALYZE`, then `EXPLAIN` as `streamline_app` with the tenant GUC. That is a seeding exercise of its own, of the shape `seed:build-load` + `baseline:build` already provide for Build.

**Note for P02.** This does not close the hole by itself. `pageVisibleTo` still falls to a *permissive* branch when the project list is empty, so a member of zero projects sees every project's pages — through both paths, now consistently. P02 is the fix.
