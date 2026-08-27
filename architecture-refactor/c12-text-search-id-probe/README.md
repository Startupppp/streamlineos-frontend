# c12 — Route text search through the id probe that already exists

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 3 tickets, 3 closed.

Five `SECURITY DEFINER` id probes exist, each with one caller and the bounded fallback. Migration 0275 created four trigram indexes on `business_parties` and shipped the probe for them — and the global header search reads those same four columns with a plain `ILIKE`, so every keystroke is five parallel sequential scans. This is not a request to wrap all 213 `ilike()` sites; targeted wrapping is the standing decision and it is right.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | The three missing probes exist | — | done |
| 02 | Global search uses the probes | 01 | done |
| 03 | The comment that says otherwise is corrected | 02 | done |

## Closed tickets

**01 — The three missing probes exist.** `backend/migrations/0475_crm_search_id_probes.sql` added `SECURITY DEFINER` id probes for deals, contacts and clients, matching the shape of the five already shipped. Each takes `p_limit integer`, derives the org from `app.current_org_id()` (never a parameter), returns identifiers only (`SETOF integer` / `SETOF text`), and revokes `EXECUTE` from `PUBLIC` granting it to the application role only. Cross-tenant isolation and fail-closed-on-missing-context are exercised in `backend/src/modules/search/search.probes.e2e-spec.ts`.

**02 — Global search uses the probes.** `backend/src/modules/search/search.service.ts` lines 131–215 route all five search branches through probes with a cap+1 fallback to the original `ILIKE` on `42883` or when the term is too broad. Authorization (`resolveSearchAccess`) and scope (`applyScope`) predicates are unchanged — the probe only supplies the candidate id set. Equivalence confirmed: `backend/src/modules/search/search-probe-equivalence.spec.ts` (12/12) drives both paths in the same process. Booted-app check performed against the real branch on `:1500`: `seed`, `ticket`, `ac`, `zzzznomatch`, `O'Brien` all returned 200 with correct results. The credential blocker (`streamline_app` password drifted from `.env`) that had blocked the booted-app check was resolved; see `architecture-refactor/OPEN-FINDINGS.md` §1.

**03 — The comment that says otherwise is corrected.** `backend/src/modules/search/search.service.ts` lines 31–41 now name migrations 0275, 0425, 0475 and explain the `SECURITY DEFINER` escape. No contradicting claim found across `backend/src/modules/search/**`. Four new budget entries (`search-lead-party-sdf`, `search-deal-sdf`, `search-contact-party-sdf`, `search-client-party-sdf`) plus the pre-existing `search-tickets-sdf` added to `backend/src/scripts/read-cost-budgets.mjs` to prevent silent regression.

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
