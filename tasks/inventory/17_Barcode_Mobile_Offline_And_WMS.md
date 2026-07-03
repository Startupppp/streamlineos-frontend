# StreamlineOS Product Bible

# Inventory Management Module

# 17_Barcode_Mobile_Offline_And_WMS.md

## Purpose

Warehouse staff need fast, low-friction workflows. Barcode and mobile support reduce picking, receiving, and counting errors.

## Barcode Scope

MVP:

- Product/variant barcode lookup.
- Location barcode lookup.
- Manual scan input.
- Camera scanner if existing libraries support it.
- Barcode generation/export post-MVP.

Post-MVP:

- Package labels.
- GS1 barcode parsing.
- Dedicated scanner support.
- Label printing.

## Barcode Workflows

Receive:

- Scan PO.
- Scan product.
- Scan lot/serial if needed.
- Scan location.
- Enter quantity.

Transfer:

- Scan source location.
- Scan product.
- Scan destination location.
- Confirm quantity.

Pick:

- Scan pick list.
- Scan location.
- Scan product/lot/serial.
- Confirm picked quantity.

Cycle count:

- Scan location.
- Scan product.
- Enter counted quantity.

## Mobile UX

Mobile screens must:

- Use large touch targets.
- Minimize typing.
- Keep scanner input focused.
- Show clear success/error states.
- Work on 375px width.

## Offline Mode

MVP:

- Show offline warning.
- Do not allow stock-changing offline operations unless queueing is explicitly implemented.

Post-MVP:

- Offline scan queue.
- Conflict resolution.
- Idempotent sync.
- Supervisor review for conflicts.

## WMS Enhancements Post-MVP

- Putaway rules.
- Pick paths.
- Wave picking.
- Zone picking.
- Cross-docking.
- Packing stations.
- Carrier integration.

## Acceptance Criteria

- Barcode lookup works with manual scanner input.
- Mobile receive/transfer/pick/count flows are usable.
- Offline behavior is explicit and safe.
