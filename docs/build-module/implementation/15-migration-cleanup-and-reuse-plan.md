# 15 — Migration, cleanup, and reuse plan

Status: Planned

## Rules

Reuse current tables, command/query modules, permission keys, query keys, routes, and UI kit when they represent the same concept. Introduce a new source of truth only after documenting why the existing one cannot preserve the invariant. Permanent dual write is prohibited; a temporary adapter has an owner, metric, removal condition, and deadline.

## Ordered migration program

1. Freeze vocabulary, route, permission, filter, and source-ownership registries.
2. Add additive nullable/default-safe columns/tables and tenant-leading indexes using lock-safe migration patterns.
3. Deploy code that reads old plus new through one adapter while writing the authoritative path and recording parity metrics.
4. Backfill in bounded resumable batches with tenant scope, checkpoints, counts, and failure output.
5. Validate constraints and parity; switch reads through a flag/adapter.
6. Stop legacy writes, observe, and retain rollback/forward-fix window.
7. Remove legacy route/API/schema/component only after references, traffic, jobs, exports, and rollback conditions are clear.

## Compatibility decisions

| Legacy/current concept | Target | Compatibility |
|---|---|---|
| `/build/[projectId]/modules` | Workstreams UI | Keep route/table/API identity initially; label changes only. |
| Assigned and Drafts destinations | My Work sections | Redirect/saved-view mapping; preserve deep links and drafts. |
| Feedbucket list/detail | Intake Bug reports/request detail | Explicit `(org, project, provider, legacySubmissionId) → requestId` mapping; never assume equal IDs. |
| Persona pages Briefs/Assets/Content Pipeline | Saved/configured views | Preserve view IDs/links; no duplicate record table. |
| Current Sprint compatibility controller | Cycle | Tombstone/adapter only; no new Sprint storage semantics. |
| Direct CRM/Timesheet/Accounting data use | Owning-module interfaces/projections | Migrate reads/writes behind adapters; source module remains authoritative. |
| Multiple Ticket write paths | Ticket command seam | Adapters call one owner; effect parity tests before deleting old helpers. |

## Data migrations likely required by target slices

Durable onboarding session/children, dashboard versions/widgets, normalized saved filter expressions, idempotency records, import jobs/outcomes, cross-module references/projections, grant capabilities/revisions, and product evidence/opportunity/outcome trace. “Likely” is not authorization to create them; each slice first maps the current schema and writes an ADR/migration rationale.

## Cleanup gates

A file/table/endpoint is removable only when import/reference scans are clean, no route/navigation/search/deep link uses it, data is backfilled and reconciled, background jobs/webhooks no longer emit/read it, browser and negative access tests pass, telemetry shows compatibility traffic below the approved threshold, and recovery is documented.

Documentation cleanup remains governed by `audit/cleanup-manifest.md`: unique research, screenshots, QA, acceptance, release, and historical evidence are retained even when their conclusions are superseded.

## Application deletion inventory

This is an ordered removal contract, not authorization to delete application code immediately. Every row is **Conditional** on its replacement, compatibility, migration, generated-contract, and browser gates. Files not named here are retained unless a fresh call-site and uniqueness audit proves them redundant.

### 1. Retired Sprint compatibility surface

Cycles are already the canonical iteration identity and the Sprint module is a `GoneException` tombstone. Delete after route telemetry confirms no supported client calls `/sprints` and the compatibility window has expired.

