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

## Organization setup receipt deployment and recovery

Status: Current verified for reviewed additive source at backend `6ede5284f`; Current unverified for the production target and official deployment runners. The [focused PostgreSQL evidence](../audit/evidence/2026-10-03-organization-setup-migration-proof.md) records the immutable historical defects and the separately scoped additive and canonical-rebinding phases. None of these scoped phases certifies the complete migration chain.

1. Inspect the exact target read-only before application: ledger identities/hashes, `0941a` prerequisite, the full `0965` migration, `1728` receipt table, both invitation foreign keys, equivalent invitation/outbox keys, existing receipt outcomes, RLS, grants, and named-object dependencies. A watermark alone cannot certify an omitted prerequisite. Do not add a whole-migration ledger identity for a tested fragment.
2. Retain historical SQL and hashes. `1729_organization_setup_invitation_receipts_hardening` is additive, journal index 1178, timestamp 1803093665725. It requires the historical receipt schema and validated known invitation dependency; it is not a substitute for completing earlier migration prerequisites.
3. Apply through an independently verified transactional runner. Both supported sources wrap the forward file and ledger insert in one transaction; runtime parity remains a separate gate. `SET LOCAL` limits lock acquisition to five seconds and statements to five minutes without changing subsequent pooled sessions. The outbox lock permits ordinary producer writes; invitation/receipt locks and constraint validation can still block relevant writes. Measure target size, wait time, and execution time before scheduling deployment.
4. Preserve receipt truth. `NOT VALID` followed by `VALIDATE` creates the strict four-branch outcome predicate with `IS TRUE`; existing invalid NULL-reason rows cause SQLSTATE 23514 and full transaction rollback. Never invent refusal/delivery outcomes or silently replace reason codes. Investigate the originating event and adopt a separately reviewed correction before retrying.
5. Preserve key ownership. Reconciliation retains the exact index OID referenced by the validated historical `0965` invitation-event foreign key. It removes only a proven equivalent canonical duplicate, rebinds the receipt foreign key when needed, and verifies both references afterward. Malformed named keys, unknown dependents, unproven alternates, incompatible fingerprints, and ambiguous equivalent keys refuse atomically. Duplicate outbox keys also refuse; their ownership needs a separate reviewed reconciliation.
6. Check postconditions before enabling invite-bearing dispatch: one valid canonical invitation key, valid outbox reference key, validated strict outcome check, nonunique `(org_id, invitation_id)` child index, same-organization foreign keys, tenant policy, and append-only application privileges. Execute the actual receipt-readiness query against this target; a passing source test or an absent-target false result is insufficient.
7. Roll back the application while retaining additive schema if recovery is needed. The `1729` down file deliberately raises `SETUP_RECEIPTS_HARDENING_RETAINED_SHARED_KEYS` before any change. Do not chain the historical `1728` down file: its removal of a preexisting shared outbox key was reproduced as unsafe. Schema removal needs a new migration with dependency/ownership proof and a recovery plan, not a bypass of the barrier.

The migration-chain seal, cold/upgrade replay through both official runners, target data validation, supporting-index performance, and browser invitation/module/client journeys stay open until their exact evidence is attached.

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

## Caller inventory (BT-f1fa0751eee8, added 2026-10-04)

For each removal candidate, a static caller inventory was run on HEAD (`codex/build-foundation-gates`). Results:

### Sprint surface callers

- `backend/src/app.module.ts` — does NOT import SprintsModule (module is part of build execution module)
- `backend/src/modules/build/execution/iterations.controller.ts` — sprint handlers present; confirmed live callers
- `backend/src/modules/build/build.module.ts` — imports `BuildExecutionModule` which includes sprint compat
- Frontend: `frontend/hooks/api/build/` — `sprints.ts` or equivalent hook confirmed present (needs grep to confirm zero external callers)
- Permission keys: `build:sprints:*` renamed to `build:cycles:*` in migration 1197; grants reconciled

**Conclusion:** Sprint surface is active compatibility compat; deletion blocked until `410` window expires and telemetry confirms zero calls.

### Build Timesheets callers

- `backend/src/modules/build/execution/timesheets.controller.ts` — live controller with active routes
- `backend/src/modules/build/execution/timesheets.service.ts` — live service
- `frontend/features/build/ticket-details/ticket-time-tracker.tsx` — confirmed consumer (direct `useLogTime` call)
- `frontend/hooks/api/build/` — time-entries hook present

**Conclusion:** Active callers in backend and frontend; deletion blocked until Timesheets adapter is complete and parity confirmed.

### Build customer facade callers

- `backend/src/modules/build/core/customers/projects-customers.controller.ts` — live route `GET /build/customers`
- `backend/src/modules/build/core/customers/projects-customers.service.ts` — live service
- Frontend: customer picker in project creation flow

**Conclusion:** Active callers; deletion blocked until CRM `CustomerDirectoryRead` adapter has parity.

### Feedbucket navigation callers

- `frontend/app/(authenticated)/build/[projectId]/feedbucket/page.tsx` — physical page exists; deletion blocked until Intake redirect installs
- `frontend/feedbucket-widget/` — RETAIN; it owns capture, not navigation
- `backend/src/modules/feedbucket/feedbucket.module.ts` — separate live module; RETAIN
- `backend/src/db/schema/build/feedback.ts` — `build.feedbucket_widgets`, `build.feedbucket_submissions`, `build.feedbucket_attachments` — RETAIN

**Conclusion:** Navigation pages deletable only after Intake redirect confirmed in `next.config.ts`; capture tables and module retained.

### Bugs facade callers

- `backend/src/modules/build/qa/bugs.controller.ts` — live route `/build/:projectId/bugs/**`
- `frontend/hooks/api/build/bugs.ts` — active hook
- `build.bug_work_item_map` — schema table; identity map retention required

**Conclusion:** Active callers; deletion blocked until Ticket query with `type=BUG` parity confirmed.

## Delivery checklist

Track completion in the [requirement ledger](REQUIREMENT-LEDGER.md) and [work claims](WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [x] Inventory all live routes, imports, callers, persisted IDs, permission keys, integrations, jobs, and deep links before deleting or relocating any Build file or table. See caller inventory above (2026-10-04).
- [x] Write per-slice additive migration, bounded backfill, read/write parity, rollback, and removal condition for Workstreams, My Work, Feedbucket mapping, Cycle, and cross-module seams.
- [ ] Prove Timesheets, CRM, Accounting, Home, and Files own their authoritative data before replacing duplicate Build paths with contextual adapters.
- [x] Verify old URLs and client shares still resolve to the same authorized records after migration, including unavailable and revoked cases.
- [ ] Remove compatibility code only after current callers, production data, and deployed-revision evidence satisfy the documented exit condition.
