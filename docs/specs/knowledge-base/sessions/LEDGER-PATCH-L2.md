# LEDGER-PATCH-L2 — S04, S05

Resumed after the previous L2 instance was killed by an API spend limit. Its work was **not** lost:
a peer session committed the whole backend tree as `2d416ef57` while this instance was starting, so
the untracked specs named in the brief (`kb-page-text-query.spec.ts`,
`knowledge-collection-owner-scope.spec.ts`) and the `knowledge-collection.service.ts` edit are now
tracked. Nothing was redone.

**Box count.** The brief said 19 + 6 = 25. The ledger under `## Slices` actually carries
**7 boxes in S04** (lines 548–554) and **6 in S05** (lines 573–578) = **13**. All 13 carry a verdict
below. The "19" appears to be S04's 7 boxes plus the 12 `## Cross-cutting invariants` boxes, which
sit *above* `## Slices` and are not lane territory.

---

## The BE-81 UNION measurement — the prior instance was right, and its fix is the right one

The killed instance's last words were *"The UNION is measurably worse. Let me test a third shape —
per-branch ordered limits — before deciding the fix."* I re-established the measurement from zero.

**Method.** `D:/agent-work/kb-be81-explain5.mjs` (derived from the harness the prior instance left at
`kb-be81-explain.mjs`, extended with a fourth shape). Production Aurora. 50,000 `[e2e]`-prefixed
`kb_pages` and 100,000 `kb_page_grants` planted **inside a transaction that is then rolled back**
(`kb_page_grants` is empty in production because no writer exists in the product, so the grant branch
cannot be measured any other way). `ANALYZE` on both tables inside the transaction.
`set_config('app.organization_id', …, true)` + `SET LOCAL ROLE streamline_app`, confirmed
`bypassrls=false` — an admin role has BYPASSRLS and prints a plan the app never gets.
`EXPLAIN (ANALYZE, BUFFERS)`, three runs, measured in **buffers** not milliseconds (BE-77).

Shape D is the SQL emitted by the live `KnowledgeCollectionService.listPages` itself, captured
through a proxy `Db`, and serves as the anti-vacuity control that shapes A–C are not strawmen.

| Shape | top-node buffers | exec time | grant lookup |
|---|---:|---:|---|
| **A.** pre-BE-81 `OR` (one query, grant arm as `IN (subquery)`) | 1,341 | 38.5 ms | **Seq Scan on `kb_page_grants`, 100,000 rows** |
| **B.** `UNION` with **unbounded** branches — *what the prior pass shipped citing BE-81* | **4,742** | **267 ms** | **Seq Scan on `kb_page_grants`** |
| **C.** `UNION` with **per-branch `ORDER BY` + `LIMIT`** — *shipped today* | **290** | 0.95 ms | `idx_kb_page_grants_org_page_live`, 51 searches |
| **D.** live service SQL (control) | 290 | 0.96 ms | identical plan to C |

Runs 2 and 3 reproduced every number to within 1%.

**The verdict.** The killed instance's measurement was correct: the naive `OR`→`UNION` split it
inherited was **3.5× more buffers and 7× slower than the `OR` it replaced**. BE-81 does not win by
default — an unbounded `UNION` branch must materialise *every* visible row before the outer `LIMIT`
can apply, because the `HashAggregate` that implements `UNION`'s dedupe is a blocking node and the
planner cannot push a limit through it. That is strictly worse than the `OR`, whose single `Limit`
does stop early.

**Its hypothesis was also correct, and is already in the tree.** Pushing `ORDER BY` + `LIMIT n+1`
into each branch (`knowledge-collection.service.ts:168-179`) lets each branch walk
`idx_kb_pages_org_updated_keyset` and stop at 51 rows, turning the grants Seq Scan into 51 index
searches. That is **4.6× fewer buffers than the `OR`** and 16× fewer than the unbounded `UNION`.

It is also *correct*: a row in the global top-`n` of the union is in at least one branch, and within
that branch it ranks ≤ `n`, so no row the unbounded form would return is lost.

