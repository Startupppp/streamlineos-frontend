# 02 — I can find my own private page by searching for it

**What to build:** A person who wrote a private wiki page can find it through search and the assistant can cite it back to them, exactly as the direct read already allows. A member of a project can find that project's pages. Someone outside the project still cannot — because who may retrieve a page is decided once, at query time, by the shared visibility predicate that already has the columns to answer it.

Index eligibility stops being a visibility decision and becomes a lifecycle one: a page is indexable unless it is archived or deleted. The ACL columns captured on the chunk row start carrying real values instead of always being null.

**Blocked by:** 01 — Pin that the direct read and search agree about the same person.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] The author of a private page finds it through search; nobody else does.
- [x] A project member finds that project's pages through search; a non-member does not.
- [x] An org owner continues to find everything.
- [x] Archived and soft-deleted pages remain unindexed.
- [x] The chunk row records the page's visibility, project and creator for newly eligible pages, so the query-time filter stays an indexed predicate rather than a join.
- [x] The parity cells marked in ticket 01 now agree, and the flip is visible in that test's diff.
- [x] An organisation with no eligible content still makes no embedding call — widening eligibility must not open a denial-of-wallet path.
- [x] Backend suite green.

## Todo

- [x] Narrow index eligibility to lifecycle facts only; delete the visibility clause
- [x] Confirm the indexing path writes all three ACL columns for pages that were previously ineligible
- [x] Flip the marked cells in the ticket 01 parity test and confirm they now agree
- [x] Add the negative cases: non-member, archived, soft-deleted
- [x] Verify the short-circuit still fires for an org with no eligible content
- [x] Run the backend suite in shards
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`isPageIndexable` is now lifecycle-only. `cd backend && npx jest --testPathPattern "kb/retrieval"` → **10 suites, 127 tests, all pass.**

**The security question was checked first and the answer was reassuring:** the indexing path already wrote all three chunk ACL columns unconditionally on every chunk insert, so a newly eligible private page gets a correct ACL and `chunkVisibleTo` gates it. There was never a NULL-ACL window.

All 5 disagreeing cells from ticket 01 now agree; the other 25 are structurally unchanged. New negative cases prove a non-author and a non-project-member still retrieve nothing even though the page is now indexed, and that archived and soft-deleted pages remain ineligible so an org with nothing to index makes no embedding call.
