# c1 · Make the knowledge-base visibility predicate a seam both paths cross

**Status: shipped with seeded parity coverage.** Re-audited at source 2026-08-26. `visibleTo`, `pageVisibleTo`, and `chunkVisibleTo` govern direct, keyword, and vector retrieval; lifecycle-only indexing, resumable backfill, denial-of-wallet guards, and a seeded production-path parity test are present. The live seeded E2E harness still requires its full application test environment.

## Problem Statement

**As a person who wrote a private wiki page, I cannot find my own page by searching for it.** The direct read returns it to me — `visibleTo` admits `createdById = me` regardless of visibility. Search does not, because the page was never indexed: `isPageIndexable` (`retrieval/kb-indexing.service.ts:23`) still decides eligibility with its own hand-written rule — `status !== 'archived' && (visibility === 'org' || visibility === 'public') && deletedAt === null` — and a `private` or `project`-scoped page fails it. The chunk never exists, so no query-time predicate can return it.

**As a member of project 42, the same is true of my project's pages.** `chunkVisibleTo` captures `pageProjectId` on the chunk row precisely so a project member can retrieve project-scoped pages as a cheap indexed predicate. That column can never be anything but `NULL` in practice, because `isPageIndexable` refused to index any page where it would have been set.

**As a developer, the asymmetry that made this a security bug is still present in reduced form.** Five paths ask "may this be retrieved". Four now cross one seam. The fifth answers independently, at a different time, with a different rule — and because it runs at index time its disagreement is invisible: nothing 500s, nothing 403s, results are simply absent. The review's deletion test still discriminates here. Delete `visibleTo` and four call sites fail to build; delete `isPageIndexable` and indexing silently widens.

## Solution

Index eligibility stops being a visibility decision and becomes a *lifecycle* decision. A page is indexable when it is not archived and not deleted — full stop. Who may retrieve it is answered once, at query time, by `chunkVisibleTo`, which already has the columns to answer it.

The chunk row already carries `pageVisibility`, `pageProjectId` and `pageCreatedById`. Those columns exist to make the ACL an indexed predicate rather than a JOIN. Widening index eligibility is what puts data in them.

## User Stories

1. As the author of a private page, I want to find my own page through search, so that visibility controls who else sees it rather than whether it exists to me.
2. As the author of a private page, I want the assistant to be able to cite my own draft when answering me, so that private work is still my work.
3. As a member of a project, I want that project's pages to appear in my search results, so that project-scoped knowledge is discoverable by the people scoped to it.
4. As a member of a project, I want the assistant to draw on my project's pages, so that the ACL columns captured on the chunk row do something.
5. As someone outside a project, I want that project's pages to stay absent from my results, so that widening the index does not widen disclosure.
6. As someone outside a project, I want the same answer from search that I get from the direct read, so that the two paths cannot disagree about me.
7. As a developer, I want exactly one statement of who may retrieve a page, so that adding a sixth retrieval path cannot introduce a sixth rule.
8. As a developer, I want index eligibility to name only lifecycle facts, so that a future visibility level does not require an index-time edit.
9. As a security reviewer, I want a test that a person outside a project cannot retrieve that project's chunks even though they are now indexed, so that the widening is provably safe.
10. As a security reviewer, I want a test that the direct read and the search path agree for the same person and page, so that the asymmetry cannot return.
11. As an operator, I want the index to be rebuilt for the pages that were previously ineligible, so that the fix reaches content that already exists.
12. As an operator, I want that backfill to be resumable and rate-limited, so that re-embedding does not exhaust the AI budget in one pass.
13. As an org owner, I want to keep seeing everything, so that the owner short-circuit in `visibleTo` is unaffected.
14. As a user of an org with no eligible content, I want no embedding call to be made at all, so that widening eligibility does not create a denial-of-wallet path.

## Implementation Decisions

- **`isPageIndexable` narrows to lifecycle:** `status !== 'archived' && deletedAt === null`. The visibility clause is deleted. The function keeps its name and its call site at `kb-indexing.service.ts:218`.
- **No change to `visibleTo`, `pageVisibleTo` or `chunkVisibleTo`.** They are already correct and already shared. This candidate adds nothing to the seam; it removes the last thing that bypasses it.
- **The chunk ACL columns start carrying real values.** `pageVisibility`, `pageProjectId`, `pageCreatedById` are populated at index time from the page row. Confirm the indexing path writes all three for the newly eligible pages, not just for `org`/`public` ones.
- **A backfill re-indexes previously ineligible pages.** Run per organisation, batched, resumable, and short-circuiting when an org has no such pages. Re-embedding hashes the **source text**, so unchanged content is not re-embedded; the newly eligible pages have no prior hash and will embed once.
- **Retrieval query shape is unchanged.** `pageKeywordCandidates` takes `pageVisibility`; `pageVectorCandidates` takes `chunkVisibleTo(...)`. The predicate stays indexed; widening the index does not change the plan shape.
- **Index sizing is a stated consequence.** The vector index grows by the number of private and project-scoped pages. Record the before/after row count in the backfill so the growth is measured, not assumed.

## Testing Decisions

**What makes a good test here.** Assert what a *person* can retrieve, not which predicate ran. The existing specs in `retrieval/` already read this way and are the prior art: `kb-page-visibility.spec.ts`, `kb-chunk-visibility.spec.ts`, `kb-search-page-visibility.spec.ts`. New cases join those files rather than starting new ones.

- `kb-search-page-visibility.spec.ts` — the author of a private page retrieves it; a non-author does not. A project member retrieves a project-scoped page; a non-member does not. An org owner retrieves both.
- **Parity test.** For a matrix of (page visibility × viewer relationship), the direct read and the search path return the same verdict. This is the test that would have caught the original bug, and it is the one that keeps the two paths honest.
- `kb-indexing` — a page is indexable at every visibility level; an archived page and a soft-deleted page are not. Assert that `pageVisibility`, `pageProjectId` and `pageCreatedById` are written on the chunk for a project-scoped page, because the query-time predicate is now the only thing standing between that chunk and a stranger.
- **Denial-of-wallet.** An organisation whose only pages are ineligible makes no embedding call. Anonymous traffic must never reach the embedder.

## Out of Scope

- The `visibleTo` predicate itself, and the space/audience ACLs on the help-centre article path — different tables, different rules, already crossing their own checks.
- Partitioning or resizing the vector index beyond recording the growth.
- The KB module split (c6) — already shipped; `retrieval/` is where this work lands, which is exactly what the review predicted.

## Further Notes

- **The review's headline finding is fixed.** Anyone reading the review cold will look for four weak predicates and find none. The `chunkVisibleTo` file, with the ACL columns captured on the chunk row, is the review's own recommendation implemented literally.
- **The residue inverts the original severity.** The bug was over-disclosure; what is left is under-retrieval. It is not urgent and it is not a security issue — but it is the same defect (a second statement of one rule) and it is cheap to remove now that the seam it should defer to already exists.
- **Widening the index is the risky half.** Every previously-excluded page becomes reachable by a query-time predicate, so the value of the parity test is high. Do not ship the eligibility change without it.
