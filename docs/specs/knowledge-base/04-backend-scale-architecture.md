# Step 4 — Low-Cost Backend Architecture for Millions of Users

## Goal and planning envelope

Design for scale without paying for scale before it exists. The target supports:

- 1,000,000 registered users and 100,000 daily active users;
- 10,000 requests/second global peak, with a read-heavy workload;
- 10 million current pages, 100 million revisions, 200 million searchable chunks;
- 2 TB of attachments plus exports;
- skewed tenants, including a few tenants with millions of pages or sustained imports.

These are capacity-test envelopes. Real traffic, data, and cost measurements decide when each scale step is activated.

## Recommended shape

Use a **modular monolith with separately scalable workers**. The current Nest/PostgreSQL codebase already has tenant transactions, outbox/workflow primitives, Redis-compatible cache/rate limiting, replica support, health checks, and many tenant-isolation tests. Deepen those assets instead of replacing them.

```text
Web / mobile
    |
CDN + WAF + global rate limit
    |
Stateless application replicas
    |--- authorization + content reads/writes
    |--- signed upload/download coordination
    |--- search/Ask orchestration
    |
PostgreSQL primary + read replica(s) ---- Redis (cache, rate limit, leases)
    |                 |
    |                 `-- bounded replica-safe read projections
    |
Transactional outbox / durable workflow
    |--- interactive indexing lane
    |--- imports/exports lane
    |--- embedding/AI lane
    |--- notifications/webhooks lane
    `--- analytics/retention lane

Object storage + CDN                 Search projection
attachments, exports, snapshots      lexical + vector candidates
```

No browser request waits for file conversion, embedding, reindexing, notifications, analytics aggregation, export generation, or purge fan-out.

## Deep modules and interfaces

### 1. `KnowledgeAuthorization`

**Interface**

```text
resolvePageAccess(actor, pageId, action) -> Allowed<PageScope> | NotFound | Denied
buildVisiblePageScope(actor, action) -> database predicate / scope token
resolveSpaceAccess(actor, spaceId, action) -> Allowed<SpaceScope> | NotFound | Denied
permissionFingerprint(actor) -> short-lived versioned fingerprint
```

**Implementation:** tenant standing, organization role, project membership, space membership, ownership, page grants, public token, record status, and policy versions.

All page detail, list, search, Ask, citations, analytics, reviews, links, exports, and jobs cross this seam. Adapters may translate the scope to PostgreSQL or search filters, but no caller rebuilds authorization rules.

### 2. `KnowledgeContent`

**Interface**

```text
createPage(command, idempotencyKey) -> PageProjection
updateContent(pageId, expectedRevision, document) -> PageProjection | Conflict
updateMetadata(pageId, patch) -> PageProjection
movePage(pageId, destination, expectedTreeRevision) -> MoveResult
archive/restore/pagePurgeRequest(...) -> LifecycleResult
```

**Implementation:** validation, tree invariants, version append, content text projection, links, audit, outbox, and exact cache patches in one transaction.

### 3. `KnowledgeCollection`

**Interface:** one normalized cursor request and one stable list projection for pages, spaces, reviews, templates, jobs, trash, and health signals.

**Implementation:** cursor codec, authorized predicate, selective projection, facets, stable order, query budget, and response metadata.

This replaces browser filtering over the full tree and removes one-off list semantics.

### 4. `KnowledgeIndex`

**Interface**

```text
schedule(recordKind, recordId, contentRevision, aclRevision, reason)
remove(recordKind, recordId, aclRevision)
search(actorScope, query, filters, cursor) -> SearchPage
getIndexState(recordKind, recordId) -> IndexState
```

**Implementation:** outbox consumption, structure-aware chunking, content-hash reuse, lexical projection, embedding batches, vector candidates, tombstones, retry/dead-letter, and freshness telemetry.

### 5. `KnowledgeAnswer`

**Interface:** question + source scope + budget → streamed answer events with citations or an explicit insufficient-evidence result.

**Implementation:** admission control, deterministic search, hybrid retrieval, ACL recheck, rerank, context budget, provider call, citation validation, feedback, and cost ledger.

### 6. `KnowledgeBlob`

**Interface:** authorize upload, finalize scanned object, issue authorized read, expire/export, purge.

