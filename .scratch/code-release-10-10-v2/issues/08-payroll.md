# 08: Payroll

**What to build:** Payroll calculations, ledgers, payment batches, exports, permissions, and UI states are correct, immutable where required, and retry-safe.

**Blocked by:** 02 — Schema and executable-key minimization; 04 — API, Zod and OpenAPI contracts; 05 — Authentication, Organization, RBAC and Settings

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C120** — Architecture/schema: verify payroll runs, components, assignments, calculations, payslips, taxes, deductions and payment/reconciliation history are normalized, tenant-safe and immutable where financial.
- [ ] **PRD-C121** — Queries/cache/workers: verify bounded run/item reads, indexed employee/period/status paths, no N+1 calculations, asynchronous exports and correct invalidation after lock/publish/reversal.
- [ ] **PRD-C122** — Frontend/TanStack/tests: verify run-state UI, conflict/retry/partial failure, permission gates, secure downloads and calculation/locking/reconciliation E2E.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
