# Architecture PRD: Knowledge Base and Documents

**Inputs:** September 26 Knowledge Base (`153104`) and Documents (`224038`) HTML reviews. **Status:** source candidates, checked against the current specification on 2026-10-10 with targeted current-code rechecks on 2026-10-24. Two of 19 execution checkboxes are complete as scoped below; this is not a product-completion percentage. `docs/specs/knowledge-base/OPEN-TASKS.md` is the execution queue; matching work below points there rather than creating a second release checklist. Historical counts and defect claims need reproduction on the current revision. The 2026-10-16 production migration and release evidence is recorded in that queue; this PRD's earlier read-only notes are historical unless updated below.

## Interface and ownership

Documents owns source identity, audience, versions and safe file retrieval. Knowledge Base owns pages, indexing and search composition. A visibility decision must bind tenant, current actor, object, revision and audience before content becomes a passage, citation, export or cached result. Help Centre ownership remains a product decision; no route or table is to be removed before that decision and a caller census.

## To-do register

| ID | Current disposition | To-do and acceptance evidence |
| --- | --- | --- |
| KD-01 / KB 1 | Existing queue | Link the page visibility work to the matching `KB-OPEN` item. Exercise owner, member, revoked, cross-tenant and public cases through the production predicate; citation open must recheck access. |
| KD-02 / KB 2 | Existing queue | Audit page create, update, archive, purge and ACL-change producers into one durable page-changed event. Prove idempotent indexing and recovery from a failed worker. |
| KD-03 / KB 3 | Existing queue | Keep one Documents/KB retrieval interface for scoped passages and citations. Test source status, revision, degraded channel and inaccessible source handling. |
| KD-04 / KB 4 | Existing queue | Measure provider waits outside pooled tenant transactions; fail or cancel safely without holding a connection. |
| KD-05 / KB 5 | Verify need | Measure repeated query-embedding cost and key safety before adding cache state; tenant, model version, normalized query and authorization changes must prevent stale disclosure. |
| KD-06 / KB 6 | Verify need | Compare query plans for the reported OR predicate against the present schema and representative volumes. Split only if measured plans or latency show a material regression. |
| KD-07 / KB 7 | Existing queue | Check whether chunk-level predicates can express the actual page/source audience without post-filter leaks; deny tests and query plans are acceptance evidence. |
| KD-08 / KB 8 | Verify need | Inventory list response/page contracts and frontend callers. Standardize cursor, count, loading/empty/denied/error behavior only where callers still diverge. |
| KD-09 / KB 9 | Decision open | Record Help Centre authority, publishing path and audience projection, then migrate links and callers before removing duplicate implementations. |
| KD-10 / KB 10 | Conditional cleanup | For each dead-route candidate, record registered routes, internal/public callers, redirects, data retention and replacement proof. Delete only after this ledger is clean. |
| KD-11 / Documents 1–4 | Decision complete; migration separate | Define the vocabulary for document, page, file, version and audience; measure current table cardinality and cross-module imports; choose compatible identities and migration order. No wholesale table split based on the old report alone. |
| KD-12 / Documents 5–6 | Hygiene, not independent product work | Split oversized implementations or duplicate DTOs only when an active owner package is edited; preserve interface behavior and generated contract parity. |
| KD-13 / Documents 7–9 | Verify need | Check chunk ACL expressiveness, import-cycle adapter and cache-key construction against current source. Keep a module only if its interface earns leverage; test every cache key for tenant, audience and revision dimensions. |
| KD-14 / Documents 10 | Regression complete; live access separate | Replace any test that mocks an unused predicate with a test that executes the production visibility seam and fails when it is removed. |

## Historical defects requiring separate current-code confirmation

### Architecture execution checklist

- [ ] KD-01 page visibility
- [ ] KD-02 page-change event
  - 2026-10-16 partial evidence: backend `d120246d9` and `3fa9fcec4` route text-only, empty-text and generic metadata PATCH writes through expected revision guards, canonical critical audit and page-change outbox in one transaction. Status, visibility, tree, restore, import and version paths have a source census recorded under `KB-OPEN-014`. Focused suites passed; real database rollback, failed-worker replay, frontend caller parity and deployed search recovery remain open.
- [ ] KD-03 retrieval and citation
- [ ] KD-04 provider connection budget
  - 2026-10-16 partial evidence: backend `ffddcf4df` moved the storage sweep's provider deletion outside its tenant transaction and kept pending-purge/quarantine reads and writes in short tenant transactions. The transaction-boundary focused suites passed 20/20. A small-pool brown-out run with measured connection occupancy remains open.
- [ ] KD-05 query embedding cache decision
- [ ] KD-06 measured search query plan
  - 2026-10-16 read-only configured-Neon evidence: `EXPLAIN` without `ANALYZE`, inside a `READ ONLY` transaction with a five-second timeout, found a sequential scan for the canonical page-scope OR predicate (estimate nine rows, cost 101.28). The sampled organization had only nine KB pages and no grants, so this cannot establish a material regression or justify splitting the predicate. The configured URL was later matched exactly to Railway production `APP_DATABASE_URL`; representative grant-bearing plans remain unmeasured.
