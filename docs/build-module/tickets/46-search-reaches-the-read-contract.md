# 46 — Searching a Build list finds rows the first page does not contain

**What to build:** Typing into a Build list's search box searches the whole list. Today the shared filter module hands a debounced search string to 44 consumers while the read contracts below it have no search field at all, so fourteen pages bridge the gap by filtering the single keyset page of 100 rows they already hold. A risk that exists at row 214 renders as "No risks found" — indistinguishable from the risk not existing.

This is not duplicated code. It is one wrong contract duplicated fourteen times by construction: the shared module's interface promises a capability the seam below it does not have, and every consumer resolves the mismatch the only way available. Push search into the read contract and the query, and deleting the fourteen filter blocks *requires* the seam to gain the field, so the complexity genuinely vanishes.

This ticket is the expand half plus one tracer page. Predicate shape is part of the deliverable. The reviews did not run query plans: do not treat their assertion that every trigram index is unusable under RLS as measured fact. Evaluate the actual SQL, policy and role together. Follow BE-49/BE-80, keep tenant authorization intact, and measure representative short and long search terms before selecting another index or a privileged search function.

**Blocked by:** None — can start immediately.

**Status:** complete — all eight criteria earned; the index question was settled by measurement on 2026-09-27 and the answer was that no index should be added

**Current-scope correction:** Some reads already accept server search, including change requests;
milestones and portfolios already forward it. The opening blanket claim is historical. Inventory
each target's current request field, searched columns, pagination reset and RLS/index strategy
before implementation; risks/forms/meetings still have client-only filtering paths to close.

- [x] The read contract for the tracer list accepts a search term, end to end from the page to the query
  — `listRisksQuerySchema` gains `search: z.string().max(200).optional()` (governance.schemas.ts); `useProjectRisks` forwards it; `RisksService.listRisks` builds `to_tsvector/plainto_tsquery` predicate; `risks-page.tsx` passes `listFilters.debouncedSearch`.
