# ADR 0002 — Legacy integer authorization identities are retained

**Status:** Accepted
**Date:** 2026-08-28
**Raised by:** final-refactor S1 (tickets 05, 06). PRD-IN-SCOPE §14: "Existing integer identities require an ADR if retained long term."

## Context

PRD §14 mandates UUIDs for new distributed entities and bans new `serial` primary keys, then requires an explicit ADR for any integer identity that is kept. Five authorization tables still carry one. Verified against the live development database on 2026-08-28:

| Table | PK type | `serial` | Rows | `max(id)` | Inbound FKs |
|---|---|---|---:|---:|---:|
| `organization_members` | `integer` | yes | 100,091 | 908,205 | **25** |
| `roles` | `integer` | yes | 359 | 1,104 | 6 |
| `permissions` | `integer` | yes | 720 | 1,610,627 | 4 |
| `role_permission_grants` | `integer` | yes | 11,952 | 19,276 | 0 |
| `user_module_access` | `integer` | yes | 0 | 0 | 0 |

The RBAC tables added since have already moved: `role_assignments`, `user_permission_grants`, `principal_groups`, `group_role_assignments`, `module_ownerships` and `ownership_transfers` all use `uuid` primary keys. The rule is being followed for new work; only these five predate it.

`organization_members.id` is the load-bearing one. It is the organization actor identity the whole authorization model keys on, and every tenant composite foreign key in RBAC begins with it:

- `role_assignments (org_id, organization_membership_id)`
- `role_assignments (org_id, assigned_by_membership_id)` — added by ticket 05
- `user_permission_grants (org_id, organization_membership_id)`
- `user_permission_grants (org_id, granted_by_membership_id)` — added by ticket 05
- `principal_group_members (org_id, organization_membership_id)`
- `user_module_access (org_id, organization_membership_id)`
- `module_ownerships (org_id, owner_membership_id)`
- `ownership_transfers (org_id, from_membership_id | to_membership_id | initiated_by_membership_id)`

plus 25 inbound foreign keys in total across the schema, and every stored grant, ownership record and pending transfer row already written against those values.

## Decision

The five integer identities above are **retained as they are**. No renumbering, no type change, no parallel UUID column.

New tables continue to use `uuid` or `generatedAlwaysAsIdentity()` per backend/CLAUDE.md §3. This ADR authorises the existing five and nothing else; it is not a licence to add a sixth.

The migration to organization-actor semantics (final-refactor tickets 06–11) changes *which column* a domain row points at — from a global `users.id` to `organization_members.id` — not the *type* of the membership identity. Those two changes are independent, and coupling them would make an already wide migration unshippable.

## Why not migrate

- **Blast radius.** Changing `organization_members.id` rewrites the table plus 25 dependent tables in one cutover. Every FK must be dropped and rebuilt; `ADD CONSTRAINT ... FOREIGN KEY` takes `ACCESS EXCLUSIVE` on both sides, so the whole authorization surface is unavailable for the duration.
- **Stale stats and visibility map.** A table rewrite of this size destroys planner statistics and the visibility map. Measured elsewhere in this codebase: one list went from 53 to 201,875 blocks after a rewrite, and only `VACUUM ANALYZE` restored it. Doing that to the membership table means every permission resolution in the product regresses until it completes.
- **No correctness benefit.** The integer is never exposed as a cross-system identifier, never appears in a URL the client constructs, and is never generated client-side. The properties UUIDs buy — collision-free distributed generation and non-enumerability across cells — are not properties this column needs. Membership ids are server-generated inside one tenant's transaction.
- **Headroom is real.** `int4` tops out at 2,147,483,647. At 908,205 allocated ids the table has used 0.04% of the range.

## Consequences

**Accepted risk:** membership ids are sequential and therefore enumerable. This is mitigated, not eliminated, by the fact that every read re-asserts `org_id` and cross-tenant misses return 404 rather than 403, so an enumerated id is not an existence oracle. It is *not* mitigated for a caller inside the correct tenant, who can already enumerate their own organization's memberships through the members API.

**Accepted risk:** a future cell split cannot merge two cells' `organization_members` rows without renumbering, because the ids are only unique per database, not globally. The tenant composite key `(org_id, id)` is what every FK uses, and `org_id` is globally unique, so relocation of a whole organization is unaffected. Merging two cells into one is the case that would break, and no approved plan does that.

**Not affected:** `permissions.id` is effectively decorative — every runtime path keys on `permissions.name`, which is `UNIQUE`, and `role_permission_grants.permission_key` / `user_permission_grants.permission_key` are foreign keys to `name`, not to `id`.

## What would reverse this decision

- A membership-id allocation rate that puts `int4` exhaustion inside the forecast horizon. Concretely: `max(id)` above 1,500,000,000, or a growth trend that reaches it within two years.
- An approved plan to merge two cells' authorization data into one database.
- Exposure of `organization_members.id` in a public, unauthenticated surface where enumeration reveals organization size to a party outside the tenant.
- A regulatory requirement for non-sequential internal identifiers.
