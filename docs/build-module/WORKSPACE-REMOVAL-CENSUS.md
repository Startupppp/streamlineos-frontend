# PM Workspace removal — census

Recorded before any edit. Branch `claude/remove-build-workspaces` in both repos.
Base: root `2c5917de2`, backend `bbcf8a59c`.

## Scope rule

In scope: the Build PM Workspace domain — `pmWorkspaces`, `pmWorkspaceMemberships`,
`pm_workspace_id`, `build:workspaces:*`, `/build/workspaces*`, `Default Workspace`,
the `workspace` scope type in the Build scope switcher.

Out of scope (generic "workspace", left untouched):

| Surface | What it actually is |
| --- | --- |
| `components/layout/header/create-workspace-dialog.tsx` | creates an **Organization** (`useCreateOrganization`) |
| `components/workspace-onboarding/*` | org setup checklist |
| `features/org-setup/components/workspace-preview-*.tsx` | marketing preview of the app shell |
| `features/chat/message-panel-workspace.tsx` | chat layout pane |
| `features/sign/public/signing-workspace.tsx` | e-sign canvas |
| `hooks/api/support/support-workspace-schema.ts` | support module |
| `hooks/common/use-workspace-checklist-progress.ts` | org onboarding checklist |
| `pnpm-workspace.yaml` | pnpm |
| `build.project_views.scope = 'workspace'` | org-wide saved-view scope, unrelated to PM Workspace |

## Database — verified against production, not inferred

Target: Aurora PostgreSQL **18.4**, cluster `streamlineos`, database `streamlineos`,
`ap-south-1`. Unencrypted, 1-day backup retention, no deletion protection.
Pre-migration manual snapshot: `streamlineos-pre-1159-ws-removal-20260923`.

Counts read live before any change:

| Relation | Rows |
| --- | --- |
| `build.pm_workspaces` | 7 (6 `Default Workspace`, 1 `MySpace`) |
| `build.pm_workspace_memberships` | 0 |
| `build.project_workspace_members` | 1 |
| `build.projects` | 9 (all 9 carried a `pm_workspace_id`) |
| `build.managed_products` | 1 |
| `build.project_teams` | 1 |
| `build.tickets` | 220 |
| `build.roadmap_items` | 1 |
| `public.organizations` | 20 |

Corrections the live catalog forced on the paper census:
`goals` lives in `public`, not `build`. `project_client_grants` lives in `public`,
not `portal_access`. No view, function or trigger references `pm_workspace_id`,
and no RLS policy mentions it — the three affected tables carry the standard
`tenant_isolation` policy on `org_id` only.

Tables to drop:

| Table | Rows retained elsewhere? |
| --- | --- |
| `build.pm_workspaces` | workspace-only — deleted |
| `build.pm_workspace_memberships` | workspace-only — deleted |

Columns to drop:

| Table | Column | Nullability | FK | Index |
| --- | --- | --- | --- | --- |
| `build.projects` | `pm_workspace_id` | NULL (since 1141) | `fk_projects_org_pm_workspace` | keyset/scope indexes (1122, 0806) |
| `build.managed_products` | `pm_workspace_id` | NOT NULL | `fk_managed_products_org_pm_workspace` | `idx_managed_products_org_workspace` |
| `build.project_teams` | `pm_workspace_id` | NOT NULL | `fk_project_teams_org_pm_workspace` | `idx_project_teams_org_workspace` |
| `build.project_workspace_members` | `pm_workspace_id` | NOT NULL | `fk_project_workspace_members_org_pm_workspace` | — |
| `portal_access.project_client_grants` | `pm_workspace_id` | NULL | none | none |

Table rename (user job preserved — org-level Build member roster):
`build.project_workspace_members` → `build.build_members`
(`id`, `org_id`, `membership_id`, `role`, `added_at`; PM Workspace relationship dropped).
Its unique key was already `(org_id, membership_id)` — one row per person per Organization —
which is why it is a Build roster and not a workspace roster.