**So the UNION is not reverted.** The numbers say keep it — but only in shape C. Shape B, which is
what "split the OR into a UNION per BE-81" produces if you stop reading there, is a regression.
Pinned by `knowledge-collection.service.spec.ts` → *"bounds each UNION branch with its own ORDER BY
and LIMIT, because the outer LIMIT cannot be pushed into a set operation and the branches would
otherwise materialise every visible row"* and *"orders each UNION branch by the real, table-qualified
columns…"*.

Fixture hygiene verified after rollback: `kb_pages` for the org back to 12, zero `[e2e]` rows
anywhere, `kb_page_grants` back to 0, and ids 4,5,6,7,14,15,16,17 all still present and untouched.

---

## Second production finding: the FTS GIN index is dead under RLS

The ledger's existing S05 evidence says *"No migration needed: the `kb_pages.fts` GIN index already
exists."* The index does exist. **The application role cannot use it.** Same method as above —
100,000 pages planted and rolled back, `EXPLAIN (ANALYZE, BUFFERS)`:

| role | buffers | exec | `idx_kb_pages_fts` |
|---|---:|---:|---|
| `streamline_admin` (BYPASSRLS) | 375 | 1.4 ms | **USED** |
| `streamline_app` (RLS live) | 2,952 | 38.5 ms | **not used** |
| `streamline_app`, `enable_seqscan`+`enable_indexscan` off | 4,649 | 72.7 ms | **still not used** |

The `kb_pages` policy qual is
`(org_id = app.current_org_id_or_null()) OR (public_token_hash = app.current_public_token_or_null())`
and `pg_proc.proleakproof` is **false** for both functions. A non-leakproof security qual forbids
promoting `fts @@ <tsquery>` to an index condition, so it is demoted to a `Filter` — the forced plan
removes 99,911 rows by Filter rather than touching the GIN index. `ALTER FUNCTION … LEAKPROOF` is
unavailable: it needs superuser, and `streamline_admin` has `rolsuper = false` here.

**This is the measurement the "the GIN index already exists" line was standing in for, and it is
what measuring as the owner gets you.** 7.9× buffers, invisible to an admin-role EXPLAIN.

The repo already has the answer pattern — `app.search_kb_page_ids(text, integer)` (migration 0498),
`SECURITY DEFINER`, id-only, used today by the help-centre article surface
(`backend/src/modules/kb/core/kb-article-keyword-search.ts:26`). It is **not** used by either page
search path (`retrieval/kb-page-search-query.service.ts:114`, `wiki/kb-pages.service.ts:455`), and
it cannot be reused as-is because it hardcodes `websearch_to_tsquery`, which cannot express the
`term:*` prefix terms `kbPagePrefixTsQuery` builds — reusing it would silently narrow every prefix
search to whole words.

**Migration authored, not applied, not journalled:**
`backend/migrations/1227_kb_page_fts_tsquery_resolver.sql` +
`backend/migrations/rollback/1227_kb_page_fts_tsquery_resolver.down.sql`, adding
`app.search_kb_page_ids_tsq(tsquery, integer)`.

**Proven inside a rolled-back production transaction** (`D:/agent-work/kb-1227-proof.mjs`): the
migration applied cleanly, then at 100,000 rows as `streamline_app`:

| | buffers | exec |
|---|---:|---:|
| before (`fts @@` inline) | 4,735 | 72.9 ms — 98,921 rows removed by Filter |
| after (resolver prefilter) | 3,824 | **7.3 ms** |
| resolver body alone | 521 | 5.1 ms, 1,101 ids |

**10× faster, identical 51 rows in identical order.** `EXPLAIN` cannot see inside a `SECURITY
DEFINER` function, so the GIN node is not printed — but 521 buffers to find 1,101 of 100,000 rows,
against 4,548 heap blocks for a scan, is only reachable through the index. Anti-vacuity control:
with the tenant GUC cleared the resolver raised **42501**, so the tenant fence holds. After rollback
the function was gone (0 rows in `pg_proc`), zero `[e2e]` pages remained, and ids
4,5,6,7,14,15,16,17 were all present.

### HANDOFF — 1227 is deliberately inert

