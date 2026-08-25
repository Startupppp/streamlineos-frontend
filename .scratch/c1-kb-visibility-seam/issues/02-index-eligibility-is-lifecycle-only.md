# 02 — I can find my own private page by searching for it

**What to build:** A person who wrote a private wiki page can find it through search and the assistant can cite it back to them, exactly as the direct read already allows. A member of a project can find that project's pages. Someone outside the project still cannot — because who may retrieve a page is decided once, at query time, by the shared visibility predicate that already has the columns to answer it.

Index eligibility stops being a visibility decision and becomes a lifecycle one: a page is indexable unless it is archived or deleted. The ACL columns captured on the chunk row start carrying real values instead of always being null.

**Blocked by:** 01 — Pin that the direct read and search agree about the same person.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The author of a private page finds it through search; nobody else does.
- [ ] A project member finds that project's pages through search; a non-member does not.
- [ ] An org owner continues to find everything.
- [ ] Archived and soft-deleted pages remain unindexed.
- [ ] The chunk row records the page's visibility, project and creator for newly eligible pages, so the query-time filter stays an indexed predicate rather than a join.
- [ ] The parity cells marked in ticket 01 now agree, and the flip is visible in that test's diff.
- [ ] An organisation with no eligible content still makes no embedding call — widening eligibility must not open a denial-of-wallet path.
- [ ] Backend suite green.

## Todo

- [ ] Narrow index eligibility to lifecycle facts only; delete the visibility clause
- [ ] Confirm the indexing path writes all three ACL columns for pages that were previously ineligible
- [ ] Flip the marked cells in the ticket 01 parity test and confirm they now agree
- [ ] Add the negative cases: non-member, archived, soft-deleted
- [ ] Verify the short-circuit still fires for an org with no eligible content
- [ ] Run the backend suite in shards
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
