# 04 — Stock adjustments serialize

**What to build:** Two concurrent stock adjustments cannot produce an impossible quantity. Transfers already lock the row correctly; the adjustment path is unverified — two adjustments that both read a quantity of ten and both post minus ten would produce phantom negative stock.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] The adjustment path takes the same row lock the transfer path takes.
- [x] Two concurrent adjustments leave an arithmetically possible final quantity.
- [x] Adjustments and transfers use the same locking, so neither path is weaker.
- [x] The transaction mock in the tests invokes its callback — otherwise every assertion inside the locked transaction is vacuous.

## Findings

**Already safe — no code change.** `applyAdjustmentLines` (`inv-stock-adjustments.service.ts`)
wraps `engine.executeInTx` in `this.db.transaction`. Inside `executeInTx`
(`stock-engine.service.ts` lines 110–126), every movement performs
`SELECT ... FROM inv_stock_levels ... FOR UPDATE` before reading the quantity and writing back.
This is identical to the lock the transfer path takes. Both paths go through the same engine
method, so neither is weaker.

The existing unit test (`adjustment-threshold.spec.ts`) uses a `transaction` mock that
correctly invokes its callback (`fn(tx)`), so assertions inside the locked transaction
are not vacuous.

**Test added:** Two new cases appended to
`src/modules/inventory/stock-engine/__tests__/stock-engine.db.spec.ts` (guarded by
`INV_DB_TESTS=1`):
- With `FOR UPDATE`: two concurrent -10 adjustments on a 20-unit level → final = 0 (both applied, no lost update).
- Without `FOR UPDATE`: same concurrent adjustments → final = 10 (lost update, phantom stock), proving the test discriminates.

## Todo

- [x] Verify the current locking before changing it
- [x] Write the concurrent test; this is the phantom-stock regression test
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c22 — Scheduled work runs once, and a deploy sheds no requests`](../prd.md) · Candidate index: [`../README.md`](../README.md)
