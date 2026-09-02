# 28 — Complete the TanStack Query data-layer contract

**What to build:** The remaining §8 criteria: key factories carrying every correctness dimension, access-gated queries, complete invalidation, safe optimistic state, correct cursor behaviour and runtime parsing that cannot silently accept a contract change.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] One hierarchical key factory per domain, carrying organization, subject, scope, filters, sort and cursor dimensions as applicable.
- [ ] Queries are gated by effective access and required identifiers; a disabled query sends no unauthorized or malformed request.
- [ ] Every mutation invalidates or updates each affected list, detail, count and dashboard key, and rolls optimistic state back safely on failure.
- [ ] Optimistic updates are used only where concurrency semantics are defined; otherwise the backend result is awaited and invalidation is deterministic.
- [ ] Cursor pagination neither duplicates nor skips records, and changing filter or sort resets pagination. Test with disagreeing ids — an id-only cursor against a compound sort silently duplicates and skips.
- [ ] Loading, background-refresh, empty, partial-error, full-error, offline, permission-denied and revoked-access states are each covered.
- [ ] Runtime parsing rejects a backend contract change rather than silently accepting it; client types mirror the backend schema exactly.
- [ ] A key factory is never called with no arguments — a trailing undefined matches nothing and silently kills the invalidation it was written for.
