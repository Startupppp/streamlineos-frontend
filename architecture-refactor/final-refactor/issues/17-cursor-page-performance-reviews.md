# 17: Cursor-page HR performance reviews

**What to build:** Performance review lists use validated filters and stable cursors while preserving own/team/all DataScope behavior.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Primitive limit/offset inputs are replaced by a Zod list contract.
- [ ] Cursor order includes the requested sort and unique tie-breaker.
- [ ] Optional employee filtering cannot widen the caller's DataScope.
- [ ] Pagination stability, scope denial and query-plan tests pass.
