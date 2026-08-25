# c27 · Indexed knowledge obeys the same visibility as direct reads

**Status: disclosure parity is fixed; lifecycle parity is incomplete.** Verified at source 2026-08-26. `visibleTo`, direct page reads, keyword retrieval and vector retrieval share the same predicate, and chunk rows carry denormalized ACL columns. The previous cross-scope disclosure is closed. KEEP that seam. Wiki page full-text search still runs under RLS without the bounded definer probe used by articles; article publishing can synchronously embed hundreds of chunks; and version growth is unbounded on articles.

## Problem Statement

Correct ACL filtering can still be too expensive to use. Under Neon RLS the non-leakproof text operator prevents the GIN index from winning, turning a search into a tenant-sized scan. Synchronous ingestion couples a user write to an external embedding provider and holds request resources. ACL changes can temporarily reduce recall until chunks are refreshed. Unbounded full snapshots make revision history the first storage cost to grow quadratically with active editing.

## Solution

Keep one visibility predicate and deepen ingestion/retrieval around it.

Every content type emits a content-revision event after commit. A durable ingestion module extracts text, hashes content and ACL separately, chunks, embeds through a provider port, writes the new revision atomically, then tombstones the old revision. Keyword and vector retrieval accept the actor context and bounded query, apply tenant and ACL predicates in the database/search index, and return citations only from rows the direct read can still resolve.

Exactly-once delivery is not required. At-least-once jobs plus `(contentId, contentRevision, aclRevision, model)` uniqueness make replay harmless.

## Implementation Decisions

**KEEP**

- `visibleTo`, `pageVisibleTo`, `chunkVisibleTo` and read/search parity tests.
- Denormalized ACL columns on chunks for indexed filtering.
- HNSW vector indexing and source-text hash guards.
- Separate internal wiki and support help-centre content models.

**REPLACE**

- Synchronous article embedding with durable async ingestion.
- Per-content ingestion branches with one registry of content adapters.
- Unbounded full revision snapshots with bounded milestone snapshots plus deltas/retention.

The content adapter interface exposes extraction, ACL resolution and citation construction. Postgres and object storage are local-substitutable dependencies; the embedding provider is a true external adapter and is mocked in tests.

## Testing Decisions

- Direct read, keyword search, vector search and chatbot citation agree for every visibility case.
- Changing an ACL increments `aclRevision`; the old index revision never widens access.
- A failed provider call leaves the published record durable and the ingestion job retryable.
- Replaying a job writes no duplicate chunks.
- Deleted/archived content disappears from retrieval before physical retention cleanup.
- Query caps bound candidate count, chunk bytes, model tokens and provider cost.

## Out of Scope

- A separate Elasticsearch/OpenSearch cluster before Postgres budgets prove it necessary.
- Merging the internal wiki and support help centre.
- Letting the model decide authorization.
