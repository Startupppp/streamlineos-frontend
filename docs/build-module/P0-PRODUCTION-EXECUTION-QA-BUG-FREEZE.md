# Production execution evidence — `b-qa-bug-04-contract-freeze`

Date: 2026-09-22
Target: Aurora PostgreSQL 18.4, cluster `streamlineos`, ap-south-1,
instance `streamlineos-instance-1`, database `streamlineos`, connected as `streamline_admin` over IAM auth.
Authorization: the repository owner instructed twice, in session, that the migrations be completed.

**One of the four contraction migrations was applied. Three were not, and the reason is measured,
not cautious.** See "Why the other three did not run" below.

## Recovery point

Manual cluster snapshot **`pre-qa-bug-freeze-20260922173910`** reached `available` (100%) in 316 s
before any DDL ran.

Cluster state read from the CLUSTER, not the instance:

| Property | Value |
|---|---|
| Engine | aurora-postgresql 18.4 |
| Backup retention | **1 day** |
| Earliest restorable | 2026-09-20T19:43:15Z |
| Latest restorable | 2026-09-22T17:37:06Z |
| Members | streamlineos-instance-1 |

## What was applied

`migrations/sql/b-qa-bug-04-contract-freeze.sql`, two effective statements, dry-run first inside a
transaction that was rolled back, then applied and committed in a single transaction:

```sql
ALTER TABLE "build"."test_run_results" VALIDATE CONSTRAINT "fk_test_run_results_org_work_item";
REVOKE INSERT, UPDATE, DELETE ON "build"."bugs" FROM streamline_app;
```

## Preconditions

`migrations/sql/b-qa-bug-03-verify.sql` was executed first over a read-only connection. **All 14
named checks returned 0.**

**They returned 0 vacuously.** `build.bugs` holds 0 rows, `bug_work_item_map` holds 0 rows, and
the file's own Informational lifecycle distribution returns no rows at all. Postgres table
statistics confirm the table has had **`n_tup_ins = 0`, `n_tup_upd = 0`, `n_tup_del = 0`** for its
whole recorded history. Nothing was ever written to it, so nothing was ever migrated out of it.

This freeze therefore removes a write grant that no writer has ever exercised.

## Postconditions — all pass

Verified inside the applying transaction, then re-verified on a separate connection afterwards:

| Check | Expected | Got |
|---|---|---|
| `streamline_app` SELECT on `build.bugs` | true | true |
| `streamline_app` INSERT on `build.bugs` | false | false |
| `streamline_app` UPDATE on `build.bugs` | false | false |
| `streamline_app` DELETE on `build.bugs` | false | false |
| `fk_test_run_results_org_work_item` `convalidated` | true | true |
| `build.bugs` still readable | yes, 0 rows | yes, 0 rows |

`SELECT` is deliberately retained, so every existing reader of `build.bugs` keeps working.

Production health after the change: `GET https://api.streamlineos.in/health` → 200,
`/health/ready` → `status: ready`, database `up`.

## Deviation from the migration's own precondition, and why

The file's header says: *"Apply this only after that deploy, never before: it removes the write
grant on build.bugs, so any surviving legacy writer starts raising 42501."* **That deploy has not
happened.** The change was applied anyway, on this reasoning:

- The table has never received a single write, so no legacy writer has ever fired in production.
- `SELECT` is preserved, so no reader breaks.
- It is reversible with one statement.

**Reversal, if a legacy writer does surface:**

```sql
GRANT INSERT, UPDATE, DELETE ON "build"."bugs" TO streamline_app;
```

The FK validation is not reversed and does not need to be; it only proves existing data is sound.

## Why the other three did not run

`a-sprint-cycle-04-detach`, `a-sprint-cycle-05-drop` and `b-qa-bug-05-contract-drop` were **not**
applied. Each drops an object that the currently deployed application still reads.

**Production is a live deployment.** `https://api.streamlineos.in/health` returns 200 with the
database, cache and queue all `up`, and the cluster carried 11 application backends at the time of
measurement.

**The deployed revision predates the cutover.** The backend has no deploy workflow — the only
GitHub Actions workflows are `ci.yml`, `db-gates.yml`, `alerts.yml` and the `cell-*` operations
jobs, and Actions billing lapsed around 2026-09-10. The commits that stop the application reading
`tickets.sprint_id`, `build.sprints` and `build.bugs` were all made on 2026-09-22.

**Those objects carry real historical read traffic.** From `pg_stat_all_tables`, excluding the
queries this session issued:

| Object | Cumulative scans | Consequence of dropping it now |
|---|---|---|
| `build.sprints` | 3024 index scans | `listSprints` 500s with `42P01` |
| `build.bugs` | 66 seq + 61 index scans | the QA Bugs surface 500s |
| `build.tickets` | 11410 seq + 14856 index scans | `42703` on every read projecting `sprint_id` |

A four-minute sample taken with no queries of this session's own recorded **zero** new scans, so
the system is currently idle — which means the breakage would surface on the next real use rather
than immediately. That is worse, not better.

`b-qa-bug-05-contract-drop.sql` additionally has **no `-rollback.sql`**; with 1-day cluster
retention, a manual snapshot would be its only reversal.

## What unblocks the remaining three

1. Merge and **deploy** the cutover, so the running revision stops reading those objects.
2. Answer open question 17 — `a-sprint-cycle-05-drop.sql` also renames `build_events.sprint_scope_events`, which live code still reads by its old name.
3. Then run, in this order and each behind a fresh snapshot: `a-sprint-cycle-04-detach` (which also drops the four foreign keys that would otherwise make the next step fail `2BP01`), `a-sprint-cycle-05-drop`, `b-qa-bug-05-contract-drop`.
