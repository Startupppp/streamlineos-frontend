# StreamlineOS Product Bible

# Inventory Management Module

# 20_Testing_QA_And_Production_Readiness.md

## Test Strategy

Test:

- Services.
- API endpoints.
- RBAC/data scope.
- Stock ledger math.
- UI flows.
- Reports.
- Import/export.
- Concurrency.

## Unit Tests

Cover:

- UOM conversion.
- Stock balance updates.
- Ledger transaction creation.
- Reservation math.
- ATP calculation.
- Reorder calculation.
- Valuation layers.
- Lot/serial validation.
- Expiry policy.
- Quality hold/disposition.
- Package content reconciliation.
- Channel stock publication.

## API Tests

Cover:

- Unauthorized returns 401.
- Missing permission returns 403.
- Module disabled returns 403.
- Cross-tenant access blocked.
- Warehouse scope applied.
- Invalid payload returns 400.
- Idempotency prevents duplicates.
- Pagination works.
- Quality-held stock cannot reserve.
- Package shipment mismatch is blocked.
- Channel publication respects available stock.

## Concurrency Tests

Cover:

- Two users reserve same stock.
- Double PO receive.
- Double SO ship.
- Adjustment during reservation.
- Transfer completion race.

## UI QA

Screens:

- Dashboard.
- Products.
- Product detail.
- Categories.
- UOM.
- Stock.
- Movements.
- Adjustments.
- Transfers.
- Warehouses.
- Vendors.
- POs.
- SOs.
- Reports.
- Import.
- Barcode.
- Settings.
- Quality.
- Packages.
- Shipments.
- Channels.
- 3PL.

Viewports:

- 375px.
- 768px.
- 1280px.

States:

- Loading.
- Empty.
- Error.
- Permission denied.
- Module disabled.
- Offline warning.

## Critical Flows

1. Create product and variant.
2. Create warehouse and bin.
3. Import opening stock.
4. Create PO.
5. Receive partial PO.
6. Receive lot/serial product.
7. Create SO.
8. Reserve stock.
9. Pick/pack/ship partial SO.
10. Process customer return.
11. Transfer stock between warehouses.
12. Post adjustment.
13. Run cycle count.
14. Generate reorder report.
15. Export movement ledger.
16. Verify RBAC warehouse scope.
17. Put receipt into quality hold and release it.
18. Fail inspection and scrap stock.
19. Package and ship an order.
20. Publish stock to a channel with safety buffer.
21. Run failed 3PL sync and retry.
22. Change critical settings and verify audit.

## Production Readiness Checklist

- All stock-changing operations are ledger-backed.
- All stock-changing operations are idempotent.
- All list endpoints paginate.
- All protected endpoints are permission-checked.
- Module guard on every controller.
- Audit logs exist.
- Quality/status/recall logs exist.
- Package/shipment/channel sync logs exist.
- Reports are indexed.
- Error states are user-friendly.
- Lint passes.
- Typecheck passes.
- Build passes.
- Tests pass or skipped tests are documented.

## Acceptance Criteria

- No silent stock drift.
- No oversell under concurrency.
- No cross-tenant leakage.
- No cross-warehouse leakage for scoped users.
- Operations are usable on mobile.
- Quality, shipment, channel, and settings flows are covered by QA.
