# 31: Add adaptive protected-work planning

**What to build:** Schedule and safely move authorized flexible work blocks around meetings, priorities, estimates, deadlines, and working-time limits.

**Blocked by:** 13: Build privacy-safe availability and diagnostics; 28: Propose source-owner actions with receipts; 30: Deliver role-aware My Day, search, and saved views.

**Status:** in-progress

- [ ] Only Calendar-managed movable blocks change automatically; source-owned dates remain proposals requiring owner confirmation.
- [ ] Locked blocks, breaks, leave, nonworking days, maximum daily load, priorities, estimates, and deadlines are respected.
- [ ] Move budgets and hysteresis prevent blocks from thrashing after every schedule change.
- [ ] Every move explains why it happened, records its prior slot, and offers a safe version-checked undo.
- [ ] Tests cover impossible workload, stale availability, repeated meeting churn, permission loss, deadline change, and undo collision.

