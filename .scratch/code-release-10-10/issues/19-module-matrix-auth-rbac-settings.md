# 19 — Module release matrix for authentication/identity/organization, RBAC and Settings

**What to build:** The §10 inventory-and-verdict pass applied to the three access-governance modules, plus their specific §10.1, §10.2 and §10.4 criteria.

**Blocked by:** 14.

**Status:** ready-for-agent

- [ ] Each module's backend folders, controllers, implementations, DTO/Zod schemas, database schema files, migrations, workers, cache keys, event consumers, frontend routes, components, hooks, query keys, tests, fixtures and scripts are inventoried and classified KEEP/REFACTOR/REMOVE with the concrete failure named.
- [ ] Membership and session reads are bounded and indexed; session, effective-access and organization caches invalidate immediately on change.
- [ ] Role, grant and module-access CRUD has strict Zod contracts, stable OpenAPI, idempotent mutations and exhaustive owner/descendant protection.
- [ ] Effective-permission resolution is batched and cached; scope expansion is bounded; indexes cover subject, role, permission, module and tenant paths.
- [ ] Global settings hold organization configuration and access governance only. Module-owned surfaces — custom fields, automations, integrations, data hub — live in their own module's settings, and operational work is not in Settings at all.
- [ ] Workspace and onboarding gates, organization-switch state, query-key tenant isolation and auth error states are covered by allow/deny/cross-tenant tests.
- [ ] A permission-key addition to a role template is accompanied by a backfill migration, or it is inert for every organization that already exists.
