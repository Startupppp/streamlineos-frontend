# 30 — Enable row-level security on the three remaining Build tenant tables

**What to build:** All 90 Build tenant tables enforce tenant isolation in the database. Project updates, project attachments and managed product memberships get row-level security enabled and a tenant isolation policy keyed on the organisation column, closing a hole that currently fails open with no error and no gate.

One migration per table, so a failure on one does not strand the others.

**Blocked by:** 29 — Audit every call path for the three tenant tables running without RLS.

**Status:** ready-for-agent

- [x] Each table has row-level security enabled and a tenant isolation policy
- [ ] Each migration is journalled with a rollback authored and a lock timeout set
  — Rollbacks authored and lock_timeout set in all three migration files. Journal entries require the orchestrator to add them to `migrations/meta/_journal.json`; this lane does not own that file (rule 3).
- [ ] Verified as the application role with the tenant context set, and again with it absent — the second case is the assertion that matters
  — Requires a live database. Cannot be run (rule 2). Probe SQL for each table is recorded in CCG-7 of `docs/build-module/99-cross-cutting-gaps.md`.
- [x] Every call path the audit flagged has been reworked before its table's policy lands
  — The audit found no path needing rework. Every path runs inside a tenant transaction via TenantContextInterceptor; no background sweep or after-commit hook touches any of the three tables.
- [x] Background sweeps and after-commit hooks touching these tables still work
  — No background sweep or after-commit hook touches any of the three tables. Verified by static grep across all cron services and build module files.
- [ ] The row-level-security verification script reports all 90 Build tables covered
  — Requires running `db:verify-rls`, which opens a database connection (rule 2). Named for the orchestrator to run after migrations are applied.
