# StreamlineOS Product Bible

# Inventory Management Module

# 18_Integrations_Import_Export_And_Webhooks.md

## Purpose

Inventory must connect to the rest of StreamlineOS and external systems without breaking stock correctness.

## Internal Integrations

CRM:

- Products available in quotes/deals.
- Deal can check ATP.

Sales:

- Sales order reservation and shipment.
- Invoice creation after shipment.

Accounting:

- Valuation layers.
- COGS.
- Vendor bill matching.

Knowledge:

- Warehouse SOPs.
- Product handling instructions.
- Receiving/picking guides.

AI:

- Forecasting.
- Reorder explanation.
- Anomaly detection.

Notifications:

- Low stock.
- PO delayed.
- SO cannot reserve.
- Expiry alert.

## Import

Supported imports:

- Products.
- Variants.
- Categories.
- UOMs.
- Vendors.
- Warehouses/locations.
- Opening stock.
- Reorder rules.

Import requirements:

- Preview before commit.
- Field mapping.
- Validation errors.
- Duplicate detection.
- Idempotent retry.
- Error report.

## Export

Supported exports:

- Product catalog.
- Stock levels.
- Stock movements.
- Reorder report.
- Valuation report.
- Lots/serials.

Export must respect RBAC and warehouse data scope.

## Public API

Post-MVP:

- Product read.
- Stock availability.
- PO/SO status.
- Webhook event subscription.

## Webhook Events

Events:

- inventory.product.created
- inventory.stock.changed
- inventory.stock.low
- inventory.po.created
- inventory.po.received
- inventory.so.reserved
- inventory.so.shipped
- inventory.transfer.completed
- inventory.adjustment.posted

Rules:

- Webhook payloads are tenant-scoped.
- Retries are idempotent.
- Delivery failures are visible.

## Acceptance Criteria

- Imports cannot create invalid stock.
- Exports cannot bypass permissions.
- Integrations never update stock without stock engine.
- Webhook delivery is auditable.
