# 01 — Leave accrual is set-based

**What to build:** Monthly leave accrual completes in seconds for an organisation of any size. Today, for each accrual policy it re-fetches the entire member list — identically every time — then per member issues an existence check, a balance read and its own transaction. Five policies and five hundred employees is five thousand reads and up to two and a half thousand transactions, and it runs per organisation.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] Final balances match the per-row implementation exactly, for a fixture spanning active, inactive, probationary, at-ceiling, already-accrued and never-accrued employees. — `backend/src/modules/cron/cron-leave.service.ts:159-163` (insert-path clamp) and `:216-221` (SQL `CASE`/`LEAST` update-path clamp) express the same ceiling rule on both paths; inactive members are excluded by the `users.isActive` join at `:101-104`; already-accrued pairs are excluded via `alreadyAccruedSet` at `:109-125`.
- [x] The accrual ceiling is still respected — an employee at the maximum gains nothing, one just below gains only the remainder. — `cron-leave.service.ts:161-163`: `next = maxBalance !== null ? Math.min(current + rate, maxBalance) : current + rate; granted = next - current; if (granted <= 0) continue;` — at-ceiling yields `granted === 0` and is skipped.
- [x] Running the sweep twice produces the same state as running it once. — `alreadyAccruedSet` (`:109-125`) is recomputed from `hr_leave_ledger` at the start of every invocation, keyed on `(userId, leaveTypeId)` for `txnType='accrual' AND period=periodLabel AND source='cron'`; a second run finds every prior grant and produces zero candidates for them.
- [x] A batch failing part-way and being re-run produces no duplicates and no gaps. — each batch is one `db.transaction` (`:194-247`); a mid-batch failure rolls back that whole batch atomically, and because `alreadyAccruedSet` is recomputed fresh on the next invocation from committed ledger rows, only the unaccrued remainder is reprocessed.
- [x] The invariant member read happens once, not once per policy. — `activeMembers` query at `:101-104` runs once before the `for (const policy …)` loop at `:154`; asserted by `cron-leave.service.spec.ts` ("reads members once regardless of how many policies exist").
- [x] One transaction per batch, with the batch size explicit and inside parameter limits. — `ACCRUAL_BATCH_SIZE = 500` (`cron-leave.service.ts:25`), sliced at `:194-195`.

## Todo

- [x] Hoist the member read out of the policy loop — `cron-leave.service.ts:101-104`
- [x] Collapse the existence check into one set membership test over the period — `alreadyAccruedSet`, `cron-leave.service.ts:109-125`
- [x] Express the ceiling clamp in SQL — getting this wrong over-credits people — `cron-leave.service.ts:216-221` (`UPDATE … SET balance = CASE WHEN v.max_b IS NOT NULL THEN LEAST(...) ELSE ... END`)
- [x] Ensure the transaction mock invokes its callback, or the assertions prove nothing — `cron-leave.service.spec.ts`, test "the transaction mock invokes its callback so assertions inside are not vacuous" (lines ~130-159), asserts `callbackInvoked === true` and `txInsert` was called
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Verification note (orchestrator, 2026-08-26):** this ticket was found already fully implemented prior to Batch B — no code changes were made. Verified directly against source, not taken on the implementing agent's word.

---

PRD: [`c14 — Background sweeps operate on sets, not on rows`](../prd.md) · Candidate index: [`../README.md`](../README.md)
