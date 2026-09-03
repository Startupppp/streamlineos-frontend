# 16: Knowledge Base, Wiki and Chatbot

**What to build:** Knowledge revisions, ingestion, ACL-filtered retrieval, citations, deletion, reindexing, and editor states work safely at corpus scale.

**Blocked by:** 02 — Schema and executable-key minimization; 04 — API, Zod and OpenAPI contracts; 05 — Authentication, Organization, RBAC and Settings

**Status:** partial — 4 of 6 KB provider-in-transaction violations fixed, 1 live indexing defect fixed, permission-aware cache keys verified correct; latency and E2E not run. Report: `reports/16-knowledge-wiki-chatbot.md`

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C133** — Architecture/schema: verify spaces, memberships, documents/pages, immutable revisions, attachments, ingestion jobs, chunks/embeddings and deletion/reindex state have tenant-composite integrity.
  PARTIAL: deletion/reindex state verified against HEAD rather than re-derived — de-indexing is correct in all three places and `kb-indexing.service.ts` carries the `isNull(kbPages.deletedAt)` predicate. FINDING: there is NO ingestion-job table; `kb_sources.status` is the whole state machine, advanced by an in-process after-commit hook, so there is no lease, no retry, no DLQ and a restart strands a source in `processing` forever. Needs a schema change — reported, not made. FINDING: `kb_space_grants` has no writer anywhere in the application, so that ACL branch is permanently empty. NOT RUN: spaces/memberships/revisions/attachments composite-integrity sweep.
- [ ] **PRD-C134** — Queries/cache/workers: verify revision/search plans, ingestion leases/retries/DLQ, chunk dedupe, permission-aware cache keys, purge/reindex and realistic-corpus latency.
  PARTIAL: permission-aware cache keys VERIFIED CORRECT, not assumed — KB has exactly one cached read and `kbAclCacheKey` carries permissionsVersion + membershipId + userId and throws rather than build an ACL-blind key; both invalidation paths (space membership, org-membership revocation via the version dimension) confirmed covered. No KB namespace has the `chat:unread` dead-bump shape. Ingestion leases/retries/DLQ: absent, see C133. NOT RUN: revision/search plan analysis, chunk dedupe audit, realistic-corpus latency (no buffer measurements taken for KB).
- [ ] **PRD-C135** — Frontend/TanStack/tests: verify editor/revision conflicts, search cursors, permission changes, citations/source integrity, ingestion states and ACL/purge/reindex E2E.
  PARTIAL: citations/source integrity verified sound and preserved — `resolveCitations` re-verifies every candidate against the asker's visibility AFTER the model answers, and the kb-ask phase split keeps that under the same predicates. 308/308 KB+HR suites green (1983 tests, EXIT=0), including three KB specs repaired to model a real transaction. NOT RUN: editor/revision conflicts, search cursors, permission-change behaviour, ACL/purge/reindex E2E; `features/wiki/**` and `features/help-centre/**` not audited.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
