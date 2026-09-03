# 14: Inbox and Mail

**What to build:** Provider-neutral conversations support bounded sync, search, unread state, sending, retries, sanitization, and offline/revoked states.

**Blocked by:** 02 — Schema and executable-key minimization; 04 — API, Zod and OpenAPI contracts; 05 — Authentication, Organization, RBAC and Settings

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C130** — Queries/cache/workers: verify indexed conversation ordering/search/unread, incremental sync, idempotent send/receive, bounce/retry/DLQ and invalidation of list/thread/count keys.
- [ ] **PRD-C131** — Frontend/TanStack/tests: verify infinite lists, thread hydration, optimistic read/label rollback, compose/send states, offline/reconnect, sanitization and account-revocation E2E.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.

