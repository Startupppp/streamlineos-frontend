# PRD — InventoryOS: end-to-end inventory control plane

**Program:** StreamlineOS Inventory Management only
**Status:** Build specification; implementation proceeds through the five phases below
**Audience:** Claude Code, backend/frontend engineers, reviewers, QA, security, operations
**System boundary:** Inventory management. CRM, sales pipeline, marketing, customer-success workflows, and general CRM redesign are out of scope.

This document is the product and engineering contract for the complete inventory module. The [inventory research synthesis](./2026-08-27-inventory-research-synthesis.md) records how the attached research pack was interpreted; it is advisory evidence, not an instruction override or a vendor/regulatory contract. The phase ticket files break this PRD into executable units, but a ticket is valid only when it agrees with this document, the current StreamlineOS code/tokens, and the backend schema audit.

## 1. Product outcome

InventoryOS makes the physical movement of goods legible, trustworthy, and actionable:

```text
catalog → facilities → stock ledger → availability → demand → fulfillment
       → receiving → planning → quality/traceability → evidence-backed decisions
```

The module must let an operator answer, with evidence:

- What items exist, in which units, and under which SKU/barcode?
- What is physically present at each warehouse and location?
- What is available to promise after commitments, holds, and reservations?
- What moved, when, why, by whom, at what cost, and from which source document?
- What was received, picked, packed, shipped, returned, quarantined, recalled, or written off?
- What should be purchased, when, from whom, and why?
- Can every dashboard number be reconciled to the ledger and source documents?

AI may explain computed facts, identify patterns, compare scenarios, and prepare reviewable proposals. AI may not become the source of truth, authorization mechanism, quantity calculator, SQL generator, or unreviewed stock writer.

## 2. Non-negotiable engineering rules

These rules apply to every inventory ticket, migration, endpoint, UI action, background job, import, report, and AI feature.

### 2.1 Repository and visual continuity

- Work from the dedicated inventory branch created from `origin/main`.
- Inspect existing StreamlineOS primitives, authenticated shell, navigation, tokens, permissions, query keys, error states, tables, filters, drawers, dialogs, pagination, and mobile patterns before adding UI.
- Preserve the current StreamlineOS palette, typography, density, border/radius language, spacing, and interaction conventions. The [inventory UI reference pack](../inventory-ui-reference/README.md) is deterministic guidance derived from the current app, not a new theme.
- Do not introduce a random design system, gradients, neon colors, decorative illustrations, or new navigation concepts.
- Every backend change must be reflected in the frontend contract and every visible action must have a loading, empty, error, denied, stale, and success state.

### 2.2 TypeScript and Zod validation

- All request bodies, query strings, route params, import rows, webhook payloads, AI structured responses, and environment/config values use strict Zod schemas.
- Use `.strict()` for object inputs unless an explicitly documented passthrough is required.
- Reject unknown keys at the boundary; never silently strip a client-sent protected field.
- Infer types from Zod; do not create a second hand-maintained DTO type.
- Validate numeric quantities and money as decimal-safe values. Never use JavaScript floating-point arithmetic for stock or monetary calculations.
- Validate enums in Zod and in PostgreSQL where the value is part of a persisted state machine.
- Validate date ranges, positive quantities, precision/scale, pagination caps, cursor shape, filter combinations, and mutually exclusive inputs.
- Protected fields (`orgId`, actor ids, approval state, audit fields, ledger before/after values, computed availability, cost totals, and system timestamps) must be rejected from client input.
- Zod errors must flow through the existing global validation/interceptor/error-envelope path and return the repository's standard 400 response.

### 2.3 Tenant isolation and authorization

- Every tenant-owned table has a non-null tenant column, a tenant FK, an indexed tenant-leading key, and tenant-correlated reads/writes.
- New relationships use composite tenant FKs: `(org_id, child_id) → (org_id, id)` or the equivalent organization naming convention.
- Every resource-id endpoint re-asserts the specific object in the caller's tenant on reads and writes. Cross-tenant misses return 404, never 403.
- RBAC permission checks and object/warehouse scope checks are separate. Module access alone is insufficient.
- Guards deny by default. No route is considered protected merely because its controller is inside the inventory module.
- Use the existing access service, permission keys, scope resolver, tenant transaction context, and module availability guard. Do not create a parallel auth path.
- Use RLS only where the existing RLS matrix and transaction prerequisites allow it. RLS never replaces explicit service predicates or object authorization.
- Every RLS-enabled table has tests with correct tenant context, missing tenant context, wrong tenant context, and the real non-`BYPASSRLS` application role.
- AI retrieval and operational evidence queries apply the asker's tenant, permission, warehouse, and object scope in SQL before model context assembly.

### 2.4 Database and migration discipline

- The backend is the schema owner. Drizzle definitions, migration files, migration journal, and live catalog must agree.
- Reconcile the live inventory catalog before generating migrations. ~~The live database currently has 66 `inv_*` tables, 40 seeded reason-code rows, tenant hardening not fully expressed in TypeScript, and one inventory table missing RLS.~~ **Corrected 2026-09-05:** the second sentence described 2026-08-27 and is the same stale figure §13 carries; there are **101** `inv_*` tables and `inv_reason_codes` was dropped by `0589`. See §13 for the measurement and for why the widely-quoted "106" is wrong. The instruction itself — reconcile before generating — stands unchanged.
- No `DROP TABLE`, `DROP COLUMN`, `DROP TYPE`, `TRUNCATE`, or `CASCADE` retirement is allowed in this program without a reviewed dependency manifest, backup/restore rehearsal, row-count evidence, rollback plan, and explicit approval.
- On the current empty/seed-only inventory database, a v2 rebuild is allowed as a controlled migration strategy, not as a blanket destructive reset.
- New tables use UUID or `generatedAlwaysAsIdentity()` keys. Existing serial keys are legacy compatibility and are not copied into new contracts without a reason.
- Business entities default to archive/soft-delete semantics. Immutable movement facts are never edited or deleted to correct history; corrections are compensating movements.
- Additive migration pattern: nullable/expand → backfill in batches → dual-read/write if necessary → verify → contract. Large indexes use the repository's concurrent/index timeout rules.
- Every migration sets a short lock timeout and has explicit up/down or retirement evidence as appropriate.
- Foreign keys are installed as `NOT VALID`, validated separately, and named explicitly when table size or production lock risk warrants it.
- Money is integer minor units plus currency in accounting-facing contracts. Inventory quantities and costs use exact PostgreSQL numeric/decimal representations.

### 2.5 Transaction, idempotency, and concurrency rules

- Every stock-affecting command runs in one database transaction.
- Lock the relevant stock projection rows in deterministic order before calculating availability or applying a movement.
- A movement is accepted only after re-reading the locked current state.
- A retry with the same `(org_id, idempotency_key)` returns the original result; a key reused with a different request hash fails deterministically; an in-flight duplicate returns the standard conflict response.
- Stock writes must be safe under concurrent receipt, adjustment, transfer, reservation, release, pick, shipment, return, and count-posting operations.
- Never update a balance based on a value read outside the transaction.
- Never use a background side effect with a committed request transaction handle. Use the existing post-commit/deferred transaction patterns.
- Every externally visible command emits a durable audit/event record after the domain write succeeds.

