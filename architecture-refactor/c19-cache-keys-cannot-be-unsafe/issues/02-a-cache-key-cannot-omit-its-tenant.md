# 02 — A cache key cannot omit its tenant

**What to build:** A developer cannot write a cache key that leaves out the organisation, because the wrapper takes it as a parameter rather than trusting a string. The same wrapper spreads expiry, so a cold start stops stampeding.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The organisation is a required parameter — a call without it does not typecheck.
- [ ] Both the plain and namespace-versioned forms have a tenant-aware wrapper.
- [ ] Expiry carries jitter, applied inside the wrapper rather than by each caller.
- [ ] Two organisations with identical local keys never read each other's entries.
- [ ] Two users with different scopes on the same query do not share an entry.
- [ ] Many concurrent misses on distinct keys are spread rather than firing together — the fill lease dedupes per key and does not help here.

## Todo

- [ ] Add the wrappers beside the existing service; do not modify the primitive
- [ ] Put jitter in the wrapper — no caller will remember it
- [ ] Test the distinct-key stampede case, not only the same-key one
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c19 — A cache key cannot be unsafe, and a write invalidates what it changed`](../prd.md) · Candidate index: [`../README.md`](../README.md)
