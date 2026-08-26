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

**Audit note (2026-08-26):** Verified acceptance criteria against source. Leaves analytics uses namespace-version invalidation (`CACHE_KEYS.leaveAnalyticsNamespace`) so the key construction is single-sourced; the write side never reconstructs a filter-specific key. See verification note above.

## Todo

- [x] Single-source the key construction — `backend/src/modules/hr/time/leaves.service.ts:215-217` reads via `cachedVersioned(CACHE_KEYS.leaveAnalyticsNamespace(u.orgId), ...)`. `backend/src/modules/hr/time/leaves-write.service.ts:56-57` and `backend/src/modules/hr/time/leave-decision-effects.service.ts:112` both call `invalidateNamespace(CACHE_KEYS.leaveAnalyticsNamespace(orgId))`. The invalidator never reconstructs a filter key; a single namespace reference is the only key in play.
- [x] Test the filtered read-after-write specifically — `backend/src/modules/hr/time/__tests__/leave-analytics-filtered-refresh.spec.ts` (4 tests, all passing). It drives the real `CacheService` over an in-memory Redis, the real `LeavesService.analytics` read and the real `LeavesWriteService.cancel` write: `:153-171` reads a filtered view, proves the second identical read is a cache hit (fetcher count stays at 4), runs the write, and asserts the third read returns the new data; `:173-188` proves a *different* filter (year 2025) the write never touched is refreshed too; `:190-205` pins the key shape as `hr:leave-analytics:<orgId>:v<n>:<scope>:<year>`; `:207-216` proves a second tenant is not served the first tenant's view. A writer/invalidator key mismatch fails the first test.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — README row 03 shows `done`. — `architecture-refactor/c19-cache-keys-cannot-be-unsafe/README.md:13`

---

PRD: [`c19 — A cache key cannot be unsafe, and a write invalidates what it changed`](../prd.md) · Candidate index: [`../README.md`](../README.md)
