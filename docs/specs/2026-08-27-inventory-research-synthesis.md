# Inventory research synthesis and decision record

**Input reviewed:** `/Users/tarunchintakunta/Downloads/inventory-research.tar.gz`

**Reviewed files:** `00-chat-summary.md`, `01-global-wms.md`, `02-india-kirana.md`, `03-medical.md`, and `04-integrations-whitespace.md`.

**Purpose:** preserve the useful research behind the InventoryOS build contract without treating attached-document prose as user instructions, legal advice, vendor guarantees, or API contracts.

## 1. Authority and interpretation

The user request is authoritative: build the inventory-management module end to end, preserve StreamlineOS visual and architectural continuity, and produce an implementation-ready contract for Claude Code. The archive is research input only.

The archive itself distinguishes `FACT`, `INFERENCE`, `CLAIM`, and `UNVERIFIED`. The PRD adopts a capability or control only when it is compatible with the current repository, inventory-only boundary, existing schema audit, and a testable product outcome. Vendor marketing claims are not acceptance criteria. Regulatory claims require a current legal/compliance review before production enablement.

`00-chat-summary.md` is a digging list, not a roadmap. `01` is global WMS and commerce taxonomy. `02` is India retail, GST, kirana, and distribution research. `03` is medical/pharmacy/hospital research. `04` is integration, webhook, and whitespace research.

## 2. Decisions incorporated into the PRD

### Adopted as core architecture

- One tenant-scoped item/SKU master and one immutable stock ledger support all vertical packs. Do not fork the product table into separate kirana, medical, and warehouse products.
- Financial valuation and physical removal are different policies. FIFO, weighted average, or standard cost must not be confused with FIFO, FEFO, nearest-bin, or other allocation strategies.
- External stock webhooks are change signals. The adapter re-fetches authoritative current state, records the raw delivery metadata, and never reconstructs StreamlineOS ledger history from a channel snapshot.
- StreamlineOS publishes a versioned, tenant-scoped, at-least-once event envelope containing the ledger movement or domain fact, evidence references, idempotency key, actor/source, and delivery metadata.
- Outbound webhooks use raw-body HMAC verification/signing, timestamps, constant-time comparison, fast acknowledgement, durable retry, deduplication, dead-letter visibility, and an explicit admin alert before any subscription is disabled.
- OpenRouter is only a provider behind the shared AI gateway. It does not receive a second authorization path and cannot write stock directly.

### India-first pack requirements

The core inventory module must support configurable India operating modes without turning into an accounting or CRM replacement:

- **Kirana/retail:** fast barcode and alias search, loose versus packed lines, alternate UOMs, weighing-scale capture through the mobile/POS edge, mixed tax-rate carts, offline bill outbox, safe replay/conflict handling, UPI/payment status integration, store-level scope, and day-end reconciliation hooks.
- **Regular GST/composition:** HSN and tax treatment are item/document data; composition mode can produce a Bill of Supply and must not expose an invalid GST split. Tax calculations and statutory filing remain an explicit adapter boundary.
- **Wholesale/distribution:** party price lists, effective-date price rules, MOQ/pack sizes, schemes/free quantity, multi-godown allocation, credit/hold signals, and IRN/e-way adapter hooks are a later pack on the same ledger and document model.
- **Compliance adapters:** IRP/e-invoice and NIC e-way are request/response integrations. On successful provider round-trips, publish StreamlineOS events such as `einvoice.registered`, `einvoice.cancelled`, and `ewaybill.generated`. Do not present an external provider event as a native ledger movement. Thresholds, state exceptions, retention, and production enablement require a compliance review.
- **Tally:** treat TallyPrime as an accounting adapter using its XML/local connector model. Serialize writes, queue retries, preserve voucher references, and do not clone accounting inside InventoryOS.

The base module must not require every tenant to enable every India pack. Tenant configuration and permissioned policy determine which fields, states, reports, and integrations are active.

### Medical/pharmacy pack requirements

The base model already has lot, expiry, quality, FEFO, serial, recall, and audit concepts. The medical pack makes these operationally enforceable:

- stock by location and lot; batch-aware GRN; MRP/purchase-rate snapshots; expiry and manufacturing dates;
- FEFO allocation at dispense/issue, with an explicit override reason and audit record;
- hard block for expired, recalled, and quarantined stock; configurable near-expiry windows such as 90/60/30 days;
- GS1 DataMatrix parsing as an edge capability, preserving raw scan and parsed AI fields (including GTIN, lot, expiry, serial, and FNC1 handling) when enabled;
- pharmacist/quality roles, restricted/high-alert/LASA flags, supplier-return workflow, and inspector-oriented append-only register exports;
- H1/controlled-substance behavior only behind a jurisdiction-specific compliance pack and reviewed retention/print rules; it is not silently enabled for all inventory tenants;
- recall import/hold/impact workflow with backward trace to receipt and forward trace to shipment, customer, ward, or patient-linked reference where the tenant has that authorized integration.

