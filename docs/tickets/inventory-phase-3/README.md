# Inventory Phase 3 — Planning and replenishment intelligence

**Goal:** turn demand, lead time, safety stock, open supply, and supplier performance into explainable, reviewable replenishment decisions.

**Principle:** deterministic baselines are the source of arithmetic. A model may improve a forecast only after measured backtests beat the baseline and the result carries coverage, horizon, assumptions, and uncertainty.

| ID | Ticket | Depends on | Status |
| --- | --- | --- | --- |
| INV-301 | Demand baseline and backtest harness | Phase 1, Phase 2 | planned |
| INV-302 | Seasonal and intermittent-demand handling | INV-301 | planned |
| INV-303 | Safety-stock policy engine | INV-301 | planned |
| INV-304 | Lead-time and fill-rate estimation | INV-301, Phase 2 | planned |
| INV-305 | Explainable reorder proposals | INV-303, INV-304 | planned |
| INV-306 | What-if replenishment simulator | INV-305 | planned |
| INV-307 | Supplier performance scorecards | INV-201, INV-304 | planned |
| INV-308 | Multi-echelon transfer recommendations | INV-303, INV-304 | planned |
| INV-309 | Purchase-order batching and approval policy | INV-305, INV-306 | planned |
| INV-310 | Forecast drift and recommendation monitoring | INV-301–INV-309 | planned |

## Shared phase requirements

All calculations are tenant/warehouse/category scoped, decimal-safe, reproducible, and versioned. Missing or sparse data produces an explicit insufficient-data state. Simulations never mutate inventory. A proposal becomes a normal permissioned/idempotent purchase or transfer command only after human approval.

## Tickets

### INV-301 — Demand baseline and backtest harness

**Outcome:** the system calculates a measurable demand baseline and proves its quality on historical fixtures.

**Scope:** demand history extraction; date/timezone policy; stockout-censored demand flag; intermittent zero handling; moving average/seasonal naive baselines; rolling-origin backtest; metrics.

**Validation:** missing dates; timezone boundary; returns/cancellations; stockout censorship; sparse SKU; new SKU; negative corrections; tenant/warehouse scope.

**Acceptance:** every forecast stores data coverage, horizon, method, version, metrics, and assumptions; baseline output is deterministic and independently testable.

### INV-302 — Seasonal and intermittent-demand handling

**Outcome:** seasonal and lumpy demand do not create false precision.

**Scope:** seasonality detection thresholds; intermittent-demand method; calendar/holiday configuration boundary; fallback behavior; confidence/uncertainty representation.

**Validation:** insufficient history; one-off spikes; zero-heavy series; changing seasonality; missing periods; model failure; tenant calendar leakage.

**Acceptance:** the selected method and reason are visible; low-confidence forecasts fall back safely; no method claims accuracy unsupported by backtests.

### INV-303 — Safety-stock policy engine

**Outcome:** planners can define and preview safety stock by SKU, warehouse, service level, lead time, and policy version.

**Scope:** reorder point; safety stock; service level; review period; MOQ/pack rounding; policy precedence; effective dates; overrides.

**Validation:** invalid ranges; impossible service levels; missing lead time; pack/UOM rounding; policy conflict; inactive SKU; warehouse scope.

**Acceptance:** policy calculation is deterministic; inputs and formula are exposed; overrides are permissioned/audited; simulation and production proposal use the same version.

### INV-304 — Lead-time and fill-rate estimation

**Outcome:** supplier and lane performance improve replenishment timing without hiding uncertainty.

**Scope:** ordered-versus-received lead time; partial/late receipts; fill rate; supplier-SKU/warehouse grain; outlier policy; confidence intervals.

**Validation:** missing dates; cancelled PO; split receipt; supplier change; outlier; no history; cross-tenant party/vendor data.

**Acceptance:** observed data and fallback defaults are distinguishable; recommendation shows sample size and uncertainty; no zero-day/negative lead times.

### INV-305 — Explainable reorder proposals

**Outcome:** a planner can review why a SKU should be reordered and what the system proposes.

**Scope:** projected availability; demand horizon; reorder point; supply/on-order; recommended quantity/date/vendor; assumptions; evidence links; proposal state.

**Validation:** arithmetic property tests; open PO duplication; already-ordered quantity; inactive vendor; MOQ/pack rounding; stale snapshot; permission/scope.

**Acceptance:** proposal is read-only until approved; quantity is calculated server-side; evidence is reproducible; approval creates a normal idempotent PO draft/command.

### INV-306 — What-if replenishment simulator

**Outcome:** planners can compare service level, order quantity, timing, supplier, and transfer scenarios without changing production state.

**Scope:** scenario inputs; baseline comparison; projected stock curve; cost/stockout tradeoff; save/share permissions; export.

**Validation:** caps/time horizon; malformed inputs; stale catalog; no vendor; decimal rounding; warehouse scope; simulation cannot write.

**Acceptance:** scenarios are isolated from live documents; results show assumptions and uncertainty; a chosen scenario becomes a reviewable proposal, not an immediate mutation.

### INV-307 — Supplier performance scorecards

**Outcome:** planners can compare supplier delivery, fill, quality, cost, and exception performance from source records.

**Scope:** deterministic KPIs; supplier/SKU/warehouse filters; date windows; sample size; drill-through to POs/GRNs/quality; permission boundary.

**Validation:** partial receipts; cancelled POs; timezone; missing quality data; vendor party mapping; pagination/performance.

**Acceptance:** every KPI has a formula and source; low sample size is marked; no CRM redesign is introduced; links respect tenant and warehouse scope.

### INV-308 — Multi-echelon transfer recommendations

**Outcome:** the system can recommend an inter-warehouse transfer when surplus and shortage are simultaneously evidenced.

**Scope:** source surplus; destination projected shortage; transfer lead time; transit stock; cost; lot/FEFO constraints; recommendation state.

**Validation:** same warehouse; reserved/held stock; incompatible lot/serial; simultaneous proposal; transfer capacity; scope.

**Acceptance:** recommendation never reserves or moves stock automatically; approved recommendation creates the standard transfer workflow with evidence and idempotency.

### INV-309 — Purchase-order batching and approval policy

**Outcome:** approved proposals can be batched into purchase orders without violating supplier, currency, warehouse, or approval rules.

**Scope:** grouping rules; supplier/warehouse/currency; minimum order; approval thresholds; draft creation; duplicate detection; notifications.

**Validation:** cross-supplier grouping; changed price; inactive vendor; threshold boundary; duplicate proposal; concurrent approval; permission.

**Acceptance:** batches are previewed before creation; all line quantities are server-calculated; generated POs are ordinary auditable documents and can be safely retried.

### INV-310 — Forecast drift and recommendation monitoring

**Outcome:** operators can see whether forecasts and proposals are useful, stale, biased, or unsafe.

**Scope:** forecast error/drift; coverage; stockout bias; proposal acceptance/override; stale policies; alert thresholds; monitoring dashboard.

**Validation:** missing actuals; delayed receipts; sparse series; tenant scope; alert dedupe; query budget.

**Acceptance:** monitoring never silently changes a model; alerts link to evidence; fallback/disable decisions are explicit and audited.

## Phase exit gate

Every recommendation is reproducible, scoped, arithmetic-tested, evidence-linked, uncertainty-aware, and human-approved before mutation. The deterministic baseline continues to operate if every AI/model provider is unavailable.