- [ ] KD-07 chunk ACL
  - 2026-10-16 source and read-only plan evidence: the chunk predicate correlates to the canonical page scope and candidate join checks ACL revision. The sampled organization had five chunks; its plan used a hash join and small table scans (estimate one row, cost 4.34). Six focused deny/ACL suites passed 53/53. Representative grant-bearing rows and live citation/provider disclosure still need verification.
- [ ] KD-08 page contract
- [ ] KD-09 Help Centre authority
  - 2026-10-16 code-backed direction: retain `kb_pages` as the content identity, with `support_article` edited/published by Support at `/support/kb/{articleId}` and read publicly at `/help/{orgId}/{slug}`; Wiki excludes this content type. Keep the Support article slug distinct from the Wiki public slug, and use numeric IDs for internal editor links. Frontend `accb03827` corrects the knowledge-gap draft link; backend `ab747bc64` corrects Support AI suggestion links. Focused tests and scoped lint passed. The permanent editor/adapter decision, full caller census, per-record data reconciliation, role/browser parity and migration rollback remain open.
- [ ] KD-10 dead-route census
- [ ] KD-13 cache/import/ACL check

- [ ] KD-D1: public Ask rate, spend and abuse limits; prove unauthenticated request cost is bounded.
  - 2026-10-16 partial evidence: backend `9c0a81b58` makes the public Ask organization budget fail closed with 503 when Redis is unavailable, before retrieval or provider work on both JSON and streaming routes; 34 focused tests passed. The existing per-IP guard, org tier and credit reservation are present in source. Live rate, credit-spend and abuse measurements remain open.
  - Backend `6d7752e73` caps the KB-specific public Ask organization identifier at 128 characters before either JSON or streaming input can create a caller-chosen Redis budget key. Failing-first 129-character and valid 128-character route-schema controls passed in 27 focused tests with scoped lint. Live per-IP/org 429, Redis outage and credit-spend proof remain open.
- [ ] KD-D2: newly created page indexing and retry visibility.
  - 2026-10-16 partial evidence: backend `1e5516f19` routes manual page reindex through a durable `kb.content.index` outbox event, so indexing status can report pending, in-flight, delivered and dead retries. Three focused suites passed 39/39. `2390bd172` replaces same-millisecond KB producer versions with increasing transaction-scoped values; `0734aa824` also reads retained inbox history after outbox retention, with 37 focused tests for that helper and producer paths. New-page outbox emission has focused coverage; real worker processing, database recovery, search visibility, query cost and browser status remain open.
- [ ] KD-D3: HR metadata PII gate after publish and citation replay.
  - 2026-10-16 partial evidence: backend `1842c8491` applies the authoritative metadata scanner to linked-document reads, Ask eligibility, file open and saved citation titles; `1b79081e4` preserves list/search recall when unsafe rows precede safe rows; `09a230db3` hides unsafe document-cited answer bodies in history and blocks unsafe stream replay. `dbe10beb0` adds a KB-owned JSON Ask fence that rechecks saved citations and answer before replay, closing the shared-interceptor bypass in source; its four focused suites passed 57/57. Direct post-publish database mutation and live browser/role replay remain open.
- [ ] KD-D4: trash purge progress for replicas and interruption recovery.
  - 2026-10-16 partial evidence: backend `7a289fe0a` adds a page-to-pending-storage correlation and reconciles the blob purge ledger only after mapped objects are confirmed; `ffddcf4df` moves provider I/O out of the tenant transaction; `21e659305` commits the sweep confirmation and page-ledger reconciliation atomically. Focused purge suites passed 84/84 and sweep suites 21/21. Migration 2046 is applied. Pre-2046 pending keys have no page identity, so mixed historical/new ownership needs database inspection and a safe backfill or explicit exception before historical purge completion can be claimed. Retries against real object storage, replica behavior, and interrupted live runs remain unverified.
- [ ] KD-D5: ticket-to-article success/error translation and duplicate submission.
  - 2026-10-16 partial evidence: backend `5b8a70c1a` adds the command fence, one source-ticket identity, an authorized retry lookup and a tenant-scoped uniqueness race path; article creation and its event now share a transaction. Focused tests pass. Migration 2044 is applied; the deployed HTTP contract and browser duplicate-submission flow remain unverified (`KB-OPEN-006`, `KB-OPEN-020`).
- [ ] KD-D6: ACL cache key/admin semantics and security tests reaching the actual request path.
  - 2026-10-16 partial evidence: backend `d27970af2` binds the KB standing request memo and page-search cursor fingerprint to user, principal kind and ceiling. Failing-first tests reproduced narrow-token admin-standing reuse and cross-actor cursor collision; 196 focused tests passed, including the page-search query seam. Shared RBAC/cache files were untouched. Live role revocation, DB-backed request paths and cache invalidation timing remain open (`KB-OPEN-024`, `KB-OPEN-027`, `KB-OPEN-033`).

For each row, append the matching `KB-OPEN` ID or a current-code reproduction to the implementation claim. Unit evidence does not close browser, database, worker or deployment gates.
