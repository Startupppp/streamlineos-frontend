# 03 — Filtered views refresh

**What to build:** A filtered KPI view reflects new data. Today the writer builds a key including the date range and representative while the invalidator clears one with those segments empty — they coincide only on the unfiltered view, so every filtered view is stale until expiry.

**Blocked by:** 02 — A cache key cannot omit its tenant

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Writer and invalidator derive the key from one function.
- [ ] For a matrix of filter combinations including empty ones, both produce identical keys.
- [ ] Writing then reading a filtered view shows the new data — an unfiltered-only test passes today while the bug is live.
- [ ] The leave-analytics key includes scope, so a later scope-aware query does not turn a harmless omission into a leak.

## Todo

- [ ] Single-source the key construction
- [ ] Test the filtered read-after-write specifically
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c19 — A cache key cannot be unsafe, and a write invalidates what it changed`](../prd.md) · Candidate index: [`../README.md`](../README.md)
