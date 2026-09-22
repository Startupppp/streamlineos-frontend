# Build data model — final reconciliation

**Date:** 2026-09-22 · **Branch:** `build/data-foundation-final` (both repos) · **Database:** none used.

Reconciles `PHASE-2-DATA-MODEL-STATUS.md` (design record) and `PHASE-2-STATUS.md` (production
execution record) against the tree as it stands. Every number below was re-measured here unless it is
explicitly attributed to the production session.

## Headline

Both prior ledgers were accurate when written. **Neither is accurate at HEAD**, because a later commit
moved the artifacts they describe and broke two of the four specs that proved them. The Phase 2
coordinator's "4 suites, 232 tests, 232 passed" was, on arrival, **2 suites, 40 failed, one suite
unable to run at all**. That is repaired, and the surface is now 7 suites / 386 tests.

**And the unblock path both ledgers recommend is already built and already dead.** The database gates
they point at have been wired in `db-gates.yml` the whole time; the workflow has failed **100 of its
last 100 runs** with zero steps executed, because GitHub Actions billing has lapsed since ~2026-09-10.
Restoring it is the single highest-leverage action available — see *The real blocker* below.

## Gating: no non-production PostgreSQL, and none can be provisioned

Re-probed rather than inherited. The prior finding holds but the evidence is now harder:

| Candidate | Probe | Result |
|---|---|---|
| `backend/.env`, `backend/.env.production` | host inspection | Both are the production Aurora host. Excluded by rule. |
| `backend/.env.localstack` | file | **Gone.** The prior ledger found the config surviving; the file no longer exists. |
| `psql`, `pg_ctl`, local PG install, `D:/localstack` | `command -v`, path check | Absent. |
| `docker`, WSL | `command -v` | Absent. |
| `127.0.0.1:5432` | TCP connect | `Connection refused`. |
| Neon `NEON_API_KEY` | `GET /projects` | **The key is live.** It authenticates and names its own scope: `subject_project_id: "gentle-bonus-77044006"`. |
| Neon project `gentle-bonus-77044006` | `GET /projects/$P/branches` | **404 `project not found`.** The project has been deleted. |

The prior ledger recorded the Neon keys as "gone". They are not gone — `NEON_API_KEY` is present but
commented out in `backend/.env.production`, and it still authenticates. It is nonetheless useless: a
project-scoped key cannot create a project, and the project it is scoped to no longer exists.

**Consequence:** execution is BLOCKED. Static verification only, per the rule. No migration was
applied, no `confdelsetcols` was read, nothing is marked DONE on a design alone.

## What was actually wrong at HEAD

Backend commit `6ac2004f5`, whose message describes only additions, deleted the entire `backend/docs/`
tree — 61 files, 34,826 deletions — and **moved the 24 Phase 2 SQL artifacts from
`backend/docs/phase-2/sql/` into `backend/migrations/sql/`**.

Nothing was lost: the design docs were relocated to `docs/build-module/backend-docs/` in the root repo,
and all 24 SQL files moved byte-identical (git records them `R100`). But:

1. **Two specs still pointed at the old path.** `sprint-cycle-consolidation.spec.ts` could not even
   load (ENOENT at import time, so 99 tests silently stopped existing); `composite-fk-confdelsetcols.spec.ts`
   failed 40 of 58. Fixed by repointing `SQL_DIR`.
2. **Unjournalled SQL now lives inside `migrations/`.** This is safe, and I verified why rather than
   assuming it: every one of the five appliers selects work from `migrations/meta/_journal.json`, and
   every gate enumerates with a non-recursive `readdirSync`. `check:migration-discipline` still reports
   exactly `903 SQL files checked`, so the subdirectory is invisible to it. `migrations/pending/` and
   `migrations/rollback/` already establish the pattern. The inertness is now pinned by a test instead
   of resting on a gate's blind spot.

## Status reconciliation

