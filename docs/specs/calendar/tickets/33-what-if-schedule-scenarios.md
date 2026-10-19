# 33: Preview and apply what-if schedules

**What to build:** Let users model selected meeting and source-commitment changes, inspect downstream consequences, and apply only confirmed actions.

**Blocked by:** 28: Propose source-owner actions with receipts; 32: Build the dependency graph, Commitment Radar, and chain view.

**Status:** in-progress

- [ ] Scenario preview reads one versioned permission-scoped graph snapshot and performs zero writes.
- [ ] Before/after impact identifies affected people, commitments, resources, customers, and evidence confidence.
- [ ] A scenario expires when any relevant version, permission, policy, or availability input changes.
- [ ] Applying selected changes reauthorizes each owner and returns per-step outcomes.
- [x] Tests cover cyclic dependency, hidden node, stale scenario, partial application, owner rejection, and repair after timeout.

