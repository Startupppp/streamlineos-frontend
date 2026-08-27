# 04 — Delegations and module overrides are keyed to the membership

**What to build:** An authorization edge points at the membership that holds it, not at the global account behind that membership. Removing someone from an organization removes their delegations and module overrides with them, and re-inviting the same person grants nothing they held before.

**Blocked by:** [01 — The request knows which membership it is](01-the-request-knows-its-membership.md)

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** `user_delegations.delegatorId` and `.delegateeId` both `references(() => users.id, { onDelete: "cascade" })` (`db/schema/common/auth.ts:462-463`). The cascade fires on *account* deletion, which almost never happens; leaving an organization does not touch these rows. `user_delegation_permissions` is already correctly org-composite (`fk_user_delegation_permissions_org_delegation` on `(orgId, delegationId)`, `auth.ts:489-493`) — the child is right and the parent is not. The composite target `(orgId, id)` on `organization_members` already exists (`auth.ts:102`).

## Acceptance criteria

- [ ] `user_delegations` references the delegator and delegatee membership through a composite `(org_id, membership_id)` foreign key, so a row cannot name a membership in another organization.
- [ ] Module overrides carry the same composite integrity; enumerate them from the schema rather than from memory, because the ones nobody lists are the ones that rot.
- [ ] A backfill maps every existing row from `(org_id, user_id)` to its membership, and reports rows it cannot map instead of dropping them.
- [ ] Deleting a membership deletes its delegations and overrides in the same transaction — enforced by the foreign key, not by a service remembering to.
- [ ] Re-inviting a removed person produces a membership with no inherited edges, proved by a test that removes and re-invites.
- [ ] The old `user_id` columns are dropped only after the readers are migrated, and the drop is evidenced by a `pg_catalog` diff rather than by the migration reporting success.

## Todo

- [ ] Expand first: add the membership columns nullable, backfill, then make them `NOT NULL` — one migration that does all three takes a long `ACCESS EXCLUSIVE` lock.
- [ ] Set `lock_timeout` at the top of each migration so it fails fast rather than queueing behind a reader.
- [ ] Journal every migration file. A `.sql` absent from `meta/_journal.json` never applies and `db:migrate` reports success anyway.
- [ ] `VACUUM ANALYZE` after any rewrite — the stats and the visibility map do not survive one.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
