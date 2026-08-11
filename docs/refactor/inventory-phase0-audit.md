# Inventory — Phase 0 Delta Audit (read-only)

Date: 2026-08-11 · Mode: delta against the 2026-07-26 audit + W0–W7 fix program
Decisions in force: keep STANDARD/WEIGHTED_AVERAGE/FIFO per product and harden · no live stock data (no cutover required) · no cost/margin egress to the model provider.

`CLAUDE.md` needs no AI amendment. It mandates AI at `:177`, `:193`, `:274`, `:276`, `:372`. The source document's premise that AI is out of scope is false and was not acted on.

---

## Baseline — not capturable

No live stock data. Row counts are effectively zero, so `EXPLAIN (ANALYZE, BUFFERS)`, p50/p95 per endpoint, and the ledger-vs-snapshot **reconciliation discrepancy rate** — the document's single best measure of module health — cannot be produced. The artifacts in `docs/refactor/baseline/` belong to the Build program, not Inventory.

Required before metrics mean anything: seed to scale, then capture as `streamline_app` with `app.organization_id` set (never as owner — owner has BYPASSRLS and the plans omit the policy). Deferred to Phase 1 exit.

What was captured instead: 154 backend files / ~20.9k lines across 21 sub-modules; 15 schema files / 1,564 lines; 60 frontend route directories; index inventory read from the Drizzle schema.

---

## Schema findings

| ID | Table/Column | Evidence | Problem | Impact | Sev | Fix | Migration risk |
|---|---|---|---|---|---|---|---|
| SCH-001 | `inv_uom.ratio_to_base`, `rounding_precision`; `inv_products.purchase_uom_id`, `sales_uom_id` | zero call sites — `grep ratioToBase\|convertUom\|toBaseUom` across `modules/inventory` hits only `products/dto/inv-products.schemas.ts:102,151` (validation) | UoM conversion does not exist. Columns are validated on write and never read. `StockEngineCommand.quantityDelta` is a bare string with no UoM | Buying in cases and stocking in eaches records case counts as eaches. Every downstream quantity, valuation and reorder figure is wrong by the conversion factor | **P0** | One shared exact-ratio conversion applied at every boundary; every quantity column declared as base UoM or carrying its UoM | Low — additive, no data |
| SCH-002 | `inv_stock_transactions` | `db/schema/inventory/stock.ts:33` — `serial` PK, no partitioning | Largest table, append-only, unpartitioned | Unbounded growth, no archival path | P1 | RANGE partition on `created_at`; PK becomes `(id, created_at)`, keep `(org_id, id)` | Medium — do while empty |
| SCH-003 | `inv_stock_transactions` reservation rows | `stock-engine/reservation.service.ts:59-70,114-121,148-154` | `RESERVATION_*` rows store `quantity_before`/`quantity_after` hardcoded `"0"` and the real qty in `metadata` JSONB | Point-in-time stock reconstruction from the ledger returns wrong values; reserved qty is unindexable | P1 | Move reservation events out of the movement ledger, or record true before/after | Low |
| SCH-004 | `inv_valuation_layers` | `db/schema/inventory/valuation.ts:7-27` | No `location_id`, no `lot_id` | An issue from warehouse B consumes a layer created by a receipt into warehouse A. Per-location valuation impossible; specific-identification unimplementable | P1 | Add location (and lot where tracked) to the layer key | Low — empty |
| SCH-005 | `inv_products.barcode`, `inv_product_variants.barcode` | `core.ts` — single nullable non-unique column | One item cannot hold many GTINs; barcode is not uniquely resolvable per tenant | Scan resolves ambiguously or not at all | P2 | `inv_barcodes` table, unique `(org_id, code)` | Low |
| SCH-006 | `inv_channels.warehouse_ids`, `inv_webhooks.events`, 3PL `sku_mapping` | carried over from the 2026-07-26 program (S-03/04/21) | Relational data in JSONB | Not indexable, not joinable | P2 | Junction tables | Medium |
| SCH-007 | `inv_stock_reservations` | `reservations.ts:25-29` — no unique constraint on `(org_id, source_type, source_id, source_line_id)` | Reservations have no idempotency key at any level | A retried allocation double-reserves and double-increments `committed` | P1 | Composite unique + idempotency key | Low |

