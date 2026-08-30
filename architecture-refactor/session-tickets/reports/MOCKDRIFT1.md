# MOCKDRIFT1 — Mock Surface Drift Detection

**Date:** 2026-08-30
**Lane:** MOCKDRIFT1

---

## Deliverable

`backend/src/scripts/check-mock-surface.mjs` — wired as two package scripts:

```
"check:mock-surface": "node src/scripts/check-mock-surface.mjs",
"check:mock-surface:self-test": "node src/scripts/check-mock-surface.mjs --self-test",
```

Self-test passes (`--self-test` flag exercises the same detection code paths, not a parallel implementation). Vacuity guards: exits 2 if fewer than 50 spec files found OR zero classes resolved.

---

## Motivation

`GET /build/:projectId` → 500 in production: `TypeError: this.cache.cachedForOrgWith is not a function`.

The method was mocked in 5 spec files before being implemented on `CacheService`. The test suite stayed green because the test doubles had the method while the real class did not. This is the class of bug the scanner catches.

---

## Scan results (2026-08-30)

| Metric | Value |
|---|---|
| Spec files walked | 1 436 |
| Mock doubles scanned | 2 464 |
| Classes resolved | 226 |
| Phantom defects found | **74** |

---

## Detection methods

The scanner detects four patterns:

| Pattern | Example |
|---|---|
| A — named var cast | `const x = { … }; x as unknown as ClassName` |
| B — inline cast | `{ … } as unknown as ClassName` |
| C — typed return | `function make(): ClassName { return { … } }` |
| D — useValue: literal | `{ provide: X, useValue: { … } }` |

It skips `useValue: obj.property` and `useValue: fn()` — types are unresolvable at static analysis. Class disambiguation uses import-path resolution to avoid false positives when two modules export a class with the same name (e.g. `ApprovalsService` in `build/approvals/` and `payroll/payout/`).

---

## Scanner limitations (false positives in current output)

The following 5 findings are scanner artefacts, not bugs. The mock objects contain Drizzle query-builder chain methods returned by the service under test — they are not top-level service methods.

| Class | Phantom | Reason |
|---|---|---|
| `AccessPermissionResolver` | `.innerJoin()`, `.where()` | Drizzle chain on resolver return value |
| `AutonomyHoldService` | `.where()` | Drizzle chain on service return value |
| `PermissionCatalogSyncService` | `.onConflictDoNothing()`, `.onConflictDoUpdate()` | Drizzle upsert chain in `permission-delegability.spec.ts` |

Effective genuine defects after removing false positives: **69**.

---

## Finding classification

### Class 1 — Renamed method (real class has a different name)

Test mocks the old name; production code calls the real name. The mock passes vacuously for any assertion about what the method returns.

| Class | Mock method | Real method |
|---|---|---|
| `AccessService` | `.getSnapshot()` | `.getAccessSnapshot()` |
| `AccessService` | `.moduleAvailabilityResolver()` | `.buildModuleAvailabilityResolver()` |
| `AiCreditsService` | `.getBalance()` | `.getWallet()` |
| `AiGatewayService` | `.chat()` | `.invokeText()` |
| `AiGatewayService` | `.chatWithUsage()` | `.invokeTextWithUsage()` |
| `CacheService` | `.invalidatePattern()` | `.invalidateNamespace()` — 10 spec files |
| `CacheService` | `.cacheInvalidateNamespace()` | `.invalidateNamespace()` |
| `EntitlementsService` | `.moduleAvailability()` | method lives on `AccessService` |
| `NotificationDispatchService` | `.send()` | `.emit()` |
| `NotificationDispatchService` | `.sendToUser()` | `.emit()` |
| `NotificationDispatchService` | `.sendBatch()` | `.emit()` |
| `NotificationsService` | `.send()` | `.create()` or `.announce()` |
| `NotificationsService` | `.createAndDispatch()` | `.create()` + `.announce()` |

### Class 2 — Wrong service mocked

The e2e spec mocks `ServiceA` with methods that the controller actually calls on injected `ServiceB`. The mock token is wrong, so the injection resolves to an object that the controller does not use for those operations.

| Spec | Mocked token | Phantom methods | Actual service holding those methods |
|---|---|---|---|
| `module-access.controller.e2e-spec.ts` | `ModuleAccessGroupsService` | `cancelOwnershipTransfer`, `getOwnership`, `initiateOwnershipTransfer`, `listMemberCandidates` | `ModuleOwnershipService`, `ModuleMemberRosterService` |
| `payroll-payout.controller.e2e-spec.ts` | `PayoutBatchesService` | `createBatch`, `markBatchPaid`, `markItemFailed`, `markItemPaid`, `markSent`, `validatePayout` | `BatchCreatorService`, `BatchStatusService`, `PayoutValidationService` |
| `payroll-insights.controller.e2e-spec.ts` | `EssService` | `addTaxProof`, `createLoan`, `createReimbursement`, `getBankDetails`, `getTaxDeclaration`, `listLoans`, `listReimbursements`, `submitTaxDeclaration`, `updateBankDetails` | multiple payroll insight services |
| `payroll-runs.controller.e2e-spec.ts` | `GeneratePipelineService` | `.run()` | actual pipeline runner |
| `feedbucket.controller.e2e-spec.ts` | `FeedbucketWidgetsService` | `.findAll()` | real service uses a different list method |

