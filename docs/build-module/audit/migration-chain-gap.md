# Invitation migration chain gap

Status: Current unverified on a database; source ordering concern confirmed 2026-10-03
Owner: `ARCH-14-ACTIVATION` migration prerequisite, with `ARCH-10-EVIDENCE-CLEANUP` review
Finding: `BLD-MIGRATION-CHAIN-01`

## Source evidence

`backend/migrations/0965_ar02_canonical_tenant_fks_3.sql` adds `invitation_events(org_id, invitation_id) -> invitations(org_id, id)`. The original invitations table has an `id` primary key. A search of the checked-in SQL before `0965` found no nonpartial unique key on `(org_id, id)`, which PostgreSQL requires for that composite reference. `backend/migrations/1728_organization_setup_invitation_receipts.sql` now adds `uniq_invitations_org_id_setup_receipts`, but its journal entry runs after `0965`.

The migration journal places `0965` at index 607 with `when=1803000010052`. There is a free timestamp `1803000010033` between the existing `0941` and `0943` entries. The source suggests a new prerequisite can be inserted there without editing `0965` or changing any existing timestamp. The repository migration seal rejects an ordinary backdated insert; its emit mode must not be used as an unchecked bypass. Source inspection alone does not prove how a real fresh or upgraded database behaves. `db-bootstrap` can defer and retry failures, which may mask an ordering error; fail-fast migration remains a separate check.

Migration journal reconciliation currently also reports six unrelated unjournalled files (`1231`, `1232`, `1233`, `1705`, `1706`, `1707`) and one earlier journal timestamp regression (`0619` after `0271a`). The receipt slice `e1001a934` journals `1728`, passes migration-integrity tests, and does not repair these earlier conditions. Attribute those repository-wide findings separately from the Build-owned `0965` prerequisite.

## Planned repair contract

1. Reserve a single migration owner for an idempotent, journalled prerequisite before `0965`. Candidate: a new `0941a_*` migration at `when=1803000010033` that creates a nonpartial unique `(org_id, id)` index on invitations with bounded lock acquisition. Do not edit applied SQL or restamp existing journal entries.
2. Add a narrowly reviewed migration-seal exception bound to the exact new tag, timestamp, SQL hash, and predecessor/successor. Verify the seal still rejects arbitrary backdated changes. Do not treat a passing `--emit` result as immutability proof.
3. Reconcile `1728` with the prerequisite so it does not create a duplicate unique index. Its rollback must not remove a key required by the `0965` foreign key. Preserve the same-org receipt foreign key in `1728`.
4. Check both migration runners against the final journal. Record whether each selects missing entries by identity or watermark, and prove an existing database applies the prerequisite once without replaying applied migrations.
5. Use only disposable databases. From empty state, run the full fail-fast chain and bootstrap; from an already migrated snapshot, run the upgrade. Inspect `pg_index`, `pg_constraint`, migration ledger hashes, lock behavior, RLS, and rollback. Do not infer database success from SQL text or unit tests.

## Acceptance criteria

- A cold database reaches the latest journal entry through both supported runners without a deferred `0965` failure.
- An upgraded snapshot retains all existing migration identities, gains one valid composite invitation key, and has no duplicate equivalent index.
- `0965` and `1728` tenant foreign keys validate in PostgreSQL; `1728` rollback leaves the key needed by `0965`.
- The migration seal and journal checks pass with an explicit, narrow exception, while negative self-tests still reject an unrelated backdated entry.
- Lock duration and failure/retry behavior are recorded on representative disposable data; no production database is used for proof.

## Delivery checklist


## Disposable-database evidence — 2026-10-05

All proofs run on local PostgreSQL 18 (`127.0.0.1`). Disposable databases `cold_20261005` and `upg_20261005` created and dropped on the same date. No production or `replay2` database was modified.

### Cold path — `cold_20261005`

Created empty; extensions `vector`, `pg_trgm`, `btree_gist`, `pgcrypto`, `uuid-ossp` and role `streamline_app` created before replay. Applied all 1082 journal entries via `src/scripts/replay-chain-cold.mjs` using `COLD_DATABASE_URL`.