| Kind | Delete or edit | Replacement / blocker |
|---|---|---|
| Backend file/interface | `backend/src/modules/build/execution/sprints.service.ts` and `SprintsService` | `CyclesService` and `/build/:projectId/cycles`; retain until old callers no longer require `410`. |
| API/controller | Sprint controller block in `backend/src/modules/build/execution/iterations.controller.ts`: all GET/POST/PATCH/DELETE `/build/:projectId/sprints/**` handlers | Remove handlers after compatibility window; keep Cycle/Workstream controllers in the file. |
| Module registration | `SprintsService` provider/import in `build-execution.module.ts` | Remove with controller block. |
| Zod/input | `createSprintSchema`, `updateSprintSchema`, `projectAndSprintIdParams`, `CreateSprintInput`, `UpdateSprintInput` in `execution/dto/iterations.schemas.ts` | Cycle schemas remain canonical. |
| Legacy setting/schema field | `settings.modules.sprints` in `db/schema/build/core.ts`, `project-core.schemas.ts`, `build-project-detail-response.schemas.ts`, provisioning defaults, frontend project schema compatibility transforms | Remove only after pre-retirement frontend bundles have aged out and stored JSON is backfilled. |
| Tests | Tombstone-specific Sprint tests such as `sprint-create-frozen.spec.ts`, Sprint sections of execution controller tests, cross-project/tombstone tests | Replace with one route-absence/compatibility-removal test and retain Cycle isolation tests. |
| Generated contract | Sprint operations/types in generated OpenAPI contracts, if still emitted | Regenerate after controller removal; never hand-edit generated output. |

Do not delete human display values such as “Sprint planning” or configurable Cycle naming; they are content, not a second storage identity.

### 2. Build-owned Timesheets duplicate surface

The repository has a full `backend/src/modules/timesheets/` owner and `backend/src/db/schema/timesheets/`. Build currently duplicates controller, policy, DTO, query, approval, billing, and derived-time behavior. Replace it with a small `TimesheetWorklogCommands` plus `ProjectTimeProjection` adapter, then delete:

| Kind | Delete or edit | Replacement / blocker |
|---|---|---|
| Backend files | `build/execution/timesheets.controller.ts`, `timesheets.service.ts`, `timesheets-scope.ts`, `timesheets-pagination.ts`, `dto/timesheets.schemas.ts`, `dto/timesheets-response.schemas.ts` | Timesheets module interfaces/adapters must enforce Build project reach and return the required projection. |
| APIs | `/build/time-entries/**`, `/build/billing-summary`, `/build/:projectId/tickets/:ticketId/time-entries` | Contextual Timesheets endpoints or an internal adapter; preserve a stable Build deep link/quick-log experience. |
| Frontend hook/schema | `frontend/hooks/api/build/time-entries.ts`, `time-entry-schema.ts`, `time-entries-contract.test.ts` | Timesheets-owned hook/interface. Ticket UI calls the adapter, not a Build ledger endpoint. |
| Component coupling | Direct `useLogTime` dependency in `features/build/ticket-details/ticket-time-tracker.tsx` | Inject/use the Timesheets command hook and projection. Keep the UI capability. |
| Query key | `buildWorkQueryKeys.projects.timeEntries` | Timesheets query-key factory keyed by org/project/ticket/actor. |
| Permissions | `build:timesheets:view/create/manage` plus Build role-template grants | Migrate to canonical Timesheets permissions with an explicit Build contextual policy; update generated permission contracts. |
| Interface/class | Build `TimesheetsService` and Build-local scope helpers | Retain only the owning-module ports/adapters defined in architecture. |
| Zod/contracts | Build time-entry request/response schemas and generated TicketTimeEntries operation contracts | Canonical Timesheets schemas; add a projection schema only if its shape differs intentionally. |
| Derived schema field | `build.tickets.time_spent` after every read uses a versioned Timesheets projection | Backfill/compare, remove recomputation, update Ticket response schemas/types/UI, then drop column in a later migration. |
| Tests | Build-local Timesheet service/controller/scope tests | Replace with port contract, Build reachability integration, Timesheets owner tests, and seeded cross-module flow. |

Never delete Timesheets tables, audits, approvals, rates, periods, exports, or payroll handoffs; they are the canonical owner.

### 3. Build customer-directory facade

`ProjectsCustomersService` directly reads Party/CRM mapping tables only to populate a Build picker. Replace it with `CustomerDirectoryRead` and delete after the adapter has parity for search, pagination, authorization, and deleted customers.

