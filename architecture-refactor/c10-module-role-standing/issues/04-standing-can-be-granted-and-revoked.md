# 04 — Standing can be granted and revoked

**What to build:** A module owner grants module-admin standing to a person, and revokes it, from the roster screen. Someone leaving the function loses their access in one action rather than a sweep of individual grants.

**Blocked by:** 03 — The read and the write share one predicate

**Status:** done

## Acceptance criteria

- [x] Granting standing takes effect on the grantee's next request without a re-login — `bumpPermissionsVersion(tx, orgId)` + `cache.invalidate(userSession(userId))` in `module-standing-mutations.service.ts:137,145`.
- [x] Revoking removes every capability that standing conferred — `revokeStanding` deletes all module role assignments for the membership at `module-standing-mutations.service.ts:196`.
- [x] A grant that exceeds the actor's rank or scope is refused with a reason naming the ceiling — `canGrantToRank` check at `module-standing-mutations.service.ts:80` with ForbiddenException naming the rank.
- [x] Granting and revoking are audited with the actor, subject, module and rank — `this.audit.log({action: "module_access.standing_granted", ...metadata: {moduleKey, rank}})` at lines 147,218.

## Todo

- [x] Wire grant and revoke through the shared predicate — `canGrantToRank` imported from `grantability.ts`
- [x] Bump the permissions version so the cached snapshot is not stale — `bumpPermissionsVersion(tx, actor.orgId)` inside the transaction
- [x] Assert the audit rows — `standing-mutations.spec.ts` asserts `auditLog` called with correct action and metadata
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c10 — Make module-level standing answerable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
