# 19: TanStack Query integrity

**What to build:** Frontend queries use canonical scoped keys, runtime parsing, cancellation, invalidation, pagination, and concurrency-safe optimistic behavior.

**Blocked by:** 06–17 — all product-domain slices

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C007** — **TanStack:** complete v2 ticket 19's permissioned-read, required-identifier, query-key, pagination, runtime parsing, cancellation, invalidation and optimistic-update criteria.
- [x] **PRD-C095** — Verify one hierarchical query-key factory per domain includes organization, subject, scope, filters, sort and cursor dimensions as applicable.
- [x] **PRD-C096** — Gate queries with effective access and required identifiers; disabled queries must not send unauthorized or malformed requests.
- [x] **PRD-C097** — Verify mutations invalidate or update every affected list/detail/count/dashboard key and roll back optimistic state safely on failure.
- [x] **PRD-C098** — Use optimistic updates only where concurrency semantics are defined; otherwise await the backend result and invalidate deterministically.
- [x] **PRD-C099** — Verify cursor pagination does not duplicate/skip records and changing filter/sort resets pagination correctly.
- [x] **PRD-C100** — Verify loading, background-refresh, empty, partial-error, full-error, offline, permission-denied and revoked-access states.
- [ ] **PRD-C101** — Prove frontend types and runtime parsing cannot silently accept a backend contract change.
- [ ] **PRD-C137** — TanStack/contracts: verify query-key factories, parsing, invalidation, hydration, cancellation, retry, optimistic concurrency and pagination rules across every module above.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