### Class 3 — Fabricated API (method never existed on the real class)

Cron isolation specs mock service dependencies with invented method names. Inventory isolation specs mock internal engine services the same way. Production code never calls these names; they are stale test doubles from an earlier API design.

**CacheService:**
- `.invalidatePattern()` — 10 spec files; real API is `.invalidateNamespace()`

**StockEngineService:**
- `.post()` — 4 spec files; real API is `.execute()` / `.executeInTx()`
- `.executeMany()` — 1 spec file; real has `.execute()` (single-command)

**JournalPostingService:**
- `.post()` — 2 spec files; real entry point has a different name

**InventoryAuditService:**
- `.log()` — 5 spec files; real class has no public `.log()` method

**MovementCostingService:**
- `.computeLayerCost()` — 1 spec file

**ValuationService:**
- `.computeMovementCost()`, `.getMethod()` — 1 spec file each

**ReservationService:**
- `.expireForOrg()` — 1 spec file

**PeriodsService:**
- `.getOpenPeriod()` — 1 spec file (accounting `PeriodsService`)

**InvReplenishmentService:**
- `.getRecommendations()` — 1 spec file

**PoService / SoCoreService:**
- `.findOne()` — 1 spec file each; real services use `.get()` or `.getById()`-style names

**PmWorkspacesService:**
- `.assertAccess()` — 1 spec file

**EmailService:**
- `.send()`, `.sendInvitationEmail()`, `.sendInvitationRevokedEmail()`, `.sendMembershipRemovedEmail()`, `.sendMembershipSuspendedEmail()`, `.sendTemplate()` — multiple spec files; real class (`EmailService`) has `queueAttendanceReportEmail`, `sendMonthlyExpenseReportEmail`, etc.

**OrgMembershipService:**
- `.revokeAllMemberships()` — 1 spec file

**OrganizationSagaService:**
- `.fail()` — 1 spec file

**PartyMergeService:**
- `.revert()` — 1 spec file

**PaymentWebhookHealthService:**
- `.recordSignatureFailure()` — 1 spec file

**SeatLedgerService:**
- `.occupySeat()`, `.releaseSeats()` — 1 spec file each

**ProjectsReportsService:**
- `.generateDailySnapshot()`, `.snapshotProjects()` — 1 spec file each

**Cron sweep methods (cron isolation specs mock dependencies with invented names):**

| Class | Phantom mock method |
|---|---|
| `AttendancePolicyService` | `.getOrgPolicy()` |
| `AutomationService` | `.emit()` |
| `ComplianceRequirementsService` | `.sweep()` |
| `ContractsService` | `.sweepExpiry()` |
| `HrWebhooksService` | `.retryFailed()` |
| `HrWorkflowEngineService` | `.sweepWebhookRetries()` |
| `ProbationService` | `.sweepCompletedProbations()` |
| `WorkAuthorizationsService` | `.sweepExpiry()` |

---

## Summary by class

| Class | Count | Note |
|---|---|---|
| Scanner false positive (Drizzle chain) | 5 | Not bugs |
| Renamed method | 13 | Mock calls old name; production calls new name |
| Wrong service mocked | ~24 | Token mocked, but controller injects a different service |
| Fabricated API (never existed) | ~37 | Test doubles invent a name the real class never had |

---

## Highest-severity individual findings

1. **`CacheService.invalidatePattern()`** — 10 spec files. Real API is `.invalidateNamespace()`. Any test that asserts cache invalidation behaviour and calls `cache.invalidatePattern` is asserting against a void stub.

2. **`AiGatewayService.chat()` / `.chatWithUsage()`** — Old method names. Production cron service calls `.invokeText()`. Specs asserting AI gateway behaviour test the wrong surface.

3. **`EmailService.*`** — 6 phantom names across invitation and membership specs. Real class has entirely different method signatures. These specs assert email delivery against mocked names that never existed.

4. **`AccessService.getSnapshot()`** — Roles e2e spec mocks this; controller calls `.getAccessSnapshot()`. The mock stub is unused during the test run.

5. **`PayoutBatchesService.*`** — 6 methods mocked against the wrong service token. The controller injects `BatchStatusService`, `BatchCreatorService`, and `PayoutValidationService` for these operations.

---

## Script self-test coverage

`node src/scripts/check-mock-surface.mjs --self-test` exercises:

- `extractTopLevelKeys`: basic keys, nested exclusion (depth > 0), single-line objects
- `extractClassPublicMethods`: recognises async/sync/getter methods, skips private/protected
- Full pipeline phantom detection (plants `phantomMethod`, verifies flagged)
- `useValue` inline object pattern
- Vacuity guard: empty spec list triggers exit 2

All self-test assertions pass. Exit 0.
