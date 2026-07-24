# Milestone 0 — QA Foundation

> Status legend: `todo` · `in-progress` · `done` · `blocked`
> Type: page-audit · journey · rbac · api · feature-gap · automation

| ID | Module | Route / Area | Type | Priority | Status | Est | Role | Acceptance criteria | StreamlineOS |
|----|--------|--------------|------|----------|--------|-----|------|---------------------|--------------|
| QA-M0-001 | Foundation | `local env health` | journey | P0 | todo | XL | owner | Frontend :1000 and backend :1500 healthy; /health 200; DB reachable; Ably/Redis configured or documented unavailable. | QA-3 |
| QA-M0-002 | Foundation | `migrations applied` | api | P0 | todo | L | owner | Pending migrations applied or listed; seed scripts run without schema errors. | QA-2 |
| QA-M0-003 | Foundation | `Org Alpha seed` | journey | P0 | todo | XL | owner | Disposable Org Alpha exists with PROJECTS+core modules enabled; resettable. | QA-1 |
| QA-M0-004 | Foundation | `Org Beta seed` | journey | P0 | todo | XL | owner | Second tenant Org Beta exists solely for cross-tenant denial tests. | QA-4 |
| QA-M0-005 | Foundation | `role matrix users` | rbac | P0 | todo | L | owner | Users exist: platform-admin, owner, workspace-admin, PM, contributor, approver, client, denied; credentials recorded privately (not in git). | QA-5 |
| QA-M0-006 | Foundation | `RBAC grants backfill` | rbac | P0 | todo | L | owner | ``pnpm -C backend backfill:rbac`` (or equivalent) grants catalog defaults; non-owner roles receive expected permissions. | QA-6 |
| QA-M0-007 | Foundation | `access matrix spreadsheet` | rbac | P1 | todo | M | admin | Matrix file lists action × role × UI × API expected for M1 first slice. | QA-7 |
| QA-M0-008 | Foundation | `evidence folder convention` | journey | P2 | todo | M | tester | Folder/naming for screenshots + HAR notes agreed; linked from defect template. | QA-8 |
| QA-M0-009 | Foundation | `defect severity taxonomy` | journey | P1 | todo | L | tester | P0–P3 definitions from spec used in every defect; template linked. | QA-9 |
| QA-M0-010 | Foundation | `tracker sync process` | automation | P2 | done | XL | owner | Documented how local backlog status maps to StreamlineOS tickets via MCP. | QA-10 |
| QA-M0-011 | Foundation | `demo seed reuse` | journey | P2 | todo | M | owner | Decide: reuse ``seed:demo`` / ``seed:enterprise`` vs new QA seed; document choice in backlog notes. | QA-11 |
| QA-M0-012 | Foundation | `MCP token configured` | automation | P2 | done | XL | owner | StreamlineOS MCP lists projects successfully (optional until token available). | QA-12 |


**Count:** 12 tickets (12 active · 0 cancelled · 0 deferred) · est **43sp / 62h** · done: 2 · % complete: 17%
