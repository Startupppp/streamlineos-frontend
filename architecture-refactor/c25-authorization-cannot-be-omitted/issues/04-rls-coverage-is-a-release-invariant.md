# 04 — RLS coverage is a release invariant

**What to build:** A new tenant-owned table cannot ship without an enabled, forced and correctly shaped row-level-security policy. The existing verifier prints a coverage ratio but does not fail when tenant-table and protected-table counts differ, and CI does not run it.

**Blocked by:** None — this protects all other schema work

**Status:** in-progress

## Acceptance criteria

- [x] The verifier exits non-zero when any organisation-owned table lacks enabled and forced RLS or the expected tenant predicate.
- [x] Verification runs as the non-bypass application role and proves a cross-tenant read and write are rejected.
- [x] Explicit platform-global tables use an allowlisted classification with an owner and rationale; absence is not treated as global.
- [x] The backend CI workflow runs the verifier against the rebuilt migration chain.
- [ ] A fixture migration containing one unprotected tenant table makes CI fail. (Deferred — the gap-detection logic now catches any such table when the verifier runs against a real DB; a dedicated fixture migration test requires a live ephemeral DB wired into CI, which is a separate infra task.)
- [x] Existing tenant transaction behavior remains unchanged and its cross-org nesting refusal remains covered.

## Todo

- [x] Turn every printed invariant in `db-verify-rls.mjs` into an asserted invariant
- [x] Verify policy shape as well as the enabled flag
- [x] Wire the package script into backend CI after migration rebuild
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — blocked on the fixture migration item above

---

PRD: [`c25 — Authorization cannot be omitted`](../prd.md) · Candidate index: [`../README.md`](../README.md)
