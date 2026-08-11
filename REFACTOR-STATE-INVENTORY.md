# REFACTOR-STATE — Inventory

**Module:** Inventory & Stock
**Phase:** 2 in progress — five P0 code fixes done; migrations 0399–0407 **applied and reconciled** on the dev DB. 0408 still deferred
**Audit:** `docs/refactor/inventory-phase0-audit.md`
**Schema plan:** `docs/refactor/inventory-phase1-schema-plan.md` (migrations 0399–0408)
**Updated:** 2026-08-11

---

## Decisions

| # | Decision | Consequence |
|---|---|---|
| D-01 | `CLAUDE.md` needs **no** AI amendment — it mandates AI at `:177`, `:193`, `:274`, `:276`, `:372`. The source document's premise was false | Phase 6 runs under existing rules, which are stricter than the document's on metering and retrieval ACLs |
| D-02 | Keep STANDARD / WEIGHTED_AVERAGE / FIFO per product; harden rather than narrow | Runtime must dispatch on `inv_products.costing_method`; STANDARD needs variance postings |
| D-03 | No live stock data | No cutover plan, no opening-balance batch, no expand-contract constraint. Migrations may be direct. Baseline metrics require seeded data |
| D-04 | Cost, margin and supplier pricing must **not** reach the model provider | Stripped server-side in the retrieval query, proven by test. Closes AI-001 |
| D-05 | Phase 0 runs as a delta against the 2026-07-26 program, not a fresh audit | Prior W0–W7 fixes spot-verified; audit targets what that program deferred or never covered |
| D-06 | Cost layers keyed per (item, location), lot where tracked | FIFO consumption becomes location-scoped; **transfers must move cost layers, not just quantity**; in-transit must be a real `TRANSIT` location holding its own layers |
| D-07 | Access scoped at warehouse level | `inv_user_warehouses`; plain `IN` list, no correlated subquery (does not repeat the `team`-scope mistake) |
| D-08 | Document lines store both entered and base quantity | `uom_id` + `quantity_entered` + `quantity_base` across the five line tables |
| D-09 | Reservation events removed from the movement ledger | `inv_txn_type` enum rewrite (migration 0408) — trivial at zero rows, expensive once data exists |

---

## Verified still fixed (from the 2026-07-26 program)

- `uniq_inv_stock_levels_natural_key` present (`db/schema/inventory/stock.ts:29`) — S-01 phantom rows closed.
- FIFO partial index present (`valuation.ts:25`) — W4 index bundle landed.
- `executeInTx` / `reverseInTx` exist, so callers can wrap stock and business writes in one transaction.
- `ReservationService.expireStale` decrements `committed`.
- No AI path writes to the ledger; `AiActionsMenu` used correctly on product, vendor and PO detail.

---

## Migration journal — diagnosed and repaired (2026-08-11)

The July "`db:migrate` is broken" note was half right. What is actually wrong:

- **Two numbering series collided.** Journal idx 90–94 are `0370_build_*`…`0375_build_*`; idx 95–104 are `0370_tenant_column_integrity`…`0379_drop_users_department_id`. Same numbers, different migrations.
- **Three forward migrations are unjournaled** because `0379` was already taken: `0379_effective_dating_convention`, `0379_legal_entities_create`, `0379_payroll_entities_legal_entity_fk`. They exist as files and `db:migrate` will never see them.
- **Four journal entries are permanently stranded** — `0354_drop_dead_types`, `0366_role_column_defaults`, `0367_drop_dead_user_preferences`, `0368_rename_ceo_to_final`. Their `when` is below the last applied timestamp, and `drizzle-orm/pg-core/dialect.js:62` is `Number(lastDbMigration.created_at) < migration.folderMillis` — a single max comparison, not a set difference. Anything below the high-water mark is invisible forever.
- **My earlier "139 files vs 128 entries" framing was wrong.** 8 of those 11 are `.down.sql` rollback companions, which are correctly excluded. The real gap is 3 files.

