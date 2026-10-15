# Architecture PRD: Knowledge Base and Documents

**Inputs:** September 26 Knowledge Base (`153104`) and Documents (`224038`) HTML reviews. **Status:** source candidates, checked against the current specification on 2026-10-10. `docs/specs/knowledge-base/OPEN-TASKS.md` is the execution queue; matching work below points there rather than creating a second release checklist. Historical counts and defect claims need reproduction on the current revision.

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
| KD-11 / Documents 1–4 | Architecture decision | Define the vocabulary for document, page, file, version and audience; measure current table cardinality and cross-module imports; choose compatible identities and migration order. No wholesale table split based on the old report alone. |
| KD-12 / Documents 5–6 | Hygiene, not independent product work | Split oversized implementations or duplicate DTOs only when an active owner package is edited; preserve interface behavior and generated contract parity. |
| KD-13 / Documents 7–9 | Verify need | Check chunk ACL expressiveness, import-cycle adapter and cache-key construction against current source. Keep a module only if its interface earns leverage; test every cache key for tenant, audience and revision dimensions. |
| KD-14 / Documents 10 | Security regression | Replace any test that mocks an unused predicate with a test that executes the production visibility seam and fails when it is removed. |

## Historical defects requiring separate current-code confirmation

### Architecture execution checklist

- [ ] KD-01 page visibility
- [ ] KD-02 page-change event
- [ ] KD-03 retrieval and citation
- [ ] KD-04 provider connection budget
  - 2026-10-16 partial evidence: backend `ffddcf4df` moved the storage sweep's provider deletion outside its tenant transaction and kept pending-purge/quarantine reads and writes in short tenant transactions. The transaction-boundary focused suites passed 20/20. A small-pool brown-out run with measured connection occupancy remains open.
- [ ] KD-05 query embedding cache decision
- [ ] KD-06 measured search query plan
- [ ] KD-07 chunk ACL
- [ ] KD-08 page contract
- [ ] KD-09 Help Centre authority
  - 2026-10-16 code-backed direction: retain `kb_pages` as the content identity, with `support_article` edited/published by Support at `/support/kb/{articleId}` and read publicly at `/help/{orgId}/{slug}`; Wiki excludes this content type. Keep the Support article slug distinct from the Wiki public slug, and use numeric IDs for internal editor links. Frontend `accb03827` corrects the knowledge-gap draft link; backend `ab747bc64` corrects Support AI suggestion links. Focused tests and scoped lint passed. The permanent editor/adapter decision, full caller census, per-record data reconciliation, role/browser parity and migration rollback remain open.
- [ ] KD-10 dead-route census
- [ ] KD-11 Documents identities
- [ ] KD-13 cache/import/ACL check
- [ ] KD-14 production predicate test

- [ ] KD-D1: public Ask rate, spend and abuse limits; prove unauthenticated request cost is bounded.
  - 2026-10-16 partial evidence: backend `9c0a81b58` makes the public Ask organization budget fail closed with 503 when Redis is unavailable, before retrieval or provider work on both JSON and streaming routes; 34 focused tests passed. The existing per-IP guard, org tier and credit reservation are present in source. Live rate, credit-spend and abuse measurements remain open.
- [ ] KD-D2: newly created page indexing and retry visibility.
  - 2026-10-16 partial evidence: backend `1e5516f19` routes manual page reindex through a durable `kb.content.index` outbox event, so indexing status can report pending, in-flight, delivered and dead retries. Three focused suites passed 39/39. New-page outbox emission has focused coverage; real worker processing, database recovery, search visibility and browser status remain open. KB producers also use millisecond `aggregateVersion` values under a per-aggregate unique index; same-millisecond collision risk is under review.
- [ ] KD-D3: HR metadata PII gate after publish and citation replay.
  - 2026-10-16 partial evidence: backend `1842c8491` applies the authoritative metadata scanner to linked-document reads, Ask eligibility, file open and saved citation titles; `1b79081e4` preserves list/search recall when unsafe rows precede safe rows; `09a230db3` hides unsafe document-cited answer bodies in history and blocks unsafe stream replay. `dbe10beb0` adds a KB-owned JSON Ask fence that rechecks saved citations and answer before replay, closing the shared-interceptor bypass in source; its four focused suites passed 57/57. Direct post-publish database mutation and live browser/role replay remain open.
- [ ] KD-D4: trash purge progress for replicas and interruption recovery.
  - 2026-10-16 partial evidence: backend `7a289fe0a` adds a page-to-pending-storage correlation and reconciles the blob purge ledger only after mapped objects are confirmed; `ffddcf4df` moves provider I/O out of the tenant transaction; `21e659305` commits the sweep confirmation and page-ledger reconciliation atomically. Focused purge suites passed 84/84 and sweep suites 21/21. Pre-2046 pending keys have no page identity, so mixed historical/new ownership needs database inspection and a safe backfill or explicit exception before historical purge completion can be claimed. Migrations, retries against real object storage, replica behavior, and interrupted live runs remain unverified.
- [ ] KD-D5: ticket-to-article success/error translation and duplicate submission.
  - 2026-10-16 partial evidence: backend `5b8a70c1a` adds the command fence, one source-ticket identity, an authorized retry lookup and a tenant-scoped uniqueness race path; article creation and its event now share a transaction. Focused tests pass. Migration 2044 is not applied, and the deployed HTTP contract plus browser duplicate-submission flow remain unverified (`KB-OPEN-006`, `KB-OPEN-020`).
- [ ] KD-D6: ACL cache key/admin semantics and security tests reaching the actual request path.

For each row, append the matching `KB-OPEN` ID or a current-code reproduction to the implementation claim. Unit evidence does not close browser, database, worker or deployment gates.
