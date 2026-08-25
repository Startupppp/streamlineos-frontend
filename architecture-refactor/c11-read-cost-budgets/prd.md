# c11 · Make "this query is fast" a thing CI proves

**Status: the instrument exists and guards two queries.** Verified at source 2026-08-25. `check-build-read-cost.mjs` (131 lines, `pnpm db:check-build-reads`) connects as the **non-BYPASSRLS app role**, sets `app.organization_id`, derives fixtures from live data, runs `EXPLAIN (ANALYZE, BUFFERS)` and asserts both a shared-block ceiling *and* that `ticket_assignees` resolves by **Index Only Scan specifically**. Siblings exist: `db:check-request-txn` and `baseline:build`. It covers `scoped-board-page` and `my-work`. The API has **3,385 route+verb pairs**.

## Problem Statement

**As a user, a page that is fast today gets slow silently.** Nothing fails when a query's plan degrades. A developer adds a filter, the planner stops using the covering index, and the page goes from 53 blocks to 200,000 — and every check in CI stays green, because types compile and tests pass. The regression surfaces as a user complaint weeks later.

**As a developer, I cannot prove a query is fast.** I can prove it returns the right rows. There is no way to assert cost as part of normal work, so "is this fast?" is answered by opinion, or by nothing.

**As a developer, the RLS trap is invisible.** Under row-level security an Index Only Scan is impossible unless `org_id` is *in* the index, because the policy qual is not leakproof. A covering index that omits it is silently ignored — and reads to whoever added it as "the index didn't help." This has already happened here. One script catches it, for one table.

**As a developer, benchmarking as the wrong role hides everything.** Measuring as the owner role — which carries `BYPASSRLS` — produces plans the application will never get. The difference is not marginal: the same query on the same data has measured 16 blocks as owner and 12,036 as the app role.

**As an operator, cost is discovered in production.** There is no budget, so there is no alarm — only a slow page and a query to hunt down after the fact.

## Solution

Generalise the instrument that already works. Promote the two hard-coded checks into a declared **read budget** table: a named query, the fixtures it needs, a block ceiling, and optional plan assertions (`Index Only Scan on X`, `no Seq Scan on Y`). The runner stays what it is — connect as the app role, set the GUC, `EXPLAIN (ANALYZE, BUFFERS)`, compare, fail the build.

Then populate it with the queries that carry the product, not all 3,385. The criterion is: **a read on a path a user waits for, over a table that grows with the tenant.** That is roughly forty queries and it covers the surfaces where slowness is felt.

The point is not the forty. It is that adding the forty-first becomes a table entry, so a budget is something a developer *declares* rather than a script someone *writes*.

## User Stories

1. As a user, I want a page that is fast today to stay fast, so that the product does not degrade quietly between releases.
2. As a developer, I want to declare a cost budget for a query, so that "fast" is an assertion rather than an opinion.
3. As a developer, I want CI to fail when a query exceeds its budget, so that I learn from the build rather than from a user.
4. As a developer, I want the failure to name the query and show measured versus budgeted cost, so that I can act without re-deriving the measurement.
5. As a developer, I want to assert that a specific table is resolved by an Index Only Scan, so that the RLS covering-index trap is caught mechanically.
6. As a developer, I want to assert that a table is *not* resolved by a sequential scan, so that a dropped index fails the build.
7. As a developer, I want budgets measured as the application's own database role, so that a plan I trust is the plan production gets.
8. As a developer, I want the tenant GUC set before measuring, so that RLS is in force and the measurement is honest.
9. As a developer, I want fixtures derived from the largest real data available, so that a budget is not met only on an empty tenant.
10. As a developer, I want to add a new budget by adding a table entry, so that coverage grows without writing a script.
11. As a developer, I want a budget to fail when its query shape changes, so that a rewritten query is re-measured rather than silently unguarded.
12. As a developer, I want to run budgets locally before pushing, so that I am not debugging a plan through CI.
13. As an operator, I want to know which reads are guarded and which are not, so that unguarded surfaces are a known list rather than an assumption.
14. As an operator, I want budgets to fail loudly when the seed data is too small to be meaningful, so that a green run cannot mean "measured nothing".
15. As a reviewer, I want a change that adds a query to a hot path to require a budget, so that coverage does not decay as the product grows.
16. As a reviewer, I want the budget diff visible in review, so that raising a ceiling is a decision someone made rather than a silent edit.

