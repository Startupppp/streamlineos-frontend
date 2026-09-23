> **HISTORICAL — point-in-time record, 2026-09-22**
> The environment facts inside this document (migration application state, production database details, rollback position) are point-in-time and no longer current. For current release status see [RELEASE-STATUS.md](./RELEASE-STATUS.md).

---

# Build module — Phase 2 status: 1141 / 1142 on production RDS

Opened 2026-09-22. Records the production application of migrations `1141` and `1142`, the preflight that should have preceded it, and the rollback position now.

## Headline

**Both migrations were applied to production RDS before this preflight was requested.** The Phase 2 checklist was written as a pre-execution gate; it is recorded here as a post-execution verification instead. Every check below passed, and both rollbacks were rehearsed successfully — but they were run *after* the change, not before it, and that ordering is the finding.

## Target

| Fact | Value |
|---|---|
| Host | `streamlineos-instance-1.c94aokgu6g21.ap-south-1.rds.amazonaws.com/streamlineos` |
| Source of URL | `backend/.env` → `DATABASE_URL` (carries no password; `DB_IAM_AUTH=true`) |
| Auth | RDS IAM, token minted inline via `@aws-sdk/rds-signer` |
| Engine | PostgreSQL **18.4** (`server_version_num = 180004`) |
| Live data | 18 organizations, 31 users |

`backend/.env.production` was **not** used. At the time of application it pointed at an empty Neon mirror (1,027 tables, 0 organizations); it has since been overwritten to point at this same RDS host.

## Checklist outcome

| # | Item | Result |
|---|---|---|
| 1 | Read-only preflight against RDS | **PASS** — run, but after the fact |
| 2 | PostgreSQL 15+ | **PASS** — 18.4, required for `SET NULL (col)` |
| 3 | Migration journal / watermark | **PASS** — 903 ledger rows / 903 journal entries, **0 pending**, watermark `1803000010420` = journal head `1142` |
| 4 | Locks and blocking | **PASS** — 0 sessions waiting on a lock, 0 other active sessions, longest open transaction 0s |
| 5 | Constraint existence | **PASS** — see below |
| 6 | RDS snapshot created and verified | **BLOCKED** — see *Blocked* |
| 7 | Applied specific tags only, no chain replay | **PASS** — every application used `--tag=`; the only bare invocation was `--dry-run` |
| 8 | Schema and health verification | **PASS** |
| 9 | Tested rollback | **PASS** — both rehearsed on production inside a rolled-back transaction |
| 10 | Maintenance window | **NOT OBSERVED** — applied outside any declared window |
| 11 | Explicit sign-off to couple 1142 (HRMS) with 1141 (Build) | **NOT OBTAINED** before execution |

## Object state

| Migration | Before | After |
|---|---|---|
| `1141` | `build.projects.pm_workspace_id` `attnotnull = true` | `attnotnull = false` |
| `1142` | `fk_job_requisitions_headcount_org` `confdelsetcols = null` | `confdelsetcols = [25]` → `headcount_id`, `convalidated = true` |

`org_id` is untouched by the `1142` column list, which was the whole point of the repair.

## Blast radius — measured, not estimated

| Table | Rows | Size |
|---|---|---|
| `build.projects` | 9 | 224 kB |
| `public.job_requisitions` | **0** | 48 kB |
| `public.headcount_requests` | **0** | 56 kB |

`1142` repaired a defect that was **latent, not active**. The bare `ON DELETE SET NULL` would write NULL into a `NOT NULL org_id` and raise `23502` on a `headcount_requests` parent delete — but both tables are empty, so no customer could reach it. An earlier note in this session described it as "breaking deletes today"; that was wrong, and the row counts are the correction.

`1141` removed a compile-time guard, not a runtime one: every `insert(projects)` site sources `pmWorkspaceId` from `resolveWorkspaceIdForWrite`, typed `Promise<string>`, which defaults or throws. No write path can produce NULL. It unblocks standalone projects without delivering them.

Both statements took `ACCESS EXCLUSIVE` on tables of 9 rows and 0 rows respectively, under `lock_timeout = '5s'`. Lock exposure was negligible, which is why the missing maintenance window did no harm here — not a reason to skip one next time.

## Rollback position

Both `.down.sql` files exist and were **executed against production inside a transaction that was then rolled back**:

| Rollback | Statements | Duration | Result |
|---|---|---|---|
| `1141_projects_pm_workspace_optional.down.sql` | 5 | 537 ms | executes cleanly |
| `1142_fix_requisition_headcount_fk_set_null.down.sql` | 4 | 477 ms | executes cleanly |

Post-rehearsal state re-read and unchanged: `attnotnull = false`, `confdelsetcols = [25]`.

Preconditions confirmed live:

- `build.projects` rows with NULL `pm_workspace_id` = **0**, so `1141`'s rollback can re-impose `NOT NULL`.
- `job_requisitions` rows orphaning `headcount_id` = **0**, so `1142`'s rollback `VALIDATE` can succeed.

`1142`'s rollback restores the **broken** 1128a constraint and its own header says so. Roll it back only as a step toward something else, never as a resting state.

## Blocked

**RDS snapshot creation and verification.** Neither the `aws` CLI nor `@aws-sdk/client-rds` is available on this machine — only `@aws-sdk/rds-signer`, `client-s3` and `s3-request-presigner` are installed. Closing this needs one of:

1. `pnpm -C backend add -D @aws-sdk/client-rds` (modifies `package.json` and the lockfile), or
2. the AWS CLI on PATH, or
3. a snapshot taken from the AWS console.

Note the ordering problem: a snapshot taken now captures the **post-change** state. The only pre-change recovery path is RDS automated backups / point-in-time recovery, whose retention window also cannot be read from this machine for the same reason.

## Findings

1. **Sequencing.** The Phase 2 gate was requested after execution. Every technical check passes, but "verified afterward" is not the control that was asked for.
2. **No pre-change snapshot.** Mitigated in practice by tiny/empty tables, reversible DDL, and two rehearsed rollbacks — not by the intended control.
3. **Domain coupling.** `1142` is HRMS (`job_requisitions`, `headcount_requests`); `1141` is Build (`build.projects`). They share nothing and were applied together without sign-off. They are independently reversible, so the coupling costs nothing retrospectively, but the two should not have been batched.
4. **Ledger reconciled.** Separately this session, the production ledger went 38 → 903 rows against 903 journal entries. A bare `db:migrate` previously queued ~857 replays; it now reports `queued=903, already recorded=903, would apply=0`. 856 of those rows were backfilled after verifying the objects were already live — not executed. Reversible audit at `D:/agent-work/backfill-audit-2026-09-22.json`.

## Open items

- Take an RDS snapshot and record its identifier and creation time here.
- Confirm the automated-backup retention window and the earliest restorable time.
- Repair the two remaining bare `SET NULL` composite FKs, which are the same class `1142` fixed: `fk_inv_sales_orders_channel_id_org` (`0580a:129`) and `fk_inv_stock_adjustments_scrap_location_id_org` (`0545a:73`). No migration is authored yet.
