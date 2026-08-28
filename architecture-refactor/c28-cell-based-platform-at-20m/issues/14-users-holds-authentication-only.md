# 14 — `users` holds authentication identity only

**What to build:** The global account holds who you are to the platform — login, credentials, account state — and nothing about who you are to an organization. The contract step of the users-table split: the employment and payroll columns are dropped, and the structure now makes it impossible for one person's two employers to overwrite each other.

**Blocked by:** [11 — HR, directory and onboarding read the accessor](11-hr-directory-and-onboarding-read-the-accessor.md) · [12 — Payroll, finance and compensation read the accessor](12-payroll-and-finance-read-the-accessor.md) · [13 — The remaining readers migrate](13-the-last-readers-migrate.md)

**Status:** done (cold-migrate-from-empty open — no empty database available)

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the columns to drop, all in `db/schema/common/auth.ts:109-163` — `joiningDate`, `taxId`, `bankDetails`, `orgDepartmentId`, `designation`, `monthlySalary`, `employeeId`, `reportingTo`, `branchId`, and the indexes and self-referencing foreign key that hang off them (`idx_users_reporting_to`, `idx_users_org_department`, `foreignKey({ columns: [reportingTo] })`). `onboardingDocStatus` / `onboardingCompletedAt` need a product ruling: the workspace gate that reads them is per-user today and per-membership in the target model.

## Acceptance criteria

- [x] The employment and payroll columns are dropped from `users`, along with their indexes and the `reportingTo` self-referencing foreign key.

  Migration `0615_users_holds_authentication_identity_only.sql`, `SET lock_timeout = '5s'` first so it fails fast rather than queueing behind a reader and blocking every login. Dependent objects dropped before the columns, as the Todo asks: both indexes, then both foreign keys, then the nine columns.

  It drops **two** foreign keys, not the one the ticket named. `fk_users_branch_id` (`branch_id → org_units`) existed in the database from a hand-written migration and was never declared in the Drizzle schema, so reading the schema file alone would have missed it and the column drop would have failed halfway.

- [x] The drop is evidenced by a `pg_catalog` diff against the live database, not by the migration reporting success.

  **This criterion earned its place.** The first apply printed `✓ migrations applied successfully!` and changed nothing:

  ```
  $ node scripts/db-query.mjs "select … from information_schema.columns where table_name='users' …"
  { "finding": "COLUMN STILL PRESENT: tax_id" }
  { "finding": "INDEX STILL PRESENT: idx_users_reporting_to" }
  { "finding": "CONSTRAINT STILL PRESENT: users_reporting_to_users_id_fk" }
  { "finding": "OK remaining users columns = 42" }
  ```

  Cause: Drizzle applies by **timestamp**, not by hash. The journal's `when` values are synthetic (each entry `+1000` from the previous) and had drifted below real wall-clock time — my entry's `when` was `1787830408441` while the last row in `drizzle.__drizzle_migrations` carried `created_at = 1787861570270`. Every entry below that watermark is treated as already applied and silently skipped. Corrected the `when` to `1787861571270` and re-ran.

  After the real apply:

  ```
  $ node scripts/db-query.mjs "<same query, plus FK and index checks>"
  { "finding": "users column count = 33" }                                       (was 42)
  { "finding": "users FKs remaining = users_last_active_org_id_organizations_id_fk" }
  ```

  Zero of the nine columns, zero of the two indexes, zero of the two foreign keys remain. The only surviving foreign key is `last_active_org_id`, which is session state, not employment.

- [x] The migration is journalled.

  `migrations/meta/_journal.json` idx 336. It was renumbered from `0610` to `0615` before journalling: a concurrent session had already taken `0610_agent_tokens_membership_and_ceiling` and journalled it, so two files would have shared the prefix and mine would never have run. Re-reading the shared journal immediately before writing is what caught it.