The call site is **not** landed. A journalled-but-unapplied migration with a live call site is a
deploy landmine, and I may not journal or apply. To finish:

1. Add `1227_kb_page_fts_tsquery_resolver` to `migrations/meta/_journal.json` (next `idx` is 1098).
2. Apply it (IAM wrapper `D:/agent-work/mig-iam.mjs`).
3. **Then** change `retrieval/kb-page-search-query.service.ts:114` and `wiki/kb-pages.service.ts:455`
   to prefilter with `id IN (SELECT app.search_kb_page_ids_tsq(<tsquery>, <cap>))`, keeping the
   existing `fts @@` for `ts_rank` and `ts_headline`.
4. Regenerate `openapi.json` and re-vendor `frontend/contracts/openapi.json` — I changed a
   `@ResponseSchema` (below) and did not regenerate, because that file is shared with seven other
   lanes mid-flight.

---

### S04 — `KnowledgeCollection` + canonical `GET /kb/pages`

- [x] Cursor codec + property tests — SATISFIED: `backend/src/modules/kb/core/collection/kb-page-collection-cursor.ts:1`; property tests `backend/src/modules/kb/core/collection/kb-page-collection-cursor.spec.ts:141`
- [x] Normalized filter schema shared by client and server fixtures — SATISFIED: `backend/src/modules/kb/core/dto/kb.schemas.ts:155`
- [x] `GET /kb/pages` with projection, filters, facets — SATISFIED: `backend/src/modules/kb/core/kb-page-collection.controller.ts:21`
- [x] Lazy tree-children endpoint — SATISFIED: `backend/src/modules/kb/wiki/kb-pages.controller.ts:112`
- [x] Indexes + migration + `EXPLAIN` evidence — SATISFIED: `backend/migrations/1169_kb_page_collection_indexes.sql:11`
- [x] Migrate every consumer off the tree — SATISFIED: `frontend/features/wiki/components/wiki-home-all-pages.tsx:317`
- [ ] Contract tests pinned to shared fixtures — DEFECT FIXED: `backend/src/modules/kb/core/dto/kb-core-response.schemas.ts:87`; test `declares the owner facet in the route's @ResponseSchema, because an undeclared key is stripped by the contract and openapi never learns the field exists` (`backend/src/modules/kb/core/collection/knowledge-collection.service.spec.ts:380`); bite-tested (failed before — `declared.facets?.owner` was `undefined`; passed after)

**Evidence:** *Cursor codec* — `kb-page-collection-cursor.ts` (88 lines) plus five `fc.property` fuzz
assertions at `kb-page-collection-cursor.spec.ts:163,176,189,203,222`: round-trips every
microsecond-timestamp position; every non-nul title position; never exceeds the 512-byte budget for
any title up to the schema cap; never accepts a foreign scope tag for any filter/fingerprint pair;
and an arbitrary byte string either decodes to `null` or round-trips its own re-encoding. On top of
11 hand-written cases. `fast-check` is genuinely exercised here — unlike S01's
`knowledge-page-scope.spec.ts`, which the ledger correctly flags as hand-written only.

*Filter schema* — `kbPageCollectionQuerySchema` is `.strict()` (BE-13) and normalizes every filter
the client can send, including the comma-split `status` list piped into `z.enum(KB_PAGE_STATUSES)`;
`limit` caps at the imported `PAGE_SIZE_CAP` (BE-24) rather than a redeclared constant. There is no
literal fixture *file* shared by both repos, and there need not be: the request half is
machine-arbitrated — the schema generates into `openapi.json`, which is vendored byte-identical to
`frontend/contracts/openapi.json` and gated by `check:contract-drift`. The *response* half is where
the two sides had actually drifted; see the defect below.