**Implementation:** signed URLs, malware scan state, checksum, object lifecycle, CDN policy, and purge ledger. Page modules never learn provider details.

### 7. `KnowledgeGovernance`

**Interface:** compute explainable signals, assign/review/resolve/dismiss, and list health work.

**Implementation:** review policy, freshness budget, usage impact, link checks, Ask gaps, contradiction candidates, audit, and notifications.

## Request paths

### Page read

1. Authenticate and resolve tenant placement.
2. Resolve access through `KnowledgeAuthorization`.
3. Read the current page projection from primary/replica according to consistency requirement.
4. Return an ETag/revision and signed attachment references.
5. Record visit/analytics asynchronously.

No cache is trusted for a revoked grant without a current permission fingerprint. Missing and unauthorized records return the same 404 response.

### Page write

1. Validate command and idempotency key.
2. Authorize exact action.
3. In one tenant transaction: compare revision, append version, update current projection, write audit event and outbox record.
4. Return the complete client cache-patch projection.
5. Workers reindex, notify, aggregate, and invalidate derived caches.

### Search/Ask

1. Normalize query and authorized scope.
2. Run lexical and semantic candidate retrieval in parallel when semantic is available and budgeted.
3. Fuse/rerank candidates.
4. Recheck current authorization and current content/ACL revision before exposing snippets or sending context to a model.
5. Search returns results; Ask streams an answer with exact citations or insufficient evidence.

## Scale evolution

### Stage A — single primary, workers, optional Redis

Appropriate until measured CPU/IO, storage, or connection limits require more. Use managed PostgreSQL multi-AZ, object storage, CDN, and the existing workflow/outbox.

### Stage B — read replicas and table/index partitioning

- Route only safe stale-tolerant projections to replicas.
- Keep permission changes, detail-after-write, conflict, share, purge, and public-token revocation on the primary.
- Partition the largest append-heavy tables only after evidence: audit/events, chat messages, analytics facts, outbox history, versions, and chunks.
- Prefer hash partition by tenant bucket plus time partition where retention benefits. Do not partition every table.

### Stage C — tenant placement cells

When a single database or blast radius becomes unacceptable, place tenants into cells. A cell contains application/worker capacity, PostgreSQL, cache, and search partitions. Tenant placement is versioned and fenced; clients never select a cell directly.

- Small tenants share cells.
- Very large or regulated tenants can receive isolated cells.
- Cross-tenant analytics use privacy-safe asynchronous aggregates, never live fan-out reads.
- Migrations are resumable and dual-read only for a bounded cutover window.

### Stage D — selective extraction

Extract only a module with proven independent pressure, such as indexing/embedding or public publishing. The module keeps the existing interface and outbox contract. Do not split content and authorization across unreliable synchronous calls.

## Database and connection strategy

- Connection budget is a hard capacity. Use a pooler and set per-replica/per-worker limits; background lanes cannot exhaust interactive connections.
- No provider or object-storage request inside a database transaction.
- Use statement and idle-in-transaction timeouts; cancel abandoned searches.
- Every tenant-owned table uses tenant-leading uniqueness/FKs or an equally strong RLS/placement invariant.
- Every unbounded list has a stable keyset order, default ≤ 50, maximum ≤ 100.
- Use projections, not `SELECT *`; page bodies are absent from list/search metadata queries.
- Maintain application-role `EXPLAIN` evidence at realistic cardinality before adding an index. Remove redundant indexes only after write/read measurement.

## Search architecture at 200 million chunks

The current global HNSW candidate pass with tenant filtering can become expensive and can lose recall for small tenants because nearest global vectors may be dominated by other tenants. The target evolves in steps:

1. Keep PostgreSQL full-text search for exact/navigation and moderate scale.
2. Store chunk `orgId`, record kind/id, revision, ACL revision, heading path, content hash, language, token count, and trust metadata.
3. Separate lexical and vector candidate interfaces; fuse with explainable ranking.
4. Partition vector indexes by placement cell or tenant bucket. Exceptional tenants receive dedicated partitions.
5. Use iterative/oversampled vector scans with a final current-ACL recheck; measure recall on minority tenants.
6. Introduce an external search engine only when PostgreSQL cost/latency/operability fails an agreed threshold. Preserve the `KnowledgeIndex` interface.
7. Index current searchable revisions only. Historical versions remain retrievable by id and are embedded only for explicit audit/research use.

