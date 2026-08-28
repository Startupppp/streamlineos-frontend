# 06: Expand the OrganizationActor compatibility seam

**What to build:** Domain code can reference an organization membership/person actor through one canonical seam while legacy user references remain readable during migration.

**Blocked by:** 05 — Enforce RBAC actor and module referential integrity.

**Status:** ready-for-agent

- [ ] One typed actor model resolves membership, person, user and organization consistently.
- [ ] Additive schema and APIs preserve old callers during migration.
- [ ] Missing, inactive and ambiguous memberships fail closed with auditable errors.
- [ ] Multi-organization tests prove the same global user resolves distinct organization actors.
