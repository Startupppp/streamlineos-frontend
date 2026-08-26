# 01 — The three missing probes exist

**What to build:** Deals, contacts and clients each gain an id probe against the trigram indexes that already exist for them, following the same shape as the five already shipped.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] Each probe takes its organisation from the session context and never from a parameter, so a missing tenant context fails closed.
  — `backend/migrations/0475_crm_search_id_probes.sql` lines 52, 77, 101 (`app.current_org_id()`)
- [x] Each probe returns identifiers only, never row data.
  — `backend/migrations/0475_crm_search_id_probes.sql`: all three return `SETOF integer` or `SETOF text`
- [x] `EXECUTE` is revoked from `PUBLIC` and granted only to the application role.
  — `backend/migrations/0475_crm_search_id_probes.sql` lines 59–62, 85–88, 107–110
- [x] Each probe takes a limit argument.
  — `backend/migrations/0475_crm_search_id_probes.sql`: all three accept `p_limit integer`
- [x] Each probe has a cross-tenant test: two organisations with colliding text, each sees only its own.
  — `backend/src/modules/search/search.probes.e2e-spec.ts` (one `describe` block per probe, two cross-tenant `it` cases each)
- [x] Invoking a probe with no tenant context raises rather than returning rows.
  — `backend/src/modules/search/search.probes.e2e-spec.ts` (fail-closed `it` block per probe)

## Todo

- [x] Copy the migration 0275 template exactly
  — done in `backend/migrations/0475_crm_search_id_probes.sql`
- [x] Set a lock timeout; do not create indexes concurrently inside the migration transaction
  — `backend/migrations/0475_crm_search_id_probes.sql` line 32 (`SET lock_timeout = '5s'`)
- [x] Write the cross-tenant test first — this is the security-critical part
  — `backend/src/modules/search/search.probes.e2e-spec.ts`
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c12 — Route text search through the id probe that already exists`](../prd.md) · Candidate index: [`../README.md`](../README.md)