## Migration 1159

`migrations/1159_build_remove_pm_workspaces.sql`, journal idx 1042, 31 statements.
Rollback at `migrations/rollback/1159_build_remove_pm_workspaces.down.sql`, 37 statements.
Standalone operator checks at `migrations/sql/1159-{pre,post}conditions.sql`.

Proven before any apply by replaying both files against the production schema inside a
transaction that was then rolled back:

- forward: 31/31 statements ran, postconditions passed, `pm_workspace_id` column count 0,
  `build.build_members` present with its 1 roster row, projects 9, tickets 220.
- forward + rollback round trip: both tables and all five columns came back, the three
  `tenant_isolation` policies came back, the roster row survived. The restored columns are
  NULLABLE with no FK — the rollback restores shape, not rows.

The rollback is a shape restore only. PM Workspace rows and every `pm_workspace_id` value are
gone for good; recovering them means restoring the snapshot named above.

## Backend — module and callers

### Deleted wholesale
`src/modules/build/pm-workspaces/` — controller, module, `PmWorkspacesService`,
`PmWorkspaceMembershipsService`, DTOs, response schemas, 6 spec files.

### Permission keys removed (`src/modules/rbac/permissions/build.ts`, `role-templates-build.constants.ts`)
`build:workspaces:view`, `:create`, `:update`, `:delete`, `:members:view`, `:members:manage`.

### Callers of `PmWorkspacesService`
| File | Method used | Action |
| --- | --- | --- |
| `build/core/projects-provision.service.ts` | `resolveWorkspaceIdForWrite`, `assertMemberOfWorkspace`, `resolveDefaultWorkspaceId` | drop |
| `build/core/projects-query.service.ts` | `assertMemberOfWorkspace` | drop + drop `pmWorkspaceId` filter/projection |
| `build/core/projects-templates.service.ts` | `resolveDefaultWorkspaceId` | drop |
| `build/core/projects-workspace-members.service.ts` | `resolveDefaultWorkspaceId` | drop; rename service to Build members |
| `build/teams/teams.service.ts` | `resolveWorkspaceIdForWrite`, `assertMemberOfWorkspace` | drop |
| `build/managed-products/managed-products.service.ts` | same | drop |

### Other `pm_workspace_id` readers
`build/core/projects-write.service.ts` (cross-workspace product guard),
`build/core/projects-work-query.service.ts`, `build/core/projects-roadmap.service.ts`,
`build/agent-pulse/agent-pulse.service.ts` (4 scope joins),
`build/scope-directory/scope-directory.service.ts` (`workspace` ScopeKeyType, ws search branch,
membership gate, `parentPath`), `goals/goals.service.ts` + `goals/goals-project-scope.ts`
(`goalsInPmWorkspaceCondition`), `access/entitlements.service.ts` (default-workspace provisioning
on module enable), `build/teams/team-members.service.ts` (workspace-membership gate on team add),
`portal/access/lib/project-client-grants.ts`,
`organization/core/membership-artifact-catalog/build.artifacts.ts` (2 catalog entries).

### DTO/contract files carrying `pmWorkspaceId`
`build/core/dto/{project-core,build-core-response,build-project-detail-response,roadmap,ticket}.schemas.ts`,
`build/teams/dto/teams{,-response}.schemas.ts`,
`build/managed-products/dto/managed-products{,-response}.schemas.ts`,
`build/scope-directory/dto/scope-directory.schemas.ts`,
`build/agent-pulse/dto/agent-pulse.schema.ts`, `goals/dto/goal.schemas.ts`,
`portal/access/dto/portal-access{,-response}.schemas.ts`,
`agent-access/dto/agent-response.schemas.ts`.

