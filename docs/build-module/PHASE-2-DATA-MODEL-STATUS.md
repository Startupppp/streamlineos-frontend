> **HISTORICAL — point-in-time record, 2026-09-22**
> The environment facts inside this document (branch states, workstream statuses, blocker states, database probe results) are point-in-time and no longer current. For current release status see [RELEASE-STATUS.md](./RELEASE-STATUS.md).

---

# Phase 2 Build Canonical Data Model — Status Ledger

Coordinator-owned. Workers never edit this file. Phase 1 ledgers are not modified by Phase 2.

> **This is the data-model half of Phase 2.** A separate, concurrently-running session owns
> `docs/build-module/PHASE-2-STATUS.md`, which records the **application of migrations 1141 and 1142
> to production RDS**. The two documents are complementary and neither supersedes the other: that one
> is the execution record, this one is the design and static-verification record. This file was
> originally written at that path and renamed to avoid overwriting it.
>
> Where their measurements settle something this phase had listed as database-blocked, it is marked
> below and attributed. Nothing in this file was re-verified against production — the no-production
> rule applied to this workstream throughout, and every production number cited here is theirs.

**Session start:** 2026-09-22
**Branch:** `build/phase-2-data` (both repos)
**Root worktree:** `D:/projects/personal/slos-phase-2-data`
**Backend worktree:** `D:/projects/personal/slos-be-phase-2-data`
**Database:** NONE — see the gating determination below.

## Scope owned by Phase 2

| ID | Work | Status |
|---|---|---|
| A | P0 #6 Sprint/Cycle consolidation | IN_PROGRESS |
| B | P0 #7 QA Bug consolidation | IN_PROGRESS |
| C | P0 #8 live composite-FK verification | IN_PROGRESS |
| D | Staging verification of migrations 1141 and 1142 | IN_PROGRESS |
| E | This ledger | IN_PROGRESS |

Explicitly out of scope: frontend navigation, command palette, My Work, Inbox, portal, shared RBAC, and every pre-Phase-2 status ledger.

## Gating determination: no non-production PostgreSQL exists

The first instruction was to establish whether a non-production PostgreSQL 15+ URL exists. It does not. Every candidate was probed directly rather than inferred.

| Candidate | Probe | Result |
|---|---|---|
| `backend/.env` → `DATABASE_URL`, `APP_DATABASE_URL` | host inspection | Production Aurora `streamlineos-instance-1.c94aokgu6g21.ap-south-1.rds.amazonaws.com`, IAM auth. Excluded by rule — production access is forbidden. |
| `backend/.env.production` | host inspection | Same production Aurora host. No longer the Neon mirror an earlier session recorded; that file has been overwritten. |
| `backend/.env.localstack` → `127.0.0.1:5432/scratch_local` | TCP connect to 127.0.0.1:5432 | `Connection refused`. Config survives; the database does not. |
| Local PostgreSQL install | `command -v psql`, `command -v pg_ctl`, `C:/Program Files/PostgreSQL`, `D:/localstack` | Absent. |
| Docker / Podman | `command -v docker`, `docker info` | Not installed / not running. |
| WSL | `wsl.exe -l -v` | `Windows Subsystem for Linux has no installed distributions.` |
| Neon branch provisioning | `NEON_API_KEY`, `NEON_PROJECT_ID` in `backend/.env` | Absent. The keys an earlier session recorded are gone, so a scratch branch cannot be provisioned from this machine. |
| Legacy Neon owner URL `ep-lingering-heart-azirg7nc-pooler.c-3.ap-southeast-1.aws.neon.tech` | read-only connect | `28P01 password authentication failed for user 'neondb_owner'` |
| Legacy Neon app URL `ep-orange-mode-azxn5hbr-pooler.c-3.ap-southeast-1.aws.neon.tech` | read-only connect | `28P01 password authentication failed for user 'streamline_app'` |

Both Neon endpoints resolve and answer, so the hosts are alive and only the credentials are dead. That is the closest thing to an available non-production target, and it is not usable without a password.

**Consequence:** Phase 2 runs the static branch of its brief — schema, API and backfill design plus tests that execute without a database. No migration is applied, no `confdelsetcols` is read, and nothing is marked DONE on the strength of a design alone.

### Exact unblock requirements

Provision a non-production PostgreSQL instance, replay the 903-migration chain onto it, then set the variables below. The repo does not read one shared variable — each gate reads its own, and setting only `DATABASE_URL` leaves most gates inconclusive rather than failing.

