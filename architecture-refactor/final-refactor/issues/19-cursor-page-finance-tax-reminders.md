# 19: Cursor-page Finance tax and reminder APIs

**What to build:** Tax payment and reminder-policy APIs expose bounded stable lists using tenant-leading indexes and explicit projections.

**Blocked by:** 12 — Add the missing tenant-leading indexes.

**Status:** ready-for-agent

- [ ] List contracts use allowlisted Zod filters/sorts and stable cursors.
- [ ] Queries use explicit DTO projections and matching indexes.
- [ ] Retention behavior for delete/archive is implemented from the opening decision.
- [ ] Pagination, authorization and query-budget tests pass.
