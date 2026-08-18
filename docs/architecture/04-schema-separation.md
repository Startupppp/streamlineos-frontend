# 4. Splitting one `public` schema into bounded schemas

**Today: 775 tables in `public`.** Modules are separated by prefix convention (`inv_`, `hr_`, `crm_`),
which is not a boundary: `GRANT`/RLS defaults apply to everything at once (9 tables shipped with RLS
never enabled), nothing stops one module querying another's tables, and dump/restore/retention are
all-or-nothing.

```
 app          helper FUNCTIONS only — current_org_id(), search_ticket_ids   (exists)
 core         organizations, users, organization_members, sessions, subscriptions
 access       roles, role_assignments, grants, groups, delegations
 build        projects, tickets, sprints, statuses, relations, workspaces, counters
 build_events ticket_activity_log, ticket_comments, sprint_scope_events   (PARTITIONED)
 time         timesheets, periods, approvals, rate cards
 product      managed_products, roadmap, feedback, releases, OKRs
 crm / hr / inventory / …   one schema per remaining module
```

**What it buys:** a `REVOKE`-able boundary per domain; "every tenant table has a policy" becomes a
per-schema invariant instead of a 775-row sweep; append-only partitioned tables get their own vacuum,
retention and backup profile; a `build` migration cannot lock an `hr` table.

**Migration is catalog-only.** `ALTER TABLE public.tickets SET SCHEMA build;` rewrites no data and
FKs/indexes/constraints follow automatically. Done per module behind `search_path` so unqualified
names keep resolving during the transition, with `pgSchema("build")` landing in Drizzle in the same
commit.

**Agreed scope: `build` + `build_events` first**, then reassess — five programs share this tree, and
proving the pattern (plus the drift check and the RLS-per-schema audit) on one domain is far lower
risk than moving everything at once.