| Variable | Consumer |
|---|---|
| `DATABASE_URL` | owner-role DDL and chain replay |
| `APP_DATABASE_URL` | `streamline_app` role, required so RLS is actually exercised |
| `APPLY_ONE_DATABASE_URL` | `src/scripts/apply-journalled-migration.mjs` (single-tag apply) |
| `SET_NULL_GATE_DATABASE_URL` | `check-set-null-column-lists.ts:48` and `set-null-column-lists.db.spec.ts:31` only. It is **not** read by `check-set-null-migration-text.ts`, which reads no database variable at all — the only occurrence there is prose at `:958`. |
| `APPLY_ONE_ALLOW_REMOTE` | must be exactly `"1"` for `apply-journalled-migration.mjs` to accept a remote host |
| `COLD_DATABASE_URL` | `replay-chain-cold.mjs:35` |
| `SCRATCH_URL` | `reset-scratch-db.mjs` — note this is **not** `SCRATCH_DATABASE_URL` |
| `CONSTRAINT_DRIFT_GATE_DATABASE_URL` | constraint drift gate |
| `REFERENTIAL_ACTION_GATE_DATABASE_URL` | referential action gate |
| `COLUMN_DRIFT_GATE_DATABASE_URL` | column drift gate |
| `TENANT_RELATIONSHIP_DB_URL` | tenant relationship gate |
| `MEMBERSHIP_PARITY_GATE_DATABASE_URL` | membership parity gate |

Constraints on the target: the database name must contain `scratch` or the seed and harness guards refuse it; `DATABASE_URL` and `APP_DATABASE_URL` must share a hostname because `env.validation.ts` compares host:port/path; and the true version floor is recorded in workstream D rather than assumed to be 15.

## Workstream status

| Workstream | Status | Files | Tests | Migration evidence | Blocker |
|---|---|---|---|---|---|
| A — Sprint/Cycle | DESIGN_COMPLETE, EXECUTION_BLOCKED | 11 (1 spec, 10 SQL, 1 doc) | 99/99 pass | none applied | staging PostgreSQL |
| B — QA Bug | DESIGN_COMPLETE, EXECUTION_BLOCKED | 11 (1 spec, 1 helper, 8 SQL, 1 doc) | 43/43 pass | none applied | staging PostgreSQL |
| C — Composite FK | STATIC_GAP_CLOSED, CATALOG_BLOCKED | 6 (1 spec, 4 SQL, 1 doc, 1 gate extended) | 58/58 pass + gate self-tests 60/14/7 | none applied | staging PostgreSQL |
| D — 1141/1142 | VERIFIED_STATIC; applied to production by another session | 4 (1 spec, 2 SQL, 1 doc) | 32/32 pass | applied to production RDS, not by this phase — see `PHASE-2-STATUS.md` | none for 1141/1142; cold replay still needs staging |

`DESIGN_COMPLETE` and `VERIFIED_STATIC` are deliberately not `DONE`. Nothing here has staging evidence, so nothing qualifies.

## Workstream A — Sprint/Cycle consolidation (P0 #6)

Cycle is canonical, confirmed against source and `02-schemas.md:39`.

**Real vocabularies** (read from source, not the backlog): `cycle_status = ('draft','active','completed')` default `draft` (`src/db/schema/build/enums.ts:25`); `sprints.status` is `text` default `'PLANNED'` with CHECK `('PLANNED','ACTIVE','COMPLETED')` (`core.ts:111,125-128`).

**Status map**, total and deterministic on `upper(btrim(coalesce(status,'')))`: `PLANNED→draft`, `ACTIVE→active`, `COMPLETED→completed`, and NULL / empty / unrecognised → `draft`. Unknown values resolve to the column default rather than `active` or `completed`, because completion emits notifications and inventing one would fire them.

**Phases:** expand → backfill → constrain → detach → drop, each with its own rollback file.

**Corrections to the Phase 1 record:**