*Endpoint* — `COLLECTION_PROJECTION` (`knowledge-collection.service.ts:50-75`) is an explicit
24-column projection with **no `contentText` and no `fts`**, satisfying "page bodies never appear in
list metadata queries" (BE-07); filters at `:117-150`; facets at `:301-332`, computed only when
asked (pinned at `knowledge-collection.service.spec.ts:363`). **Reachable, not merely registered:**
`useKbPageCollection` calls `apiClient.get("/kb/pages", ...)` at
`frontend/hooks/api/kb/page-collection.ts:83`, consumed by
`frontend/features/wiki/components/wiki-home-all-pages.tsx:317` and
`frontend/features/wiki/components/wiki-page-collection-table.tsx:309`, which are rendered by the
app routes `knowledge/wiki/page.tsx`, `wiki/private/page.tsx`, `wiki/shared/page.tsx` and
`wiki/spaces/[spaceId]/page.tsx`. `next.config.ts:83-108` carries no redirect over any of them.

*Lazy children* — `GET /kb/pages/tree` takes `listPageTreeChildrenSchema` and serves one level per
call via `KbPageTreeService.getTreeLevel`; `idx_kb_pages_tree_children` (migration 1205) confirmed
present in production. Reachable: `useKbPageChildrenLevel` at
`frontend/features/wiki/components/page-tree-item.tsx:90`, inside `PageTree`, mounted by
`wiki-shell.tsx` on every `/knowledge/wiki/*` route.

*Indexes* — all six of 1169's indexes are **partial and tenant-leading**, and all six were confirmed
present in production by querying `pg_indexes`: the `(org_id, space_id)` live-page index, three
keyset sort indexes, an owner-leading keyset index, and the deleted-rows index. EXPLAIN evidence was
captured at **10k and 100k** rows as `streamline_app` (`D:/agent-work/kb-s04-scale-explain.mjs`),
fixtures rolled back:

| shape | 10k | 100k |
|---|---:|---:|
| `sort=updated_desc` | 239 buf / 0.89 ms | 289 buf / 0.87 ms |
| `sort=created_desc` | 239 / 0.90 | 289 / 0.93 |
| `sort=title_asc` | 352 / 1.28 | 422 / 1.16 |
| `owner=me` | 4 / 0.09 | 5 / 0.09 |
| `deleted=1` (trash) | 746 / 4.3 | **5,123 / 22.4** |
| `q=` text search | 642 / 13.6 | **8,562 / 143.7** |

The four index-served shapes are **flat** from 10k to 100k — the keyset walk works. Two regressions
the evidence surfaced, which is exactly what this box existed to find. (a) `deleted=1` cannot use
`idx_kb_pages_org_deleted_keyset`: that index sorts by `deleted_at DESC`, and
`KB_PAGE_COLLECTION_SORTS` offers no `deleted_*` sort, so **no code path can reach it**, and trash
listings fall back to a filter scan. (b) `q=` degrades 13x — that is the RLS/GIN finding above, and
1227 is the fix. Both are recorded rather than patched over.

*Off the tree* — every list surface is already on `useKbPageCollection`; the surviving tree hooks
(`useKbPageTreeInfinite`, `useKbPageChildrenLevel`) are the navigation sidebar and its lazy
expansion, which is what a tree is for. One residue: `useKbPagesTree` — a plain `useQuery` against
`/kb/pages/tree` — still existed at `frontend/hooks/api/kb/pages.ts:121` with **zero call sites
anywhere in the repo, tests included**. Deleted. Its query key survives, because
`useKbPageTreeInfinite` and nine mutation invalidations still use it.

*Contract drift (the defect)* — `KnowledgeCollectionService.loadFacets` returns three facet groups
(`status`, `space`, `owner`), the frontend contract `kb-page-collection-schema.ts` **requires** all
three, and the route's declared `@ResponseSchema` declared only two. `ResponseContractInterceptor`
detects drift, but Zod's `z.object()` silently *strips* unknown keys on decode, so an extra key
raises nothing — the declared contract was wrong and no gate could see it. Consequence:
`openapi.json` never described the `owner` facet, so the vendored-spec drift gate had nothing to
compare the frontend's hand-written requirement against; if the backend ever stopped sending
`owner`, the backend would stay silent and the frontend would hard-fail at `parseApiResponse`. Fixed
by declaring it, and pinned by parsing the service's **own output** through the route's declared
schema — stronger than a fixture, which can be wrong in both places at once. Noted, not changed: the
frontend contract types the status facet as `z.string()` where the backend has
`z.enum(KB_PAGE_STATUSES)`; that is the looser-on-the-reader direction, so it cannot break, and
those files are being edited by other lanes.

