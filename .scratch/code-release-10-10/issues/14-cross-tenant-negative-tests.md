# 14 — Cross-tenant negative tests for RBAC role seeding and Support KB engagement

**What to build:** Two services carry no cross-tenant negative test: RBAC role seeding and Support KB engagement. Confirmed missing on disk — no matching spec file exists for either. They are the last two gaps in the isolation declaration coverage, and the static declaration gate cannot substitute for an executable proof.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Each service gains an executable cross-tenant negative test proving an actor from organization A cannot read or mutate organization B's rows, and that a cross-tenant miss returns 404 rather than 403.
- [ ] Static declaration coverage reaches complete, and the executable isolation suite passes.
- [ ] Each test is proven to bite: neuter the tenant predicate in a double and confirm the test goes red. A defence-in-depth guard with zero load-bearing paths makes the delete-it proof lie.
- [ ] Probe with a non-owner actor. Organization-owner bypass masks the 403 that a normal member would receive, so an owner-only probe proves nothing.
- [ ] Any `db.transaction` mock invokes its callback — a bare mock silently voids every assertion inside the transaction.
- [ ] The actor used is constructed through the canonical helper so it carries a membership id; a hand-built actor missing it fails in ways that look like a domain bug.
