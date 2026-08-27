# Inventory Phase 5 — AI inventory control plane

**Goal:** provide evidence-grounded AI assistance over deterministic inventory facts while preserving all human, permission, approval, idempotency, audit, and tenant boundaries.

**Dependencies:** Phases 1–4 and the shared AI gateway. OpenRouter is a provider configuration, never a second inventory authorization or execution path.

| ID | Ticket | Depends on | Status |
| --- | --- | --- | --- |
| INV-501 | Grounded inventory copilot read queries | Phase 1, INV-109 | planned |
| INV-502 | Evidence-backed anomaly detection | INV-104, INV-501 | planned |
| INV-503 | Demand-risk narrative and confidence | Phase 3, INV-501 | planned |
| INV-504 | Reviewable replenishment proposals | INV-305, INV-501 | planned |
| INV-505 | Natural-language report builder | INV-501, INV-110 | planned |
| INV-506 | AI feedback and correction loop | INV-501–INV-505 | planned |
| INV-507 | Prompt/version/model audit trail | shared AI gateway, INV-102 | planned |
| INV-508 | Inventory AI evaluation suite | INV-501–INV-507 | planned |
| INV-509 | Provider fallback and budget controls | shared AI gateway | planned |
| INV-510 | Bounded autonomous workflows with confirmation | INV-504, INV-507, INV-508 | planned |

## Shared phase requirements

The AI sequence is always:

```text
deterministic query → access-filtered evidence → redaction/caps
→ shared gateway → strict Zod output → server-owned action resolver
→ permission/object/scope checks → human confirmation → idempotent command
→ audit/outbox → evidence-linked result
```

Malformed output, prompt injection in imported notes, missing data, provider outage, credit exhaustion, tenant switching, permission changes between proposal and confirmation, and stale evidence are mandatory test cases.

## Research-derived integration requirements

- Publish versioned `stock.*`, `lot.*`, `allocation.completed`, `scan.captured`, `sync.*`, `einvoice.*`, and `ewaybill.generated` events through the normalized outbox. Include a fat ledger/domain payload plus a thin delivery reference where appropriate.
- Inbound Shopify, Amazon, WooCommerce, channel, payment, and partner events are deduplicated signals. Adapters re-fetch current state and invoke normal idempotent commands; they do not create synthetic ledger deltas from snapshots.
- Webhook delivery verifies/signs the raw body with HMAC and timestamp, acknowledges quickly, retries durably for at least 24 hours, exposes dead letters, and alerts administrators before disabling a subscription.
- GSTN/NIC IRP and e-way are request/response adapters; emit `einvoice.registered`, `einvoice.cancelled`, and `ewaybill.generated` only after a successful provider result. Tally uses a serialized XML/local-connector adapter. EDI/VAN uses a translator boundary rather than a native network.
- OpenRouter is configured through the shared gateway only. No provider response, integration webhook, or AI proposal can bypass the same permission, scope, approval, transaction, idempotency, and audit rules as a human command.

## Tickets

### INV-501 — Grounded inventory copilot read queries

**Outcome:** an authorized user can ask operational inventory questions and receive answers grounded in scoped source records.

**Scope:** read-only tools for stock, availability, movements, open supply, reservations, expiry, vendor delay, and exceptions; explicit projections; evidence references.

**Validation:** tenant/warehouse/object scope in SQL; no role data/secrets; prompt injection; no evidence; ambiguous SKU; arithmetic question; pagination/caps; permission denial.

**Acceptance:** every answer cites evidence ids/timestamps; no tool can mutate; deterministic direct routes remain the source of truth; AI outage returns a recoverable state.

### INV-502 — Evidence-backed anomaly detection

**Outcome:** unusual adjustments, negative stock, velocity changes, reservation leakage, vendor delays, and reconciliation drift become reviewable signals.

**Scope:** deterministic feature extraction; thresholds/baselines; anomaly evidence; severity/status; dedupe; investigation links.

**Validation:** sparse data; seasonality; false positive; duplicate signal; stale evidence; warehouse scope; model unavailable; tenant isolation.

**Acceptance:** anomalies never change stock; each signal has formula/data window/evidence; status transitions are permissioned and audited.

### INV-503 — Demand-risk narrative and confidence

**Outcome:** planners receive a readable explanation of forecast risk without false certainty.

**Scope:** baseline/forecast comparison; coverage; horizon; stockout censoring; uncertainty; assumptions; evidence-linked narrative.