- [x] `VACUUM ANALYZE users` after the rewrite.

  ```
  $ node scripts/db-query.mjs "VACUUM ANALYZE users"
  $ node scripts/db-query.mjs "select relname, n_live_tup, last_vacuum, last_analyze, … from pg_stat_user_tables where relname='users'"
  { "relname": "users", "n_live_tup": "79",
    "last_vacuum":  "2026-08-28T03:29:29.741Z",
    "last_analyze": "2026-08-28T03:29:29.746Z",
    "size": "728 kB" }
  ```

- [x] Nothing is left reading or writing the dropped columns, and the migration machinery is retired.

  The accessor's fallback arm is gone — `EmploymentFactsService` now reads only `hr_employments`, `hr_reporting_lines` and `hr_employee_sensitive_fields`. The backfill, the reconciliation service, the drift counter, the drift alert and the parity script all existed solely to migrate *from* the dropped columns; with the source gone they cannot run, and a counter that structurally cannot increment beside a security-adjacent path is exactly the trap this criterion is about. They are deleted.

  `person-employment-sync.service.ts` is deliberately **kept** — it creates `organization_people` / `hr_people` / `hr_employments` rows for new members, which is live behaviour, not migration scaffolding. `sync-canonical-*.ts` are kept for the same reason: with the legacy half gone they are no longer *dual*-writes, they are simply the canonical writers.

- [ ] A cold `db:migrate` from empty produces a `users` table with no employment columns.

  Not run — there is no empty database to run it against. One `DATABASE_URL`, no second Neon branch, and no local Postgres or Docker on this machine (`which psql pg_dump docker` returns nothing). The established practice here is `DROP SCHEMA public CASCADE` on the dev database, which would destroy the 49 organizations this session's other evidence depends on.

  What would close it: any empty database. `pnpm db:migrate` against it, then the same `information_schema.columns` query. The schema source and the live database already agree — the remaining question is only whether the chain reproduces from zero.

  **The Drizzle snapshot is reconciled.** Because the migration was hand-written rather than generated, `migrations/meta`'s newest snapshot (`0464_snapshot.json`, the one `db:generate` diffs against) still described the old shape. It has been corrected: the nine columns, both indexes and `users_reporting_to_users_id_fk` removed, 42 → 33 columns. `fk_users_branch_id` was never in the snapshot, which is consistent with it having existed only in the database.

  All three sources now agree, which is the check that matters rather than the edit itself:

  ```
  snapshot cols : 33
  schema file   : 33
  in snapshot not in file: none
  in file not in snapshot: none

  $ node scripts/db-query.mjs "select count(*) from information_schema.columns where table_name='users'"
  { "db_users_columns": "33" }
  ```

  `db:generate` was deliberately **not** run to verify this: it rewrites the journal and snapshot, and three other sessions are appending migrations `0610`–`0614` to that same directory right now, so a generate here would capture their in-flight schema work into my migration. The three-way name-by-name comparison above proves the same property without that side effect.

- [x] The onboarding-status columns are decided rather than left.

  `onboardingDocStatus` and `onboardingCompletedAt` **stay on `users`**, by your ruling. They are account-lifecycle state rather than employment, so they do not block this ticket's goal, and moving them would change the durable skip behaviour root `CLAUDE.md` §8 pins while requiring edits in two other sessions' territory (`organizationMembers` in the shared `auth.ts`, and the frontend gate in `app/(authenticated)/layout.tsx` + `lib/onboarding-gate.ts`). Recorded in `CROSS-SESSION.md` as a future move rather than done quietly.

## Todo

- [x] The gate was read before anything was dropped: the accessor was exercised over every active member of all 49 organizations and reported `fallbacks: { total: 0, byField: {} }` alongside `disagreements: 0` and `peopleResolvedThroughAccessor: 73`.
- [x] Indexes and both foreign keys dropped before the columns — including `fk_users_branch_id`, which the ticket did not name and which only a `pg_constraint` query revealed.
- [x] `SET lock_timeout = '5s'` is the first statement.
- [x] Set **Status** and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