- "~40 frontend files" is an undercount. The real figure is 67 by that exact criterion, 72 across the whole surface, plus 121 backend `.ts` files.
- Tickets are not the dominant migration cost as recorded. Four tables reference sprints, and `sprint_scope_events.sprint_id` is `NOT NULL`, so it is the only one that cannot be nulled.
- Two asymmetries Phase 1 omitted, both harder than the rename: `cycles` has no `deleted_at` while `sprints` soft-deletes, and `cycles.created_by` is `NOT NULL` with no sprint-side source.
- Declaration/migration constraint-name drift: the Drizzle names `fk_*_org_sprint` appear in no file under `migrations/`. What was actually created is `fk_*_sprint_id_org` (`0579_tenant_fks_build_schemas.sql:1201`) and `*_sprint_id_sprints_id_fk`.
- `deleteSprint` soft-deletes; `deleteCycle` hard-deletes. Consolidating as-is would destroy recoverable history.
- Permission asymmetry: cycle reads gate on `build:sprints:view`, cycle writes on `build:workspace:manage`, sprint writes on `build:sprints:manage`.
- `CyclesService` enforces no-overlap and one-active-cycle in application code only, with no database constraint. Both invariants will be false for migrated rows, so reconciliation is specified separately and deliberately excluded from the backfill.

**New defect found, independent of the migration:** `CyclesController` has no `GET :cycleId`. The detail page resolves a cycle by scanning `listCycles`, which is capped at `.limit(100)`, so the 101st cycle is already unreachable by URL — and every migrated sprint becomes one. This is a pre-existing bug that consolidation would amplify.

**Conflict rules:** sprint ids are not preserved; correspondence is recorded in both `cycles.legacy_sprint_id` and a `sprint_cycle_migration_map` table. Where a ticket carries both ids and they disagree, `cycle_id` wins, expressed structurally as `AND t."cycle_id" IS NULL` so the rule cannot drift. `created_by` derives project manager → org owner → `min(user_id)` and raises loudly if all three are null.

## Workstream B — QA Bug consolidation (P0 #7)

Canonical target is `WorkItem.type=BUG`, consistent with `10-project-bugs.md`, which already dispositions `/build/[projectId]/bugs` as CONSOLIDATE into `/build/[projectId]/issues?type=BUG`.

**The canonical status model is not an enum,** which is the fact that reshapes this whole workstream. `tickets.status` is `text NOT NULL DEFAULT 'TODO'` (`src/db/schema/build/ticket-core.ts:36`) bound by a composite FK `fk_tickets_status (org_id, project_id, status) → project_statuses(org_id, project_id, name) ON UPDATE CASCADE` (`ticket-core.ts:95-99`). `project_statuses` is per-project configurable and typed by `state_group` (backlog/unstarted/started/completed/cancelled), and its `type` column is **nullable** (`build/core.ts:141`), which any resolver has to handle.

So the mapping is two-stage: the 9-value `bug_status` maps onto `state_group`, then onto a concrete `project_statuses` row. The fallback chain for a project missing a matching state is deterministic, tie-broken on `("order", id)`, and never lands on `cancelled`; projects with zero statuses are seeded first.

**Model decision:** a sidecar `build.work_item_qa_details` keyed `(org_id, work_item_id)` with a three-column FK `(org_id, project_id, work_item_id) → tickets(org_id, project_id, id)` so the denormalised `project_id` cannot drift. This needs one new unique index on `tickets`. No JSONB is used for any of the four FK-bearing QA columns, per `02-schemas.md:61`. `linked_ticket_id` is converted to a `work_item_relations` row rather than dropped.

Status is written twice — mapped onto `tickets.status` and recorded verbatim as `qa_state` in the sidecar — because the 9→5 projection is lossy: `verified` and `closed` both collapse to `completed`. Severity→priority is defined and tested but deliberately **not applied** by the backfill, since escalating a blocker/low bug would silently rewrite a human triage decision.

**Corrections to the Phase 1 record:**

- "10 columns the canonical ticket lacks" is wrong; it is **15**. `bugs` has 27 columns (`qa.ts:138-165`), `tickets` has 38 (`ticket-core.ts:29-82`). The figure is now derived by a test from `getTableColumns` rather than hand-counted, so it cannot drift again.
- "The 9-value `bug_status` maps onto nothing" is overstated. No target *enum* exists because the canonical model is not an enum, but the values map cleanly onto `state_group`.

**Three source defects found that no prior phase recorded:**

- `bugs` has no `version` column while `tickets` does (`ticket-core.ts:76`). Bug updates have no optimistic-concurrency guard today, and consolidation silently adds one.
- `bugs.created_at`, `updated_at` and `deleted_at` are `timestamp` **without** time zone (`qa.ts:163-165`), while tickets use `timestamptz`. Every backfill copy needs an explicit `AT TIME ZONE 'UTC'` or historical timestamps shift by the server GUC.
- `frontend/features/build/bugs/bug-schema.ts` omits `linkedTestCaseId` even though `dto/bugs.schemas.ts` `createBugSchema` accepts it, so the evidence link is settable by API and never by the UI.

