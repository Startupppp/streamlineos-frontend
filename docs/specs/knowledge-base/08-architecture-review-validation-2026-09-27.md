# Architecture review validation — 2026-09-27

## Scope and evidence rules

Reviewed both supplied reports in full:

- **R1:** Architecture review — StreamlineOS Knowledge Base (document module), `architecture-review-20260926-153104.html`.
- **R2:** Documents module — architecture review, `architecture-review-20260926-224038.html`.

The originals are in `C:/Users/Aditya_Lappy/AppData/Local/Temp/`. This document preserves their finding IDs and decisions so the backlog does not depend on temporary HTML files. Also inspected the requirement ledger, session evidence, `CONTEXT.md`, backend ADR-0001, backend/frontend coding rules, and the reachable implementations.

This was a documentation and verification task. No application code, schema, production data or deployment was changed by this review. Another session was editing and committing concurrently. One recorded source checkpoint was root `ffc97b8ebc3043bdd4a60bad98b43d7812fdb5e5`, backend `91f76c85fd768bd3de59c1811b7c3b43a3f00253`, plus working-tree changes. Test results below describe that changing checkout, not a certified release artifact.

**Do not equate a checked box with release readiness.** The starting ledger had **190 checked / 194 total (97.9%)**, although it retained descriptions saying features were dormant or absent. The earlier 74% estimate is historical. Neither ratio measures security, latency, capacity, or deployment completion. Reopened items have a concrete defect or missing acceptance evidence below. Untouched checks retain their historical evidence; they are not all independently re-certified by this audit.

Use these statuses: **source present**, **targeted tests passed**, **partial/defect**, **evidence pending**, and **conditional/deferred**. `VERIFIED` requires the entire acceptance claim and a recorded source revision/environment. Historical counts in the HTML reports are not current measurements.

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
| Replica/CDN deployment | Conditional. If no replica is deployed, keep authorization on primary and record replica work as deferred. If public responses are `no-store`, CDN invalidation is not an implemented capability. Introduce caches only with a measured gain and enforceable revocation policy. |

