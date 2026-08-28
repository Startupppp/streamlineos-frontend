# 05: Enforce RBAC actor and module referential integrity

**What to build:** Every grant, assignment, ownership and transfer record references a valid same-organization membership and cataloged module.

**Blocked by:** 03 — Enforce the organization and module authority matrix.

**Status:** ready-for-agent

- [ ] Assigning/granting actors use same-tenant membership foreign keys.
- [ ] Role, permission, ownership and transfer module keys are catalog constrained.
- [ ] Permission namespace and stored module cannot drift.
- [ ] Expand/backfill/constraint migrations and negative cross-tenant tests pass.
