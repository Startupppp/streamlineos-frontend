# c19 — A cache key cannot be unsafe, and a write invalidates what it changed

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 5 tickets, all done. Closed 2026-08-26.

The cache primitive is genuinely deep — single-flight, a distributed fill lease, O(1) namespace versioning, no scanning on the request path. **Keep it entirely.** The gaps were in what callers were free to do around it: nothing paired a write with an invalidation, and there was no TTL jitter anywhere.

⚠️ **The "216 unsafe call sites" premise was wrong.** Those call sites go through `CACHE_KEYS.*` factories that already take `orgId` as a required typed parameter, so the tenant cannot be omitted — it is a compile error. A migration onto the `*ForOrg` wrappers was performed and then **fully reverted** (16 files, ~50 sites): it replaced typed factories with magic string literals repeated at each call site, which re-creates the writer/invalidator divergence ticket 03 exists to prevent. The corrected rule lives in the header of `backend/src/common/cache/cache-invalidation-matrix.ts`: use `CACHE_KEYS` when a factory exists; reach for a `*ForOrg` wrapper only for a genuinely new key with no registry entry.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | The books are correct the moment an entry posts | — | **done** |
| 02 | A cache key cannot omit its tenant | — | **done** |
| 03 | Filtered views refresh | 02 | **done** |
| 04 | Every namespace declares its invalidation | 02 | **done** |
| 05 | Redis has a budget and an eviction policy | — | **done** |

## Closed ticket digests

**01 — The books are correct the moment an entry posts.** `finance-posting.service.ts:406-411` invalidates `ACCT_STATEMENTS_NS(orgId)` and `CACHE_KEYS.finReportsNamespace(orgId)` strictly after the transaction commits; a rolled-back post never reaches the invalidation code. `finance-posting-read-after-write.spec.ts` (7 tests) drives real `FinancePostingService` and `AccountingStatementsService` over an in-memory Redis double with two negative controls: one proves staleness persists without invalidation, one pins what the namespace bump buys. Cash flow rides the same namespace bump but has no dedicated test (its aggregate query complexity prevented a fully general double).

**02 — A cache key cannot omit its tenant.** `cache.service.ts:167-197` adds `cachedForOrg`/`cachedVersionedForOrg`/`invalidateForOrg`/`invalidateNamespaceForOrg`; `applyJitter` at `:163-165` (±15% of base TTL) is applied inside the wrapper so no caller forgets it. `cache.service.spec.ts` covers the distinct-key stampede case: 40 concurrent misses, every TTL in `[0.85·base, 1.15·base]`, all distinct. Pre-existing `CACHE_KEYS.*` factories already required `orgId` as a typed parameter, so the "216 unsafe sites" claim was false; the call-site migration was fully reverted.

**03 — Filtered views refresh.** `leaves.service.ts:215-217` reads via `cachedVersioned(CACHE_KEYS.leaveAnalyticsNamespace(orgId), \`${scope}:${year}\`, ...)` and both write-side services (`leaves-write.service.ts:57`, `leave-decision-effects.service.ts:112`) invalidate via `invalidateNamespace(CACHE_KEYS.leaveAnalyticsNamespace(orgId))` — namespace-bump structurally eliminates writer/invalidator key-divergence (the invalidator never reconstructs a filter key). `hr/time/__tests__/leave-analytics-filtered-refresh.spec.ts` (4 tests) covers filtered read-after-write, cross-filter invalidation, key shape, and cross-tenant isolation.

**04 — Every namespace declares its invalidation.** `backend/src/common/cache/cache-invalidation-matrix.ts` — 46 entries, each `{ kind: "write", events: [...] }` or `{ kind: "ttl-only", reason: "..." }` (36 write / 10 TTL-only). `cache-invalidation-matrix.spec.ts` (41 tests) drives the table directly; a coverage guard asserts the 36/10 split; each write entry exercises real cache hit → invalidate → miss plus cross-tenant isolation. The call-site-migration criterion was withdrawn: the `migrated` flag and `CACHE_MIGRATION_STATUS` export were deleted from the matrix file.

**05 — Redis has a budget and an eviction policy.** Budget (~35GB) documented at `cache-invalidation-matrix.ts:7-14`; `volatile-lru` set via Upstash console (REST API does not expose `CONFIG SET`). Namespace version counters carry no TTL and are therefore eviction-proof. Session-revocation tombstones in `sessions.service.ts` (`tombstone()`) were also made TTL-less; reclamation moved to an explicit sweep: `revoked:sessions:index` sorted set + `SessionsService.pruneExpiredRevocations()` wired to `GET|POST /cron/session-revocation-prune` behind a `CronLeaseService` lease. The null-DB-fallback approach was tried and reverted — as `APP_GUARD` it would add a DB round trip to all traffic every time the 5s in-process cache expires. `sessions-revocation-tombstone.spec.ts` (5 tests) pins no-TTL writes, index population, sweep correctness, and Redis-absent degradation.

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
