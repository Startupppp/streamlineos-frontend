# 02 — A cache key cannot omit its tenant

**What to build:** A developer cannot write a cache key that leaves out the organisation, because the wrapper takes it as a parameter rather than trusting a string. The same wrapper spreads expiry, so a cold start stops stampeding.

**Blocked by:** None — can start immediately

**Status:** in-progress — tenant-required wrapper, jitter and both plain/versioned forms shipped; distinct-key stampede spreading not independently proven

## Acceptance criteria

- [x] The organisation is a required parameter — a call without it does not typecheck. — `backend/src/common/cache/cache.service.ts:167` (`cachedForOrg(orgId: string, ...)`) and `:176` (`cachedVersionedForOrg`) — `orgId` is a required positional parameter.
- [x] Both the plain and namespace-versioned forms have a tenant-aware wrapper. — `cachedForOrg`/`invalidateForOrg` (plain) and `cachedVersionedForOrg`/`invalidateNamespaceForOrg` (versioned) at `:167,176,191,195`.
- [x] Expiry carries jitter, applied inside the wrapper rather than by each caller. — `applyJitter` (`:163-165`, `baseTtl * (0.85 + Math.random() * 0.3)`) called inside `cachedForOrg`/`cachedVersionedForOrg`, not left to the caller.
- [x] Two organisations with identical local keys never read each other's entries. — the wrapper prefixes `${orgId}:${localKey}` (`:168-169`), so two orgs with the same `localKey` produce distinct Redis keys.
- [x] Two users with different scopes on the same query do not share an entry. — the `localKey`/scope segment is caller-supplied and orthogonal to the tenant prefix; existing call sites (e.g. `leaves.service.ts:216`, `` `${scope}:${year}` ``) already include scope in the local key.
- [ ] Many concurrent misses on distinct keys are spread rather than firing together. — not independently verified; the wrapper's jitter affects TTL (staggering future expiry), not the initial concurrent-miss case explicitly. Left open pending a targeted test.

**Verification note (orchestrator, 2026-08-26):** verified directly against source. The primitive (`cache.service.ts`'s existing single-flight fill / distributed lease) was correctly left unmodified, per instruction.

## Todo

- [ ] Add the wrappers beside the existing service; do not modify the primitive
- [ ] Put jitter in the wrapper — no caller will remember it
- [ ] Test the distinct-key stampede case, not only the same-key one
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c19 — A cache key cannot be unsafe, and a write invalidates what it changed`](../prd.md) · Candidate index: [`../README.md`](../README.md)