**The trap this nearly caused:** I first wrote the nine journal entries with `when` values derived from the max *journal* timestamp (1786413705243), but the DB's last applied was **1786415616285** — higher. Under the `dialect.js:62` rule all nine would have been skipped silently, with no error and no output. Rewritten above the high-water mark, then verified that `db:migrate` picks up exactly those nine and nothing else.

**Applying still did not go cleanly.** `drizzle-kit migrate` ended on a spinner with no success line and no error — the swallowed-error symptom. Verified directly against the DB instead: all 7 tables, all 11 columns and the 40 seeded reason codes are present, and all nine hashes were recorded — but at the *old* timestamps, below the high-water mark, so `db:migrate` would have re-run them and failed on duplicate tables. Repaired by aligning the nine recorded `created_at` values to the journal.

**Verified end state:** 7/7 tables · 11/11 columns · 40 reason codes seeded · journal and `__drizzle_migrations` agree · `db:migrate` reports nothing pending.

Rollback now follows the repo's convention as nine `migrations/NNNN_*.down.sql` files rather than one consolidated file in `docs/`.

## Closed — Phase 2 P0 code fixes (2026-08-11)

| ID | Fix | File |
|---|---|---|
| CONC-001 | Availability is asserted on every reservation path. `locationId` is now required in the DTO and rejected at the service boundary — a reservation with no location could not lock, check or decrement anything. Every internal caller already passed one | `reservation.service.ts:25`, `dto/inv-stock.schemas.ts:59` |
| CONC-002 | `committed` is released on the same natural key it was incremented on, via one shared `releaseCommitted` helper using `IS NOT DISTINCT FROM` for lot/serial. Previously release/consume/batch/expire matched `(org, variant, location)` and decremented every lot row at that location, with `GREATEST(0, …)` hiding it | `reservation.service.ts` — all four paths |
| CONC-003 | Idempotency claim uses `ON CONFLICT DO NOTHING RETURNING` instead of try/catch. Confirmed by probe that the old shape aborted the transaction and made the replay branch unreachable | `stock-engine.service.ts:558` |
| CONC-006 | `outgoing_qty` now subtracted from availability — picked-not-shipped stock was being promised twice | `stock-engine/decimal.ts` `availableQty` |
| SEC-001 | Maker-checker on adjustment approval: `createdBy === userId` is rejected. The status transition is also now a conditional update checking affected rows, so two concurrent approvals cannot both succeed | `inv-stock-adjustments.service.ts:128` |
| SEC-002 | Approve and post split onto `inventory:adjustments:approve` / `inventory:adjustments:post`, added to **both** catalogs and the frontend `PermissionKey` union; the sheet's buttons gate on the new keys | controller, both `permissions/inventory.ts`, `types.ts`, `adjustment-detail-sheet.tsx` |

Also done: exact decimal math extracted to `stock-engine/decimal.ts` (`addDec/subDec/mulDec/divDec/cmpDec/availableQty`), removing a duplicate implementation inside `stock-engine.service.ts`; the availability comparison no longer uses `parseFloat`. `expireStale` gained `ORDER BY id … LIMIT 500` so the sweep no longer locks an unbounded set.

**Verification:** backend `tsc --noEmit` — **0 Inventory errors**; frontend `tsc --noEmit` — **0 errors**; `madge --circular` on the inventory tree — **no cycles**. **Tests not run** (CLAUDE.md §3 — only on explicit request); see the risk note below.

### Not done, deliberately

- **CONC-009's "expiry writes no ledger row"** is obsolete. D-09 removes reservation events from the movement ledger entirely, so adding one back would contradict the decision. The audit trail is the reservation row's status plus the audit service.
- **CONC-007 float math in the costing path** (`updateWeightedAverage`, `consumeValuationLayers`) is untouched. It is P1 and that code is rewritten by the costing work, so fixing it now would be thrown away.

### Risks to clear before this ships