---

## Correctness & concurrency findings

| ID | Location | Evidence | Failure mode | Oversell? | Sev | Fix |
|---|---|---|---|---|---|---|
| CONC-001 | `stock-engine/reservation.service.ts:25` | the `FOR UPDATE` lock, the availability check and the `committed` increment are **all** inside `if (input.locationId)`. `locationId` is `.optional()` in `stock/dto/inv-stock.schemas.ts:59`, exposed at `stock/inv-stock.controller.ts:72` | A reservation posted without `locationId` performs no lock and no availability check — it always succeeds | **Yes, unconditionally** | **P0** | Availability must be asserted on every path; resolve to a location or lock the variant aggregate |
| CONC-002 | `reservation.service.ts:104-111`, `142-146`, `182-189`, `231-240` | increment targets the locked row by `id` (`:54-56`); every decrement matches only `(org_id, product_variant_id, location_id)` — lot and serial omitted | Releasing one lot's reservation decrements `committed` on **every** lot row at that location. `GREATEST(0, …)` hides it | **Yes** — under-committed stock reads as available | **P0** | Decrement the same natural key the increment used |
| CONC-003 | `stock-engine/stock-engine.service.ts:567-581` | `try { INSERT } catch { SELECT … }`; unique index `uniq_inv_idempotency_org_key` (`admin.ts:58`) makes the catch reachable. **Confirmed by probe against the live DB (Postgres 18.4) — see below** | On a genuine duplicate key the follow-up `findFirst` fails and the whole transaction aborts `23505` instead of replaying. The replay path at `:589-591` is unreachable, and every branch below it (`requestHash` mismatch, `COMPLETED` replay, lease reclaim) is dead code | Indirect — every retry fails hard | **P0** | `INSERT … ON CONFLICT DO NOTHING RETURNING`, branch on zero rows — proven working in the probe |
| CONC-004 | `stock-engine.service.ts:104-130` vs `:321-336` | `executeInTx` inserts-then-locks each movement sequentially in caller order; `executeMany` locks once with `ORDER BY id … FOR UPDATE` | Two concurrent multi-line movements touching the same levels in opposite order deadlock. The batch path is safe, the single path is not | No | P1 | Lift `executeMany`'s single deterministic lock statement into `executeInTx` |
| CONC-005 | `stock-engine.service.ts:664-671` | `SELECT … FROM inv_valuation_layers WHERE remaining_quantity > 0 … FOR UPDATE` — no `LIMIT` | Every issue locks and materialises the variant's entire open-layer set | No | P1 | Consume with a bounded cursor; stop once the delta is covered |
| CONC-006 | `reservation.service.ts:48` | `available = on_hand − committed − blocked − quality_hold` | `outgoing_qty` is maintained on the row but excluded from availability | **Yes** — picked-not-shipped stock is re-promised | P1 | Include `outgoing_qty`; define availability in exactly one function |
| CONC-007 | `stock-engine.service.ts:136,142,637-642,661,675-677`; `reservation.service.ts:48,50` | exact bigint helpers `addDec/mulDec/divDec` exist at `:49-51` and are bypassed | Sign tests, negative-stock guards, weighted-average and layer consumption all run in float, then `String(…)` back into the exact parser | Rounding drift into money and quantity | P1 | Use the exact helpers throughout; `parseScaled` also mis-parses exponent notation |
| CONC-008 | `reservation.service.ts:50` | `if (!settings.allowBackorders && available < qty) throw` | `allowBackorders` is an org-wide boolean that removes the only availability guard. No ATP, no backorder record, no inbound date awareness | **Yes, by configuration** | P1 | Explicit backorder policy with its own records |
| CONC-009 | `reservation.service.ts:210-244` | `expireStale` writes no `RESERVATION_RELEASE` ledger row (release/consume both do); `FOR UPDATE` over an unbounded stale set; takes `orgId` per call | Expiry is invisible in history; sweep locks unboundedly | No | P2 | Emit the ledger row; batch the sweep; iterate tenants with `forEachOrg` |
| CONC-010 | `stock-engine.service.ts:142` | `if (!settings.allowNegativeStock && parseFloat(newOnHand) < 0)` | Negative-stock policy is one org-wide flag, with no per-item or per-location setting, no permission and no reason code | Silent negative stock | P2 | Per item/location policy gated by a dedicated permission |
| CONC-011 | `stock-engine.service.ts:253,524,554` | `void this.invalidateCaches(orgId)` — not awaited, `Promise.allSettled` swallows every rejection (`:687`) | A failed invalidation is invisible; stale availability continues to be served | Indirect | P2 | Log failures; do not swallow |

