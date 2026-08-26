# c19 — A cache key cannot be unsafe, and a write invalidates what it changed

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 5 tickets, 3 done, 2 in-progress.

The cache primitive is genuinely deep — single-flight, a distributed fill lease, O(1) namespace versioning, no scanning on the request path. **Keep it entirely.** The gaps are in what callers are free to do around it: nothing requires a tenant in a key, nothing pairs a write with an invalidation, and there is no TTL jitter anywhere. No permission-dimension leak was found across 216 call sites — the discipline has held, and these tickets make it structural.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [The books are correct the moment an entry posts](issues/01-the-books-are-correct-when-an-entry-posts.md) | — | **done** |
| 02 | [A cache key cannot omit its tenant](issues/02-a-cache-key-cannot-omit-its-tenant.md) | — | in-progress — wrapper + jitter shipped; stampede-spread not proven |
| 03 | [Filtered views refresh](issues/03-filtered-views-refresh.md) | 02 | **done** |
| 04 | [Every namespace declares its invalidation](issues/04-every-namespace-declares-its-invalidation.md) | 02 | in-progress — matrix written; only 18/~216 call sites migrated (lane territory only) |
| 05 | [Redis has a budget and an eviction policy](issues/05-redis-has-a-budget-and-an-eviction-policy.md) | — | in-progress — budget + policy documented; session-revocation fallback gap surfaced, not fixed |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
