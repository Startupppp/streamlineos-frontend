# c19 — A cache key cannot be unsafe, and a write invalidates what it changed

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 5 tickets, 4 done, 1 pending re-verification by the audit pass.

01 and 04 were re-verified and closed 2026-08-26: the mechanism is now asserted by reading through a real cache rather than by inspecting a mock's call list.

The cache primitive is genuinely deep — single-flight, a distributed fill lease, O(1) namespace versioning, no scanning on the request path. **Keep it entirely.** The gaps are in what callers are free to do around it: nothing pairs a write with an invalidation, and there is no TTL jitter anywhere.

⚠️ **The "216 unsafe call sites" premise was wrong.** Those call sites go through `CACHE_KEYS.*` factories that already take `orgId` as a required typed parameter, so the tenant cannot be omitted — it is a compile error. A migration onto the `*ForOrg` wrappers was performed and then **fully reverted** (16 files, ~50 sites): it replaced typed factories with magic string literals repeated at each call site, which re-creates the writer/invalidator divergence ticket 03 exists to prevent. See ticket 04 for the full reasoning, and the header of `backend/src/common/cache/cache-invalidation-matrix.ts` for the rule that replaces it.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [The books are correct the moment an entry posts](issues/01-the-books-are-correct-when-an-entry-posts.md) | — | **done** — read-after-write proved against a real `CacheService`, with two negative controls |
| 02 | [A cache key cannot omit its tenant](issues/02-a-cache-key-cannot-omit-its-tenant.md) | — | **done** |
| 03 | [Filtered views refresh](issues/03-filtered-views-refresh.md) | 02 | **done** — re-verified 2026-08-26; its last open box (a filtered read-after-write test) is now `hr/time/__tests__/leave-analytics-filtered-refresh.spec.ts`, 4 passing |
| 04 | [Every namespace declares its invalidation](issues/04-every-namespace-declares-its-invalidation.md) | 02 | **done** — 36 event-invalidated namespaces each carry a read-after-write test driven from the matrix |
| 05 | [Redis has a budget and an eviction policy](issues/05-redis-has-a-budget-and-an-eviction-policy.md) | — | **done** — tombstones are now eviction-proof (no TTL) with an explicit prune sweep, rather than depending on a read-side fallback |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
