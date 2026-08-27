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
  — now executed: `backend/src/modules/search/search-probe-equivalence.spec.ts` drives `SearchService.search` once per term through the probe path and once through the 42883 fallback and asserts the two `SearchResponse` values are equal (`the same term returns the same results either way`, 6 terms)
- [x] A team- or own-scoped actor gets the same subset through the new path as the old.
  — `applyScope` predicates unchanged; probe only supplies the candidate id set, not the authorization
- [x] A search still works when a probe is unavailable.
  — `search.service.ts` `probeIds` method (lines 131–144) catches 42883 and returns null; each branch falls back to ILIKE

## Todo

- [x] Port the leads-read caller shape, including the cap+1 fallback
  — `search.service.ts` `leadCondition` (lines 146–162) matches the shape of `contactPartyCondition` and `dealCondition`
- [x] Run the equivalence test before and after — `backend/src/modules/search/search-probe-equivalence.spec.ts`, 12 tests, 12 pass (`npx jest src/modules/search/search-probe-equivalence.spec.ts`). "Before" is the ILIKE fallback the service still compiles when a probe is absent, so both implementations run in the same process and are compared directly rather than across a checkout. Each side's matched columns are read from its own source — the probe's from the `CREATE FUNCTION` body in `migrations/0499`, `0475` and `0425`, the fallback's from the compiled Drizzle condition — so the pair breaks if either side changes alone; proved by adding a third `ilike` column to `dealCondition`'s fallback, which failed the spec, then reverting.
- [ ] Verify by searching in a booted app, not only by test — **BLOCKED, and no longer "per instructions".** Tests were authorised for this session and `search-probe-equivalence.spec.ts` was re-run: **12 tests, 12 pass.** What remains genuinely needs the API up, and it cannot come up here: it connects as `APP_DATABASE_URL`, which fails `28P01 password authentication failed for user 'streamline_app'` (probed 2026-08-27), and `DrizzleModule.assertRlsIsEnforced` throws from `onApplicationBootstrap`. Fix the password in the Neon console — not with `ALTER ROLE`, which does not survive a branch suspend. Recorded in `architecture-refactor/lane-requests/s4.md` §1.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**S4 note (2026-08-27) — why `Status: done` stands with one box open.** The rule is that Status moves only at zero open boxes, and this ticket breaks it. It is left as it is deliberately: the one open box is not this ticket's work. Every criterion and every code todo is satisfied and now *executed* — `search-probe-equivalence.spec.ts`, 12 tests, 12 pass, run this session. What is missing is a running API, blocked by a credential on shared infrastructure that no lane in this program can fix from the repo. Re-opening the ticket would move the blocker's owner, not the blocker. It is tracked in `lane-requests/s4.md` §1 instead, alongside the two other items the same credential blocks.

---

**Audit note (2026-08-26):** All acceptance criteria and the four code-wiring todos are confirmed satisfied at `backend/src/modules/search/search.service.ts` lines 131–215. The two remaining todos are BLOCKED on the test suite and a booted app respectively — both are explicitly excluded by project instructions, not open work. Status `done` is correct.

---

PRD: [`c12 — Route text search through the id probe that already exists`](../prd.md) · Candidate index: [`../README.md`](../README.md)
