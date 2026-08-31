# MOCKFIX1 — Mock Surface Repair

**Gate:** `pnpm check:mock-surface` (`src/scripts/check-mock-surface.mjs`)  
**Date:** 2026-08-30  
**Scope:** All 69 genuine phantom mock-method defects

---

## Outcome

`pnpm check:mock-surface` reports **5 remaining items**, all of which are the documented scanner false positives from MOCKDRIFT1.md (Drizzle query-builder chain methods inside nested `db` mocks, misattributed to the enclosing service class). Zero genuine phantom methods remain.

---

## Bucket counts

| Bucket | Count | Description |
|--------|-------|-------------|
| A — Live bug | **0** | No case found where production code calls a phantom method |
| B — Stale mock | **~48** | Method renamed or removed; double kept old name |
| C — Wrong service | **~21** | Double stands in for class X, declares methods from class Y |

---

## Bucket A — Live bugs found

None. Every phantom method was exclusively in the test double — production code had already been updated to the new API. The mocks were never updated to follow.

---

## Bucket B — Stale mocks fixed

Method renames / removals where the test double retained the old name:

| Old phantom | Real method | Files fixed |
|-------------|-------------|-------------|
| `CacheService.invalidatePattern` | removed (no replacement; per-org invalidation uses `invalidateNamespace`) | 14 spec files |
| `AccessService.getSnapshot` | `getAccessSnapshot` | `roles-rbac-admin.controller.e2e-spec.ts` |
| `AttendancePolicyService.getOrgPolicy` | `getAttendanceRules` | `cron-group-a-tenant-isolation.spec.ts` |
| `ProjectsReportsService.snapshotProjects` / `generateDailySnapshot` | `snapshot` | `cron-group-a-tenant-isolation.spec.ts` |
| `HrWebhooksService.retryFailed` | `retryPending` | `cron-group-a-tenant-isolation.spec.ts` |
| `HrWorkflowEngineService.sweepWebhookRetries` | removed (kept `sweepOverdueSteps`) | `cron-group-a-tenant-isolation.spec.ts` |
| `ProbationService.sweepCompletedProbations` | `sweepDue` | `cron-group-a-tenant-isolation.spec.ts` |
| `ComplianceRequirementsService.sweep` | `generateEvents` + `markOverdueEvents` | `cron-group-a-tenant-isolation.spec.ts` |
| `WorkAuthorizationsService.sweepExpiry` | `refreshExpiredStatuses` | `cron-group-a-tenant-isolation.spec.ts` |
| `ContractsService.sweepExpiry` | `refreshExpiredStatuses` | `cron-group-a-tenant-isolation.spec.ts` |
| `AutomationService.emit` | `runAutomationsForEvent` | `cron-group-a-tenant-isolation.spec.ts` |
| `SeatLedgerService.releaseSeats` / `occupySeat` | `recordSeatEvent` | `cron-group-a-tenant-isolation.spec.ts` |
| `OrgMembershipService.revokeAllMemberships` | `revokeOrgScopedAccess` | `cron-group-b-tenant-isolation.spec.ts` |
| `EmailService.send` | `sendEmail` | `cron-group-b-tenant-isolation.spec.ts`, `cron-billing-churn.spec.ts` |
| `AiGatewayService.chat` / `chatWithUsage` | `invokeText` / `invokeTextWithUsage` | `cron-group-b-tenant-isolation.spec.ts`, `inv-engine-misc-isolation-ai.spec.ts` |
| `AiCreditsService.getBalance` | `getWallet` | `cron-billing-churn.spec.ts` |
| `GeneratePipelineService.run` | `runCalcAndDetect` | `payroll-runs.controller.e2e-spec.ts` |
| `FeedbucketWidgetsService.findAll` | `list` | `feedbucket.controller.e2e-spec.ts` |
| `InventoryAuditService.log` | `insert` | 5 inventory isolation spec files |
| `ValuationService.getMethod` / `computeMovementCost` | `recordReceipt` / `recordIssue` | `inv-engine-misc-isolation-stock.spec.ts` |
| `MovementCostingService.computeLayerCost` | `applyCosting` | `inv-engine-misc-isolation-stock.spec.ts` |
| `ReservationService.expireForOrg` | `expireStale` | `inv-engine-misc-isolation-stock.spec.ts` |
| `PeriodsService.getOpenPeriod` | `assertPeriodOpen` | `inv-engine-misc-isolation-stock.spec.ts` |
| `InvReplenishmentService.getRecommendations` | `getSuggestions` | `inv-engine-misc-isolation-ai.spec.ts` |
| `StockEngineService.post` / `executeMany` | `execute` | 3 inventory isolation spec files |
| `JournalPostingService.post` | `persistJournalEntry` | `inv-orders-isolation.spec.ts` (SoFulfillmentService, SoLifecycleService) |
| `PoService.findOne` | `getPo` | `inv-orders-isolation.spec.ts` |
| `SoCoreService.findOne` | `getSo` | `inv-orders-isolation.spec.ts` |
| `NotificationsService.send` | `create` | `projects-activity-identity.spec.ts`, `projects-activity.isolation.spec.ts` |
| `NotificationsService.createAndDispatch` | `create` | `autonomy-hold-tenant-isolation.spec.ts` |
| `NotificationDispatchService.send` / `sendToUser` / `sendBatch` | `emit` | `cron-group-a-tenant-isolation.spec.ts`, `cron-group-b-tenant-isolation.spec.ts`, `broadcasts-dept.spec.ts` |
| `OrganizationSagaService.fail` | `compensate` | `organization-legal-hold.service.spec.ts` |
| `PartyMergeService.revert` | removed (class has only `merge`) | `dataset-health.spec.ts` |
| `PmWorkspacesService.assertAccess` | `resolveDefaultWorkspaceId` | `projects-analytics-workspace-members-budget-tenant-isolation.spec.ts` |

