# 46 — Searching a Build list finds rows the first page does not contain

**What to build:** Typing into a Build list's search box searches the whole list. Today the shared filter module hands a debounced search string to 44 consumers while the read contracts below it have no search field at all, so fourteen pages bridge the gap by filtering the single keyset page of 100 rows they already hold. A risk that exists at row 214 renders as "No risks found" — indistinguishable from the risk not existing.

This is not duplicated code. It is one wrong contract duplicated fourteen times by construction: the shared module's interface promises a capability the seam below it does not have, and every consumer resolves the mismatch the only way available. Push search into the read contract and the query, and deleting the fourteen filter blocks *requires* the seam to gain the field, so the complexity genuinely vanishes.

This ticket is the expand half plus one tracer page. Honouring search the wrong way is a real risk: an unanchored leading-wildcard match on an unindexed column cannot use an index, and the trigram indexes that would help are dead under row-level security because a non-leakproof policy qualifier blocks them. The predicate shape is part of the deliverable, not an afterthought.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The read contract for the tracer list accepts a search term, end to end from the page to the query
- [ ] The predicate is index-usable, or its cost is stated at the interface with the reason it cannot be
- [ ] No unanchored leading-wildcard match is introduced on an unindexed column, per BE-49
- [ ] The tracer page's client-side filter block is deleted, not left alongside
- [ ] A test asserts the search term reaches the request parameters — no page render with 100 mocked rows required
- [ ] Search combines correctly with the existing filters and with the keyset cursor
