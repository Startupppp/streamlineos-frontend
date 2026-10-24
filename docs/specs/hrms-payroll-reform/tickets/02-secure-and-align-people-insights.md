# 02: Secure and align People insights

**What to build:** People insights show only authorized payroll aggregates and consistent filters, periods and department identities across chart and AskOS consumers.

**Blocked by:** 01 Publish the executable baseline

**Status:** in-progress

**Program:** AP-01

**Requirements:** FR-ARCH-001, FR-ARCH-002, FR-ARCH-003

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-001-01:** Seed analytics-only and salary/payroll own, team, all and none actors. Analytics-only responses contain no payroll amount in the command center, exports, cached projection or AskOS. Omission versus null is declared consistently in backend and frontend schemas.
- [ ] **AC-ARCH-001-02:** Organization-wide payroll totals require authorized organization-wide salary/payroll scope; Map.has(permission) alone is insufficient. Unsupported scope combinations deny or return an explicitly authorized projection.
- [ ] **AC-ARCH-001-03:** Authorization precedes query and cache fill. Test sequential differently scoped actors, permission changes and cache hits; no earlier actor's amount appears in a later response.
- [ ] **AC-ARCH-001-04:** Preserve the independent dedicated payroll-cost job and existing backend tenant/object enforcement; changing card visibility cannot satisfy this requirement.
- [ ] **AC-ARCH-002-01:** With disjoint department A/B fixtures, each returned metric and drill-through applies the declared department/entity predicate. Unknown or unauthorized department never silently falls back to organization-wide data.
- [ ] **AC-ARCH-002-02:** Each metric declares grain, business meaning, period, as-of time, source version, unit/currency, coverage and sensitivity. Define contributing locked/paid run statuses and correction/supplemental treatment; drafts/reopened runs cannot accidentally double-count cost.
- [ ] **AC-ARCH-002-03:** Month/quarter/year selection changes every metric it claims to control. Fixed-window metrics label their own period explicitly; KPI, chart, export, drill-through and AskOS agree.
- [ ] **AC-ARCH-002-04:** Cache keys encode actual filters and authorized shape, and relevant source writes invalidate those namespaces. Test historical/future periods, missing data versus zero and partial coverage.
- [ ] **AC-ARCH-003-01:** AskOS department inputs use the current canonical org-unit identifier schema, consistent with HR routes and the text department column; remove the numeric-only mismatch without coercing unrelated IDs.
- [ ] **AC-ARCH-003-02:** Validate tenant and object access before executing a filtered read. Reject malformed IDs and foreign/out-of-scope departments with the established safe error semantics.
- [ ] **AC-ARCH-003-03:** An AskOS department headcount equals the authorized HR metric for the same fixture, date and department. Include a database/contract case for the real identifier type.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

