# 04 — RLS coverage is a release invariant

**What to build:** A new tenant-owned table cannot ship without an enabled, forced and correctly shaped row-level-security policy. The existing verifier prints a coverage ratio but does not fail when tenant-table and protected-table counts differ, and CI does not run it.

**Blocked by:** None — this protects all other schema work

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The verifier exits non-zero when any organisation-owned table lacks enabled and forced RLS or the expected tenant predicate.
- [ ] Verification runs as the non-bypass application role and proves a cross-tenant read and write are rejected.
- [ ] Explicit platform-global tables use an allowlisted classification with an owner and rationale; absence is not treated as global.
- [ ] The backend CI workflow runs the verifier against the rebuilt migration chain.
- [ ] A fixture migration containing one unprotected tenant table makes CI fail.
- [ ] Existing tenant transaction behavior remains unchanged and its cross-org nesting refusal remains covered.

## Todo

- [ ] Turn every printed invariant in `db-verify-rls.mjs` into an asserted invariant
- [ ] Verify policy shape as well as the enabled flag
- [ ] Wire the package script into backend CI after migration rebuild
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c25 — Authorization cannot be omitted`](../prd.md) · Candidate index: [`../README.md`](../README.md)
