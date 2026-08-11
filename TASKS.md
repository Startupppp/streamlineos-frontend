# TASKS — Inventory & Stock

Updated: 2026-08-11 | Done: 24/33

Evidence rule: `[x]` requires a command and its output seen in-session. Nothing
is checked from memory.

## Phase 1 — Schema (migrations 0399–0407, 0409)

- [x] SCH-001 UoM conversion table + line UoM columns
      Evidence: migration 0399 applied; `information_schema.columns` probe returned 11/11 new columns present
- [x] SCH-004 Cost layers location/lot aware
      Evidence: migration 0400 applied; FIFO partial index rebuilt on (org, variant, location, created_at)
- [x] COST-001 Layer-consumption + average-cost-history tables
      Evidence: migration 0401 applied; `inv_valuation_consumptions`, `inv_average_cost_history` present in 7/7 table probe
- [x] COST-002a Effective-dated standard costs table
      Evidence: migration 0402 applied; column drop deliberately deferred — `standard_cost` still read by inv-reports-extended:153,183
- [x] SEC-003a `inv_user_warehouses`
      Evidence: migration 0403 applied
- [x] COST-006a `posting_date` on the ledger
      Evidence: migration 0404 applied
- [x] SCH-007 Reservation idempotency + source-line uniqueness
      Evidence: migration 0405 applied
- [x] SCH-005 `inv_barcodes` with exclusive-arc CHECK
      Evidence: migration 0406 applied
- [x] CONC-010 Per-product negative stock, value threshold, reason codes
      Evidence: migration 0407 applied; 40 seeded reason-code rows counted
- [x] COST-004b Transfer cost carry column
      Evidence: migration 0409 applied; `dispatched_unit_cost` confirmed PRESENT
- [x] MIG-001 Rollback scripts, executed not merely written
      Evidence: all 9 forward + rollback run inside one transaction against the dev DB — 0 residual tables, 0 residual columns
- [x] MIG-002 Journal reconciled with `__drizzle_migrations`
      Evidence: post-apply probe — "db:migrate would now apply: nothing"
- [ ] SCH-002 Partition `inv_stock_transactions` — DEFERRED, not blocked
      §19 forbids partitioning a table that is not demonstrably large; would forfeit composite tenant FKs
- [ ] SCH-006 JSONB → tables (channels.warehouseIds, webhooks.events, 3pl.skuMapping)

## Phase 2 — Correctness, costing, access

- [x] CONC-001 Reservation without location could not be checked or locked
      Evidence: `locationId` required in DTO + service guard; 231-test suite green
- [x] CONC-002 `committed` released on a wider key than incremented
      Evidence: shared `releaseCommitted` across all four paths; reservation.service.spec green
- [x] CONC-003 Idempotency claim aborted its own transaction
      Evidence: DB probe — case 1 aborted 23505, case 3 (`ON CONFLICT`) committed with replay reachable
- [x] CONC-006 `outgoing_qty` excluded from availability
      Evidence: `availableQty` in decimal.ts subtracts it; valuation.service.spec covers exactness
- [x] CONC-005 Unbounded layer lock
      Evidence: `LIMIT 500` + `ORDER BY created_at, id` in lockConsumableLayers
- [x] CONC-007 Float math in the money path
      Evidence: `grep parseFloat` in stock-engine.service.ts returns only reorder-point comparisons
- [x] SEC-001 Adjustment maker-checker
      Evidence: `createdBy === userId` ForbiddenException + conditional status update
- [x] SEC-002 Approve/post permission split
      Evidence: controller keys `inventory:adjustments:approve` / `:post`; both catalogs + frontend union
- [x] COST-001 COGS recorded per issue
      Evidence: valuation.service.spec — "records one consumption row per layer touched" passes
- [x] COST-002 Costing method dispatched on
      Evidence: valuation.service.spec — FIFO / weighted-average / standard cases all pass
- [x] COST-003 Reversal unwinds its own layer
      Evidence: valuation.service.spec — refuses partly-issued receipt
- [x] COST-005 Layer shortfall no longer silent
      Evidence: valuation.service.spec — throws, and backfill-layer case passes
- [x] SEC-003b Write-side warehouse gate
      Evidence: `assertLocationsInScope` at the top of executeInTx and executeMany
- [x] SEC-003c Read scoping — stock levels, availability, movements, transfers, adjustments, warehouses, valuation
      Evidence: tsc 0 inventory errors; 231 tests green; scope in both cache keys
- [ ] SEC-003d Read scoping — quality holds/inspections/recalls, cycle counts, reports
- [ ] SEC-004 Cost/margin masking on `inventory:valuation:read`
- [ ] SCH-003 Stop writing RESERVATION_* to the movement ledger (expand step of D-13)
- [ ] COST-006b Call the period guard from the stock engine
- [ ] STRUCT-001 Split `stock-engine.service.ts` (887 lines, over the §9 cap)

## Phase 7 — Tests

- [x] TEST-001 Repair the existing suite
      Evidence: 22 suites / 231 tests passing, from 3 suites failing + 1 worker crash
- [x] TEST-002 Real coverage for the costing engine
      Evidence: valuation.service.spec.ts — 15 tests passing
- [ ] TEST-003 Real-DB concurrency: two allocations of the last unit, exactly one wins
- [ ] TEST-004 Real-DB idempotent replay: a retried receipt posts once
- [ ] TEST-005 Real-DB reconciliation: ledger sum equals snapshot after randomised movements
