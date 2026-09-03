# 16: Knowledge Base, Wiki and Chatbot

**What to build:** Knowledge revisions, ingestion, ACL-filtered retrieval, citations, deletion, reindexing, and editor states work safely at corpus scale.

**Blocked by:** 02 — Schema and executable-key minimization; 04 — API, Zod and OpenAPI contracts; 05 — Authentication, Organization, RBAC and Settings

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C133** — Architecture/schema: verify spaces, memberships, documents/pages, immutable revisions, attachments, ingestion jobs, chunks/embeddings and deletion/reindex state have tenant-composite integrity.
- [ ] **PRD-C134** — Queries/cache/workers: verify revision/search plans, ingestion leases/retries/DLQ, chunk dedupe, permission-aware cache keys, purge/reindex and realistic-corpus latency.
- [ ] **PRD-C135** — Frontend/TanStack/tests: verify editor/revision conflicts, search cursors, permission changes, citations/source integrity, ingestion states and ACL/purge/reindex E2E.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.

