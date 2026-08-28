# 19: Cursor-page Finance tax and reminder APIs

**What to build:** Tax payment and reminder-policy APIs expose bounded stable lists using tenant-leading indexes and explicit projections.

**Blocked by:** 12 — Add the missing tenant-leading indexes.

**Status:** implemented

- [x] List contracts use allowlisted Zod filters/sorts and stable cursors.
- [x] Queries use explicit DTO projections and matching indexes.
- [x] Retention behavior for delete/archive is implemented from the opening decision.
- [x] Pagination, authorization and query-budget tests pass.

Evidence: finance tax and reminder lists use bounded ID cursors and explicit projections; archive columns and tenant-leading indexes are journaled in migrations 0631 and 0632.
