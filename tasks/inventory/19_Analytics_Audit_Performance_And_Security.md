# StreamlineOS Product Bible

# Inventory Management Module

# 19_Analytics_Audit_Performance_And_Security.md

## Analytics

Dashboard metrics:

- Stock value.
- SKUs in stock.
- Low-stock SKUs.
- Out-of-stock SKUs.
- Open PO value.
- Open SO value.
- Inventory accuracy.
- Slow-moving stock.
- Expiring stock.
- Quality hold quantity.
- Open inspections.
- Shipment/load backlog.
- Channel sync failures.

Reports:

- Stock summary.
- Movement ledger.
- Reorder report.
- Valuation.
- Slow-moving.
- Expiry.
- Vendor performance.
- Adjustment variance.

## Audit Events

Audit:

- Product created/updated/archived.
- Warehouse/location changed.
- Stock adjustment approved/posted.
- Transfer completed.
- PO approved/received.
- SO reserved/shipped.
- Return processed.
- Costing method changed.
- Import/export run.
- Settings changed.
- Quality inspection passed/failed/disposed.
- Quality hold released.
- Recall opened/closed.
- Package closed/reopened.
- Shipment shipped/cancelled.
- Channel/3PL sync run.

Audit payload:

- Actor.
- Organization.
- Action.
- Resource.
- Before/after metadata.
- Timestamp.
- IP/user agent where available.

## Performance

Targets:

- Dashboard under 2 seconds.
- Stock list under 1.5 seconds with pagination.
- Movement report under 2 seconds for paginated result.
- Stock-changing mutation under 1 second for normal document sizes.

Performance rules:

- Paginate all lists.
- Select only required columns.
- Use indexes.
- Avoid N+1 queries.
- Cache read-heavy reports when permission-safe.
- Invalidate cache on stock mutation.

## Security

Required:

- Server-side auth.
- Server-side permission.
- Module guard.
- Warehouse data scope.
- Zod/class-validator validation.
- Idempotency.
- Audit logs.
- No raw SQL interpolation.
- No hard-coded secrets.

## Data Loss Prevention

Block or warn:

- Exporting warehouses outside scope.
- Shipping expired stock.
- Shipping quality-held stock.
- Publishing stock availability to unauthorized external systems.
- Negative stock if policy disabled.
- Costing method change with non-zero stock.

## Acceptance Criteria

- Reports are scoped and paginated.
- Stock mutations are auditable.
- Security tests cover cross-tenant and cross-warehouse access.
- Performance-critical queries have indexes.
- Quality, channel, 3PL, and shipment actions are audited.