1. **Inventory specs almost certainly need updating and have NOT been run.** `claimIdempotencyKey` changed shape, so any mock lacking `.onConflictDoNothing().returning()` on the insert chain will fail — and per the known `db.transaction` spec-mock trap, a passing mocked test would not have caught the original bug either.
2. **`inventory:adjustments:approve` / `:post` are granted to nobody.** They are in the catalogs but not in any role template, so approval is locked until granted. That is the intended direction, but it needs a grant decision before real use.
3. **Backend build is currently red for unrelated reasons** — `src/db/schema/build/roadmap.ts:41` is missing its `sql` import and `delegations.service.spec.ts` calls a 3-arg signature that now takes 4. Both are other in-progress working-tree changes, not this work; Inventory contributes zero errors.

## Closed — Phase 2 costing (2026-08-11)

New: `stock-engine/valuation.service.ts` (owns layers, consumption, COGS), `stock-engine/costing-context.ts` (resolves method + effective standard cost for a whole command in two queries), `stock-engine/decimal.ts` (exact math).

| ID | Fix |
|---|---|
| **COST-001** | Every issue writes `inv_valuation_consumptions` rows — which layer, what quantity, what cost — inside the movement transaction, and stamps the resulting `unit_cost`/`total_cost` back onto the stock transaction. Outbound rows previously carried a null cost, so COGS was unrecoverable |
| **COST-002** | Costing dispatches on `inv_products.costing_method`. FIFO takes the layer's cost, WEIGHTED_AVERAGE the running average (with the recomputation recorded in `inv_average_cost_history`), STANDARD the effective-dated `inv_standard_costs` row for the posting date. Previously everything was averaged on receipt and consumed FIFO on issue |
| **COST-003** | `reverseInTx` unwinds the layer its own receipt created via `reverseReceiptLayer`, and refuses when that receipt has already been partly issued. Previously a reversal consumed unrelated older layers and left the erroneous layer in stock |
| **COST-004** | Layers are created and consumed at `(org, variant, location, lot)` — the D-06 grain |
| **COST-005** | A layer shortfall now throws `UnprocessableEntityException` instead of exiting silently. Where the org permits negative stock it is recorded as a fully-consumed `negative_stock_backfill` layer so the consumption keeps its FK and the event stays visible |
| **CONC-005** | Layer lock bounded — `ORDER BY created_at, id LIMIT 500` instead of `FOR UPDATE` over every open layer |
| **CONC-007** | The engine's sign tests, negative-stock guard and all costing math use the exact bigint helpers; `parseFloat` is gone from the money path |
| **COST-006** (part) | `posting_date` is resolved once per command and written on every transaction, so a period guard has a business date to check |

**Verification:** backend `tsc --noEmit` — 0 Inventory errors; frontend — 0 errors; `madge --circular` — clean. **Tests still not run** (§3).

### Deviation: `stock-engine.service.ts` is 887 lines, over the §9 cap

It was already 696 before this session and a formatter reflowed it. The correct split is a `MovementApplierService` holding the per-movement application and the low-stock outbox emission, which `executeInTx` and `executeMany` currently duplicate almost line for line — that alone is ~200 lines of duplication. I did not attempt it in the same pass as the costing rewrite because it is a large mechanical move with no test coverage to catch a mistake. **Flagged, not fixed.**

### Transfers now carry cost — migration 0409 (applied)

Per-location layers made transfers non-neutral, and dispatch/completion are **separate requests**, so the cost has to be persisted between them. `inv_stock_transfer_lines.dispatched_unit_cost` holds the cost the source layers were actually consumed at; `dispatchTransfer` stamps it from the engine's transactions (matched on variant + lot, since one transfer can move several lots of a variant) and `completeTransfer` passes it as the `TRANSFER_IN` unit cost so the layer is rebuilt at the destination.

Without this the receipt at B carried no cost, created no layer, and the next issue at B would have failed for want of a cost basis — a regression introduced by the D-06 grain change, not a pre-existing gap.

### Still open in costing

