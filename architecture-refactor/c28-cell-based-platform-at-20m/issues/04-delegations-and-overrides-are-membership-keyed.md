# 04 — Delegations and module overrides are keyed to the membership

**What to build:** An authorization edge points at the membership that holds it, not at the global account behind that membership. Removing someone from an organization removes their delegations and module overrides with them, and re-inviting the same person grants nothing they held before.

**Blocked by:** [01 — The request knows which membership it is](01-the-request-knows-its-membership.md)

**Status:** in-progress - contract step written, not applied

**Grounding (2026-08-28, evidence not instruction — re-read at source):** `user_delegations.delegatorId` and `.delegateeId` both `references(() => users.id, { onDelete: "cascade" })` (`db/schema/common/auth.ts:462-463`). The cascade fires on *account* deletion, which almost never happens; leaving an organization does not touch these rows. `user_delegation_permissions` is already correctly org-composite (`fk_user_delegation_permissions_org_delegation` on `(orgId, delegationId)`, `auth.ts:489-493`) — the child is right and the parent is not. The composite target `(orgId, id)` on `organization_members` already exists (`auth.ts:102`).

## Acceptance criteria

- [x] `user_delegations` references the delegator and delegatee membership through a composite `(org_id, membership_id)` foreign key, so a row cannot name a membership in another organization.
  `pg_catalog` diff after applying 0610-0612 and 0614:
```
agent_tokens.issuer_membership_id                integer      nullable=NO
agent_tokens.scopes                              ARRAY        nullable=NO
ownership_transfers.initiated_by_membership_id   integer      nullable=NO
user_delegations.delegatee_membership_id         integer      nullable=NO
user_delegations.delegator_membership_id         integer      nullable=NO
user_module_access.organization_membership_id    integer      nullable=NO
fk_agent_tokens_issuer_membership          agent_tokens         ondelete=c
fk_ownership_transfers_initiator           ownership_transfers  ondelete=r
fk_user_delegations_delegatee_membership   user_delegations     ondelete=c
fk_user_delegations_delegator_membership   user_delegations     ondelete=c
fk_user_module_access_membership           user_module_access   ondelete=c
```
- [x] Module overrides carry the same composite integrity; enumerate them from the schema rather than from memory, because the ones nobody lists are the ones that rot.
  Enumerated from the schema, not memory: `user_module_access` is the module override table and is now `(org_id, organization_membership_id)` with a cascading composite FK. The same schema-derived scan that backs ticket 06 (`membership-artifacts.spec.ts`) is what proves no other override table was missed.
- [x] A backfill maps every existing row from `(org_id, user_id)` to its membership, and reports rows it cannot map instead of dropping them.
  `0611_delegations_and_overrides_expand_membership.sql` backfills and RAISEs a WARNING naming the count of unmappable rows; `0612` re-checks and RAISEs an EXCEPTION that refuses to enforce the key while any remain. Nothing is deleted. Applied output: `OK: migrations/0611...` / `OK: migrations/0612...`
- [x] Deleting a membership deletes its delegations and overrides in the same transaction — enforced by the foreign key, not by a service remembering to.
  Both new foreign keys are `ON DELETE CASCADE`, confirmed by the `pg_catalog` read above (`ondelete=c`). No service code performs the delete.
- [ ] Re-inviting a removed person produces a membership with no inherited edges, proved by a test that removes and re-invites.
  **Left open.** The database half is done — a re-invite creates a new `organization_members.id`, so every membership-keyed edge is structurally unreachable. What is NOT proved is the polymorphic half: `resource_grants` and `kb_space_grants` key on `principal_type='user'` + `principal_id=<user id>`, which is stable across a re-invite, so those rows WOULD be inherited unless the revocation path deletes them. That deletion is specified in ticket 06's inventory (`onRemoval: "delete"`). The remove-and-re-invite test belongs with that path and is listed as open there rather than duplicated here.
- [ ] The old `user_id` columns are dropped only after the readers are migrated, and the drop is evidenced by a `pg_catalog` diff rather than by the migration reporting success.
  **Written but deliberately not applied.** Every reader IS migrated (`access-permission.resolver.ts`, `delegations.service.ts`, `timesheets/core/approvals.service.ts`, `access.service.ts`, `access-permission-members.resolver.ts`, `module-access-groups.service.ts`) and the backend typechecks with zero references to `delegatorId` / `delegateeId` / `userModuleAccess.userId`. `0613_delegations_and_overrides_drop_user_columns.sql` is written and journalled, but was NOT applied to the shared development database: five other c28 sessions are working in this tree with uncommitted migrations 0608 and 0609 pending, and dropping a column is the one step in this sequence with no rollback. The `pg_catalog` read below is the current state and shows the legacy columns still present:
```
user_delegations.delegatee_id   text  nullable=NO
user_delegations.delegator_id   text  nullable=NO
user_module_access.user_id      text  nullable=NO
```
  What closes it: run `node scripts/apply-migration-file.mjs migrations/0613_delegations_and_overrides_drop_user_columns.sql` once the concurrent sessions have landed, then re-read `information_schema.columns` and confirm the three rows above are gone.

## Todo

- [ ] Expand first: add the membership columns nullable, backfill, then make them `NOT NULL` — one migration that does all three takes a long `ACCESS EXCLUSIVE` lock.
- [ ] Set `lock_timeout` at the top of each migration so it fails fast rather than queueing behind a reader.
- [ ] Journal every migration file. A `.sql` absent from `meta/_journal.json` never applies and `db:migrate` reports success anyway.
- [ ] `VACUUM ANALYZE` after any rewrite — the stats and the visibility map do not survive one.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
