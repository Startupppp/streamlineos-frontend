# 29 — Audit every call path for the three tenant tables running without RLS

**What to build:** A written verdict, per table, on whether every read and write runs inside a tenant transaction. Three Build tables — project updates, project attachments and managed product memberships — have row-level security disabled with no policy, while 87 of the module's 90 tables have it on. Each carries a non-nullable organisation column and none is on the platform-global exemption list, so any query omitting an explicit organisation predicate reads across tenants and returns 200. It fails open silently: no permission error is raised, no gate detects it, and CI is dead.

The audit gates the fix for a concrete reason. Enabling row-level security blind converts a latent cross-tenant read into a live 500 on any path lacking the tenant context — background sweeps and after-commit hooks are the ones that break, because they have no ambient tenant.

Current exposure is small (single-digit rows, one organisation) but that is a property of today's data, not a control.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Every read and write path for each of the three tables is enumerated
- [ ] Each path is classified as inside or outside a tenant transaction
- [ ] After-commit hooks and per-organisation background sweeps are covered explicitly
- [ ] Any path needing rework to survive the policy is listed with what it needs
- [ ] The audit is recorded in the cross-cutting gaps document under CCG-7
- [ ] No database connection is opened for this audit; it is a static reading of call paths
