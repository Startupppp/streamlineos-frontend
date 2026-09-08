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
> `ledger-corrections`, `return-inspection`, `return-approval`).
>
> **Re-recorded 2026-09-05 (T15): the fifth clause now has a running spec, and it found a defect.**
> `audit-export.db.spec.ts` is default-on and green (`EXIT=0`): the warehouse predicate really
> excludes another warehouse's movements, the checksum is unmoved by the annotation columns 0529
> still allows to change, and a fact column cannot be moved at all (`23514`, "append-only"). The
> settlement half was wrong. `isEvidenceSettled` compared `pg_snapshot_xmin` against a pinned
> `pg_snapshot_xmax`, and a snapshot's `xmax` is `latestCompletedXid + 1` — a *running* transaction
> can hold an xid equal to it, which was reproduced here — so a pin could be called settled while a
> row below the ledger ceiling was still able to commit, and a regenerated export would not match.
> `pinEvidence` now pins `GREATEST(pg_current_xact_id(), pg_snapshot_xmax(...))`, which is strictly
> above every id assigned before the pin, and the spec holds a genuinely concurrent writer open to
> prove it. Still not proven: that two exports of the same window are byte-for-byte identical
> *through the endpoint* — the checksum stability is asserted at the document layer, not end to end.

### Phase 5 — AI inventory control plane and integrations

**Build:** evidence-backed command center brief, scoped copilot, anomaly explanations, scenario narration, proposal preparation, evidence drawer, feedback/correction capture, OpenRouter provider configuration through the gateway, model fallback, eval harness, versioned outbound events, channel/payment/GST/e-way/Tally adapters, scanner sync contracts, and operational controls. Use partner translators for EDI/VAN requirements and keep hospital/DSCSA/cold-chain automation as separately approved extension packs.

**Required validation:** strict structured-output tests; prompt-injection tests; grounding/arithmetic/refusal evals; credit/provider failure; stale evidence; duplicate confirmation; tenant/warehouse scope; audit completeness; latency/cost budgets.

**Exit gate:** every answer cites evidence; every proposal maps to a deterministic command; no AI write occurs without the same permissions/approval/idempotency as a human; deterministic operations work when AI is down; eval thresholds are recorded.

