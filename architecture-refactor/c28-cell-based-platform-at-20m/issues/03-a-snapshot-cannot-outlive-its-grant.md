# 03 — A permission snapshot cannot outlive its grant

**What to build:** A delegation that ends at 14:00 stops working at 14:00. A role that starts at 09:00 starts working at 09:00. Cached authorization ends at the next transition in the underlying grants, not at a fixed number of seconds after it was computed.

**Blocked by:** [01 — The request knows which membership it is](01-the-request-knows-its-membership.md)

**Status:** done

**Grounding (2026-08-28, evidence not instruction — re-read at source):** `modules/access/access.service.ts:90` sets `PERMS_CACHE_TTL_MS = 30_000`, a flat TTL. Explicit revocation is already correct — `accessVersionChannel` plus `CACHE_KEYS.accessVersion(orgId)` bumps a version that invalidates the snapshot, and `SHARED_VERSION_TTL_SECONDS = 300` backs it in Redis. What is missing is the *temporal* half: `user_delegations` carries `startsAt` and `endsAt` (`db/schema/common/auth.ts:464-465`), and nothing caps a snapshot's validity at those instants. A delegation therefore stays effective for up to 30 s past its end, and activates up to 30 s late.

## Acceptance criteria

- [x] A resolved snapshot carries a `valid_until` that is the earliest of its computed TTL and the nearest upcoming start or end among every grant that fed it.
  `modules/access/snapshot-validity.ts` computes `snapshotValidUntil(now, ceilingMs, transitions)`. **The inputs were enumerated from the schema first:** only `role_assignments.expires_at`, `user_delegations.starts_at` and `user_delegations.ends_at` carry time. `role_permission_grants`, `user_permission_grants`, `principal_group_members`, `group_role_assignments` and `module_ownerships` have no time column at all, so the brief's open question about permission-group membership had no subject.
- [x] The snapshot key includes the access version, so an explicit revocation still converges within the 5 s the PRD requires; the two mechanisms compose rather than replace each other.
  The key remains `access:perms:<userId>:v<version>` under `cachedForOrg`; `valid_until` is carried *inside* the cached value and checked on read, so the version bump and the temporal cap are independent and compose.
- [x] A shared cache entry cannot extend authority beyond `valid_until` for any reader — a second membership hitting the same key does not inherit a longer life.
  `valid_until` is an absolute instant stored in the cached payload, not a relative TTL. `AccessService.resolveWithValidity` re-reads it and, if it has passed, invalidates and refills, so the Redis TTL jitter (`applyJitter`, plus or minus 15%) can never extend authority.
- [x] A delegation ending mid-second denies on the first request after that instant, proved by a clock-controlled test rather than a sleep.
  `modules/access/snapshot-validity.spec.ts` + `modules/access/__tests__/snapshot-temporal-cap.spec.ts` -> `Test Suites: 2 passed - Tests: 21 passed`. The clock is injected (`Clock` on `AccessPermissionResolver`); a transition one millisecond after `now` is honoured exactly, one exactly at `now` is treated as past. No sleeps, no fake timers.
- [x] A grant starting in the future is not effective early, which is the failure the flat TTL hides in the other direction.
  The delegation query now selects every ACTIVE delegation whose window has not closed (`endsAt > now`) and decides effectiveness in JS (`if (row.startsAt > now) continue`), so a not-yet-started delegation contributes its `startsAt` as a transition **without** granting anything. Advancing the clock past `startsAt` flips the same rows from denied to granted.
- [x] Recomputation cost at the transition is bounded — a thousand delegations expiring at midnight do not stampede; single-flight already exists in `CacheService` and is used.
  The refill goes through `cache.cachedForOrg` -> `cached()`, whose `inFlight` map collapses concurrent fills per key. The transition computation added **zero** extra queries: the role-assignment and delegation-permission selects were widened rather than duplicated.

## Todo

- [ ] Enumerate every input to the snapshot that has a time component before writing the cap — a `valid_until` that misses one source is worse than no cap, because it looks correct.
- [ ] Inject the clock; a temporal test that sleeps is flaky and will be deleted by someone later.
- [ ] Keep `PERMS_CACHE_TTL_MS` as the ceiling, not the rule — it stays as the upper bound when no transition is pending.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
