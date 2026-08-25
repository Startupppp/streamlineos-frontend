# 02 — Global search uses the probes

**What to build:** Typing in the header search box returns results from indexed lookups rather than five concurrent full table scans, with authorization and data scope completely unchanged.

**Blocked by:** 01 — The three missing probes exist

**Status:** ready-for-agent

## Acceptance criteria

- [ ] All five branches resolve candidates through a probe.
- [ ] Each branch keeps its existing authorization result and scope predicate — the authorization shape does not change.
- [ ] Each branch asks for cap+1 and falls back to a plain match when the term is too broad, per branch rather than globally.
- [ ] For a term set covering empty, exact, partial, case-varied, punctuation-bearing and no-match, results are identical to the previous implementation.
- [ ] A team- or own-scoped actor gets the same subset through the new path as the old.
- [ ] A search still works when a probe is unavailable.

## Todo

- [ ] Port the leads-read caller shape, including the cap+1 fallback
- [ ] Run the equivalence test before and after
- [ ] Verify by searching in a booted app, not only by test
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c12 — Route text search through the id probe that already exists`](../prd.md) · Candidate index: [`../README.md`](../README.md)
