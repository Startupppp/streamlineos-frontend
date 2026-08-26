# 03 — The comment that says otherwise is corrected

**What to build:** The search service's header comment claims the trigram indexes are what its plain matches land on. Migration 0275 says the opposite, with the reasoning and a working implementation. The wrong sentence is why nobody re-checked for eleven days.

**Blocked by:** 02 — Global search uses the probes

**Status:** done

## Acceptance criteria

- [x] The service comment states what is actually true and points at the migration that explains why.
  — `backend/src/modules/search/search.service.ts` lines 31–41: comment names migrations 0275, 0425, 0475 and explains the SECURITY DEFINER escape
- [x] No other comment in the module contradicts the migration.
  — verified by grep across `backend/src/modules/search/**`; no other claim that ILIKE lands on the GIN index
- [x] Search is registered under a read budget so this cannot silently regress again.
  — `backend/src/scripts/read-cost-budgets.mjs`: four new budget entries (`search-lead-party-sdf`, `search-deal-sdf`, `search-contact-party-sdf`, `search-client-party-sdf`) plus the existing `search-tickets-sdf`

## Todo

- [x] Rewrite the comment
  — `backend/src/modules/search/search.service.ts` lines 31–41
- [x] Grep the module for the same claim elsewhere
  — no contradicting comment found in `backend/src/modules/search/**`
- [x] Add the budget entry once c11-01 lands
  — `backend/src/scripts/read-cost-budgets.mjs` (c11 already landed; four probe budget entries added)
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c12 — Route text search through the id probe that already exists`](../prd.md) · Candidate index: [`../README.md`](../README.md)