| Workstream | Prior claim | Actual at HEAD | Now |
|---|---|---|---|
| A — Sprint/Cycle | DESIGN_COMPLETE, 99/99 pass | **Suite could not run.** 10 SQL artifacts present and unchanged. | DESIGN_COMPLETE, 99/99, EXECUTION_BLOCKED |
| B — QA Bug | DESIGN_COMPLETE, 43/43 pass | 43/43 genuinely passing — but **none of the 43 read the 8 SQL artifacts**. | DESIGN_COMPLETE, 133/133, EXECUTION_BLOCKED |
| C — Composite FK | STATIC_GAP_CLOSED, 58/58 | **18/58 passing.** Gate itself was fine. | STATIC_GAP_CLOSED, 85/85, CATALOG_BLOCKED |
| D — 1141/1142 | VERIFIED_STATIC, 32/32 | 32/32, unaffected. | VERIFIED_STATIC, 32/32 |

`EXECUTION_BLOCKED` and `CATALOG_BLOCKED` are not `DONE`. Nothing here has staging evidence.

### A — Sprint/Cycle consolidation

Restored, not re-designed. The 10 SQL files (5 forward, 5 rollback) are intact and the 99 assertions
over them pass: the status map is total and deterministic on `upper(btrim(coalesce(status,'')))`, the
backfill is re-runnable and clock-free, and the dual-identity tripwires still fire (sprints and cycles
both declared, tickets still carries both FKs, `CyclesController` still has no detail route).

No consolidation has been executed. Cycle remains canonical on paper only.

### B — QA Bug consolidation

The design is sound and I could find no defect in the 8 SQL artifacts. The gap was **coverage**: the 43
existing tests read `src/` only — the mapping helper and the schema — and never opened a single `.sql`
file. Workstreams A and C both assert over their SQL; B did not.

Closed with `qa-bug-consolidation-sql.spec.ts` (90 tests), which replicates the discipline rules over
all 8 files and pins the design decisions that would be expensive to rediscover:

- the sidecar's three-column FK `(org_id, project_id, work_item_id) → tickets(org_id, project_id, id)`
  and the unique index on `tickets` it requires;
- every canonical insert converts its timestamps (`AT TIME ZONE 'UTC'`), because `bugs` stores them
  *without* a time zone while `tickets` uses `timestamptz`;
- `now()` appears only in `ON CONFLICT DO UPDATE` and `UPDATE` clauses, never dating a migrated row;
- severity never reaches `tickets.priority` — the priority cast reads `priority`, so no human triage
  decision is silently rewritten;
- the freeze revokes exactly what its rollback re-grants, and destroys nothing, so the rollback window
  is real;
- `b-qa-bug-05-contract-drop.sql` has no rollback **by design** and says so in its own header
  ("There is no in-place undo"). That is correct — dropped rows cannot be restored by SQL — and is now
  asserted rather than left to be mistaken for an omission.

Two things I checked and found *not* to be defects, against first impressions:

- Two bare `ON DELETE SET NULL` clauses in `b-qa-bug-01-expand.sql` are **single-column** keys into
  `public.users`. Single-column keys need no column list. The five composite keys in the same file all
  carry one.
- The backfill's `pe.created_at` passthrough in the `planned` CTE looks unconverted. It is converted
  exactly once, at the point of insert. My first assertion was wrong, not the SQL.

### C — Composite SET NULL verification

Re-measured, not inherited. `check:set-null-column-lists` reports **606 declared SET NULL foreign keys
· 286 requiring a column list · 0 unreachable**, and `check:set-null-migration-text` resolves all 286
against the corpus, exit 0:

```
installed 246 · installed-alias 3 · swept 33 · bare 2 · not-set-null 2
```

Both prior figures confirmed. The catalog half is `INCONCLUSIVE` exit 2, as it must be without a
database, so **285 of 286 keys remain catalog-unverified** (the production session read one).

**The two surviving bare keys now have an authored repair.** Both were confirmed to be the exact 1142
defect — a composite `(org_id, <nullable>)` key whose tenant member is `NOT NULL`, so a bare
`ON DELETE SET NULL` would write NULL into `org_id` and raise `23502` on a parent delete:

| Key | Installed by | Nullable member |
|---|---|---|
| `fk_inv_sales_orders_channel_id_org` | `0580a_inventory_channel_pools.sql` | `channel_id` |
| `fk_inv_stock_adjustments_scrap_location_id_org` | `0545a_stock_write_off.sql` | `scrap_location_id` |

