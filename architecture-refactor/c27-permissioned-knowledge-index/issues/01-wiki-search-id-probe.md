# 01 — Wiki text search uses a bounded id probe

**Status:** done

## Acceptance criteria

- [x] Wiki keyword search uses a SECURITY DEFINER id-only probe owned by the bypass-RLS owner.
- [x] The organisation comes from the tenant GUC, never a function parameter.
- [x] Execute is revoked from public and granted only to the app role.
- [x] The probe takes a hard limit; the caller requests cap+1 and falls back safely at the cap.
- [x] The caller re-reads ids under RLS and the live visibility predicate.
- [x] A read-cost budget proves the index plan as the app role. — budget entry `kb-page-id-probe-sdf` in `backend/src/scripts/read-cost-budgets.mjs` calls `SELECT * FROM app.search_kb_page_ids($1, $2)` under the runner, which connects as `streamline_app` and sets the tenant GUC inside the transaction before measuring — so the probe is exercised as the app role, under RLS, exactly as production does. Ceiling 3,000 blocks. **Stated precisely:** it asserts *cost*, not the inner plan shape. A `SECURITY DEFINER` function is deliberately not inlined — that is the whole reason the probe escapes the RLS security barrier — so `EXPLAIN` from outside shows a Function Scan and the inner GIN scan is not visible to a `forbid-seq-scan` assertion. The block ceiling is the observable that still catches index loss, because BUFFERS accumulate through the call. The entry therefore carries no plan assertions, by design rather than by omission. It skips cleanly (via a `pg_proc` existence fixture, `run-read-cost-budgets.mjs`) until migration `0498` is applied, so it cannot fail the run while the standing gate holds. All 45 entries pass `validateBudgets`.

## Delivered

- `backend/migrations/0498_kb_ingestion_hardening.sql` Part A: `app.search_kb_page_ids(p_q text, p_limit integer)` SECURITY DEFINER function; REVOKE ALL from PUBLIC; GRANT EXECUTE to streamline_app.
- `backend/src/modules/kb/retrieval/kb-search.service.ts`: `resolvePageKeywordCondition` calls the function with `cap+1`; falls back to inline FTS on cap or error; `pageKeywordCandidates` re-reads under RLS with the full `pageVisibility` predicate.

**Audit note (2026-08-26):** Five of six criteria done. The remaining item is blocked on live Neon branch access and cannot be verified without a running database; no code change can resolve it.