## Implementation Decisions

**Already shipped — this is the pattern; generalise it, do not replace it**

- **Connect as the app role.** `APP_DATABASE_URL`, the non-BYPASSRLS role. This is not a detail — measuring as owner invalidates every number.
- **`set_config('app.organization_id', …, true)` inside the transaction.** The Neon pooler drops startup parameters and `options=-c` hard-fails, so `SET LOCAL` inside the transaction is the only mechanism that works.
- **Fixtures derived from live data**, picking the largest project and heaviest participant. Keep this: a hand-picked id goes stale, and a small fixture makes a budget meaningless.
- **Two assertion kinds, both retained.** Shared blocks (hit + read) as the cost measure, and a plan-node assertion walking the plan tree for a named relation. The second catches what the first cannot.
- **`prepare: false` is set on this connection.** Prepared-statement advice does not apply on Neon; the levers are indexes, projection and N+1.

**To build**

- **A declared budget record**: id, SQL text, fixture requirements, block ceiling, and zero or more plan assertions. Everything the two current checks encode, made data.
- **Plan assertions are expressed positively and negatively** — `requireIndexOnlyScan` on a relation, `forbidSeqScan` on a relation. The existing check has the first; the second is what catches a dropped index.
- **A missing plan node fails.** The current script already treats an absent relation as a failure, on the grounds that the query shape changed and the assertion no longer means anything. Preserve that — the alternative is an assertion that silently stops asserting.
- **Seed adequacy is asserted, not assumed.** If the fixture query returns a tenant below a stated row count, fail with "seed too small", never pass. A budget met on an empty table is worse than no budget because it reads as coverage.
- **Select budgets by waiting, not by count.** A read a user waits for, over a tenant-growing table. Name the set explicitly. Do not open-endedly "add budgets" — an unbounded list gets ignored, and forty enforced budgets beat four hundred aspirational ones.
- **Ceilings are generous and are meant to catch collapse, not drift.** The existing ones are 5,000 and 30,000 blocks. A budget that fails on ordinary variance gets raised until it means nothing; these are tripwires for a plan falling off an index.
- **Run it in CI against a rebuilt database.** The chain already builds from empty; budgets run after seeding.
- **Not a replacement for the transaction-cost and baseline scripts.** They answer different questions and stay.

## Testing Decisions

**What makes a good test here.** The instrument's own tests assert that it *fails when it should*. A cost guard that cannot fail is the failure mode, and it is invisible — everything is green.

- **The guard fails on a breach** — a budget with a deliberately impossible ceiling must exit non-zero. This is the primary test; without it a broken runner reads as a passing suite.
- **The guard fails on a missing plan node** — an assertion naming a relation the query no longer touches fails rather than passing vacuously.
- **The guard fails on inadequate seed data** — below the stated row threshold, it errors rather than reporting OK.
- **Plan-tree walking** — given a recorded `EXPLAIN` JSON fixture, the walker finds a nested relation node. This is pure and needs no database.
- **Budget parsing** — a malformed budget entry is rejected at load rather than skipped, so a typo cannot silently drop coverage.
- **Prior art**: the existing script's assertion structure, and the migration-integrity spec's pattern of asserting an arrangement rather than an output.

## Out of Scope

- Query optimisation itself. This spec builds the instrument; c12, c13 and c14 use it.
- Production APM or tracing. This is a build-time gate, not observability.
- Write-path cost. Budgets here are for reads.
- Automatic index recommendation.

## Further Notes

This is the highest-leverage item in the 2026-08-25 review, and the argument is about **locality**: every query finding in that review was found by a person reading source. None of it needed to be. A broad budget table moves that work from human attention to CI, permanently, and it is the only item whose value grows as the codebase does.

One caution carried from prior measurement: after a table rewrite, statistics and the visibility map are both invalid, and an Index Only Scan silently becomes an Index Scan until `VACUUM ANALYZE` runs. A budget run against a freshly rewritten table will fail for a reason that has nothing to do with the query. Vacuum and analyse after seeding, before measuring.
