# Inventory Phase 4 — Quality, traceability, and financial control

**Goal:** make physical identity, quality state, expiry, recalls, returns, valuation, accounting linkage, and audit evidence trustworthy.

**Dependencies:** Phases 1–3. Quality and traceability must affect availability through the stock command/projection, never through UI-only flags.

| ID | Ticket | Depends on | Status |
| --- | --- | --- | --- |
| INV-401 | Lot and serial genealogy graph | Phase 1, Phase 2 | planned |
| INV-402 | FEFO allocation and expiry policy | INV-401 | planned |
| INV-403 | Quality inspection plans and sampling | INV-401, INV-201 | planned |
| INV-404 | Holds, quarantine, and release controls | INV-403 | planned |
| INV-405 | Recall impact simulator | INV-401, INV-404 | planned |
| INV-406 | Customer and vendor return reconciliation | Phase 2, INV-404 | planned |
| INV-407 | FIFO and weighted-average valuation proofs | INV-104, INV-401 | planned |
| INV-408 | Inventory-to-GL reconciliation | INV-407 | planned |
| INV-409 | Immutable audit export | INV-104, INV-405, INV-408 | planned |
| INV-410 | Write-off and scrap approval controls | INV-404, INV-408 | planned |

## Shared phase requirements

Lot/serial, physical, available, blocked, quality-held, quarantined, scrapped, and in-transit quantities must be distinct. Financial records are exact and period-aware. AI may explain or draft but cannot post a stock write-off, journal, hold, release, or recall by itself.

## Tickets

### INV-401 — Lot and serial genealogy graph

**Outcome:** users can trace a lot/serial backward to receipt and forward to movement, shipment, return, hold, or disposition.

**Scope:** normalized identity; movement links; receipt/transfer/shipment/return relations; bounded graph query; tenant/warehouse scope; exportable evidence.

**Validation:** duplicate serial; lot/SKU mismatch; missing source; cross-tenant reference; cycle; deleted/archived master; graph depth/row cap.

**Acceptance:** forward and backward trace results are reproducible; every edge is a real relationship or clearly labeled audit pointer; no unbounded graph traversal.

### INV-402 — FEFO allocation and expiry policy

**Outcome:** eligible expiring lots are allocated first while tenant policy controls block/warn/allow behavior.

**Scope:** expiry state; FEFO ordering; reservation/pick integration; expired/near-expiry thresholds; exception approval.

**Validation:** timezone/date boundary; missing expiry; same expiry tie-break; held/recalled lot; serial item; manual override; concurrent allocation.

**Acceptance:** expired/blocked lots cannot be allocated when policy blocks; every override records reason/permission; allocation and projection remain atomic.

### INV-403 — Quality inspection plans and sampling

**Outcome:** receipts/returns can require deterministic inspection and sampling before availability.

**Scope:** inspection plan; sampling size/rule; test/result/disposition; inspector permissions; source document linkage; pass/fail state.

**Validation:** invalid sample size; over-sample; missing result; unauthorized completion; partial inspection; lot/serial mismatch; duplicate post.

**Acceptance:** required inspection blocks eligible availability until disposition; results are immutable after completion except correction; audit links evidence.

### INV-404 — Holds, quarantine, and release controls

**Outcome:** quality holds and quarantine are first-class inventory states with controlled release.

**Scope:** hold creation/reason/quantity; location routing; release, return, scrap; permission/approval; stock projection integration.

**Validation:** hold overage; duplicate hold; release overage; wrong lot/serial/location; expired/recalled item; unauthorized release; concurrent release.

**Acceptance:** held quantity is excluded from availability; release creates the correct movement/projection change; every transition is scoped, idempotent, and audited.

### INV-405 — Recall impact simulator

**Outcome:** quality users can calculate a bounded, reproducible recall impact before opening or executing it.

**Scope:** SKU/lot/serial/receipt/date selectors; on-hand/held/in-transit/shipped/returned impact; customer/shipment evidence; recall state.

**Validation:** selector exclusivity; graph cap; archived records; tenant/customer privacy; duplicate recall; status transitions.

**Acceptance:** simulation is read-only; impact set is reproducible with an evidence version; execution requires permission and creates tracked tasks/events.

### INV-406 — Customer and vendor return reconciliation

**Outcome:** returns reconcile to source orders/receipts, physical disposition, inventory, and financial adapter references.

**Scope:** intake; source matching; quantity/lot/serial; disposition; credit/refund reference; vendor return; ledger and audit.

**Validation:** duplicate return; invalid source; quantity overage; wrong customer/vendor boundary; quality failure; partial return; retry.

**Acceptance:** each return has one authoritative disposition path; stock and source balances reconcile; accounting remains an adapter and cannot bypass inventory posting.

### INV-407 — FIFO and weighted-average valuation proofs

**Outcome:** valuation methods are deterministic, explainable, and tied to stock movements.

**Scope:** receipt cost layers; FIFO consumption; weighted-average updates; location/lot grain; cost correction; period/posting dates; valuation reports.

**Validation:** zero/negative quantity; transfer cost carry; partial consumption; backdated posting; concurrent issue; missing cost; rounding.

**Acceptance:** valuation totals tie to ledger; every consumption cites layers/movements; corrections are compensating; reports work at SKU/location/date granularity.

### INV-408 — Inventory-to-GL reconciliation

**Outcome:** inventory valuation and accounting postings can be compared without letting inventory write the ledger directly.

**Scope:** accounting adapter contract; inventory asset/COGS totals; period cutoffs; unmatched/mismatched entries; reconciliation report.

**Validation:** currency; posting date; duplicate adapter event; missing journal; partial period; permission; cross-tenant source.

**Acceptance:** reconciliation identifies exact differences and evidence; accounting's existing posting boundary remains authoritative; no AI or inventory service inserts GL rows directly.

### INV-409 — Immutable audit export

**Outcome:** auditors can reproduce movement, approval, traceability, valuation, and reconciliation evidence.

**Scope:** scoped export job; stable ordering; checksums; schema/version metadata; permission filtering; retention; error artifact.

**Validation:** large export; date boundary; tenant/warehouse scope; deleted/archive semantics; concurrent mutation; retry; secret redaction.

**Acceptance:** repeated export of the same evidence version is identical; exported records include source ids and audit chain; job is asynchronous and resumable.

### INV-410 — Write-off and scrap approval controls

**Outcome:** high-risk stock loss requires deterministic reason, value threshold, approval, and compensating movement.

**Scope:** reason codes; value threshold; approval state; scrap/quarantine location; movement; valuation/GL adapter; notifications.

**Validation:** threshold boundary; missing cost; negative quantity; unauthorized approver; self-approval policy; duplicate post; cancelled document.

**Acceptance:** unapproved write-off cannot post; posted loss is immutable and auditable; valuation and availability change exactly once; AI can only prepare a proposal.

## Phase exit gate

Traceability, quality, availability, valuation, returns, recall, audit, and accounting reconciliation pass on golden and concurrent fixtures. No hold, recall, write-off, or valuation correction can bypass the stock command, approval, or audit path.