### 2.6 Scale and performance

- 250,000 active SKUs per tenant, including variants.
- 1,000 warehouses/locations per tenant.
- 10 million stock movements per tenant without unbounded reads.
- 100,000-row imports with resumable validation and row-level errors.
- All live lists are cursor-paginated with a hard cap of 100 rows per page.
- Every query selects explicit columns and leads indexes with tenant scope where applicable.
- No N+1 reads, unbounded JSONB scans, leading-wildcard search on high-volume lists, or request-path wildcard cache scans.
- P95 list and dashboard reads under 500 ms on representative indexed fixtures; stock commands have measured lock/transaction budgets.
- High-volume append-only tables have a documented partition decision before production-scale growth.

### 2.7 Vertical packs and market boundaries

InventoryOS has one core ledger and configurable vertical packs. The first product boundary is India-first inventory management across general warehouse, kirana/retail, and India pharmacy workflows; packs add policy, fields, validation, events, and views without forking the SKU model.

- Kirana/retail adds loose-versus-packed UOM, weighing-scale edge capture, fast barcode/alias search, mixed-rate carts, offline bill outbox/sync conflict handling, UPI/payment status hooks, and store-scoped operations.
- India GST support stores HSN/tax/document data and supports regular/composition policy modes. IRP/e-invoice, NIC e-way, and Tally are explicit request/response or accounting adapters; they are not the inventory ledger and their current legal thresholds/configuration require a compliance review before enablement.
- Medical/pharmacy adds batch-aware receiving, MRP/purchase-rate snapshots, enforced FEFO with audited override, hard expired/recalled/quarantined blocks, near-expiry windows, GS1 scan parsing when enabled, pharmacist/quality roles, and reviewed H1/controlled-substance register behavior.
- Hospital formulary/ward/indent, patient charging, consignment implants, UDI/EPCIS, cold-chain sensor automation, and US/EU DSCSA/NMVS/VRS are extension packs, not first-release requirements.
- Channel webhooks are synchronization signals. The StreamlineOS ledger remains authoritative; adapters refetch current state, deduplicate deliveries, and preserve source evidence.
- HMAC, at-least-once delivery, retry/dead-letter behavior, basic AI reorder, channel connectors, and low-stock notifications are reliability/table-stakes capabilities, not product differentiation claims.

## 3. Users, roles, and scopes

The module uses existing StreamlineOS RBAC and adds only inventory-specific permission keys. Names below are the contract; exact role templates may grant subsets.

### 3.1 Roles

| Role | Intended responsibility | Default scope |
|---|---|---|
| Inventory administrator | Configure module, warehouses, policies, integrations, and emergency controls | All permitted warehouses in tenant |
| Inventory manager | Approve adjustments, transfers, purchasing, counts, holds, returns, and operational exceptions | Assigned warehouses or tenant-wide by grant |
| Warehouse supervisor | Run receiving, putaway, picking, packing, shipping, counts, and adjustments within approval limits | Assigned warehouses |
| Warehouse operator | Scan and execute assigned receiving/pick/pack/count tasks | Assigned locations/warehouse tasks |
| Planner/procurement | Maintain demand policies, suppliers, reorder rules, forecasts, and purchase proposals | Assigned warehouses/categories |
| Quality/traceability operator | Inspections, quarantine, lot/serial trace, expiry, holds, and recalls | Assigned warehouses/quality scope |
| Finance/auditor | Read valuation, movements, adjustments, source documents, reports, and audit exports | Tenant read scope; no operational writes |
| Read-only observer | Read approved operational views | Explicitly granted scope |

### 3.2 Permission families

Use the existing permission catalog and naming style. The final implementation must register, test, and expose these capabilities without inventing route-local strings:

```text
inventory:module:read
inventory:catalog:read
inventory:catalog:write
inventory:products:read
inventory:products:write
inventory:variants:read
inventory:variants:write
inventory:barcodes:read
inventory:barcodes:write
inventory:warehouses:read
inventory:warehouses:write
inventory:locations:read
inventory:locations:write
inventory:warehouse-scope:manage
inventory:stock:read
inventory:stock:adjust
inventory:stock:transfer
inventory:stock:post
inventory:stock:reconcile
inventory:reservations:read
inventory:reservations:write
inventory:procurement:read
inventory:procurement:write
inventory:procurement:approve
inventory:receiving:read
inventory:receiving:write
inventory:receiving:post
inventory:orders:read
inventory:orders:write
inventory:orders:approve
inventory:fulfillment:read
inventory:fulfillment:execute
inventory:returns:read
inventory:returns:write
inventory:returns:approve
inventory:quality:read
inventory:quality:write
inventory:quality:approve
inventory:traceability:read
inventory:planning:read
inventory:planning:write
inventory:reports:read
inventory:valuation:read
inventory:audit:read
inventory:audit:export
inventory:imports:write
inventory:exports:read
inventory:channels:manage
inventory:webhooks:manage
inventory:ai:read
inventory:ai:propose
inventory:ai:execute
```

No AI permission grants a permission it does not already have. `inventory:ai:execute` is never sufficient by itself to execute a business command; the underlying command permission, object scope, approval rule, confirmation, and idempotency requirements all still apply.

### 3.3 Scope behavior

- `all`: all inventory objects in the tenant.
- `warehouse`: only assigned warehouses and their locations.
- `location`: only explicitly assigned locations/tasks where supported.
- `team` and `own`: only where the underlying business rule genuinely defines ownership; never use them as a substitute for warehouse scope.
- `none`: deny without leaking object existence.
- Warehouse-scope changes are audited and invalidate relevant access caches.

## 4. Canonical domain model

The current database has a broad 66-table inventory surface. The end-state model is organized around facts, projections, documents, and policy—not around screens.

### 4.1 Master data

#### Item and SKU

- `item`: tenant-owned product family or stockable definition.
- `sku`: the uniquely identifiable inventory unit/variant; every stock movement references a SKU, never a display product name.
- `category`: tenant-scoped hierarchy with safe parent ownership.
- `uom`: unit catalog; exactly one base UOM per stockable SKU.
- `sku_uom_conversion`: product-specific conversion factor to base UOM with positive factor and precision rules.
- `barcode`: exclusive arc to item or SKU, tenant-unique, normalized, typed, optionally primary.
- `vendor_item`: vendor-specific SKU/code, lead time, MOQ, pack size, and cost history.

Canonical rules:

- SKU is the business identity used by stock, reservation, receiving, picking, and valuation.
- Product family metadata cannot be silently used as a SKU quantity.
- SKU codes and barcodes are tenant-unique and normalized for search/scanning.
- A service SKU cannot enter stock ledger flows.
- A discontinued SKU remains readable for history but cannot be used for new demand without an explicit override.

#### Facility

- `warehouse`: physical or logical inventory site.
- `location`: hierarchical zone/aisle/rack/bin/receiving/shipping/quarantine/scrap/transit/returns location.
- `warehouse_access`: explicit user-to-warehouse grant.
- Each location belongs to exactly one warehouse and tenant.
- Location capability flags determine whether it can receive, pick, sell/allocate, quarantine, or ship.

