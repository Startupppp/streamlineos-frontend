# 01: Publish the executable baseline

**What to build:** Publish a current, reproducible inventory of HRMS and Payroll source, ownership, routes, queries, permissions, and consumers so implementation tickets can reserve exact work and proceed safely.

**Blocked by:** None (can start immediately)

**Status:** in-progress

**Program:** AP-00

**Requirements:** AP-00 readiness milestone; final FR-ARCH-039/040 acceptance closes in ticket 26

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] Publish the current source, route, schema, query, cache, permission, actor and consumer inventory with separate frontend/backend revisions.
- [ ] Reproduce or retire dated audit findings using current source and record exact child write/test reservations in the ledger.
- [ ] Run architecture coverage and execution-plan validators, including negative self-tests; record actual command results.
- [ ] Set AP-00 readiness to PUBLISHED with a concrete artifact and revision. Keep FR-ARCH-039/040 criteria open until ticket 26 verifies final reconciliation.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

