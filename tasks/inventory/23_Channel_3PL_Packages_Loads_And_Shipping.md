# StreamlineOS Product Bible

# Inventory Management Module

# 23_Channel_3PL_Packages_Loads_And_Shipping.md

## Purpose

Inventory must be ready for multi-channel sales, carrier shipping, 3PL warehouses, package-level fulfillment, and load/container tracking.

## Sales Channels

Channel examples:

- StreamlineOS sales orders.
- Shopify post-MVP.
- WooCommerce post-MVP.
- Amazon/marketplaces post-MVP.
- B2B portal post-MVP.
- 3PL/warehouse partner.

Rules:

- Published channel stock must respect warehouse scope and safety stock.
- Channel reservations must create source-linked reservations.
- Failed syncs must be visible and retryable.

## Stock Publication

For each channel:

- Included warehouses.
- Safety buffer.
- Product/variant mapping.
- Publish available quantity.
- Publish threshold.
- Last sync status.

## Packages

Package fields:

- Package number.
- Shipment.
- Weight.
- Dimensions.
- Carrier package type.
- Contents.
- Status.

Rules:

- Package contents must match picked quantities.
- Serial/lot contents must be explicit.
- Closing a package freezes contents unless reopened with permission.

## Shipments

Shipment fields:

- Shipment number.
- Sales order.
- Warehouse.
- Carrier.
- Tracking number.
- Packages.
- Status.
- Shipped at.

States:

- draft
- packed
- label_created
- shipped
- delivered
- cancelled

## Loads And Containers

Use for:

- Consolidated outbound shipments.
- Inbound containers.
- Inter-warehouse truck loads.
- 3PL transfer batches.

Fields:

- Load number.
- Source.
- Destination.
- Carrier.
- Vehicle/container reference.
- Shipments/transfers.
- Dispatch date.
- Arrival date.
- Status.

## Carrier Integration

Post-MVP:

- Rate quote.
- Label creation.
- Tracking updates.
- Delivery confirmation.

If no carrier connected:

- UI must show manual carrier/tracking fields.
- Do not render broken integration data.

## 3PL Integration

3PL support:

- External warehouse mapping.
- Product/SKU mapping.
- Stock sync.
- Fulfillment request.
- Shipment confirmation.
- Exception queue.

## Acceptance Criteria

- Shipment/package contents reconcile to picked/shipped stock.
- Channel stock publication cannot exceed available quantity.
- Failed channel/3PL syncs are visible.
- Manual shipping works without carrier integration.
