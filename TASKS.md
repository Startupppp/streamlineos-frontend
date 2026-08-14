# TASKS — Inventory & Stock

Updated: 2026-08-11 | Done: 40/44

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
- [x] SCH-002 Partition `inv_stock_transactions` — CLOSED AS "WILL NOT DO"
      Evidence: §19 forbids partitioning a table that is not demonstrably large, and the partition key must enter every UNIQUE, which would forfeit the `(org_id, id)` composite tenant FKs the Wave-4 programme installed. Table holds ~0 rows. This is a decision, not outstanding work
- [~] SCH-006 JSONB → tables — webhooks.events DONE; channels/3pl analysed, not converted
      Evidence: migration 0420 applied + rollback executed (`ROLLBACK VERIFIED`, forward state restored); `inv_webhook_event_subscriptions` present with the dispatch index; emitter now filters in SQL instead of loading every active webhook and filtering a jsonb array in memory; create/update dual-write in one transaction via `syncSubscriptions`. jsonb column retained — expand step only.
      `3pl.skuMapping` has **zero readers** outside the schema definition (proven by grep); left in place rather than dropped, per the destructive-default rule.
      `channels.warehouseIds` has 4 read sites doing `inArray` over a JS-loaded array — convertible, not converted

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
- [~] SEC-003d Read scoping — holds, counts and ALL 7 reports DONE; inspections/recalls NOT SCOPABLE
      Evidence: locationPredicate on invQualityHolds.locationId, warehousePredicate on invCycleCounts.warehouseId, both with scope in the cache key.
      Reports scoped: dashboard, stock summary, movements, dashboard-extras, valuation, slow-moving, expiry — each with the scope as a cache-key discriminator.
      `inv_quality_inspections` has NO location/warehouse column — it points at its source via polymorphic source_type/source_id, the pattern §19 bans. Recalls are inherently org-wide. See DECISIONS.md#D-16
- [x] SEC-004 Cost masking on `inventory:valuation:read`
      Evidence: 6 `stripCostFields` sites — stock levels, movements, products list, product detail; cost visibility is a cache-key discriminator on both cached lists; 231 tests green, tsc 0 errors
- [x] SCH-003 Stopped writing RESERVATION_* to the movement ledger (expand step of D-13)
      Evidence: 4 ledger inserts removed from reservation.service.ts, `grep RESERVATION_` there returns 0; no service read them (only a filter enum + 2 frontend label maps); reservation.service.spec green, 231 tests green
- [x] COST-006b Period guard called from the stock engine
      Evidence: `assertPeriodOpen` ×2 (executeInTx + executeMany) via AccountingGlModule per §18; tsc 0 errors, madge no new cycle, 231 tests green
- [~] STRUCT-001 `stock-engine.service.ts` 899 → 627 lines; still over the §9 cap of 500
      Evidence: extracted `idempotency.ts` (125) and `movement-costing.service.ts` (149); dead imports stripped; 231 tests green, real-DB 5 green, tsc 0 errors.
      Remaining: `executeMany` is ~300 lines and duplicates `executeInTx`'s per-movement loop — collapsing the two is what clears 500, and is a behaviour-bearing refactor I did not attempt

## Phase 7 — Tests

- [x] TEST-001 Repair the existing suite
      Evidence: 22 suites / 231 tests passing, from 3 suites failing + 1 worker crash
- [x] TEST-002 Real coverage for the costing engine
      Evidence: valuation.service.spec.ts — 15 tests passing
- [x] TEST-003 Real-DB concurrency: two allocations of the last unit, exactly one wins
      Evidence: INV_DB_TESTS=1 run — "exactly one of two simultaneous claims succeeds under FOR UPDATE" passed (1562 ms), plus a negative control proving the unlocked shape oversells to -1
- [x] TEST-004 Real-DB idempotency semantics
      Evidence: same run — ON CONFLICT claim keeps the transaction usable; the caught-error shape provably poisons it
- [x] TEST-005 Real-DB reconciliation: ledger sum equals snapshot
      Evidence: same run — 60 deterministic movements, snapshot == SUM(ledger) (33894 ms)
- [x] TEST-006 Full suite green after the costing/scoping/extraction work
      Evidence: 22 suites, 231 passed, 0 failed, 477s, exit 0

## Verification runs (final)

- [x] VERIFY-001 Full suite: 22 suites, 231 passed, 0 failed, 541s, exit 0
- [x] VERIFY-002 Real-DB suite: 5 passed, 0 failed, 58s
- [x] VERIFY-003 `tsc --noEmit`: 0 Inventory errors
- [x] VERIFY-004 Pass-3 sweep: 0 quantity mutations, 0 `any`, 0 ts-ignore, 0 `SELECT *`
- [!] VERIFY-005 `madge --circular`: 1 cycle, `notifications/notification.types.ts > notification-events.catalog.ts`
      NOT mine — reproduces running madge on `src/modules/notifications` alone
