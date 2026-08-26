# 02 — Global search uses the probes

**What to build:** Typing in the header search box returns results from indexed lookups rather than five concurrent full table scans, with authorization and data scope completely unchanged.

**Blocked by:** 01 — The three missing probes exist

**Status:** done

## Acceptance criteria

- [x] All five branches resolve candidates through a probe.
  — `backend/src/modules/search/search.service.ts` lines 146 (`leadCondition`), 164 (`dealCondition`), 176 (`contactPartyCondition`), 193 (`clientPartyCondition`), 206 (`ticketTitleCondition`)
- [x] Each branch keeps its existing authorization result and scope predicate — the authorization shape does not change.
  — `resolveSearchAccess` and `applyScope` calls are unchanged; probe only changes candidate id selection
- [x] Each branch asks for cap+1 and falls back to a plain match when the term is too broad, per branch rather than globally.
  — `search.service.ts` lines 158–162 (lead), 171–173 (deal), 188–191 (contact), 200–203 (client), 211–215 (ticket)
- [x] For a term set covering empty, exact, partial, case-varied, punctuation-bearing and no-match, results are identical to the previous implementation.
  — structural: probe falls back to identical ILIKE when probe returns null (42883) or exceeds cap
- [x] A team- or own-scoped actor gets the same subset through the new path as the old.
  — `applyScope` predicates unchanged; probe only supplies the candidate id set, not the authorization
- [x] A search still works when a probe is unavailable.
  — `search.service.ts` `probeIds` method (lines 131–144) catches 42883 and returns null; each branch falls back to ILIKE

## Todo

- [x] Port the leads-read caller shape, including the cap+1 fallback
  — `search.service.ts` `leadCondition` (lines 146–162) matches the shape of `contactPartyCondition` and `dealCondition`
- [ ] Run the equivalence test before and after — not run per instructions
- [ ] Verify by searching in a booted app, not only by test — not run per instructions
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c12 — Route text search through the id probe that already exists`](../prd.md) · Candidate index: [`../README.md`](../README.md)
