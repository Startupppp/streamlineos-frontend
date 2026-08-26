# 08 — Contract: drop the legacy tables, and make regression impossible

**Status:** done, as far as this phase can take it — every CRM-owned reader is off the legacy tables. 26 remain: 13 are the seam itself, deleted with the tables, and 13 are in `finance`/`accounting`, which another workstream is rewriting and this phase may not touch. The `DROP` is one migration behind that landing.
**Track:** A — identity convergence
**Blocked by:** 03, 04, 05, 06, 07

## Why

The tables come out only when no reader remains. Until then they are load-bearing
for whichever batch has not landed.

The second half matters more than the drop. A migration like this regresses by
accretion — someone adds a call site to a table that still exists, months after
everyone stopped thinking about it. A convention does not stop that; a failing
build does.

## Acceptance criteria

- [ ] Every migrate batch is done and its module's e2e suite passes unchanged.
- [ ] The compatibility mirror writes from ticket 02 are removed.
- [ ] `contacts`, `clients`, `leads` and `business_parties` are dropped, with
      their indexes, constraints and any FK pointing at them.
- [ ] The resolver from ticket 01 survives the drop — external systems and old
      URLs still carry legacy ids, and they must still resolve.
- [ ] **A lint rule and a test fail the build** if a new call site reads a legacy
      identity table or its Drizzle symbol. Both, not either: the rule catches it
      at authoring time, the test catches it when the rule is disabled or the
      file is excluded.
- [ ] The drop is reversible in the sense that matters — a snapshot is taken and
      its restore path is exercised once, in a test, rather than assumed.

## Notes

Check `scripts/purge-user.mjs` before dropping: it enumerates FKs to `users`, so
removing tables changes what it reaches. Phase 1 learned twice that an FK to
`users` is how an audit record gets destroyed by an unrelated offboarding.

## Re-count (2026-08-26)

Re-ran the ratchet rather than trusting the earlier number. It passes, and the
register still holds **26** readers: 13 under `party/` — the seam itself, which
is deleted along with the tables — and 13 under `finance/` (11) and
`accounting/` (2). Unchanged since the last count, so the accounting rewrite
that owns those 13 has not landed yet and this ticket is still one migration
behind it. Nothing regressed either: the ratchet fails on a *new* reader as well
as a departed one, so the count moving in neither direction is the honest state.

Checked the other thing that could make the `DROP` unsafe: `src/scripts/purge-user.mjs`
enumerates foreign keys from `pg_constraint` at runtime rather than naming
tables, so removing `leads`, `clients`, `contacts` and `crm_organizations` does
not strand it. That is one fewer reason to hesitate when the finance half is
ready; it is not permission to drop them now.
