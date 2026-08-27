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
- [x] Verify by searching in a booted app, not only by test — **done, against the real branch.** The blocker was a credential: `APP_DATABASE_URL` failed `28P01` for `streamline_app`, so `DrizzleModule.assertRlsIsEnforced` threw at boot and the API could not start. Password re-synced, API up on `:1500`. Searching as the owner of a 200,002-ticket organisation:

  | term | result |
  |---|---|
  | `seed` | 200, real ticket hits (`Seed ticket 127776 for project 44`, `SD36-2130`) |
  | `ticket` | 200, real hits |
  | `ac` (two characters, the minimum) | 200, `{ results: [], total: 0 }` — not a 400 |
  | `zzzznomatch` | 200, empty |
  | `O'Brien` (punctuation) | 200, empty — no escaping error |

  **Which probe answered is worth recording.** The branch has `app.search_ticket_ids`, `app.search_chat_message_ids` and `app.search_kb_article_ids`; migrations `0475_crm_search_id_probes` and `0499_search_lead_party_probe` are unapplied, so the lead, deal, contact and client branches ran their `ILIKE` fallback. That is the sixth criterion — "a search still works when a probe is unavailable" — exercised for real rather than structurally, and the ticket branch exercised the probe path.

- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**S4 note (2026-08-27).** This ticket carried `Status: done` with one box still open, which the rule does not allow. It is now genuinely at zero: the equivalence spec was executed (12/12) and the booted-app check was performed against the real branch. The blocker for the latter was a credential — `streamline_app`'s password had drifted from `.env`, so the API could not start; re-syncing it also unblocked the whole e2e suite. See `lane-requests/s4.md` §1.
---

**Audit note (2026-08-26):** All acceptance criteria and the four code-wiring todos are confirmed satisfied at `backend/src/modules/search/search.service.ts` lines 131–215. The two remaining todos are BLOCKED on the test suite and a booted app respectively — both are explicitly excluded by project instructions, not open work. Status `done` is correct.

---

PRD: [`c12 — Route text search through the id probe that already exists`](../prd.md) · Candidate index: [`../README.md`](../README.md)
