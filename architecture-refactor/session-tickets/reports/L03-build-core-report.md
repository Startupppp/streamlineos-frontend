# L03 Build Core — Session Report

Lane: L03 | Ticket: S04-build-workflows.md | Date: 2026-08-30

## Items

### Item 1 — Guard audit (DONE)

Scanned all 43 controllers under `backend/src/modules/build/**` for handlers that carry `@RequirePermission` without a class-level or method-level `@UseGuards(JwtAuthGuard, PermissionGuard)`. Zero violations found. Every controller in the build tree declares the guard pair at the class level.

### Item 3 — Bounded indexed lists (OPEN)

Multiple offset-based `LIMIT`/`OFFSET` lists exist in the build tree that serve unbounded, growing datasets:
- `roadmap.service.ts` — `listRoadmapItems`
- `managed-products.service.ts` — `listProducts`
- `pm-workspaces.service.ts` — `listWorkspaces`
- `portfolios.service.ts` — `listPortfolios`
- `timesheets` consumers inside build
- `customers.service.ts` — `listCustomers`

All are behind `@AuthorizedInService` or owned by other lanes. Cursor migration of these growing lists is OPEN and requires a separate lane pass (the utility `buildCursorPage`/`decodeCursor` already exists in `common/pagination`).

### Item 4 — Query cost: OR + semi-join (OPEN)

`projects-tickets-read.service.ts:listTickets` builds a `scopeClause` that can produce:

```sql
tickets.assignee_id = $me OR EXISTS (SELECT 1 FROM ticket_participants WHERE ...)
```

This pattern defeats both the `assignee_id` index and the `ticket_participants` index — the planner scans the full org partition. The correct fix is a `UNION` of two independently indexed branches with `count(*) OVER ()`. Measurement via `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` with the tenant GUC is required before choosing UNION vs. EXISTS (the crossover is one-project). This is OPEN; the code path is identified at `projects-tickets-read.service.ts:~180-220` (`scopeClause` assembly).

### Item 5 — File split (DONE)

`projects-tickets-read.service.ts` was 568 lines (over 500-line hard cap). Split:
- Extracted `getTicketByKey` and `getTicket` into new `projects-tickets-detail.service.ts` (164 lines).
- Read service is now 429 lines.
- `ProjectsTicketsDetailService` registered in `projects.module.ts` and injected into `projects-tickets.service.ts`.
- `ticket-by-key.spec.ts` updated to instantiate `ProjectsTicketsDetailService` instead of `ProjectsTicketsReadService`.

`build-entity.adapter.ts` (598 lines) is OUT-OF-OWNERSHIP — it is the canonical adapter for the `entity-reference` module which lives outside `build/**`. Not split by this lane; reported for the owning lane.

### Item 6 — Tenant safety + invalidation (VERIFIED)

Spot-checked key mutating services:
- `ProjectsReleasesService.updateRelease` and `addTicketToRelease` both re-assert `orgId` before write.
- `ProjectsLabelsService.updateLabel` and `deleteLabel` both filter on `orgId`.
- `ProjectsTicketChecklistsService.deleteChecklist` filters on both `orgId` and `ticketId`.
- `ProjectsCustomStatesService.updateCustomState` selects by `(orgId, id)` with limit 1 before mutating.
- Cache invalidation via `bumpPermissionsVersion` and `invalidateNamespace` confirmed present for RBAC-touching mutations.

Cross-tenant probes return `NotFoundException` (404) in all exercised paths — no 403 information leak.

### Item 7 — Workflow specifics (PARTIAL)

`workflow-enforcement.spec.ts` exists and passes. Workflow permission mapping is correct — `build:tickets:workflow:manage` gates workflow transition admin. Builder split is tracked as part of the ongoing automation builder refactor (committed earlier in this branch). No additional action taken by this lane.

### Item 8 — Isolation coverage (DONE — 6 new files)

Added the following isolation spec files:

| File | Services covered |
|---|---|
| `build/core/build-core-isolation.spec.ts` | `ProjectsReleasesService`, `ProjectsLabelsService`, `ProjectsCustomFieldsService`, `ProjectsTicketChecklistsService`, `ProjectsCustomStatesService` |
| `build/core/build-due-sweep.isolation.spec.ts` | `BuildDueSweepService` — verifies `forEachOrg` yields zero dispatch on no-rows |
| `build/core/projects-activity.isolation.spec.ts` | `ProjectsActivityService` — verifies `orgId` is caller-scoped on insert |
| `build/core/build-release-published-consumer.service.spec.ts` | Appended tenant isolation describe block to existing spec |
| `build/client-portal/change-requests.isolation.spec.ts` | `ChangeRequestsService` — cross-org `getChangeRequest` and `listChangeRequests` |
| `build/client-portal/client-visibility.isolation.spec.ts` | `ClientVisibilityService` — cross-org `getVisibilitySummary` and `toggleTicketVisibility` |
| `build/comment-drafts/comment-drafts.isolation.spec.ts` | `CommentDraftsService` — upsert, deleteOne, listMine |

All 127 tests in the build `core|client-portal|comment-drafts` pattern pass.

### Item 9 — Outbox orphaned consumers (OPEN)

Three build events are emitted via `OutboxWriter.emit` with no registered consumer:
- `build.project.created` — emitted in `projects.service.ts`
- `build.ticket.created` — emitted in `projects-tickets.service.ts`
- `build.ticket.status_changed` — emitted in `projects-tickets.service.ts`

These sit in the outbox relay queue indefinitely, accumulating dead-letter rows. Fix: either add a consumer for each (notification dispatch pattern as in `build-release-published-consumer.service.ts`) or remove the emissions if no subscriber is planned. OPEN — requires product decision on which notifications are desired.

## Validation

- `node ./node_modules/jest/bin/jest.js --testPathPattern="build/(core|client-portal|comment-drafts)" --maxWorkers=2`: 127 passed, 0 failed
- `tsc --noEmit`: not run (heap constraint — `NODE_OPTIONS=--max-old-space-size=8192` required; deferred to orchestrator end-of-session gate)
- `pnpm check:route-classification`: not run (deferred to orchestrator)
- `pnpm check:tenant-indexes`: not run (deferred to orchestrator)
- `pnpm check:tenant-isolation`: not run (deferred to orchestrator)

## Files changed

**New**
- `backend/src/modules/build/core/projects-tickets-detail.service.ts` (164 lines)
- `backend/src/modules/build/core/build-core-isolation.spec.ts` (161 lines)
- `backend/src/modules/build/core/build-due-sweep.isolation.spec.ts` (41 lines)
- `backend/src/modules/build/core/projects-activity.isolation.spec.ts` (69 lines)
- `backend/src/modules/build/client-portal/change-requests.isolation.spec.ts`
- `backend/src/modules/build/client-portal/client-visibility.isolation.spec.ts`
- `backend/src/modules/build/comment-drafts/comment-drafts.isolation.spec.ts`

**Modified**
- `backend/src/modules/build/core/projects-tickets-read.service.ts` — removed `getTicketByKey`, `getTicket`, `AuditService` dep; now 429 lines
- `backend/src/modules/build/core/projects-tickets.service.ts` — delegates `getTicketByKey`/`getTicket` to `ProjectsTicketsDetailService`
- `backend/src/modules/build/core/projects.module.ts` — added `ProjectsTicketsDetailService` provider
- `backend/src/modules/build/core/ticket-by-key.spec.ts` — updated to use `ProjectsTicketsDetailService`
- `backend/src/modules/build/core/build-release-published-consumer.service.spec.ts` — appended tenant isolation describe block
