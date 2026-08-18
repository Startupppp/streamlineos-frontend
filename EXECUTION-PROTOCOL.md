# HRMS core execution protocol

Updated: 2026-08-12

This file records the execution rules supplied by the user for the HRMS core
refactor. It applies only to the `hrms-core-architecture-review` worktree.

## Scope

- Work only on HRMS core: employee/person/employment master, organization
  structure, attendance, leave, employment documents, onboarding and lifecycle.
- Do not start Payroll or Recruitment until HRMS core is merged and its external
  deployment gates are satisfied.
- Preserve NestJS as the business-logic boundary and Next.js as presentation.

## Phase progression

1. Phase 0 is read-only. Preserve the completed evidence-backed audit in
   `docs/hrms/hrms-core-phase-0-audit-2026-08-10.md` and index it from
   `AUDIT-HRMS.md`.
2. Record every finding in `TASKS.md`; do not silently drop or renumber IDs.
3. Record schema decisions before implementation in `SCHEMA-PLAN.md`.
4. Continue through schema, API, caching, UI, tests and cleanup without waiting
   for another design approval.
5. Record conservative assumptions and trade-offs in `DECISIONS.md`.
6. Update `REFACTOR-STATE.md` at each handoff.

## Conservative defaults

- No new dependency unless the user explicitly approves it.
- Live tenants exist, so schema work is expand-contract and rollback-aware.
- The current payroll output is not trusted and is not a golden baseline.
- A remote database URL is never assumed to be a disposable clone. Database
  mutation requires a separately identifiable disposable production-size clone,
  exact target-bound manifests and restore evidence.
- Missing runtime telemetry, a missing clone, managed-KMS custody and human
  two-reviewer classifications are external evidence gates, not reasons to fake
  results or mutate production.
- Risky or ambiguous choices fail closed and are recorded rather than guessed.

## Work discipline

- Inspect before editing and preserve unrelated user changes.
- Use the existing isolated worktree; do not mix primary-worktree Inventory,
  Build or Notifications ledgers into HRMS.
- Keep files below 500 lines and target 300 lines.
- Do not delete a table, endpoint or production file without Knip/module-graph,
  symbol, raw-name and FK evidence appropriate to the artifact.
- Do not expose credentials or raw sensitive values in commands, logs or docs.
- Bound slow commands. If a process exceeds its deadline, terminate only that
  exact process tree, report the timeout and continue with narrower checks.

## Three-pass verification

1. **Contract pass:** strict type-checks, schema/source invariants, migration
   hash/catalog checks and focused tests for changed behavior.
2. **Integration pass:** tenant isolation, RBAC/DataScope, cache invalidation,
   rollback/refusal and affected feature regressions.
3. **Final sweep:** production Knip files/exports/types and cycle checks, file
   caps, `git diff --check`, changed-file review and documentation reconciliation.

A pass is reported only when its command completed with an observed zero exit.
An external gate remains open with its exact required evidence; it is never
misreported as completed.