### Specs touching the domain (36)
Deleted with the module: `pm-workspaces/*.spec.ts` (6).
Rewritten: `projects-pm-workspace-write`, `projects-workspace-membership-enforcement`,
`projects-list-workspace-projection`, `projects-managed-product-link-workspace`,
`projects-workspace-members*`, `roadmap-workspace-filter`, `goals-list-workspace-filter`,
`teams-workspace-membership`, `managed-products-workspace-membership`,
`scope-directory*`, `build-scope-filters`, `build-uncovered.controller.e2e-spec`,
`module-vocabulary.spec`, `implied-view-key.spec`, `build-portal-isolation`,
plus tenant-isolation/keyset specs that only seed the column.

### Scripts / fixtures
`scripts/audit-build-pm-workspace-orphans.mjs` (delete),
`src/scripts/seed-{build-load,perf-scratch,scratch-e2e}.mjs`, `test/helpers/seed-builder.ts`,
`src/scripts/baselines/authz-deny.json`, `test/security/bola/*`,
`src/scripts/check-migration-discipline.mjs`, `test/perf/index-redundancy-candidates.json`.

## Frontend

### Routes deleted (11 files, 9 URLs)
`/build/workspaces` (page, loading, error),
`/build/workspaces/[pmWorkspaceId]` (page, layout, loading, error) and nested
`all-work`, `goals`, `overview`, `products`, `roadmap`, `teams`.

### Features deleted
`features/build/pm-workspaces/*` (9 files),
`features/build/overview/workspace-overview-page.{tsx,test.tsx}`,
`lib/build/pm-workspace-path.ts`, `lib/build/nav/build-workspace-catalog.{ts,test.ts}`,
`hooks/api/build/pm-workspaces.ts`, `hooks/api/build/pm-workspaces-schema.ts`,
`types/projects/pm-workspaces.ts`.

### Refactored
`lib/build/build-scope.ts` (drop `workspace` scope kind),
`features/build/navigation/{use-build-scope-directory,use-build-scope-identity,use-build-scope-recovery,build-scope-tree,build-quick-create}.ts(x)`,
`lib/build/build-route-manifest.ts`, `lib/rbac/route-access/route-access-extension-entries.ts`,
`lib/rbac/permissions/{build,permission-key-business}.ts`, `contracts/permission-catalog.json`,
`features/build/shared/use-build-list-url-state.ts`,
`features/build/{all-work,my-work,managed-products,project-list,teams}` filter surfaces,
`features/build/overview/organization-overview-page.tsx`,
`hooks/api/build/{managed-products,teams,roadmap,agent-pulse,build-project-schema,*-schema}.ts`,
`hooks/api/goals.ts`, `hooks/api/portal-access/portal-access-schema.ts`,
`types/projects/{projects,managed-products,tasks}.ts`, `types/portal-access/grants.ts`,
`lib/query-keys/build-work.ts`, `next.config.ts`.

### Build member roster rename
`hooks/api/build/workspace-members.ts` → `build-members.ts`;
`workspaceMemberPageContract` / `workspaceMemberRowContract` in
`hooks/api/build/{workspace-schema,build-project-schema}.ts` → Build-member names.
Consumer surface is `/build/settings/access` (`/build/members` is already a redirect).

## Deep links already present in `next.config.ts`
`/build/pm-workspaces` → `/build/workspaces` (retarget to `/build`),
`/build/workspaces/:pmWorkspaceId/my-work` → `/build/my-work?pmWorkspaceId=` (drop the query).

## Docs
`docs/build-module/`: `00-overview`, `01-ia-navigation`, `02-schemas`, `03-api-contracts`,
`06-prioritized-backlog`, `08-build-os-flowcharts`, `99-kill-list`, `99-open-questions`,
`10-pm-workspaces.md`, `10-workspaces.md`, `10-workspaces-workspace*.md` (8 page contracts).
`docs/specs/build/`: `module/{00,01a,02a,02d,06b,07}-*.md`, `sidebar/{01,02,03,04}-*.md`,
`README.md`, `generated/routes.snapshot.json`.
