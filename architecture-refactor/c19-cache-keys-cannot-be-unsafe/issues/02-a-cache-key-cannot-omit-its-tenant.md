# 02 — A cache key cannot omit its tenant

**What to build:** A developer cannot write a cache key that leaves out the organisation, because the wrapper takes it as a parameter rather than trusting a string. The same wrapper spreads expiry, so a cold start stops stampeding.

**Blocked by:** None — can start immediately

**Status:** done

**Audit note (2026-08-26):** Status corrected from "done" to "in-progress" — one acceptance criterion (concurrent distinct-key misses) remains unticked and unproven. Todo items verified: wrappers at `cache.service.ts:167-197`, jitter at `:163-165` — both confirmed at source.

## Acceptance criteria

- [x] The organisation is a required parameter — a call without it does not typecheck. — `backend/src/common/cache/cache.service.ts:167` (`cachedForOrg(orgId: string, ...)`) and `:176` (`cachedVersionedForOrg`) — `orgId` is a required positional parameter.
- [x] Both the plain and namespace-versioned forms have a tenant-aware wrapper. — `cachedForOrg`/`invalidateForOrg` (plain) and `cachedVersionedForOrg`/`invalidateNamespaceForOrg` (versioned) at `:167,176,191,195`.
- [x] Expiry carries jitter, applied inside the wrapper rather than by each caller. — `applyJitter` (`:163-165`, `baseTtl * (0.85 + Math.random() * 0.3)`) called inside `cachedForOrg`/`cachedVersionedForOrg`, not left to the caller.
- [x] Two organisations with identical local keys never read each other's entries. — the wrapper prefixes `${orgId}:${localKey}` (`:168-169`), so two orgs with the same `localKey` produce distinct Redis keys.
- [x] Two users with different scopes on the same query do not share an entry. — the `localKey`/scope segment is caller-supplied and orthogonal to the tenant prefix; existing call sites (e.g. `leaves.service.ts:216`, `` `${scope}:${year}` ``) already include scope in the local key.
- [x] Many concurrent misses on distinct keys are spread rather than firing together. — `cache.service.spec.ts`, "distinct keys filled together get spread expiries, so they cannot re-stampede in lockstep": 40 distinct keys are filled concurrently through `cachedForOrg` against a Redis mock that captures the `ex` actually sent, and the test asserts every TTL lands inside `[0.85·base, 1.15·base]` and that they are not all identical. **Stated precisely:** jitter does not thin the initial cold-start burst — the fill lease dedupes per key and, as the ticket says, does not help across distinct keys. What it prevents is the *recurring* stampede: without it, keys filled in one burst share an expiry instant and re-stampede together forever. The earlier `applyJitter` test only exercised the private method; this one proves the spread reaches Redis through the public wrapper.

**Verification note (orchestrator, 2026-08-26):** verified directly against source. The primitive (`cache.service.ts`'s existing single-flight fill / distributed lease) was correctly left unmodified, per instruction.

**This ticket does not ask for a call-site sweep.** It asks that the *wrapper* make omitting the tenant impossible for new code. A `CACHE_KEYS.*` factory that already interpolates `orgId` is not a violation and must not be migrated to `cachedForOrg` — the two produce the same key components in a different order, so the swap changes nothing about tenant safety while deleting an entry from the central registry that 143 other keys still use.

`search.service.ts` was migrated on this basis and has been **reverted** to `CACHE_KEYS.searchResults(orgId, userId, hash)`. That call site was already correct on every axis: the tenant is in the key, the key is per-user, `CACHE_TTL.SHORT` is 30s, and `queryHash` folds in `getPermissionsVersion(orgId)` — so `bumpPermissionsVersion` rotates the key and a revoked permission cannot serve stale results. Jitter was the only thing lost, and it is a stampede control for hot *shared* keys, which a per-user 30s key is not.

Before migrating any call site to a `*ForOrg` wrapper, check whether its key factory already carries the tenant. Most do.

## Todo

- [x] Add the wrappers beside the existing service; do not modify the primitive — `cache.service.ts:167-197`; the single-flight fill and distributed lease primitive is untouched
- [x] Put jitter in the wrapper — no caller will remember it — `applyJitter`, `cache.service.ts:163-165`
- [x] Test the distinct-key stampede case, not only the same-key one — see above; the same-key case stays covered by "coalesces concurrent misses for the same key".
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c19 — A cache key cannot be unsafe, and a write invalidates what it changed`](../prd.md) · Candidate index: [`../README.md`](../README.md)
