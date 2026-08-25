# 02 — Every content type enters one ingestion state machine

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Publish commits before any embedding provider call.
- [ ] An outbox event carries content id, content revision and ACL revision.
- [ ] One ingestion module owns extraction, chunking, embedding, activation, retry and failure state.
- [ ] Content adapters exist for wiki page, support article, file and note; no switch grows in the retrieval core.
- [ ] `(content, revision, ACL revision, model)` uniqueness makes replay idempotent.
- [ ] Backpressure, concurrency, timeout and per-tenant quotas are explicit.