**Authorization delta, report-only.** Cutover silently *gains* defect read/write for anyone holding `build:tickets:*` without `build:bugs:*`, and silently *loses* assignment for anyone with `build:bugs:update` but not `build:tickets:assign` (`shared.ts:92`). Three files would need changes and all three are outside Phase 2's edit scope: `build.artifacts.ts` (a new catalog entry for `work_item_qa_details.qa_owner_membership_id`), `frontend/lib/build/nav/build-project-catalog.ts:169-175`, and `frontend/lib/rbac/route-access/route-access-extension-entries.ts:209-213`.

**Writers of `build.bugs`,** all four: `bugs.service.ts:76` insert, `:144` update, `:196` soft delete, and `test-runs.service.ts:392` insert. Bug numbers use `MAX+1` under `pg_advisory_xact_lock` (`bugs.service.ts:59-64`), a different scheme from ticket numbers, which use a counter table with a self-healing upsert (`build/ticket-counters.ts:6-26`).

## Workstream C — Composite FK SET NULL verification (P0 #8)

The count is right and the conclusion drawn from it was not. There are exactly **286** keys requiring a column list, recounted from the Drizzle object graph rather than from text. Shape recount across all 286: arity 2 on 286/286, exactly one nullable member on 286/286, member 0 always `org_id` (281) or `organization_id` (5), and the tenant column appears in zero required lists.

**"Nothing static can read `confdelsetcols`" is misleading.** That is true of the live catalog and false of the *intended* column list, which is plain text in `migrations/*.sql`. Phase 1 also lists two gates when there are three; the third, `check:set-null-migration-text`, is the one already doing the static work, and Phase 1 omits it.

**The "~40 residual" was a name-matching artifact.** After extending the existing gate rather than adding a parallel one, the corpus resolves **286/286**. I re-ran this myself in a quiet tree:

```
Migration files 903 · keys requiring a column list 286 · resolved to an install 286
installed 246 · installed-alias 3 · swept 33 · swept-indeterminate 0
bare 2 · drift 0 · not-set-null 2 · dropped 0 · untraceable 0
exit 0, 0 new violations
```

282 are proven correct. The remaining 4 are not unverified — they are verified to be something else. Two are deliberate (`fk_calendar_events_linked_lead_party_id` installs `NO ACTION` by `0662a`; `fk_payroll_run_employees_org_worker` installs `RESTRICT` by `0392`). The other two matter:

- `fk_inv_sales_orders_channel_id_org` (`0580a`, journal position 806)
- `fk_inv_stock_adjustments_scrap_location_id_org` (`0545a`, journal position 787)

Both sit in the gate's known-bare allowlist, so they are pre-existing and not a new regression. But they are **the same defect class that migration 1142 exists to repair** — a bare `ON DELETE SET NULL` on a composite key whose tenant member is `NOT NULL`, installed after the last sweep — and unlike the requisition key, neither has a repair migration. They are the obvious next migration after 1142.

**The gate extension resolves, it does not suppress.** Before: `installed 246 · swept 33 · bare 2 · drift 0 · not-set-null 2 · dropped 2 · untraceable 1`, exit 0. After: `dropped 0 · untraceable 0` with 3 newly attributed under `installed-alias`, exit 0. The `0 new violations` verdict is unchanged. Three keys whose declaration-derived name appears in no migration are now resolved by `(relation, referencing columns)` tuple, requiring exactly one surviving candidate and refusing on ambiguity: `managed_products_..._fk` → `fk_managed_products_owner_membership` (`0764`), and the two `invitations` membership keys → their `0965` names.

Sweep determinism is now *checked* rather than assumed: a swept key with two or more nullable members gets a new `swept-indeterminate` verdict instead of being silently counted clean.

**Corrections to the Phase 1 record:**

- Commit `425df08df` does not exist. The real sha is `425df08dd`. One transposed character.
- "246 of 286 statically verified" understates the corpus by 36 keys; 246 was the `installed` count only.
- A known limitation recorded but not fixed: `check-set-null-column-lists.ts:304` keys on the untruncated derived name, so `managed_products` is skipped **even with a database**.

