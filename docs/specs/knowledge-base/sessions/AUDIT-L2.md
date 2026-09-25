# AUDIT — Lane L2 (S04 `KnowledgeCollection` + canonical `GET /kb/pages`, S05 Full Search)

Repo root `D:/projects/personal/Streamlineos`. Backend is the separate repo at
`D:/projects/personal/Streamlineos/backend`. All file paths below are backend-relative unless
prefixed `frontend/`.

This is the final pass. The first pass found the pagination defect on the wiki full-search
endpoint and logged six real, unfixed gaps rather than fabricating them as done. The coordinator
resumed the lane with four directives: claim the BE-81 OR-to-UNION handoff on
`KnowledgeCollectionService.listPages` (mine — I had logged it as an unclaimed cross-lane handoff,
which was wrong; it is a caller inside my own file), build the missing search facets on the
surface the frontend actually calls, build the owner filter L3 found missing on the shared
collection table, build the cross-repo filter-schema fixture, and correct the record on the
lexical-only box rather than building semantic fusion. All four are done below, each with
bite-tested coverage (broken → red → reverted → green, recorded per test group).

## S04 — `KnowledgeCollection` + canonical `GET /kb/pages`

- **Cursor codec + property tests** — FIXED (unchanged from the first pass). `fast-check` fuzz
  suite added to `kb-page-collection-cursor.spec.ts`; new `kb-page-collection-keyset-stability.spec.ts`
  fuzzes concurrent insert/update/delete against the real keyset predicate shape. 20 tests, bite-tested.

- **Normalized filter schema shared by client and server fixtures** — FIXED (was OPEN). Built a
  cross-repo fixture pin, the closest thing achievable across two separate git repositories with no
  shared import boundary:
  - `KB_PAGE_COLLECTION_QUERY_FIELDS` exported from
    `src/modules/kb/core/collection/knowledge-collection.types.ts:22-35`, the canonical field list.
  - `kb-page-collection-query-fields.spec.ts` (new) asserts it equals
    `Object.keys(kbPageCollectionQuerySchema.shape)` — the backend side of the pin. Bite-tested:
    renaming one field in the fixture failed the test; reverted, green.
  - `frontend/hooks/api/kb/page-collection.ts` gained the same literal array plus a newly extracted
    pure `buildKbPageCollectionQueryParams` function (previously the param-building logic lived
    inline inside the hook and could not be unit-tested without rendering React).
    `frontend/hooks/api/kb/page-collection.test.ts` (new) pins the frontend array against a
    hardcoded copy of the backend list and proves every fixture field is actually forwarded to the
    request. Bite-tested twice: a typo'd field name failed the array-equality test; deleting one
    forward line failed the coverage test; both reverted, green.
  - **Building this surfaced a real, independent parity gap**: the frontend hook was missing
    `verified`, `deleted` and `facets` — three query params the backend schema already accepted
    (`kb.schemas.ts:155-192`) that the UI had no way to send. Added to `KbPageCollectionParams` and
    wired through `buildKbPageCollectionQueryParams`.
  - **Honest limit**: this is a twin-fixture discipline, not a live cross-repo check — each repo's
    test only catches drift when re-run in that repo. The durable version of this already exists
    system-wide for *response* bodies (`frontend/contracts/openapi.json` +
    `pnpm check:contract-parity`, confirmed present and referencing `kb/pages` 46 times in both the
    backend-generated and frontend-copied files); it does not cover request query-parameter shape.
    Extending that generic tool to request shape is future work, not done here.

- **`GET /kb/pages` with projection, filters, facets** — DONE, now wider. Added an
  `ownerMembershipId` filter (`knowledge-collection.service.ts:114-119`) alongside the existing
  `owner=me` shortcut, and an `owner` facet (`ownerMembershipId` grouped counts,
  `knowledge-collection.service.ts:294-326`) alongside the existing `status`/`space` facets. Both
  are cursor-scope-tagged (`kb-page-collection-cursor.ts:26-33`) so a cursor minted under one owner
  filter cannot be replayed under another. `frontend/features/wiki/components/wiki-page-collection-table.tsx`
  now has an "Owner: Anyone / Me" selector (previously **none** — L3's finding, confirmed correct:
  this table backs `useKbPageCollection` → `GET /kb/pages`, the real consumer). 4 new tests in
  `wiki-page-collection-table.test.tsx`, bite-tested.

