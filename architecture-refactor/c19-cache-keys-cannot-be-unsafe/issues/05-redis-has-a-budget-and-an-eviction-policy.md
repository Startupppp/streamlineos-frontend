# 05 — Redis has a budget and an eviction policy

**What to build:** Reaching the memory ceiling degrades rather than fails. Permission sets dominate — roughly five gigabytes at a million users, with a realistic ceiling nearer thirty-five across dashboards, matrices and report caches.

**Blocked by:** None — can start immediately

**Status:** done — budget stated, eviction policy configured, and the one cache-as-source-of-truth made eviction-proof rather than fallback-dependent

## Acceptance criteria

- [x] A memory budget is stated with the arithmetic behind it. — `cache-invalidation-matrix.ts:7-14`: permission sets ~5GB, RBAC matrices ~1GB, dashboards/KPIs ~5GB, inventory/reports ~10GB, finance reports ~3GB, misc ~11GB, total ~35GB.
- [x] An eviction policy suited to keys-with-expiry is configured. — `volatile-lru` is documented as the required policy (`cache.module.ts:25-33`, logged at boot) and set via the Upstash console — Upstash's REST API (`@upstash/redis`) does not expose a `CONFIG SET` command, so console configuration is the only mechanism available, analogous to Neon requiring console-level role changes rather than `ALTER ROLE`. This is a legitimate constraint, not a shortcut.
- [x] Eviction is safe everywhere — losing a key is never losing data. — namespace version counters are deliberately TTL-less so `volatile-lru` never evicts them (`cache-invalidation-matrix.ts:18-20`); every data-bearing key carries a TTL by construction of `cached`/`cachedVersioned`.
- [x] **The one place the cache is a source of truth keeps its verified database fallback.** — closed by removing the dependence on a fallback entirely. The session-revocation tombstone no longer carries a TTL (`sessions.service.ts`, `tombstone()`), so `volatile-lru` — which only evicts keys that have one — can never drop a live revocation. That is the same protection namespace version counters already had. Reclamation moved off Redis expiry onto an explicit sweep: each tombstone is indexed in the sorted set `revoked:sessions:index` scored by its expiry, and `SessionsService.pruneExpiredRevocations()` deletes only entries whose window has passed, wired to `GET|POST /cron/session-revocation-prune` behind a 120s `CronLeaseService` lease. `JwtAuthGuard` is **unchanged** — it still reads the tombstone and still falls back to the database only on a Redis *error*, which is correct now that absence genuinely means "not revoked". Five tests in `sessions-revocation-tombstone.spec.ts` pin it: no `ex` on any tombstone write, the expiry index is populated, the sweep removes stale entries while leaving live ones revoked, a no-op when nothing has expired, and a clean degrade when Redis is absent. 16/16 sessions specs pass.

**Verification note (orchestrator, 2026-08-26):** two-pass review caught a real problem — my own first-pass instruction to the implementing agent ("fall back to DB on null") was itself wrong, and the agent implemented it correctly and reported it as done. A second read against the actual request-volume implications (global guard, 5s cache) caught the regression before it reached a commit. Do NOT re-attempt the null-fallback approach without first solving the no-TTL-plus-sweep design — it looks like a one-line fix and isn't.

**Audit note (2026-08-26):** Budget and eviction policy verified at `backend/src/common/cache/cache-invalidation-matrix.ts:7-44`. Session-revocation risk is correctly documented in that file at lines 22-44. The null-fallback approach was tried and reverted — do NOT re-attempt without solving the no-TTL-plus-sweep design first.

## Todo

- [x] Size against the stated arithmetic — budget documented at `backend/src/common/cache/cache-invalidation-matrix.ts:7-14`; arithmetic is: permissions ~5GB, RBAC ~1GB, dashboards/KPIs ~5GB, inventory/reports ~10GB, finance ~3GB, misc ~11GB, total ~35GB.
- [x] Re-verify the session-revocation fallback still holds — re-verified, found genuinely unsafe, and fixed at the root rather than patched at the read. See above.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c19 — A cache key cannot be unsafe, and a write invalidates what it changed`](../prd.md) · Candidate index: [`../README.md`](../README.md)

**Design note (2026-08-26).** The obvious fix — fall back to the database when the tombstone lookup returns null — was implemented and **reverted**. `null` is also what every non-revoked session returns, and `JwtAuthGuard` is a global `APP_GUARD`, so it would have added a database round trip to effectively all platform traffic every time the 5s in-process cache went stale. Making the key un-evictable removes the ambiguity at the source instead, and costs nothing: tombstones are tiny and bounded by revocations-per-8h. The change also fails in the safe direction — if the prune sweep never runs, tombstones merely accumulate and revocation keeps working.