- Purchase price variance and usage variance are not posted to the GL. STANDARD costing values the issue correctly and the variance is derivable (layer `unit_cost` minus consumption `unit_cost`), but nothing writes it to `acc_system_account_map` accounts.
- Landed cost and FX snapshot untouched.
- In-transit is still not a real stock location. Dispatch decrements A and completion increments B; between the two the stock is off the books entirely, so a reconciliation run mid-journey will not balance. `inv_location_type` already has `TRANSIT` — the transfer path just does not use it.

## Closed — SEC-003 warehouse scoping (2026-08-11)

`stock-engine/warehouse-scope.service.ts` resolves a user to a warehouse id list (or `null` = unrestricted) and exposes both a SQL predicate and a write-side assertion. Deliberately a plain `IN` list, never a correlated subquery — it does not repeat the `team`-DataScope mistake.

- **Write side is fully gated.** `assertLocationsInScope` runs at the top of `executeInTx` and `executeMany`, so every receipt, issue, transfer, adjustment and count is covered by one check rather than each caller reimplementing it.
- **Read side:** `listStockLevels` and `getAvailability` are scoped. **`listTransactions`, transfers, adjustments, warehouses, quality and reports are NOT yet scoped.**
- **Cache correctness:** `listStockLevels` is cached per org under a key with no user in it. Adding a per-user predicate without changing the key would have served one operator's warehouses to the next (§22 living rule), so the scope is now a discriminator in the cache hash.
- New key `inventory:warehouses:scope-all` in both catalogs and the frontend `PermissionKey` union, granted to `INVENTORY_MANAGER`; Org Owner and Org Admin receive it with the rest of the catalog per §21.
- Also fixed: the frontend catalog had **duplicate `inventory:import` / `inventory:export` entries** (two different `resource` values under the same `name`). Removed the pair that did not match the backend.

### ⚠️ Operational consequence — read before enabling

Scoping is **deny-by-default**. A user who holds neither `inventory:warehouses:scope-all` nor any `inv_user_warehouses` row now sees no stock and cannot post any movement. That is the correct security posture and safe here only because there is no live stock data (D-03). Before any real tenant uses this, either seed warehouse assignments or grant the bypass key to the roles that need it. Custom roles built on `inventory:stock:adjust` alone will stop working.

## Tests — run and repaired (2026-08-11, first run this program)

**`npx jest --testPathPattern="modules/inventory"` → 22 suites, 231 tests, all passing.** Previously 3 suites failed / 5 tests failed, and one suite crashed the worker outright.

| Failure | Cause | Fix |
|---|---|---|
| `stock-engine.spec.ts` crashed the Jest worker | The idempotency tests mocked the claim insert to **throw** a duplicate-key error — encoding the exact behaviour that was broken. The new code does not catch, so it surfaced as an unhandled rejection | `makeInsertChain` now models `ON CONFLICT DO NOTHING … RETURNING`; `makeFailInsertChain` became `makeClaimedInsertChain`, returning zero rows |
| `executeMany` tests: LOCATION_NOT_FOUND | `buildBatchTx` returned the locked rows on the **first** `tx.execute`; `loadCostingContext` now issues an execute before the lock query and consumed it | Mock made order-independent; the "single lock" assertion now filters for `FOR UPDATE` rather than counting all executes |
| Weighted-average + FIFO assertions | The logic legitimately moved to `ValuationService`, which the engine spec mocks | Removed from the engine spec, **replaced with 15 real tests** in `valuation.service.spec.ts` |
| `expireStale` update count | The committed decrement moved from the query builder to raw SQL so it can match lot/serial with `IS NOT DISTINCT FROM` | Assertion counts the raw decrement instead |
| `inv-replenishment.service.spec.ts` (4 tests) | **Pre-existing, not mine** — the cache mock lacked `cachedVersioned`, added to the service by the July perf pass | Added `cachedVersioned` + `invalidateNamespace` to the mock |

