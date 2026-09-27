# 46 — Searching a Build list finds rows the first page does not contain

**What to build:** Typing into a Build list's search box searches the whole list. Today the shared filter module hands a debounced search string to 44 consumers while the read contracts below it have no search field at all, so fourteen pages bridge the gap by filtering the single keyset page of 100 rows they already hold. A risk that exists at row 214 renders as "No risks found" — indistinguishable from the risk not existing.

This is not duplicated code. It is one wrong contract duplicated fourteen times by construction: the shared module's interface promises a capability the seam below it does not have, and every consumer resolves the mismatch the only way available. Push search into the read contract and the query, and deleting the fourteen filter blocks *requires* the seam to gain the field, so the complexity genuinely vanishes.

This ticket is the expand half plus one tracer page. Predicate shape is part of the deliverable. The reviews did not run query plans: do not treat their assertion that every trigram index is unusable under RLS as measured fact. Evaluate the actual SQL, policy and role together. Follow BE-49/BE-80, keep tenant authorization intact, and measure representative short and long search terms before selecting another index or a privileged search function.

**Blocked by:** None — can start immediately.

**Status:** partial — implementation fragments exist; full acceptance remains unverified (audit 2026-09-27)

**Current-scope correction:** Some reads already accept server search, including change requests;
milestones and portfolios already forward it. The opening blanket claim is historical. Inventory
each target's current request field, searched columns, pagination reset and RLS/index strategy
before implementation; risks/forms/meetings still have client-only filtering paths to close.

- [ ] The read contract for the tracer list accepts a search term, end to end from the page to the query
- [ ] The predicate is index-usable, or its cost is stated at the interface with the reason it cannot be
- [ ] No unanchored leading-wildcard match is introduced on an unindexed column, per BE-49
- [ ] The tracer page's client-side filter block is deleted, not left alongside
- [ ] A test asserts the search term reaches the request parameters — no page render with 100 mocked rows required
- [ ] Search combines correctly with the existing filters and with the keyset cursor
- [ ] Tests find a matching record outside the original first page and exclude another tenant's match; request-parameter forwarding alone is insufficient evidence of server-side search
- [ ] Query-plan evidence records role/RLS context, dataset size, buffers and latency for the tracer query; any SECURITY DEFINER probe has a fixed search path, tenant binding and restricted grants