Technical references: [PostgreSQL index combination](https://www.postgresql.org/docs/17/indexes-bitmap-scans.html), [PostgreSQL privileges](https://www.postgresql.org/docs/16/ddl-priv.html), and [TanStack infinite-query guidance](https://tanstack.com/query/v3/docs/framework/react/guides/infinite-queries). These support the qualifications above; they do not substitute for local measurements.

## Both architecture reports: disposition of every numbered item

| Report item | Current evidence and disposition | Remaining work |
|---|---|---|
| R1-C1 one access seam | Canonical scope includes restrictions; `KbAccessService.assertCanViewArticle` delegates to canonical access. Cache dimensions now include principal kind and ceiling. Container semantics still disagree with the glossary. | AV-02, AV-14 |
| R1-C2 page changed writer | `wiki/kb-page-writer.service.ts` exists; create writes `contentText` and invokes it. Writer suites pass. Its coverage test checks constructor injection, not all operations. | AV-03 |
| R1-C3 retrieve seam | `KbRetrievalService.retrieve` exists; extraction into `KbSearchRetrievalService` is in progress. Mocked orchestration tests pass while several real-service tests fail. | AV-01, AV-04 |
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
| From-ticket success contract mismatch | Requires current response-contract/integration evidence; included in AV-10 rather than accepted from an old green gate. |
| Narrow token shares owner's ACL cache | Principal kind/ceiling dimensions and common fill logic are now present. Remaining invalidation/fingerprint audit is AV-14. |
| Security specs test unused pageVisibleTo | Current canonical and chunk suites target the live builders. Finish the cited suite census under AV-14. |
| Page deletion fails to invalidate collections | Collection key is now under `kb/pages`, so page-prefix invalidation reaches it. Real mounted consumer behavior belongs to final UI gates. |
| Space archive leaves detail stale | Space detail key is now under `kb/spaces`; list-prefix invalidation reaches it. The old string-prefix finding is resolved in source. |
| Export history does not refresh/poll | Export hook now polls pending/processing jobs; import/export tests pass. Retain completion/failure/cancel and refetch evidence. |
| Content Health cursor uses wrong order | Keyset suite passes; current source and UI suites support the fix. |

## Actionable TODOs

These are the new canonical review items. Ledger checkboxes reference these IDs; session notes are historical evidence, not additional copies of this backlog.

### AV-01 — P0: finish retrieval extraction and restore meaningful tests

- [ ] Update production injection, imports, return types and tests to the final retrieval interface. The first audit run had **3 failing suites / 7 failing tests**: embedding TTL, search connection release, passage ACL fence. Tests call methods removed from `KbSearchService`; one mock lacks `resolveAccessibleSpaces`. Run all affected Ask/search callers plus a Nest registration/DI smoke test and both typechecks after the editing session settles. Do not silence failures or recreate pass-through wrappers just to satisfy stale mocks.

### AV-02 — P0: make container policy consistent and test actual disclosure

- [ ] Apply the agreed private-space/project rule to creator, owner, explicit member/role grant and ordinary visibility branches, with any privileged exception explicit. Cover restricted-space grant-only pages and revocation through detail, collection, FTS, vector candidates, prompt passages, citations, attachment download and export. Current SQL property tests are useful but insufficient; execute representative rows under the application DB role. Never authorize prompt content merely because its citation is hidden later.

### AV-03 — P1: complete the write interface and atomicity proof

- [ ] Make a page-change operation own or explicitly require the expected revision, revision increment, audit and outbox in the same transaction. Current `commitPageChange` accepts revisions already calculated by callers and does not write an audit. Replace constructor-injection-only coverage with behavioral checks for create, duplicate, move, restore, import, status/publication, support authoring and empty-content updates. Prove transaction rollback leaves neither a mutation nor an index event, and engagement does not reindex.

### AV-04 — P1: preserve retrieval scope, provenance and failure state

- [ ] Pass requested space/source/type/owner/status/verified filters consistently into candidate and passage queries. Current page candidate calls do not receive `spaceId` in `retrieveTopArticles`; source retrieval is given source IDs but no selected-space argument. Reject unsupported UI scope fields instead of implying they are applied.
- [ ] Return typed per-channel outcomes for empty, disabled, degraded and failed. `retrieveDocumentPassages`/`retrieveTopSources` catch and return `[]`; a successful embedding then makes the facade report non-degraded results. An empty authorized result means no matching accessible evidence, not proof of an empty tenant corpus.
- [ ] Persist actual source content/ACL revisions and provider context provenance. `buildAskSourceRecords` and the original `buildSourceRecords` write `aclRevision: null`. A JSON field called `sourceIdsWithRevisions` is not reconstruction evidence.

### AV-05 — P1: correct embedding-cache isolation and cost behavior

- [ ] Replace the global key with the tenant/provider/model/dimension/preprocessing/input contract above; use identical input normalization for key and provider. Test cross-tenant separation, case-sensitive queries, cache outage, model change, expiry and concurrent misses. Meter actual provider work once and report cache hits separately; prove budget checks still apply. Keep TTL configurable and document deletion/retention behavior.

### AV-06 — P1: finish measured query and search-quality evidence

- [ ] Capture before/after app-role `EXPLAIN (ANALYZE, BUFFERS)` for collection UNION, full search, chunk semi-joins, facets and health queries. Use representative rows and grant density, including grant-only and restricted-space tenants; include query count, buffers, rows scanned, p95/p99 and minority-tenant retrieval recall. The historical 50k-page/100k-grant bad-plan record is useful but does not close the rewritten query. Use an isolated load environment; rollback fixtures in production still consume locks, WAL, CPU and storage and are not free.
- [ ] Convert or explicitly time-bound the remaining `/kb/search` offset/count implementation and its whole-`contentText` fetch for snippets. Current `kb-search.service.ts` uses `.offset(offset)` and counts all matches. Produce bounded metadata/snippets in SQL and stable keysets. Preserve public contract compatibility during migration.

### AV-07 — P0/P1: purge must respect holds and finish outside request occupancy

- [ ] **P0:** Enforce holds on every descendant, not just the root. `hardDelete` checks the root's `legalHold`, then `collectSubtreeIds` includes all descendants and the delete targets them without a hold predicate. Lock/recheck the affected scope or abort the operation atomically; add held-child/unheld-root, concurrent hold, and bulk/retention cases. Verify allowed lifecycle state before hard deletion.
- [ ] **P1:** Finish durable bounded purge commands, per-store retry and backpressure. Trace request transaction exit through blob/cache work; prove there is no nested second borrow or connection held during outbound I/O. Run a ten-concurrent-purge/provider-brown-out test against a small pool with interactive traffic and cancellation. Do not infer end-to-end safety from helper tests alone.

### AV-08 — P1: finish useful module interfaces, not mechanical file splits

- [ ] Inventory remaining external table reads and give billing/lifecycle needs explicit bounded interfaces or documented privileged exceptions. Keep distinct authenticated, public, maintenance and linked-HR access contracts. Centralize variant selection without erasing HR/source/attachment identity. Replace `KbDocumentQueryService` leading-wildcard scans with indexed lexical retrieval; bound the merged result, escape search syntax consistently, and preserve the acyclic dependency graph.

### AV-09 — P1: retire only proven duplicates and keep needed UI

- [ ] Record retained owner, route contract and callers for each R1-C10 candidate, including public/API consumers and scheduled jobs. Preserve grants/member management, useful verification and required redirects. Verify deregistered routes have no promised consumers, then remove dead controller/service/schema/test files together. Review current help-centre ownership and module registration after the concurrent changes; no wholesale deletion from the old 54-route count.

### AV-10 — P1: contracts and reachable UI

- [ ] Verify each migrated envelope through the real HTTP parser and query hook, not a hook mock that already returns an array. Include from-ticket create success/idempotent retry, grants create/list parity, export history and each response projection. Update `selectFlatPages` documentation to describe its actual selected result, and retain raw page metadata where needed.
- [ ] Fix `SpaceMembersSheet`'s missing accessible description. The six-suite frontend run passed, but Radix emitted the warning repeatedly and the source lacks `SheetDescription`. Verify keyboard/focus behavior and 375px layout on the real routes; green DOM tests alone do not close the global accessibility checkbox.

### AV-11 — P1: operational proof and truthful metrics

- [ ] Record current read/write/search/Ask and all indexing-path instrumentation, redaction coverage, query/connection budgets, revocation lag, purge backlog, KB cost and operator alert delivery. Existing Ask/search/index metrics do not prove every required dimension or a live dashboard. Do not emit a guessed cache/replica result as observed telemetry.
- [ ] Run restore/reindex/tenant export-delete drills and load/soak at measured current traffic and 10×, then the agreed capacity envelope in isolation. Publish p95/p99, failure rate, queue recovery, pool headroom, RPO/RTO and cost per successful resolution. Keep replica, CDN, partition/cell/external-search expansion deferred until measured triggers and deployment prerequisites exist.

### AV-12 — P1: bound the PII decision and reconcile terminology

- [ ] Amend ADR-0001's broad PostgreSQL claims while retaining the chosen application scan; document runtime/migration privileges and the controlled direct-write scan or quarantine path. Test every scanned field on every legitimate writer, plus linked-document revocation. Treat prompt-injection defenses separately from PII regexes. Reconcile the glossary with AV-02 and AV-04; a citation policy must never widen provider disclosure. This document supplies the corrected KB decision; the owning HR/backend ADR still needs its corresponding edit.

### AV-13 — P1: migration and release proof

- [ ] Reconcile new KB migration files, journal entries, rollback paths and actual database hashes/schema at the deployment being released. `1370_kb_chunk_acl_dead_index.sql` was on disk but not in the journal at this audit checkpoint. Authored, journalled, applied and verified are four separate states. The old 1174 cutover evidence remains historical; do not reapply it. Keep rejected 1347 outside execution until a new decision supersedes ADR-0001. Re-run targeted tests on the final source revision; do not declare another session's dirty changes deployed.

### AV-14 — P1: authorization cache and effective test coverage

- [ ] Finish the consumer census of the ten security suites cited by R1, with at least one route-to-query or DB-backed counterexample for each security invariant. Test rollback, lost invalidation and revocation races. Centralize cache namespaces and ensure fingerprints distinguish user identity, principal kind/ceiling and relevant policy revisions before using them for result caches; `permissionFingerprintOf` currently includes membership/roles/containers but omits some of those dimensions. Cache failure may fall back to an authoritative read; it must never preserve revoked access.

### AV-15 — P2: satisfy the no-comments rule without losing evidence

- [ ] Remove explanatory source comments in changed KB code/tests after retaining necessary rationale in docs and behavior in test names. `kb-page-writer-coverage.spec.ts` currently contains multiple explanatory comment blocks, so the blanket no-comments completion checkbox is false. Do not remove license notices or directives required by tooling as cosmetic cleanup.

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
