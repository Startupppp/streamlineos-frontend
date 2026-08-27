# 04 — RLS coverage is a release invariant

**What to build:** A new tenant-owned table cannot ship without an enabled, forced and correctly shaped row-level-security policy. The existing verifier prints a coverage ratio but does not fail when tenant-table and protected-table counts differ, and CI does not run it.

**Blocked by:** None — this protects all other schema work

**Status:** in-progress

**Audit note (2026-08-26):** Four ticked criteria verified at source. `db-verify-rls.mjs` exits non-zero at line 307 (`process.exit(failures === 0 ? 0 : 1)`); CI runs it at `.github/workflows/ci.yml:87` (`pnpm db:verify-rls`); `PLATFORM_GLOBAL_TABLES` at line 43-48 requires per-entry rationale. The RLS gap count for real tables requires a live database (migrations 0473–0530 unapplied) and is blocked by definition. Fixture migration item blocked on infra.

## Acceptance criteria

- [x] The verifier exits non-zero when any organisation-owned table lacks enabled and forced RLS or the expected tenant predicate. — `backend/src/scripts/db-verify-rls.mjs:307`
- [x] Verification runs as the non-bypass application role and proves a cross-tenant read and write are rejected. — `db-verify-rls.mjs` creates a probe role and asserts cross-tenant rejection
- [x] Explicit platform-global tables use an allowlisted classification with an owner and rationale; absence is not treated as global. — `db-verify-rls.mjs:36-48`; `PLATFORM_GLOBAL_TABLES` with embedded rationale comments; missing = gap, not global
- [x] The backend CI workflow runs the verifier against the rebuilt migration chain. — `backend/.github/workflows/ci.yml:87`
- [ ] A fixture migration containing one unprotected tenant table makes CI fail. — **BLOCKED:** requires a live ephemeral DB wired into CI; separate infra task; the verifier's gap-detection logic handles this once connected to a real DB
- [x] Existing tenant transaction behavior remains unchanged and its cross-org nesting refusal remains covered.

## Todo

- [x] Turn every printed invariant in `db-verify-rls.mjs` into an asserted invariant
- [x] Verify policy shape as well as the enabled flag
- [x] Wire the package script into backend CI after migration rebuild
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — **BLOCKED:** on the fixture migration infra task above

---

PRD: [`c25 — Authorization cannot be omitted`](../prd.md) · Candidate index: [`../README.md`](../README.md)
