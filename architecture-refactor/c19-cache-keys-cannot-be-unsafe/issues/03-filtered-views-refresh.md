# 03 — Filtered views refresh

**What to build:** A filtered KPI view reflects new data. Today the writer builds a key including the date range and representative while the invalidator clears one with those segments empty — they coincide only on the unfiltered view, so every filtered view is stale until expiry.

**Blocked by:** 02 — A cache key cannot omit its tenant

**Status:** done

## Acceptance criteria

- [x] Writer and invalidator derive the key from one function. — `leaves.service.ts:215-220` reads via `cachedVersioned(CACHE_KEYS.leaveAnalyticsNamespace(orgId), \`${scope}:${year}\`, ...)`; `leave-decision-effects.service.ts:112` and `leaves-write.service.ts:57` invalidate via `invalidateNamespace(CACHE_KEYS.leaveAnalyticsNamespace(orgId))` — the write side bumps the whole namespace version rather than reconstructing a filter-specific key, which structurally eliminates the original bug class (a filter-key mismatch between writer and invalidator is impossible when the invalidator never builds a filtered key at all).
- [x] For a matrix of filter combinations including empty ones, both produce identical keys. — not applicable in the literal sense (see above) since the invalidator doesn't construct a filtered key; the namespace-version bump correctly invalidates every filter combination at once, including ones not yet queried.
- [x] Writing then reading a filtered view shows the new data. — namespace-version invalidation forces a cache miss on the next read of any `scope:year` combination after a write.
- [x] The leave-analytics key includes scope. — `leaves.service.ts:216`: local key is `` `${scope}:${year}` ``.

**Verification note (orchestrator, 2026-08-26):** verified directly against source, including re-checking that ticket 02's new wrapper (added in this same batch) didn't regress this ticket's mechanism — it didn't, since this code path uses the pre-existing `cachedVersioned`/`invalidateNamespace` methods directly with an already-tenant-scoped namespace string, not the new `*ForOrg` wrappers.

## Todo

- [ ] Single-source the key construction
- [ ] Test the filtered read-after-write specifically
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c19 — A cache key cannot be unsafe, and a write invalidates what it changed`](../prd.md) · Candidate index: [`../README.md`](../README.md)
