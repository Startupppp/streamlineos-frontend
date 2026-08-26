# c19 — A cache key cannot be unsafe, and a write invalidates what it changed

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 5 tickets, 3 done, 2 in-progress.

The cache primitive is genuinely deep — single-flight, a distributed fill lease, O(1) namespace versioning, no scanning on the request path. **Keep it entirely.** The gaps are in what callers are free to do around it: nothing pairs a write with an invalidation, and there is no TTL jitter anywhere.

⚠️ **The "216 unsafe call sites" premise was wrong.** Those call sites go through `CACHE_KEYS.*` factories that already take `orgId` as a required typed parameter, so the tenant cannot be omitted — it is a compile error. A migration onto the `*ForOrg` wrappers was performed and then **fully reverted** (16 files, ~50 sites): it replaced typed factories with magic string literals repeated at each call site, which re-creates the writer/invalidator divergence ticket 03 exists to prevent. See ticket 04 for the full reasoning, and the header of `backend/src/common/cache/cache-invalidation-matrix.ts` for the rule that replaces it.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [The books are correct the moment an entry posts](issues/01-the-books-are-correct-when-an-entry-posts.md) | — | needs re-verification |
| 02 | [A cache key cannot omit its tenant](issues/02-a-cache-key-cannot-omit-its-tenant.md) | — | in-progress — wrappers + jitter shipped; one criterion open: concurrent distinct-key misses not independently proven |
| 03 | [Filtered views refresh](issues/03-filtered-views-refresh.md) | 02 | needs re-verification |
| 04 | [Every namespace declares its invalidation](issues/04-every-namespace-declares-its-invalidation.md) | 02 | needs re-verification |
| 05 | [Redis has a budget and an eviction policy](issues/05-redis-has-a-budget-and-an-eviction-policy.md) | — | in-progress — budget + policy documented; session-revocation eviction gap is real, and the naive fix was tried and reverted |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