### 4.2 Stock facts and projections

#### Immutable movement ledger

The stock ledger is the authoritative movement history. A ledger row contains:

```text
tenant, movement_id, occurred_at, posting_date, actor,
sku, warehouse/location, lot/serial grain,
movement_type, quantity_delta, base_uom,
unit_cost, total_cost, source_document, idempotency_key,
quantity_before, quantity_after, metadata, correction_link
```

Movement types include receipt, opening balance, adjustment in/out, transfer out/in, reservation/release/consume where ledgerized, sale/ship, customer return, vendor return, count gain/loss, quarantine in/out, scrap, and approved correction.

Rules:

- Ledger facts are append-only.
- `quantity_after = quantity_before + quantity_delta` is verified in the transaction and by reconciliation tests.
- A negative quantity delta must not make on-hand negative unless the SKU and tenant policy explicitly allow it.
- A correction references the movement it corrects; editing the original fact is prohibited.
- Source pointers are audit metadata; critical relationships use real foreign keys/link tables.
- `created_at` is write time; `posting_date` is business date and is never inferred after posting.

#### Stock projection

The projection is rebuildable from ledger facts and holds only current operational state by:

```text
tenant + sku + location + lot? + serial?
```

It tracks at least:

```text
on_hand
committed
reserved
blocked
quality_hold
in_transit_in
in_transit_out
on_order
available_to_promise
average_cost
last_movement_at
```

The exact derived formula is:

```text
available_to_promise = on_hand
                     - committed
                     - blocked
                     - quality_hold
                     - outgoing allocation
```

All values are base UOM. The projection must expose a reconciliation version/time and can be rebuilt deterministically.

#### Invariants

The service and database enforce, as applicable:

- quantities have allowed precision and are not NaN/infinite;
- UOM conversion factors are positive;
- received, shipped, picked, reserved, released, and returned quantities cannot exceed their source demand unless an explicit policy allows overage;
- committed/reserved quantities cannot exceed eligible available stock;
- quality-held/blocked quantities cannot be sellable;
- serial-tracked stock has integer quantity and at most one physical unit per serial/location grain;
- lot/serial references belong to the same tenant and SKU;
- transfer source and destination are different valid locations;
- a movement's source document and actor are valid for the tenant;
- approval-required adjustments cannot post without an approval;
- closed/cancelled documents cannot be mutated except through an explicit compensating workflow;
- all dashboard/report totals reconcile to projection and ledger queries.

### 4.3 Commercial and warehouse documents

#### Procurement and receiving

Purchase order:

```text
DRAFT → PENDING_APPROVAL → APPROVED → SENT → PARTIALLY_RECEIVED
      → RECEIVED/CLOSED
      ↘ CANCELLED
```

Receiving/GRN:

```text
DRAFT → COUNTING/RECEIVING → QUALITY_REVIEW → POSTED
                                      ↘ REJECTED/QUARANTINED
      ↘ CANCELLED before posting
```

Receipt posting atomically:

1. validates PO state and remaining quantity;
2. validates UOM conversion and lot/serial data;
3. creates/links quality outcomes;
4. appends ledger movement(s);
5. updates stock projection and valuation layers;
6. updates PO/GRN quantities and status;
7. emits audit/event/outbox records;
8. returns an idempotent result.

#### Demand, reservations, and fulfillment

Sales/order demand:

```text
DRAFT → CONFIRMED → RESERVATION_PENDING → PARTIALLY_RESERVED/RESERVED
      → PICKED → PACKED → SHIPPED → CLOSED
      ↘ CANCELLED
```

Reservation rules:

- Reservation is a command against a locked projection, not a model suggestion.
- Strategy is tenant-configured: manual, auto-on-confirm, FIFO, or FEFO where eligible.
- Reservation is specific to SKU, warehouse/location, and lot/serial where required.
- Release and consume are idempotent and update both reservation state and projection atomically.
- Expired reservations are processed by a safe background sweep with audit evidence.

Picking/packing/shipping:

- Pick lists contain executable tasks and suggested/confirmed locations.
- Scanning validates barcode, SKU, location, lot, serial, and quantity.
- Short pick, substitution, damaged item, and wrong-location exceptions have explicit workflows.
- Shipment posting consumes eligible reservations and stock in one transaction.
- Package/load records are logistics facts and cannot silently change stock without the corresponding shipment command.

#### Transfers

```text
PENDING → RESERVED → IN_TRANSIT → COMPLETED
       ↘ CANCELLED
```

Transfer posting locks source and destination rows in deterministic order, carries quantity and cost, records lot/serial identity, prevents self-transfer, handles partial receipt explicitly, and never duplicates movement on retry.

#### Adjustments, counts, and returns

Adjustment:

```text
DRAFT → PENDING_APPROVAL → APPROVED → POSTED
      ↘ CANCELLED
```

Cycle count:

```text
PLANNED → COUNTING → REVIEW → POSTED
                  ↘ CANCELLED
```

Returns:

```text
DRAFT → APPROVED → POSTED
      ↘ CANCELLED
```

Every variance requires reason code, actor, evidence/notes, and approval according to policy. Count posting compares against a locked current projection and writes compensating ledger movements.

### 4.4 Quality, traceability, and valuation

- Lot identity is unique per tenant/SKU/lot number.
- Serial identity is unique per tenant/SKU/serial number and has a controlled lifecycle.
- Expiry policy supports block, warn, or allow; FEFO uses expiry only for eligible lots.
- Quality hold removes quantity from available-to-promise until released, returned, or scrapped.
- Inspections have explicit source, result, disposition, inspector, and completion state.
- Recall scope can be defined by SKU, lot, serial, receipt, customer shipment, or date range; impact queries are bounded and reproducible.
- Valuation supports the existing weighted-average/FIFO direction, but all cost layers must tie to stock movements and posting dates.
- COGS/valuation corrections are compensating entries and preserve historical cost evidence.

## 5. Backend contract

### 5.1 Route families

The final API may preserve existing route names for compatibility, but all new routes follow these resource families and descriptive route parameters:

```text
/inventory/products
/inventory/products/:productId/variants
/inventory/variants/:variantId/barcodes
/inventory/uom
/inventory/categories
/inventory/warehouses
/inventory/warehouses/:warehouseId/locations
/inventory/stock
/inventory/stock/movements
/inventory/stock/adjustments
/inventory/stock/transfers
/inventory/reservations
/inventory/purchase-orders
/inventory/purchase-orders/:purchaseOrderId/receive
/inventory/sales-orders
/inventory/sales-orders/:salesOrderId/reserve
/inventory/pick-lists
/inventory/shipments
/inventory/packages
/inventory/lots
/inventory/serials
/inventory/quality/inspections
/inventory/quality/holds
/inventory/quality/recalls
/inventory/returns
/inventory/counts
/inventory/reports
/inventory/valuation
/inventory/imports
/inventory/exports
/inventory/channels
/inventory/webhooks
/inventory/ai
```

GET routes never write. Mutating routes accept `Idempotency-Key` where the operation can be retried or has external effects.

