# HRMS Context Capsules

## Purpose

Agents should not reload the full HRMS specification. The coordinator copies
one row below, the exact acceptance text, and the named source/tests into the
assignment. Default context is no more than three PRD sections and roughly
12,000 tokens. Historical evidence is read only to resolve a named regression.

| Packet kind | Read from acceptance library | Read in source | Do not preload |
|---|---|---|---|
| Route/navigation child | matching HRM-14 row; relevant HRM-01 section; D05–D13 if applicable | exact route/feature/link source and direct route tests | all page catalogs and release history |
| Sidebar child | relevant HRM-03 group/rule; matching HRM-14 rows | one nav group file, destination manifest consumer, direct tests | all 163 route implementations |
| Backend list child | matching page row; relevant HRM-04 filter/pagination and HRM-07 operation rule | controller operation, service query, owned DTO, direct specs | unrelated controllers/schema corpus |
| Backend mutation child | matching HRM-06/domain row; relevant HRM-07/08 rule | controller/service/schema and direct tests | full forms or release PRD |
| People/Directory cutover | D01 plus exact HRM-08 write-owner section and page row | exact old/new writer, join facade, reconciliation tests | other HR domains |
| Time/attendance/WFH | D04/D06/D13; exact HRM-13 and 14b section | exact attendance/leave/device files/tests | payroll suite except named input consumer |
| Payroll operation | matching HRM-12 and 14f section; relevant validation/data rule | one payroll controller/service/DTO/test set | all HR modules and country packs |
| Frontend list/view | matching HRM-14 row; exact HRM-04/05 rule | exact feature, hook/client, components/tests | all page catalogs/backend modules |
| Frontend form | exact HRM-06/12/13 form row and matching page row | form, feature schema/client, direct tests | unrelated forms |
| Bulk/job child | exact HRM-05/domain criterion; matching page row | one selection/preflight/execute or job slice | other bulk surfaces |
| Shared route seam | HRM-01; D02/D05/D08–D13; applicable catalog rows | manifests/access/nav resolver/gate tests | page implementation internals |
| Shared permission seam | D07; relevant HRM-08 permission section | FE/BE catalogs/generators/role tests | business page code |
| Shared contract seam | canonical section of HRM-04/06/07 | shared filter/DTO/error/cursor files/tests | component styling and route catalog |
| Shared query/cache seam | HRM-07 cache sections and one mutation-reader matrix | key factory/cache primitives/tests | all service implementations |
| Shared UI seam | HRM-09 and blueprint Visual System | token/primitives and direct tests | page/business logic |
| Schema/migration child | exact HRM-08 decision and affected HRM-07/12/13 rule | one schema slice, migration, integrity tests | all schema files/journal history |
| External browser | exact acceptance IDs and generated route/page batch | journey fixture plus fixed deployed revisions | implementation history |
| External database | exact operation/migration IDs and data distribution | named scripts/query/migration at fixed revisions | frontend UI docs |

## Source Pointers

- Routes: `frontend/app/(authenticated)/hr`, `directory`, `me`, `payroll`, plus
  `frontend/app/employee-onboarding/page.tsx`.
- HR UI: `frontend/features/hr`; Directory: `frontend/features/directory`;
  Payroll: `frontend/features/payroll`; self/onboarding feature roots.
- Navigation: `frontend/components/layout/sidebar/sidebar-nav-routes-hr-*.ts`,
  `sidebar-nav-groups-hr.ts`, `sidebar-nav-groups-payroll.ts`,
  `sidebar-home-nav.ts`.
- Backend: `backend/src/modules/hr`, `directory`, `payroll`.
- Schema: `backend/src/db/schema/hr`, `directory`, `payroll`.
- Existing scale checks: `backend/src/scripts/check-hr-list-read-cost.mjs` and
  `verify-hr-list-endpoints.mjs`.

Pointers are discovery roots, not write permission.

## Escalation

If named source contradicts the capsule, stop only the conflicting step and
report: exact statements, exact source, smallest decision/seam change, affected
children, and work that can safely continue. The agent does not browse adjacent
PRDs until it finds a preferred interpretation.
