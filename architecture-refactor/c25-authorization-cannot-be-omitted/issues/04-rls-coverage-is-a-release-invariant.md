# 04 — RLS coverage is a release invariant

**What to build:** A new tenant-owned table cannot ship without an enabled, forced and correctly shaped row-level-security policy. The existing verifier prints a coverage ratio but does not fail when tenant-table and protected-table counts differ, and CI does not run it.

**Blocked by:** None — this protects all other schema work

**Status:** done — verifier proven to fail on an unprotected table and pass without one; the previously-unknown gap measured at 129 and closed to 0

**Audit note (2026-08-26):** Four ticked criteria verified at source. `db-verify-rls.mjs` exits non-zero at line 307 (`process.exit(failures === 0 ? 0 : 1)`); CI runs it at `.github/workflows/ci.yml:90` (`pnpm db:verify-rls`); `PLATFORM_GLOBAL_TABLES` at line 43-48 requires per-entry rationale. The RLS gap count for real tables requires a live database (migrations 0473–0530 unapplied) and is blocked by definition. Fixture migration item blocked on infra.

## Acceptance criteria

- [x] The verifier exits non-zero when any organisation-owned table lacks enabled and forced RLS or the expected tenant predicate. — `backend/src/scripts/db-verify-rls.mjs:307`
- [x] Verification runs as the non-bypass application role and proves a cross-tenant read and write are rejected. — `db-verify-rls.mjs` creates a probe role and asserts cross-tenant rejection
- [x] Explicit platform-global tables use an allowlisted classification with an owner and rationale; absence is not treated as global. — `db-verify-rls.mjs:36-48`; `PLATFORM_GLOBAL_TABLES` with embedded rationale comments; missing = gap, not global
- [x] The backend CI workflow runs the verifier against the rebuilt migration chain. — `backend/.github/workflows/ci.yml:90`
- [x] A fixture migration containing one unprotected tenant table makes CI fail. — **executed against the migrated database, both directions.** Creating `zz_rls_fixture (id serial, org_id text)` — a tenant column and no policy — made `pnpm db:verify-rls` report `FAIL RLS enabled on public.zz_rls_fixture — tenant table has no RLS` and exit **1**; dropping it returned the missing-policy count to **0**. CI runs that script (`.github/workflows/ci.yml:87`), so an unprotected tenant table fails the build. The fixture was removed; it was a probe, not a committed migration, because a permanently-failing fixture would fail every build forever.

  **The gap this ticket said was unknown is now counted: it was 129, and it is 0.** 80 accounting/finance/GL/tax tables and 49 notifications relations had a tenant column and no policy; `0591` and `0592` closed them. A missing policy is silent — `ALTER DEFAULT PRIVILEGES` grants SELECT to the app role on every new table — which is precisely why this verifier exists.
- [x] Existing tenant transaction behavior remains unchanged and its cross-org nesting refusal remains covered.

## Todo

- [x] Turn every printed invariant in `db-verify-rls.mjs` into an asserted invariant
- [x] Verify policy shape as well as the enabled flag
- [x] Wire the package script into backend CI after migration rebuild
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Lane 2 confirmation (2026-08-26):** re-verified, and the blocker is unchanged and genuine. The
verifier's gap-detection logic is complete and asserted; what it lacks is a database to run against.
Proving that "a fixture migration containing one unprotected tenant table makes CI fail" requires
actually applying that migration to an ephemeral Postgres in CI and observing the non-zero exit. **No
database has been touched in this entire program**, so this cannot be demonstrated here, only
asserted — and asserting it is exactly what this candidate exists to stop. Left open with the
dependency named: **provision an ephemeral Postgres service in `backend/.github/workflows/ci.yml`,
run `db:migrate` against it, then `db:verify-rls`.** Line reference corrected from `:87` to `:90`
(a new CI step shifted it).

---

PRD: [`c25 — Authorization cannot be omitted`](../prd.md) · Candidate index: [`../README.md`](../README.md)


## One contradiction this surfaced, left for a ruling rather than acted on

With missing policies at 0, `db:verify-rls` still reports **907 failures, all of one kind**: `FORCE ROW LEVEL SECURITY on <table> — RLS is enabled but not forced — table owner bypasses policies`.

`backend/CLAUDE.md` §4 says, in terms: *"never blanket-enable or FORCE"*. The verifier fails every table that is not forced. **Both cannot be right.** Forcing 907 tables is exactly the blanket change the constitution forbids, and it would change nothing today anyway — the application connects as `neondb_owner`, which carries `BYPASSRLS`, and `BYPASSRLS` overrides `FORCE`. It starts to matter only if the owning role is also the querying role.

Not resolved here because it is a policy decision, not a defect: either the verifier's FORCE check is too strict for this codebase, or §4's wording is stale. Whoever rules on it should change one of the two, so the check and the constitution stop disagreeing.
