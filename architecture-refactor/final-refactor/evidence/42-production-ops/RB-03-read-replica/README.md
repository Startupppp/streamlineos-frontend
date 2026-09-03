# RB-03 — physical read replica

Ticket 33 (`33-cell-recovery.md`), criterion **PRD-C170** — "Provision a physical replica and
prove lag/fallback using RB-03."

Runbook: `architecture-refactor/runbooks/RB-03-read-replica.md`
Captured: 2026-09-03. Backend branch `release/code-10-10-v2`.

---

## Verdict

**PRD-C170 is NOT MET, and cannot be met on this machine.**

The criterion has two verbs. *"Provision a physical replica"* requires infrastructure that
does not exist here — a streaming standby is a second Postgres server continuously replaying
WAL from a primary, which is a provider-level resource, not something a script can conjure.
*"Prove lag/fallback"* requires measuring `pg_last_xact_replay_timestamp()` on that standby,
which is `NULL` on every database on this laptop because none of them is replaying anything.

**There is no deployed environment on this machine and no read replica.** Nothing in this
directory claims otherwise, and no simulated replica is presented as a real one.

What *was* established locally: the check logic is correct (16/16 self-test cases), the check
refuses to pass vacuously (exit 2 when unconfigured), the check cannot be fooled by a
non-replica (negative control, below), and — separately — **the application has no replica
read path at all**, which is a code defect that blocks C170 independently of infrastructure.

---

## Files

| File | What it is |
|---|---|
| `cell-replica-self-test.txt` | `cell:replica:self-test` — 16/16 cases pass, exit 0 |
| `cell-replica-live-run.txt` | `cell:replica` and `cell:isolation:replica` with no replica configured — exit **2** both |
| `cell-replica-negative-control.txt` | Two attempts to satisfy the check with a non-replica. Both correctly rejected. |
| `replica-routing-enforcement-check.txt` | RB-03 Step 3's own grep, plus the replica spec run (18 passed / 3 skipped) |

---

## What ran, and what it returned

| Command | Exit | Result |
|---|---|---|
| `verify-replica-routing.mjs --self-test` | 0 | `SELF-TEST PASSED — 16 cases` |
| `verify-replica-routing.mjs` (no `DB_REPLICA_URL`) | **2** | `MISSING PREREQUISITE: DB_REPLICA_URL is required.` |
| `verify-replica-routing.mjs --isolation` (no `DB_REPLICA_URL`) | **2** | same |
| negative control A — `DB_REPLICA_URL` → the primary itself | 1 | 4 checks FAIL, including both lag checks |
| negative control B — `DB_REPLICA_URL` → a separate full copy | 1 | same 4 FAIL, then aborts (defect 2) |
| `jest degradation/read-replica.spec.ts` | 0 | 18 passed, 3 skipped (all three skips are the physical-replica ones) |

Exit **2** is the important one. Per the script's own contract, `2` means *prerequisite
missing*, distinct from `0` pass and `1` fail. A missing replica can never be mistaken for a
passed check.

---

## The negative control

A self-test proves the logic; it does not prove the logic is *attached to reality*. The
failure mode that would matter in production is an operator pointing `DB_REPLICA_URL` at
something that answers queries but is not a standby, and getting a green run. Both variants
were tried.

**Case A — `DB_REPLICA_URL` points at the primary itself.**

```
PASS   replica-reachable                  SELECT 1 succeeded on localhost
FAIL   replica-endpoint-distinct          replica and primary resolve to the same host
PASS   replica-guc-read-only-tx           GUC round-trips inside BEGIN READ ONLY
PASS   replica-rls-enabled                983 tables have RLS enabled
FAIL   replica-rls-fails-without-guc      query without tenant GUC succeeded    <-- see defect 1
FAIL   replica-replication-lag            pg_last_xact_replay_timestamp() is NULL —
                                          this endpoint is a primary, not a read replica
FAIL   replica-lsn-receiving              pg_last_wal_receive_lsn() is NULL —
                                          replica is not receiving WAL from primary
RESULT: REPLICA ROUTING FAILED failed=4        exit 1
```