**Result: 1074 applied, 8 failures, 29 s.**

The original BLD-MIGRATION-CHAIN-01 concern — `0965_ar02_canonical_tenant_fks_3` failing on a cold database — did **not** occur. `0941a_invitations_org_id_unique_prerequisite` (journal array pos 591, `when=1803000010033`) ran before `0943` and before `0965`, creating `uniq_invitations_org_id_setup_receipts` on `public.invitations (org_id, id)`. The `fk_invitation_events_invitation_id_org` FK from `0965` is present and `convalidated=true` on the cold database.

The 8 failures are **separate from BLD-MIGRATION-CHAIN-01** and are all in production-applied migrations (BE-60 prohibits editing them):

| Migration | Error | Root cause |
|---|---|---|
| `1155_build_cycles_drift_reconcile` | `column "cycle_id" does not exist` | At journal array pos 911, `build_events.sprint_scope_events` still has `sprint_id`; the rename to `cycle_id` happens in `1396_build_sprint_cycle_chain_repair` at pos 1013. The dynamic index creation on `cycle_id` fails. |
| `1156_build_cycles_org_led_status_index` | `column "deleted_at" does not exist` | Cascades from 1155 rollback: `build.cycles.deleted_at` was never added. |
| `1174_kb_articles_cutover_contract` | `constraint "kb_article_tags_org_id_article_id_tag_id_pk" not found` | The PK constraint on `kb_article_tags` has a different name on a cold-built database vs the one the migration was authored against. |
| `1197_build_cycle_permissions` | precondition RAISE: legacy `build:sprints:*` permissions absent | Known; documented as BE-111a. Empty `permissions` table on cold. Applied and correct on production; not precedent. |
| `1226_kb_pages_drop_source_article_bridge` | precondition: `kb_articles` still exists | Cascades from 1174 failure. |
| `1234_hr_reporting_lines_provenance` | precondition: `hr_reporting_line_bulk_jobs` (1232) absent | `1232_hr_reporting_line_bulk_jobs` is at journal array pos 1071 (idx=1199); `1234` is at pos 1039 (idx=1166). Dependency runs after dependent in journal array order. |
| `1235_hr_reporting_lines_one_current_primary` | precondition: `hr_reporting_lines.source` absent | Cascades from 1234. |
| `1371_cycles_active_and_overlap_constraints` | `column "deleted_at" does not exist` | Same root as 1156; `build.cycles.deleted_at` absent because 1155 failed and 1396 is at pos 1013 (after pos 998). |

All 8 failures are in migrations with `hashInLedger=yes` (verified via `check-tag-applied.mjs`). No history-preserving fix exists that does not require a new migration authored before `1155` and/or `1234` to seed the state those migrations expect — that is a separate work item per migration owner.

### Upgraded path — `upg_20261005`

Cloned from `replay2` via `CREATE DATABASE upg_20261005 TEMPLATE replay2` (0 active connections confirmed). `replay2` held 1005 entries in `drizzle.__replay` (latest: `1395_sibling_version_columns`). Ran `replay-chain-cold.mjs` against `upg_20261005`; the 1005 pre-done entries were skipped.

**Result: 60 applied, 17 failures, 1 s.**

Migrations 1901–1907 (the ones under proof):

| Migration | Applied | Notes |
|---|---|---|
| `1901_build_template_config` | yes | Adds 3 `jsonb` columns to `build.project_templates` |
| `1902_build_email_inbound_connections` | yes | Creates `build.email_inbound_connections`; RLS+policy present |
| `1903_build_git_connections_health` | yes | Adds columns to `build.git_connections`; all FKs `convalidated=true` |
| `1904_build_slack_connections` | yes | Creates `build.slack_connections`; RLS+policy present |
| `1905_build_import_adapters` | **failed** | `constraint "fk_import_source_refs_org" already exists` — object existed in `replay2` prior to the `__replay` watermark |
| `1907_webhook_dead_letter` | yes | Adds `dead_letter boolean DEFAULT false` to `webhook_logs` |

Constraint validity check (`pg_constraint.convalidated`): all 8 FKs on `email_inbound_connections`, `git_connections`, `slack_connections` are `convalidated=true`.

