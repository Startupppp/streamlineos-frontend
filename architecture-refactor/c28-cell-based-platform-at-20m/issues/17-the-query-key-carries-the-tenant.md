# 17 — The query key carries the tenant

**What to build:** A person who belongs to two organizations cannot see one organization's rows while looking at the other, even for the moment between switching and refetching. Tenancy is in the cache key, so a cross-organization read is structurally impossible rather than prevented by remembering to clear.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** `frontend/lib/query-keys/base.ts` is one line — `export const queryKeyBase = ["streamlineos"] as const;` — and every one of the 15 factory files spreads from it. `frontend/CLAUDE.md` §2 already documents this exactly: *"`base` carries no tenant segment, so a two-org user shares one cache across a switch and can see Org A's rows in Org B: an org switch MUST `queryClient.clear()` … guard that regression until the org id moves into `base`."* Some factories already thread it by hand (`queryKeys.access.me(orgId, userId)`). The backend equivalent is already correct — `CACHE_KEYS.*` factories interpolate `orgId`, and a migration to `*ForOrg` wrappers was tried at ~50 sites and fully reverted as a no-op. Do not repeat that on the backend.

## Acceptance criteria

- [ ] The org id is a segment of the base key, so every factory inherits it without each one remembering.
- [ ] `queryClient.clear()` on organization switch **stays** until the last factory is migrated, and is removed only in the same change that proves the last one is.
- [ ] Server-side prefetch hydrates keys that match what the client reads — a prefetch whose key does not match hydrates an entry nobody can read, which has already happened here across five factories.
- [ ] Org-scoped `localStorage` caches carry the same segment; a cache outside Query is still a cache.
- [ ] A test switches organizations without clearing and asserts no Org A entry is readable under Org B.
- [ ] The existing `query-keys-registry.test.ts` is extended rather than replaced, so a factory added later without the segment fails.

## Todo

- [ ] Change `base` first and let the type system find the factories that hand-thread the org id; those are duplicates to collapse, not a second pattern to keep.
- [ ] Check the server-render path in the same change. A scope-prefixed key that only the client knows about is the failure mode that made every authenticated route render a spinner.
- [ ] Do not touch the backend `CACHE_KEYS` factories — they are already tenant-safe and the migration was reverted once.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
