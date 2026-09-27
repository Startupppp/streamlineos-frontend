# Architecture review validation — 2026-09-27

## Scope and evidence rules

Reviewed both supplied reports in full:

- **R1:** Architecture review — StreamlineOS Knowledge Base (document module), `architecture-review-20260926-153104.html`.
- **R2:** Documents module — architecture review, `architecture-review-20260926-224038.html`.

The originals are in `C:/Users/Aditya_Lappy/AppData/Local/Temp/`. This document preserves their finding IDs and decisions so the backlog does not depend on temporary HTML files. Also inspected the requirement ledger, session evidence, `CONTEXT.md`, backend ADR-0001, backend/frontend coding rules, and the reachable implementations.

This was a documentation and verification task. No application code, schema, production data or deployment was changed by this review. Another session was editing and committing concurrently. One recorded source checkpoint was root `ffc97b8ebc3043bdd4a60bad98b43d7812fdb5e5`, backend `91f76c85fd768bd3de59c1811b7c3b43a3f00253`, plus working-tree changes. Test results below describe that changing checkout, not a certified release artifact.

**Completion rule:** check an item only when its code exists, its entire acceptance claim has been verified, and relevant tests pass. Source presence, a migration file, historical green output or a mocked component test cannot close a broader integration/security/deployment claim. Preserve old evidence, but leave unverified acceptance unchecked. The starting ledger's 190 checked / 194 total and older percentage estimates are historical, not current certification.

Use these statuses: **source present**, **targeted tests passed**, **partial/defect**, **evidence pending**, and **conditional/deferred**. `VERIFIED` requires the entire acceptance claim and a recorded source revision/environment. Historical counts in the HTML reports are not current measurements.

The initial review reopened 24 main-ledger checks for defects or incomplete acceptance. Applying the owner's stricter verification rule then reopened another 164 checks as **VERIFY PENDING**, leaving **2 checked / 194 total and 192 open**. Those 164 are not 164 newly discovered implementation failures: their complete acceptance claims have not been freshly proven. The two retained checks cover the scope/fingerprint test implementation and the property-test implementation, inspected and rerun below. Do not infer that only two features are built. The AV backlog adds acceptance detail; do not combine it or historical session counts with the ledger denominator.

## Decisions: accepted, corrected and bounded

| Decision | Verdict and governing correction |
|---|---|
| Modular monolith, independently scaled workers, PostgreSQL source of truth | Keep. First measure connection occupancy, DB calls, query plans, queue age and unit cost. Millions of registered users alone do not justify cells, shards or new services. |
| One canonical authorization module and page-based chunk filtering | Keep. Apply tenant, lifecycle, container access, grants, restrictions and token ceiling consistently. A chunk semi-join removes duplicated ACL facts, but must still be paired with current revision/lifecycle checks and real grant-only retrieval tests. |
| Space is an access boundary | Keep the restrictive rule recorded in `CONTEXT.md`. Current `buildIndexedBranch` applies the space guard only to the org/public branch; creator/owner and explicit-grant branches can still bypass it. Either explicitly document a narrowly scoped administrator exception or require the container guard across all non-administrator branches. Do not silently redefine a share as permission to bypass a private space. Track AV-02. |
| One page-change writer | Keep. The present writer centralizes snapshots, links, mentions and index events, but callers still own revisions and audits. Calling it the complete atomic write contract overstates implementation. Injection alone does not prove every mutating method calls it. Track AV-03. Engagement counters remain separate from authorship/indexing. |
| One retrieval entry point | Keep. It must own scope normalization, one query embedding, candidate selection, passage authorization, provenance and per-source failure outcomes. An empty array must not erase a backend failure. A separate citation presentation policy may narrow display; it must never justify sending unauthorized content to a provider. |
| Global query embedding cache, seven-day TTL, no invalidation | **Correct.** A user query can contain confidential tenant data. Current key omits tenant, provider configuration and preprocessing version; it hashes lowercased/collapsed text while sending differently normalized text to the provider. Default to a tenant-scoped cache keyed by provider/model revision, dimensions, preprocessing version and the exact normalized input actually embedded. Bound TTL/storage, support configuration invalidation and deletion policy, and single-flight concurrent misses. Seven days is a tunable retention choice, not a correctness theorem or a guaranteed 168× saving. Track AV-05. |
| Replace every authorization OR with UNION | **Correct the universal claim.** Keep the measured collection rewrite, but do not mandate it for every query. PostgreSQL can combine indexes for OR; the historical correlated-EXISTS plan was a specific bad plan. Compare OR/EXISTS/UNION using app-role RLS and representative tenants, grant density and sort/filter combinations. Deduplicate overlapping grants and preserve stable ordering before applying the page limit. Track AV-06. |
| One physical page table and explicit variants | Keep the table. R2 conflates a row discriminator with a polymorphic `entity_type/entity_id` foreign reference: they are not the same design. `kb_sources`, HR documents and attachments also have distinct identities/lifecycles. Do not merge them merely to call everything a Document. Centralize variant predicates and expose purpose-specific projections. |
| One canonical document response DTO | Share identity, revision and pagination primitives; keep explicit list/detail/public/citation projections. A universal full document DTO risks leaking fields and loading bodies on lists. Shape parity is tested at the real wire boundary, including the outer envelope. |
| One Page<T> and selectFlatPages | Keep a shared pagination vocabulary. `selectFlatPages` currently returns `T[]`; it does not itself preserve `pages/pageParams` on the selected result. Raw query cache and selected result differ. Keep envelope parsing tests and expose pagination explicitly wherever a consumer needs it. Do not rewrite every endpoint to erase legitimate facet or chat metadata. |
| Help-centre ownership | Support remains the customer/workflow adapter; KB owns content, authorization and indexing. Current help-centre module deregisters duplicate article/category/comment controllers and keeps required services. Finish caller, public API and compatibility evidence before deleting files or routes. Missing frontend imports alone are not proof of no external consumers. |
| Split modules and large files | Split by behavior and change ownership, not to hit a count. Keep acyclic dependencies. A small query module can be justified if it hides authorization/projection and prevents an AI dependency cycle; delete it only after its callers have an equivalent working interface. |
| ADR-0001: no second SQL PII detector or caller-set GUC attestation | Keep the decision under an application-writer threat model. **Qualify its rationale:** a caller-set GUC does not attest that a scan occurred, but PostgreSQL privileges and SET ROLE are not universally ineffective; ordinary roles need granted authority. BYPASSRLS is not itself a trigger bypass. Protect normal application writes with a least-privilege role and one mandatory mutation path. Privileged maintenance writes need an explicit scan/quarantine/revalidation process. Regex PII detection does not prevent prompt injection. Track AV-12; do not resurrect migration 1347 automatically. |
| Replica/CDN deployment | Conditional. If no replica is deployed, keep authorization on primary and record replica work as deferred. Frontend `publicGetNoStore` uses `cache: "no-store"`; backend `KbPublicPagesController` sends `Cache-Control: public, no-cache` and a revision-bearing ETag. These are different layers, not a blanket no-store policy or proof of CDN invalidation. Introduce caches only with a measured gain and enforceable revocation policy. Verify media redirect destinations separately under AV-16. |

