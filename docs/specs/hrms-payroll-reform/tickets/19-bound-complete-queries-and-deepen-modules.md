# 19: Bound complete queries and deepen modules

**What to build:** Large employee and payroll datasets remain complete through projected, bounded reads implemented behind maintainable domain interfaces.

**Blocked by:** 03 Enforce sensitive reads and rapid revocation; 04 Unify identity, Employment Facts and payroll eligibility; 05 Publish strict versioned wire contracts; 06 Freeze complete payroll source snapshots

**Status:** ready-for-agent

**Program:** AP-11

**Requirements:** FR-ARCH-030, FR-ARCH-037

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-030-01:** Controller operations use explicit projections, tenant+ScopedRead predicates and deterministic cursor contracts capped at 100 where paginated. Internal full-job scans page or fail explicitly; a limit alone cannot silently omit workers or results.
- [ ] **AC-ARCH-030-02:** Test stable tie-breaks, limit+1/hasMore, tampered cursor, changed filters and totals from the same predicate; no fabricated total on a keyset response.
- [ ] **AC-ARCH-030-03:** Use bounded batch reads rather than N+1 joins; benchmark realistic tenant volumes under the application DB role with tenant GUC, not a bypass-RLS owner.
- [ ] **AC-ARCH-030-04:** Publish EXPLAIN buffer/query-count evidence and selective indexes including tenant key. Composite tenant FKs and existing RLS must be verified and preserved, not assumed absent or replaced.
- [ ] **AC-ARCH-037-01:** Use current backend parent/core and domain dto layout, controller-to-owning-module-to-Drizzle pattern, explicit cross-owner interfaces and thin frontend routes. Do not add a generic repository or a second mutable People store.
- [ ] **AC-ARCH-037-02:** Apply the deletion test to barrels, forwarding modules and extracted helpers: retain a seam when it hides real behavior or actual variation; removing it must not scatter authorization or calculation policy.
- [ ] **AC-ARCH-037-03:** In-process computation is tested directly through its interface. Database races use an isolated PostgreSQL fixture under application role; query-chain mocks are not that fixture. External dependencies use production/test adapters and sandbox evidence.
- [ ] **AC-ARCH-037-04:** Concentrate change and verification with the owner for locality and caller benefit for leverage; file count/line ratios do not establish depth. Replace shallow tests only after their behavioral scenarios survive at the owner interface.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

