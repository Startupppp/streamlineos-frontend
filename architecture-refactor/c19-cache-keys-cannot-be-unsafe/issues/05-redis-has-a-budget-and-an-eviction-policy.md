# 05 — Redis has a budget and an eviction policy

**What to build:** Reaching the memory ceiling degrades rather than fails. Permission sets dominate — roughly five gigabytes at a million users, with a realistic ceiling nearer thirty-five across dashboards, matrices and report caches.

**Blocked by:** None — can start immediately

**Status:** in-progress — budget, policy documentation and residual-risk analysis done; the fallback gap it surfaced is a genuine open item, not yet fixed

## Acceptance criteria

- [x] A memory budget is stated with the arithmetic behind it. — `cache-invalidation-matrix.ts:7-14`: permission sets ~5GB, RBAC matrices ~1GB, dashboards/KPIs ~5GB, inventory/reports ~10GB, finance reports ~3GB, misc ~11GB, total ~35GB.
- [x] An eviction policy suited to keys-with-expiry is configured. — `volatile-lru` is documented as the required policy (`cache.module.ts:25-33`, logged at boot) and set via the Upstash console — Upstash's REST API (`@upstash/redis`) does not expose a `CONFIG SET` command, so console configuration is the only mechanism available, analogous to Neon requiring console-level role changes rather than `ALTER ROLE`. This is a legitimate constraint, not a shortcut.
- [x] Eviction is safe everywhere — losing a key is never losing data. — namespace version counters are deliberately TTL-less so `volatile-lru` never evicts them (`cache-invalidation-matrix.ts:18-20`); every data-bearing key carries a TTL by construction of `cached`/`cachedVersioned`.
- [ ] **The one place the cache is a source of truth keeps its verified database fallback.** — **re-verified and found NOT fully safe; a naive fix was attempted and reverted after a second pass caught a severe regression it would have caused.** The session-revocation tombstone (`revoked:session:<id>`) carries a TTL and is therefore evictable under `volatile-lru` memory pressure; `jwt-auth.guard.ts` only falls back to the database on a Redis *error*, not on a *null* result, so an LRU eviction before natural expiry is indistinguishable from "not revoked." **This is NOT a one-line fix** — `null` is also what every non-revoked session's lookup returns, and `JwtAuthGuard` is a global `APP_GUARD` on effectively every request. Falling back to the database on a null result (not just an error) was implemented, then reverted: it turned a rare, bounded edge case into a mandatory DB round trip on every request whose 5-second in-process cache (`REVOCATION_CACHE_TTL_MS`) went stale, for the platform's entire traffic. Risk of the original gap is bounded (active sessions refresh the tombstone's LRU position on every read, so a revoked session under active misuse stays hot; exposure is a revoked session going idle during memory pressure). The structurally correct fix — give tombstones no TTL (immune to `volatile-lru`, like namespace version counters already are) and clean them up with an explicit scheduled sweep instead of TTL expiry — is recorded but not implemented. Full detail in `cache-invalidation-matrix.ts:23-44`.

**Verification note (orchestrator, 2026-08-26):** two-pass review caught a real problem — my own first-pass instruction to the implementing agent ("fall back to DB on null") was itself wrong, and the agent implemented it correctly and reported it as done. A second read against the actual request-volume implications (global guard, 5s cache) caught the regression before it reached a commit. Do NOT re-attempt the null-fallback approach without first solving the no-TTL-plus-sweep design — it looks like a one-line fix and isn't.

## Todo

- [ ] Size against the stated arithmetic
- [ ] Re-verify the session-revocation fallback still holds
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c19 — A cache key cannot be unsafe, and a write invalidates what it changed`](../prd.md) · Candidate index: [`../README.md`](../README.md)