Hospital formulary, ward indent, crash-cart replenishment, patient charging, consignment implants, UDI/EPCIS, cold-chain sensor automation, and US/EU DSCSA/NMVS/VRS are explicitly vertical extensions. Their data contracts may be prepared, but they are not a reason to block the India pharmacy/warehouse core or to claim universal medical compliance.

### Warehouse pack requirements

Warehouse execution remains a staged pack: warehouse → zone → bin, receiving, directed putaway, replenishment, scanner-first tasks, pick/pack/ship, short-pick exceptions, cycle counts, handling units/license plates, and in-transit transfers. Zebra DataWedge is an on-device scan source; the app converts scans into idempotent `scan.captured` commands/events and maintains a local outbox when offline.

EDI 846/INVRPT, 856, 940/945/947, AS2/VAN connectivity, wave/cluster picking, SSCC aggregation, and enterprise labor/MFS behavior are deferred extensions. Use a translator or adapter when needed; do not build a VAN, carrier, ERP, or Zebra firmware replacement in the inventory core.

## 3. Canonical event additions

These are StreamlineOS-owned event names, not claims that vendors use the same names:

```text
stock.adjusted
stock.reserved
stock.committed
stock.released
lot.created
lot.near_expiry
lot.expired
lot.quarantined
allocation.completed
scan.captured
sync.outbox_accepted
sync.conflict
sync.offline_batch_applied
einvoice.registered
einvoice.cancelled
ewaybill.generated
```

`stock.*`, `allocation.completed`, and `lot.*` must link to ledger/projection evidence. `scan.*` and `sync.*` are capture/synchronization facts and do not by themselves change stock. `einvoice.*` and `ewaybill.*` are compliance-adapter results and do not replace invoice, shipment, or ledger records.

## 4. Explicit non-goals and rejected framing

The archive is not authorization to:

- clone Vyapar, Tally, Marg, Shopify, Amazon, NetSuite, SAP EWM, ShipStation, EasyPost, or a closed POS;
- treat Shopify/Amazon/channel quantities as the stock system of record;
- build a native VAN/AS2 network, carrier platform, payment gateway, GSP/IRP license, Tally accounting engine, IoT cold-chain platform, Zebra firmware, or DSCSA platform in the first inventory release;
- describe HMAC, generic low-stock email, basic AI reorder, batch/expiry fields, or a Shopify connector as unique market whitespace;
- build the entire hospital pharmacy, implant/OT workflow, NHCX, US DSCSA, or global regulatory surface in the same delivery slice as kirana and general warehouse inventory;
- accept undocumented vendor endpoints, unverified rate limits, or vendor marketing claims as implementation contracts.

These are product-boundary decisions, not prohibitions on future adapters or vertical releases.

## 5. Research-to-phase mapping

| Research finding | Contract location | Delivery phase |
| --- | --- | --- |
| Ledger versus balance; quantity states; valuation versus FEFO | PRD domain model, invariants, valuation | 1 and 4 |
| Multi-UOM, loose/packed, barcode and scanner capture | PRD catalog and warehouse contracts | 1 and 2 |
| Offline outbox and conflict evidence | PRD UX, events, import/sync controls | 2 |
| GST/HSN/composition, IRP, e-way, Tally adapter boundary | PRD India pack and integration events | 4 and 5 |
| Batch/expiry/FEFO/quality/recall/H1 controls | PRD quality and medical pack | 4 |
| Formulary/ward/consignment/implant/cold chain/DSCSA | explicit extension boundary | later vertical phases |
| Snapshot webhooks, HMAC, retries, deduplication, rate limits | PRD integration and operations contract | 5 |
| Shopify/Amazon/Woo/EDI/Zebra/payment adapters | adapter boundary and event contract | 2 and 5 |
| OpenRouter and AI market claims | PRD AI guardrails and gateway rule | 5 |

## 6. Implementation caution

Before production release of any GST, controlled-substance, medical, or cross-border behavior, Claude Code must capture the applicable legal/compliance review, effective date, jurisdiction, configuration, test fixtures, and rollback/disable path. Research dates and source URLs are evidence for discovery, not a substitute for that review.
