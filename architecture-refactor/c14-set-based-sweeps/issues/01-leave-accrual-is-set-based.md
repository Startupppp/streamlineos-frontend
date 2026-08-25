# 01 — Leave accrual is set-based

**What to build:** Monthly leave accrual completes in seconds for an organisation of any size. Today, for each accrual policy it re-fetches the entire member list — identically every time — then per member issues an existence check, a balance read and its own transaction. Five policies and five hundred employees is five thousand reads and up to two and a half thousand transactions, and it runs per organisation.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Final balances match the per-row implementation exactly, for a fixture spanning active, inactive, probationary, at-ceiling, already-accrued and never-accrued employees.
- [ ] The accrual ceiling is still respected — an employee at the maximum gains nothing, one just below gains only the remainder.
- [ ] Running the sweep twice produces the same state as running it once.
- [ ] A batch failing part-way and being re-run produces no duplicates and no gaps.
- [ ] The invariant member read happens once, not once per policy.
- [ ] One transaction per batch, with the batch size explicit and inside parameter limits.

## Todo

- [ ] Hoist the member read out of the policy loop
- [ ] Collapse the existence check into one set membership test over the period
- [ ] Express the ceiling clamp in SQL — getting this wrong over-credits people
- [ ] Ensure the transaction mock invokes its callback, or the assertions prove nothing
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c14 — Background sweeps operate on sets, not on rows`](../prd.md) · Candidate index: [`../README.md`](../README.md)
