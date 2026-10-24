# 05: Publish strict versioned wire contracts

**What to build:** Clients and servers exchange versioned, validated HRMS and Payroll commands, reads and errors without silently accepting unknown shapes.

**Blocked by:** 04 Unify identity, Employment Facts and payroll eligibility

**Status:** ready-for-agent

**Program:** AP-04

**Requirements:** FR-ARCH-008

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-008-01:** Owner DTO folders contain strict Zod body/query/params and declared response schemas; infer types rather than maintaining conflicting parallel payload types. Public projections are explicit and permissioned.
- [ ] **AC-ARCH-008-02:** Generate and vendor OpenAPI/enums/permission artifacts through existing tooling. Pin local, remote and deployed contract revisions separately; a matching local artifact is not deployed parity proof.
- [ ] **AC-ARCH-008-03:** Reconcile HR/payroll request and response drift by endpoint, including nullability, unknown enums, dates, money strings and 204. The Timesheets-only request-drift gate is not HR coverage.
- [ ] **AC-ARCH-008-04:** Keep current routes while migrating callers unless an explicit route disposition authorizes removal. Route params use the actual entity ID; preserve 400/402/403/404/409/429 semantics and safe correlation IDs.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

