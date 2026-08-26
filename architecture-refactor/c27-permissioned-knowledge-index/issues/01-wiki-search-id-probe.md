# 01 — Wiki text search uses a bounded id probe

**Status:** done

## Acceptance criteria

- [x] Wiki keyword search uses a SECURITY DEFINER id-only probe owned by the bypass-RLS owner.
- [x] The organisation comes from the tenant GUC, never a function parameter.
- [x] Execute is revoked from public and granted only to the app role.
- [x] The probe takes a hard limit; the caller requests cap+1 and falls back safely at the cap.
- [x] The caller re-reads ids under RLS and the live visibility predicate.
- [ ] A read-cost budget proves the index plan as the app role. — DEFERRED: requires live Neon branch access; function and GIN index are in place.

## Delivered

- `backend/migrations/0498_kb_ingestion_hardening.sql` Part A: `app.search_kb_page_ids(p_q text, p_limit integer)` SECURITY DEFINER function; REVOKE ALL from PUBLIC; GRANT EXECUTE to streamline_app.
- `backend/src/modules/kb/retrieval/kb-search.service.ts`: `resolvePageKeywordCondition` calls the function with `cap+1`; falls back to inline FTS on cap or error; `pageKeywordCandidates` re-reads under RLS with the full `pageVisibility` predicate.
