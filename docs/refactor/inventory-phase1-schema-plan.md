# Inventory — Phase 1 Schema & Migration Plan (proposal, gated)

Date: 2026-08-11 · Closes: SCH-001..007, COST-001..006, SEC-003, CONC-010
Standing decisions: keep all three costing methods per product (D-02) · **no live stock data** (D-03) · no cost egress to the model provider (D-04)

D-03 is the whole reason to do this now. With zero rows, every change below is a direct additive migration — no expand-contract, no backfill, no cutover. The same work against live stock would be a multi-week programme.

Latest migration is `0398`. New work starts at `0399`.

---

## Decisions taken (2026-08-11)

| # | Decision | Consequence |
|---|---|---|
| D-06 | Cost layers keyed **per (item, location), plus lot where tracked** | FIFO consumption becomes location-scoped. **Transfers must now move cost, not just quantity** — see below |
| D-07 | Access scoped at **warehouse level** | One `inv_user_warehouses` table; resolves to a plain `IN` list over the existing `idx_inv_locations_warehouse` |
| D-08 | Document lines store **both entered and base** quantity | `uom_id` + `quantity_entered` + `quantity_base` on all five line tables; a wrong conversion factor stays detectable after the fact |
| D-09 | Reservation events **removed from the movement ledger** | Drop `RESERVATION_CREATE / RELEASE / CONSUME` from `inv_txn_type`; the ledger comes to mean only "stock moved" |

### D-06 consequence: transfers must carry cost

With company-wide layers a transfer is cost-neutral — the same queue serves both ends. With layers keyed per location it is not. A transfer out of A and into B must **consume the layer at A and create a layer at B at the consumed cost**, or the value silently migrates to whatever unrelated layer B happens to hold, and per-warehouse valuation drifts from day one.

This affects the two-step transfer specifically: ship (out of A, into in-transit) then receive (out of in-transit, into B). In-transit must therefore hold cost layers of its own, which means it must be a real location — `inv_location_type` already has `TRANSIT`, so the type exists; the transfer path has to actually use it.

Not a schema change beyond the `location_id` already proposed, but a Phase 2 requirement that did not exist under the company-wide model. Recorded here so it is not discovered later.

### D-09 consequence: enum change

Removing three values from `inv_txn_type` is a Postgres enum rewrite, not an additive change. With zero rows it is trivial; it becomes expensive the moment there is data. Sequenced as `0408` and worth doing in this window rather than after.

---

## Corrections to Phase 0

Two findings were wrong or overstated. Both are recorded here rather than quietly amended.

**COST-006 was mis-scoped.** I reported "no period close exists." The module-level grep was right but the conclusion was not: `accounting_periods` exists (`db/schema/accounting/accounting-core.ts:22`) with `OPEN | CLOSING | CLOSED | LOCKED`, and `PeriodsService.assertPeriodOpen(orgId, date)` exists (`modules/accounting/gl/periods.service.ts:306`). The GL ledger calls it. **Inventory calls neither.** So this is not "build period close" — it is "wire Inventory into the guard that already exists," which is far cheaper. Two real defects remain underneath:

1. There are **two** `assertPeriodOpen` implementations — `PeriodsService` (takes a `Date`) and `FinancePostingService:117` (takes a `string`). Duplicate guard, two places to get wrong.
2. Both **fail open**: `if (period && (status === LOCKED || CLOSED))`. If no period row covers the date — which is the state of every org that has not generated periods — everything posts. A closed-period guard that passes when periods do not exist is not a guard.

**SCH-002 (partitioning) is deferred, against the source document.** The document says partition the ledger "from the start." `CLAUDE.md` §19 says the opposite: do not partition a table that is not demonstrably large, and record the triggering row count in the migration. The table currently holds ~0 rows. Partitioning now also has a concrete cost: the partition key must appear in every unique constraint, so `uniq_inv_stock_transactions_org_id (org_id, id)` would become `(org_id, id, created_at)` and the composite tenant FKs pointing at the ledger — installed by the Wave-4 programme — could no longer be declared. Deferring keeps referential integrity and costs nothing while the table is empty. Revisit at a measured row count.

---

## 1. UoM conversion — SCH-001 (P0)

**The existing model cannot express the problem.** `inv_uom.ratio_to_base` is a property of the *unit*, but outside pure dimensional units there is no such thing: a case of widgets is 12, a case of bolts is 100. A per-unit global ratio is structurally wrong, which is likely why nothing ever read it.

No document line carries a unit at all — `inv_po_lines.quantity`, `inv_grn_lines.quantity_received`, `inv_so_lines.quantity`, `inv_stock_transfer_lines.quantity`, `inv_stock_adjustment_lines.quantity_change` are all bare `decimal(18,4)`.

