# 15 — BOLA/IDOR sweep across every object-addressable surface

**What to build:** Systematic broken-object-level-authorization testing across reads, writes, bulk actions, files, exports, search and vector queries, realtime channels, background jobs and public/share-token paths. A cross-tenant miss returns 404, never 403 — a 403 confirms the object exists.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Every object-addressable route is probed with an id belonging to another organization and returns 404.
- [ ] Bulk endpoints are probed with a mixed-tenant id list; the whole request fails rather than silently processing the subset the caller owns.
- [ ] Export and search/vector paths apply the same DataScope as their sibling list endpoints — a list endpoint that scopes while its export sibling does not lets an own-scoped member read the whole organization.
- [ ] Realtime channel capability is tenant-checked at grant time, not only at subscribe time.
- [ ] Any optional filter that widens scope is authorized, and the gate is confirmed to actually bite: gating on a permission that sits beside the read key in the same roles is a no-op. Gate on the scopable key's DataScope.
- [ ] Authorization is asserted at the data layer for every read and write. Middleware and client checks are advisory and do not count as coverage.