**Known residual, stated plainly:** every verdict above is about the migration corpus, and the corpus is not the database. Applied-ness, partial execution and out-of-band `ALTER` are unknowable from files — the more so since `_chain.sha256.json` does not seal 1141 or 1142. All 286 remain catalog-unverified.

**CI already has the missing piece.** `.github/workflows/db-gates.yml:157` runs the catalog half against a `pgvector/pgvector:pg16` service. The cross-tenant delete proof and the catalog verification drop into that existing job with no new infrastructure — which is a cheaper unblock path than provisioning a machine-local database.

## Workstream D — Migrations 1141 and 1142

Seventeen of twenty Phase 1 claims verified TRUE. Three are wrong.

- **The 23502 drift claim is FALSE.** Phase 1 records that writes omitting `pm_workspace_id` will raise `23502` until 1141 is applied. `resolveWorkspaceIdForWrite` (`src/modules/build/pm-workspaces/pm-workspaces.service.ts:221`) returns `Promise<string>` and falls back through `resolveDefaultWorkspaceId` to `ensureDefaultWorkspace`, so all three insert sites receive a non-null string. The error is unreachable through the API; only a raw insert or seed can trigger it. The contract half of the claim is real — the column, the request schema and the response schema are all already nullable/optional.
- **"~100 sealed migrations back to 0265" is FALSE.** `0265:43` is comment prose, not DDL. The earliest real occurrence is `0578_tenant_fks_public_c.sql:1030`, and the true count is 96.
- **1141 and 1142 are not hash-sealed.** I verified this directly: `migrations/meta/_chain.sha256.json` was sealed on 2026-09-04 with 685 entries ending at `1061_push_endpoint_cross_tenant_claim`. No tag matching `11[34]*` is present. The immutability gate passes but says nothing about either migration.

**PostgreSQL floor is 15,** so the "PostgreSQL 15+" requirement stands. The floor is set by `NULLS NOT DISTINCT` at `migrations/0220_autonomy_switches.sql:50` — 358 migrations earlier than 1142, which Phase 1 credited with setting it. No PG16/17/18-only syntax exists anywhere in the chain; every apparent hit is a false positive (18 "MERGE" matches are the English word in party-merge comments, with zero `MERGE INTO`; "NOT ENFORCED" is a `RAISE EXCEPTION` string at `0799:218`).

**Additional env facts for the runbook,** read from source: `apply-journalled-migration.mjs:56-62` resolves `APPLY_ONE_DATABASE_URL` → `DIRECT_DATABASE_URL` → `DATABASE_URL` in that order, and requires `APPLY_ONE_ALLOW_REMOTE` to be exactly `"1"`. Cold replay reads `COLD_DATABASE_URL`. The scratch reset script reads `SCRATCH_URL`, **not** `SCRATCH_DATABASE_URL`. `env.validation.ts` additionally requires the owner and app URLs to use different usernames and the app username to match `APP_DB_ROLE`.

**Gates run, all exit 0:** discipline self-test 27/27 and full (903 files, 0 new violations); immutability self-test 13 and full; rollback self-test 9/9 and full (903); watermark-free self-test 10 and full (5 appliers); set-null-migration-text self-test 57 and full (246 keys, 2 known bare, 0 new); chain self-test 24; ledger self-test; composite-fk self-test 7/7; both typechecks.

**Inconclusive for lack of a database target** (not failures): full runs of `verify-migration-chain`, `check-migration-ledger`, `migration-proof`, `migration-proof-focused`, the catalog half of `check-set-null-column-lists`, `check-composite-fk-set-null`, `replay-chain-cold`, and `set-null-column-lists.db.spec.ts`.

## Hazards found during Phase 2

These are environment facts that cost time and would cost it again.

**The Phase 1 unblock runbook is unsafe as written.** It recommends `pnpm check:migration-chain` and `pnpm migration:proof -- 1141 1142`. All four of `check:migration-chain`, `check:migration-ledger`, `migration:proof` and `migration:proof:focused` run with `--env-file-if-exists=.env`, and `backend/.env` points at the production Aurora cluster. On a machine with that file present, those commands connect to production. Use explicit per-gate variables instead of the bare pnpm aliases.

**A CRLF regex bug silently corrupts SQL scans.** Migration files are CRLF and JavaScript's `.` does not match `\r`, so the idiomatic `line.replace(/--.*$/, "")` comment stripper removes nothing and reports no error. It produced a wrong PostgreSQL-floor count (99 hits across 7 files instead of 96 across 5) before being caught. Use `/--[^\n]*/` or normalise line endings first.