| Kind | Delete or edit | Replacement / blocker |
|---|---|---|
| Backend files | `core/customers/projects-customers.controller.ts`, `projects-customers.service.ts`, `core/dto/projects-customers.schemas.ts` and their focused service tests | CRM/Party `CustomerDirectoryRead` adapter. |
| API | `GET /build/customers` | Owning-module customer directory endpoint or internal read port. Existing `/build/customers` frontend redirect can remain only for compatibility, not data. |
| Registration/export | Controller/service providers in `core/projects.module.ts`; `listProjectCustomersSchema` export in `core/index.ts` | Remove after all callers use the port. |
| Query key | `buildWorkQueryKeys.projects.customers` | CRM/Party directory query key. |
| Permission | `build:customers:view` and role-template grant | Use customer-directory permission intersected with Build project ability; migrate saved roles before catalog removal. |
| Zod/response | `listProjectCustomersSchema`, `customerPageSchema` if unused elsewhere, and generated Build customer operation contract | Canonical directory input/page schema. |

Keep `projects.crm_client_id`, `client_membership_id`, and approved customer display snapshots until relationship migration proves their replacement; a facade deletion is not permission to drop historical foreign references.

### 4. Dedicated Bug facade over Tickets

Bugs are already canonical `tickets.type = "BUG"` plus `work_item_qa_details`; `BugsService` delegates creation/update/delete to Ticket services. Consolidate consumers into Ticket query/command interfaces with an optional QA sidecar, then delete the duplicate facade.

| Kind | Delete or edit | Replacement / blocker |
|---|---|---|
| Backend files/interfaces | `qa/bugs.controller.ts`, `qa/bugs.service.ts`, `qa/dto/bugs.schemas.ts`, facade-specific tests | Ticket collection/detail and Ticket command with QA sidecar fields; Test Run “create bug” still creates a BUG Ticket through the command. |
| APIs | GET/POST/PATCH/DELETE `/build/:projectId/bugs/**` | `/tickets` with `type=BUG` and QA filters, plus Ticket detail. Keep redirect/adapter until old clients migrate. |
| Frontend | `hooks/api/build/bugs.ts`, `types/projects/bugs.ts`, Bug-specific generated contracts | Ticket hooks/types with typed QA detail. Update board filters, QA evidence, and test-run flow. |
| Query key | `buildWorkQueryKeys.projects.bugs` | Ticket collection/detail keys with `type=BUG` and QA filter envelope. |
| Permissions | `build:bugs:view/create/update/delete` | Map/migrate to Ticket permissions plus QA field policy; do not silently widen existing grants. |
| Zod | `bugListQuerySchema`, `createBugSchema`, `updateBugSchema`; frontend `bugRowContract`/`bugListContract` adapters | Canonical Ticket input/filter schema plus `workItemQaDetails` schema. |
| Schema | `build.bug_work_item_map` only after the legacy-ID retention/backfill window and every legacy deep link/import is retired | Keep `build.work_item_qa_details`; it is the non-duplicate QA sidecar. |

Do not drop `work_item_qa_details`, Test Cases, Test Runs, or BUG Ticket type. `bug_work_item_map` may be a permanent identity map if customers/imports still reference legacy bug numbers.

### 5. Feedbucket navigation consolidation

Delete only duplicate Build navigation/pages after Intake renders the same records and explicit legacy-ID mapping works:

- `frontend/app/(authenticated)/build/[projectId]/feedbucket/page.tsx`
- `frontend/app/(authenticated)/build/[projectId]/feedbucket/[submissionId]/page.tsx`
- their route-specific loading files
- page wrappers in `frontend/features/build/feedbucket/` that become unused after reusable inbox/filter/widget components move under Intake
- Feedbucket route entries/nav destinations and generated path helpers after redirects are installed

Keep `frontend/feedbucket-widget/`, `frontend/hooks/api/feedbucket/`, native widget APIs, and `build.feedbucket_widgets`, `build.feedbucket_submissions`, and `build.feedbucket_attachments`. They own capture evidence; Intake is the processing view. Delete a Zod contract or component only when its call-site count reaches zero after the move.

### 6. Workstreams rename

Do not delete `build.modules`, `/modules`, `hooks/api/build/modules.ts`, module query keys, or create/update Zod schemas during the UI rename. Rename component/file symbols to Workstream only as files are touched; preserve route/API/storage compatibility. A later physical rename needs a separate measured migration and is not currently justified.

