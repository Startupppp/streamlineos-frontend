# StreamlineOS Product Bible

# Inventory Management Module

# 04_Domain_Model_And_Stock_Ledger.md

## Core Domain Objects

- Product.
- Product variant.
- Category.
- Unit of measure.
- Warehouse.
- Location/bin.
- Vendor.
- Customer.
- Stock balance.
- Stock transaction.
- Stock reservation.
- Stock adjustment.
- Stock transfer.
- Purchase order.
- Goods receipt note.
- Vendor return.
- Sales order.
- Pick list.
- Packing record.
- Shipment.
- Goods issue note.
- Customer return.
- Reorder rule.
- Lot/batch.
- Serial number.
- Expiry record.
- Inventory valuation layer.
- Cycle count.
- Physical audit.

## Stock Quantity Definitions

On hand:

- Physical stock currently in a location.

Reserved:

- Stock allocated to a sales order, transfer, production job, or other demand.

Available:

- `on_hand - reserved - blocked`.

Incoming:

- Confirmed purchase or inbound transfer quantities not yet received.

Outgoing:

- Confirmed sales or outbound transfer quantities not yet shipped.

Blocked:

- Stock not sellable because of quality hold, expiry, damage, quarantine, or policy.

Forecasted:

- `on_hand + incoming - outgoing`.

## Ledger Principle

The stock ledger is the source of truth.

Every stock-changing action must create one or more immutable stock transactions. Current stock balances can be cached/materialized for speed, but they must reconcile to the ledger.

## Stock Transaction Types

- opening_balance
- purchase_receipt
- vendor_return
- sales_issue
- customer_return
- transfer_out
- transfer_in
- adjustment_in
- adjustment_out
- cycle_count_gain
- cycle_count_loss
- scrap
- quarantine_in
- quarantine_out
- reservation_create
- reservation_release
- reservation_consume

## Ledger Fields

Each transaction must include:

- organization_id
- transaction_type
- product_id
- variant_id
- warehouse_id
- location_id
- lot_id nullable
- serial_id nullable
- quantity_delta
- quantity_before
- quantity_after
- unit_cost nullable
- total_cost nullable
- source_type
- source_id
- idempotency_key
- actor_user_id
- reason
- created_at

## Stock Balance Rules

- Balances are scoped by organization, variant, warehouse, location, lot, and serial where applicable.
- Balances update in the same DB transaction as ledger rows.
- Negative stock is blocked unless organization policy explicitly allows it.
- Reserved stock cannot exceed on hand unless backorder policy allows.
- Serial-tracked stock quantity is always 0 or 1 per serial/location state.
- Expired stock cannot be reserved unless policy allows.

## Idempotency

Every stock-changing operation requires an idempotency key:

- Receive PO.
- Ship SO.
- Complete transfer.
- Post adjustment.
- Post cycle count.
- Process return.

Duplicate idempotency keys return the original result and must not create duplicate ledger entries.

## Concurrency

Use transactions and row-level locking or the repository's equivalent for:

- Balance rows.
- Reservation rows.
- Source document status changes.
- Valuation layers.

Prevent:

- Double receipt.
- Double shipment.
- Oversell.
- Partial update without ledger.
- Race between reservation and adjustment.

## Document State Machines

Purchase order:

- draft -> sent/approved -> partially_received -> received -> closed
- draft/sent -> cancelled

Goods receipt:

- draft -> posted -> reversed

Sales order:

- draft -> confirmed -> reserved/partially_reserved -> picked -> packed -> shipped -> invoiced/closed
- draft/confirmed -> cancelled

Transfer:

- draft -> reserved -> in_transit -> completed
- draft/reserved -> cancelled

Adjustment:

- draft -> approved -> posted
- draft -> cancelled

Cycle count:

- planned -> counting -> review -> posted

## Reversal Rules

- Posted stock transactions are never edited.
- Corrections use reversal transactions.
- Reversal references original transaction ID.
- Reversal is permission-gated and audited.

## Acceptance Criteria

- No stock-changing endpoint can update stock without a ledger row.
- Ledger and materialized balances reconcile.
- Idempotency tests prevent duplicate stock movement.
- Concurrency tests prevent oversell and double receipt.
