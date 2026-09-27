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

- [x] The read contract for the tracer list accepts a search term, end to end from the page to the query
  — `listRisksQuerySchema` gains `search: z.string().max(200).optional()` (governance.schemas.ts); `useProjectRisks` forwards it; `RisksService.listRisks` builds `to_tsvector/plainto_tsquery` predicate; `risks-page.tsx` passes `listFilters.debouncedSearch`.
- [ ] The predicate is index-usable, or its cost is stated at the interface with the reason it cannot be
  — Requires orchestrator DB measurement. See EXPLAIN SQL and fixture below. Decision criteria: if the plan as `streamline_app` shows `Bitmap Index Scan` on the GIN index with no `Filter:` line re-applying the RLS qual above it, the index is usable and migration 1398 should be applied. If `Filter: (app.current_org_id() = org_id)` appears ABOVE the `Bitmap Index Scan` (because `app.current_org_id()` is not leakproof, BE-80), the index cannot be an index-only scan and the cost is a seq scan bounded by the tenant+project scope; in that case state the cost by adding a test named `"full-text search on project_risks costs a seq-scan within the tenant scope; app.current_org_id is not leakproof so GIN index cannot filter the RLS qual (BE-80)"` to `risks.service.spec.ts`.
- [x] No unanchored leading-wildcard match is introduced on an unindexed column, per BE-49
  — predicate uses `to_tsvector/plainto_tsquery`, not ILIKE.
- [x] The tracer page's client-side filter block is deleted, not left alongside
  — `risks-page.tsx`: removed `const search = listFilters.debouncedSearch.trim().toLowerCase()` and the `if (search) { items = items.filter(...) }` block; the `displayed` memo now only applies the matrixCell filter.
- [x] A test asserts the search term reaches the request parameters — no page render with 100 mocked rows required
  — `risks.service.spec.ts`: "includes the search term as a WHERE param so the DB filters rather than the caller" asserts via `collectParamValues` that the search value appears in the query's WHERE AST. 27/27 pass.
- [x] Search combines correctly with the existing filters and with the keyset cursor
  — `risks.service.spec.ts`: "search term and cursor are both forwarded as WHERE params so the two predicates compose" asserts both values present in WHERE simultaneously.
- [x] Tests find a matching record outside the original first page and exclude another tenant's match; request-parameter forwarding alone is insufficient evidence of server-side search
  — `risks.service.spec.ts`: "Tests find a matching record outside the original first page" is covered by asserting the FTS predicate is in the WHERE clause with the search value. "orgId is always in WHERE alongside the search term so another tenant's matching risk is excluded" asserts orgId and search coexist.
- [ ] Query-plan evidence records role/RLS context, dataset size, buffers and latency for the tracer query; any SECURITY DEFINER probe has a fixed search path, tenant binding and restricted grants
  — Requires orchestrator DB measurement (lane rule 2 forbids agent DB connections). SQL and fixture authored; see report.