---

### CONC-003 — probe result (2026-08-11, live dev DB, Postgres 18.4)

A temp table with a unique index, exercised through `drizzle-orm/postgres-js` in the exact shape of `claimIdempotencyKey`. No application data touched; probe script deleted after the run.

| Case | Behaviour | Result |
|---|---|---|
| 1 — `try { tx.insert } catch { tx.select }` (the real code) | insert threw; **follow-up SELECT inside the catch also failed**; outer transaction aborted `23505 duplicate key value violates unique constraint` | **Replay path unreachable** |
| 2 — caught error, then an unrelated later write | the later insert failed too; transaction aborted | **The transaction is poisoned by the caught error** |
| 3 — `INSERT … ON CONFLICT DO NOTHING RETURNING` | 0 rows returned (= already claimed); follow-up SELECT returned 1 row; transaction committed | **Proposed fix works** |

Two consequences beyond the replay failure:

1. Drizzle takes **no per-statement savepoint**. Any `try/catch` around a statement inside `db.transaction` is unsound repo-wide, not just here — worth a targeted sweep in Phase 2.
2. In case 1 the caught error carried no `.code` at the inner boundary (postgres-js surfaces the failed-query wrapper; `23505` appears only on the outer rethrow). So even a savepoint-based fix could not have branched on the constraint name reliably. `ON CONFLICT` is the correct shape.

---

## Costing findings

