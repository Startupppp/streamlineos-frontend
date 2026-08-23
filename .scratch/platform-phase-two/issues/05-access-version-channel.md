# 05 — A revoked permission stops working on every instance, not just one

**What to build:** A real cross-instance channel for access changes.

Today the only thing carrying an access change between running instances is a five-second timer that re-reads a version number from the database. The in-process notification is a set of listeners in module scope and never crosses a process boundary, so a grant revoked on one instance is honoured by every other instance until their timer expires and they go back to the database.

That five seconds is not a tuning constant. It is the entire cross-instance revocation mechanism, which is why nobody can lengthen it — and it costs a database transaction per organization per instance per window, which is why nobody wants to shorten it. Per-person grants land in the same caches and inherit the same window.

This ticket makes the version a counter shared through the cache. Reading it becomes how instances learn, so the timer becomes a backstop rather than the mechanism, and the window becomes a policy decision with a written value.

**Blocked by:** 01 — Pin what an authorization resolution costs.

**Status:** ready-for-agent

- [ ] One module owns publishing and subscribing to access version changes for an organization. Nothing outside it knows how the change travels.
- [ ] The version is read from a shared counter in the cache, falling back to the durable database row on a miss and repopulating from it.
- [ ] A change published by one subscriber is observed by an independent subscriber over the same shared cache double — proven without booting two servers.
- [ ] The existing in-process notification survives as the **local fan-out behind the new interface**, so a change on this instance still clears its own caches synchronously rather than waiting for a read.
- [ ] The bump continues to fire **before** the writing transaction commits, and the reason is recorded where the code is: over-invalidation costs one wasted re-read, under-invalidation honours a revoked grant.
- [ ] The in-process time-to-live becomes a backstop and is **shortened**. Its new value is stated with the reason it was chosen.
- [ ] A cache outage falls back to the database rather than towards granting access.
- [ ] The cold and warm borrow assertions from ticket 01 are updated to the new numbers, and the warm number has not got worse.
- [ ] **No part of the design depends on cache pub/sub.** The only client in this repository speaks HTTP and cannot hold a subscription. Coherence comes from the counter being shared, not from it being pushed. This constraint killed the first version of this design and must not be rediscovered.
- [ ] This reuses the existing namespace-generation pattern in the cache service rather than adding a parallel mechanism — that pattern already does exactly this, and membership status already uses it.
- [ ] No change to who is allowed to do what.
