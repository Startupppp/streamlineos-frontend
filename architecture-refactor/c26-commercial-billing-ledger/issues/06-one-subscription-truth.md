# 06 — One subscription table feeds billing and platform administration

**What to build:** Billing, setup, cron work and platform administration read the same canonical subscription truth. Today `subscriptions` is actively written while `platform_subscriptions` has no source writer; the platform customer screen reads only the shadow table and can show a paid organisation as free.

**Blocked by:** 01 — canonical catalog identifiers must exist before final cutover

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A data reconciliation names canonical `subscriptions`, maps every shadow row and produces a zero-unexplained-difference report before cutover.
- [ ] Platform customer reads use the canonical subscription projection and return the same plan/status as billing and entitlement resolution.
- [ ] The customer list requires a hard-capped keyset cursor and stable sort; it never returns every organisation.
- [ ] Member count and lifetime/payment totals are joined from bounded aggregates or maintained projections, not correlated subqueries per organisation row.
- [ ] Reads cut over before `platform_subscriptions` is deprecated and dropped through expand/reconcile/cutover/contract migrations.
- [ ] Contract tests cover paid, trial, cancelled, missing-subscription and concurrent webhook states.

## Todo

- [ ] Prove no runtime writer exists before choosing the reconciliation direction
- [ ] Add platform-admin authorization and cursor contract tests
- [ ] Observe old-table reads at zero before contract migration
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c26 — Commercial billing is a versioned ledger`](../prd.md) · Candidate index: [`../README.md`](../README.md)