**Case B — `DB_REPLICA_URL` points at a separate, fully populated database** (`scratch_drill_1010`,
a complete `pg_restore` copy). This is the "someone took a copy and called it a replica"
error: every query works, all the data is there, nothing is streaming. Same three
infrastructure checks fail identically.

The two lag checks are the load-bearing ones, and they are not satisfiable by any database on
this machine. That is the correct outcome and it is why C170 is reported as blocked rather
than passed.

---

## Defects found

These block a green `cell:replica` **even after** an operator provisions a real replica. They
are worth fixing before the infrastructure work, because otherwise RB-03 will fail on arrival
and the failure will be misread as a bad replica.

### 1. `replica-rls-fails-without-guc` probes the one table that cannot produce 42501

The check requires SQLSTATE `42501` from `SELECT org_id FROM organization_members LIMIT 1`
with no tenant GUC. Measured on `scratch_head_1010`:

```sql
-- organization_members policy:
tenant_isolation | ALL | ((org_id = app.current_org_id_or_null())
                          OR (user_id = app.current_user_id_or_null()))

CREATE FUNCTION app.current_org_id_or_null() RETURNS text ... AS $$
BEGIN RETURN nullif(current_setting('app.organization_id', true), ''); END; $$
```

`current_setting(..., true)` returns NULL rather than raising, so `org_id = NULL` is NULL and
the query returns **0 rows with no error**. That is fail-closed — no data leaks — but it is
fail-closed *by filtering*, not *by raising*, and the check only accepts raising.

Meanwhile the other policy style in the same schema does raise, with exactly the right code:

```
$ psql <app role> -c "select count(*) from api_keys;"      -- policy: (org_id = app.current_org_id())
ERROR:  42501: no tenant context: app.organization_id is not set for this transaction
```

Distribution across the 983 policies: **951 use `app.current_org_id()` (raises 42501), 32 use
an `_or_null()` helper (filters to zero rows).** The script picked a probe table from the
32-policy minority — the one group in the schema that cannot produce the SQLSTATE it demands.

Consequence: `cell:replica` will report `FAIL replica-rls-fails-without-guc` and exit 1
against a perfectly healthy Neon read replica, forever. Fix: probe a `current_org_id()` table
(`api_keys` works), or accept "zero rows returned" as fail-closed alongside 42501.

### 2. `cell:isolation:replica` aborts — the app role has no access to the `drizzle` schema

The `--isolation` migration-watermark check queries `drizzle."__drizzle_migrations"` over the
`APP_DATABASE_URL` connection, which RB-03 explicitly specifies as the non-BYPASSRLS app
role. That role cannot read the schema:

```
PASS   replica-phantom-org-empty     phantom org returns 0 rows — no cross-tenant leak
CHECK FAILED: permission denied for schema drizzle
exit 1
```

Confirmed at the database:

```sql
select has_schema_privilege('streamline_app','drizzle','USAGE');  -->  f
```

and no migration or bootstrap step grants it — `grep` over `src/db/migrations/` and
`bootstrap-cell.mjs` for a `drizzle` grant returns nothing.

Two things are wrong. First, the run **aborts** at that point rather than recording a FAIL and
continuing, so the watermark check is never reported and any later check is never reached.
Second, it aborts *after* `RESULT:` would otherwise print, so the run produces no summary line
at all. Fix: grant `USAGE ON SCHEMA drizzle` and `SELECT` on that table to the app role, or
read the watermark over the owner connection, and wrap the check so a failure is reported
rather than thrown.

### 3. Nothing in the application reads from the replica

This is the largest gap, and it is independent of infrastructure. RB-03's pass threshold
includes:

> - Primary-required paths are explicitly documented and routed to the primary connection.
> - Replica-safe paths are explicitly using `DATABASE_REPLICA_URL`.

The second is not satisfiable today. The routing seam exists and is well tested, but it is
not wired to anything:

```
$ grep -rn "DRIZZLE_REPLICA|REPLICA_ROUTER|ReplicaRouter" src/
src/db/drizzle.constants.ts   — the two token declarations
src/db/replica-router.ts      — the ReplicaRouter class
src/db/drizzle.module.ts      — provides both; injects DRIZZLE_REPLICA into its own constructor
src/degradation/read-replica.spec.ts — the unit tests
(no other file in src/ references either token)

$ grep -n "exports:" src/db/drizzle.module.ts
75:  exports: [DRIZZLE, DB_POOL_CONFIG],
```

- `REPLICA_ROUTER` is provided and **injected nowhere**.
- `DRIZZLE_REPLICA` is injected in exactly one place — `DrizzleModule`'s own constructor — and
  the only use of the resulting `this.replicaDb` is line 167, closing its client on shutdown.
  It is opened and closed and never read from.
- Neither token appears in `exports`, so **no other module could inject them even if it tried.**

So there are zero replica-routed read paths. When `DB_REPLICA_URL` is unset the module still
builds a second pool of 2 connections against the *primary* (`config.replicaConnectionString
?? config.connectionString`) that nothing ever queries.

There is also a **taxonomy mismatch** between runbook and code. RB-03 Step 3 lists as
replica-safe: `GET /tickets`, `GET /build/projects`, `GET /billing/entitlements`,
`GET /me/access`. The code's actual policy (`routingStrategyFor`, proven in the spec) is by
*work class*, and admits only two: `analytics-refresh` and `search-freshness`. Every class the
runbook names — RBAC, authentication, financial-ledger, audit — is primary-required in code.
The runbook's list is considerably more permissive than what the code would ever do, and it
describes HTTP routes that have no replica wiring at all. One of the two documents is wrong
and it should be reconciled before an operator uses the runbook as a specification.

To its credit the routing policy itself is careful and well tested: it **sheds** replica-safe
work when the replica is faulted rather than silently falling back to the primary, so a
degraded replica cannot quietly consume primary capacity. That behaviour is proven by unit
test. It just has no callers.

---

## Classification

**(A) Runnable here — done, evidence above.**
Self-test (16/16), prerequisite path (exit 2), negative controls A and B, RB-03 Step 3's
enforcement grep, and the `read-replica.spec.ts` suite (18 passed / 3 skipped).

**(B) Needs a deployed environment.**
- *"Provision a **physical** replica"* (PRD-C170) — a streaming standby continuously replaying
  WAL. On Neon this is a read-only compute endpoint on the branch (RB-03 Step 1: *Neon console
  → Project → Compute → Add compute endpoint → Type: read replica*). It requires console
  access and a paid plan. There is no such endpoint and no way to create one from this
  machine.
- *"prove **lag**"* (PRD-C170) — RB-03's thresholds are peak `< 10 s` and steady-state p50
  `< 2 s` over 12 samples under the `write-mix` load profile. Both metrics
  (`pg_last_xact_replay_timestamp()`, `pg_last_wal_receive_lsn()`) return NULL on every
  database here, because measuring replication lag requires something to be replicating.
- *"prove **fallback**"* (PRD-C170) — the *routing policy* for fallback is unit-tested and
  passes. Proving fallback end-to-end needs a real replica to fail over from, plus (defect 3)
  an application path that reads from it in the first place.
- The three skipped tests in `read-replica.spec.ts` are skipped for exactly this reason, and
  say so: *"PHYSICAL REPLICA NOT PROVISIONED. The staleness behaviour below is proved against
  a REPEATABLE READ snapshot, which is real lag but not replication lag."* That is the correct
  distinction and it is the same one this file draws.

**(C) Needs a named human decision.**
Nothing in PRD-C170 requires a signature. Defect 3's taxonomy mismatch does need an owner's
decision about *which* reads may be served stale — that is a product/operations judgement
about acceptable staleness per endpoint, not a technical measurement — but the criterion
itself is (B).
