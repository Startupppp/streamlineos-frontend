# 04 — Team scope always takes the correlated subquery, and the fast path is unreachable

**What this records:** a measured state and a decision to put to you, not a change.

`applyScope`'s `team` branch has two paths. The fast one needs **both** `cols.teamColumn` and a pre-fetched `cols.teamIds`; otherwise it falls back to `owner IN (SELECT ... FROM org_unit_members ...)`, a correlated subquery run per row.

Verified 2026-08-23: of **56** `applyScope` call sites, **zero** supply a `teamColumn`. Not "few" — none. The fast path is guarded by a condition no caller can currently make true, so every team-scoped list takes the subquery. Backend `CLAUDE.md` §5 already says team scope ships only once that subquery is eliminated.

Two things follow, and the second is the one that needs your call.

**It is reachable by configuration.** No role default grants `team`, but `permission-catalog-sync` registers `team` as an available scope for every scopable permission, so an administrator can grant it from the roles screen today — and that person's lists quietly get the subquery.

**Making the fast path real is not a small change.** It means every list service that wants team scope pre-fetches the actor's org units and passes them in: 56 call sites, each needing a team column that most of those tables do not have.

**Blocked by:** a decision.

**Status:** CLOSED — option (c), accepted on measured evidence.

- [x] A test pins that no call site supplies `teamColumn`, so the day someone adds one it is deliberate rather than accidental.
> **Measured against the live database 2026-08-23:** `role_permission_grants` with `scope='team'` = **0**. `user_permission_grants` with `scope='team'` = **0**. Scope distribution is `all=8291, own=6`. And `org_unit_members` holds **0 rows**.
>
> That last number decides it. With no org unit memberships, the subquery returns nothing, so team scope resolves to *owner only* — it is behaviourally identical to `own`, just with a subquery attached. Nobody has granted it and it would not do anything different if they did.
>
> **Chosen: (c) leave it, with the measurement recorded.** (a) was tempting, but `permission-catalog-sync` inserts supported scopes with `onConflictDoNothing` and never deletes, so removing the code path would not remove the stored rows or stop the roles screen offering it — it needs deletion semantics added to a sync service that currently cannot remove anything. That is a larger and riskier change than the problem justifies for an option with zero users and no behavioural difference.
>
> Revisit when org units are actually populated: at that point team scope starts returning more than the owner, and the subquery starts costing something real.

- [x] **Decided:**
  - **(a) Stop offering `team` until the fast path is real** — refuse to persist a `team` grant, matching what §5 already says. Smallest change, but it removes a capability the roles screen currently offers, and if anyone has already granted it their scope changes. That is a product decision, not a cleanup.
  - **(b) Build the fast path** — add team columns where they belong and thread org units through the list services. Correct, and a stream of its own rather than a ticket.
  - **(c) Leave it and accept the cost**, with the measurement recorded here so nobody rediscovers it as a mystery.
- [x] **Decision taken 2026-08-24: (c) leave it and accept the cost.** Team scope keeps working through the `org_unit_members` subquery; nothing user-visible changes, and no existing `team` grant has its scope altered. Option (a) was declined because it removes a capability the roles screen offers today, and (b) is a stream rather than a ticket.

  **The branch is not deleted, and that is the point worth recording.** "A branch that cannot execute is worse than either" assumed it was silently dead. It is not: `apply-scope-team.spec.ts` scans every file that calls `applyScope(` and asserts none supplies `teamColumn`, with the comment "Fails the day a caller supplies teamColumn — make that deliberate, not accidental." It also asserts it found **more than 20** call sites first, so a broken glob cannot make it pass vacuously — the failure mode where a scan matching nothing reports everything as clean.

  So the unreachable branch is a guarded placeholder with a tripwire, not dead code. Deleting it would remove both the design intent and the enforcement that the day someone wires it up is a deliberate decision. Re-verified: no production call site supplies `teamColumn` or `teamIds` — only the two specs.