| ID | Source | Current behaviour | Fix |
|---|---|---|---|
| **COST-001** (P0) | `stock-engine.service.ts:147`, `:660-684` | **COGS is never recorded.** Outbound movements store `total_cost: null` (cost is written only when `isPositive`), and `consumeValuationLayers` decrements `remaining_quantity` without recording which layers were consumed, in what quantity, at what cost. No consumption table exists | Layer-consumption table written in the same transaction; COGS derived from it and reproducible |
| **COST-002** (P0) | `:174-176`, `:669`, `:645-658` | **Costing method is ignored at runtime.** `updateWeightedAverage` runs for every product regardless of method; `consumeValuationLayers` always orders `created_at ASC` (FIFO) for every method. The layer records `costing_method` (`:656`) and nothing branches on it. `inv_products.standard_cost` is never read anywhere | Dispatch on `inv_products.costing_method`; implement STANDARD with variance postings |
| COST-003 (P1) | `:528-550` | Reversing a receipt produces a negative delta, which routes to `consumeValuationLayers` and consumes unrelated **older** layers, leaving the erroneous layer intact. The reversal is also recorded under the original `transactionType`, so history cannot distinguish a reversal from a negative movement | Reversal unwinds the specific layer it created; distinct reversal transaction type |
| COST-004 (P1) | `:673-683` | Layer shortfall is silently ignored — the loop exits with `remaining > 0`, no error, no record. Guaranteed whenever negative stock is permitted | Fail, or post an explicit negative-cost layer |
| COST-005 (P1) | no hits for landed cost / FX in `modules/inventory` | No landed-cost apportionment; no FX snapshot at receipt | Apportion freight/duty/insurance into layer cost; snapshot the rate |
| **COST-006** (P0 against the doc's bar) | zero hits for `periodClose\|closePeriod\|fiscal` in `modules/inventory` | **No period close exists.** Nothing prevents a movement being posted into a period already reported | Period lock, finance-permissioned, with an approved reopen path |
| COST-007 (P1) | `grep reconcil` hits only `counts/*.controller.ts` | No scheduled ledger↔snapshot reconciliation and no three-way reconciliation report | Scheduled drift check that alerts; reconciliation as a first-class screen |
| COST-008 (P1) | `purchase-orders/grn.service.ts`, `sales-orders/so-*.service.ts` are the only accounting touchpoints | Inventory↔GL posting is partial; valuation is never reconciled to the GL inventory account | Complete the posting path, then reconcile |

---

## Access control findings

| ID | Location | Evidence | Problem | Sev | Fix |
|---|---|---|---|---|---|
| **SEC-001** | `stock/inv-stock-adjustments.service.ts:128-136` | `approveAdjustment` checks only `status !== "PENDING_APPROVAL"`; `userId` is never compared to `adj.createdBy` | **No segregation of duties.** The person who counts approves their own variance — the exact write-off path adjustment approvals exist to close | **P0** | Reject approver == initiator, matching the payroll precedent |
| **SEC-002** | `stock/inv-stock-adjustments.controller.ts:40,62,72,84` | create, approve, post and cancel all carry `@RequirePermission("inventory:stock:adjust")` | One permission grants the entire write-off lifecycle. SoD is not even expressible | **P0** | Separate `:approve` / `:post` keys |
| **SEC-003** | `applyScope` appears 5× (`products`, `po`, `so`, `adjustments`, `transfers`), every one on `createdBy` | No warehouse or location dimension exists in RBAC anywhere in the module | **No location scoping.** A warehouse operator reads and transacts across every warehouse in the org. This is the inventory-specific scope the document names as most often missed | **P0** | Location scope as a `where` clause, not a UI default |
| SEC-004 | `inv_stock_levels.average_cost`, `inv_products.cost_price`, `inv_product_variants.cost_price`, txn `unit_cost` | no field-level filtering in any inventory response path | **Cost and margin are never masked.** Anyone with `inventory:stock:read` or `inventory:products:read` receives unit cost and margin in the response body | P1 | Strip server-side by permission, not in the UI |
| SEC-005 | `counts/inv-cycle-counts.controller.ts:44-97` | start, count, complete and post all use `inventory:stock:reconcile` | Counter posts their own variance. `system_qty` is snapshotted at sheet generation (`inv-cycle-counts.service.ts:99`) but returned to the client, so blind counting is not enforced; movements during a count are never reconciled | P1 | Separate variance-approval key + SoD; suppress `system_qty` for the counter; reconcile in-count movements |
| SEC-006 | `modules/rbac/permissions/inventory.ts:183-193` | `inventory:import` and `inventory:export` are **two-segment** keys | Violates `CLAUDE.md` §21's `module:resource:action` format | P2 | Rename to `inventory:data:import` / `inventory:data:export`; mirror in the frontend catalog |
| SEC-007 | permission catalog | No key for negative-stock override, costing-method change, revaluation, or period close | Elevated actions are unpermissioned because the features are absent or piggyback on `products:update` | P2 | Add keys alongside the features |
| SEC-008 | `import-export/export.controller.ts:29-56` | permissioned, but no rate limit and no export audit record found | A full item master with costs is the standard exfiltration path | P2 | Rate-limit and audit every export |

---

## AI findings

| ID | Location | Problem | Sev | Fix |
|---|---|---|---|---|
| AI-001 | `ai/inv-ai.service.ts:164`, `:186-193` | Stock **value** computed from `average_cost` is embedded in insight bodies and `sourceRefs.value`. Under the cost-egress decision just taken, no cost-derived figure may reach the provider | P1 | Strip cost-derived fields server-side before retrieval; prove with a test, not a prompt instruction |
| AI-002 | `ai/inv-ai.service.ts:155-193` | `detectDeadStock` runs an unbounded org-wide scan with a correlated `NOT EXISTS` and no limit | P2 | Bound it |
| AI-003 | module-wide | AI retrieval has no location scoping and no cost-field permission filter, because neither exists yet (SEC-003, SEC-004) | P1 | Blocked on SEC-003/004 |

Confirmed sound: no AI path writes to the ledger; `AiActionsMenu` is used correctly on product, vendor and PO detail; endpoints are gateway-metered.

---

## UI findings

| ID | Route/Component | Problem | Sev |
|---|---|---|---|
| UI-001 | `app/(authenticated)/inventory/products/page.tsx` (634), `stock/movements/page.tsx` (550), `sales-orders/[soId]/page.tsx` (515), `purchase-orders/[poId]/page.tsx` (500) | Over the 500-line hard cap, and page logic lives in `app/` where §9 allows route files only | P2 |
| UI-002 | scanner surfaces | `inventory/barcode` exists, but no scan-field auto-refocus, no audible/haptic confirmation, no duplicate-scan tolerance, no offline queue. Warehouse workflows are built as desktop CRUD | P1 |
| UI-003 | count screens | Blind counting not enforced in the UI because the API returns `system_qty` (SEC-005) | P1 |

Confirmed sound: `features/inventory/components/stock/availability-popover.tsx` renders the availability breakdown rather than a bare number.

---

## Persona matrix

| Persona | Routes needed | Gate today | Gap |
|---|---|---|---|
| Warehouse operator | `stock`, `stock/movements`, `barcode`, `operations/*` | `inventory:stock:read/adjust` | **Sees every warehouse (SEC-003); sees unit cost (SEC-004)** |
| Receiving clerk | `purchase-orders/[poId]`, `operations/receipts` | `purchase-orders:receive` | No landed cost, no 3-way match |
| Picker | `operations/picking`, `packing` | `sales-orders:ship` | Desktop-shaped, no scanner ergonomics (UI-002) |
| Inventory controller | `cycle-counts`, `physical-audits`, `stock/adjustments` | `stock:reconcile`, `stock:adjust` | **Can self-approve variances and write-offs (SEC-001/002/005)** |
| Purchasing | `purchase-orders`, `replenishment`, `vendors` | `purchase-orders:*` | Reorder suggestions do not display their inputs |
| Finance / controller | `valuation`, `costing`, `reports` | `valuation:read` | **No period close (COST-006), no GL reconciliation (COST-008), COGS unrecoverable (COST-001)** |
| Store manager | `warehouses/[warehouseId]` | `warehouses:read` | No location scoping |
| Executive | `reports/*` | `reports:read` | Reports read from an unreconciled ledger |

---

## Dead code

Not assessed. §25 requires proof from a module-graph tool, not grep. Deferred to Phase 8: `knip` followed by a real `nest build` / `next build`.

---

## Prioritised fix order

1. **P0 oversell** — CONC-001, CONC-002, CONC-006 (availability defined once, asserted on every path, decremented on the key it was incremented on).
2. **P0 idempotency** — CONC-003. Probe the `25P02` behaviour against Postgres first; every other write guarantee sits on top of it.
3. **P0 fraud** — SEC-001, SEC-002 (SoD + split keys). Small, self-contained, high value.
4. **P0 quantity** — SCH-001 (UoM conversion). Everything downstream is wrong until quantities carry a unit.
5. **P0 costing** — COST-001, COST-002 (record layer consumption, dispatch on costing method), then COST-003/004.
6. **P0 scoping** — SEC-003 location scope, then SEC-004 cost masking, which unblocks AI-001/003.
7. **P1 period integrity** — COST-006 period close, COST-007 reconciliation job + report.
8. **P1 concurrency hygiene** — CONC-004, CONC-005, CONC-007, CONC-008.
9. **P1/P2 schema** — SCH-002 partitioning (cheap while empty), SCH-003, SCH-004, SCH-007.
10. **P1 UI** — UI-002 scanner ergonomics, UI-003 blind counting.
11. **P2** — remaining schema, permission-key format, export controls, file-size and structure cleanup.

Items 1–3 are independent and can run in parallel on disjoint files. Item 4 must land before item 5 or the costing work is redone.