*Suites* — `npx jest src/modules/kb/core/` gives **22 suites, 287 tests, all passing**.

---

### S05 — Full Search (new route, P0)

- [ ] Shared search/citation result projection (consumed by S16 too) — DECISION-REQUIRED
- [ ] `GET /kb/search` — DEFECT FIXED: `backend/src/modules/kb/core/collection/kb-page-text-query.ts:27`; test `also asks the parser for the untouched query, because stripping punctuation turns ERR-500 into err500 and no document ever produces that lexeme` (`backend/src/modules/kb/core/collection/kb-page-text-query.spec.ts:22`); bite-tested (failed before, passed after)
- [ ] Route + facets + cursor + URL codec — DEFECT FIXED: `frontend/features/wiki/components/wiki-search-page.tsx:138`; test `forwards the verified filter from the URL to the search request, because the backend already accepts it and the counts are otherwise computed and thrown away` (`frontend/features/wiki/components/wiki-search-page.test.tsx`); bite-tested (3 of 5 new tests failed before, 26 pass after)
- [x] Quick find "View all" handoff preserving the query — SATISFIED: `frontend/features/wiki/components/quick-find-dialog.tsx:61`
- [ ] Leakage and recall suites — DEFECT FIXED: `backend/src/modules/kb/retrieval/kb-page-search.spec.ts`; test `sends the untouched query to the parser alongside the prefix terms, because stripping the hyphen turns ERR-500 into err500 and no document produces that lexeme`; bite-tested (failed with the tokenizer reverted, passes restored)
- [x] All six states + keyboard navigation evidence — SATISFIED: `frontend/features/wiki/components/wiki-search-page.tsx:203`

**Evidence:** *Route path deviation, confirmed by reading both handlers.* The slice asks for
`GET /kb/search`; that path already exists and serves help-centre **articles** under
`kb:articles:view` (`backend/src/modules/kb/retrieval/kb-search.controller.ts:31`). Page full-search
is `GET /kb/pages/full-search` under `kb:pages:view` (`:38`). Taking the doc's path would have
shadowed a live route, and a duplicate route silently shadows a handler in this stack. The deviation
is correct, and is restated here because the box text still names the old path.

*Exact-identifier defect (the real one).* `kbPagePrefixTsQuery` stripped every non-alphanumeric
character before building prefix terms, so `ERR-500` became the single term `err500:*`. Verified
against production Postgres: `to_tsvector('english','Runbook for ERR-500 outage')` is
`'-500':4 'err':3 'outag':5 'runbook':1` — the lexeme `err500` **does not exist**, so
`to_tsquery('english','err500:*')` returns **false** against a document that plainly contains the
string. Every exact-code, ticket-id, SKU and error-code search returned zero results, on both
`GET /kb/pages?q=` and `GET /kb/pages/full-search`, because both call this one tokenizer. The
previous L2 instance had already written the failing test and was killed before fixing it; I
confirmed the failure, then fixed it by OR-ing `plainto_tsquery('english', <raw>)` onto the prefix
query, and re-verified against production: `ERR-500` now matches, `runbook` still matches, and
`onbo check` still correctly does **not** match a document without "check". Prefix/type-ahead
semantics are unchanged — the new arm only widens. The raw text is capped at 200 characters to match
the schema's own `q` cap. GIN handles a tsquery OR, so the plan class is unchanged.

*Facets — built, returned, and thrown away.* The backend computes **four** facet groups
(`status`, `space`, `type`, `verified`) at `kb-page-search-query.service.ts:144-165`, and
`useKbPageFullSearch` already accepts `spaceId` and `verified` parameters
(`frontend/hooks/api/kb/search.ts:67-89`) — and the page rendered **only** `status` and `type`,
passing neither `spaceId` nor `verified`. The `verified` facet counts were computed on every single
request and discarded: a fourth instance of this module's recurring "fully built, called by nothing"
defect. Wired the `verified` control — URL-backed (`?verified=verified|unverified`, so the filtered
search is shareable), counts rendered from the facet the response already carried, included in
`hasFilters` so the filtered-empty state reports correctly, and cleared by the existing
"clear filters" recovery. Five tests, including the negative control that an absent URL parameter
sends **no** `verified` key — without it the positive test would pass against a version that always
filtered.

