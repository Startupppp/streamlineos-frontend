# 67 — The approvals inbox cursor expresses the ordering it pages through

**What to build:** Scrolling the approvals inbox shows every pending approval exactly once. The read orders by creation time then identifier, but when the cursor's timestamp is absent it falls back to comparing identifiers alone — and the identifier is not monotone with creation time, so that branch both skips rows and repeats them. A user scrolls past an approval that was waiting for them.

Delete the branch rather than repair it: a cursor that cannot express the ordering is not a cursor. The board already does this correctly, carrying the ordering mode in the cursor so a stale cursor from a different sort is rejected instead of silently misapplied.

The supporting index is a separate, unmeasured question: it covers organisation, approver and status with no creation time or identifier, so it can select the rows but cannot supply their order. That is a performance claim this review could not verify — record it with the query that would settle it rather than asserting an improvement.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The identifier-only cursor branch is gone
- [ ] Every cursor carries enough to express the ordering it belongs to, and a mismatched cursor is rejected rather than misapplied
- [ ] A test pages through a fixture where identifier order and creation order disagree, and sees each row once
- [ ] Keyset pages carry no total, per BE-25
- [ ] Any index change is proposed with the plan that would justify it, not asserted as an improvement
