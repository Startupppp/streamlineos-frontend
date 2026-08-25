# 05 — Redis has a budget and an eviction policy

**What to build:** Reaching the memory ceiling degrades rather than fails. Permission sets dominate — roughly five gigabytes at a million users, with a realistic ceiling nearer thirty-five across dashboards, matrices and report caches.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A memory budget is stated with the arithmetic behind it.
- [ ] An eviction policy suited to keys-with-expiry is configured.
- [ ] Eviction is safe everywhere — losing a key is never losing data.
- [ ] The one place the cache is a source of truth keeps its verified database fallback.

## Todo

- [ ] Size against the stated arithmetic
- [ ] Re-verify the session-revocation fallback still holds
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c19 — A cache key cannot be unsafe, and a write invalidates what it changed`](../prd.md) · Candidate index: [`../README.md`](../README.md)