**Backend jest `roots` excludes `test/`.** The config lives in `package.json` under `jest`: roots are `src`, `evals`, `test/security`, `test/perf`, with `testRegex` `.*\.spec\.ts$` and `.db.spec.ts` ignored. A spec placed in `test/phase-2/` matches zero suites and reports success while running nothing. All Phase 2 specs are under `src/**` for this reason.

**`jest-e2e.json` and `jest-db.json` are missing** from both the worktree and the main checkout, and are not gitignored. The four scripts referencing them crash rather than skip.

## Coordinator verification

Run by the coordinator in a quiet tree after all four workstreams finished, so no measurement races a concurrent edit.

| Check | Command | Result |
|---|---|---|
| All Phase 2 specs together | `jest --runInBand src/modules/build/phase-2/ src/db/schema/phase-2/` | **4 suites, 232 tests, 232 passed**, exit 0 |
| Build typecheck | `tsc --noEmit -p tsconfig.build.json` | exit 0 |
| Test typecheck | `tsc --noEmit -p tsconfig.test.json` | exit 0 |
| SET NULL text gate, self-test | `check-set-null-migration-text.ts --self-test` | 60 passed, exit 0 |
| SET NULL text gate, full | `check-set-null-migration-text.ts` | 286/286 resolved, 2 known bare, **0 new**, exit 0 |
| SET NULL column-list gate, self-test | `check-set-null-column-lists.ts --self-test` | 14 passed, exit 0 |
| Composite FK gate, self-test | `check-composite-fk-set-null.mjs --self-test` | 7/7, exit 0 |

**Independently re-verified agent claims** rather than accepting the reports: `_chain.sha256.json` really does hold 685 entries sealed 2026-09-04, ending at `1061_push_endpoint_cross_tenant_claim`, with no `114x` tag; `CyclesController` really has no `@Get(":cycleId")` while sprints have `@Get(":sprintId")` at `iterations.controller.ts:92`, and `cycles.service.ts:35` really is `.limit(100)`; `bug_status` really has 9 values and `bugs` timestamps really are `timestamp` not `timestamptz`; `tickets.status` really is text bound by `fk_tickets_status` to `project_statuses`.

### Pre-existing failures, not caused by Phase 2

- `src/db/cold-build-integrity.spec.ts` fails **8 of 19** tests. Confirmed by running it on the pristine backend `main` checkout, which produces the identical result. The failures are journal idx-contiguity and migration-ordering assertions, consistent with the two adjudicated pre-existing journal issues. No Phase 2 file is imported by it and `migrations/` is untouched.
- `check:over-300` exits 1 on pristine `main`: 436 files over 300 lines against a baseline of 413. The workstream C gate extension does not move that number, because the file it grows was already over the threshold and already counted.

### Adjudications

**Migration SQL is not journalled.** All 22 SQL files live under `backend/docs/phase-2/sql/` and none was added to `backend/migrations/` or `migrations/meta/_journal.json`. Journalling a migration that cannot be applied or tested would manufacture exactly the unapplied-migration drift that 1141 is already accused of. Promotion — renumber, move, journal, seal — is the first step of the staging session, not this one.

**`check-migration-discipline.mjs` does not cover these files.** It scans `backend/migrations/` only, and aborts outside it on a missing `meta/_journal.json`. Its five content rules were replicated verbatim over the Phase 2 SQL instead, and the specs enforce them. A cross-check flagged the workstream C and D files for a missing `lock_timeout`; that is correct output applied to the wrong kind of file — those four are read-only verification and rolled-back proof scripts, not migrations, and a lock timeout on a `SELECT`-and-`ROLLBACK` proof is meaningless. The workstream A and B files, which *are* migration candidates, carry it. This rule must be re-applied at promotion time.

**No code comments, with one drawn line.** Every TypeScript file was scanned. Four of the five new TS files and the two design-doc sets were clean on the first pass; workstream C had added 6 comment lines to its spec and 69 to the gate it extended, and those were removed, with the load-bearing reasoning moved into test names rather than deleted.

