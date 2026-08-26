# 05 — Module ownership transfers in one operation

**What to build:** An org owner hands a module to a new head in a single action. The new owner holds standing, the outgoing owner does not, and neither state can half-apply. Today this is a manual sweep and an ex-owner keeps standing until someone remembers.

**Blocked by:** 04 — Standing can be granted and revoked

**Status:** done

## Acceptance criteria

- [x] Transfer appoints the new owner and removes the outgoing one in one transaction — `directTransferOwnership` uses `runInTenantTransaction` at `module-standing-mutations.service.ts:274`.
- [x] A failure part-way leaves the previous owner in place — never both owners, never neither — the transaction's upsert + revoke are atomic; a failure rolls back to the pre-existing owner row.
- [x] An org owner can appoint an owner for a module that currently has none — `standing-mutations.spec.ts` "appoints a new owner for a module that currently has none" at line 358.
- [x] Every module and its current owner is listable, so an orphaned module is visible — `GET /ownership/modules` via `OwnershipService.listModuleOwnerships`.
- [x] Transfer is refused for a module that is not administrable — `moduleDefinition?.administrable` check at `module-standing-mutations.service.ts:238`.

## Todo

- [x] Reuse the organisation ownership-transfer pattern rather than writing a second — reuses `revokeModuleOwnerRole` + `assertModuleOwnerRoleAssigned` from `ownership/module-owner-role.helper.ts`
- [x] Ensure the transaction mock in the spec actually invokes its callback — `standing-mutations.spec.ts:339` "the transaction mock must invoke its callback — all assertions inside run"
- [x] Assert the no-owner and both-owners states are unreachable — `revokeModuleOwnerRole` before `assertModuleOwnerRoleAssigned` inside a single transaction prevents both states
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c10 — Make module-level standing answerable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
