# 02 — Every content type enters one ingestion state machine

**Status:** done

## Acceptance criteria

- [x] Publish commits before any embedding provider call.
- [x] An outbox event carries content id, content revision and ACL revision. — `backend/src/db/schema/kb/pages.ts:50-51`, `backend/src/db/schema/support/kb.ts:83-84` carry `aclRevision`/`contentRevision`; propagated into outbox payloads at `kb-pages.service.ts:216-217,263,292,321,486-487` and `kb-articles.service.ts:283-284,325,356,382,479`.
- [x] One ingestion module owns extraction, chunking, embedding, activation, retry and failure state. — `KbIngestionConsumer` in `kb-retrieval` module; `OutboxPublisherService` owns retry/dead-letter.
- [x] Content adapters exist for wiki page, support article, file and note; no switch grows in the retrieval core. — `backend/src/modules/kb/retrieval/kb-content-adapter.ts`: page/article adapters plus new `KbSourceAdapter` (note via `noteText`, file via `StorageService`) and `KbAttachmentAdapter`, registered in `kb-retrieval.module.ts:29-35` and `kb-ingestion-consumer.ts:41-46`.
- [x] `(content, revision, ACL revision, model)` uniqueness makes replay idempotent. — `backend/migrations/0510_kb_chunk_revision_uniqueness.sql`: two partial unique indexes on `(org_id, article_id/page_id, chunk_index, content_revision, acl_revision, embedding_model)`.
- [x] Backpressure, concurrency, timeout and per-tenant quotas are explicit. — `LEASE_MS`/`BATCH_SIZE` pre-existing in `OutboxPublisherService`; `KB_MAX_CONCURRENT_PER_ORG = 20` added at `kb-ingestion-consumer.ts:16` with an in-memory per-org counter (process-local only — cross-node backpressure still relies on the outbox lease).

## Delivered

- `backend/migrations/0498_kb_ingestion_hardening.sql` Part B: `acl_revision` + `content_revision` columns on `kb_pages`, `kb_articles`, `kb_article_chunks`.
- `backend/src/modules/kb/retrieval/kb-indexing.service.ts`: embedding calls moved before every `db.transaction` in `indexArticle`, `indexPage`, `indexSource`, `indexAttachment`.
- `backend/src/modules/kb/retrieval/kb-ingestion-consumer.ts`: new `KbIngestionConsumer` handling `kb.content.index` events; routes to `indexPage` or `indexArticle`; registered via `OutboxConsumerRegistry`.
- `backend/src/modules/kb/retrieval/kb-retrieval.module.ts`: `OutboxModule` imported, `KbIngestionConsumer` in providers.
- `backend/src/modules/kb/wiki/kb-pages.service.ts`: all state transitions (`update`, `publish`, `archive`, `unarchive`) emit `kb.content.index` outbox events; `KbIndexingService` removed from constructor.
- `backend/src/modules/kb/help-centre/kb-articles.service.ts`: all state transitions (`update`, `publish`, `archive`, `unpublish`, `restoreVersion`) emit `kb.content.index` outbox events; `KbIndexingService` removed from constructor.

**Verification note (orchestrator, 2026-08-26):** the schema files listed below as blocked in the prior update were found already carrying the revision columns before this batch (kb schema is in-territory for this lane, not out of scope) — verified directly against source, not taken on the implementing agent's word.
