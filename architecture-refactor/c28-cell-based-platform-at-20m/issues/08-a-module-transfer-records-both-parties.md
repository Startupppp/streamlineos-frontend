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

- [ ] Read the existing acceptance path before adding fields — the bug may be one predicate reading the wrong column rather than a missing column.
- [ ] Cover the concurrent case: two transfers initiated for the same module, one accepted; the second must fail on its expected-owner check, not overwrite.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