> **Status 2026-09-05 — MET (G5), all five clauses.** Four clauses are proven by
> `src/modules/inventory/ai/evals/__tests__/inv-ai-evals.spec.ts` — 31 cases across
> `golden | refusal | tenant | injection | malformed`, register and executed set asserted
> bidirectionally. It runs offline against a scripted gateway (no model call) under plain
> `pnpm test`, so evidence-citation, injection resistance, tenant scope and refusal are
> regression-locked; `ops-brief` passes in the seeded run; and deterministic operation without AI
> is the default, since no seeded spec in the 51-suite run touches the gateway.
>
> **"Eval thresholds are recorded" is now met.** T21 put ten inventory numbers in
> `EVAL_ACCEPTANCE` (`evals/ai-eval-runner.ts`) and had `inv-ai-evals.spec.ts` assert through
> `meetsGate`: five rate gates (`INVENTORY_GOLDEN_GROUNDING_RATE`, `_REFUSAL_RATE`,
> `_TENANT_SCOPE_RATE`, `_INJECTION_RESISTANCE_RATE`, `_MALFORMED_REJECTION_RATE`, all **1.0**)
> and five corpus floors (`INVENTORY_MIN_*_CASES` = 8/4/7/7/5, set AT the measured counts). Every
> rate is 1.0 on purpose and that is the recorded position, not a placeholder: the other products'
> figures sit under 1.0 because their criteria are measurements of an extractor, whereas
> inventory's five are safety properties of the server — an answer cites evidence or it does not,
> a warehouse predicate binds the caller's assignment or it does not. There is no honest tolerance
> to spend. One report is scored per category, because `meetsGate` divides by `report.total` and a
> single blended report would measure seven injection cases against thirty-one.
>
> **The `meetsGate` defect this ticket found is fixed.** `evals/ai-eval-runner.ts` used to
> `continue` past a threshold whose criterion was absent from the report and return `true` for an
> empty one, so a mistyped key was a green gate measuring nothing — four suites carried a
> hand-written `expect(Object.keys(report.byCriterion))` beside their call because of it. It now
> throws on a missing criterion, on a non-finite threshold (a mistyped catalog key reads as
> `undefined`, and every comparison against `undefined` is false), and on an empty report;
> `gatesPresentIn` is the explicit form for the eleven call sites that deliberately hand it the
> whole catalog. Five permanent unit tests in `evals/scorers.unit.spec.ts` pin all three holes.
> Proven to bite: mistyped key past `tsc` → `meetsGate` throws (`EXIT=1`); mistyped key without a
> cast → `TS2820` (`EXIT=2`); threshold deleted from the catalog → `TS2322` (`EXIT=2`); corpus
> floor above the real count → red (`EXIT=1`); one injection case regressed → the injection rate
> gate red (`EXIT=1`). Follow-up: T21 (done).

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
| 12.1 | Live catalog, Drizzle schema, journal and contract tests agree | **Partly met** | Proven: `src/db/cold-build-integrity.spec.ts` (13 tests, `EXIT=0`) holds journal↔filesystem, `NOT_JOURNALLED` is `[]`; `pnpm db:bootstrap` reaches `REACHED_HEAD 630/630` twice, idempotent; `check:migration-chain` / `check:migration-ledger` run in `ci.yml`. **Re-recorded 2026-09-05 (T15): the live-catalog↔Drizzle half now runs.** `inventory-schema-parity.db.spec.ts` is no longer flag-gated — the tier runs on the presence of `DATABASE_URL` and skips loudly by name without one (`src/test/db-spec-gate.ts`), `pnpm test:db` runs it, and `ci.yml` runs that in `golden-path`. Measured against a migrated `inv_agents_0905`: `EXIT=0`, and its first real run found two `inv_*` tables (`inv_projects`, `inv_project_requirements`) with row-level security switched off — fixed by migration `0911`. `pnpm check:db-spec-gates` fails when a database spec is gated on a variable nothing sets (bite proven, `EXIT=1` → `EXIT=0`). Remaining gap is elsewhere in the criterion, not here. |
| 12.2 | Tenant path, composite relationships, lifecycle, indexes, approved RLS posture | **Partly met** | Proven: `check:tenant-indexes`, `check:scope-application`, `check:record-access`, `check:restrict-fks`, `check:tenant-isolation` all in `ci.yml`; eleven inventory isolation specs run under `pnpm test`; `scope-matrix` green in the run above. **Re-recorded 2026-09-05 (T15): RLS as the application role is now proven.** `inventory-rls.db.spec.ts` runs (`EXIT=0`, 17 probes) against `streamline_app` (`rolbypassrls = f`) over seven representative `inv_*` tables — no tenant context denies `42501`, the wrong tenant returns nothing, a cross-tenant write is refused by `WITH CHECK`. Two defects came out of the first real run: the suite had been opening a single connection on `DATABASE_URL` and applying `SET LOCAL ROLE` only when `APP_DATABASE_URL` was *absent*, so supplying the deployed role ran every probe as the BYPASSRLS owner — caught by its own anti-vacuity test; and `inv_projects` / `inv_project_requirements` had no policy at all (migration `0911`). `pnpm db:verify-rls` is still synthetic-only; the `inv_` evidence is this spec. |
| 12.3 | Ledger immutable, projection-rebuildable, reconciled, concurrency-safe | **Partly met** | Proven: immutability is enforced in the database, not asserted in prose — `migrations/0529_ledger_corrections_and_immutability.sql:67-113` installs `trg_inv_stock_transactions_no_restatement`, verified present on `inv_t02_probe`; `ledger-corrections.seeded-e2e-spec.ts:222-263` fires four raw `UPDATE`s and asserts each is refused. Concurrency: `stock-concurrency` seeded spec + `stock-level-locks.spec.ts`. Reconciliation is non-vacuous by construction — `golden-path.seeded-e2e-spec.ts:544` deliberately mutates to prove the report can fail. **Missing, two things.** "Immutable" is UPDATE-only: 0529 installs **no DELETE guard**, and says why (organisations cascade-delete into the table), so the ledger is no-restatement, not append-only. **Re-recorded 2026-09-05 (T15): projection rebuild is now covered, and it was broken.** `reconciliation.db.spec.ts` runs (`EXIT=0`). Its first real run found that `reconciliationQueries.rebuild`'s `ledger` CTE was still grouped on the five-column grain while its three correlated subqueries referenced `l.handling_unit_id` and `l.ownership` — so the statement failed to parse (`42703 column l.handling_unit_id does not exist`) on **every call for every organisation**, and "projection-rebuildable" had never been true. NEO-4/NEO-11 widened `bucketDrift`'s copy of that CTE and missed this one. Fixed; the rebuild, its no-op repeat and the five drift checks now pass against Postgres. The DELETE-guard gap above is unchanged. |
| 12.4 | All commands strict-Zod, permissioned, scoped, transactional, **idempotent**, audited, tested | **Met — verified 2026-09-08** | The count of *known* non-retryable commands is still **zero**: issue #37 found five commands whose status guard stood in front of the claim it invalidated — `loads.dispatch`, `so-lifecycle.confirmSo`, `approveAdjustment`, `cancelTransfer`, and `so-fulfillment.pickSo`, the fifth found by the new ratchet on its first run — and all five are fixed (`310abf574`, `cd889bef7`). `idempotent-guard-placement.spec.ts` holds the line over the ~39 methods that claim a key (`EXIT=0`). **T17 replaced the hand list and classified the whole surface.** `MUST_TAKE_A_KEY` — 18 handler names typed out by hand — is deleted. The population is now derived from the controllers (`inventory-mutating-routes.ts`: **214** mutating routes across **71** controllers, **55** taking `@IdempotencyKey()`), and every route that does not take a key must carry a class and a reason in `inventory-command-classification.ts` or the check fails. An unclassified new route fails (`EXIT=1`, proven), a classification pointing at a deleted handler fails (`EXIT=1`, proven), and a route reaching a service method that declares an `idempotencyKey` parameter without taking one fails (`EXIT=1`, proven — this is the rule that would have caught `recalls.controller::create` on its first run rather than in review). **T17 found the clause false by 40 routes; T23 and T24 closed it — re-recorded 2026-09-08.**