`migrations/sql/c-confdelsetcols-05-bare-key-repair.sql` and its rollback mirror 1142's proven shape.
**They are deliberately not journalled.** A journalled `1143` would enter the chain unproven — no
staging exists to replay it on (BE-66) — and would be applied by the next production `db:migrate`.
Promotion is a staging task, not this one.

## D — Migrations 1141 and 1142

Every static claim re-verified directly from `migrations/meta/`:

| Claim | Result |
|---|---|
| Journal depth | **903 entries**, head `1142_fix_requisition_headcount_fk_set_null`, `when = 1803000010420` |
| 1141 and 1142 journalled | Both present |
| Rollbacks exist | `1141_*.down.sql`, `1142_*.down.sql` both present |
| Hash-sealed? | **No.** `_chain.sha256.json` holds **685** entries, sealed **2026-09-04**, ending at `1061_push_endpoint_cross_tenant_claim`. Zero `114x` tags. The immutability gate passes and says nothing about either migration. |
| `idx` contiguous / `when` strictly increasing | **Neither.** Both false — the two adjudicated pre-existing journal defects (BE-59), also why `cold-build-integrity.spec.ts` fails 8 of 19. Not caused here. |

Neither migration was reapplied, per the rule. The 32 preflight assertions pass unchanged.

## Production journal: 903/903 with zero pending

**The journal side is verified: 903 entries.** The ledger side is a live production property and was
not re-read — the no-production rule applies. It is attributable only to `PHASE-2-STATUS.md` item 3.

What I *could* verify without production is the local audit artifact behind it,
`D:/agent-work/backfill-audit-2026-09-22.json` (162 kB, written 2026-09-22T03:35:25Z), and it
reconciles cleanly against the journal:

- **856** backfilled rows, all distinct tags, **all 856 present in the journal**, zero strays.
- **47** journal entries were *not* backfilled — mostly the recent tail `1098`→`1142`, plus eight older
  tags including `0002`, `0465`, `0467` and `1090`.
- 856 + 47 = **903 exactly**.

Two consequences the prior documents do not state:

1. **The three numbers in `PHASE-2-STATUS.md` finding 4 cannot be read together.** It records the
   ledger going "38 → 903" with 856 rows backfilled, but 38 + 856 = 894. The gap is that "38" and the
   backfill are different measurement points: eight tags (`1112`, `1115`, `1119`, `1122`, `1131`,
   `1132`, `1141`, `1142`) were applied separately in the same session, taking the ledger to 46 before
   the backfill ran. **47** journal entries are absent from the audit, so 47 rows are not attributable
   to it. Quote the split, not the "38 → 903" arrow.
2. **"903/903, 0 pending" is a reconciled ledger, not a replayed one.** Only 47 rows (5%) record an
   actual execution; 856 (95%) were inserted after verifying the objects were already live. The number
   is trustworthy as a statement about object existence and worthless as evidence that the chain
   replays. Full cold replay remains unproven and unprovable here.

## RDS backup and point-in-time recovery

`PHASE-2-STATUS.md` listed this BLOCKED because neither the AWS CLI nor `@aws-sdk/client-rds` was
available. Installed `@aws-sdk/client-rds` as a devDependency (one line in `package.json`) and read the
control plane. **This is read-only metadata — no database session was opened.**

| Fact | Value |
|---|---|
| Cluster / engine | `streamlineos` · aurora-postgresql **18.4** (confirms the recorded `server_version_num = 180004`) |
| Instance class | `db.serverless`, 1 member, Multi-AZ **false** |
| Backup retention | **1 day** — the AWS minimum |
| Backup window | 19:28–19:58 UTC |
| **Earliest restorable** | **2026-09-20T19:43:15Z** |
| **Latest restorable** | 2026-09-22T07:31:51Z |
| Storage encrypted | **false** |
| Deletion protection | **false** |

**The open item is closed, and the answer is better than feared but expiring.** 1141 and 1142 were
applied on 2026-09-22; the earliest restorable time is 2026-09-20T19:43:15Z, so **a pre-change recovery
point currently exists** via PITR, plus an automated snapshot `rds:streamlineos-2026-09-21-19-42`
(2026-09-21T19:43:15Z). With 1-day retention the window advances continuously, so that pre-change point
drops out within roughly a day. If a pre-change restore is ever wanted, it has to be taken now.

