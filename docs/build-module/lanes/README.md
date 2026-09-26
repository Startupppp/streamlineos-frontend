# Build Module — Eight-Lane Partition

Created 2026-09-25 from root `6ea4f0c6d`.

The work is the **acceptance-criteria checkboxes in the 83 `docs/build-module/10-*.md` page
specifications** — 74 authenticated specs with 7 criteria each and 9 portal/public specs with 6,
572 boxes, all currently unchecked. Each lane owns a disjoint set of page specs and a disjoint code
territory. No lane may edit another lane's specs, status file, or territory.

Every lane reads [`LANE-COMMON.md`](./LANE-COMMON.md) first.

| Lane | Domain | Specs | Migration range |
|---|---|---:|---|
| 1 | Organization work surfaces & directory | 9 | 1240–1244 |
| 2 | Planning: goals, roadmap, portfolios, programs, milestones, releases | 8 | 1245–1249 |
| 3 | Managed products & Feedbucket | 9 | 1250–1254 |
| 4 | Project execution core: issues, backlog, tickets, epics, cycles, triage, modules, workload | 10 | 1255–1259 |
| 5 | Collaboration & client-facing portals | 10 | 1260–1264 |
| 6 | Governance & QA: qa, incidents, risks, decisions, approvals, reports, budget | 9 | 1265–1269 |
| 7 | Project & organization settings | 15 | 1270–1274 |
| 8 | Content & intake: wiki, whiteboard, files, forms, intake, meetings, public surfaces | 13 | 1275–1279 |

Orchestrator keeps: `00-overview.md`, `01-ia-navigation.md`, `02-schemas.md`,
`03-api-contracts.md`, `04-shared-components.md`, `05-performance-caching.md`,
`06-prioritized-backlog.md`, `99-kill-list.md`, `99-open-questions.md`, `RELEASE-STATUS.md`,
`MIGRATION-RUNBOOK.md`, every shared file in `LANE-COMMON.md` §2, all migration journalling and
application, and all commits.

## Territory contest rule

A file reached **only** from your own page specs is yours even if this document does not name it.
A file reached from **another lane's** page specs too is request-only: append the exact
`path:line` + change to `docs/build-module/lanes/requests/LANE-N.md` and move on. When in doubt,
read the other seven briefs before editing — they are all in this directory.

Known contested files, request-only for every lane:

- `frontend/hooks/api/build/projects.ts`, `project-cache-patch.ts`, `build-project-schema.ts`
- `frontend/hooks/api/build/build-tickets-core-schema.ts`, `build-tickets-subresource-schema.ts`
- `frontend/features/build/project-detail/project-board-page.tsx` (every project tab mounts here)
- `backend/src/modules/build/core/projects.controller.ts`, `projects.module.ts`,
  `projects-by-id.controller.ts`, `projects-by-id.module.ts`, `project-access.ts`,
  `projects-scope.ts`, `projects-query.service.ts`, `projects-write.service.ts`
- `backend/src/modules/build/entity/**`

## Status

Each lane writes `status/LANE-N-STATUS.md`. Requests go in `requests/LANE-N.md`.
