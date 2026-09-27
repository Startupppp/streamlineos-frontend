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
- [ ] The row-level-security verification script reports all 90 Build tables covered
  - **The script cannot be run at all, but its question is answered.** `pnpm db:verify-rls` refuses by design: `db-verify-rls BLOCKED - DATABASE_URL names production host 'amazonaws.com'`, and it wants a loopback or a database named scratch/test. No non-production Postgres exists in this environment, so there is nowhere for it to run. Leaving this unchecked rather than claiming a script run that did not happen.
  The coverage it would report was measured directly against the catalog instead, read-only: **schema `build` has 90 tables, all 90 carry `org_id`, all 90 have row-level security enabled with at least one policy, and 0 have `org_id` without a policy.** Before today three did - `project_updates`, `project_attachments` and `managed_product_memberships` - which is what this ticket existed to fix. That is the same fact the script would print; it is simply not the script printing it.
  — Requires running `db:verify-rls`, which opens a database connection (rule 2). Named for the orchestrator to run after migrations are applied.