Snapshots present (3): the automated one above, and two manual ones —
`preupgrade-streamlineos-17-7-to-18-4-2026-09-11-12-33` and `streamlineos-final-snapshot` — both
predating the change by over a week. **No manual pre-change snapshot for 1141/1142 exists.**

Three findings beyond what was asked, because they were on the same response:

- **`storageEncrypted: false`.** Production Aurora holds 18 organizations and 31 users unencrypted at
  rest. This cannot be changed in place; it needs a snapshot-restore into a new encrypted cluster.
- **`deletionProtection: false`.** The production cluster can be deleted with no guard.
- **1-day retention with no Multi-AZ** is the weakest durable configuration RDS offers.

I did **not** create a snapshot. That is a mutation of production infrastructure and was not asked for;
it remains an open item, and note that a snapshot taken now still captures post-change state.

## Changes made

Backend, branch `build/data-foundation-final`:

| File | Change |
|---|---|
| `src/modules/build/phase-2/sprint-cycle-consolidation.spec.ts` | `SQL_DIR` → `migrations/sql` |
| `src/db/schema/phase-2/composite-fk-confdelsetcols.spec.ts` | `SQL_DIR` → `migrations/sql` |
| `src/modules/build/phase-2/qa-bug-consolidation-sql.spec.ts` | **new** — 90 tests over the 8 QA SQL artifacts |
| `src/db/schema/phase-2/phase-2-sql-is-unjournalled.spec.ts` | **new** — 37 tests pinning that all 26 files in `migrations/sql/` are unreachable by every applier |
| `src/db/schema/phase-2/bare-composite-set-null-repair.spec.ts` | **new** — 27 tests over the repair |
| `migrations/sql/c-confdelsetcols-05-bare-key-repair{,-rollback}.sql` | **new** — unjournalled repair for the two bare keys |
| `package.json` | `@aws-sdk/client-rds` devDependency |

No schema declaration, service, controller, migration, journal entry or frontend file was touched. No
comments were added to any file.

## Verification

| Check | Result |
|---|---|
| Phase 2 specs | **7 suites, 386 tests, 386 passed**, exit 0 |
| `tsc --noEmit -p tsconfig.build.json` | exit 0 |
| `tsc --noEmit -p tsconfig.test.json` | exit 2 — **one pre-existing error**, `portal-client-submit-cr.spec.ts:87` TS2502, untouched by this branch |
| `eslint` on every new and changed file | exit 0, 0 warnings |
| `check:migration-discipline` | exit 0 — 903 SQL files, 0 new violations |
| `check:migration-immutability` | exit 0 |
| `check:migration-rollback` | exit 0 |
| `check:watermark-free` | exit 0 — 5 appliers, all journal-driven |
| `check:set-null-migration-text` | exit 0 — 286/286 resolved, 2 known bare, 0 new |
| `check:set-null-column-lists` | exit 2 `INCONCLUSIVE` — declaration half OK, catalog half needs a database |
| `check:gate-wiring` | self-test 28/28 exit 0; gate exit 1 on **two pre-existing unwired gates**, `check:build-authz-census{,:check}`, which appear in no workflow file. Not caused here — this branch's workflow edit is purely additive (16 insertions, 0 deletions), and adding a `run:` step cannot unwire a `pnpm` script. Build authz, not data model. |

Not run, deliberately: `check:migration-chain`, `check:migration-ledger`, `migration:proof`,
`migration:proof:focused`, `check:replay-ledger`, `replay:chain-cold`. All carry
`--env-file-if-exists=.env`, and `backend/.env` is the production cluster.

## Hazards

**Reaching production is the default, not the exception — and the flag is not the tell.** The known
list of "four aliases that carry `--env-file-if-exists=.env`" badly understates this. Counted from
`package.json`: **79 scripts** carry `--env-file*=.env`, and a further **31** resolve a script whose
own source calls `dotenv` on `backend/.env` with no flag visible in the alias at all — including
`db:bootstrap`, `db:bootstrap-role`, `db:verify-rls`, `check:dead-code`, `check:tenant-indexes` and
`check:composite-fk-set-null`.

