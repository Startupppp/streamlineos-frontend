# Build Canonical Schemas

## Evidence and authority

- Drizzle schema: `backend/src/db/schema/build/`.
- Schema barrel: `backend/src/db/schema/build/index.ts`.
- Relations: `backend/src/db/schema/build/relations.ts`.
- Common actors/tenancy: `backend/src/db/schema/common/auth.ts`.
- Request/response Zod schemas: `backend/src/modules/build/**/dto/*.schemas.ts`.
- Client schemas: `frontend/hooks/api/build/*-schema.ts`.

Database migrations remain authoritative for storage. Zod schemas are authoritative at network and form interfaces. A client schema may not silently diverge from its server counterpart.

## Scope hierarchy

PM Workspace is removed. Migration `1159_build_remove_pm_workspaces` dropped `build.pm_workspaces`, `build.pm_workspace_memberships`, and every `pm_workspace_id` column (`build.projects`, `build.managed_products`, `build.project_teams`, `build.project_workspace_members`, `public.project_client_grants`). The rollback at `migrations/rollback/1159_build_remove_pm_workspaces.down.sql` restores shape only — the rows are gone.

```text
Organization
├── Products
├── Projects
├── Teams
├── Programs
├── Portfolios
└── Goals, roadmaps, reports and work
```

`orgId` is mandatory on every tenant-owned table and participates in foreign keys or verified lookup predicates. `managedProductId` is an optional project grouping; a project without a product is an organization-level project.

## Canonical entities

| Entity | Required identity and fields | Key relations | Lifecycle |
|---|---|---|---|
| Project | `id`, `orgId`, `key`, `name`, `status`, dates | optional product/deal; manager/client memberships | soft delete |
| WorkItem | `id`, `orgId`, `projectId`, number/key, type, title, status, priority, rank, reporter | parent, assignees, cycle, module, release, labels, relations | soft delete + version |
| Cycle | `id`, `orgId`, `projectId`, name, start/end, status | work items | archive/complete; no Sprint table after migration |
| ManagedProduct | `id`, `orgId`, name, status | projects, feedback, goals | soft delete |
| Portfolio/Program | `id`, `orgId`, name, status | projects or portfolios through mapping tables | soft delete |
| Team | `id`, `orgId`, name | membership actors and projects | soft delete |
| BuildMember | `id`, `orgId`, `membershipId`, `role`, `addedAt` | organization membership | roster row; no workspace relationship |
| Goal | `id`, `orgId`, scope discriminator, title, status, target | products/projects/work items | archive |
| Form | `id`, `orgId`, `projectId`, version, publication state, schema | immutable submission snapshots | archive |
| IntakeSubmission | provenance, form/version, status, assignee, mapped fields | optional accepted work item | retain/audit |
| Risk/Decision/Approval/ChangeRequest | project identity, typed state, owner/actors, dates | work items/releases/files | state-machine + audit |
| Incident | project identity, severity/status/commander/times | append-only events, actions, files, releases | resolve/archive |
| QA Case/Run/Result | project identity, version, environment/status | canonical BUG work item | archive/evidence retention |
| SavedView | owner, scope, visibility, layout, versioned filters | fields/statuses/users | archive |
| ActivityEvent | org/scope/record/actor/type/time, redacted payload | source record | append-only |

## Index rules

- Every list begins with `org_id` and its parent scope, then active predicate, filter/sort columns, and stable tie-breaker ID.
- Soft-deleted rows use partial indexes: `WHERE deleted_at IS NULL`.
- Cursor ordering is deterministic: requested sort plus `id` in the same direction.
- Human keys are unique within organization or project only while active.
- Text search uses measured trigram/FTS indexes; `projects.name` already uses `idx_projects_name_trgm` in `backend/src/db/schema/build/core.ts`.
- Composite tenant foreign keys prevent cross-organization references even when numeric IDs collide.
- JSONB stores bounded configuration or immutable snapshots, never query-critical relationship data.

## Soft delete and audit

- Soft delete fields: `deletedAt`, `deletedByMembershipId`, optional `deleteReason` where regulated or externally visible.
- Restore revalidates parent existence, unique keys, permissions, and retention windows.
- Permanent purge runs only through a bounded retention job and separately handles Files-owned objects.
- Activity is append-only and records actor membership, source, request/idempotency ID, before/after field diff, and timestamp. Secrets and rich content are redacted.

## Validation contract

- One server-owned Zod input schema per command and one response schema per wire representation.
- Frontend forms import or vendor the same contract through generated/OpenAPI parity; no hand-maintained alternative field constraints.
- IDs and route params are coerced and bounded once at the controller interface.
- Date-only values use `YYYY-MM-DD`; instants use UTC ISO-8601.
- Money uses integer minor units plus ISO currency; no floating-point arithmetic.
- Clearing an optional field is explicit `null`; omission means unchanged in patch commands.

## Migration order

1. **Done.** `1159_build_remove_pm_workspaces` dropped `build.pm_workspaces`, `build.pm_workspace_memberships`, every `pm_workspace_id` column, and renamed `build.project_workspace_members` to `build.build_members`.
2. Reconcile Sprint/Cycle records into one Cycle identity; migrate ticket references, permissions, events, saved views, reports, and URLs.
3. Migrate independent QA bugs to canonical `WorkItem.type=BUG`, preserving evidence links and activity.
4. Version saved-view filters and rewrite removed route/layout references.
5. Consolidate intake submissions under Form/Triage provenance.
6. Add missing composite tenant foreign keys and partial indexes online.
7. Introduce audit/outbox fields before moving writers.
8. Remove duplicate tables/columns only after parity reports and rollback windows close.

## Cross-module references

- HRMS: store organization membership IDs, not mutable employment labels; leave/capacity is projected by HRMS.
- CRM: projects may reference a deal/customer through tenant-safe keys; CRM remains source of truth.
- Timesheets: work items are references; entries and approvals remain Timesheets-owned.
- Accounting: Build stores budget intent; recognized cost/revenue remains Accounting-owned.
- Knowledge: project Wiki stores links/projections to Knowledge pages; Library remains organization-owned.
- Files: Build stores attachment references and metadata, never duplicate blobs.

## Acceptance criteria

- [ ] Every tenant-owned relation is protected by `orgId` in schema and query predicates.
- [x] Standalone projects work with no product: `managedProductId = null` makes the project organization-level. PM Workspace and `pmWorkspaceId` no longer exist.
- [ ] Cycle and BUG have one canonical identity each.
- [ ] Every list has a measured composite index matching filters and cursor order.
- [ ] Client and server validation constraints have automated parity evidence.
- [ ] Soft delete, restore, retention, audit, and outbox behavior is specified for every mutable entity.