### 5.2 Response contract

Every endpoint returns the existing API envelope and explicit projections. List responses contain:

```text
items, nextCursor, hasMore, appliedFilters, permission/scope state where relevant
```

Error responses distinguish:

- validation failure;
- unauthenticated;
- correct tenant but insufficient permission;
- object not found in tenant;
- conflict/state transition failure;
- idempotency replay/in-flight/mismatch;
- concurrency/retryable conflict;
- external integration failure;
- AI unavailable or credit exhausted.

No raw ORM rows, global user secrets, provider payloads, stack traces, or cross-tenant existence signals are returned.

### 5.3 Events and integrations

Inventory emits durable, versioned domain events for:

```text
product.created/updated/archived
warehouse.created/updated/archived
stock.movement.posted
stock.adjustment.approved/posted
stock.transfer.reserved/dispatched/completed
purchase-order.approved/sent
receiving.posted
reservation.created/released/consumed/expired
sales-order.confirmed/cancelled
pick.completed
shipment.shipped
return.posted
quality.hold.created/released
recall.opened/closed
count.posted
reorder.proposed/approved
stock.adjusted/reserved/committed/released
lot.created/near_expiry/expired/quarantined
allocation.completed
scan.captured
sync.outbox_accepted/conflict/offline_batch_applied
einvoice.registered/cancelled
ewaybill.generated
```

Events are tenant-scoped, idempotent, auditable, versioned, and delivered through the existing outbox/webhook conventions. Stock events include the ledger/projection evidence needed to explain the change. Channel inbound webhooks are treated as change signals and reconciled by refetching current state; they are never used alone to reconstruct the ledger. Outbound deliveries use raw-body HMAC signing, timestamps, constant-time verification, at-least-once delivery, deduplication, fast acknowledgement, durable retry for at least 24 hours, dead-letter visibility, and an admin alert before a subscription is disabled. The old webhook JSON array remains only during compatibility migration; normalized subscriptions are the end state.

External party, billing, accounting, deal fulfillment, AI, payment, GST/IRP, e-way, Tally, channel, scanner, and cron integrations use explicit adapters. Inventory does not expand the CRM scope. Payment events can commit or release an existing reservation, but payment providers are never treated as inventory systems of record.

## 6. Frontend contract

### 6.1 Required surfaces

The module must cover, using existing StreamlineOS shell and primitives:

- Inventory command center/dashboard
- Catalog/product list, detail, create/edit, variants, UOM, categories, barcodes
- Warehouse list/detail, location tree, access scope
- Stock by SKU/warehouse/location, movement history, adjustment, transfer
- Receiving/GRN workspace with barcode/lot/serial capture
- Purchase orders and supplier performance
- Sales-order demand, reservation state, pick lists, packing, shipment
- Lots/serials/expiry/quality holds/inspections/recalls
- Cycle counts and physical audits
- Valuation/costing/reconciliation reports
- Replenishment policies, forecasts, proposals, what-if simulation
- Imports/exports/jobs/errors
- Channels/3PL/webhooks
- AI operations brief, evidence drawer, explain/propose/confirm flows

### 6.2 Shared UX states

Every route and data component must specify:

- loading skeleton or loading state;
- empty state with a useful next action;
- error state with retry and safe explanation;
- permission-denied state distinct from empty;
- stale/offline/deferred state where relevant;
- unsaved changes warning;
- destructive/irreversible confirmation;
- success confirmation with resulting document/status;
- keyboard and screen-reader behavior;
- responsive behavior for warehouse/mobile workflows.

### 6.3 Interaction rules

- Filters, pagination, sort, selection, and tab state are URL-addressable where the current module convention expects it.
- Bulk selection is explicit, capped, scope-aware, and shows the exact affected count before execution.
- Bulk actions validate every row and return per-row outcomes; one invalid row must not silently become a successful mutation.
- Tables use explicit columns, stable sort, density consistent with StreamlineOS, and no hidden data dependencies.
- Scanners and mobile actions provide immediate feedback, duplicate-scan protection, retry-safe commands, and an accessible non-scanner alternative.
- AI actions show source evidence, generated timestamp, provider/model metadata, confidence/limitations, and the deterministic action that confirmation will invoke.

## 7. AI inventory control plane

### 7.1 Allowed AI capabilities

- Narrate deterministic stock/replenishment/expiry/vendor-delay evidence.
- Answer scoped operational questions from retrieved, permission-filtered evidence.
- Classify anomalies and suggest investigation paths.
- Compare replenishment scenarios.
- Draft reviewable purchase, transfer, or follow-up proposals.
- Summarize supplier performance and exception queues.

### 7.2 Prohibited behavior

- No direct SQL, arbitrary tool name, arbitrary route, arbitrary permission, or arbitrary quantity from model output.
- No model-created product/SKU/vendor/warehouse/lot/serial.
- No autonomous stock movement, purchase order, adjustment, recall, or permission change.
- No tenant data, secrets, auth claims, role membership, or unrelated personal data in prompts.
- No “confidence” presented as a guarantee; uncertainty and missing evidence are explicit.

### 7.3 AI execution contract

```text
deterministic query → access-filtered evidence snapshot → redaction/caps
→ shared AI gateway → strict Zod response → deterministic action resolver
→ permission/object/scope checks → human confirmation → idempotent command
→ audit/outbox → evidence-linked result
```

The existing shared AI gateway remains responsible for credits, usage, retries, fallback models, dedupe, latency, and audit. OpenRouter is configured as a provider through that gateway, not called directly from inventory features.

Persist or expose, as policy permits:

```text
evidence ids, evidence hash/version, feature, prompt/schema version,
provider/model, latency/tokens/cost, generated_at, actor, decision/outcome
```

AI response schemas must reject extra fields and validate every proposed action against server-owned enums. AI evals cover grounding, arithmetic, refusal, tenant isolation, warehouse scope, stale evidence, credit exhaustion, provider failure, prompt injection, and duplicate confirmation.

## 8. Import/export and data quality

Imports are jobs, not request-sized loops:

1. Create job with tenant, actor, file metadata, checksum, and idempotency.
2. Stream/parse bounded chunks.
3. Validate each row with strict Zod schemas.
4. Resolve references using tenant-scoped caches/batches.
5. Produce row-level errors with safe line numbers and codes.
6. Backfill/commit in bounded transactions.
7. Resume from a durable checkpoint.
8. Re-run safely with the same checksum/idempotency policy.
9. Publish a summary and downloadable error/export artifact.

Exports are permission- and scope-filtered, bounded, auditable, and asynchronous for large data. Secrets, internal fields, deleted records, and unauthorized warehouses never enter exports.

## 9. Audit, observability, and operations

Every command records actor, tenant, object, before/after or movement summary, source, reason, request/idempotency key, timestamp, and result. Audit events are queryable and exportable under the audit permission.

Metrics and alerts include:

- stock command success/conflict/retry rates;
- ledger-to-projection reconciliation failures;
- negative stock and orphaned reference counts;
- reservation leakage/expiry age;
- receiving/pick/shipment cycle time;
- import throughput/error rate/resume count;
- webhook delivery lag/failure;
- AI latency/tokens/cost/credit failures/grounding failures;
- RLS/authorization denials and unexpected 5xx;
- job age, dead-letter count, and outbox lag.

