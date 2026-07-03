# StreamlineOS Product Bible

# Timesheets / Worklogs

# 18_AI_Agent_Implementation_Guide.md

## Purpose

Instructions for an AI coding agent implementing this PRD pack.

## Mandatory Reading

Read this folder in order.

Then inspect:

- existing frontend `/timesheets` pages,
- `features/timesheets`,
- `components/timesheets`,
- `hooks/api/projects/time-entries.ts`,
- backend `projects-execution/timesheets*`,
- backend HR work logs,
- RBAC permission files,
- invoice/billing modules,
- project/client schemas.

## Implementation Order

1. Audit current implementation and map reuse.
2. Add standalone timesheets route/nav structure.
3. Add schema migrations for periods, timer sessions, settings, rates, budgets, audit.
4. Add backend `/timesheets` services/APIs.
5. Keep legacy `/projects/time-entries` working.
6. Build My Time weekly grid and timer.
7. Build Team overview.
8. Build Approvals queue.
9. Build Billing queue and invoice export.
10. Build Payroll export.
11. Build Reports.
12. Build Settings.
13. Add reminders and AI suggestions.
14. Add tests and QA screenshots.

## Non-Negotiables

- Do not hard-delete approved/invoiced/payroll-exported time.
- Do not expose cost/pay rates without permission.
- Do not break project ticket time tracker.
- Do not make invasive monitoring default.
- Do not store lifecycle entities as JSON arrays.
- Do not skip audit for financial state changes.
- Do not ship a list-only page as the standalone product.

## Commit Strategy

Commit one milestone at a time:

- `feat(timesheets): add period schema`
- `feat(timesheets): add timer APIs`
- `feat(timesheets): build weekly grid`
- `feat(timesheets): add approvals queue`
- `feat(timesheets): add billing export`
- `test(timesheets): cover approval flows`

## Final Agent Output

Report:

- files changed,
- migrations added,
- APIs added,
- screens added,
- tests run,
- screenshots checked,
- remaining risks.
