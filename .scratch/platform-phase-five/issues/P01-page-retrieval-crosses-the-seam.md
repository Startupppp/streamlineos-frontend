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
- [ ] **NOT DONE — verified by running the app:** a project-scoped page asked about by a non-member returns no content. Proven only by the predicate equality above, which is strong evidence and not the same evidence.
- [ ] **NOT DONE — measured.** No `EXPLAIN` was run as `streamline_app` with the tenant GUC, so the plan cost of the wider predicate is unknown. P03 is where that matters.

**Note for P02.** This does not close the hole by itself. `pageVisibleTo` still falls to a *permissive* branch when the project list is empty, so a member of zero projects sees every project's pages — through both paths, now consistently. P02 is the fix.
