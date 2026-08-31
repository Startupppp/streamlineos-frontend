# 08 — A module transfer records its initiator and its expected current owner separately

**What to build:** An organization owner can hand a module from one person to another without owning it themselves. The transfer records who started it and who was expected to be holding the module, and acceptance validates against the second — so a transfer cannot complete against an owner who changed in the meantime.

**Blocked by:** [07 — Owner-only operations are enumerated, not implied](07-owner-only-operations-are-enumerated.md)

**Status:** done

**Grounding (2026-08-28, evidence not instruction — re-read at source):** PRD mistake #6 — an org owner could initiate a transfer whose acceptance then expected the *initiator* to be the module owner, so the flow was unusable in exactly the case it exists for. The module-standing work is already built (`modules/module-access/`, `common/rbac/grantability.ts`, `ownership/module-owner-role.helper.ts` transfers atomically); this is the two-field correction on top of it.

## Acceptance criteria

- [x] The transfer record stores initiator, expected current owner and intended new owner as three distinct fields.
  `ownership_transfers` gains `initiated_by_membership_id`; `from_membership_id` becomes precisely the *expected current owner* and `to_membership_id` the intended new owner. Applied and read back from `pg_catalog`:
```
ownership_transfers.initiated_by_membership_id   integer  nullable=NO
fk_ownership_transfers_initiator   ownership_transfers   ondelete=r
```
- [x] Acceptance validates the *expected current owner* still holds the module; if ownership moved since initiation, the transfer fails with a message naming that, rather than silently reassigning.
  `applyModuleTransfer` now guards on `!currentOwnership || currentOwnership.ownerMembershipId !== fromMembershipId` and fails with "Module ownership changed since this transfer was initiated; it can no longer be accepted". A second defect rode along and is fixed: `revokeModuleOwnerRole` was stripping the INITIATOR's module-owner role, and now strips the outgoing owner's.
- [x] An organization owner may initiate a transfer for a module they do not own, which is the case that does not work today.
  The ownership lookup in `initiateModuleTransfer` is now unconditional, so `fromMembershipId` is the module's real owner and `initiatedByMembershipId` is the actor. A second initiation path existed that the ticket did not name, `module-access-groups.service.ts:1002`, carrying the identical defect; it was corrected the same way.
- [x] A module owner may initiate a transfer of their own module — the common case keeps working.
  Covered by the new `module-transfer-parties.spec.ts` and by the pre-existing `module-access-new-capabilities.spec.ts` ownership test, which now asserts `fromMembershipId: 11, initiatedByMembershipId: 11`.
- [x] The transfer is atomic: the old owner's standing is removed and the new owner's granted in one operation, with no intermediate state where the module has two owners or none.
  All of it stays inside the existing `db.transaction`: the `moduleOwnerships` upsert, `revokeModuleOwnerRole`, `assertModuleOwnerRoleAssigned`, the conditional `status = 'PENDING'` update and `bumpPermissionsVersion`.
- [x] Expiry and cancellation are explicit states, and an expired transfer cannot be accepted.
  `acceptTransfer` marks an expired row `EXPIRED` and refuses. `cancelTransfer` now checks `initiatedByMembershipId` rather than `fromMembershipId`, so the initiator can withdraw what they started even when they were never the owner. Evidence: `node ./node_modules/jest/bin/jest.js src/modules/ownership` -> `Test Suites: 3 passed, 3 total, Tests: 44 passed, 44 total`, 15 of them the new `module-transfer-parties.spec.ts`.

## Todo

- [x] Read the existing acceptance path before adding fields — the bug may be one predicate reading the wrong column rather than a missing column.
  Read first, and the ticket's suspicion was half right: one predicate did read the wrong column, but the column it should have read did not exist, so the field was genuinely missing as well.
- [x] Cover the concurrent case: two transfers initiated for the same module, one accepted; the second must fail on its expected-owner check, not overwrite.
  Covered: two transfers for the same module, one accepted, the second failing its expected-owner check rather than overwriting. The conditional `status = 'PENDING'` update plus `ConflictException` is the guard.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)
  Status set; README row updated.

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)

## Post-close verification (2026-08-28) — one defect this ticket widened, left open

`fk_ownership_transfers_initiator` is `ON DELETE RESTRICT`, matching its two pre-existing siblings
`fk_ownership_transfers_from_member` and `fk_ownership_transfers_to_member`. Nothing anywhere deletes an
`ownership_transfers` row — `grep -rn "delete(ownershipTransfers)" src/` returns nothing — and both
`removeMember` and `leaveOrganization` only set `status = 'CANCELLED'` on PENDING rows before
hard-deleting the `organization_members` row.

So a membership that ever took part in a transfer can never be hard-deleted. Proved against the dev
database in a rolled-back transaction, using a membership that was **only** an initiator, never
`from`/`to`:

```
inserted a CANCELLED transfer initiated by that membership
RESULT: deleting the initiator FAILED  code=23001  constraint=fk_ownership_transfers_initiator
        update or delete on table "organization_members" violates RESTRICT setting of
        foreign key constraint "fk_ownership_transfers_initiator" on table "ownership_transfers"
```

The pre-existing half needs none of this ticket's work: a member who **declines** a transfer keeps a
`to_membership_id` reference forever and is then unremovable. What this ticket widened is the third-party
case — criterion 3 exists precisely so an org owner can initiate a transfer for a module they do not own,
which pins a membership that `from`/`to` would not have pinned.

**Fixed 2026-08-28.** `removeMember` and `leaveOrganization` now **delete** the departing membership's
`ownership_transfers` rows instead of only marking the PENDING ones `CANCELLED`, immediately before the
`organization_members` delete in the same transaction. No migration and no schema change: the three FKs
stay `RESTRICT`, so an unintended delete anywhere else still fails loudly rather than silently discarding
a transfer.

Why deleting is the right call rather than `CASCADE` or a nullable initiator: every transfer touching the
member is already terminal by that point (the pre-existing cancel ran first), the membership row itself
is being hard-deleted, and the transfer is independently recorded in `audit_logs` — `this.audit.log` fires
at `ownership-transfers.service.ts:103` and `:228`. So the audit trail survives; only the operational row
pointing at a membership that no longer exists is removed. `revokeOrgScopedAccess` is deliberately
untouched: it revokes access without deleting the membership, so the FK never bites there.

Proved against the dev database, both arms in rolled-back transactions:

```
initiator-only membership under test: 10

without the new cleanup (the old behaviour):
  old: member delete FAILED  code=23001  fk_ownership_transfers_initiator

with the new cleanup (what removeMember/leaveOrganization now do):
  new: cleanup removed 1 transfer row(s)
  new: member delete SUCCEEDED (rolled back)

rows still present after both rolled-back probes: 4 (unchanged = rollback held)
```

Regression-covered by `organization-member-status.spec.ts` → *"clears the member's ownership transfers
before deleting the membership row"*, which asserts the **order** of the two `tx.delete` calls, not merely
that both happened — ordering is the whole point, and it guards against a vacuous pass by first asserting
both indices are non-negative. `node ./node_modules/jest/bin/jest.js src/modules/organization/core/organization-member-status.spec.ts`
→ `Tests: 18 passed, 18 total`.

This also closes the pre-existing half: a member who declined a transfer, and so kept a
`to_membership_id` reference forever, was equally unremovable before this change.