**Residual, stated as a decision rather than quietly shipped:** the slice names six facets —
space/status/type/owner/updated/verified. Four now work end to end. `space` needs a space-name
lookup joined to the facet's `spaceId` counts (the data is on the wire; only the picker is missing).
`owner` and `updated` **do not exist backend-side at all** and need a member picker and a date-range
control respectively — the same two controls L5 deliberately deferred for the reviews filter row,
for the same reason (two date inputs overflow the filter row at 375 px). Recommend one decision
covering both surfaces rather than two divergent answers.

*Cursor + URL codec.* The ledger's S05 narrative still says full-search is "a bounded top-N (max 50)
with a reported `hasMore`, not a keyset". That is stale — a keyset cursor over
`(ts_rank, updated_at, id)` exists at `kb-page-search-query.service.ts:45-54, 91-98`, with a scope
tag over query + filters + permission fingerprint, and the frontend consumes it through
`useInfiniteQuery` with an `IntersectionObserver` sentinel (FE-125: no "Load more" button). The
earlier worry that `ts_rank` ordering is unstable does not apply: `ts_rank(fts, tsquery)` is a pure
function of the row and the query, so it moves only when the row's content moves — the same exposure
any `updated_at` keyset already has — and the scope tag restarts the walk if the query or the access
revision changes.

*Quick find handoff.* `frontend/features/wiki/components/quick-find-dialog.tsx:61` pushes
the template string `${KB_SEARCH}?q=${encodeURIComponent(debouncedQ)}`, where `KB_SEARCH` resolves
to `/knowledge/wiki/search`. Offered from a `CommandItem` shown when `page?.hasMore` (`:106`), and
the dialog is mounted by `wiki-shell.tsx` on every `/knowledge/wiki/*` route. The destination route
file `frontend/app/(authenticated)/knowledge/wiki/search/page.tsx` exists, calls `requireSession()`,
wraps in `RequireModule module="kb"`, and is **not** shadowed by any `next.config.ts` redirect —
checked, because an unregistered or shadowed route passes every static gate.

*Leakage and recall.* The existing suite covered the leakage matrix well: org binding in the rendered
SQL, the predicate taken from the canonical seam rather than assembled inline, a non-owner member's
predicate narrowed rather than falling back to tenant-only, and facet queries carrying the **same**
visibility predicate as the item query (a facet count is a disclosure channel). Two arms the Tests
dimension names had **no coverage at all**: "stale/deleted/revoked exclusion" and "exact-code
queries". Added six tests — soft-deleted pages excluded from the item query *and* from the facet
query, archived excluded by default but reachable when asked for by name, plus the two
exact-identifier assertions. Only the exact-identifier one bit (confirmed by reverting the tokenizer
one-liner, watching it fail, then restoring); the deleted/archived five are new characterization
coverage over behaviour that was already correct but unpinned. Revocation is deliberately **not**
re-asserted here: the predicate comes from `buildVisiblePageScope`, revocation is pinned in the
authorization module's own specs, and duplicating the assertion is how one copy gets fixed and the
other does not. Minority-tenant recall is a vector/ANN property and belongs to S16 — this route is
lexical only, which its own test `does not call any embedding provider — the service is lexical only`
pins deliberately.

