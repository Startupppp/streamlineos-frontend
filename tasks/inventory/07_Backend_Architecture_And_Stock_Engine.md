# StreamlineOS Product Bible

# Inventory Management Module

# 07_Backend_Architecture_And_Stock_Engine.md

## Architecture Boundary

Inventory business APIs live in the backend. The frontend must use hooks/API client, not direct business logic or raw database calls.

Preferred backend modules:

- inv-products
- inv-warehouses
- inv-vendors
- inv-stock
- inv-purchase-orders
- inv-sales-orders
- inv-reports
- inv-valuation
- inv-barcode
- inv-import-export
- inv-ai
- inv-quality
- inv-shipments
- inv-channels
- inv-settings

## Service Layer

Create or extend:

- ProductService
- WarehouseService
- VendorService
- StockLedgerService
- StockBalanceService
- ReservationService
- AdjustmentService
- TransferService
- PurchaseOrderService
- GoodsReceiptService
- VendorReturnService
- SalesOrderService
- FulfillmentService
- CustomerReturnService
- ReplenishmentService
- ValuationService
- TraceabilityService
- ImportExportService
- InventoryAnalyticsService
- InventoryAIService
- QualityInspectionService
- InventoryStatusService
- PackageService
- ShipmentService
- LoadService
- ChannelInventoryService
- ThreePLService
- InventorySettingsService

## Stock Engine Responsibilities

Stock engine must:

- Validate permissions and module access.
- Validate source document state.
- Validate stock policy.
- Lock relevant balance rows.
- Create ledger transaction rows.
- Update stock balances.
- Update reservations.
- Update quality/status quantities.
- Update source document status.
- Create valuation layers when needed.
- Emit audit events.
- Invalidate caches.
- Return idempotent result.

## Transaction Requirements

Single DB transaction for:

- Receive goods.
- Ship goods.
- Complete transfer.
- Post adjustment.
- Post cycle count.
- Process return.
- Create valuation layer with stock movement.

## Stock Policy Service

Settings:

- allow_negative_stock
- allow_backorders
- reservation_strategy
- default_costing_method
- default_putaway_location
- putaway_strategy
- expiry_reservation_policy
- quality_inspection_policy
- channel_stock_publish_policy
- package_required_for_shipping
- approval_thresholds

## Reservation Strategy

Strategies:

- Manual.
- Auto reserve on SO confirm.
- FEFO for expiry-tracked items.
- FIFO for lot-tracked items.
- Specific lot/serial assignment.

## Error Handling

Use consistent error codes:

- INVENTORY_MODULE_DISABLED
- PRODUCT_NOT_FOUND
- WAREHOUSE_NOT_FOUND
- LOCATION_NOT_FOUND
- INSUFFICIENT_STOCK
- STOCK_RESERVED
- INVALID_DOCUMENT_STATE
- DUPLICATE_IDEMPOTENCY_KEY
- SERIAL_ALREADY_USED
- LOT_EXPIRED
- QUALITY_HOLD
- PACKAGE_CONTENT_MISMATCH
- CHANNEL_SYNC_FAILED
- COSTING_METHOD_LOCKED

## Cache Invalidation

Invalidate after every mutation:

- Stock levels.
- Product detail stock summary.
- Movement reports.
- Reorder report.
- Dashboard KPIs.
- PO/SO detail.
- Warehouse stock snapshot.

## Acceptance Criteria

- Stock engine is tested independently.
- No controller contains business stock math.
- Idempotency is enforced in service layer.
- Transactions are atomic.
- Audit events are emitted for every stock-changing operation.
