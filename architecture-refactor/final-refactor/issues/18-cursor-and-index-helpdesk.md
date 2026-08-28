# 18: Cursor-page and index HR Helpdesk search

**What to build:** Helpdesk lists and searches stay bounded and tenant-safe without leading-wildcard table scans.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Lists use validated filters and stable cursor pagination.
- [ ] Search uses the approved tenant-safe indexed search mechanism.
- [ ] Permission/DataScope predicates execute before result retrieval.
- [ ] Production-shaped query plans and search/pagination tests pass.
