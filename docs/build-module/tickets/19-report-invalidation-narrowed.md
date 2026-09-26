# 19 — Narrow the report invalidation to the mutation that moves it

**What to build:** Editing a ticket title, or dragging it to reorder, stops evicting six report caches. Every ticket mutation currently invalidates all six project reports regardless of whether the mutation could have changed any of them — the module's own caching policy already specifies otherwise: a title edit should invalidate nothing, a rank change nothing, a status transition only the three reports that depend on status. The policy calls the current code the right prefix mechanism applied at the wrong altitude.

The same policy sets a two-minute staleness floor for the report reads; all six sit at one minute, so a client can refetch and receive data older than it believed possible.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] One place maps mutation kind to the reports that mutation can actually move
- [ ] A title edit and a rank change evict no report cache
- [ ] A status transition evicts only the reports that depend on status
- [ ] All six report reads use the documented staleness floor
- [ ] Every cache key shape that is invalidated still has a reader