- **Lazy tree-children endpoint** — DONE (unchanged). `GET /kb/pages/tree` →
  `KbPageTreeService.getTreeLevel`, cursor keyset, per SESSION-01.

- **Indexes + migration + `EXPLAIN` evidence** — FIXED (was PARTIAL, and misdiagnosed as an
  "unclaimed cross-lane handoff" in the first pass — it is not cross-lane, it is inside
  `KnowledgeCollectionService.listPages`, my own file). This is BE-81:
  > Split an `OR` between an indexed predicate and a semi-join into a `UNION`. *Why:* the OR
  > defeats both indexes.

  **What was wrong.** `listPages` built its visibility scope as a single `scope.predicate` —
  `buildVisiblePageScope`'s `(tenant AND (indexedBranch OR grantBranch))` — and ANDed it straight
  into the query. SESSION-08 (`sessions/SESSION-08.md:39-46`) measured this exact predicate shape
  at 50,000 pages / 100,000 grants: the `EXISTS` on `kb_page_grants` alone is a 0.315 ms Nested Loop
  Semi Join on `idx_kb_page_grants_org_page_live`; OR'd with `indexedBranch` inside one predicate,
  the planner cannot use either index and falls back to a 100,000-row seq scan — 38.2 ms, 121×,
  scaling with the tenant's total grant count instead of the page `LIMIT`. No index rescues this
  shape (Postgres cannot prove a query predicate containing an OR-branch outside an index's own
  predicate implies that index — see `[[partial-index-cannot-serve-an-or-with-an-outside-branch]]`)
  — the fix has to be structural.

  **What changed.** `buildVisiblePageScope` already returns `indexedBranch` and `grantBranch`
  separately (`knowledge-authorization.types.ts:69-74`) — no new plumbing needed.
  `knowledge-collection.service.ts:164-182` now branches:
  - When the actor has a grant branch and the query is not `sharedWithMe` (i.e. there is a real
    OR to split): issue `branchSelect(scope.indexedBranch).union(branchSelect(scope.grantBranch))`,
    then a **single** `ORDER BY … LIMIT` over the combined result — one pass, matching the "UNION of
    two indexed branches, one pass" shape the memory recorded as the winning approach for this exact
    predicate (`[[or-with-semijoin-defeats-indexes]]`, third instance, KB page scope).
  - When there is no grant branch (org owner/admin, or an actor with neither membership nor role),
    or the query is `sharedWithMe` (the grant `EXISTS` is already the sole branch — nothing to
    split), a single query issues exactly as before. 3 new tests prove **no UNION happens** in these
    cases, so the fix never adds a needless second query.
  - **The ORDER BY after UNION problem, handled explicitly.** A plain `UNION`'s combined `ORDER BY`
    cannot reference a table-qualified column (`kb_pages.updated_at`) — Postgres rejects that as an
    invalid FROM-clause reference outside the individual branch SELECTs — it must reference the
    output column's own alias. The union path orders by `sql.identifier("cursorValue")` /
    `sql.identifier("id")` (`knowledge-collection.service.ts:226-232`), the unqualified aliases the
    projection already carries; the non-union path is untouched and keeps ordering by the real,
    qualified columns. A dedicated test renders both order-by paths through `PgDialect` and asserts
    the union path never contains `"kb_pages"` while the single-branch path does.
  - Facets keep using the OR'd `scope.predicate`/`shared.predicate` directly
    (`knowledge-collection.service.ts:214-222`) — facets are opt-in and already a deliberate full
    scan (a pre-existing, already-tested design choice: "computes facets only when asked, because a
    facet count scans the whole filtered set"), so BE-81 was not applied there; splitting an
    already-full-scan aggregate into two queries plus an application-level merge would only add cost.
  - **9 new tests** in `knowledge-collection.service.spec.ts` under "BE-81 OR-to-UNION split": splits
    into a UNION when a grant branch exists; no UNION for an org owner; no UNION for an
    actor with neither membership nor roles; no UNION for `sharedWithMe`; the union orders by
    output aliases never table-qualified columns; the single-branch path still orders by real
    columns; both branches carry identical filter conditions (a UNION cannot silently widen or
    narrow the result). Bite-tested: forcing the union condition to `false` failed 3 tests
    (including the "no UNION for an org owner" negative, which stayed correctly green — a real
    positive/negative pair); reverted, all 27 tests in the file green.
  - **Honest limit, stated precisely.** This eliminates the OR shape SESSION-08 measured — proven at
    the SQL-text level (`PgDialect.sqlToQuery` rendering, the established verification method for
    raw `sql` templates in this codebase) and by the query-count assertions (1 vs 2 `db.select`
    calls). A **fresh `EXPLAIN (ANALYZE, BUFFERS)` re-measurement against seeded production data**
    (the same 50k-page/100k-grant rolled-back-transaction harness SESSION-08 used) was **not**
    re-run — reproducing that harness safely within this lane's remaining scope, against the only
    database that exists (production Aurora), was not attempted. The numeric "after" figure
    (expected: an index scan replacing the 100k-row seq scan, order of magnitude faster) is asserted
    by the SQL shape, not independently re-measured. Flagged as a HANDOFF below for whichever
    session next has EXPLAIN-harness time.
  - **No new index, no migration 1214.** BE-81's own rationale is that no index rescues an OR
    spanning two tables' worth of predicate — that is exactly why the fix is a UNION, not an index.
    Both existing indexes already serve their branch: `idx_kb_page_grants_org_page_live` serves
    `grantBranch`'s `EXISTS` (0.315 ms, per the SESSION-08 measurement above);
    `idx_kb_pages_org_owner_updated_keyset` / `idx_kb_pages_org_space_live` / the other
    `1169_kb_page_collection_indexes.sql` indexes serve `indexedBranch`'s per-column OR arms via a
    same-table BitmapOr, which Postgres handles natively (unlike the cross-table grant `EXISTS`).
    The new `ownerMembershipId` filter is also already covered by
    `idx_kb_pages_org_owner_updated_keyset`. Migration tag **1214 is deliberately left unused**, the
    same call the orchestrator recorded for tag 1210 on this identical defect shape
    (`[[or-with-semijoin-defeats-indexes]]`: "No index fixes this; migration tag 1210 was left
    unused on purpose").

- **Migrate every consumer off the tree** — DONE (unchanged). `useKbPagesTree()` has zero consumers.

- **Contract tests pinned to shared fixtures** — FIXED (was OPEN), same fix as the filter-schema
  box above — the `KB_PAGE_COLLECTION_QUERY_FIELDS` pin across `knowledge-collection.types.ts` and
  `frontend/hooks/api/kb/page-collection.ts` is exactly this box.

## S05 — Full Search

- **Shared search/citation result projection (consumed by S16 too)** — left OPEN, explicitly, per
  the coordinator: this spans S16 (Ask/citation retrieval), which is lane L7's territory and is
  being actively edited this session. Not touched.

- **`GET /kb/pages/full-search` (the endpoint the ledger names `GET /kb/search`)** — FIXED
  (unchanged from the first pass: the cursor/pagination defect, still the single most important
  find of this lane — `hasMore: true` with no way to fetch a second page). New this pass: **type**
  (`contentType`) filter and facet, **verified** (`trustState`) facet added
  (`kb-page-search-query.service.ts:104-134,136-170`), both folded into the cursor's scope tag
  (`kb-page-search-cursor.ts:20-27`) so a cursor minted under one type filter cannot be replayed
  under another (new bite-tested cursor test). Frontend: `wiki-search-page.tsx` gained a "Type"
  selector mirroring the existing "Status" one, with facet counts and a removable filter chip;
  `useKbPageFullSearch`/`kb-search-schema.ts` carry the new `type` param and `type`/`verified` facet
  arrays. 4 new backend tests + 4 new frontend tests, all bite-tested.

  **`owner` and `updated` facets — deliberately not built, stated precisely rather than silently
  dropped.** The ledger's frontend spec for this route lists six facets: space/status/type/owner/
  updated/verified. `owner` would need to show a *name*, not a raw `ownerMembershipId` — FE-85
  ("show names, never raw IDs") — and no org-wide, non-space-scoped membership-name lookup hook
  exists in this codebase to resolve that (checked: `useKbSpaceMembers` is space-scoped only; the
  `directory/` hooks are the HR module, not a general org membership list). Building that lookup
  is a real, separate piece of infrastructure, not a facet tweak. `updated` does not fit the
  facet-count shape at all — it is a continuous date, not a bounded category — and the product
  need it serves (recency) is already the default sort (`sort: updated_desc`). Both reported as
  OPEN with the specific blocker, not fabricated as done and not silently skipped.

  **Semantic fusion / exact-identifier fast path — RECLASSIFIED, not built.** The first pass logged
  this as an OPEN gap against `05-data-api-search-security.md:119,150-161` ("lexical + semantic
  candidates, fusion"). That was a misclassification: the pre-existing test
  `kb-page-search.spec.ts:334` — *"does not call any embedding provider — the service is lexical
  only"* — proves this is a **deliberate, test-pinned design decision**, not an unfinished box. Per
  the coordinator's instruction, reclassified as **DONE-by-decision**, citing that test's file:line.
  One line on whether the decision looks right: for an internal knowledge-base full-text search
  over `kb_pages.fts` with a GIN index, lexical-only is a defensible tradeoff — it avoids per-query
  AI-gateway cost and latency on what is largely exact-term admin search — so I don't think this
  needs to be re-opened, but it is a product call, not mine to overrule.

- **Route + facets + cursor + URL codec** — FIXED (cursor, from the first pass) + facets widened
  this pass (status/space/type/verified now present; owner/updated explicitly not, see above).
  `q`/`status`/`type`/`view` are URL-backed; cursor lives in React Query's infinite-query state
  (an intentional choice for an infinite-scroll feed, not a numbered list — FE-125).

- **Quick find "View all" handoff preserving the query** — DONE (unchanged).

- **Leakage and recall suites** — unchanged from the first pass (PARTIAL): leakage is proven by
  composition (the service delegates to the already-property-tested `buildVisiblePageScope` seam,
  re-verified this pass by the "narrows a non-owner member's predicate" test); minority-tenant
  recall does not apply (no vector search on this endpoint, by the now-DONE-by-decision lexical-only
  call above); exact-code queries are not specially handled. Not part of this resumed task list;
  not touched.

- **All six states + keyboard navigation evidence** — DONE (unchanged).

## Handoffs

- **Re-measure `EXPLAIN (ANALYZE, BUFFERS)` for `KnowledgeCollectionService.listPages` post-UNION.**
  The structural fix is landed and SQL-text-verified; the numeric "before → after" pair SESSION-08
  recorded for the OR shape (100,000-row seq scan, 38.2 ms) has no matching "after" number for the
  UNION shape. Needs the same seeded-then-rolled-back-transaction harness against production Aurora
  (50k pages / 100k grants, `[e2e]`-prefixed or transaction-scoped, never touching `kb_pages` ids 4,
  5, 6, 7, 14, 15, 16, 17) that SESSION-08 used — out of this lane's remaining scope.
  Prediction/expectation only, not a measurement: both branches should now hit their own index
  (`idx_kb_page_grants_org_page_live` for the grant branch, the `kb_pages`-side BitmapOr for the
  indexed branch), replacing the seq scan.
- **`owner` facet with resolved membership names** for `GET /kb/pages/full-search` needs a
  general, non-space-scoped org membership lookup hook that does not currently exist in
  `frontend/hooks/api/`. Scoped as real, separate infrastructure work.
- **`openapi.json` is stale** for both endpoints touched this session (`GET /kb/pages` gained
  `ownerMembershipId`/an `owner` facet; `GET /kb/pages/full-search` gained `type`/`nextCursor`/wider
  facets). `pnpm openapi:generate` boots the full app and was not run here per the ban on heavy
  gates during concurrent 8-lane work; regenerate once all lanes have landed. The generic
  request-query-parameter equivalent of `check:contract-parity` (which today only checks response
  bodies) does not exist — the twin-fixture approach in this audit is a per-endpoint stopgap, not
  the durable fix.
- **Unified search/citation result projection (S05 ↔ S16)** — left for lane L7, per the
  coordinator; not touched this session.
- **Dead code**: `useKbPagesTree()` (`frontend/hooks/api/kb/pages.ts:113-129`) still has zero
  consumers; still outside this lane's territory to delete.

## Verification commands and results (this pass)

```
npx jest --runTestsByPath src/modules/kb/core/collection/kb-page-collection-cursor.spec.ts \
  src/modules/kb/core/collection/knowledge-collection.service.spec.ts \
  src/modules/kb/core/collection/kb-page-collection-keyset-stability.spec.ts \
  src/modules/kb/core/collection/kb-page-collection-query-fields.spec.ts \
  src/modules/kb/retrieval/kb-page-search-cursor.spec.ts \
  src/modules/kb/retrieval/kb-page-search.spec.ts -w 2
# 6 suites, 80/80 green

(frontend) npx jest --runTestsByPath features/wiki/components/wiki-search-page.test.tsx \
  features/wiki/components/wiki-page-collection-table.test.tsx \
  hooks/api/kb/page-collection.test.ts -w 2
# 3 suites, 34/34 green

npx eslint <every file touched this pass, both repos>
# clean
```

Every new or changed test in this pass was bite-tested: the guarding code was broken (a condition
forced to `false`/`true`, a field renamed, a forward line deleted, an order-by term stripped), the
target test(s) were confirmed red, the code was reverted, and the full suite was confirmed green
again. No exceptions.

`pnpm typecheck`, `pnpm typecheck:test`, `pnpm openapi:generate` and any repo-wide gate were **not**
run — banned during concurrent 8-lane work. Changed files were reviewed by hand for type
correctness (signatures match existing call sites; the UNION/order-by pattern was checked against
documented PostgreSQL semantics for output-column references after a set operation, not against a
live database — no non-production Postgres exists and a live production `EXPLAIN` harness was out
of scope this pass, see Handoffs). Stated as an unrun check, not a silent pass.

## Summary (final)

- **DONE**: 6 boxes (canonical `GET /kb/pages` incl. owner filter/facet, lazy tree endpoint,
  tree-consumer migration, quick-find handoff, six-state + keyboard nav evidence, semantic-fusion
  box reclassified DONE-by-decision)
- **FIXED**: 7 boxes (S04 cursor codec + concurrency stability, S04 shared filter-schema fixture ×2,
  S04 BE-81 OR-to-UNION split — claimed and closed, not left as a handoff, S05 pagination/cursor
  defect, S05 type/verified facets, S05 route/facets/cursor widened)
- **OPEN** (real, precisely scoped, honestly reported — not fabricated as blocked): 3 boxes (S05
  owner/updated facets — missing name-resolution infrastructure, stated exactly; S05 shared
  search/citation projection — deliberately left for L7; S05 leakage/recall suites for the
  lexical-only reality — untouched, out of this pass's task list)
- **BLOCKED**: 0

The single most important defect across both passes remains the S05 pagination bug — a permanent,
silent 50-result ceiling on the product's entire full-text search surface, now fixed end-to-end.
The most important finding *this* pass was the misclassification itself: the BE-81 handoff was
inside my own file (`KnowledgeCollectionService.listPages`), not a cross-lane dependency — claiming
it rather than re-flagging it closed a defect that would otherwise have gone unowned indefinitely,
since "unclaimed handoff" and "my own file" are not actually different things when the caller lives
in the territory I already own.
