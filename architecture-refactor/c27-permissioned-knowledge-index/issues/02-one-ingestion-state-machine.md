# 02 — Every content type enters one ingestion state machine

**Status:** in-progress

## Acceptance criteria

- [x] Publish commits before any embedding provider call.
- [ ] An outbox event carries content id, content revision and ACL revision. — BLOCKED: `acl_revision`/`content_revision` columns exist in DB (migration 0498) but Drizzle schema files are out of scope; payload currently carries `contentId` only until schema agent updates schema files.
- [x] One ingestion module owns extraction, chunking, embedding, activation, retry and failure state. — `KbIngestionConsumer` in `kb-retrieval` module; `OutboxPublisherService` owns retry/dead-letter.
- [ ] Content adapters exist for wiki page, support article, file and note; no switch grows in the retrieval core. — page and article done; file and note adapters not yet added.
- [ ] `(content, revision, ACL revision, model)` uniqueness makes replay idempotent. — blocked on schema files for revision columns.
- [ ] Backpressure, concurrency, timeout and per-tenant quotas are explicit. — outbox publisher provides `LEASE_MS`/`BATCH_SIZE`; per-tenant quotas not yet added to consumer.

## Delivered

- `backend/migrations/0498_kb_ingestion_hardening.sql` Part B: `acl_revision` + `content_revision` columns on `kb_pages`, `kb_articles`, `kb_article_chunks`.
- `backend/src/modules/kb/retrieval/kb-indexing.service.ts`: embedding calls moved before every `db.transaction` in `indexArticle`, `indexPage`, `indexSource`, `indexAttachment`.
- `backend/src/modules/kb/retrieval/kb-ingestion-consumer.ts`: new `KbIngestionConsumer` handling `kb.content.index` events; routes to `indexPage` or `indexArticle`; registered via `OutboxConsumerRegistry`.
- `backend/src/modules/kb/retrieval/kb-retrieval.module.ts`: `OutboxModule` imported, `KbIngestionConsumer` in providers.
- `backend/src/modules/kb/wiki/kb-pages.service.ts`: all state transitions (`update`, `publish`, `archive`, `unarchive`) emit `kb.content.index` outbox events; `KbIndexingService` removed from constructor.
- `backend/src/modules/kb/help-centre/kb-articles.service.ts`: all state transitions (`update`, `publish`, `archive`, `unpublish`, `restoreVersion`) emit `kb.content.index` outbox events; `KbIndexingService` removed from constructor.

## Out-of-scope schema changes required (report to schema agent)

These Drizzle schema files must be updated by the schema-owning agent:
- `backend/src/db/schema/kb/pages.ts` — add `aclRevision: integer("acl_revision").default(1).notNull()` and `contentRevision: integer("content_revision").default(1).notNull()` to `kbPages`.
- `backend/src/db/schema/support/kb.ts` — same additions to `kbArticles`.
- `backend/src/db/schema/support/kb-chunks.ts` — add `aclRevision: integer("acl_revision")` and `contentRevision: integer("content_revision")` to `kbArticleChunks`.
