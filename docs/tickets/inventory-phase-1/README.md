# Inventory Phase 1 — Trustworthy foundation and schema contract

**Goal:** reconcile the current live database and Drizzle model, then make catalog, tenant boundaries, stock, permissions, audit, and evidence dependable before warehouse automation is layered on.

**Dependency rule:** INV-101 may remain in progress as a read-only vertical slice, but no write-heavy ticket is complete until INV-103 and INV-104 establish the golden dataset and ledger invariants.

| ID | Ticket | Depends on | Status |
| --- | --- | --- | --- |
| INV-101 | Inventory Operations Brief on dashboard | existing AI gateway | **in progress** |
| INV-102 | Strict evidence contract for AI inventory responses | INV-101 | planned |
| INV-103 | Golden inventory dataset and reconciliation fixtures | schema audit | planned |
| INV-104 | Stock ledger invariant and repair report | INV-103 | planned |
| INV-105 | Concurrency matrix for adjustments and transfers | INV-103, INV-104 | planned |
| INV-106 | Base-UOM conversion contract | schema audit | planned |
| INV-107 | Product and variant lifecycle hardening | INV-103, INV-106 | planned |
| INV-108 | Resumable import at 100k rows | INV-103, INV-106, INV-107 | planned |
| INV-109 | Warehouse-scope access matrix | schema audit, INV-103 | planned |
| INV-110 | Inventory performance budget and query evidence | INV-103, INV-104, INV-109 | planned |

## Shared phase requirements

Every ticket must include strict Zod boundary validation, tenant/object authorization, explicit projections, audit behavior, pagination/caps, tests, and a truthful handoff. Backend migration changes must reconcile the live 66-table catalog before generation. Frontend work must preserve current StreamlineOS tokens and implement loading, empty, error, denied, stale, and success states.

## Tickets

### INV-101 — Inventory Operations Brief on dashboard

**Outcome:** an authorized operator can explicitly request a concise AI narrative over deterministic inventory signals without AI spending on page load or mutating inventory.

**Scope:** dashboard card, manual query/refetch behavior, permission gate, evidence counts, provider failure state, mobile layout, existing shared AI gateway integration.

**Validation:** strict response schema; no client-provided prompt authorization; evidence ids remain tenant/scope filtered; provider/credit failure does not hide deterministic dashboard facts.

**Acceptance:** manual start is explicit; narrative displays generated time and evidence; every signal links to a deterministic inventory route; denied users see denial rather than empty; typecheck and focused tests pass.

### INV-102 — Strict evidence contract for AI inventory responses

**Outcome:** AI output is a versioned, bounded, schema-validated explanation/proposal format.

**Scope:** Zod schemas for digest, insight, evidence reference, recommendation, proposal, action enum, and refusal/insufficient-evidence states; server-owned action resolver.

**Validation:** `.strict()` unknown-key rejection; invented numbers/source ids; oversized text; unsupported actions; stale evidence hash; malformed arrays; tenant mismatch; prompt-injection text in notes.

**Acceptance:** no model field can become SQL, route, permission, quantity, or arbitrary mutation; all existing AI tests use the contract; provider/model/schema versions are captured.

### INV-103 — Golden inventory dataset and reconciliation fixtures

**Outcome:** deterministic fixtures prove the whole quantity/value chain.

**Scope:** two tenants; products/variants; base and purchase/sales UOMs; warehouses/locations; lots/serials; receipts; adjustments; transfers; reservations; holds; returns; picks; shipments; counts; valuation; AI evidence.

**Validation:** fixture factory is idempotent and isolated; no cross-tenant references; exact decimal arithmetic; seeded reason codes; reproducible timestamps and document numbers.

**Acceptance:** dashboard, stock list, movement report, available quantity, reservation totals, valuation, and traceability report reconcile to the same fixture ledger.

### INV-104 — Stock ledger invariant and repair report

**Outcome:** every balance is explainable and projection drift is observable and repairable.

**Scope:** canonical movement contract; immutable ledger checks; projection-vs-ledger report; orphan/duplicate/negative/quantity-after anomalies; safe idempotent repair command where justified.