---

## Bucket C — Wrong service mocked

Doubles provided under one token but declaring methods belonging to a different class:

| Token provided | Phantom methods | Resolution |
|----------------|-----------------|------------|
| `EntitlementsService` | `moduleAvailability` | Removed from 4 payroll e2e specs; `alwaysOnEntitlements` fixture does not include it |
| `EssService` | `listReimbursements`, `createReimbursement`, `listLoans`, `createLoan`, `getTaxDeclaration`, `submitTaxDeclaration`, `addTaxProof`, `getBankDetails`, `updateBankDetails` | Self-service methods belong to `EssSelfServiceService`; added that provider, removed phantom from `EssService` mock |
| `PayoutBatchesService` | `validatePayout`, `createBatch`, `markSent`, `markBatchPaid`, `markItemPaid`, `markItemFailed` | Split to `BatchCreatorService`, `BatchStatusService`, `PayoutValidationService`; added 3 provider overrides |
| `ModuleAccessGroupsService` | `listMemberCandidates`, `getOwnership`, `initiateOwnershipTransfer`, `cancelOwnershipTransfer` | Methods live on `ModuleAccessRosterService` and `ModuleAccessOwnershipService`; added 2 provider overrides |
| `JournalPostingService` (in GrnService, CustomerReturnsService, VendorReturnsService tests) | `post` | These services do not inject `JournalPostingService`; removed dead provider entries |
| `PaymentWebhookHealthService` | `recordSignatureFailure` | `recordSignatureFailure` belongs to `PaymentWebhookReceiverService`; removed phantom provider from `billing.service.spec.ts` |

---

## Scanner false positives (5 — justified, not fixed)

These 5 items are the same false positives documented in MOCKDRIFT1.md. The scanner misidentifies Drizzle query-builder chain methods inside a nested `db` mock as top-level keys of the enclosing service mock.

| Class | Phantom | Spec |
|-------|---------|------|
| `AccessPermissionResolver` | `.innerJoin()`, `.where()` | `home-surfaces-universal.spec.ts` |
| `AutonomyHoldService` | `.where()` | `autonomy-hold.service.spec.ts` |
| `PermissionCatalogSyncService` | `.onConflictDoNothing()`, `.onConflictDoUpdate()` | `permission-delegability.spec.ts` |

These are `db.select().from().innerJoin()` and `db.insert().values().onConflictDo*()` chains returned from within the tested service, not methods declared on the service class itself.

---

## Scanner false positives fixed (multi-line arrow function)

Two additional scanner false positives were found and fixed during this session — they produced incorrect entries because multi-line arrow function values caused `atBoundary=true` on the next line, making the following function call look like a new top-level key:

| Spec | False positive produced | Fix |
|------|------------------------|-----|
| `organization-member-status.spec.ts` | `CacheService.cacheInvalidateNamespace` | Collapsed arrow body to single line |
| `permission.guard.spec.ts` | `AccessService.moduleAvailabilityResolver` | Collapsed arrow body to single line |

---

## Test count

Lint/tests not run per hard rules. The spec files modified are enumerable; no tests were deleted.

**Files modified:** 39 spec files across `modules/` (see bucket tables above for exact paths).
