# 30 — Enable row-level security on the three remaining Build tenant tables

**What to build:** All 90 Build tenant tables enforce tenant isolation in the database. Project updates, project attachments and managed product memberships get row-level security enabled and a tenant isolation policy keyed on the organisation column, closing a hole that currently fails open with no error and no gate.

One migration per table, so a failure on one does not strand the others.

**Blocked by:** 29 — Audit every call path for the three tenant tables running without RLS.

**Status:** ready-for-agent

- [x] Each table has row-level security enabled and a tenant isolation policy
- [x] Each migration is journalled with a rollback authored and a lock timeout set
  - Earned 2026-09-27 by the orchestrator. 1390 journalled at idx 1132, 1391 at 1133, 1392 at 1134, with `when` strictly increasing and every idx unique. Each has a sibling rollback on disk and sets a 5s lock timeout. All three applied; each ledger row matched the file sha256 and the journal `when`.
  — Rollbacks authored and lock_timeout set in all three migration files. Journal entries require the orchestrator to add them to `migrations/meta/_journal.json`; this lane does not own that file (rule 3).
- [x] Verified as the application role with the tenant context set, and again with it absent — the second case is the assertion that matters
  - Earned 2026-09-27. Probed as `streamline_app` with `rolbypassrls = false` asserted first, so this is not an owner bypassing RLS.
  **GUC set to the owning org:** `project_updates` 2 rows visible, `project_attachments` 1, `managed_product_memberships` 0. The tables stay readable by their own tenant, which is the positive control the denial needs beside it.
  **GUC set to a different org:** `project_updates` returns 0 rows. Same table, same connection, different tenant, so the isolation is real and not an artefact of an empty table.
  **GUC absent:** all three raise **42501**. This is the case the ticket calls the one that matters, and it confirms the policy fails closed rather than reading org-wide.
  Before applying, each migration's catalog delta was diffed inside a rolled-back transaction: each added exactly one `tenant_isolation` policy qualified `org_id = app.current_org_id()` and flipped `relrowsecurity`, and nothing else.
  — Requires a live database. Cannot be run (rule 2). Probe SQL for each table is recorded in CCG-7 of `docs/build-module/99-cross-cutting-gaps.md`.
- [x] Every call path the audit flagged has been reworked before its table's policy lands
  — The audit found no path needing rework. Every path runs inside a tenant transaction via TenantContextInterceptor; no background sweep or after-commit hook touches any of the three tables.
- [x] Background sweeps and after-commit hooks touching these tables still work
  — No background sweep or after-commit hook touches any of the three tables. Verified by static grep across all cron services and build module files.
- [x] The row-level-security verification script reports all 90 Build tables covered
  - **Earned 2026-09-27 by the orchestrator. The script itself ran, and it reports every Build table covered.** The earlier note below said no non-production Postgres existed. That premise is refuted: a PostgreSQL 18 with both `neondb_owner` and `streamline_app` listens on `127.0.0.1:5432`, and its `replay2` database holds a full migration-chain replay — the same target ticket 66 used. `db-verify-rls` accepts it because `127.0.0.1` is loopback.

    Command, from `backend/`:
    ```
    DATABASE_URL="postgresql://neondb_owner:***@127.0.0.1:5432/replay2?sslmode=disable" \
      node src/scripts/db-verify-rls.mjs
    ```
    Result: **17 of 17 behavioural probes PASS**, including the three that carry this ticket's weight — `query with no tenant context is rejected`, `tenant A reads only its own rows`, and `own-tenant INSERT still succeeds` (the positive control that stops the denial from passing vacuously). Catalogue sweep: **coverage 979 of 989 tenant-scoped tables**, `IN-SCOPE COVERED: 979`, `IN-SCOPE MISSING: 2`, `PLATFORM-GLOBAL: 8`.
    **Neither miss is a Build table.** The two are `public.impersonation_sessions` and `public.magic_link_tokens`. Schema `build` holds 92 tables on this target — production's 90 plus the two replay-only legacy survivors `build.bugs` and `build.sprints` that ticket 66 deliberately left in place — and **every one of the 92 is RLS-enabled with at least one policy, so zero Build tables are missing**. Independently confirmed on the same target by catalogue query: the count of `build` relations lacking `relrowsecurity` or lacking a policy is 0.

    Two caveats stated rather than hidden:
    - The script prints `TARGET DRIFT — the migration ledger could not be read` and withholds its *global* verdict, because `drizzle.__drizzle_migrations` does not exist in `replay2`. That caveat is about whether the target is pinned to this commit; it does not weaken the Build coverage finding, which is a catalogue fact about the tables that do exist, and the behavioural probes passed regardless. A drift-free global verdict needs a cold bootstrap into a fresh database, and that is blocked by four peer-owned Knowledge Base migrations that the chain cannot replay (`1174`, `1205`, `1206`, `1226`; `1205` and `1206` use `CREATE INDEX CONCURRENTLY`, which cannot run inside the replay runner's per-migration transaction). None is a Build migration. Ticket 66 records the same blocker.
    - The 781 `FORCE ROW LEVEL SECURITY` advisories are the script's own benign class: FORCE binds only the table owner, `streamline_app` is a non-owner, and `neondb_owner` carries BYPASSRLS which overrides FORCE anyway.

    Production posture was checked separately and directly, read-only, and matches: schema `build` has 90 tables, all 90 carry `org_id`, all 90 have RLS enabled with at least one policy, 0 have `org_id` without a policy. The production migration ledger reports **1032 applied rows against 1011 journal entries and 0 pending**, so 1390/1391/1392 are live there.

    **Finding routed out of this ticket:** `public.impersonation_sessions` and `public.magic_link_tokens` both carry `org_id` with `relrowsecurity = false` and zero policies **on production**, verified by direct read-only catalogue query on 2026-09-27. That is BE-74's silent org-wide read on two authentication tables. It is outside the Build module and outside this ticket's scope, and it is the only reason this script cannot return a clean global verdict.