## Caching

Cache only expensive, reusable projections:

- page metadata/detail by tenant + page + content/ACL revision;
- list/search pages by normalized filters + cursor + permission fingerprint;
- space/member policies with very short TTL and event invalidation;
- public page render by token revision at CDN;
- embedding vectors by model + content hash;
- provider-independent deterministic retrieval results where safe.

Cache is optional. On failure, reads fall through to the source with rate protection. Authorization never fails open. Revocation changes the fingerprint and actively invalidates affected keys.

## Queue and fairness model

| Lane | Work | Target age | Admission |
|---|---|---:|---|
| Interactive index | page create/update/delete | p95 < 60 s | highest background priority |
| Access revocation | ACL/token/space changes | p95 < 15 s | reserved workers; fail closed at read |
| Import/export | bulk conversion and archives | p95 start < 5 min | per-tenant concurrency and byte quotas |
| Embedding/AI | chunks, briefs, generated drafts | budget-dependent | tenant credits, batch, provider circuit breaker |
| Notifications/webhooks | direct assignments/events | p95 < 60 s | dedupe and retry budget |
| Analytics/retention | rollups, expiry, purge | hours/daily | cheapest capacity; resumable |

Every job has an idempotency identity, bounded attempts, exponential backoff with jitter, lease recovery, dead-letter state, correlation id, and operator-visible failure reason.

## Reliability targets

| SLI | Initial objective |
|---|---:|
| Authenticated page read availability | 99.95% monthly |
| Page write availability | 99.9% monthly |
| Search availability | 99.9% monthly, lexical fallback |
| Public page availability | 99.95% monthly with CDN stale-if-error where safe |
| Page read server p95 / p99 | < 250 ms / < 750 ms |
| List/search server p95 / p99 | < 500 ms / < 1.5 s |
| ACL revocation on authoritative reads | immediate |
| Search/Ask revocation propagation | p95 < 15 s, hard upper bound 60 s |
| Index freshness | p95 < 60 s, p99 < 5 min |
| RPO / RTO | ≤ 5 min / ≤ 60 min initially; tighten by contract |

Provider-dependent AI latency is measured separately and cannot consume the page-read error budget.

## Failure behavior

- PostgreSQL unavailable: fail writes, serve only explicitly safe CDN public content; never accept a phantom save.
- Redis unavailable: bypass cache, apply local conservative rate limits, protect the database; do not mark the app unhealthy solely for cache loss if source capacity is safe.
- Search/vector unavailable: serve lexical/database search or clear degraded state; page reads/writes continue.
- AI provider unavailable/over budget: deterministic search with sources; no page write is lost.
- Object storage unavailable: page text works; attachments show retryable unavailability; uploads do not finalize.
- Worker backlog: expose freshness, prioritize revocations/indexing, pause imports/embeddings, alert on age rather than queue length alone.
- Replica lag: route consistency-sensitive reads to primary and remove lagging replica from rotation.

## Cost controls

- Managed PostgreSQL, object storage, CDN, Redis, and the current durable workflow are the default stack.
- Store large files/exports/snapshots in object storage; metadata and current text projections remain queryable.
- Batch embeddings and cache by tenant-safe content hash. Do not re-embed unchanged chunks.
- Use smaller models for query classification/summarization and premium models only when measured quality requires them.
- Hard limit context, output, concurrency, and daily/monthly spend per tenant. Always retain non-AI search.
- Aggregate analytics asynchronously and tier raw events by retention.
- Charge/plan around active authors, indexed volume, storage, and AI usage rather than external readers where possible.
- Review the cost per weekly successful knowledge resolution, not only cost per request.

## Architecture decisions still requiring measurement

- Whether PostgreSQL FTS + pgvector meets p95 and minority-tenant recall at 200 million chunks.
- Whether current full-document revision storage is costlier than snapshots plus deltas after compression.
- Whether real concurrent editing justifies a CRDT/OT collaboration runtime.
- Which tenant size or workload triggers dedicated placement.
- Whether an external search platform reduces total cost after operations and synchronization are included.

None of these should be decided from competitor checklists alone.
