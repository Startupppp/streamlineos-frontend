# StreamlineOS Product Bible

# Inventory Management Module

# 13_Sales_ATP_Reservation_Pick_Pack_Ship.md

## Purpose

Sales and fulfillment must prevent overselling and provide a clear path from order to shipment.

## Available To Promise

ATP considers:

- On hand.
- Reserved.
- Incoming.
- Outgoing.
- Blocked.
- Warehouse.
- Lot/expiry rules.

ATP output:

- Available now.
- Available later.
- Shortage quantity.
- Suggested fulfillment warehouse.
- Backorder status.

## Sales Order Lifecycle

States:

- draft
- confirmed
- partially_reserved
- reserved
- picked
- packed
- partially_shipped
- shipped
- invoiced
- closed
- cancelled

## Reservation

Reservation rules:

- Manual reservation.
- Auto reservation on confirm.
- Warehouse-priority reservation.
- FIFO/FEFO reservation.
- Specific lot/serial reservation.

Rules:

- Reservation reduces available stock but not on-hand.
- Reservation can expire.
- Reservation releases on cancellation.
- Shipment consumes reservation.

## Pick Pack Ship

Pick:

- Select source location, lot, serial, and quantity.

Pack:

- Confirm items packed and package details if enabled.

Ship:

- Deduct stock and create goods issue.

Rules:

- Partial picking is allowed.
- Partial shipment is allowed.
- Serial item must be picked individually.
- Expired stock cannot be picked unless policy allows.
- Shipment creates ledger and valuation/COGS layer.

## Customer Returns

Return reasons:

- Damaged.
- Wrong item.
- Defective.
- Customer cancellation.

Rules:

- Return references sales order/shipment where possible.
- Return can restock, quarantine, or scrap.
- Restock creates positive ledger transaction.
- Refund/accounting integration post-MVP.

## Acceptance Criteria

- ATP prevents accidental oversell.
- Reservation is separate from shipment.
- Partial shipments update SO state correctly.
- Shipping is idempotent.
- Customer returns are ledger-backed.
