# S10 — Knowledge, Wiki, Chatbot and AI

Status: active

Independent scope: backend Knowledge/KB/Wiki/Chatbot, ingestion/feature-search/vector and AI gateway modules/workers; matching frontend knowledge/search/editor/chatbot/AI features and hooks. It consumes generic storage/integration adapters without editing them. Schema and migration edits belong to S02.

Master coverage: sections 10.16 and 12.3 plus owned parts of sections 3–8 and 11.

## Acceptance criteria

- [ ] Verify spaces, memberships, pages/documents, immutable revisions, attachments, ingestion jobs, chunks/embeddings and purge/reindex state with tenant-composite integrity.
- [ ] Concentrate page/article visibility at the data seam for content, comments, reviews, attachments, search and retrieval; prove revocation and ACL predicates before keyword/vector/model context.
- [ ] Verify bounded cursor CRUD/search/review/export contracts and resumable idempotent ingestion, chunking, embedding, deletion and reindex workers with leases, cancellation and DLQ.
- [ ] Route all AI calls through the backend gateway with deterministic authorization, atomic token-credit reserve/settle, bounded context/tools/concurrency and abort/deadline/circuit-breaker behavior.
- [ ] Prove prompt-injection, SSRF, tool-argument and data-exfiltration controls, structured output/citation integrity, tenant-safe AI caching and redacted metrics.
- [ ] Verify streaming, cancellation, partial/error/credit/provider states and permission changes without duplicate paid requests; run realistic-corpus focused performance tests.
- [ ] Run focused Knowledge/AI authorization, ingestion, retrieval, streaming and purge tests plus targeted gates; record results.
- [ ] Reconcile this session and the master PRD using the README protocol.

## Completion

- [ ] S10 is complete; commit/evidence: _pending_.
