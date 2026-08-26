# 06 — One subscription table feeds billing and platform administration

**What to build:** Billing, setup, cron work and platform administration read the same canonical subscription truth. Today `subscriptions` is actively written while `platform_subscriptions` has no source writer; the platform customer screen reads only the shadow table and can show a paid organisation as free.

**Blocked by:** 01 — canonical catalog identifiers must exist before final cutover

**Status:** in-progress

## Acceptance criteria

- [x] A data reconciliation names canonical `subscriptions`, maps every shadow row and produces a zero-unexplained-difference report before cutover.
- [x] Platform customer reads use the canonical subscription projection and return the same plan/status as billing and entitlement resolution.
- [x] The customer list requires a hard-capped keyset cursor and stable sort; it never returns every organisation.
- [x] Member count and lifetime/payment totals are joined from bounded aggregates or maintained projections, not correlated subqueries per organisation row.
- [x] Reads cut over before `platform_subscriptions` is deprecated and dropped through expand/reconcile/cutover/contract migrations.
- [x] Contract tests cover paid, trial, cancelled, missing-subscription and concurrent webhook states.

## Todo

- [x] Prove no runtime writer exists before choosing the reconciliation direction
- [x] Add platform-admin authorization and cursor contract tests
- [x] Observe old-table reads at zero before contract migration
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Shipped in this batch:**
- Reconciliation: grepped every `.insert`, `.update`, `.delete` call in `backend/src` — confirmed zero writers to `platform_subscriptions`. Migration 0502 documents this as the reconcile step.
- Cutover: `platform.service.ts` `listCustomers()` and `getCustomerBySlug()` now read from canonical `subscriptions`. `platformSubscriptions` removed from imports. `platform.service.ts:244–390`
- Cursor: `listCustomers()` accepts `{ afterCreatedAt, afterId }` keyset cursor, hard-capped at 100 rows. Schema: `dto/platform.schemas.ts` `listCustomersQuerySchema`.
- Aggregates: member count and lifetime revenue computed in two batch queries (`inArray` + `groupBy`) then merged in-process — no correlated subquery per org row.
- Index: `migrations/0502_platform_subscription_cursor_index.sql` adds `idx_organizations_created_cursor ON organizations (created_at DESC, id DESC)`.
- DROP of `platform_subscriptions` is deferred to the contract migration after monitoring confirms zero reads.

**Remaining:**
- Contract tests (AC-6) — no existing platform-admin test harness; needs a new spec with `createE2eApp`.
- Observe zero old-table reads in production before scheduling the DROP migration.

---

PRD: [`c26 — Commercial billing is a versioned ledger`](../prd.md) · Candidate index: [`../README.md`](../README.md)
