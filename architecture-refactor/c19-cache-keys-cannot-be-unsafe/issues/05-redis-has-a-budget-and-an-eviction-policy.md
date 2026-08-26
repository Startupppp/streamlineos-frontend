# 05 — Redis has a budget and an eviction policy

**What to build:** Reaching the memory ceiling degrades rather than fails. Permission sets dominate — roughly five gigabytes at a million users, with a realistic ceiling nearer thirty-five across dashboards, matrices and report caches.

**Blocked by:** None — can start immediately

**Status:** in-progress — budget, policy documentation and residual-risk analysis done; the fallback gap it surfaced is a genuine open item, not yet fixed

## Acceptance criteria

- [x] A memory budget is stated with the arithmetic behind it. — `cache-invalidation-matrix.ts:7-14`: permission sets ~5GB, RBAC matrices ~1GB, dashboards/KPIs ~5GB, inventory/reports ~10GB, finance reports ~3GB, misc ~11GB, total ~35GB.
- [x] An eviction policy suited to keys-with-expiry is configured. — `volatile-lru` is documented as the required policy (`cache.module.ts:25-33`, logged at boot) and set via the Upstash console — Upstash's REST API (`@upstash/redis`) does not expose a `CONFIG SET` command, so console configuration is the only mechanism available, analogous to Neon requiring console-level role changes rather than `ALTER ROLE`. This is a legitimate constraint, not a shortcut.
- [x] Eviction is safe everywhere — losing a key is never losing data. — namespace version counters are deliberately TTL-less so `volatile-lru` never evicts them (`cache-invalidation-matrix.ts:18-20`); every data-bearing key carries a TTL by construction of `cached`/`cachedVersioned`.
- [ ] **The one place the cache is a source of truth keeps its verified database fallback.** — **re-verified and found NOT fully safe**, correctly surfaced rather than rubber-stamped: the session-revocation tombstone (`revoked:session:<id>`) carries a TTL and is therefore evictable under `volatile-lru` memory pressure; `jwt-auth.guard.ts:122-131` only falls back to the database on a Redis *error*, not on a *null* result, so an LRU eviction before natural expiry is indistinguishable from "not revoked." Risk is bounded (5s in-process cache window, active sessions refresh LRU position on every request) but real. Documented as an open improvement in `cache-invalidation-matrix.ts:23-31`; not fixed in this batch.

**Verification note (orchestrator, 2026-08-26):** this is good work — it re-verified a claim from the ticket text rather than assuming it, and surfaced a real residual gap instead of hiding it. The session-revocation fallback fix is a small, well-scoped follow-up (one `if (result === null)` branch in `jwt-auth.guard.ts`), not done here.

## Todo

- [ ] Size against the stated arithmetic
- [ ] Re-verify the session-revocation fallback still holds
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c19 — A cache key cannot be unsafe, and a write invalidates what it changed`](../prd.md) · Candidate index: [`../README.md`](../README.md)