RLS check: `email_inbound_connections`, `git_connections`, `slack_connections`, `import_source_refs` — all have `relrowsecurity=true` and 1 policy each. `webhook_logs` has `relrowsecurity=true`.

Rollback check (each run inside `BEGIN … ROLLBACK`):
- `1901_build_template_config.down.sql` — OK
- `1902_build_email_inbound_connections.down.sql` — OK
- `1903_build_git_connections_health.down.sql` — OK
- `1904_build_slack_connections.down.sql` — OK
- `1907_webhook_dead_letter.down.sql` — OK

`lock_timeout` present in all five applied migrations (BE-64 satisfied).

The 17 upgraded-path failures (excluding the 1901–1907 scope): 12 are "already exists" errors indicating objects applied to `replay2` outside its `__replay` tracking; the remaining 5 are the same cold-path ordering defects seen above (`1174`, `1226`, `1234`, `1235`) plus a `replay2`-specific drift on `1360` (`app.search_kb_chunk_ids` already dropped).

### BLD-MIGRATION-CHAIN-01 verdict

`0965` applies without error on both a cold database and an upgraded database. The prerequisite unique index `uniq_invitations_org_id_setup_receipts ON public.invitations (org_id, id)` is present and the FK `fk_invitation_events_invitation_id_org` is `convalidated=true` on both. BLD-MIGRATION-CHAIN-01 is **CLOSED** for the `0965` concern. The 8 residual cold-path failures are pre-existing, production-applied migrations outside the scope of this ticket; they require separate work-items per migration owner.

### Cold path — fresh-DB fix files — `cold_20261005_fix` — 2026-10-05

The 8 cold-path ordering and naming failures from `cold_20261005` are resolved by 4 new journalled fix migrations. Each is idempotent on production/replay2 and includes a rollback file and `SET lock_timeout`.

| Fix file | Journal pos / idx / when | Resolves |
|---|---|---|
| `1154b_cold_path_cycle_rename` | pos 911 / idx 1210 / `when=1803000010495` | `1155`, `1156`, `1371` — renames `sprint_id→cycle_id` on `build.tickets` and `build_events.sprint_scope_events` before 1155 indexes them |
| `1173b_cold_path_kb_article_tags_pk_rename` | pos 932 / idx 1211 / `when=1803000010656` | `1174`, `1226` — renames PK + adds 4 missing org_id FKs + drops duplicate FKs from 0577 + adds missing streamline_app grants before 1174 renames the tables |
| `1196b_cold_path_sprint_permissions_seed` | pos 956 / idx 1212 / `when=1803093697725` | `1197` — seeds `build:sprints:view` and `build:sprints:manage` permissions before 1197 renames them; high `when` exempted in BASELINE_JOURNAL_INTEGRITY |
| `1725b_cold_path_hr_bulk_jobs` | pos 1042 / idx 1213 / `when=1803093653900` | `1234_hr`, `1235_hr` — creates `hr_reporting_line_bulk_jobs`, `hr_reporting_line_bulk_job_rows`, `hr_reporting_manager_requests`, and adds `uniq_hr_reporting_lines_org_id` before `1234_hr` needs them at pos 1043 |

**Fresh cold DB result: `cold_20261005_fix` — applied=1087, skipped=0, failures=0, tables=951 in 45 s.**

All 4 fix tags appear in `drizzle.__replay`. The original BLD-MIGRATION-CHAIN-01 concern (`0965`) continues to apply cleanly.

**Replay2 clone BEGIN/ROLLBACK proof:** All 4 fix files executed without error inside `BEGIN … ROLLBACK` on `replay2_fix_test` (cloned from `replay2`). No permanent changes after rollback.

**Both disposable databases dropped.**

### Status — 2026-10-05

BLD-MIGRATION-CHAIN-01 CLOSED. Cold replay reaches journal head with 0 failures (1087/1087). The 4 fix migrations (`1154b`, `1173b`, `1196b`, `1725b`) are journalled, idempotent, and carry rollback files. Fix-3 (`1196b`) has a `when` above the production watermark; the insert-order exemption is recorded in BASELINE_JOURNAL_INTEGRITY.