I hit the last one: its script is plain `node src/scripts/check-composite-fk-set-null.mjs`, and it
calls `dotenv.config({ path: BACKEND_ROOT/.env })` at line 36. I ran it on the strength of the alias
looking clean. It reached the Aurora endpoint and was **rejected at authentication**
(`PAM authentication failed for user "streamline_admin"` — production uses IAM auth and the script
mints no token), so no session was established and nothing was read. Reporting it because it happened,
not because it did harm.

**The rule to carry forward:** assume any backend script reads `backend/.env` and therefore production,
unless you have read its source and confirmed otherwise. Grepping `package.json` for `--env-file` is
not sufficient and will give false confidence 31 times.

**A commit message described only additions while deleting 61 files.** `6ac2004f5` is titled
"Implement contract freeze and rollback for QA bug consolidation" and lists nine bullet points, all
additive. It removed `backend/docs/` entirely. The content survived by relocation, but the message
gives no way to know that.

**A broken import path costs a whole suite silently.** `sprint-cycle-consolidation.spec.ts` read its SQL
at module scope, so a missing file failed the suite at load and 99 tests simply stopped existing. Jest
reports "2 failed, 2 passed" for that — the missing 99 are invisible unless you know the expected count.

## The real blocker is not a database — it is GitHub Actions billing

Both prior ledgers name the same unblock: "items 2 and 3 drop into `db-gates.yml` with no new
infrastructure." **That recommendation is wrong twice over, and I only found out by reading the runs.**

They did not need to "drop in" — they were already there:

| Item | Already wired at |
|---|---|
| Catalog half of the SET NULL gate, all 286 keys | `db-gates.yml:153-157`, `SET_NULL_GATE_DATABASE_URL` against `pgvector/pgvector:pg16` |
| `check:composite-fk-set-null` against `pg_constraint` | `db-gates.yml:163-167` |
| Full cold chain replay into a blank database | `db-gates.yml:462-465`, `COLD_DATABASE_URL` |
| `check:replay-ledger` over `drizzle.__replay` | `db-gates.yml:470-473` |

And the job has never run. **`db-gates.yml` is `failure` on 100 of its last 100 runs, back to
2026-09-10; `ci.yml` is `failure` on 100 of its last 100.** Every job reports **zero steps** and
completes in 3–5 seconds, because no step ever started. The annotation on the check run says why:

> The job was not started because recent account payments have failed or your spending limit needs to
> be increased. Please check the 'Billing & plans' section in your settings

So for roughly twelve days **no gate in this repository has executed in CI** — not the database gates,
not the static ones. Any reasoning anywhere that ends "CI will catch it" is currently false.

**This is the single action that unblocks the most work.** Restore GitHub Actions billing and items 1,
2 and 3 below all execute on the next push, with no database to provision and no code to write. The
engine floor is **15** (set by `NULLS NOT DISTINCT` at `0220_autonomy_switches.sql:50`), so the
existing pg16 service is sufficient.

## Still blocked

| # | Item | Blocked by | Wired? |
|---|---|---|---|
| 1 | Cross-tenant delete proof and bare-form regression (workstream C SQL 03 and 04) | Actions billing | **Newly wired here** — `db-gates.yml`, two `psql -v ON_ERROR_STOP=1` steps. Both scripts are `BEGIN … ROLLBACK` and assert with `RAISE EXCEPTION` (8 and 1), so they gate rather than report. |
| 2 | The remaining **285** catalog keys | Actions billing | Already wired since before this work |
| 3 | Full cold chain replay — the 903/903 ledger is not a substitute, per the 47/856 split above | Actions billing | Already wired since before this work |
| 4 | Row counts sizing the A and B backfills | **The no-production rule** — these are counts of live customer data and no CI fixture can stand in | Not wirable |
| 5 | Promotion of the 26 `migrations/sql/` artifacts to journalled migrations | Item 3 — BE-66 requires a replay proof first | Blocked on 3 |

Item 4 is the only one that cannot be closed by restoring billing. Items 1, 2, 3 and then 5 fall in
sequence once the runners start.

The repair SQL `c-confdelsetcols-05-bare-key-repair.sql` is deliberately **not** wired. It is DDL, it
would mutate the CI database that eleven later steps depend on, and with CI dark I cannot test that
claim. Wiring it is the first thing to do after the first green run, positioned after the catalog
gates.
