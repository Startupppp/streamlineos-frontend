# 30 — Enable row-level security on the three remaining Build tenant tables

**What to build:** All 90 Build tenant tables enforce tenant isolation in the database. Project updates, project attachments and managed product memberships get row-level security enabled and a tenant isolation policy keyed on the organisation column, closing a hole that currently fails open with no error and no gate.

One migration per table, so a failure on one does not strand the others.

**Blocked by:** 29 — Audit every call path for the three tenant tables running without RLS.

**Status:** ready-for-agent

- [ ] Each table has row-level security enabled and a tenant isolation policy
- [ ] Each migration is journalled with a rollback authored and a lock timeout set
- [ ] Verified as the application role with the tenant context set, and again with it absent — the second case is the assertion that matters
- [ ] Every call path the audit flagged has been reworked before its table's policy lands
- [ ] Background sweeps and after-commit hooks touching these tables still work
- [ ] The row-level-security verification script reports all 90 Build tables covered
