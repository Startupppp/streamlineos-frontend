# HRMS core cache invalidation matrix

Status: implemented for workforce identity mutations as of 2026-08-18. Query
keys are additionally isolated by authenticated organization and actor in
`frontend/components/providers/query-provider.tsx`.

## Rules

- Every cache is scoped by authenticated organization and actor. Organization
  switch, logout and a 401 clear the active client before a new scope renders.
- Invalidation is mutation-specific. Do not invalidate the whole QueryClient or
  the entire HR namespace.
- A mutation invalidates list/projection roots and the exact record detail when
  that record identity is known.
- Payroll, approval and compliance mutations are not optimistic.

## Workforce identity mutations

The executable matrix is centralized in
`frontend/lib/hr-workforce-cache.ts` and covered by
`frontend/lib/hr-workforce-cache.test.ts`.

| Mutation | Employee projections | Directory projections | Onboarding | Exact target |
|---|---|---|---|---|
| Update employee profile | employees, org chart | people, workers | status | employee detail, stats, employment |
| Onboard one employee | employees, org chart | people, workers | status | employee detail, stats, employment |
| Bulk onboard employees | employees, org chart | people, workers | status | none; target IDs are not returned |
| Initiate onboarding | employees, org chart | people, workers | status | employee detail, stats, employment |
| Complete termination | employees, org chart | people, workers | status | employee detail, stats, employment |
| Final termination review | employees, org chart | people, workers | status | employee detail, stats, employment |

## Time and leave mutations

| Mutation family | Required invalidations |
|---|---|
| Clock in/out and break events | current status, daily attendance, monthly attendance, attendance summary, work logs |
| Attendance regularization decision | request detail/list, daily/monthly attendance and summary |
| Leave create/cancel/decision | self context, self requests, team requests and this-week projection as applicable |
| Leave type/policy mutation | type/policy catalog plus affected leave context |
| Holiday mutation | holiday year/calendar and attendance projections that consume holidays |

## Documents and lifecycle mutations

| Mutation family | Required invalidations |
|---|---|
| Document create/update/archive/remove | document list, stats/quota and exact document/version |
| Onboarding document upload/review | onboarding status, checklist/latest-state summary and exact user documents |
| Probation decision | probation cursor root and affected employee detail/employment |
| Resignation transition | resignation list/detail and affected employee lifecycle projection |

## Review gate

A new HRMS mutation is incomplete until its success path documents and tests the
smallest sufficient invalidation set. If a new projection is derived from
workforce identity, add it to `invalidateHrWorkforceQueries` and its focused
test; do not add scattered duplicate invalidations.