**Validation:** missing/sparse demand; forecast drift; malformed model output; unsupported confidence; stale policy; wrong warehouse.

**Acceptance:** deterministic numbers are computed before narration; confidence limitations are visible; no narrative can create or alter a forecast without a versioned calculation.

### INV-504 — Reviewable replenishment proposals

**Outcome:** AI can prepare a purchase or transfer proposal that a planner can inspect and approve through normal inventory commands.

**Scope:** proposal schema; evidence snapshot/hash; quantity/vendor/date server resolution; approval UI; confirm/reject/expire; idempotent handoff.

**Validation:** invented SKU/quantity/vendor; price/stock changed after proposal; permission change; stale evidence; duplicate confirm; AI credit/provider failure.

**Acceptance:** model output is never trusted for authoritative quantity; confirmation re-evaluates facts and authorization; approved proposal creates a standard PO/transfer workflow.

### INV-505 — Natural-language report builder

**Outcome:** users can ask for a scoped report configuration without allowing AI to produce arbitrary SQL.

**Scope:** intent-to-server-owned report enum/filter mapping; preview; limits; saved report permission; export handoff.

**Validation:** SQL injection; arbitrary table/column; cross-tenant filter; unbounded date/range; unauthorized warehouse; unsupported intent; prompt injection.

**Acceptance:** generated configuration is strict-Zod validated and allowlisted; server builds the query; preview is bounded; export uses existing permission and audit rules.

### INV-506 — AI feedback and correction loop

**Outcome:** users can mark an answer/proposal useful, wrong, stale, or unsafe and provide a bounded correction.

**Scope:** feedback event; evidence/model/version linkage; correction reason; privacy/redaction; review queue; no silent training mutation.

**Validation:** unauthorized feedback; sensitive text; duplicate feedback; prompt injection; deleted evidence; tenant isolation.

**Acceptance:** feedback is auditable and tenant-scoped; corrections do not alter historical outputs; any future evaluation/training use requires explicit pipeline policy.

### INV-507 — Prompt/version/model audit trail

**Outcome:** every AI response is reproducible enough to investigate cost, quality, scope, and safety.

**Scope:** feature id; prompt/schema version; evidence hash; provider/model/fallback; latency/tokens/cost; actor; outcome; action confirmation.

**Validation:** provider failure/refund; missing metadata; secret leakage; retention; credit exhaustion; replay/duplicate request.

**Acceptance:** shared gateway owns accounting/audit; inventory can link response to source evidence and final command; no raw secrets or unrestricted prompt content is persisted.

### INV-508 — Inventory AI evaluation suite

**Outcome:** AI quality and safety are measured continuously.

**Scope:** golden questions; expected evidence; arithmetic; refusal; tenant/scope; prompt injection; malformed output; stale data; proposal safety; regression thresholds.

**Validation:** multiple providers/models; deterministic fixtures; network failure; low credits; permission changes; adversarial imported notes.

**Acceptance:** evaluation report records pass/fail and model/schema version; a regression blocks release or creates an explicit review exception; tests do not expose tenant data.

### INV-509 — Provider fallback and budget controls

**Outcome:** OpenRouter/provider changes are safe, observable, and bounded by credit/cost/latency policy.

**Scope:** existing gateway provider configuration; cheap/standard tier; fallback chain; timeout/retry; feature output caps; credit reservation/refund; operator status.

**Validation:** provider 4xx/5xx; timeout; malformed response; fallback exhaustion; credit race; anonymous request; denial-of-wallet; cost limit.

**Acceptance:** no direct inventory provider call exists; deterministic operations continue; failed paid calls refund according to gateway policy; budget/latency evidence is captured.

### INV-510 — Bounded autonomous workflows with confirmation

**Outcome:** repetitive low-risk workflows can be prepared or queued with a final human-controlled confirmation boundary.

**Scope:** allowlisted action classes; proposal expiry; approval thresholds; bulk caps; confirmation summary; idempotency; audit/outbox; kill switch.

**Validation:** prompt injection; malformed action; permission revocation; changed stock; duplicate confirmation; bulk cap; kill switch; partial failure.

**Acceptance:** no autonomous action bypasses underlying permission/approval; each action is deterministic and idempotent; batch results are per-item; operator can disable the workflow and see its audit trail.

## Phase exit gate

AI is useful but optional: every answer is scoped and evidence-linked, every proposal is schema-validated and rechecked at confirmation, every write uses a normal inventory command, and deterministic inventory remains fully operational during outage, budget exhaustion, or provider removal.