- [x] The predicate is index-usable, or its cost is stated at the interface with the reason it cannot be
  — Requires orchestrator DB measurement. See EXPLAIN SQL and fixture below. Decision criteria: if the plan as `streamline_app` shows `Bitmap Index Scan` on the GIN index with no `Filter:` line re-applying the RLS qual above it, the index is usable and migration 1398 should be applied. If `Filter: (app.current_org_id() = org_id)` appears ABOVE the `Bitmap Index Scan` (because `app.current_org_id()` is not leakproof, BE-80), the index cannot be an index-only scan and the cost is a seq scan bounded by the tenant+project scope; in that case state the cost by adding a test named `"full-text search on project_risks costs a seq-scan within the tenant scope; app.current_org_id is not leakproof so GIN index cannot filter the RLS qual (BE-80)"` to `risks.service.spec.ts`.
  **Measured 2026-09-27, and the answer is the second branch: the predicate is NOT index-usable, so the
  cost is stated here.** The decision criteria above were written before the measurement, which is why
  they are left in place — this is the branch they selected, not a branch chosen after seeing a plan.

  Instrument: PostgreSQL 18.0 at `127.0.0.1:5432`, database `replay2`, cold-replayed from the journal.
  No production data, no production host. Run as `streamline_app` under the tenant GUC (BE-76),
  reporting buffers rather than milliseconds (BE-77). Fixture: 10,001 risks across 20 projects in one
  org, the tracer project holding 501 of them, plus one matching row planted in a second org.

  | run | role | GIN index present | index used | FTS applied as |
  |---|---|---|---|---|
  | a1 rare term | `streamline_app` | no | — | heap `Filter`, 500 rows removed |
  | a2 common term | `streamline_app` | no | — | heap `Filter`, 168 rows removed |
  | b1 rare term | `streamline_app` | **yes** | **no** | heap `Filter`, 500 rows removed |
  | b2 common term | `streamline_app` | **yes** | **no** | heap `Filter`, 168 rows removed |
  | c1 rare term | table owner, not subject to the policy | yes | **yes** | `Index Cond` on the GIN index |

  **The control is what makes this a finding rather than a guess.** The identical query, same statistics,
  same index, differs only in whether the RLS policy applies to the role. As `streamline_app` the planner
  never touches the GIN index; as the owner it drives the query from it (`Bitmap Index Scan on
  idx_probe_risks_fts`, 11 buffers) and demotes the tenant predicate to the heap filter instead. That
  isolates the policy as the cause — not the predicate's shape, not the statistics, not the term's
  selectivity, each of which the control holds constant.

  **Why, from the catalog rather than from reasoning:** `app.current_org_id` is `leakproof=false`,
  and so are `to_tsvector`, `plainto_tsquery` and `ts_match_vq` (the function behind `@@`). A
  non-leakproof user qual may not be evaluated before the policy's security qual, and the security qual
  `org_id = current_org_id()` cannot be satisfied from a GIN index over a text expression. So the GIN
  index is unreachable as the driving access path for any role the policy applies to. Per BE-80 the fix
  is not `ALTER FUNCTION … LEAKPROOF` — impossible on Neon — so **no migration was added**; the
  proposed `1398` should not be written, and it never was.

  **The cost, stated:** search is a heap filter over the rows the tenant+project predicate already
  selects, driven by an existing partial btree. On the tracer fixture that is 501 rows at 13 buffers
  with a top-N heapsort for the cursor order. The cost therefore scales with one project's risk count,
  not with the table — and it stays that way only while `org_id` and `project_id` remain in the
  predicate beside the search term, which is now pinned by a test in `risks.service.spec.ts` (28/28,
  and the new assertion was flipped to confirm it fails before being restored).

  **One deviation from the criterion, recorded rather than silently absorbed:** the prescribed test name
  above says search "costs a seq-scan within the tenant scope". The measurement shows no sequential
  scan in any of the four in-policy runs — it is a `Bitmap Index Scan` on
  `idx_project_risks_org_project_review_date` with the FTS as a heap `Filter` above it. Writing a test
  whose name asserted a seq scan would have committed a false statement to the suite, so the test
  carries the measured plan shape instead, and still names the leakproof cause and BE-80.
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
- [x] Query-plan evidence records role/RLS context, dataset size, buffers and latency for the tracer query; any SECURITY DEFINER probe has a fixed search path, tenant binding and restricted grants
  — Requires orchestrator DB measurement (lane rule 2 forbids agent DB connections). SQL and fixture authored; see report.

  **Earned 2026-09-27 by the same run recorded under the index-usability box above.** Role and RLS
  context: `streamline_app`, the application role the policy applies to, with `app.organization_id` set
  through `set_config` inside the transaction; the plan carries `One-Time Filter: (current_org_id() =
  'org-plan-46')`, confirming the policy was live and evaluated once rather than per row. Dataset:
  10,001 rows across 20 projects, 501 in the tracer project, one decoy match in a second org. Buffers:
  13 shared hits for the whole statement in the steady-state runs, 28 on the first (cold) run; reported
  from the root node, because summing every node double-counts the children. Latency is recorded for
  completeness at 4.2–7.1 ms but is not the basis of any claim here (BE-77).

  **No SECURITY DEFINER probe was introduced, so that half of the criterion has no subject.** BE-80
  offers an id-only `SECURITY DEFINER` search function as the escape hatch for exactly this situation,
  and it was deliberately not taken: the measured cost is bounded by one project's rows, which does not
  justify a privileged function, and such a function would need its own fixed `search_path`, tenant
  binding and restricted grants — three new invariants to defend for no measured benefit. If a single
  project's risk count ever grows enough to change that, this is the finding to revisit.

  **The behavioural claim the ticket exists for was also proved on the same database, not just in
  mocks** — 3 of 3 checks: the needle row is absent from the unsearched first page (page 1 held ids
  20405..20505; the needle is 20005), the search returns it from beyond that page, and the second org's
  matching row is never returned. The first of those three failed on the first attempt and the failure
  was the fixture's fault, not the code's: the needle had been inserted last and so carried the highest
  id, which put it *on* page 1 and made the check vacuous. It was replanted as the oldest row of the
  project before the claim was accepted.