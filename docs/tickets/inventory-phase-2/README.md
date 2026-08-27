# Inventory Phase 2 — Warehouse execution

**Goal:** make receiving, putaway, picking, packing, shipping, and returns fast and safe for warehouse operators while the stock ledger remains the only write authority.

**Dependencies:** Phase 1 exit gate; all commands remain tenant-scoped, warehouse-scoped, idempotent, transactional, audited, and strict-Zod validated.

| ID | Ticket | Depends on | Status |
| --- | --- | --- | --- |
| INV-201 | Receiving workbench with discrepancy handling | INV-104, INV-106, INV-107 | planned |
| INV-202 | Guided putaway by location capacity | INV-201 | planned |
| INV-203 | Barcode scan shell and keyboard wedge support | INV-106, INV-107 | planned |
| INV-204 | Mobile picking waves | INV-105, INV-203 | planned |
| INV-205 | Pick exception and substitution flow | INV-204 | planned |
| INV-206 | Packing validation and cartonization rules | INV-204, INV-205 | planned |
| INV-207 | Shipment handoff and carrier status contract | INV-206 | planned |
| INV-208 | Offline-safe warehouse task queue | INV-203, INV-204 | planned |
| INV-209 | Returns disposition workflow | INV-201, INV-207 | planned |
| INV-210 | Operations throughput and SLA dashboard | INV-201–INV-209 | planned |

## Shared phase requirements

Every mobile/task route must work one-handed at narrow widths, preserve current StreamlineOS visual language, announce scan/validation results accessibly, and distinguish offline, queued, failed, denied, and completed states. A warehouse action cannot bypass the stock engine or mutate a projection directly.

## Tickets

### INV-201 — Receiving workbench with discrepancy handling

**Outcome:** a receiver can receive against a PO, capture actual quantities/UOM/lot/serial/quality, and resolve over/under/damaged receipts.

**Scope:** PO-to-GRN workspace; staged receiving; entered/base quantity; lot/serial capture; inspection-at-receipt; discrepancy reasons; partial receipts; posting command.

**Validation:** PO state/remaining quantity; UOM conversion; tolerance; duplicate barcode/serial; expired lot; wrong warehouse/location; strict row schemas; idempotent post.

**Acceptance:** draft receiving never changes stock; posting atomically updates GRN, PO, ledger, projection, valuation, quality, audit, and events; every discrepancy has status and resolution.

### INV-202 — Guided putaway by location capacity

**Outcome:** received goods can be assigned to valid locations with deterministic capacity and capability checks.

**Scope:** putaway tasks; location tree; capacity/weight/volume rules; receiving-to-storage transition; quarantine routing; suggested placement.

**Validation:** inactive/full/non-receivable location; wrong warehouse; lot/serial mismatch; partial putaway; duplicate task completion; scope and race conditions.

**Acceptance:** suggestions are explainable; operator confirmation is required; putaway updates the correct location grain; failed tasks remain recoverable and audited.

### INV-203 — Barcode scan shell and keyboard wedge support

**Outcome:** scanner and keyboard-wedge input resolves safely to the correct SKU, lot, serial, task, or document.

**Scope:** reusable scan input; debounce; normalization; scan history; manual fallback; permission-aware resolution; duplicate feedback.

**Validation:** malformed/unknown/barcode collision; rapid repeated scans; mobile camera permission; keyboard wedge timing; unauthorized SKU/location; offline result.

**Acceptance:** scan feedback is immediate and accessible; no scan silently posts; ambiguous codes require selection; all resolutions are tenant/scope filtered.

### INV-204 — Mobile picking waves

**Outcome:** an operator can receive a scoped wave, follow location order, scan, and record picked quantity/lot/serial.

**Scope:** wave/task creation; deterministic allocation; task claiming; pick progress; lock/retry; mobile route; partial completion.

**Validation:** concurrent claim; stale task; wrong location/SKU; over-pick; serial duplicate; insufficient available; network retry; permission changes.

**Acceptance:** task completion updates reservation/pick state and ledger only through the command; wave progress is accurate; abandoned tasks can be reassigned without double counting.

### INV-205 — Pick exception and substitution flow

**Outcome:** short pick, damaged stock, missing stock, wrong location, and approved substitution are first-class outcomes.

**Scope:** exception reason codes; supervisor review; alternative SKU rules; quantity variance; reservation adjustment; audit and notification.

**Validation:** substitution compatibility/UOM; unauthorized approval; stale availability; no silent quantity loss; cross-tenant reference; repeated resolution.

**Acceptance:** each exception has owner/status/resolution; substitutions preserve source and target evidence; unresolved exceptions block completion where required.

### INV-206 — Packing validation and cartonization rules

**Outcome:** packing validates the picked contents and records package facts before shipment.

**Scope:** package creation; scan-to-package; quantity/lot/serial checks; weight/dimensions; cartonization suggestions; split packages.

**Validation:** unpicked/overpacked/duplicate serial; invalid package status; missing required package; split/merge policy; retry/idempotency.

**Acceptance:** package contents reconcile to pick and shipment lines; package state is controlled; package operations cannot change stock without shipment posting.

### INV-207 — Shipment handoff and carrier status contract

**Outcome:** a packed order can be shipped with a durable carrier handoff and visible status.

**Scope:** shipment posting; tracking/carrier adapter; label metadata; shipment events; delivery status sync; failure/retry/dead-letter state.

**Validation:** carrier timeout; duplicate handoff; invalid tracking; cancelled order; partial shipment; unauthorized external response; webhook authenticity.

**Acceptance:** shipment posting is idempotent; stock/reservation/package/order statuses agree; external failure does not corrupt internal state; carrier retries are observable.

### INV-208 — Offline-safe warehouse task queue

**Outcome:** intermittent connectivity does not cause duplicate scans or unsafe stock writes.

**Scope:** read cache/task snapshot; queued user intents; client idempotency; replay ordering; conflict UI; reconnect state.

**Validation:** offline receive/pick scan; device restart; duplicate replay; stale task; permission revoked; server conflict; queue cap/storage failure.

**Acceptance:** offline mode never claims a successful server post prematurely; replay is safe; conflicts require explicit resolution; sensitive data is not persisted beyond policy.

### INV-209 — Returns disposition workflow

**Outcome:** customer/vendor returns route goods to restock, quarantine, vendor return, or scrap with the right quantity and evidence.

**Scope:** return intake; source order/GRN links; inspection; disposition; refund/accounting adapter reference; ledger movements.

**Validation:** invalid source; duplicate return; serial/lot mismatch; disposition permission; return overage; quality hold; partial quantities.

**Acceptance:** return posting is atomic/idempotent; disposition controls availability; source documents remain traceable; audit captures reason and approver.

### INV-210 — Operations throughput and SLA dashboard

**Outcome:** supervisors can see receiving, putaway, picking, packing, shipping, exception, and queue health.

**Scope:** deterministic metrics; warehouse filters; aging/SLA buckets; throughput trends; drill-through to scoped work; no AI dependency.

**Validation:** metric reconciliation to task/document tables; warehouse scope; pagination; zero-data state; timezone/date boundaries; performance budget.

**Acceptance:** every metric has a definition and source query; denied warehouses are excluded, not shown empty; drill-through preserves filters and permissions.

## Phase exit gate

End-to-end receiving-to-putaway and demand-to-pick-to-pack-to-ship flows pass with normal, partial, duplicate, offline, scope-denied, quality-held, and external-failure scenarios. Ledger, projection, reservations, documents, audit, and events reconcile after every scenario.
