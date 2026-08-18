# 1. Tenancy — how organizations attach to everything

Every business row carries `org_id`. Three independent layers enforce it, so no single mistake leaks:

```
1. TOKEN      JwtAuthGuard sets req.user.orgId from the JWT. The client NEVER supplies org_id.
2. PREDICATE  every query adds WHERE org_id = :orgId, plus the RBAC DataScope (all|team|own|none)
3. RLS        POLICY tenant_isolation USING (org_id = app.current_org_id())
              app connects as streamline_app (no BYPASSRLS); GUC set per transaction
```

Layer 3 is the backstop: forget the `WHERE` and Postgres still returns nothing. Missing GUC raises
`42501` — it fails closed, never open.

```
                         organizations
                          id (text PK)
                               │
        ┌──────────────────────┼──────────────────────┬─────────────────┐
  organization_members    projects              pm_workspaces      subscriptions
   user_id, role,          org_id                 org_id            org_id, plan
   is_owner                                                        (entitlement)
        │
      users  ← GLOBAL, identity only, no org_id: one human, many orgs
```

`users` is deliberately global, so everything about a person's membership lives in org-scoped tables.
It still holds auth secrets, which is why it is never joined without an explicit column projection.

## Composite tenant foreign keys

A plain `FOREIGN KEY (project_id) REFERENCES projects(id)` would let org A's ticket point at org B's
project. Every parent exposes a tenant key and children reference both columns:

```
projects   UNIQUE (org_id, id)
    ▲
    │  FOREIGN KEY (org_id, project_id) REFERENCES projects(org_id, id)
tickets    org_id, project_id
```

Cross-tenant references become impossible at the storage layer rather than by convention. 654 exist.
