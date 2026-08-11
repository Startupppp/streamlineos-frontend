# COMPLETION REPORT — Inventory & Stock

Date: 2026-08-11 · Tasks: 38 of 44 complete · See `TASKS.md`, `DECISIONS.md`, `REFACTOR-STATE-INVENTORY.md`

## Three-pass verification

### Pass 1 — Evidence

| Check | Command | Result |
|---|---|---|
| Full Inventory suite | `jest --maxWorkers=2 --testPathPattern="modules/inventory"` | **22 suites, 231 passed, 0 failed**, 541s, exit 0 |
| Real-DB suite | `INV_DB_TESTS=1 jest --runInBand --testPathPattern="stock-engine.db"` | **5 passed, 0 failed** |
| Types | `tsc --noEmit` | **0 Inventory errors** (3 pre-existing elsewhere: `ai-action-copilot.spec.ts`, two payroll filings specs) |
| Cycles | `madge --circular src/modules/inventory` | **1 cycle**, `notifications/notification.types.ts > notification-events.catalog.ts` — not mine, reproduces on `src/modules/notifications` alone |
| Migrations | forward + rollback in one transaction | **0 residual tables, 0 residual columns** |
| Migration state | journal vs `__drizzle_migrations` | **"db:migrate would now apply: nothing"** |

Lint: **not run** (CLAUDE.md §3 restricts it to explicit request).

### Pass 2 — DoD re-checked against the code

Verified by reading the code, not the changelog. Two of my own grep patterns
produced false alarms and were themselves wrong:

- `grep "onHand: sql"` returned 10 hits that looked like direct quantity
  mutations. All 10 are **read-side `SUM()` aggregates** in SELECT projections
  (`inv-ai`, `replenishment`, `reports`, `valuation`). Not violations.
- `grep "tx.insert(invStockTransactions)"` returned 0, implying the ledger
  insert had vanished. It is present at `stock-engine.service.ts:186` and `:478`;
  a formatter had split the call across lines.

Confirmed present: `onConflictDoNothing()` ×3, `Maker-checker` guard ×1,
`assertLocationsInScope` ×2 and `assertPeriodOpen` ×2 (both engine entry points),
`stripCostFields` ×6.

### Pass 3 — Adversarial

| Banned pattern | Found |
|---|---|
| Direct quantity mutation (`SET on_hand = on_hand ± n`) | **0** |
| `any` at boundaries / `as any` | **0** |
| `@ts-ignore` / `@ts-expect-error` | **0** |
| `SELECT *` | **0** |
| Files over 500 lines | **3** — see "Not done" |

Concurrency was tested under genuine parallel load with a **negative control**:
the same test without `FOR UPDATE` provably oversells to −1, so the passing case
is discriminating rather than vacuous.

## What was fixed

**Overselling** — three independent paths. A reservation with no `locationId`
performed no lock, no availability check and no `committed` increment, so it
always succeeded. `committed` was incremented on the locked
`(org, variant, location, lot, serial)` row but released on
`(org, variant, location)` alone, decrementing every lot at that location with
`GREATEST(0, …)` absorbing the damage. `outgoing_qty` was excluded from
availability, so picked-not-shipped stock was promised twice.

**Idempotency** — `claimIdempotencyKey` caught a duplicate-key INSERT then read
the existing row. Postgres aborts the transaction on statement error and Drizzle
takes no per-statement savepoint, so the replay branch was unreachable and the
request died `23505`. Proven by probe, then locked in by a real-DB test that
asserts both the working shape and the broken one.

**Write-off controls** — approval never compared approver to creator, and
create/approve/post/cancel shared one permission.

**Costing** — COGS did not exist: issues decremented `remaining_quantity` with no
record of which layers went, and outbound rows carried a null cost. The costing
method on the product was ignored; everything was averaged then consumed FIFO.

**Access** — no warehouse dimension existed in RBAC at all, and cost/margin were
returned to anyone who could read stock. Both closed: warehouse scoping is
deny-by-default across ten read surfaces plus one write gate, and cost fields are
stripped server-side at six sites for callers without `inventory:valuation:read`.

**Period integrity** — `accounting_periods` and `assertPeriodOpen` already existed
and Inventory simply never called them, so a backdated movement could silently
restate a reported month.

## Migrations