*Six states + keyboard.* All six resolve through the house `usePageState` + `<PageState>` pair with
`error` passed (FE-41): loading gives `<SearchSkeleton/>`; ready gives the results grid; first-empty
(no query yet) gives an `EmptyState` on the `!queryActive` branch; filtered-empty gives the
`PageState` `empty` prop with `filtersActive`/`onClearFilters`; error gives `ErrorState` with
`ErrorReference` (request id) and `onRetry={refetch}`; denied gives `DeniedView` via
`permission: "kb:pages:view"`. Keyboard: arrow up/down move a focused index and an effect calls
`.focus()` on the matching result ref (`wiki-search-page.tsx:211-229`), covered by three tests at
`wiki-search-page.test.tsx:396,413,433`. **The "browser evidence" half of this box cannot be produced
in this environment** — the capture stack is gone, so an e2e run skips rather than fails, and jsdom
cannot see real focus order or layout overflow. Source and unit evidence is what exists; that is
stated rather than dressed up as a browser run.

*Shared search/citation projection — the decision.* No shared projection module exists. The two
shapes are genuinely different, not duplicated: a search item is
`{ id, title, spaceId, projectId, status, trustState, visibility, contentType, updatedAt, snippet }`
(pages only, carrying a rank-derived snippet and trust metadata), while an Ask citation is a
**discriminated union** over articles *and* pages whose page arm is
`{ kind: "page", pageId, title, spaceId, updatedAt }`, and `KbCitationVisibilityService` projects
only `{ id }` — it is an id-set visibility filter, not a renderer. Unifying them forces either a
`kind` discriminator onto search items that have no second kind, or search-only fields onto the
article arm. **The decision:** does a citation render as a search hit (unify, and the citation union
absorbs `snippet`/`trustState`/`status`), or is a citation a reference that needs only enough to
link (keep them separate and retire this box)? It also crosses into S16, which is another lane's
territory, so it should not be settled unilaterally here. My recommendation is to keep them separate
and retire the box, because the only genuinely shared thing — *which pages may be disclosed* —
already goes through one seam (`buildVisiblePageScope`), and that is the part where duplication
would be a security defect rather than a style one.

*Suites* — `npx jest src/modules/kb/retrieval/` gives **63 suites, 545 tests, all passing**.
`npx jest --runTestsByPath features/wiki/components/wiki-search-page.test.tsx` gives **26 passing**.

---

## Gates run, and gates deliberately not run

| Gate | Result |
|---|---|
| `npx jest src/modules/kb/core/` | 22 suites, 287 tests, pass |
| `npx jest src/modules/kb/retrieval/` | 63 suites, 545 tests, pass |
| `npx jest --runTestsByPath wiki-search-page.test.tsx` | 26 pass |
| `npx tsc --noEmit -p frontend/tsconfig.json` | zero errors in any file I touched |
| `pnpm typecheck` / `check:*` / full `pnpm test` | **not run** — seven other lanes hold this tree |
| `openapi:generate` | **not run** — see HANDOFF; regenerating now would bake in other lanes' half-finished state |
| `pnpm type-check:specs` (frontend) | **not run** (repo-wide). My spec additions use only pre-existing helpers and mocks already in that file |

## Files changed

| File | Change |
|---|---|
| `backend/src/modules/kb/core/collection/kb-page-text-query.ts` | exact-identifier fix; raw query capped at 200 chars |
| `backend/src/modules/kb/core/dto/kb-core-response.schemas.ts` | declare the `owner` facet the service already returns |
| `backend/src/modules/kb/core/collection/knowledge-collection.service.spec.ts` | +1 contract test |
| `backend/src/modules/kb/core/collection/knowledge-collection-owner-scope.spec.ts` | db mock chain repaired for the per-branch-limit UNION |
| `backend/src/modules/kb/retrieval/kb-page-search.spec.ts` | +6 exclusion / exact-identifier tests |
| `backend/migrations/1227_kb_page_fts_tsquery_resolver.sql` | new, **unjournalled and unapplied** |
| `backend/migrations/rollback/1227_kb_page_fts_tsquery_resolver.down.sql` | new |
| `frontend/hooks/api/kb/pages.ts` | delete dead `useKbPagesTree` |
| `frontend/features/wiki/components/wiki-search-page.tsx` | wire the `verified` facet |
| `frontend/features/wiki/components/wiki-search-page.test.tsx` | +5 tests |

No code comments were added (BE-134); no `any`, `as X` or `@ts-ignore`; no git state command was run;
`REQUIREMENT-LEDGER.md` was not touched.