Technical references: [PostgreSQL index combination](https://www.postgresql.org/docs/17/indexes-bitmap-scans.html), [PostgreSQL privileges](https://www.postgresql.org/docs/16/ddl-priv.html), and [TanStack infinite-query guidance](https://tanstack.com/query/v3/docs/framework/react/guides/infinite-queries). These support the qualifications above; they do not substitute for local measurements.

## Both architecture reports: disposition of every numbered item

| Report item | Current evidence and disposition | Remaining work |
|---|---|---|
| R1-C1 one access seam | Canonical scope includes restrictions; `KbAccessService.assertCanViewArticle` delegates to canonical access. Cache dimensions now include principal kind and ceiling. Container semantics still disagree with the glossary. | AV-02, AV-14 |
| R1-C2 page changed writer | `wiki/kb-page-writer.service.ts` exists; create writes `contentText` and invokes it. Writer suites pass. Its coverage test checks constructor injection, not all operations. | AV-03 |
| R1-C3 retrieve seam | `KbRetrievalService.retrieve` exists; extraction into `KbSearchRetrievalService` is in progress. Orchestration, connection-release and TTL suites pass on recheck; the passage-fence suite still calls a removed method and fails both tests. | AV-01, AV-04 |
| R1-C4 connection lifetime | Search/source routes carry `NoTenantTransaction`; purge helpers reuse ambient transactions in targeted tests. Full request/worker lifetime and provider brown-out proof remain open. | AV-01, AV-07 |
| R1-C5 query embeddings | Cache exists, but global scope, normalization and retention assumptions need correction. | AV-05 |
| R1-C6 OR/indexes | Collection has bounded UNION branches. Earlier seeded evidence documents a bad OR plan; post-rewrite evidence is still requested in AUDIT-L2. | AV-06 |
| R1-C7 chunk ACL | `chunkVisibleTo` now semi-joins the canonical page predicate; SQL-shape tests pass. This is no longer an absent grant branch. | AV-02, AV-06; test grant-only rows against the DB |
| R1-C8 client Page<T> | Six hooks use `selectFlatPages`; import/export envelope tests pass. Selected data is flattened, rather than preserving the envelope as claimed in R1. | AV-10 |
| R1-C9 help-centre owner | Duplicate controllers deregistered in `kb-help-centre.module.ts`; services retained. | AV-09 |
| R1-C10 unreachable code | Grants and space-member writers now have mounted UI. Deleting those slices would remove requested functionality. Several other candidates need a current caller census. | AV-09 |
| R2-1 one table/five meanings | Variant constants are present in `core/kb-content-type.ts`; not evidence that every query is variant-safe. Keep physical storage. | AV-08 |
| R2-2 table as interface | Several outside readers now use purpose-specific modules in `kb/core`; billing still queries `kb_pages` directly. Lifecycle catalogs are not automatically executable violations. | AV-08 |
| R2-3 module federation | Existing eight folders are not themselves a defect; evaluate exported behavior and imports. | AV-08, AV-09 |
| R2-4 vocabulary | Documents glossary now exists in root `CONTEXT.md`; the original absence claim is stale. Space semantics and the claim that empty retrieval means empty corpus need corrections. | AV-02, AV-04, AV-12 |
| R2-5 oversized files | Refactors are actively moving code; the old line-count inventory is stale. Extraction is not complete while consumers/tests reference removed methods. | AV-01, AV-08 |
| R2-6 DTO sprawl | Shared pagination exists. Preserve minimum response projections instead of one giant response. | AV-10 |
| R2-7 chunk schema ceiling | Canonical semi-join implemented; do not re-add denormalized space/grant columns to solve the old issue. | AV-02, AV-06 |
| R2-8 cycle workaround | `KbDocumentQueryService` remains; it uses canonical authorization but still performs title ILIKE `%query%` and two independently capped queries. | AV-08 |
| R2-9 cache factories | `CACHE_KEYS.kbQueryEmbedding` exists. ACL namespace strings still occur in access/auth modules. A factory does not by itself prove authorization parity. | AV-05, AV-14 |
| R2-10 false security proofs | Canonical and chunk tests now execute the current builders, but SQL text assertions do not prove real rows, RLS or revocation races. | AV-02, AV-14 |

## R1 live defects: rechecked separately from design opinions

| Original finding | Current result |
|---|---|
| Anonymous Ask can spend any tenant's credits | Org budget/content-gate regression suite passes. Preserve as targeted-test evidence; deployment and adversarial traffic validation remain release evidence. |
| Create/duplicate/move skip indexing | Create now extracts text and invokes writer; writer tests pass. Keep all-writer atomicity and behavior coverage open (AV-03). |
| HR metadata update bypasses PII gate | `documents-update-metadata-pii.spec.ts` passes. ADR operational limits remain AV-12. |
| Purge takes a second connection | Ambient-transaction reuse tests pass. Do not equate helper-level proof with pool saturation testing; AV-07 covers remaining request/worker work. |
| From-ticket success contract mismatch | Fresh `hooks/api/kb/from-ticket.test.tsx` run passes all 6 tests, including parsing the actual article shape and rejecting the obsolete success-only shape. Idempotent real-route retry remains part of AV-10. |
| Narrow token shares owner's ACL cache | Principal kind/ceiling dimensions and common fill logic are now present. Remaining invalidation/fingerprint audit is AV-14. |
| Security specs test unused pageVisibleTo | Current canonical and chunk suites target the live builders. Finish the cited suite census under AV-14. |
| Page deletion fails to invalidate collections | Collection key is now under `kb/pages`, so page-prefix invalidation reaches it. Real mounted consumer behavior belongs to final UI gates. |
| Space archive leaves detail stale | Space detail key is now under `kb/spaces`; list-prefix invalidation reaches it. The old string-prefix finding is resolved in source. |
| Export history does not refresh/poll | Export hook now polls pending/processing jobs; import/export tests pass. Retain completion/failure/cancel and refetch evidence. |
| Content Health cursor uses wrong order | Keyset suite passes; current source and UI suites support the fix. |

## Actionable TODOs

These are the new canonical review items. Ledger checkboxes reference these IDs; session notes are historical evidence, not additional copies of this backlog.

### AV-01 — P0: finish retrieval extraction and restore meaningful tests

- [ ] Update production injection, imports, return types and tests to the final retrieval interface. The first audit run had **3 failing suites / 7 failing tests**: embedding TTL, search connection release, passage ACL fence. A later rerun after concurrent edits passed TTL, connection release and retrieval orchestration, but **the passage ACL fence still failed 2 tests** calling a removed method. Run affected Ask/search callers, a Nest registration/DI smoke test and both typechecks after the editing session settles. Do not silence failures or recreate pass-through wrappers to satisfy stale mocks.
      **The failure list is stale, re-measured 2026-09-27.** `npx jest "kb-query-embedding-ttl|kb-search-connection-release|kb-search-acl-revision-passage-fence|kb-retrieval-facade-reports-channel-failure"` → 4 suites, 20 tests, 0 failing. The "passage ACL fence still failing" state was an intermediate artifact of concurrent editing, not a defect. Production injection now calls the outcome-returning methods; no pass-through wrapper was recreated. Whole module: `npx jest src/modules/kb/` → 282 suites, 2512 tests, 0 failing. **Remaining clauses: the Nest registration/DI smoke test and both typechecks have not been run on this revision** — the box stays open until they are.

### AV-02 — P0: make container policy consistent and test actual disclosure

- [ ] Apply the agreed private-space/project rule to creator, owner, explicit member/role grant and ordinary visibility branches, with any privileged exception explicit. Cover restricted-space grant-only pages and revocation through detail, collection, FTS, vector candidates, prompt passages, citations, attachment download and export. Current SQL property tests are useful but insufficient; execute representative rows under the application DB role. Never authorize prompt content merely because its citation is hidden later.
      **PARTLY — the rule is now applied; the real-row half is not.** A live gap was found and closed 2026-09-27: `buildIndexedBranch` carried two standalone container clauses added by `fe3d30809` — space membership and project membership — with **no visibility restriction at all**, so every member of a space or project could see `visibility = 'private'` pages inside it. Both now require `visibility IN ('org','public')` (`core/authorization/knowledge-page-scope.ts:115,121`). The creator, owner and created-by-membership clauses are unconditional and the explicit grant arm is a separate branch, so an author still reaches their own private page and a grantee still reaches a granted one — the tightening removes only access derived from container membership. 9 new tests in `knowledge-page-scope.spec.ts`; suite 98 passing. **Open clause: "execute representative rows under the application DB role"** — still unproven. SQL-shape tests cannot stand in for it, and the owner has authorized planting `[e2e]` fixtures inside a rolled-back production transaction to get it.

### AV-03 — P1: complete the write interface and atomicity proof

- [ ] Make a page-change operation own or explicitly require the expected revision, revision increment, audit and outbox in the same transaction. Current `commitPageChange` accepts revisions already calculated by callers and does not write an audit. Replace constructor-injection-only coverage with behavioral checks for create, duplicate, move, restore, import, status/publication, support authoring and empty-content updates. Prove transaction rollback leaves neither a mutation nor an index event, and engagement does not reindex.
      **PARTLY 2026-09-27.** One real defect found and fixed: the owner-change audit in `wiki/kb-pages.service.ts` ran as `audit.log` (best-effort, fire-and-forget) *outside* the `db.transaction` callback, so a crash between commit and dispatch dropped the audit record silently. It now runs `await this.audit.logCritical(...)` inside the transaction, which is what `common/audit/audit.service.ts:76` says transactional and security audit must use. The stale double in `kb-page-owner-change.spec.ts` declared only `log`; its two negative assertions would have passed vacuously against a method the service no longer calls, so they were re-pointed and a positive control added. New behavioural coverage in `wiki/kb-page-commit-atomicity.spec.ts` (7 tests). The "no provider call holds the transaction open" clause is CONFIRMED: `commitPageChange` defers notifications through `registerAfterCommit`, and `KbPageWriterService` has no embedding, AI or object-store dependency.
      **Open clauses.** Seven other callers still write no audit at all — `kb-page-status.service.ts` (publish / archive / unarchive), `kb-page-public.service.ts` (setVisibility), `kb-page-tree.service.ts` (move / restore) and `kb-page-versions.service.ts` (restoreVersion). Consolidating them into `commitPageChange` needs an action string threaded through `CommitPageChangeInput`, which every caller must supply. The rollback proof ("neither a mutation nor an index event") is also not yet written.

### AV-04 — P1: preserve retrieval scope, provenance and failure state

- [x] **DONE 2026-09-27 — the claim was correct and current; four gaps, all `spaceId`.** Pass requested space/source/type/owner/status/verified filters consistently into candidate and passage queries.
      **Why this mattered:** a filter accepted but not applied is worse than one rejected. The UI
      told the user the answer was narrowed to one space while retrieval drew from every space.
      **Measured coverage, after the fix:**

      | Field | article keyword | article vector | page keyword | page vector | source retrieval |
      |---|---|---|---|---|---|
      | `spaceId` | already applied | already applied | **was missing → fixed** | **was missing → fixed** | **was missing → fixed** |
      | `sourceIds` | n/a | n/a | n/a | n/a | already applied |
      | `pageIds` | n/a | n/a | already applied | already applied | n/a |
      | `verifiedOnly` | n/a | n/a | already applied | already applied | n/a |

      A fourth gap turned up beyond the three above: the final wiki-page fetch in
      `retrieveTopArticles` did not re-apply `spaceId` either, so it now does as a second gate.
      **Threaded, not rejected** — `spaceId` is already honoured on the article paths, so
      rejecting it would have broken working queries.
      **Sources keep their global rows:** the filter is
      `or(isNull(kbSources.spaceId), eq(kbSources.spaceId, spaceId))`, so org-wide sources stay
      visible and only other specific spaces are excluded.
      **The invariant that matters is preserved and tested:** every filter is ANDed with the
      existing org and visibility predicates, so it can only narrow, never displace them.
      **Tests:** `kb-space-scope-filter.spec.ts` (11). **Mutation-tested four ways** — removing
      `spaceId` from each of the page keyword path, the page vector path, `retrieveTopSources`,
      and the `retrieve → retrieveTopSources` hand-off each failed 2 of 11, so each guard bites
      its own line rather than all four resting on one assertion.
- [x] **DONE 2026-09-27.** Return typed per-channel outcomes for empty, disabled, degraded and failed. `retrieveDocumentPassages`/`retrieveTopSources` catch and return `[]`; a successful embedding then makes the facade report non-degraded results. An empty authorized result means no matching accessible evidence, not proof of an empty tenant corpus.
      `RetrievalChannelKind` / `RetrievalChannelOutcome<T>` in `retrieval/kb-search-retrieval.service.ts`; all three channels now carry a kind. The documents channel was the last gap — `retrieveTopArticles` had no catch and no outcome, so `degraded.documents` derived only from `embedding.vectorLiteral === null` and a thrown article query escaped as an unhandled exception. `retrieveTopArticlesWithOutcome` closes it; `retrieval/kb-retrieval.service.ts` consumes all three via `channelSignalsDegradation`. Pinned by `kb-retrieval-facade-reports-channel-failure.spec.ts` (each failure assertion paired with an `empty` control, so the test reads the outcome kind rather than an empty array). `npx jest src/modules/kb/retrieval/` → 83 suites, 666 tests, 0 failing.
- [ ] **PARTLY — ACL revisions done; provider provenance is genuinely absent and cannot be fixed from inside KB.** Persist actual source content/ACL revisions and provider context provenance.
      **ACL revisions — the claim is stale.** ~~`buildAskSourceRecords` and the original
      `buildSourceRecords` write `aclRevision: null`.~~ `buildSourceRecords` **does not exist**
      anywhere in the repo. `buildAskSourceRecords` (`kb-ask-context.ts:61-85`) writes
      `aclRevision: item.aclRevision ?? null` for `top` items, and the retrieval query really does
      project it (`kb-search-retrieval.service.ts:250-261`, `aclRevision: kbPages.aclRevision`).
      `null` for the `sources` and `linked` arms is **correct, not a gap**: `kb_sources` has no
      `acl_revision` column at all (`db/schema/kb/sources.ts` — verified, no revision column), and
      linked company documents have no ACL-revision concept.
      **The `sourceIdsWithRevisions` criticism no longer holds.** `kb-ask-acl-revision.spec.ts`
      (8 tests) asserts the persisted entry carries the real revision end to end, proves the SQL
      projection by walking `queryChunks` rather than touching `Column.table` (which would pass
      vacuously), and pairs the page/article positives with deliberate-null negatives for the
      source and document arms. **Mutation-tested:** reverting `item.aclRevision ?? null` to
      `null` fails 5 of 8 — the 3 survivors are exactly the null arms that do not depend on the
      threading, which is the right signature.
      **Provider provenance — a real gap, and a live always-null read.** `kb_ai_interactions`
      has a `provider` column (`db/schema/kb/ai-interactions.ts:42`) that **nothing ever writes**,
      and `kb-research-brief.handler.ts:117` **selects it**, so every research brief reports
      `provider: null` forever, indistinguishable from "no provider". It breaks no contract —
      both schemas declare it `z.string().nullable()` (`kb-retrieval-response.schemas.ts:111`,
      frontend `kb-research-schema.ts:20`) — and no UI renders it.
      **A correction to note:** joining `ai_usage_logs` on `gatewayCorrelationId` does **not**
      recover it — that table has no provider column either (`db/schema/common/ai-usage.ts:4-19`).
      The provider name is stored nowhere in the database. `model` **is** written
      (`kb-ask.service.ts:343`), so the provider is inferable from the model string but not recorded.
      **Why this stays open:** the value does not exist at the KB call site — `AiUsageMeta`
      (`modules/ai/gateway/ai-gateway.types.ts:9-16`) carries `model` and costs, no provider.
      Populating it means changing the AI module, which another session owns. **Not attempted.**
      The two honest options for whoever owns it: add `provider` to `AiUsageMeta` and write it, or
      drop the column and the always-null field from the brief response.

### AV-05 — P1: correct embedding-cache isolation and cost behavior

- [ ] **PARTLY — the cross-tenant half is fixed and shipped; the metering half needs the AI module.** Replace the global key with the tenant/provider/model/dimension/preprocessing/input contract above.
      **Tenant separation — was genuinely broken, now fixed.** `CACHE_KEYS.kbQueryEmbedding` was
      `kb:qembed:${model}:${queryHash}` — no `orgId`, while every neighbouring key in the same
      file carries one (`search:${orgId}:${userId}:${hash}` two lines above it). That is a direct
      **BE-123** violation ("never share a cached result across tenants"). Now
      `kb:qembed:${orgId}:${model}:${queryHash}` (`common/cache/cache-keys.ts:78-79`,
      `kb-embedding-cache.ts:23-28`). Only one call site existed, so the arity change is contained.
      **Why it mattered beyond tidiness.** `embedOrDegrade` calls `embedQueryWithCredit` **only on
      a miss** (`kb-embedding-cache.ts:30-40`), and `/kb/search` carries no credit or rate-limit
      guard of its own — `kb-search.controller.ts:27-31` is `@RequirePermission("kb:articles:view")`
      and nothing else. So a cache hit skipped **three** things at once: the credit reservation,
      the per-org concurrency limiter (`ai-gateway.service.ts:119-123`), and the usage-log row.
      With a global key and a `CACHE_TTL.WEEK`, one org's paid embedding served every other org's
      identical query for a week, and an org with exhausted credits kept getting semantic search
      for any warmed query.
      **Severity, stated honestly:** this is metering and tenant coupling, **not** content
      exposure. The cached value is a vector derived purely from the caller's own query string
      and the model; it encodes nothing about any other tenant's documents. The one information
      channel it did open was a weak timing oracle — a hit returns fast — letting a tenant infer
      that *somebody* on the platform had searched a given phrase. Both close with the key change.
      **Tests:** `kb-embedding-cache-tenant-isolation.spec.ts` (3). Written failing-first: 2 failed,
      1 passed before the fix — and the one that passed was the **control**, which pins that a
      same-org repeat query is still served from cache, so the fix cannot degenerate into simply
      disabling caching. All 3 pass now; `src/common/cache` stays green at 9 suites / 263 tests.
      **Still open, and not attempted here:** "meter actual provider work once and report cache
      hits separately; prove budget checks still apply." There is no check-only entry point —
      `charge: false` still runs the provider call (`ai-gateway-runner-call.ts:179`), so a
      cache-hit budget check needs a new capability in `modules/ai`, which another session owns.
      Also untested here: case-sensitivity, cache outage, model change, expiry, concurrent misses.
      `normalizeEmbeddableQuery` lowercases and collapses whitespace (`kb-embedding-cache.ts:11-13`)
      and is used for the key but **not** for the provider input, so key and provider
      normalization are not identical — the audit's point stands and is unaddressed.

### AV-06 — P1: finish measured query and search-quality evidence

- [ ] Capture before/after app-role `EXPLAIN (ANALYZE, BUFFERS)` for collection UNION, full search, chunk semi-joins, facets and health queries. Use representative rows and grant density, including grant-only and restricted-space tenants; include query count, buffers, rows scanned, p95/p99 and minority-tenant retrieval recall. The historical 50k-page/100k-grant bad-plan record is useful but does not close the rewritten query. Use an isolated load environment; rollback fixtures in production still consume locks, WAL, CPU and storage and are not free.
- [ ] **PARTLY — the snippet fetch is fixed; the keyset cutover is deliberately NOT done, and should not be done without its client.** Convert or explicitly time-bound the remaining `/kb/search` offset/count implementation and its whole-`contentText` fetch for snippets.
      **Fixed — the whole-`contentText` fetch, which was the real cost.** The rows query selected
      the entire `contentText` column for up to 50 rows purely to build a 160-character snippet,
      so every search shipped full TOASTed page bodies across the connection to Node and threw
      almost all of it away. Now `left(contentText, KB_SNIPPET_CONTENT_CAP)` in SQL, capped at 500
      — 3× the snippet length, so no snippet is truncated. `buildSnippet`, the response contract
      and every ACL/org predicate are untouched.
      `kb-search-snippet-bound.spec.ts` asserts the rendered projection contains `left(`, with a
      control showing a raw column reference renders without it. Mutation-tested: reverting the
      projection fails it alone, 1 of 2.
      **Already fine — the offset.** `.offset()` is bounded at parse time by
      `KB_SEARCH_MAX_PAGE = 200` × `pageSize ≤ 50`, so the worst case is offset 9,950, and
      `kb-search-paging-bounds.spec.ts` already covers it. No change needed; the audit's concern
      does not apply to this endpoint as configured.
      **Deliberately NOT done — the keyset cutover.** `/kb/search` returns `total`, `page`,
      `pageSize` and `totalPages`; the frontend parses all four through `kbSearchResponseContract`
      and `useKbSearch` renders numbered pagination from them. Removing the total to produce a
      keyset would be a pagination cutover shipped without its client — the exact regression
      FE-125 and BE-25 exist to prevent — and the page would lose its pager the moment the
      backend deployed. **The sequence, for whoever picks this up:** (1) add a cursor to the
      response *alongside* `total`, a backward-compatible extension; (2) move `useKbSearch` to
      `useInfiniteQuery` with `getNextPageParam` and ship it; (3) only then retire `total` and
      `totalPages`. Steps 1 and 3 without 2 is the regression.
      **Also still open:** the `COUNT(*)` over the full match set on every search, which the
      keyset work would remove; it is the remaining unbounded piece of this endpoint.

### AV-07 — P0/P1: purge must respect holds and finish outside request occupancy

- [x] **DONE 2026-09-27 — the finding was exactly right, and the bug was unrecoverable.** **P0:** Enforce holds on every descendant, not just the root.
      **Confirmed as described.** `hardDelete` read `legalHold` on the root only, `collectSubtreeIds`
      then gathered every descendant, and the delete targeted them with no hold predicate. Deleting
      an unheld parent **permanently destroyed a child under legal hold** — no soft-delete, no
      recovery, and a compliance breach rather than merely a data-loss bug.
      **Fix, in two layers.** `assertNoLegalHoldInSubtree(orgId, subtreeIds)` runs over the whole
      subtree immediately after `collectSubtreeIds` and **before any destructive store work**
      (`kb-page-trash.service.ts`). Placement is the point: `openMultiStoreLedger`,
      `recordPageAttachmentPurge` and `executePreDeleteStores` already purge chunks, blobs, grants
      and caches, so a refusal raised after them would abort with the page row intact but its
      dependent stores already gone. The error names each held page and its reason.
      **The concurrent-hold race the audit asked about is closed atomically.** Inside the final
      delete transaction a second check takes `.for("update")` on any held row in the subtree and
      throws if one appeared mid-flight, and the delete predicate itself now carries
      `eq(kbPages.legalHold, false)`. Belt and braces: the lock loses the race only if the hold
      lands after the lock, and the predicate catches that.
      **Tests:** `kb-page-trash-subtree-legal-hold.spec.ts` — written failing-first, bite plus
      control. The bite (unheld parent, held child) failed and the **control passed**, which is
      what proves the refusal is the hold and not a blanket block; the bite also asserts
      `deletedRowSets === 0`, so a refusal that still deleted would fail. Both pass now.
      **Collateral, repaired separately:** the new query broke 13 tests across 6 suites whose
      doubles had no `select` chain. All repaired as test doubles only — no production file
      touched, no assertion weakened. **Full KB suite: 275 suites / 2431 tests, 0 failing.**
      **The bulk path, checked rather than assumed — and it had a smaller bug of its own.**
      `emptyTrash` does **not** expand to subtrees: it lists trashed pages filtered by
      `eq(kbPages.legalHold, false)` and deletes exactly those ids, so it never had the descendant
      blind spot. What it did have was a **select-then-delete race** — the `DELETE` carried only
      `orgId` and `inArray(id, ids)`, so a hold placed between listing the batch and deleting it
      destroyed a held page anyway. The predicate now carries `eq(kbPages.legalHold, false)`.
      `kb-empty-trash-hold-race.spec.ts` asserts it in the **rendered SQL of the page delete
      specifically**, with a control proving the store-purge deletes in the same flow carry no
      such predicate — otherwise the assertion would pass by reading any delete at all.
      Mutation-tested: removing the predicate fails it alone, 1 of 2.
      **Still not done, named rather than quietly dropped:** "verify allowed lifecycle state
      before hard deletion" — `hardDelete` does not require the page to be in the trash first, so
      a live page can be hard-deleted without passing through soft delete. That is a separate
      lifecycle question, not a hold question, and is left open.
- [ ] **P1:** Finish durable bounded purge commands, per-store retry and backpressure. Trace request transaction exit through blob/cache work; prove there is no nested second borrow or connection held during outbound I/O. Run a ten-concurrent-purge/provider-brown-out test against a small pool with interactive traffic and cancellation. Do not infer end-to-end safety from helper tests alone.

### AV-08 — P1: finish useful module interfaces, not mechanical file splits

- [ ] Inventory remaining external table reads and give billing/lifecycle needs explicit bounded interfaces or documented privileged exceptions. Keep distinct authenticated, public, maintenance and linked-HR access contracts. Centralize variant selection without erasing HR/source/attachment identity. Replace `KbDocumentQueryService` leading-wildcard scans with indexed lexical retrieval; bound the merged result, escape search syntax consistently, and preserve the acyclic dependency graph.

**`KbDocumentQueryService` half addressed 2026-09-27 — commit `9d4966d3d`. Three of the four sub-claims were true; the fourth was not.**

- **Leading-wildcard scans — TRUE.** `searchDocuments` built `` `%${query}%` `` and fed it to `ILIKE` on *both* the article and page branches. A leading wildcard cannot use a btree index, so both degraded to sequential scans. BE-49 violation. Replaced with `to_tsvector('english', title) @@ websearch_to_tsquery('english', $query)`.
- **Unbounded merge — TRUE.** Each branch was capped at `cap`, but the merged array was returned uncapped and could return `2 × cap` rows. Bounded.
- **Escaping — TRUE, and the same root cause.** Because user text was concatenated into a LIKE pattern, a query of `100%` rendered the param `%100%%` and `my_field` left `_` as a single-character wildcard. `websearch_to_tsquery` takes the query as a bound parameter and tolerates arbitrary user text — including `a & b` and `C++` — without throwing.
- **Acyclic graph — FALSE as a defect.** The graph was already acyclic and the change adds no imports. Nothing to fix.

Verified by mutation, independently re-run: reverting the page predicate to `ILIKE` turns 5 of the 12 new tests red; reverting the merge cap turns 1 red. Every negative assertion is paired with a positive control that proves the SQL was actually produced. 16 tests pass in the directory; `modules/kb` holds 0 typecheck errors.

**Two things this deliberately does not claim.** Index usage is *unverified and unverifiable here* — production is the only database, and a GIN expression index on `to_tsvector` is dead under RLS because the function is not leakproof. Both predicates are still sequential scans; what changed is correctness and escaping, not measured speed. Closing that properly needs the BE-80 pattern — a `SECURITY DEFINER` function returning bare ids, so the index is usable outside the caller's RLS, with the caller re-selecting those ids under RLS to enforce authorization. That migration is **described but not authored**, and applying it is a production decision.

**Closed 2026-09-28 — authored, routed and measured.** `app.search_kb_page_ids` exists and `GET /kb/pages/full-search` now routes its text predicate through it (`kb-page-search-query.service.ts:53`), so the GIN index is reached inside a `SECURITY DEFINER` boundary and the returned ids are re-selected under RLS, which keeps authorization where it belongs. Measured as `streamline_app` with the tenant GUC set, per BE-76, and in buffers rather than milliseconds, per BE-77: the old plan touched **2,928 buffers** and scanned 95,002 org pages via a BitmapOr with the text match demoted to a Filter; the new plan touches **97 buffers**. Wall clock fell 103 ms → 9 ms on the same single matching row, which is the weaker of the two numbers and is recorded only because it agrees with the buffer count.

And the match semantics changed: word matching replaces substring matching, so an arbitrary fragment no longer matches mid-word. English stemming absorbs most of this, the caller is an LLM tool passing natural terms, and `z.string().min(1)` on the tool input means an empty query can no longer return the whole corpus — which is a bounded-read improvement. Recorded rather than left implicit.

**Referred out — not KB's to fix.** The same tool, `modules/ai/core/tools/self-digest-tools.ts:206,223`, still builds `` `%${input.query}%` `` and runs `ILIKE` against `onboarding_documents.file_name`. That is a live BE-49 violation in the AI module, owned by another session. It also leaves one merged user-facing result set running **two different match semantics** — a substring hit on an onboarding document and a word hit on a KB page — so the same query can return one and not the other. KB's half is fixed; the AI half needs its owner.

### AV-09 — P1: retire only proven duplicates and keep needed UI

- [ ] Record retained owner, route contract and callers for each R1-C10 candidate, including public/API consumers and scheduled jobs. Preserve grants/member management, useful verification and required redirects. Verify deregistered routes have no promised consumers, then remove dead controller/service/schema/test files together. Review current help-centre ownership and module registration after the concurrent changes; no wholesale deletion from the old 54-route count.

**Module-registration census, 2026-09-27.** The module-registration half is now measured. KB declares 36 controllers. Six are referenced by **zero** `*.module.ts` anywhere under `backend/src` — not merely outside `modules/kb` — and there are no barrel files, so no spread could hide a registration:

| Unregistered controller | File |
|---|---|
| `KbWikiAnalyticsController` | `analytics/kb-wiki-analytics.controller.ts` |
| `KbArticlesController` | `help-centre/kb-articles.controller.ts` |
| `KbAuthoringController` | `help-centre/kb-authoring.controller.ts` |
| `KbCategoriesController` | `help-centre/kb-categories.controller.ts` |
| `KbCommentsController` | `help-centre/kb-comments.controller.ts` |
| `KbVerificationController` | `help-centre/kb-verification.controller.ts` |

`kb-help-centre.module.ts:25-31` mounts only `KbArticleAiController`, `KbAiFeedbackController`, `KbFromTicketController`, `KbAnalyticsController` and `KbWidgetController`. Nest mounts nothing else, so these six define no reachable route. This confirms the duplicate-analytics finding: `KbWikiAnalyticsController` is the unreachable one; `help-centre/kb-analytics.controller.ts` is live.

Two consequences, neither of which authorizes deletion:
- Declaring `@Controller("kb")` does not make a route exist. Any audit item that inferred a route's existence from a controller file must be re-derived from the module arrays.
- Deregistration did **not** make the underlying services dead. `KbArticlesService` is still injected by `support/kb-gap/support-kb-gap.service.ts`, exactly as `06-code-removal-and-reuse.md` records. The controllers are unreachable; their services are not.

Removal stays blocked under the owner's standing retain-don't-delete rule. Recorded as a census, which is what this item asks for.

### AV-10 — P1: contracts and reachable UI

- [ ] Verify each migrated envelope through the real HTTP parser and query hook, not a hook mock that already returns an array. Include from-ticket create success/idempotent retry, grants create/list parity, export history and each response projection. Update `selectFlatPages` documentation to describe its actual selected result, and retain raw page metadata where needed.

**Top-level shape parity measured 2026-09-27 — every KB list contract matches its backend `@ResponseSchema`.** This closes the array-vs-envelope class, which is the failure that put `/knowledge/wiki/import` behind the error boundary on an HTTP 200. `check:contract-parity` compares fields *within* an object and produces no finding at all for a top-level array-vs-envelope difference, so this had to be checked by hand.

| Route | Backend `@ResponseSchema` | Frontend contract | |
|---|---|---|---|
| `/kb/pages/recent`, `/kb/pages/favorites` | `kbPageListSchema` = `z.array` | `kbPageListContract` = `z.array` | match |
| `/kb/pages/:pageId/comments` | `kbPageCommentListSchema` = `z.array` | `kbPageCommentListContract` = `z.array` | match |
| `/kb/pages/:pageId/record-links` | `kbRecordLinkListSchema` = `z.array` | `kbRecordLinkListContract` = `z.array` | match |
| `/kb/spaces/:spaceId/members` | `kbSpaceMemberListSchema` = `z.array` | `kbSpaceMemberListContract` = `z.array` | match |
| `/kb/import-jobs`, `/kb/export-jobs` | `cursorPageSchema` | `Page<T>` envelope, `pagination.nextCursor` | match, previously broken |

Two things this specifically rules out. The `/kb/pages` collection cutover did **not** introduce a mismatch: that route returns the `kbPageCollectionPageSchema` envelope, and `kbPageListContract` — despite the name — is never applied to it, only to the two bare-array `recent`/`favorites` routes. And the four dead bare-array fossil contracts recorded earlier are gone; the four bare-array contracts that remain are all live and all correct.

**Still open, and the box stays unchecked for it.** This is static shape parity, not the item's actual requirement. Nothing here exercised the real HTTP parser against a running backend, so an in-object field drift — which is what `check:contract-parity` *does* see, and therefore the weaker risk — is confirmed only as far as that gate reaches. The from-ticket idempotent-retry and export-history paths named in this item are untested by the above.

`selectFlatPages` is confirmed to return `T[]` and to discard the envelope (`frontend/lib/api/select-flat-pages.ts:14-16`). That is correct **only** under `useInfiniteQuery`, where `hasNextPage` comes from the query rather than the selected result; all six consumers do use it that way. The item asks for its documentation to be updated, which cannot be done in source under the no-comments rule — the description belongs in a test name or here, and it is now here.
- [x] **DONE 2026-09-27 — and it was nine overlays, not one.** Fix `SpaceMembersSheet`'s missing accessible description.
      `SheetDescription` added and a guard test written
      (`space-members-sheet.test.tsx`, "gives the dialog an accessible description…"). It asserts
      `aria-describedby` resolves to an element carrying the text, not merely that the sheet
      rendered. **Mutation-tested:** deleting the description fails that test alone — 1 failed,
      7 passed — and reproduces the exact Radix warning the audit reported.
      **Sweeping the feature found eight more with the same defect**, each rendering raw Radix
      content with a title and no description: `page-history-sheet`, `page-metadata-sheet`,
      `space-sheet`, `content-health-dismiss-dialog`, `move-page-dialog`, `page-cover-picker`,
      `page-document-header`, `reviews-bulk-decide-dialog`. All fixed. The Radix warning count
      across `features/wiki` + `hooks/api/kb` is now **0**, down from 2 after the first fix;
      no overlay in the feature still lacks a description.
      **Left open deliberately:** keyboard/focus behaviour and the 375px layout are browser
      checks, excluded from this session's scope. The audit is right that green DOM tests do not
      close the global accessibility checkbox — this closes the missing-description defect only.
- [x] **DONE 2026-09-27 — both halves; the audit was right that the test failure was not a production crash.** Repair the Spaces page test's stale hook mock, rerun the mounted members-sheet integration, reconcile the local-cursor decision.
      **The mock.** `spaces-page.test.tsx` mocked `@/hooks/api/kb/spaces` without
      `useAddKbSpaceMember` or `useRemoveKbSpaceMember`, so mounting the members sheet threw.
      The hook does exist (`hooks/api/kb/spaces.ts:186`) — production was never affected, exactly
      as the audit said. Both added to the mock, which then exposed a second fault the throw had
      been masking: the sheet's member picker calls a real `useQuery` and the test rendered with
      no `QueryClientProvider`. Wrapped in one, following `knowledge-base-page.space-filter.test.tsx`.
      **18/18 pass**, including the previously red "opens the members sheet for the clicked card".
      **The cursor.** The local-cursor decision is **approved and kept**, and its stated reason
      holds: a cursor is an opaque server token whose meaning depends on the filter set, so a
      URL-shareable cursor would decode against whatever filters happen to be active and skip
      pages. What was missing was proof of the obligation that makes it safe — the reset.
      All four filter mutators do call `cursorState.reset()` (`spaces-page.tsx:196, :201, :206, :211`),
      but by four hand-repeated call sites, so a fifth filter added without one would silently
      skip pages with nothing to catch it. That guard now exists: "drops the cursor when a filter
      changes…" pages forward to cursor `c2`, changes a filter, and asserts the hook is next
      called with `cursor: undefined`. **Mutation-tested** — removing the reset from
      `handleSearchChange` fails it alone, 1 of 18.
      **URL-cursor acceptance is not marked complete**, per the audit's instruction. The cursor
      is local by design; `q`, `audience`, `status` and `view` are in the URL.
      **Left open deliberately:** verifying the real route in a browser is out of scope here.

### AV-11 — P1: operational proof and truthful metrics

- [ ] Record current read/write/search/Ask and all indexing-path instrumentation, redaction coverage, query/connection budgets, revocation lag, purge backlog, KB cost and operator alert delivery. Existing Ask/search/index metrics do not prove every required dimension or a live dashboard. Do not emit a guessed cache/replica result as observed telemetry.
- [ ] Run restore/reindex/tenant export-delete drills and load/soak at measured current traffic and 10×, then the agreed capacity envelope in isolation. Publish p95/p99, failure rate, queue recovery, pool headroom, RPO/RTO and cost per successful resolution. Keep replica, CDN, partition/cell/external-search expansion deferred until measured triggers and deployment prerequisites exist.

### AV-12 — P1: bound the PII decision and reconcile terminology

- [ ] Amend ADR-0001's broad PostgreSQL claims while retaining the chosen application scan; document runtime/migration privileges and the controlled direct-write scan or quarantine path. Test every scanned field on every legitimate writer, plus linked-document revocation. Treat prompt-injection defenses separately from PII regexes. Reconcile the glossary with AV-02 and AV-04; a citation policy must never widen provider disclosure. This document supplies the corrected KB decision; the owning HR/backend ADR still needs its corresponding edit.
      **PARTLY 2026-09-27 — the ADR is amended.** `backend/docs/adr/0001-no-db-trigger-for-scanned-document-field-pii-guard.md`, four changes. One of its claims was simply false: "`SET ROLE` defeats role-based checks for the same reason" — `SET ROLE` requires a granted membership, not a catalog builtin, so the escalation runs the other way (`streamline_admin` can assume `streamline_app`, not the reverse). The runtime/migration privilege split is now explicit — `APP_DATABASE_URL` → `streamline_app`, RLS-bound, no BYPASSRLS; `DATABASE_URL` → `streamline_admin`, BYPASSRLS, migrations only — together with the fact that production Aurora is the only Postgres environment. A new paragraph records that `app.current_org_id()` is not leakproof, that this kills GIN/trigram and expression indexes under RLS, that `LEAKPROOF` cannot be declared on Aurora, and that a missing GRANT and a missing RLS policy both surface as `42501`. The controlled direct-write / quarantine path is documented in Consequences.
      **Open clauses: "test every scanned field on every legitimate writer, plus linked-document revocation" is not done, and the owning HR/backend ADR has not had its corresponding edit.** The box stays open on those two.

### AV-13 — P1: migration and release proof

- [x] **DONE 2026-09-27.** Reconcile new KB migration files, journal entries, rollback paths and actual database hashes/schema at the deployment being released. `1370_kb_chunk_acl_dead_index.sql` was on disk but not in the journal at this audit checkpoint. Authored, journalled, applied and verified are four separate states. The old 1174 cutover evidence remains historical; do not reapply it. Keep rejected 1347 outside execution until a new decision supersedes ADR-0001. Re-run targeted tests on the final source revision; do not declare another session's dirty changes deployed.
      **PARTLY 2026-09-27 — the paper reconciliation is complete.** All 28 KB migrations from 1196 to 1370 reconciled against `migrations/meta/_journal.json`: filename, journal entry, `idx`, `when`, rollback file, idempotency. `1370_kb_chunk_acl_dead_index` sits at `idx 1137`, `when 1803093626725`, with no new collision — the whole journal array was read, not its tail, which is precisely how the earlier collision with `1396_build_sprint_cycle_chain_repair` was missed. Two P2 defects found: `1350_kb_acl_branch_indexes` is **unjournalled and has no rollback**, and `1360_retire_app_search_kb_chunk_ids` is **unjournalled and not idempotent**. An unjournalled migration never runs while `db:migrate` still prints success (BE-58), so both are deploy landmines if a live call site already depends on them. The ordering violations at `0619` and `1155` are pre-existing, not introduced here. Full table in `sessions/LEDGER-PATCH-M6.md`.
      **CLOSED 2026-09-27 — both landmines defused and the hash comparison run.**
      `1350_kb_acl_branch_indexes`: rollback authored (`migrations/rollback/1350_kb_acl_branch_indexes.down.sql`), journalled at `idx 1138`, applied to production. `1360_retire_app_search_kb_chunk_ids`: journalled at `idx 1139`, applied to production. The non-idempotency reading was checked rather than accepted — `0703` creates `app.search_kb_chunk_ids` and is journalled ahead of it, so a full chain replay always finds the function present when `1360` runs; the precondition only bites on a lone re-run of `1360` against a database where it already succeeded, which is the behaviour BE-58 wants.
      `1370`'s rollback was not missing, it was misfiled: it sat in `migrations/` as `1370_kb_chunk_acl_dead_index_rollback.sql` and `check:migration-rollback` only looks for `migrations/rollback/<tag>.down.sql`. Moved. The KB half of that gate is now clean; the 13 remaining `no-rollback` findings are all non-KB and pre-existing.
      **Both migrations round-tripped up → down → up against local `replay2` before production** — 1350's two indexes created, dropped and recreated; 1360's function dropped, restored and dropped again. Production post-state confirms `idx_kb_pages_org_created_by_id` = 1, `idx_kb_pages_org_created_by_membership_id` = 1, `app.search_kb_chunk_ids` = 0, `idx_kb_chunks_org_page_acl` = 0.
      **Hash/schema comparison: 80 of 80 KB-tagged journal entries applied**, matched on `hash` and `created_at` against production `drizzle.__drizzle_migrations` — 0 unapplied, 0 mismatches, 0 journalled-but-absent. Probe: `D:/agent-work/kb-ledger-reconcile.mjs`. Rejected `1347` remains deliberately unjournalled per ADR-0001.

**1370 re-checked 2026-09-27 — still unjournalled, and the journal has run past it.** `1370_kb_chunk_acl_dead_index.sql` and `1370_kb_chunk_acl_dead_index_rollback.sql` are both on disk. `migrations/meta/_journal.json` contains no `1370` tag, and its highest tags are now 1390–1395. Under BE-58 an unjournalled file never runs while `db:migrate` still prints success, so this migration has never executed and cannot execute as things stand.

What it does: `DROP INDEX idx_kb_chunks_org_page_acl` on `kb_article_chunks`, guarded by two `DO`-block preconditions (the table must exist; the index must still exist) and an `ASSERT` post-check.

Consequence of it never running is **write amplification, not an outage.** No reader depends on a dead index, so nothing 42P01s. But PostgreSQL still maintains every index on every insert and update, and `kb_article_chunks` is written in bulk on the reindex path — so the dead index is charged against exactly the operation that has to scale. This is a cost item, not a correctness one, and it should not be described as a live break.

**Resolved 2026-09-27 (owner decision): made idempotent, then journalled — commit `4980aea28`.** Journalling it unchanged would not have been a free fix. The second precondition `RAISE`d when `idx_kb_chunks_org_page_acl` was already absent, so arming the file would have failed the next `db:migrate` and blocked every migration behind it — in exactly the case where the migration's desired end state had already been reached. That precondition is removed; `DROP INDEX IF EXISTS` plus the surviving `ASSERT` post-check already make it correct and idempotent, and the rollback was already `CREATE INDEX IF NOT EXISTS`. The table-exists precondition is retained, because an absent table is a real error rather than a reached end state.

Editing the file was permissible only because it had never been applied — BE-60 protects applied migrations, whose hash is their identity. Journal entry is `idx` 1136, strictly increasing in both `idx` and `when`. The tag sorts below 1395, which is cosmetic: drizzle orders by journal position, not tag number.

**Not applied, and deliberately so.** This item's own framing is the right one — authored, journalled, applied and verified are four separate states, and this advances only the first two. Production is the only database; applying it is a production change and remains the owner's call. Two pre-existing `idx`/`when` ordering violations elsewhere in the journal (`0619_chain_creates_what_production_has`, `1155_build_cycles_drift_reconcile`) were observed while validating this entry and are not introduced by it.

### AV-14 — P1: authorization cache and effective test coverage

- [ ] Finish the consumer census of the ten security suites cited by R1, with at least one route-to-query or DB-backed counterexample for each security invariant. Test rollback, lost invalidation and revocation races. Centralize cache namespaces and ensure fingerprints distinguish user identity, principal kind/ceiling and relevant policy revisions before using them for result caches; `permissionFingerprintOf` currently includes membership/roles/containers but omits some of those dimensions. Cache failure may fall back to an authoritative read; it must never preserve revoked access.

### AV-15 — P2: satisfy the no-comments rule without losing evidence

- [x] **DONE 2026-09-27 — the KB module is now comment-free, and two of the three blocks were lying.** Remove explanatory source comments in changed KB code/tests.
      The audit named `kb-page-writer-coverage.spec.ts`; a sweep of `src/modules/kb/**` found
      exactly three comment sites, all now gone.
      **`kb-page-writer-coverage.spec.ts` — two blocks, both stale.** `NOT_YET_MIGRATED` was an
      empty `Set`, so the "not yet migrated" branch could never execute; its comment described a
      migration that had already finished. Dead branch and set removed. The `BLIND SPOT` block
      claimed `support/core/lib/support-kb-articles.ts::updateArticle` still emitted
      `kb.content.index` directly via `OutboxWriter.emit` — it does not: it takes
      `writer: KbPageWriterService` (`:109`) and calls `writer.commitPageChange` (`:197`), and
      `support-kb-article-reindex.spec.ts:94-128` already covers that behaviourally with one
      positive and two negatives. Nothing was lost by deleting it.
      **Added the control that spec lacked**, since seven `expect(...).toBe(true)` assertions
      with no counter-example would hold for any class: a class without the writer must report
      as uninjected. 11/11 pass.
      **`kb-content-health-keyset.spec.ts` — one docblock**, explaining that a helper branches on
      the rendered SQL rather than the intended shape. Folded into the name
      (`applyCursorPredicateFromRenderedSql`); the "what makes it bite" half was already carried
      by the spec's own control test at `:184`. 7/7 pass.
      **`kb-linked-documents-schema.db.spec.ts` — two trailing comments.** One became a test name
      ("admits a second unpublished link… because the one-live-link unique index is partial and
      history must not count against it"), extracted into its own `it` so the reason is attached
      to the assertion it explains; the other folded into the enclosing test's name.
      **Verified:** `src/modules/kb/**` now has 0 comment lines. The 4 remaining grep hits are
      false positives — route globs inside string literals (`/kb/articles/*`, `/support/kb/*`,
      `/kb/wiki/analytics/*`) and a `/* bound: */` marker inside a template literal.
      No license notice or tooling directive was touched; there were none in the module.
      **Suites after:** `src/modules/kb` + `src/modules/support` — 327 suites, 2965 tests, green.

### AV-16 — P1: verify public-response and attachment revocation by layer

- [ ] Record browser, Next fetch, backend, CDN and object-origin policy separately. `KbPublicPagesController.getPublicMedia` validates the token/key and then redirects to `NEXT_PUBLIC_R2_PUBLIC_URL/fileKey`. Verify whether a previously obtained destination remains readable after token revocation, attachment unlink or page deletion; source inspection alone does not establish the deployed origin policy. If it does, replace unrestricted destinations with an authorization-preserving delivery contract, with an explicit maximum exposure window, and test replay, cached redirects, key ownership and revocation. Do not close S17's attachment/public-grant or CDN checks based only on broker authorization or ETag presence.

### AV-17 — P1: finish browser and deployment verification for KB routes

- [ ] Deploy the current backend contract/query fixes, then retest every authenticated Knowledge Base route against that deployed artifact with browser console/network capture. The local browser pass found and locally mitigated the legacy gaps-array response, a citation-reuse 500 caused by malformed JSON citations, and a deployed 404 for `/kb/wiki/content-health/trend`; none can be checked as complete until the deployed API returns the documented contracts and the routes render without error-boundary or console failures. Record the deployment revision, migration state and focused test commands before checking any compound route acceptance item.

## Verification performed

Backend, from `backend/`:

```text
pnpm exec jest --runInBand --runTestsByPath
  src/modules/kb/core/authorization/knowledge-page-scope.spec.ts
  src/modules/kb/retrieval/kb-chunk-visibility.spec.ts
  src/modules/kb/retrieval/kb-retrieval.service.spec.ts
  src/modules/kb/retrieval/kb-search-connection-release.spec.ts
  src/modules/kb/retrieval/kb-search-acl-revision-passage-fence.spec.ts
  src/modules/kb/retrieval/kb-query-embedding-ttl.spec.ts
  src/modules/kb/wiki/kb-page-writer.spec.ts
  src/modules/kb/wiki/kb-page-writer-coverage.spec.ts
  src/modules/kb/wiki/kb-purge-pool-borrow.spec.ts
  src/modules/kb/content-health/kb-content-health-keyset.spec.ts
  src/modules/ai/core/services/kb-rag-public-ask-wallet.spec.ts
  src/modules/hr/performance/documents-update-metadata-pii.spec.ts
Result: 9 suites passed, 3 failed; 165 tests passed, 7 failed.
```

Frontend, from `frontend/`:

```text
pnpm exec jest --runInBand --runTestsByPath
  hooks/api/kb/import-export.test.tsx
  hooks/api/kb/page-collection.test.ts
  features/wiki/components/page-grants-sheet.test.tsx
  features/wiki/components/space-members-sheet.test.tsx
  features/wiki/components/content-health-page.test.tsx
  features/wiki/components/page-history-page.test.tsx
Result: 6 suites / 56 tests passed; SpaceMembersSheet description warnings.
```

All selected tests are local unit/component tests. No fresh browser sweep, real DB-row ACL test, production migration probe, load test or DR drill was performed by this audit. Completion of those items remains an explicit acceptance condition. A mock-based pass is labelled as such even when the test name says BITE or production.

### Follow-up verification during concurrent implementation

After the implementation session changed the retrieval imports/tests, reran the TTL, connection-release, passage-fence and retrieval-orchestration suites with the same `--runInBand --runTestsByPath` options: **3 suites passed, 1 failed; 23 tests passed, 2 failed**. Remaining failure: `svc.retrieveDocumentPassages is not a function` in `kb-search-acl-revision-passage-fence.spec.ts`. This supersedes the first run only for those four suites.

Also ran `pnpm exec jest --runInBand --runTestsByPath hooks/api/kb/from-ticket.test.tsx` in frontend: **1 suite / 6 tests passed**. Together with the prior frontend run, **7 distinct frontend suites / 62 tests passed**, with the recorded SpaceMembersSheet accessibility warning still open. No failure is described as fixed merely because another session is working on it.

Then ran the following frontend page batch with `pnpm exec jest --runInBand --runTestsByPath`:

```text
features/wiki/components/private-page.test.tsx
features/wiki/components/shared-page.test.tsx
features/wiki/components/wiki-home-page.test.tsx
features/wiki/components/wiki-home-all-pages.test.tsx
features/wiki/components/spaces-page.test.tsx
features/wiki/components/space-detail-page.test.tsx
features/wiki/components/page-document-toolbar.test.tsx
features/wiki/components/reviews-page.test.tsx
features/wiki/components/trash-page.test.tsx
features/wiki/components/templates-page.test.tsx
features/wiki/components/import-page.test.tsx
features/wiki/components/knowledge-analytics-page.test.tsx
features/wiki/components/kb-chat-parts.test.tsx
features/wiki/components/public-page-content.test.tsx
features/wiki/components/project-wiki-page-document.test.tsx
features/help-centre/components/kb-research-brief-detail.test.tsx
features/wiki/components/wiki-search-page.test.tsx
```

Result: **16 suites passed, 1 failed; 201 tests passed, 1 failed**. Spaces page's members-sheet test fails because its hook mock lacks `useAddKbSpaceMember`; record under AV-10. Search page tests also emit a DOM nesting warning from a test select double; fix the double and separately inspect production accessibility, rather than treating the mock warning as proof of a production hydration defect. Across the three distinct frontend batches: **23 suites passed, 1 failed; 263 tests passed, 1 failed**. These results establish component coverage, not full-page backend acceptance.

### Evidence for the only two retained main-ledger checks

Re-inspected the actual scope builder and spec, including live-grant characterization, fingerprint cases, and `fc.property` calls. Reran from `backend/`:

```text
pnpm exec jest --runInBand --runTestsByPath src/modules/kb/core/authorization/knowledge-page-scope.spec.ts
Result: 1 suite passed; 81 tests passed; exit 0.
```

Checkpoint: root `266330e77e5ba03936929c48ba70a91e73a8f1dc`, backend `d72942d4fa2bba8706dec45396d61d136230692c`, with concurrent working-tree changes. SHA-256 immediately after this run, paths relative to `backend/src/modules/kb/core/authorization/`:

| File | SHA-256 |
|---|---|
| `knowledge-page-scope.spec.ts` | `E61F97B34BF8A598184CFC13D9BAB66BF334EF82A51DBCB61C136099C1C2ECCD` |
| `knowledge-page-scope.ts` | `15C29F2536120AC5D2C3BC0278C68AEBDC36E2FF97D9356200AEC3D178049082` |
| `knowledge-authorization.types.ts` | `DD5CD52C41606A3A220EAD87ED0861F519E551D6518BD802F9FAB8E89C8636C3` |

This closes only the existence and tested behavior of those test implementations. SQL-shape/property tests do not prove real database authorization, RLS, container semantics, cache revocation or million-user capacity. Those requirements remain unchecked. Recheck hashes and rerun after any relevant implementation change; these are not immutable release-wide results.

## Requested three-pass recheck, including the original HTML reports

Performed three different checks, not three repetitions of a green test suite. No new completion checks were added. No application code, original HTML report, migration or production data was changed.

### Pass 1 — original-report coverage and completion evidence

Re-read R1 and R2, including R1's ten candidates, live defects, six deficient gates and top recommendation, and R2's ten findings and ADR note. Checked their disposition against this report and the ledger. The other HTML files in the same temp folder concern the whole application or Build module; they are not the two named Knowledge/Documents reviews.

Original HTML SHA-256 fingerprints:

| Report | SHA-256 |
|---|---|
| `architecture-review-20260926-153104.html` (R1) | `49E039D873DB11CDF8BDEF7EA9609C1685DB54289CF6B6B77E6A2D27CD466580` |
| `architecture-review-20260926-224038.html` (R2) | `5196773DBA43ED80F9B7EEE789D6B825D295DEA007EB55D0491D726F25049BD2` |

R1's six gate warnings remain explicitly tracked as follows:

| HTML gate warning | Recheck disposition |
|---|---|
| Cross-cutting invariant defeated by renaming an import | AV-14: require behavior through the live interface, not a symbol-name scan. |
| Ten security specs exercise the retired predicate | AV-14: complete the consumer census and real-row counterexamples; the current canonical spec is not a substitute for all ten. |
| Request-transaction checker misses embedding calls | Source has changed: the checker now derives provider methods and includes `embedQueryWithCredit` counterexamples. `node src/scripts/check-request-txn-outbound.mjs --self-test` passed in this recheck. This supersedes that specific old regex claim, but does not establish runtime connection safety or a clean whole-repository gate. AV-01/07 remain open. |
| GET-write checker misses search event writes | Keep query telemetry's detached-write semantics explicit; AV-06/11 require read-cost and transaction evidence. The historical absence of a warning is not a runtime proof. |
| Contract-parity baseline masks from-ticket and envelope drift | Fresh from-ticket and import/export tests pass; AV-10 still requires the real wire/route and idempotent retry, not array-shaped hook mocks. |
| Dead-code gate has stale verdicts and hook exemptions | AV-09 requires a current caller/compatibility census before removal, including public routes and jobs. Do not delete working grants/member UI on R1's old counts. |

### Pass 2 — current architecture and fresh regression tests

Re-read the canonical access branches, query-embedding cache/input normalization, candidate scope arguments, source-revision records, root/subtree purge path, public response/media controller, frontend public fetch and ADR-0001. The container-policy mismatch, global embedding key/input mismatch, missing page/source selected-space filtering, null source ACL revisions and held-descendant purge gap remain unresolved in inspected source. Migration 1370 still has no matching tag in `backend/migrations/meta/_journal.json` at this checkpoint; no database state was queried.

Corrected the overly broad public-cache wording: frontend fetch no-store and backend `public, no-cache` are not the same layer. Added AV-16 for revocation/replay verification of object URLs returned by the media broker. This is an unverified deployment risk, not a claim that an unauthorized object download was reproduced.

Fresh backend command, from `backend/`:

```text
pnpm exec jest --runInBand --runTestsByPath src/modules/kb/core/authorization/knowledge-page-scope.spec.ts src/modules/kb/retrieval/kb-search-acl-revision-passage-fence.spec.ts src/modules/kb/retrieval/kb-query-embedding-ttl.spec.ts src/modules/kb/retrieval/kb-search-connection-release.spec.ts src/modules/kb/retrieval/kb-retrieval.service.spec.ts src/modules/kb/wiki/kb-page-writer.spec.ts src/modules/kb/wiki/kb-purge-pool-borrow.spec.ts
```

Result: **6 suites passed, 1 failed; 126 tests passed, 2 failed; exit 1**. Both failures remain in the passage-fence suite calling removed `retrieveDocumentPassages` on the old service. These failures block that verification; they do not alone prove stale passages reach a live prompt.

Fresh frontend command, from `frontend/`:

```text
pnpm exec jest --runInBand --runTestsByPath features/wiki/components/spaces-page.test.tsx features/wiki/components/space-members-sheet.test.tsx hooks/api/kb/from-ticket.test.tsx hooks/api/kb/import-export.test.tsx
```

Result: **3 suites passed, 1 failed; 37 tests passed, 1 failed; exit 1**. Spaces page still fails on the missing `useAddKbSpaceMember` mock, while the standalone members sheet passes with the accessible-description warning. No code fix is inferred from another session's activity.

Root/backend HEADs and all three authorization file hashes match the earlier retained-check checkpoint above. The checkout remains dirty and shared. Tests were local unit/component checks; no DB-row, browser, load, deployment or disaster-recovery certification is implied.

### Pass 3 — documentation and checklist consistency

- Recounted the main ledger: **2 checked, 192 unchecked, 194 total**. The only retained checks still correspond to the inspected scope/fingerprint and property-test implementations, with the suite passing again. No product-wide percentage is asserted.
- Rechecked SESSION-01 through SESSION-08: the files currently contain 120 historical checkmarks and no open boxes, but their own README marks them as historical and non-authoritative. They are not counted as current completion because the main ledger's acceptance evidence was reopened under the stricter code-plus-verification-plus-tests rule.
- Checked all ledger AV references against report headings, and all relative Markdown-file links across **51 Markdown files**: no missing targets.
- Linked S17's still-open public-cache and attachment-grant requirements to AV-16. Kept missing implementation, failing verification and historical evidence distinct.
- Preserve the original HTML reports as dated evidence; their source counts, line numbers, speculative recommendations and fixed defects are not current acceptance results.

### Browser verification pass — 2026-09-27

Started the local frontend and exercised the authenticated Knowledge Base routes in the in-app browser: Wiki home, private, shared, spaces, reviews, trash, import/export, templates, search, a document, analytics and content health. The first Wiki-home load exposed a deployed-API projection drift: `/kb/pages/recent` omitted `legalHold` and `legalHoldReason` even though the frontend contract required them. The frontend list contract now defaults those omitted fields to `false`/`null`; the route rendered successfully afterward and the focused Wiki/import/trash tests passed (38 tests).

Analytics then exposed two backend compatibility defects. `/kb/analytics/gaps` returned a legacy bare array; the frontend contract now normalizes that response into a single cursor page, covered by a new contract test. The citation-reuse query could fail with malformed non-array JSON citations; the backend query now guards `jsonb_array_elements` with `jsonb_typeof(...)= 'array'`. The analytics and content-health frontend suites passed (54 tests), and the analytics route rendered its overview, page analytics and knowledge-gaps sections in the browser. The backend analytics service suite passed (20 tests).

The deployed API still returns 404 for `/kb/wiki/content-health/trend`, although the route exists in the current backend source. The content-health hook now treats this non-critical trend widget as an inline read so the Manage/Content Health route renders instead of entering the page error boundary. This is not deployment verification: the backend artifact containing the route must be deployed and the browser route retested before any content-health acceptance checkbox can be checked. The remote citation-reuse 500 also remains deployment-blocked until the guarded backend build is deployed and the endpoint is rechecked.

These browser passes do not add main-ledger completion checks. The ledger remains **2 checked, 192 unchecked, 194 total**; a route smoke test is not sufficient for the compound product, authorization, migration, performance or deployment acceptance criteria.

### Verification-pending inventory and current blockers

The ledger currently contains **164** `VERIFY PENDING` entries. They are not all the same kind of work:

- Cross-cutting authorization and read-cost items require application-role database rows, RLS/grant-only cases, revocation races and measured query plans; source inspection and SQL-shape tests are insufficient.
- Collection, search, spaces, editor, history, reviews, trash, templates, import/export, analytics and content-health items require mounted-route behavior plus their complete error, empty, keyboard/mobile and mutation/idempotency states. The browser smoke pass covered route loading only, not those compound acceptance claims.
- Retrieval/AI items require authorized-passage, provenance, citation-recheck, quota/concurrency and access-change tests against the deployed backend; the existing passage-fence suite still has two stale-interface failures.
- Public sharing and attachment items require deployed token revocation, cache/CDN replay and object-origin tests. Those cannot be certified from local source or a browser route alone.
- Migration, deletion and contraction items require a recorded database snapshot, journal/hash reconciliation, interruption/resume and rollback evidence. No destructive migration was executed during this pass.
- Queue, capacity, cost and SLO items require isolated load/soak or recovery drills with measured p95/p99, pool headroom, queue age and cost. No such environment was available in this pass.

Repository checks added evidence but did not close checklist items: the focused KB frontend suites (54 tests) and backend analytics suite (20 tests) passed; frontend and backend full type-checks still fail on unrelated Build/AI modules, with no KB/Wiki type errors in the filtered output. Therefore no pending item was marked complete solely from these checks.

### Fresh logged-in browser smoke pass — 2026-09-27

Using the existing authenticated in-app browser session, retested `/knowledge/wiki`, `/knowledge/wiki/private`, `/knowledge/wiki/shared`, `/knowledge/wiki/spaces`, `/knowledge/wiki/reviews`, `/knowledge/wiki/trash`, `/knowledge/wiki/import`, `/knowledge/wiki/templates`, `/knowledge/wiki/analytics`, `/knowledge/wiki/manage`, `/knowledge/wiki/search`, `/knowledge/wiki/doc/34` and `/knowledge/chat`. All 13 routes rendered without a generic error or not-found state, and the browser error log was empty after the retest. This is route smoke evidence only; it does not close the compound checklist items for permissions, mutations, mobile/keyboard behavior, data integrity, deployment or performance.