Health checks distinguish database unavailable, migration mismatch, queue/outbox unhealthy, and provider unavailable. AI or channel outages never block manual inventory operations.

## 10. Five-phase delivery plan

### Phase 1 — Trustworthy foundation and schema contract

**Build:** live-vs-Drizzle catalog reconciliation; canonical inventory contract; identity/tenant/composite FKs; RLS coverage; catalog/UOM/barcodes/categories; warehouse/location/scope foundations; vertical-pack flags; stock ledger/projection/invariants; idempotency; audit; imports/exports; baseline reports; dashboard facts; permission matrix; and golden fixtures. Establish exact/decimal quantity rules and the separation between valuation costing and physical allocation.

**Required validation:** strict Zod payload tests; migration forward/rollback rehearsal; schema parity; RLS as application role; cross-tenant object tests; duplicate/retry tests; quantity property tests; projection rebuild/reconciliation; concurrency tests for adjustments/transfers/reservations; typecheck/lint/unit/e2e.

**Exit gate:** no unexplained quantity changes; no cross-tenant references; every stock command idempotent; projection rebuild equals live projection; negative-stock policy explicit; all lists paginated; dashboard reconciles to reports; imports resume; missing/denied/error states are distinguishable.

> **Status 2026-09-05 — PARTLY MET (G1).** Proven: quantity integrity and imports resume
> (`golden-dataset`, `ledger-corrections`, `resumable-import` seeded specs, all green in the
> 51-suite run below); no cross-tenant references (`scope-matrix` seeded spec, plus
> `check:tenant-isolation` and `check:tenant-indexes` in `ci.yml`); negative-stock policy explicit
> (`inv_settings` flag, `observability/inventory-counters.ts`); all lists paginated
> (`check:unbounded-reads`, in `ci.yml`); dashboard reconciles (`operations-throughput`,
> `ops-brief`); missing/denied/error distinguishable (§12.7's ratchet, and the four 404s fixed by
> issue #42). **Not proven — two clauses.** "Every stock command idempotent" is §12.4 below. T17
> classified all 214 mutating routes and found the clause false by **40 routes** whose retry
> raises a second document; the number is now derived, ratcheted and bounded rather than
> unmeasured, but the clause itself is still not met. "Projection rebuild equals live projection" has **no seeded coverage at all**:
> its only spec, `src/modules/inventory/reconciliation/__tests__/reconciliation.db.spec.ts`, is
> `describe.skip` unless `INV_DB_TESTS=1`, and that variable is set in no workflow, no
> `.env.example` and no `.env.gates`. It has never run. Follow-up: T15, T17.

### Phase 2 — Warehouse execution

**Build:** receiving, putaway, barcode/GS1 scanning, lot/serial capture, quality-at-receipt, weighing-scale/loose-UOM edge capture, picking waves/tasks, short-pick/substitution exceptions, packing, shipments, loads, mobile/one-handed workflows, safe retry queue, offline outbox/conflict handling, and warehouse operational metrics.

**Required validation:** scan duplicate/replay tests; slow network and retry tests; lot/serial mismatch tests; partial receipt/pick/ship tests; mobile viewport/accessibility tests; warehouse scope tests; concurrent execution tests.

**Exit gate:** a receiver can post a GRN with traceability; a picker can finish a scoped task; every exception has an owner and resolution; stock, reservations, shipment, and audit agree.

> **Status 2026-09-05 — MET, with one ergonomic caveat (G2).** Every clause has a passing seeded
> spec in the 51-suite run below: GRN with traceability (`receiving`, `pack-receiving-seam`,
> `lot-genealogy`), a scoped pick finished (`picking-waves`, `putaway-tasks`, `scope-matrix`),
> exceptions owned and resolved (`pick-exceptions`, `allocation-override`), and the four records
> agreeing (`ship-atomicity`, `stock-events`, `order-to-ship`). **Caveat, not a gap in the gate:**
> "mobile/one-handed workflows" from this phase's Build list are pinned structurally by
> `rf-surface.test.ts` and `rf-surface-render.test.tsx` but have never been exercised on a real
> 375px device — issue #45 is blocked on a credential, not on code.

### Phase 3 — Planning and replenishment

**Build:** reorder policies, safety stock, lead time, MOQ/pack size, demand history, baseline forecasts, seasonality where measurable, supplier performance, projected availability, scenario simulation, proposal review, approval, and purchase-order creation.

**Required validation:** deterministic baseline/backtest fixtures; explainable arithmetic; stale/missing demand behavior; proposal idempotency; approval threshold tests; supplier/warehouse scope; no AI dependency for core calculation.

**Exit gate:** every recommendation includes evidence, horizon, assumptions, uncertainty, and a reviewable proposal; planners can simulate without mutating; approved proposals become normal idempotent commands.

> **Status 2026-09-05 — MET (G3).** Recommendations carry evidence, horizon and uncertainty
> (`demand-baseline`, `forecast-drift`, `forecast-persistence`, `lead-time`, `vendor-scorecard`,
> `atp`, all green in the 51-suite run below). Simulation does not mutate — `recall-simulate-execute`
> passes, and `inventory-idempotency-coverage.spec.ts:155` asserts that `recalls/simulate`
> deliberately takes **no** idempotency key because it writes nothing. Approved proposals become
> ordinary idempotent commands (`transfer-recommendation-approval`, `proposal-override`,
> `replenishment-po`, `po-batching`). No AI dependency in the core calculation: none of these
> specs touches the AI gateway.

### Phase 4 — Quality, traceability, and financial control

**Build:** quality inspections, holds, dispositions, expiry/FEFO, recalls, returns, cycle counts, physical audits, FIFO/weighted/standard valuation where supported, COGS linkage, reconciliation, period/posting controls, reproducible audit exports, and jurisdiction-configured medical controls. India pharmacy controls include hard expiry/recall/quarantine blocks, audited FEFO override, near-expiry windows, GS1 parsed identity where enabled, and reviewed H1/controlled-substance register exports. India GST/HSN/composition data and IRP/e-way adapter contracts are validated here; provider calls remain isolated adapters.

**Required validation:** forward/backward trace tests; quarantine availability tests; recall boundedness; serial uniqueness; lot expiry; valuation-to-ledger; count variance; accounting integration adapter; correction/rollback evidence.

**Exit gate:** a unit/lot traces from receipt to disposition/customer; holds cannot sell; recall impact is reproducible; valuation ties to movements; audit export can be regenerated.

> **Status 2026-09-05 — PARTLY MET (G4).** Four of five clauses proven by passing seeded specs in
> the 51-suite run below: forward/backward trace (`lot-genealogy`), holds cannot sell
> (`quality-hold`, `inspection-plan-receipt-hold`, `fefo-expiry`), recall impact reproducible
> (`recall-simulate-execute`), valuation ties to movements (`landed-cost`, `write-off`,
> `ledger-corrections`, `return-inspection`, `return-approval`). **"Audit export can be
> regenerated" is not proven.** Its dedicated spec,
> `src/modules/inventory/audit-export/__tests__/audit-export.db.spec.ts`, is `describe.skip`
> unless `INV_DB_TESTS=1` and has never run; the two seeded specs that touch an export endpoint
> (`lot-genealogy`, `pack-fields`) assert a single export, not that a prior export can be
> reproduced byte-for-byte. Follow-up: T15.

### Phase 5 — AI inventory control plane and integrations

**Build:** evidence-backed command center brief, scoped copilot, anomaly explanations, scenario narration, proposal preparation, evidence drawer, feedback/correction capture, OpenRouter provider configuration through the gateway, model fallback, eval harness, versioned outbound events, channel/payment/GST/e-way/Tally adapters, scanner sync contracts, and operational controls. Use partner translators for EDI/VAN requirements and keep hospital/DSCSA/cold-chain automation as separately approved extension packs.

**Required validation:** strict structured-output tests; prompt-injection tests; grounding/arithmetic/refusal evals; credit/provider failure; stale evidence; duplicate confirmation; tenant/warehouse scope; audit completeness; latency/cost budgets.

**Exit gate:** every answer cites evidence; every proposal maps to a deterministic command; no AI write occurs without the same permissions/approval/idempotency as a human; deterministic operations work when AI is down; eval thresholds are recorded.

> **Status 2026-09-05 — PARTLY MET (G5).** Four of five clauses proven by
> `src/modules/inventory/ai/evals/__tests__/inv-ai-evals.spec.ts` — ~31 cases across
> `golden | refusal | tenant | injection | malformed`, each category asserted non-empty, register
> and executed set asserted bidirectionally. It runs offline against a scripted gateway (no model
> call) under plain `pnpm test`, so evidence-citation, injection resistance, tenant scope and
> refusal are regression-locked; `ops-brief` passes in the seeded run; and deterministic operation
> without AI is the default, since no seeded spec in the 51-suite run touches the gateway.
> **"Eval thresholds are recorded" is NOT met.** `inv-ai-evals.spec.ts` does not import
> `EVAL_ACCEPTANCE` or `meetsGate`; it is pass/fail regression assertion, not a scored gate. The
> tier that does record thresholds — `evals/ai-eval-runner.ts:32` — has **no inventory suite**
> among its 13 `*.eval.spec.ts` files. No inventory number is written down anywhere. Follow-up: T21.

## 11. Ticket execution contract

The five phase READMEs contain the atomic ticket backlog. Each ticket must include:

```text
problem and user outcome
in-scope/out-of-scope files and routes
schema/API/UI changes
dependencies and migration order
permission and warehouse scope
Zod schemas and protected fields
database invariants/constraints
unit/integration/e2e/property/concurrency tests
manual/browser verification where visual
observability/audit requirements
rollback or compatibility behavior
acceptance criteria
evidence captured by Claude Code
```

Claude Code must:

1. Read this PRD, the relevant phase README, the schema audit, existing code, and nearby tests.
2. State the discovered contract and dependency graph before editing.
3. Make the smallest coherent vertical slice.
4. Add/update schema, service, controller, DTO/Zod, query keys, hooks, UI, permissions, audit, and tests together where applicable.
5. Run focused tests first, then typecheck/lint, then relevant integration/e2e/concurrency/browser checks.
6. Review the diff for tenant leaks, BOLA, protected-field acceptance, raw ORM exposure, N+1 queries, stale cache keys, missing error states, and migration lock risk.
7. Add micro-comments only where a reviewer needs an actionable explanation tied to a file/line.
8. Record incomplete checks honestly; never mark a ticket complete because the code compiles.
9. Commit in coherent slices with the ticket id and push the dedicated branch when a remote is available.
10. Open/update the review handoff with changed files, commands run, results, known risks, migration notes, and next ticket.

No bulk “hundreds of thousands” of duplicate tickets are required. Scale is proven with generated fixtures, property tests, representative datasets, load tests, and measurable exit gates. Create a new ticket only for a distinct behavior, dependency, defect, or measurable risk.

## 12. Definition of done for the entire module

InventoryOS is not complete until all of the following are true:

- The live catalog, Drizzle schema, migration journal, and schema contract tests agree.
- All inventory-owned tables have correct tenant path, composite relationships, lifecycle semantics, indexes, and approved RLS posture.
- The stock ledger is immutable, projection-rebuildable, reconciled, and concurrency-safe.
- All commands are strict-Zod validated, permissioned, scoped, transactional, idempotent, audited, and tested.
- Catalog, warehouses, receiving, procurement, demand, reservations, picking, packing, shipping, returns, quality, traceability, valuation, planning, reports, imports, exports, channels, webhooks, and AI are integrated end-to-end.
- CRM remains outside the product scope; only explicitly documented compatibility adapters remain.
- Every frontend route uses current StreamlineOS visual language and has complete loading/empty/error/denied/success/mobile/accessibility states.
- AI is evidence-grounded, provider-abstracted through the shared gateway, strictly schema-validated, human-confirmed for writes, and never required for deterministic operations.
- Unit, integration, e2e, property, concurrency, tenant-isolation, accessibility, browser, migration, reconciliation, load, and AI evaluation gates have recorded evidence.
- Rollback, backup/restore, migration, feature-flag, and cutover rehearsals pass on a disposable production-sized environment.
- The final branch is reviewable, all micro-comments are resolved or explicitly accepted, and the branch is pushed with a complete handoff.

### 12.1–12.11 — recorded status, 2026-09-05

Recorded by issue #44 on branch `feat/inventory-world-class-implementation`. Until this pass the
eleven criteria above and the five §10 exit gates carried **no status at all**, so the module's own
definition of done could be read as neither met nor unmet.

Three labels, and they mean exactly what they say. **Met** — the criterion as written is satisfied
and an artefact proves it. **Partly met** — the criterion as written is *not* satisfied; the clauses
that are proven are named, and so are the ones that are not. Partly met is a species of not-met and
is never rounded up. **Not met** — the criterion is not satisfied.

The rule applied throughout: **a gate that has never run is not met, however likely it is to pass.**
Several inventory specs exist, look authoritative, and are `describe.skip` in every run this
repository can currently perform. They are counted as absent.

Evidence is a command or a file. Where a run is cited it is this one unless stated otherwise:

```
DATABASE_URL=…/inv_t02_probe  APP_DATABASE_URL=streamline_app@…/inv_t02_probe
jest --config ./jest-e2e-seeded.json --forceExit --runInBand --testPathPattern="test/inventory/"
  → Test Suites: 51 passed, 51 total · Tests: 561 passed, 561 total · 2438 s · 0 failures
```

against `inv_t02_probe`, a database built cold to `REACHED_HEAD 630/630` twice, idempotently.
One caveat on that run: it selected its files before issue #38 landed
`stranded-transit-grain.seeded-e2e-spec.ts`, so it covers **51 of the now-52** inventory seeded
specs. That spec is not evidence for anything below.

| # | Criterion (§12) | Status | Evidence, or what is missing |
|---|---|---|---|
| 12.1 | Live catalog, Drizzle schema, journal and contract tests agree | **Partly met** | Proven: `src/db/cold-build-integrity.spec.ts` (13 tests, `EXIT=0`) holds journal↔filesystem, `NOT_JOURNALLED` is `[]`; `pnpm db:bootstrap` reaches `REACHED_HEAD 630/630` twice, idempotent; `check:migration-chain` / `check:migration-ledger` run in `ci.yml`. **Missing:** the live-catalog↔Drizzle half. Its only inventory spec, `inventory-schema-parity.db.spec.ts`, is `describe.skip` unless `INV_DB_TESTS=1` — set in no workflow, no `.env.example`, no `.env.gates`. Never run. → **T15** |
| 12.2 | Tenant path, composite relationships, lifecycle, indexes, approved RLS posture | **Partly met** | Proven: `check:tenant-indexes`, `check:scope-application`, `check:record-access`, `check:restrict-fks`, `check:tenant-isolation` all in `ci.yml`; eleven inventory isolation specs run under `pnpm test`; `scope-matrix` green in the run above. **Missing:** RLS *as the application role*. `inventory-rls.db.spec.ts` — the only spec that probes as a `NOBYPASSRLS` role — is `INV_DB_TESTS`-gated and has never run. `pnpm db:verify-rls` probes synthetic `rls_probe` tables and contains **zero** `inv_` table names. → **T15** |
| 12.3 | Ledger immutable, projection-rebuildable, reconciled, concurrency-safe | **Partly met** | Proven: immutability is enforced in the database, not asserted in prose — `migrations/0529_ledger_corrections_and_immutability.sql:67-113` installs `trg_inv_stock_transactions_no_restatement`, verified present on `inv_t02_probe`; `ledger-corrections.seeded-e2e-spec.ts:222-263` fires four raw `UPDATE`s and asserts each is refused. Concurrency: `stock-concurrency` seeded spec + `stock-level-locks.spec.ts`. Reconciliation is non-vacuous by construction — `golden-path.seeded-e2e-spec.ts:544` deliberately mutates to prove the report can fail. **Missing, two things.** "Immutable" is UPDATE-only: 0529 installs **no DELETE guard**, and says why (organisations cascade-delete into the table), so the ledger is no-restatement, not append-only. And projection **rebuild** has no seeded coverage; `reconciliation.db.spec.ts` is `INV_DB_TESTS`-gated and has never run. → **T15** |
| 12.4 | All commands strict-Zod, permissioned, scoped, transactional, **idempotent**, audited, tested | **Not met — but now measured** | The count of *known* non-retryable commands is still **zero**: issue #37 found five commands whose status guard stood in front of the claim it invalidated — `loads.dispatch`, `so-lifecycle.confirmSo`, `approveAdjustment`, `cancelTransfer`, and `so-fulfillment.pickSo`, the fifth found by the new ratchet on its first run — and all five are fixed (`310abf574`, `cd889bef7`). `idempotent-guard-placement.spec.ts` holds the line over the ~39 methods that claim a key (`EXIT=0`). **T17 replaced the hand list and classified the whole surface.** `MUST_TAKE_A_KEY` — 18 handler names typed out by hand — is deleted. The population is now derived from the controllers (`inventory-mutating-routes.ts`: **214** mutating routes across **71** controllers, **55** taking `@IdempotencyKey()`), and every route that does not take a key must carry a class and a reason in `inventory-command-classification.ts` or the check fails. An unclassified new route fails (`EXIT=1`, proven), a classification pointing at a deleted handler fails (`EXIT=1`, proven), and a route reaching a service method that declares an `idempotencyKey` parameter without taking one fails (`EXIT=1`, proven — this is the rule that would have caught `recalls.controller::create` on its first run rather than in review). **What the classification found: 'all commands are idempotent' is false by 40 routes.** Of the 159 unkeyed routes — 13 `NO_PERSISTENCE` (verified write-free), 88 `CONVERGING`, 14 `REPEATABLE_OPERATION`, 4 `CLAIMS_ITS_OWN_KEY`, and **40 `DUPLICATES_ON_RETRY`**: creates whose retry raises a second document (`products/create`, `purchase-orders/create`, `sales-orders/create`, `shipments/create`, `webhooks/create`, `landed-cost/addCharge`, `sales-orders/invoice`, and 33 more). Those 40 are recorded as findings and bounded by an assertion, not exempted. Adding a key to any of them is a separate change with its own retry test. The clause stays **not met** — but it is now measured, ratcheted, and cannot silently grow. → **T17 (classification landed), fixes still open** |
| 12.5 | Twenty domains integrated end-to-end | **Met** | The 51-suite / 561-test run above, `0` failures, covering all twenty named domains including the three easiest to omit: exports (`lot-genealogy`, `pack-fields`), webhooks (`carrier-status`, `receiving`, `stock-events`) and channels (`neo-golden-path`). Navigation now resolves too: `sidebar-nav-inventory-reachability.test.ts` asserts both directions over 56 nav hrefs and 86 routes, with all 30 orphans named. Recorded limit, not a gap in the criterion: on a pull request CI runs only the two golden paths (see 12.9). |
| 12.6 | CRM outside product scope; only documented compatibility adapters | **Met** | `grep -rn "from ['\"].*crm" src/modules/inventory/` and `grep -rln "crm_" src/modules/inventory/` both return nothing. Recorded limit: this is a fact about today's tree, not a held line — no ratchet asserts it, so nothing would fail if an import appeared tomorrow. |
| 12.7 | Every frontend route: current visual language + loading/empty/error/denied/success/mobile/accessibility | **Not met** | **Four of the seven states are ratcheted, three are not.** `app/(authenticated)/inventory/inventory-route-states.test.ts` (green, part of a 5-suite / 30-test `EXIT=0` run) requires loading, empty, error and denied across 86 routes, reads code rather than prose so a marker in a comment cannot pass a route, and carries anti-vacuity floors. Counts: **86 `page.tsx` / 85 `loading.tsx` / 2 `error.tsx`**, with five reasoned `NO_DATA_ROUTES` exemptions and one reasoned `LOADING_EXEMPT_ROUTES` entry (`inventory/pick-lists`, whose whole body is a `redirect()`). **Success, mobile and accessibility are unratcheted** — the ratchet's own header calls success "the only one anybody checks by hand". Accessibility is the sharpest: eleven files use `test-utils/axe.ts` and **none of them is inventory**. Visual language is held only by repo-wide gates (`check:colors`, `check:empty-states`, `check:icon-labels`, all `EXIT=0`), nothing inventory-specific. → **T18** |
| 12.8 | AI evidence-grounded, provider-abstracted, schema-validated, human-confirmed, never required | **Partly met** | Proven: `inv-ai-evals.spec.ts` (~31 cases, `golden \| refusal \| tenant \| injection \| malformed`) runs offline under plain `pnpm test`; inventory makes no direct OpenRouter call. **Missing:** no recorded threshold — see the Phase 5 gate above. → **T21** |
| 12.9 | Twelve gate types have recorded evidence | **Not met** | Four of twelve have **no** inventory evidence and no way to produce it today; two more exist but have never run. Table below. Separately: **no CI run has touched this branch since 2026-09-01.** → **T16, T20** |
| 12.10 | Rollback, backup/restore, migration, feature-flag and cutover rehearsals on a disposable production-sized environment | **Not met** | Migration is the only one rehearsed: `pnpm db:bootstrap` to `REACHED_HEAD 630/630`, twice, on the disposable `inv_t02_probe`. It is **forward-only**, and that database is empty — not production-sized. **Rollback: nothing executes a `.down.sql` anywhere in the repo.** `check:migration-rollback` passes `EXIT=0` but is static, and its baseline cutoff is **839** — all **65** inventory migrations sit at or below it, so the gate enforces **zero** of them while reporting green. Backup/restore: `drill:pitr` exists, unrun here, needs credentials. Feature flags: defaults are documented in `inventory-neo-handoff.md` §7 and `check:feature-flag-governance` exists. **Cutover: no rehearsal exists at all.** → **T19** |
| 12.11 | Branch reviewable, micro-comments resolved, pushed with a complete handoff | **Partly met** | Both branches are clean and pushed — frontend `3bbdfabe7`, backend `333e45e12`, each equal to its `origin/` ref; PRs frontend#32 and backend#16 are open against `main`. **Missing:** the handoff is not yet complete. `docs/inventory-neo-handoff.md` §6 described three defects as open that had been fixed for five days (issue #36), and the closing SHA list is still an empty placeholder. Issue #47 owns this and is open. |

#### 12.9 in detail — the twelve gate types

| Gate | Inventory evidence | Verdict |
|---|---|---|
| unit | ~127 inventory spec paths under the root jest config; runs in `pnpm test` | **Recorded** |
| integration | 7 inventory `.db.spec.ts` files — all `describe.skip` unless `INV_DB_TESTS=1`, which is set nowhere | **Never run** |
| e2e | 52 seeded specs; 51 green in the run above | **Recorded** |
| property | `fast-check` / `jsverify` return **zero** hits in `pnpm-lock.yaml`; no `fc.assert` / `fc.property` anywhere | **Absent repo-wide** |
| concurrency | `stock-concurrency.seeded-e2e-spec.ts` (green), `stock-level-locks.spec.ts` | **Recorded** |
| tenant-isolation | 11 unit isolation specs + `scope-matrix` + `check:tenant-isolation` in CI; but the only as-app-role RLS proof is `INV_DB_TESTS`-gated | **Recorded, weakest tier missing** |
| accessibility | Backend: no `axe` anywhere. Frontend: 11 users of `test-utils/axe.ts`, **none inventory** | **Absent for inventory** |
| browser | `browser-driver.mjs` exists; `BROWSER_CANDIDATES` is two hard-coded **Windows** paths, target URL is the app root, no inventory route, in no workflow. No Playwright/Puppeteer/Cypress | **Absent for inventory** |
| migration | `cold-build-integrity.spec.ts` + `check:migration-chain` / `-ledger` / `-discipline` in CI; cold build 630/630 | **Recorded (forward only)** |
| reconciliation | Non-vacuity proven at `golden-path…:544`; the rebuild spec is `INV_DB_TESTS`-gated | **Partly; rebuild never run** |
| load | `load:drive` workloads contain **zero** `inventor\|stock\|warehouse` hits. The 9 inventory read-cost budgets are single-query `EXPLAIN`, not load, and are in no workflow | **Absent for inventory** |
| AI evaluation | `inv-ai-evals.spec.ts` runs by default — but records no threshold; the scored `evals/` tier has no inventory suite | **Recorded, unscored** |

#### And none of it runs in CI

Verified rather than assumed, because "we have a ratchet" and "a ratchet runs" are different claims.

Both jest configs would in fact reach these ratchets: the backend's root config takes
`roots: [src]` with `testRegex .*\.spec\.ts$`, and the frontend's `next/jest` default picks up
`*.test.ts` anywhere. Both `pnpm test` invocations sit in a workflow. The failure is upstream of that.

- `gh run list --branch feat/inventory-world-class-implementation` — the **last run on either
  repo's branch is 2026-09-01**. Backend head is now `333e45e12`, a dozen or so commits later. Every
  ratchet this programme added post-dates the last CI run, so **none has ever executed in CI**.
- `gh pr checks 16 --repo Startupppp/streamlineos-backend` → `no checks reported`.
  `gh pr checks 32 --repo Startupppp/streamlineos-frontend` → one check, Vercel, failing on a
  plan restriction.
- In the last run that did happen (backend `33489746534`, head `1dc1c85a7`), the `verify` job
  **failed at `Lint` and never reached `Test`** — so even then no ratchet ran. `tenant-isolation`
  and `live-evals` were `skipped` (schedule/dispatch only). Only `golden-path` succeeded, and its
  pattern selects three specs of 52.

## 13. Current implementation context

> **SUPERSEDED 2026-09-05.** This section describes the tree as it stood on 2026-08-27, before
> waves A–G. Its first bullet is now false in both halves. The original text is kept below,
> struck through, because it is the baseline the delivery plan was written against and deleting it
> would make the plan look like it had been aimed at today's schema. The correction follows it.

- ~~The live database currently has 66 `inv_*` tables and only 40 seeded reason-code rows; all other inventory tables are empty at audit time.~~

  **Corrected 2026-09-05.** There are **101** `inv_*` tables, and `inv_reason_codes` no longer
  exists.

  - **101, not 66 — and not the 106 this programme's own working notes carried.** 106 is what an
    unescaped `LIKE 'inv_%'` returns: in `LIKE`, `_` is a single-character wildcard, so the pattern
    also matches `invoices`, `invoice_items`, `invitations`, `invitation_events` and
    `investment_proofs` — five tables that have nothing to do with inventory. Escaped, the count is
    101 on both databases checked:

    ```sql
    select count(*) from pg_tables
     where schemaname = 'public' and tablename like 'inv\_%';
    ```

    → `101` on `inv_t02_probe` (the cold build at `REACHED_HEAD 630/630`, 941 tables total)
    → `101` on the live Neon branch in `.env` (945 tables total), read-only

  - **`inv_reason_codes` is gone, so "40 seeded reason-code rows" no longer names anything.**
    `migrations/0589_inventory_drop_reason_codes.sql` drops it. Confirmed absent on both databases
    (`select to_regclass('public.inv_reason_codes')` → `ABSENT`). The drop is **conditional**, and
    that detail matters to anyone reading this on a third database: 0589 declines to drop the table
    if it holds any rows, precisely so a deployment whose organisations predate `0407` does not lose
    somebody's configuration to a migration written from an empty database. So the table can still
    exist elsewhere — but not with rows anything reads, since nothing in the application has ever
    read it.

  - "All other inventory tables are empty at audit time" was true of the audit database and is not
    a statement about any current one.
- The detailed schema findings and safe rebuild boundary are in [the inventory schema audit](/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/docs/inventory-schema-audit-2026-08-27.md).
- The first existing UI slice is the on-demand AI Operations Brief; it is not evidence that the full module is complete.
- The next backend implementation gate is schema/catalog reconciliation before any v2 migration generation.
- OpenRouter is supported through the existing shared AI gateway; direct inventory-specific OpenRouter calls are prohibited.
