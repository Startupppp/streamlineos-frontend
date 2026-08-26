# 21 — Every new surface is reachable

**Status:** done — checked against the database, not the catalogue (`crm-permissions-reach-somebody.db.spec.ts`), plus `gated-keys-are-catalogued.spec.ts` for the reverse direction.
**Track:** F — access
**Blocked by:** every ticket that adds a surface

## Why

This is the bug Phase 1 shipped twice.

Role templates grant on **role creation only**, so a permission key added
without a backfill is inert for every organisation that already exists — and
nothing fails, because `ON CONFLICT DO NOTHING` over an empty result set is a
clean migration. Seven CRM backfills targeted `CRM_ADMIN`, a `ROLE_TEMPLATES`
slug the seeder never mints; eighteen permissions reached nobody. The repair
migration then missed two of them and asserted its own completeness in a comment,
so the unified timeline returned 403 for every user in every existing tenant
while the suite stayed green.

## Acceptance criteria

- [ ] Every new surface in this phase carries a permission key in **both**
      catalogues — a frontend-only key fails `useCan` forever, a backend-only key
      cannot be gated.
- [ ] Every new key ships a backfill migration targeting
      `${MODULE}_MODULE_OWNER|ADMIN|MEMBER` — never a `ROLE_TEMPLATES` slug.
- [ ] Member grants match `buildModuleMemberPermissionKeys` exactly, so a
      backfilled organisation and a freshly seeded one resolve to the same
      capability. Behaviour must not depend on when a tenant signed up.
- [ ] `backfill-slugs-exist.spec.ts` passes, including its coverage case: every
      key an inert backfill named must appear in a repair.
- [ ] Verified against the database, not inferred: for each new key, assert a
      non-zero grant count per organisation.
- [ ] Every list endpoint narrows by `DataScope`; cross-tenant misses return
      404, never 403.