New `valuation.service.spec.ts` covers the real implementation: FIFO oldest-first ordering and per-layer charging, one consumption row per layer touched, weighted-average and standard charging at their own rates, exactness where float would drift, shortfall throwing, the negative-stock backfill layer, and refusing to reverse a partly-issued receipt.

**The mocked engine specs would never have caught the original idempotency bug** — the mock asserted the throwing behaviour was correct. That remains the argument for the Phase 7 concurrency and reconciliation suite against a real database.

## Open — P0

| ID | Summary |
|---|---|
| CONC-001 | Reservation without `locationId` skips the lock and the availability check entirely → unconditional oversell |
| CONC-002 | `committed` decremented on `(org, variant, location)` but incremented on the lot/serial key → cross-lot corruption → oversell |
| CONC-003 | Idempotency replay unreachable — the caught duplicate-key INSERT poisons the transaction, which aborts `23505`. **CONFIRMED by probe 2026-08-11** (Postgres 18.4); `ON CONFLICT DO NOTHING RETURNING` proven as the fix |
| SEC-001 | No segregation of duties: `approveAdjustment` never compares approver to initiator |
| SEC-002 | Create / approve / post / cancel adjustments all gated on one key |
| SEC-003 | No warehouse or location scoping anywhere in the module |
| SCH-001 | UoM conversion does not exist — `ratio_to_base` is written and never read |
| COST-001 | COGS never recorded; layer consumption is not persisted |
| COST-002 | Costing method ignored at runtime — every product is averaged and consumed FIFO |
| ~~COST-006~~ | **Downgraded to P1.** `accounting_periods` and `assertPeriodOpen` already exist (`modules/accounting/gl/periods.service.ts:306`); Inventory simply never calls them. Two real defects remain: the guard is duplicated in `FinancePostingService:117`, and both **fail open** when no period row covers the date |

## Open — P1

CONC-004 (deadlock in `executeInTx`), CONC-005 (unbounded layer lock), CONC-006 (`outgoing_qty` excluded from availability), CONC-007 (float math in the money path), CONC-008 (`allowBackorders` removes the only guard), COST-003 (reversal corrupts layers), COST-004 (silent layer shortfall), COST-005 (no landed cost / FX), COST-007 (no reconciliation job or report), COST-008 (partial GL posting), SEC-004 (cost never masked), SEC-005 (cycle-count SoD + blind counting), SCH-002 (ledger unpartitioned), SCH-003 (reservation rows carry fake before/after), SCH-004 (layers not location/lot aware), SCH-007 (no reservation idempotency), AI-001, AI-003, UI-002, UI-003.

## Open — P2

CONC-009, CONC-010, CONC-011, SCH-005, SCH-006, SEC-006, SEC-007, SEC-008, AI-002, UI-001.

---

## Closed — schema landed (code still to follow in Phase 2)

| Migration | Closes | Notes |
|---|---|---|
| 0399 `inv_uom_conversions` | SCH-001 | `inv_product_uom_conversions` + `uom_id`/`quantity_entered` on all five line tables, each with an FK to `inv_uom` |
| 0400 `inv_valuation_grain` | SCH-004, COST-004 | `location_id`/`lot_id` on layers; FIFO partial index rebuilt to lead with the new grain |
| 0401 `inv_cogs_ledger` | COST-001 | `inv_valuation_consumptions` + `inv_average_cost_history`; composite tenant FKs to both parents |
| 0402 `inv_standard_costs` | COST-002 (part) | Effective-dated table. **Column NOT dropped** — see correction below |
| 0403 `inv_location_scoping` | SEC-003 (part) | `inv_user_warehouses` |
| 0404 `inv_posting_date` | COST-006 (part) | `posting_date` distinct from `created_at` |
| 0405 `inv_reservation_idempotency` | SCH-007 | Idempotency key + partial unique on `(org, source_type, source_id, coalesce(line,''))` where ACTIVE |
| 0406 `inv_barcodes` | SCH-005 | Exclusive-arc CHECK; legacy `barcode` columns retained until Phase 2 |
| 0407 `inv_stock_policy` | CONC-010, SEC-001 (part) | Per-product negative-stock flag, value threshold, `inv_reason_codes` seeded per org |