**T23 (#56) — three of the forty were never broken.** The census read only the `@IdempotencyKey()` parameter and could not see `@Idempotent(...)`, the metadata the global `IdempotencyInterceptor` acts on. Thirteen inventory routes carry it. Three of them — `purchase-orders::create`, `projects::create`, `projects::addRequirement` — had been swept into `DUPLICATES_ON_RETRY` and given hand-written reasons describing a duplicate a fenced route cannot produce. The walk now reads both mechanisms (`isCovered`), a fenced route classified as duplicating fails the suite (bite proven, `EXIT=1` → `EXIT=0`), and a broken decorator walk trips a floor instead of reporting zero (bite proven). 40 → 37.

**T24 (#57) — the remaining 37 are fenced.** Every one carries `@Idempotent("inventory.<area>.<command>")`; `DUPLICATES_ON_RETRY` is now empty and the bound is an equality in both directions, so a route cannot regress *or* be quietly reclassified into the bucket instead of fixed. Proven at the HTTP seam by `test/inventory/idempotent-create-replay.seeded-e2e-spec.ts` (4 tests, `EXIT=0` against `inv_t02_probe`): same key + same body replays the first response and leaves one row; same key + different body → 422; a fresh key still creates, so the fence has not made a create a singleton. Removing one fence fails the spec (`EXIT=1`, restored `EXIT=0`).

**What removing a fence actually does — and why the original reason was wrong for half of them.** T17 recorded all forty as "a retry raises a second document". Measured, there are two modes: where the table has a tenant-scoped unique index on a *user-supplied* natural key (`inv_products(org_id, sku)`, `inv_warehouses`, `inv_vendors`, `inv_carriers`, `inv_channels`) the retry gets **409 "already exists"** — no duplicate, but a client that succeeded is told it failed, which is the PEND-IDEM shape exactly; where the number is *server-generated* or absent (`inv_sales_orders`, `inv_shipments`, `inv_loads`, `inv_packages`, `*_returns`, `inv_cycle_counts`, `inv_webhooks`) the second document is real. The fence is the right fix for both, so the wrong reasons did not make the work wrong — but "37 routes duplicate" overstated the first mode, and the count was never the interesting number.

**The cost, stated plainly:** `@Idempotent` makes the header *required*, so these 37 routes now answer a keyless caller with 400. The web client is unaffected — `frontend/lib/api-client.ts:142-144` mints a key on every mutating request — and a spec asserts that 400 rather than leaving it to be found in production. That same auto-mint is why the fence still does nothing for a real double-submit: the browser mints a *fresh* key per attempt, so the second press is a different command. **§12.4 is met on both halves as of 2026-09-08.** The browser half (#58, T25) shipped: `useIdempotentMutation` scopes the key to the operator's intent, retiring it on success and on a payload change, and a ratchet fails if an inventory hook posting to a fenced route falls back to the per-fetch key `api-client` mints. It found two call sites my own enumeration had missed. The 53 `CONVERGING` POST exemptions remain argued rather than read — #59 (T26). → **Met (server-side)** |
| 12.5 | Twenty domains integrated end-to-end | **Met** | The 51-suite / 561-test run above, `0` failures, covering all twenty named domains including the three easiest to omit: exports (`lot-genealogy`, `pack-fields`), webhooks (`carrier-status`, `receiving`, `stock-events`) and channels (`neo-golden-path`). Navigation now resolves too: `sidebar-nav-inventory-reachability.test.ts` asserts both directions over 56 nav hrefs and 86 routes, with all 30 orphans named. Recorded limit, not a gap in the criterion: on a pull request CI runs only the two golden paths (see 12.9). |
| 12.6 | CRM outside product scope; only documented compatibility adapters | **Met** | `grep -rn "from ['\"].*crm" src/modules/inventory/` and `grep -rln "crm_" src/modules/inventory/` both return nothing. Recorded limit: this is a fact about today's tree, not a held line — no ratchet asserts it, so nothing would fail if an import appeared tomorrow. |
| 12.7 | Every frontend route: current visual language + loading/empty/error/denied/success/mobile/accessibility | **Met — verified 2026-09-08** | **All seven states are ratcheted, and each ratchet was proven to bite.** The previous record ("four of the seven states are ratcheted, three are not", "eleven files use `test-utils/axe.ts` and **none of them is inventory**") described the state *before* T18 landed, and was stale: no new ratchet was needed for this criterion, only verification. **loading / empty / error / denied** — `inventory-route-states.test.ts`, unchanged, reads code not prose, with anti-vacuity floors. **success** — `tells the reader a write landed on every route that writes` floors the writing population at >40 routes and requires each exemption to *still write* and carry a reason over 80 characters. Bite-proven: a route added under `inventory/` calling `useMutation` with no success marker failed the assertion **by name** (`EXIT=1`); removed, `EXIT=0`. **mobile** — `never pins an inventory route wider than the device it has to fit` walks every route file for `w-[<n>px]` past `DEVICE_WIDTH = 375`, floors the route count at >40, and re-reads each exemption's claim (a wide table inside an explicit `overflow-x-auto`) from the file rather than trusting it. Bite-proven: `w-[900px]` in `inventory/stock/page.tsx` → `EXIT=1`; reverted, `EXIT=0`. It is a source check, not a layout claim — jsdom has no layout. **accessibility** — `inventory-a11y.test.tsx` runs real axe over 11 inventory surfaces including both RF runners and the denied states (22 tests). Bite-proven: an `<img>` with no `alt` on the module landing page failed three cases with `image-alt` (`EXIT=1`); reverted, `EXIT=0`. **visual language** — still held by the repo-wide gates (`check:colors`, `check:empty-states`, `check:icon-labels`, all `EXIT=0`), but their *reach into inventory* is now measured rather than assumed: `text-[#ff00aa]` in `features/inventory/components/inventory-dashboard-client.tsx` made `check:colors` `EXIT=1` and named the file; reverted, `EXIT=0`. Full re-run at close: 2 suites / 37 tests `EXIT=0`, three visual gates `EXIT=0`. → **T18, verified T31** |
| 12.8 | AI evidence-grounded, provider-abstracted, schema-validated, human-confirmed, never required | **Met** | Proven: `inv-ai-evals.spec.ts` (31 cases, `golden \| refusal \| tenant \| injection \| malformed`) runs offline under plain `pnpm test`; inventory makes no direct OpenRouter call. **T21 recorded the thresholds that were missing:** ten inventory keys in `EVAL_ACCEPTANCE` — five rate gates at 1.0 and five corpus floors at the measured case counts — asserted through `meetsGate`, one report per category. It also fixed `meetsGate` itself, which skipped a threshold whose criterion was absent and passed an empty report, so a mistyped key was a green gate checking nothing; it now throws on a missing criterion, a non-finite threshold and an empty report, with five unit tests pinning each. → **T21 (done)** |
| 12.9 | Twelve gate types have recorded evidence | **Partly met** | **Re-recorded 2026-09-05 (T16): the twelve-gate half is settled.** Eleven of twelve now carry evidence with a recorded `EXIT=`, and the twelfth is a reasoned exemption with a spec that fails the day its cause goes away. Of the four that had none: `property` and `load` were built here, `accessibility` was built by T18 the same day and is re-verified rather than duplicated, and `browser` is the exemption — because an inventory browser gate needs a running authenticated app that nothing in either repository can produce non-interactively, and a gate only one laptop can run by hand would be the third gate this programme has found passing while measuring nothing. The two that existed but had never run (`tenant-isolation`'s as-app-role tier and `reconciliation`'s rebuild) were run by T15, and both found defects. Table below. **What is still not met is the other half of this criterion, and it is not T16's:** `browser` is not evidence, and CI. → **T20** |
| 12.10 | Rollback, backup/restore, migration, feature-flag and cutover rehearsals on a disposable production-sized environment | **Not met** | Migration is the only one rehearsed: `pnpm db:bootstrap` to `REACHED_HEAD 630/630`, twice, on the disposable `inv_t02_probe`. It is **forward-only**, and that database is empty — not production-sized. **Re-recorded 2026-09-05 (T19): rollback is now rehearsed, and rehearsing it found three defects.** `pnpm drill:rollback` (`src/scripts/rehearse-migration-rollback.mjs`) executes rollbacks rather than counting files, in two tiers. Tier 1 round-trips the contiguous suffix at the top of the chain — down, then forward — and requires the inventory schema fingerprint (columns, indexes, constraints, policies) to return exactly; **2 migrations reversed and restored for real**, `EXIT=0`. Tier 2 executes every other inventory `.down.sql` against the live schema inside a transaction that is discarded: **all 11 of the previously-unrun files execute, and each changes the schema** — a `DROP … IF EXISTS` that reverses nothing is reported as a no-op, not a pass. Findings: `0909_build_common_actor_validate.down.sql` **cannot execute and never could** (`0A000` — its 29 `ALTER CONSTRAINT … NOT VALID` statements are not a thing PostgreSQL supports), which is also why tier 1 stops at 0910; reverting `0910` **silently rewrites data** (measured: a `VENDOR`-owned quality hold came back `OWNED`, `handling_unit_id` NULL — the file now carries `-- @data-loss: inv_quality_holds` and undeclared loss fails the drill); and `0910` had **no rollback file at all**, which had the gate red on this branch. `check:migration-rollback` now prints the census of what its PASSED exempts — 598 of 632 migrations below the 839 cutoff, 51 inventory migrations of which 13 have a rollback and **38 pass only by the cutoff** — and ratchets that 38 so it can only shrink. Four bite proofs recorded (`EXIT=1` → `EXIT=0` each). Wired: `drill:rollback:self-test` in `ci.yml`, the full drill in `cell-cold-bootstrap.yml` against the cell it just rebuilt. **Re-recorded 2026-09-08 (§12.10, dataset): the rehearsal now runs production-sized, and making it so found two defects in the drill itself.** `src/scripts/seed-inventory-rollback-drill.sql` seeds a mid-size tenant into the disposable database — **57,707 inventory rows across 11 populated tables** (9,001 products, 27,001 variants, 18,000 stock levels, 2,500 quality holds, 400 projects, 721 locations) in 2.6s, on deterministic natural keys so re-running tops it up rather than doubling it. The full drill against it is `EXIT=0` in **1 second**: *"all 57707 digested inventory rows survived, byte for byte"*, *"2 reversed and restored, fingerprint returned exactly"*, *"13 of 13 execute cleanly against the head schema"*. Two defects the volume exposed, both fixed: (1) `DIGEST_ROW_CAP` was 20,000, calibrated when the database was empty, so the **largest** table — the one a bad rollback damages most — was the one table never value-checked; measured at ~5µs/row (27k rows = 140ms), the cap is now 500,000 and a production tenant digests whole; (2) the success line read `all <total> rows survived, byte for byte` using the **total** row count while the comparison spanned only **digested** tables, so a partial verification printed as a total one — it now reports digested rows and names any table it could only count. **A green can no longer be read as more than it is:** `MIN_REHEARSAL_ROWS = 10_000` makes a trivial dataset a *prerequisite* failure (`EXIT=2`, before any descent, so nothing is mutated), and the old 7-row target now refuses to report a pass. Bite proofs: the floor on the 7-row `inv_t02_probe` → `EXIT=2`; a `CHECK (on_hand < 100)` appended to `0910_inv_quality_hold_stock_grain.down.sql` → `EXIT=1` with 4 findings, restored → `EXIT=0`. **That perturbation is the gap made visible:** the identical statement *succeeds* against `inv_t02_probe` (0 stock rows) and *fails* against the seeded database (18,000) — a rollback carrying it would have passed the old rehearsal. Self-test 11 → **14 passed**, the three new checks each proven to bite (inverted cap → FAIL; deleted seed script → FAIL). **Still not met, and for named reasons:** tier 1 reaches 2 migrations because 38 have no `.down.sql`; backup/restore (`drill:pitr`) still needs credentials; **cutover still has no rehearsal and no design**; the feature-flag rehearsal is unaddressed. → **T19 (rollback landed), dataset sizing landed, backup/restore, cutover and feature-flag open** |
| 12.11 | Branch reviewable, micro-comments resolved, pushed with a complete handoff | **Partly met** | Both branches are clean and pushed — frontend `3bbdfabe7`, backend `333e45e12`, each equal to its `origin/` ref; PRs frontend#32 and backend#16 are open against `main`. **Missing:** the handoff is not yet complete. `docs/inventory-neo-handoff.md` §6 described three defects as open that had been fixed for five days (issue #36), and the closing SHA list is still an empty placeholder. Issue #47 owns this and is open. |

#### 12.9 in detail — the twelve gate types

| Gate | Inventory evidence | Verdict |
|---|---|---|
| unit | ~127 inventory spec paths under the root jest config; runs in `pnpm test` | **Recorded** |
| integration | 7 inventory `.db.spec.ts` files, default-on since 2026-09-05 (T15): `pnpm test:db` → `EXIT=0`, 7 suites / 70 tests against a migrated database; `pnpm check:db-spec-gates` in `ci.yml` fails if one regresses to a flag nothing sets, and `pnpm test:db` runs in `golden-path` whenever `CI_DATABASE_URL` is present (skipped, not green, without it) | **Recorded** |
| e2e | 52 seeded specs; 51 green in the run above | **Recorded** |
| property | **Built 2026-09-05 (T16).** `stock-engine/__tests__/quantity.property.spec.ts` — 27 tests, `EXIT=0` under plain `pnpm test`, 600 generated cases per law: the four `decimal.ts` operators against exact `bigint` arithmetic, `availableQty` against `AVAILABLE_QTY_TERMS` **itself** so a term added to the constant and not the function fails, both availability gates, `netAvailableQty`'s clamp and `toBaseQuantity`. The differential half is `available-formula-parity.db.spec.ts` (`EXIT=0`, 300 rows), which runs the same generated rows through PostgreSQL and requires `availableQty` and `availableQtySql` to agree — the first thing in the repository to check that the TypeScript and SQL halves of the formula are equal rather than merely both present. `fast-check@4.9.0` is a new dev dependency and the shrinking is the reason: re-introducing A1's dropped `outgoing_qty` shrinks to `{outgoing: 1n}` with everything else zero. **Two vacuity holes were found by its own bite proofs and closed:** a uniform generator reaches an exact rounding tie about once in ten thousand draws, so flipping half-up to half-down passed (`EXIT=0`) until constructed tie cases were added; and coverage floors now assert in `afterAll` what was actually generated, so `numRuns: 0` fails | **Recorded** |
| concurrency | `stock-concurrency.seeded-e2e-spec.ts` (green), `stock-level-locks.spec.ts` | **Recorded** |
| tenant-isolation | 11 unit isolation specs + `scope-matrix` + `check:tenant-isolation` in CI; but the only as-app-role RLS proof is `INV_DB_TESTS`-gated | **Recorded, weakest tier missing** |
| accessibility | **Built 2026-09-05 (T18); re-verified by T16 rather than duplicated.** `frontend/app/(authenticated)/inventory/inventory-a11y.test.tsx` — 22 tests, `EXIT=0`, 16 mounts × 2 viewports = **32 axe runs** over 11 surfaces (6 routes plus the 5 shared surfaces every route renders), through the repository's own `expectNoAxeViolations` with no rule disabled for inventory, and held from outside by `inventory-route-states.test.ts` (`EXIT=0`, 15 tests). Backend still has no `axe` and needs none — it renders nothing. Recorded limits, unchanged: 11 surfaces of 86 routes, jsdom has no layout, and no screen-reader run exists anywhere | **Recorded** |
| browser | **Recorded exemption 2026-09-05 (T16). Deliberately not built.** Everything an inventory browser gate would assert needs a *running, authenticated* application: every inventory route sits behind the authenticated layout, and there is no seeded login fixture, no session-minting script and no CI service that boots the Nest API and the Next app together — the one recorded procedure is a human minting a NextAuth cookie by hand. A gate only one laptop can run, by hand, is not recorded evidence, and this programme has twice found a gate that passed while measuring nothing. What a real browser adds over what inventory now has is **layout and paint**; the accessibility half of that landed the same day (T18) and the layout half is already frontend issue #45, blocked on a device credential. **One correction to the row this replaces:** neither repo *declares* Playwright, Puppeteer or Cypress, but `@playwright/test@1.59.1` does resolve in the frontend lockfile as an optional peer of `next@16.3.0`, and a headless Chromium is present in the operator cache — so the blocker was never the browser binary, and fixing `browser-driver.mjs`'s two Windows-only paths (real, and out of T16's scope) would not by itself give inventory a gate. **The exemption is enforced, not prose:** `src/modules/inventory/__tests__/inventory-gate-exemptions.spec.ts` (4 tests, `EXIT=0`) asserts every reason a machine can check — no browser-automation dependency is declared, the driver still targets the app root and knows no inventory route, `browser:measure` is still in no workflow, and the driver still exists and is still real CDP. The day one stops being true this fails and the exemption is re-argued instead of inherited (4 bite proofs, `EXIT=1` each) | **Exempt, for a recorded and enforced reason** |
| migration | `cold-build-integrity.spec.ts` + `check:migration-chain` / `-ledger` / `-discipline` in CI; cold build 630/630. Since 2026-09-05 (T19) it is no longer forward-only: `pnpm drill:rollback` round-trips the top of the chain and executes all 11 previously-unrun inventory `.down.sql` files (`EXIT=0`), and `check:migration-rollback` now prints and ratchets the 38 inventory migrations its PASSED exempts | **Recorded (forward, plus a shallow rollback)** |
| reconciliation | Non-vacuity proven at `golden-path…:544`; the rebuild spec is `INV_DB_TESTS`-gated | **Partly; rebuild never run** |
| load | **Built 2026-09-05 (T16).** `pnpm load:drive:inventory` (`src/scripts/run-inventory-load.mjs`) drives the **same nine `inv-*` read shapes** the read-cost budgets define, imported from `read-cost-budgets.mjs` so the two gates can never measure different SQL, at the concurrency, warmup and burst `load-driver/load-profile.mjs` already declares, judged by the shared `percentiles.mjs` against the PRD's own `p95-complex-db-read` objective. No number in it was invented and no dependency was added — no k6, no artillery, no autocannon. Measured run: **8 of 9 shapes driven, 1 NOT_DRIVEN for a named reason, 0 errors, every p95 inside the 50 ms objective, `EXIT=0`** (see the T16 evidence report for the table). **Fail-closed, and each way proven:** a `BYPASSRLS` measuring role is refused (`EXIT=1`), a workload whose tenant holds fewer rows than the budget's own `minRows` is NOT_DRIVEN with the count rather than driven against an empty table, requests must be *observed* overlapping in `pg_stat_activity` (`--concurrency=1` → `EXIT=1`), and a `--duration` that parses to `NaN` is refused (`EXIT=1`). The last two were holes the bite proofs found: the overlap check first counted database-wide activity, so another session's queries vouched for it, and a `NaN` window silently produced a green run on burst samples alone. `load:drive:inventory:self-test` covers **12** failure modes and runs in `ci.yml`; the full drive needs a seeded dataset (`seed-inventory-load.mjs`) and runs by hand, on the `drill:rollback` precedent | **Recorded** |
| AI evaluation | `inv-ai-evals.spec.ts` runs by default — but records no threshold; the scored `evals/` tier has no inventory suite | **Recorded, unscored** |

#### And none of it runs in CI

> **Re-recorded 2026-09-05 (T20). Two of the three causes are fixed; the third is a billing
> block on the GitHub account and no commit can clear it.** The paragraph below is kept
> because its *conclusion* still holds — no inventory ratchet has yet executed in CI — but its
> diagnosis was incomplete, and "no run has been triggered" turned out to have a mechanism
> nobody had named.

Verified rather than assumed, because "we have a ratchet" and "a ratchet runs" are different claims.

Both jest configs would in fact reach these ratchets: the backend's root config takes
`roots: [src]` with `testRegex .*\.spec\.ts$`, and the frontend's `next/jest` default picks up
`*.test.ts` anywhere. Both `pnpm test` invocations sit in a workflow. The failure is upstream of that.

**Cause 1 — nothing triggered. FIXED (backend `bd7a6482b`, frontend `973068de2`).**
`on.push.branches` was `[main]` in both repos, so a push to a feature branch matched no `push`
trigger and the only route left was `pull_request`. GitHub raises that event from the pull
request's **merge** commit, and it stops raising it once the PR conflicts with its base. The
correlation is exact, in both repositories independently:

| Repo | `refs/pull/N/merge` last written | Last `pull_request` run started | Gap |
|---|---|---|---|
| backend #16 | 2026-09-01T08:57:59Z | 2026-09-01T08:58:01Z | 2 s |
| frontend #32 | 2026-09-01T08:47:02Z | 2026-09-01T08:47:05Z | 3 s |

Both PRs are now `mergeable: CONFLICTING`, `mergeStateStatus: DIRTY`, and both merge refs have
been frozen since that morning. So the trigger did not degrade — it stopped, in the same second
the merge ref stopped being computed, and stayed stopped through a dozen pushes. Directly
verified rather than inferred: pushing backend `ac817d505` at 2026-09-05T08:52Z produced
`total_count: 0` workflow runs, while a push to `main` four minutes earlier produced three.
`push` now also matches `feat/**`, which does not depend on a PR being mergeable. It works:
runs `33956979744` and `33957379017` exist on this branch, event `push` — **the first workflow
runs on it since 2026-09-01.**

Recorded, because it changes how every future branch should be read: **a merge conflict with
`main` silently switches CI off for a whole branch.** Nothing reports it. `gh pr checks` says
"no checks reported", which reads like a configuration gap rather than a disabled gate.

**Cause 2 — `Lint` hid `Test` and thirty gates. FIXED (backend `bd7a6482b`, `88d55cdd5`;
frontend `973068de2`).** `verify` ran Typecheck, **Lint**, **Test**, Build and thirty `check:*`
gates as one sequential job. In run `33489746534`, Lint failed at step 7 and steps **8–37**
— Test and every gate — reported `skipped`. The frontend was worse: `Run Tests` sat below
`Lint` in its single job, so the suite reported `-` on every run it was ever part of. Lint is
red with **244 backend / 48 frontend** errors inherited from `main` and explicitly out of this
programme's scope; the point is that a stranger's lint error switched off every inventory
ratchet. GitHub's own job graph is the proof the shape changed:

| Run | Jobs |
|---|---|
| `33489746534` (old) | `golden-path`, `verify`, `tenant-isolation`, `live-evals` — Test was step 8 **inside** `verify`, and `skipped` |
| `33956979744` (new) | `Lint`, `Test`, `Inventory ratchets`, `verify`, `golden-path`, `tenant-isolation`, `live-evals` — five peers, no `needs:`, all attempted in the same second, **none skipped** |

Both repos also gained a job that runs the inventory ratchets **by name** — five backend
(`inventory-reachability`, `inventory-schema-reachability`, `available-formula`,
`idempotent-guard-placement`, `cold-build-integrity`; T16 has since added two more) and six
frontend (`rf-surface`, `inventory-route-states`, `inventory-a11y`,
`sidebar-nav-inventory-reachability`, `available-formula`, `inventory-keys`) — with `--ci` and
no `--passWithNoTests`, so a pattern matching nothing exits 1, plus a step asserting each spec
file exists so a rename fails loudly instead of vanishing. The shape itself is now ratcheted:
`src/scripts/ci-job-independence.spec.ts` fails if Test moves back into `verify`, if a `needs:`
reintroduces the dependency, if the push trigger reverts to `[main]`, if a named ratchet is
dropped, if `--passWithNoTests` appears, or if a ratchet is added without its existence check
(seven bite proofs, `EXIT=1` each).

**Cause 3 — GitHub Actions billing. NOT FIXED, and not fixable from a repository.**
Since roughly 2026-09-05T08:00Z every job in **both** repos, on **`main` as well as this
branch**, fails 2–3 seconds after it is created with `steps: []` and this annotation:

> The job was not started because recent account payments have failed or your spending limit
> needs to be increased. Please check the 'Billing & plans' section in your settings

Bounded by measurement: the scheduled `Database gates` run at 07:56:53Z executed for 1m4s; every
run from 08:48Z onward has `steps: 0`. Actions itself is enabled (`{"enabled": true}` in both
repos) and `main` built normally as recently as 2026-09-04, so this is neither a disabled-Actions
nor a workflow problem. **It requires the account owner to clear the payment failure or raise the
spending limit. Until that happens no job in either repository can start, so the two acceptance
criteria that require a run — inventory ratchets visible by name in a log, and a run where lint
is red and tests still report — cannot be produced, by this or any commit.** What is proven is
structural, from GitHub's job graph rather than from logs: the jobs exist, they are peers, and
none is skipped.


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
