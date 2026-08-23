# 04 — Team scope always takes the correlated subquery, and the fast path is unreachable

**What this records:** a measured state and a decision to put to you, not a change.

`applyScope`'s `team` branch has two paths. The fast one needs **both** `cols.teamColumn` and a pre-fetched `cols.teamIds`; otherwise it falls back to `owner IN (SELECT ... FROM org_unit_members ...)`, a correlated subquery run per row.

Verified 2026-08-23: of **56** `applyScope` call sites, **zero** supply a `teamColumn`. Not "few" — none. The fast path is guarded by a condition no caller can currently make true, so every team-scoped list takes the subquery. Backend `CLAUDE.md` §5 already says team scope ships only once that subquery is eliminated.

Two things follow, and the second is the one that needs your call.

**It is reachable by configuration.** No role default grants `team`, but `permission-catalog-sync` registers `team` as an available scope for every scopable permission, so an administrator can grant it from the roles screen today — and that person's lists quietly get the subquery.

**Making the fast path real is not a small change.** It means every list service that wants team scope pre-fetches the actor's org units and passes them in: 56 call sites, each needing a team column that most of those tables do not have.

**Blocked by:** a decision.

**Status:** needs-decision

- [x] A test pins that no call site supplies `teamColumn`, so the day someone adds one it is deliberate rather than accidental.
- [ ] **Decide one:**
  - **(a) Stop offering `team` until the fast path is real** — refuse to persist a `team` grant, matching what §5 already says. Smallest change, but it removes a capability the roles screen currently offers, and if anyone has already granted it their scope changes. That is a product decision, not a cleanup.
  - **(b) Build the fast path** — add team columns where they belong and thread org units through the list services. Correct, and a stream of its own rather than a ticket.
  - **(c) Leave it and accept the cost**, with the measurement recorded here so nobody rediscovers it as a mystery.
- [ ] Whichever is chosen, the dead fast path stops being dead — either removed or reachable. A branch that cannot execute is worse than either.
