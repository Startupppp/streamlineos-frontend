# StreamlineOS Product Bible

# Inventory Management Module

# 08_API_Contracts.md

## API Principles

- Backend APIs under `/inventory/**`.
- JWT/session authenticated.
- `@RequireModule("inventory")` or equivalent on all controllers.
- Permission-guarded.
- Zod/class-validator DTO validation based on backend convention.
- Paginated lists.
- Consistent error shape.
- Idempotency key required for stock-changing commands.

## Products

- `GET /inventory/products`
- `GET /inventory/products/:productId`
- `POST /inventory/products`
- `PATCH /inventory/products/:productId`
- `DELETE /inventory/products/:productId`
- `POST /inventory/products/:productId/archive`
- `POST /inventory/products/:productId/restore`
- `GET /inventory/products/categories`
- `POST /inventory/products/categories`
- `PATCH /inventory/products/categories/:categoryId`
- `GET /inventory/products/uom`
- `POST /inventory/products/uom`
- `PATCH /inventory/products/uom/:uomId`
- `GET /inventory/products/variants`
- `POST /inventory/products/:productId/variants`
- `PATCH /inventory/products/:productId/variants/:variantId`

## Warehouses

- `GET /inventory/warehouses`
- `GET /inventory/warehouses/:warehouseId`
- `POST /inventory/warehouses`
- `PATCH /inventory/warehouses/:warehouseId`
- `GET /inventory/warehouses/:warehouseId/locations`
- `POST /inventory/warehouses/:warehouseId/locations`
- `PATCH /inventory/warehouses/:warehouseId/locations/:locationId`

## Vendors

- `GET /inventory/vendors`
- `GET /inventory/vendors/:vendorId`
- `POST /inventory/vendors`
- `PATCH /inventory/vendors/:vendorId`

## Stock

- `GET /inventory/stock`
- `GET /inventory/stock/:balanceId`
- `GET /inventory/stock/transactions`
- `GET /inventory/stock/availability`
- `POST /inventory/stock/reserve`
- `POST /inventory/stock/release-reservation`

## Adjustments

- `GET /inventory/stock/adjustments`
- `GET /inventory/stock/adjustments/:adjustmentId`
- `POST /inventory/stock/adjustments`
- `POST /inventory/stock/adjustments/:adjustmentId/approve`
- `POST /inventory/stock/adjustments/:adjustmentId/post`
- `POST /inventory/stock/adjustments/:adjustmentId/cancel`

## Transfers

- `GET /inventory/stock/transfers`
- `GET /inventory/stock/transfers/:transferId`
- `POST /inventory/stock/transfers`
- `POST /inventory/stock/transfers/:transferId/reserve`
- `POST /inventory/stock/transfers/:transferId/ship`
- `POST /inventory/stock/transfers/:transferId/receive`
- `POST /inventory/stock/transfers/:transferId/complete`
- `POST /inventory/stock/transfers/:transferId/cancel`

## Purchase Orders And Receipts

- `GET /inventory/purchase-orders`
- `GET /inventory/purchase-orders/:poId`
- `POST /inventory/purchase-orders`
- `PATCH /inventory/purchase-orders/:poId`
- `POST /inventory/purchase-orders/:poId/send`
- `POST /inventory/purchase-orders/:poId/approve`
- `POST /inventory/purchase-orders/:poId/receive`
- `POST /inventory/purchase-orders/:poId/close`
- `POST /inventory/purchase-orders/:poId/cancel`
- `GET /inventory/goods-receipts`
- `GET /inventory/goods-receipts/:grnId`
- `POST /inventory/goods-receipts/:grnId/reverse`

## Sales Orders And Fulfillment

- `GET /inventory/sales-orders`
- `GET /inventory/sales-orders/:soId`
- `POST /inventory/sales-orders`
- `PATCH /inventory/sales-orders/:soId`
- `POST /inventory/sales-orders/:soId/confirm`
- `POST /inventory/sales-orders/:soId/reserve`
- `POST /inventory/sales-orders/:soId/pick`
- `POST /inventory/sales-orders/:soId/pack`
- `POST /inventory/sales-orders/:soId/ship`
- `POST /inventory/sales-orders/:soId/invoice`
- `POST /inventory/sales-orders/:soId/cancel`

## Traceability

- `GET /inventory/lots`
- `GET /inventory/lots/:lotId`
- `GET /inventory/serials`
- `GET /inventory/serials/:serialId`
- `GET /inventory/traceability`

## Quality And Status

- `GET /inventory/quality/inspections`
- `POST /inventory/quality/inspections`
- `POST /inventory/quality/inspections/:inspectionId/pass`
- `POST /inventory/quality/inspections/:inspectionId/fail`
- `POST /inventory/quality/inspections/:inspectionId/dispose`
- `GET /inventory/quality/holds`
- `POST /inventory/quality/holds`
- `POST /inventory/quality/holds/:holdId/release`
- `GET /inventory/quality/recalls`
- `POST /inventory/quality/recalls`
- `PATCH /inventory/quality/recalls/:recallId`

## Packages Shipments Loads

- `GET /inventory/packages`
- `POST /inventory/packages`
- `GET /inventory/packages/:packageId`
- `POST /inventory/packages/:packageId/close`
- `GET /inventory/shipments`
- `GET /inventory/shipments/:shipmentId`
- `POST /inventory/shipments`
- `POST /inventory/shipments/:shipmentId/ship`
- `POST /inventory/shipments/:shipmentId/cancel`
- `GET /inventory/loads`
- `POST /inventory/loads`
- `POST /inventory/loads/:loadId/dispatch`
- `POST /inventory/loads/:loadId/close`
- `GET /inventory/carriers`
- `POST /inventory/carriers`

## Channels And 3PL

- `GET /inventory/channels`
- `POST /inventory/channels`
- `PATCH /inventory/channels/:channelId`
- `POST /inventory/channels/:channelId/sync-stock`
- `GET /inventory/3pl/connections`
- `POST /inventory/3pl/connections`
- `POST /inventory/3pl/connections/:connectionId/sync`

## Replenishment And Reports

- `GET /inventory/replenishment/rules`
- `POST /inventory/replenishment/rules`
- `PATCH /inventory/replenishment/rules/:ruleId`
- `GET /inventory/reports/stock-summary`
- `GET /inventory/reports/movements`
- `GET /inventory/reports/reorder`
- `GET /inventory/reports/valuation`
- `GET /inventory/reports/slow-moving`
- `GET /inventory/reports/expiry`

## Import Export

- `POST /inventory/import/preview`
- `POST /inventory/import/jobs`
- `GET /inventory/import/jobs`
- `GET /inventory/import/jobs/:jobId`
- `POST /inventory/export/jobs`
- `GET /inventory/export/jobs`
- `GET /inventory/export/jobs/:jobId`

## Webhooks

- `GET /inventory/webhooks`
- `POST /inventory/webhooks`
- `PATCH /inventory/webhooks/:webhookId`
- `DELETE /inventory/webhooks/:webhookId`

## Settings

- `GET /inventory/settings`
- `PATCH /inventory/settings`
- `GET /inventory/settings/number-sequences`
- `PATCH /inventory/settings/number-sequences/:sequenceId`

## API Acceptance Criteria

- All list endpoints paginate.
- All mutations validate body and params.
- Stock-changing mutations require idempotency key.
- All protected endpoints enforce server-side permission.
- All endpoints are module-gated.
- Error responses are consistent.