**Validation:** property tests for `before + delta = after`; lot/serial grain; availability formula; correction linkage; no edits/deletes to original movements; repair audit record and dry-run mode.

**Acceptance:** repair is read-only by default; mutation requires permission and confirmation; repeated repair is a no-op; report exposes exact evidence and totals.

### INV-105 — Concurrency matrix for adjustments and transfers

**Outcome:** simultaneous stock commands cannot create phantom stock or duplicate movements.

**Scope:** row-lock order and transaction boundaries for adjustment, receipt, reservation, release, transfer reserve/dispatch/complete, cancellation, and count posting.

**Validation:** concurrent test workers; duplicate idempotency requests; deadlock timeout; insufficient-stock race; two-warehouse transfer race; retry after serialization/conflict.

**Acceptance:** final projection equals serial execution; no negative stock outside policy; exactly one movement per accepted command; retry behavior and conflict envelope are documented.

### INV-106 — Base-UOM conversion contract

**Outcome:** quantities remain exact and auditable when users enter cases, packs, or other non-base units.

**Scope:** conversion service; compatible UOM categories; scale/rounding policy; entered quantity plus normalized base quantity on documents; display of applied factor.

**Validation:** positive factor, precision overflow, incompatible units, fractional serial units, missing conversion, changed conversion after historical posting, and boundary rounding cases.

**Acceptance:** ledger stores base UOM; source documents preserve entered unit/quantity/factor snapshot; historical movements do not change when a conversion is edited.

### INV-107 — Product and variant lifecycle hardening

**Outcome:** catalog changes preserve historical inventory while preventing invalid future operations.

**Scope:** archive/restore; SKU/barcode normalization and uniqueness; variant lifecycle; service/non-stockable restrictions; default vendor references; historical read behavior.

**Validation:** duplicate SKU/barcode across tenants; inactive/discontinued item writes; archive with stock; variant parent ownership; protected fields; concurrent edit conflict.

**Acceptance:** archive is not physical deletion; existing ledger and reports remain readable; new demand rejects invalid SKU state with a clear conflict; restore is permissioned and audited.

### INV-108 — Resumable import at 100k rows

**Outcome:** large product, opening-balance, vendor, and stock imports are safe, resumable, and explainable.

**Scope:** staged upload/checksum; mapping; preview; chunk validation; durable checkpoints; row-level errors; retry/cancel; import audit; scoped export of errors.

**Validation:** malformed CSV/encoding; unknown columns; duplicate keys; missing references; cross-tenant ids; partial failure; job retry; same checksum/idempotency; memory/timeout budget.

**Acceptance:** 100k representative rows do not load into one request; committed chunks are not duplicated; errors include stable row/code/field; cancellation and resume are observable.

### INV-109 — Warehouse-scope access matrix

**Outcome:** every inventory read/write respects both permission and assigned warehouse scope.

**Scope:** role × permission × scope matrix; warehouse grants; object reads/writes; dashboard aggregates; AI evidence; import/export; cache invalidation.

**Validation:** owner/admin/manager/supervisor/operator/planner/quality/auditor/read-only; two tenants; assigned/unassigned warehouse; object-id probing; missing tenant context; RLS application role.

**Acceptance:** denial is distinct from empty; cross-tenant and out-of-scope objects return 404; aggregates cannot include unauthorized warehouses; every route has a named test.

### INV-110 — Inventory performance budget and query evidence

**Outcome:** scale claims are measured instead of assumed.

**Scope:** representative dataset/load generator; dashboard, catalog, stock, movement, traceability, reports, reorder, and import query plans; pagination/cap verification; cache key review.

**Validation:** plans as `streamline_app` with tenant context; buffer budgets; index coverage; no N+1; high-cardinality movement pagination; concurrent command latency.

**Acceptance:** evidence is checked into the ticket handoff; regressions fail CI or a documented budget check; no endpoint relies on unbounded `select *` or wildcard scans.

## Phase exit gate

The phase is complete only when the live catalog and Drizzle schema are reconciled, the missing RLS policy is resolved, all stock commands have idempotency/audit/concurrency coverage, the projection rebuild equals the ledger, imports resume safely, scope denial is proven, and dashboard/report totals reconcile on the golden dataset.