0399–0407 and 0409, applied and reconciled on the dev DB. Each ships a sibling
`.down.sql`, and the rollbacks were **executed**, not merely written.

Deviation from the protocol: applied as single-step rather than expand-contract,
on evidence rather than assumption — the inventory tables held 0 rows (D-03,
user-confirmed). `inv_products.standard_cost` and the legacy `barcode` columns
were deliberately **not** dropped, because they are still read.

## Not done

| Item | Why |
|---|---|
| `stock-engine.service.ts` 868 lines (§9 cap 500) | Extracted the duplicated low-stock block (899→861, +7 from the period guard); the larger MovementApplier split is a ~200-line move I judged too risky to attempt in the same pass. **The one Pass-3 finding not fixed.** |
| `grn.service.ts` 614 lines, `inv-ai-explain.service.spec.ts` 840 | Pre-existing, outside this module's changes |
| Quality inspections + recalls scoping | **Not scopable as designed** — inspections carry no location and point at their source via a polymorphic `source_type`/`source_id` pair (the pattern §19 bans); recalls are inherently org-wide. Needs a schema change, not a filter. D-16 |
| Reports service scoping | Not done |
| Period guard fail-open | **Wiring is done** — the engine now calls `assertPeriodOpen` on both entry points (D-17). But the guard is still duplicated in `FinancePostingService:117` and **both copies fail open** when no period row covers the date. That is an accounting-module defect I did not change |
| Reservation events removed from the ledger (SCH-003) | Deferred to expand-contract per D-13 — enum value removal is irreversible |
| Ledger partitioning (SCH-002) | §19 forbids partitioning a table that is not demonstrably large; would forfeit the composite tenant FKs |
| In-transit as a real location | Stock is off the books mid-transfer, so reconciliation cannot balance during one |

## Needs your confirmation

- **DECISIONS.md#D-13** — I did **not** remove `RESERVATION_*` from the
  `inv_txn_type` enum as decision D-09 called for. Enum value removal is
  irreversible and the protocol's default is expand-contract. The reversible
  half (stop writing them) is also not done yet.
- **DECISIONS.md#D-14** — real-DB tests are opt-in behind `INV_DB_TESTS=1` so the
  default run stays hermetic. They will not run in CI unless enabled.
- **Warehouse scoping is deny-by-default.** A user with neither
  `inventory:warehouses:scope-all` nor an `inv_user_warehouses` row now sees no
  stock and can post no movement. Safe only because there is no live stock data.
  Granted to `INVENTORY_MANAGER`; owners and org admins inherit it.

## Git — needs your intervention

Three backend commits are cross-contaminated and **should be split before going
anywhere shared**:

- `ae3cf746` "WIP snapshot" — 159 files, ~26 mine.
- `e5f6b8bd` "fix(inventory): P0 oversell…" — 31 files, 6 mine.
- `2315259b` "feat: enhance notifications service…" — **made by a concurrent
  session, not by me**, and it swept in 15 of my Inventory files (the quality and
  cycle-count scoping, `cost-visibility.ts`, the real-DB spec, and the
  `emitLowStock` extraction). My work is committed and intact, but attributed to
  a notifications commit.

My final commit attempt used a pathspec against what I expected to be an empty
index; the index held **64 files** staged by the concurrent Build program, and
`src/modules/inventory/` reported "no changes added" because that session had
already committed my files moments earlier. I stopped committing at that point
rather than add a fourth entangled commit.

Cause: this working tree is shared by five concurrent programs and the index is
pre-populated by them. `git add` then `git commit`, and `git commit --amend`,
both consume the whole index. Both commit messages now state their real contents.
`git reset` is forbidden by CLAUDE.md §0.11, so the fix is yours:

```
git -C backend reset --soft HEAD~2
```

Nothing is pushed; every file is intact in the working tree. The frontend commit
`5e4d2a58d` is clean. Later work follows D-15: pathspec-only commits against a
verified-empty index.

## Metrics

No before/after performance metrics. The dev database holds 0 inventory rows, so
`EXPLAIN` plans, p95 latencies and the ledger-vs-snapshot discrepancy rate — the
audit's headline health measure — are not measurable. Capturing them requires
seeding to scale and running as `streamline_app` with `app.organization_id` set.
Reporting invented figures would be worse than reporting none.