**Verification:** backend `tsc --noEmit` — 0 Inventory errors (3 pre-existing failures in `ai-action-copilot.spec.ts` and two payroll filings specs, untouched). All nine migrations executed in sequence against the dev DB inside a transaction, then the rollback script ran in the same transaction: 0 residual tables, 0 residual columns. **Nothing was persisted; migrations are not applied.**

### Correction to the Phase 0 audit

COST-002 claimed `inv_products.standard_cost` "is never read anywhere." **Wrong.** It is read by `reports/inv-reports-extended.service.ts:153,183` for valuation, exposed in the products DTO, and rendered in six frontend files. What is true: the *stock engine* never consults it — `updateWeightedAverage` runs regardless of costing method and consumption is always FIFO. So 0402 adds the effective-dated table but does **not** drop the column; that happens in Phase 2 once the readers move.

### Deferred from this batch

- **0408** (drop `RESERVATION_*` from `inv_txn_type`) — an enum removal without its code change breaks the build, so it lands with the Phase 2 reservation work.
- **SCH-002** ledger partitioning — §19 forbids partitioning a table that is not demonstrably large, and it would forfeit the composite tenant FKs to the ledger.
- **SCH-006** JSONB→tables — no correctness impact; after the P0 work.

---

## Next

1. **Verify the migration journal reproduces from empty before applying 0399–0407.** 139 SQL files vs 128 journal entries before this batch — 11 files were unjournaled, and `db:migrate` was already broken by desync in July. Applying on top of that inherits the problem.
2. Phase 2 — the five P0 code fixes that need no schema: CONC-001, CONC-002, CONC-003, SEC-001, SEC-002.
3. Phase 2 — wire the new schema in: UoM conversion at every boundary, layer consumption + costing-method dispatch, warehouse scoping predicate, period guard, reservation idempotency, barcode lookup, then retire `inv_products.standard_cost` and the legacy `barcode` columns, then 0408.
4. Seed to scale and capture the real baseline (as `streamline_app`, `app.organization_id` set) so Phase 3 has before/after numbers. **Still open.**
5. Repo-wide sweep: `try/catch` around a statement inside `db.transaction` is unsound (drizzle takes no per-statement savepoint) — find instances beyond Inventory.

## Flagged by the Notifications programme — 2026-08-11

**`0408`, `0410` and `0411` are taken by Notifications**, all journalled and applied:
`0408_notification_category_accounting`, `0410_notification_visibility_resource_kind`,
`0411_suppression_reason_no_access`. Your `0409_inv_transfer_cost_carry` landed between them and is
untouched — I renumbered mine around it.

The deferred `inv_txn_type` `RESERVATION_*` removal listed above as **0408 must renumber to 0412
or later**; coordinate with `docs/refactor/notifications-phase1-schema-plan.md`, which takes
`0412` next for `notification_outbox`.

**We nearly added a seventh duplicate migration number.** Both programmes wrote `0409` within
minutes of each other. Caught before it landed, so the journal still has only the six known
duplicates (`0300`, `0370`–`0375`). While two programmes are writing migrations in parallel,
run `ls migrations/04*.sql` immediately before naming a file — not at the start of the session.

> **Retracted, same day:** I first recorded here that `0399`–`0407` were only *partially* applied.
> That was wrong. I probed `to_regclass` using table names inferred from **migration filenames**
> rather than from the SQL — `0399_inv_uom_conversions.sql` creates `inv_product_uom_conversions`,
> and `0401_inv_cogs_ledger.sql` creates `inv_valuation_consumptions` + `inv_average_cost_history`,
> not tables matching their filenames. Re-probed with the real names: **all present. The batch is
> applied and reconciled, exactly as this tracker already said.** No action needed, and
> `db:migrate` is not unsafe.

## Done

- **2026-08-11** — CONC-003 probe run against the live dev DB and confirmed; probe script deleted. No application code written.