```
inv_product_uom_conversions
  id, org_id, product_id, uom_id,
  factor_to_base   numeric(18,8) NOT NULL CHECK (factor_to_base > 0)
  created_at, updated_at
  UNIQUE (org_id, product_id, uom_id)
  INDEX  (org_id, product_id)
  composite tenant FKs → inv_products(org_id, id), inv_uom(org_id, id)
```

- `inv_products.uom_id` is the item's base; implicit factor 1, never stored.
- `inv_uom.ratio_to_base` narrows to dimensional conversion within a `category` (kg→g) and stops being the item conversion path. `is_base` becomes catalogue-level.
- **Ledger and snapshot are always base UoM.** Conversion happens once, at the boundary, in a single shared exact-numeric function — never in float, never at more than one call site.
- Rounding: convert exactly in `numeric`, round only for display. `inv_uom.rounding_precision` becomes display-only. A 1/3 factor is exact in the DB and rounded on screen, never on the way in.

Document lines gain `uom_id` + the entered quantity — see Decision 3.

**Rollback:** drop the table and the added columns. Nothing depends on them until Phase 2 code lands.

---

## 2. Cost layers — COST-001, COST-002, COST-004, SCH-004 (P0)

### 2a. Layer grain

`inv_valuation_layers` currently keys on `(org_id, product_variant_id)` only. Add `location_id` and `lot_id` — see Decision 1 for the grain.

### 2b. Layer consumption — this is what makes COGS exist

```
inv_valuation_consumptions
  id, org_id,
  stock_transaction_id  → the issue that consumed
  valuation_layer_id    → the layer consumed
  quantity              numeric(18,4) NOT NULL CHECK (quantity > 0)
  unit_cost             numeric(18,4) NOT NULL
  total_cost            numeric(18,4) NOT NULL
  created_at
  UNIQUE (org_id, stock_transaction_id, valuation_layer_id)
  INDEX  (org_id, stock_transaction_id)
  INDEX  (org_id, valuation_layer_id)
  composite tenant FKs → inv_stock_transactions(org_id, id), inv_valuation_layers(org_id, id)
```

Written in the same transaction as the issue. `inv_stock_transactions.unit_cost` / `total_cost` are then populated on outbound rows from the consumption sum — today they are `null` on every issue, which is why COGS is unrecoverable. Both parents already carry the `uniq_..._org_id` constraints the composite FKs need.

### 2c. Weighted average becomes explainable

```
inv_average_cost_history
  id, org_id, product_variant_id, stock_transaction_id,
  qty_before, avg_before, qty_in, unit_cost_in, avg_after
  created_at
  UNIQUE (org_id, stock_transaction_id)
  INDEX  (org_id, product_variant_id, created_at)
```

The document requires recomputations to be *recorded*, not just applied, so a past valuation can be explained. One row per recomputation.

### 2d. Standard cost becomes effective-dated

`inv_products.standard_cost` is a single scalar that is never read anywhere. Replace it:

```
inv_standard_costs
  id, org_id, product_variant_id,
  unit_cost       numeric(18,4) NOT NULL
  effective_from  date NOT NULL
  effective_to    date            -- null = current
  created_by, created_at
  UNIQUE (org_id, product_variant_id, effective_from)
  INDEX  (org_id, product_variant_id, effective_from DESC)
```

Purchase price variance and usage variance post through the existing `acc_system_account_map` rather than a new mapping.

`DROP COLUMN inv_products.standard_cost` — safe now, no data.

### 2e. Costing method becomes immutable once stock has moved

`inv_products.costing_method` is freely editable via `inventory:products:update` today. Switching method mid-life silently restates history. Proposal: reject the change once the variant has any movement; a genuine change goes through a revaluation record with its own permission (SEC-007) and audit entry.

---

## 3. Location scoping — SEC-003 (P0)

There is no warehouse or location dimension in RBAC anywhere. `applyScope` handles `own` / `team` / `all` over a *user* axis (`apply-scope.ts`) and cannot express "this operator transacts in these warehouses." `team` scope is also under a standing `CLAUDE.md` prohibition until its correlated subquery is removed, so reusing it is not an option.

```
inv_user_warehouses
  id, org_id, user_id, warehouse_id,
  granted_by, created_at
  UNIQUE (org_id, user_id, warehouse_id)
  INDEX  (org_id, user_id)
  composite tenant FK → inv_warehouses(org_id, id)
```

Resolved once per request into an id list and applied as `location_id IN (SELECT id FROM inv_locations WHERE warehouse_id = ANY($1))` — a plain `IN` list, not a correlated subquery, so it does not repeat the `team`-scope mistake. `idx_inv_locations_warehouse` already supports it.

A new permission bypasses scoping org-wide for controllers and finance. Grain is Decision 2.

---

## 4. Period integrity — COST-006 (P1, downgraded from P0)

No new table. Three changes:

1. `StockEngineService` calls the period guard before every posting, through the accounting module's service (§18 — cross-module access goes through the service, never the schema).
2. Consolidate the two `assertPeriodOpen` implementations into one.
3. Decide the fail-open behaviour: today a date with no matching period row posts freely. Recommend failing closed once an org has generated any period, so an unbounded past or future date cannot slip through.

Plus a real posting date:

```
ALTER TABLE inv_stock_transactions ADD COLUMN posting_date date;
INDEX (org_id, posting_date)
```

`created_at` is when the row was written; `posting_date` is the business date the movement belongs to. The document is right that both matter and that conflating them is how backdated entries become invisible.

---

## 5. Reservation integrity — SCH-007, CONC-008 (P1)

```
ALTER TABLE inv_stock_reservations
  ADD COLUMN idempotency_key text;
CREATE UNIQUE INDEX uniq_inv_reservations_org_idem
  ON inv_stock_reservations (org_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX uniq_inv_reservations_org_source
  ON inv_stock_reservations (org_id, source_type, source_id, coalesce(source_line_id, ''))
  WHERE status = 'ACTIVE';
```

The `coalesce(col, '')` sentinel matches this repo's convention (`uniq_inv_stock_levels_natural_key`); `nullsNotDistinct` is not used anywhere here. The partial `WHERE status = 'ACTIVE'` lets a released reservation be re-created for the same source line without tripping the constraint.

Reservation events in the movement ledger are Decision 4.

---

## 6. Smaller items

| Change | Closes | Detail |
|---|---|---|
| `inv_barcodes` (org_id, exclusive arc product_id XOR variant_id, code, type, is_primary), `UNIQUE (org_id, code)` | SCH-005 | Exclusive arc + CHECK per §19; one item, many GTINs, uniquely resolvable per tenant |
| `inv_products.allow_negative_stock boolean NULL` | CONC-010 | Null falls back to the org setting; override needs its own permission |
| `inv_settings.adjustment_approval_value_threshold` | SEC-001 support | Today's threshold is quantity-only, so a 1-unit write-off of a £50k item never needs approval |
| `inv_reason_codes` (org_id, code, label, category, requires_approval, is_active) | new | The `inv_adj_reason` enum cannot be extended per tenant, and reason codes are what make shrinkage analysis possible. Seed from the current enum values. **Optional — say if you would rather keep the enum** |

Deferred with reasons: ledger partitioning (§19, above); JSONB→tables for `channels.warehouse_ids`, `webhooks.events`, 3PL `sku_mapping` (SCH-006 — heavier, no correctness impact, better placed after the P0 work).

---

## Migration sequence

Every migration sets `lock_timeout` per §19. All are additive; with no data none require a backfill.

| # | Migration | Contents | Rollback |
|---|---|---|---|
| 0399 | `inv_uom_conversions` | `inv_product_uom_conversions`; `uom_id` + entered-qty columns on the five document-line tables | Drop table + columns |
| 0400 | `inv_valuation_grain` | `location_id`, `lot_id` on `inv_valuation_layers`; rebuild the FIFO partial index to match | Drop columns, restore index |
| 0401 | `inv_cogs_ledger` | `inv_valuation_consumptions`, `inv_average_cost_history` | Drop both |
| 0402 | `inv_standard_costs` | New table; `DROP COLUMN inv_products.standard_cost` | Re-add column (nullable), drop table |
| 0403 | `inv_location_scoping` | `inv_user_warehouses` | Drop table |
| 0404 | `inv_posting_date` | `posting_date` + index on `inv_stock_transactions` | Drop column |
| 0405 | `inv_reservation_idempotency` | Reservation key + two partial unique indexes | Drop column + indexes |
| 0406 | `inv_barcodes` | Table + exclusive-arc CHECK | Drop table |
| 0407 | `inv_stock_policy` | `allow_negative_stock`, `adjustment_approval_value_threshold`, `inv_reason_codes` | Drop columns + table |
| 0408 | `inv_txn_type_drop_reservations` | Remove `RESERVATION_CREATE / RELEASE / CONSUME` from `inv_txn_type` (enum rewrite — trivial at zero rows, expensive later) | Re-add the three values |

`db:migrate` was broken by journal desync at 2026-07-26 and migrations 0301–0304 were applied directly. **Verify the journal reproduces from empty before running any of this** — per §19 a migration counts only when `db:migrate` reproduces it on an empty DB.

---

## What Phase 1 does not fix

These are P0 but pure code, and they do not wait on schema. They can land in parallel with, or ahead of, everything above:

- **CONC-001** reservation without `locationId` skips the lock and availability check.
- **CONC-002** `committed` decremented on a wider key than it was incremented on.
- **CONC-003** idempotency claim poisons the transaction — confirmed by probe; fix is `ON CONFLICT DO NOTHING RETURNING`.
- **SEC-001 / SEC-002** approver is never compared to initiator; one permission covers the whole write-off lifecycle.

If you want the fastest reduction in real risk, these four go first — they are the ones that lose money today.