The line is drawn at TypeScript. The 24 SQL files under `backend/docs/phase-2/sql/` keep their file-level headers, and this is deliberate. Those headers are not commentary on code — they carry preconditions, apply-order warnings and reversal instructions that an operator needs at the moment of execution. `b-qa-bug-04-contract-freeze.sql` is the clearest case: its header says to apply it only after the read/write cutover has deployed, because it revokes the write grant on `build.bugs` and any surviving legacy writer will start raising `42501`. Deleting that sentence would make the artifact more dangerous, not cleaner. Workstreams C and D wrote no SQL comments at all; the remaining comment-only lines in the A and B files are mostly `--> statement-breakpoint`, which the migration runner requires as structure. If the intent of the rule was to cover these too, they should be stripped at promotion time.

## Residual blocker

One blocker, unchanged from the gating determination: **no non-production PostgreSQL 15+ instance exists**. The version floor of 15 is now verified rather than assumed.

Six of the items this phase listed as database-blocked were settled in the meantime by the session that applied 1141 and 1142 to production. Those are marked **resolved elsewhere** and attributed; none of them was re-measured here.

| # | Item | State |
|---|---|---|
| 1 | Whether 1141 is applied, and whether schema drift exists | **Resolved elsewhere.** Applied; `build.projects.pm_workspace_id` went `attnotnull = true → false`. No drift remains. |
| 2 | `confdelsetcols` for all 286 keys against the live catalog | **1 of 286 resolved elsewhere.** `fk_job_requisitions_headcount_org` reads `confdelsetcols = [25]` → `headcount_id`, `convalidated = true`, `org_id` untouched. The other 285 remain catalog-unverified. |
| 3 | Cross-tenant delete proof and bare-form regression proof (workstream C SQL 03 and 04) | **Still blocked.** Both written, neither executed. |
| 4 | Behavioural `23502` proof for 1141 | **Resolved elsewhere, and the premise was wrong.** `job_requisitions` and `headcount_requests` both hold **0 rows**, so the 1142 defect was latent, never active. Independently confirms workstream D's finding that the `23502` claim was unreachable. |
| 5 | Ledger depth and pending count | **Resolved elsewhere.** 903 ledger rows against 903 journal entries, 0 pending, watermark `1803000010420` = journal head. Full cold chain replay is **still blocked**. |
| 6 | Real lock behaviour and whether 1142's `VALIDATE` fits the 5s timeout | **Resolved elsewhere for these two migrations.** Both took `ACCESS EXCLUSIVE` on tables of 9 and 0 rows under `lock_timeout = '5s'`; 0 sessions were waiting on a lock. This does not generalise to the workstream A and B migrations, which touch populated tables. |
| 7 | Row counts sizing the workstream A and B backfills | **Still blocked.** `build.projects` is 9 rows, but ticket conflict-case counts, soft-deleted sprint counts and whether any org already holds two active cycles are all unmeasured. |

So the standing blocker reduces to items 3 and 7, plus the 285 remaining catalog keys and the cold replay.

**Two corroborations worth recording,** because they were reached independently and agree:

- Workstream C identified `fk_inv_sales_orders_channel_id_org` and `fk_inv_stock_adjustments_scrap_location_id_org` as the two surviving bare composite SET NULL keys of the same class 1142 repairs. The production-application record lists exactly those two as its open items, with no migration authored. They are the next migration in this area.
- Workstream D concluded from source that the 1141 `23502` drift was unreachable because `resolveWorkspaceIdForWrite` cannot return null. The production record reaches the same conclusion from the other direction, calling 1141 "a compile-time guard, not a runtime one".

**One sequencing finding is theirs, not this phase's,** and is recorded here only so the two documents do not contradict each other: both migrations were applied to production **before** the preflight gate was requested, outside any maintenance window, and without a pre-change RDS snapshot. Every technical check passed afterwards and both rollbacks were rehearsed successfully. This phase neither performed nor authorised that application.

The cheapest unblock is not a new machine-local database. `.github/workflows/db-gates.yml:157` already runs the catalog half of the SET NULL gate against a `pgvector/pgvector:pg16` service, and items 2 and 3 drop into that existing job with no new infrastructure.

## Rules enforced

- No code comments, no TODO comments.
- No destructive git, no `git stash`.
- No production database access; no database access of any kind.
- Dedicated worktrees and branch `build/phase-2-data` in both repos.
- No agent edits another agent's files; `migrations/meta/_journal.json` and `backend/migrations/` are untouched.
- Nothing is DONE without tests and staging evidence. With no staging, no data-model task can reach DONE this phase.
