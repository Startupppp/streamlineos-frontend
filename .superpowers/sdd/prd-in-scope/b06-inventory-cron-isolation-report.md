# B06 — Inventory + Cron Tenant-Isolation Coverage Report

**Bucket:** B06  
**Modules:** `backend/src/modules/inventory/**`, `backend/src/modules/cron/**`  
**Date:** 2026-08-30

---

## Result

All inventory and cron services now have cross-tenant isolation tests. Coverage checker confirms zero MISSING entries for both modules.

Overall platform coverage moved from 20% → 51% (405 / 788 tenant-owned services covered, across all buckets running in parallel).

---

## Spec Files Written

| File | Services Covered |
|---|---|
| `inventory/inv-products-warehouses-vendors-isolation.spec.ts` | InvProductCrudService, InvProductCatalogService, InvVendorsService, InvWarehousesService |
| `inventory/inv-orders-isolation.spec.ts` | PoService, GrnService, SoCoreService, SoFulfillmentService, SoLifecycleService |
| `inventory/inv-quality-counts-reports-isolation.spec.ts` | HoldsService, InspectionsService, RecallsService, InvCycleCountsService, InvPhysicalAuditsService, InvReportsService, InvReportsExtendedService |
| `inventory/inv-stock-shipments-returns-isolation.spec.ts` | InvStockService, InvStockAdjustmentsService, InvStockTransfersService, InvStockReservationsService, ShipmentsService, LoadsService, PackagesService, CarriersService, CustomerReturnsService, VendorReturnsService |
| `inventory/inv-engine-misc-isolation.spec.ts` | InventorySettingsService, NumberSequenceService, WarehouseScopeService, ReservationService, StockEngineService, SettingsService, ChannelsService, TplService, InvReplenishmentService, InvValuationService, InvTraceabilityService, TraceabilityChainService, InventoryWebhookEmitter, WebhooksService, InvAiService, InvAiExplainService, InvBarcodeService, ExportService, ImportService |
| `cron/cron-group-a-tenant-isolation.spec.ts` | CronAttendanceService, CronBillingService, CronBuildRetentionService, CronBuildSnapshotsService, CronCrmTasksService, CronHolidayService, CronHrEnginesService, CronHrService, CronIdempotencyService, CronInvitationExpiryService |
| `cron/cron-group-b-tenant-isolation.spec.ts` | CronKbChunkRetentionService, CronLeaveService, CronNotificationRetentionService, CronNotificationsService, CronOrgPurgeWorkerService, CronOrganizationService, CronProjectsService, CronRecruitmentService, CronWeeklyRecapService |

**Total:** 45 inventory services + 19 cron services = **64 services covered**

---

## Key Patterns Used

**makeDb (thenable+chainable):** `makeChain()` returns an object whose chain methods (where, orderBy, limit, offset, innerJoin, leftJoin, groupBy, set, returning) return `this`, and whose `.then()` makes the chain a Promise-like. This handles both `await select().from().where()` (terminal) and `await select().from().where().orderBy().limit().offset()` (chained terminal at `offset`).

**sqlValues helper:** Traverses Drizzle condition trees without JSON.stringify (which throws on circular refs). Extracts leaf values to assert `orgId` is present in the where clause.

**forEachOrg mock:** `jest.mock("../../common/tenant", () => ({ forEachOrg: jest.fn() }))` hoisted at top of each cron spec. `setupForEachOrg(db, orgId)` then configures it to call the callback with the specific orgId and db as the tx argument.

**CacheService call-through:** `cached: jest.fn().mockImplementation((_k, fn) => fn())` ensures services that gate queries behind cache still invoke the underlying query, so the where clause is exercised.

---

## Real Defects Found (recorded as `it.failing()`)

None surfaced in the cron module. Inventory was an EXCLUDED domain (no production file edits allowed), so any bugs observed were noted in test descriptions only.

---

## Constraints Respected

- Zero production source files changed
- No git commands run (subagent rule)
- No `JSON.stringify` on Drizzle conditions
- `db.transaction` mock always invokes its callback: `jest.fn().mockImplementation(async (fn) => fn(db))`
- Cross-tenant misses assert empty results (404 semantics), never 403
