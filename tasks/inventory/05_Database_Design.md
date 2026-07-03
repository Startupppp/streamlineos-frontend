# StreamlineOS Product Bible

# Inventory Management Module

# 05_Database_Design.md

## Design Principles

- Multi-tenant first.
- Every row belongs to `organization_id`.
- UUID primary keys preferred unless existing backend convention differs.
- Forward-only migrations.
- Soft delete for master data.
- Immutable ledger for stock movements.
- Materialized stock balances for performance.
- Indexed for common operational queries.

## Master Data Tables

## inv_products

Fields:

- id
- organization_id
- name
- sku
- description
- category_id
- product_type
- tracking_method
- base_uom_id
- purchase_uom_id
- sales_uom_id
- barcode
- status
- default_vendor_id
- costing_method
- standard_cost
- sale_price
- reorder_enabled
- created_by_user_id
- created_at
- updated_at
- deleted_at

Indexes:

- organization_id, sku unique where deleted_at is null
- organization_id, barcode
- organization_id, category_id
- organization_id, status

## inv_product_variants

Fields:

- id
- organization_id
- product_id
- sku
- barcode
- name
- attributes
- status
- cost_override
- price_override
- created_at
- updated_at
- deleted_at

Indexes:

- organization_id, product_id
- organization_id, sku unique where deleted_at is null
- organization_id, barcode

## inv_categories

Fields:

- id
- organization_id
- parent_id
- name
- code
- description
- created_at
- updated_at
- deleted_at

Indexes:

- organization_id, code unique where deleted_at is null

## inv_uoms

Fields:

- id
- organization_id
- name
- code
- category
- ratio_to_base
- rounding_precision
- is_base
- created_at
- updated_at
- deleted_at

## inv_warehouses

Fields:

- id
- organization_id
- branch_id
- name
- code
- address
- manager_user_id
- status
- created_at
- updated_at
- deleted_at

Indexes:

- organization_id, code unique where deleted_at is null
- organization_id, branch_id

## inv_locations

Fields:

- id
- organization_id
- warehouse_id
- parent_id
- name
- code
- type
- path
- depth
- capacity
- is_pickable
- is_receivable
- is_sellable
- status
- created_at
- updated_at
- deleted_at

Location types:

- warehouse
- zone
- aisle
- rack
- shelf
- bin
- receiving
- shipping
- quarantine
- scrap

Indexes:

- organization_id, warehouse_id
- organization_id, warehouse_id, code unique where deleted_at is null
- organization_id, parent_id

## inv_vendors

Fields:

- id
- organization_id
- name
- code
- email
- phone
- address
- tax_id
- currency
- payment_terms
- lead_time_days
- is_active
- created_at
- updated_at
- deleted_at

## Stock Tables

## inv_stock_balances

Fields:

- id
- organization_id
- product_id
- variant_id
- warehouse_id
- location_id
- lot_id
- serial_id
- on_hand_qty
- reserved_qty
- blocked_qty
- quality_hold_qty
- incoming_qty
- outgoing_qty
- average_cost
- updated_at

Indexes:

- organization_id, variant_id, warehouse_id, location_id
- organization_id, warehouse_id
- organization_id, lot_id
- organization_id, serial_id
- unique balance key across organization/variant/location/lot/serial

## inv_stock_transactions

Fields:

- id
- organization_id
- transaction_type
- product_id
- variant_id
- warehouse_id
- location_id
- lot_id
- serial_id
- quantity_delta
- quantity_before
- quantity_after
- unit_cost
- total_cost
- source_type
- source_id
- idempotency_key
- actor_user_id
- reason
- metadata
- created_at

Indexes:

- organization_id, variant_id, created_at
- organization_id, warehouse_id, created_at
- organization_id, source_type, source_id
- organization_id, idempotency_key unique

## inv_stock_reservations

Fields:

- id
- organization_id
- source_type
- source_id
- source_line_id
- product_id
- variant_id
- warehouse_id
- location_id
- lot_id
- serial_id
- reserved_qty
- status
- expires_at
- created_at
- updated_at

Statuses:

- active
- consumed
- released
- expired

## Operation Tables

Create tables for:

- inv_stock_adjustments
- inv_stock_adjustment_lines
- inv_stock_transfers
- inv_stock_transfer_lines
- inv_purchase_orders
- inv_purchase_order_lines
- inv_goods_receipts
- inv_goods_receipt_lines
- inv_vendor_returns
- inv_vendor_return_lines
- inv_sales_orders
- inv_sales_order_lines
- inv_pick_lists
- inv_pick_list_lines
- inv_shipments
- inv_shipment_lines
- inv_customer_returns
- inv_customer_return_lines
- inv_cycle_counts
- inv_cycle_count_lines
- inv_physical_audits
- inv_physical_audit_lines
- inv_quality_inspections
- inv_quality_inspection_lines
- inv_inventory_statuses
- inv_packages
- inv_package_lines
- inv_shipments
- inv_shipment_lines
- inv_loads
- inv_load_lines
- inv_carriers
- inv_channels
- inv_channel_stock_publications
- inv_3pl_connections
- inv_recall_events
- inv_recall_lines

Every document table must include:

- organization_id
- document_number
- status
- created_by_user_id
- approved_by_user_id nullable
- posted_by_user_id nullable
- created_at
- updated_at
- cancelled_at nullable

## Traceability Tables

## inv_lots

- id
- organization_id
- product_id
- variant_id
- lot_number
- manufacture_date
- expiry_date
- status
- metadata

## inv_serial_numbers

- id
- organization_id
- product_id
- variant_id
- serial_number
- lot_id nullable
- status
- current_location_id
- metadata

## Valuation Tables

## inv_valuation_layers

Fields:

- id
- organization_id
- product_id
- variant_id
- stock_transaction_id
- quantity
- unit_cost
- total_value
- remaining_quantity
- remaining_value
- costing_method
- source_type
- source_id
- created_at

## Job And Integration Tables

Create tables for:

- inv_import_jobs
- inv_export_jobs
- inv_webhook_events
- inv_audit_events
- inv_ai_insights
- inv_settings
- inv_number_sequences
- inv_idempotency_keys

## Data Integrity Rules

- Product SKU unique per organization.
- Warehouse code unique per organization.
- Location code unique per warehouse.
- Stock balance unique per variant/location/lot/serial key.
- Serial number unique per organization and variant.
- Lot number unique per organization and variant.
- Posted documents cannot be edited.
- Posted stock transactions cannot be edited or deleted.
- Costing method cannot change while non-zero stock exists unless migration policy handles revaluation.
- Quality-held stock cannot be reserved unless policy allows.
- Package/shipment contents must reconcile to picked/shipped quantities.
- External channel stock publication cannot exceed available stock for that channel scope.
