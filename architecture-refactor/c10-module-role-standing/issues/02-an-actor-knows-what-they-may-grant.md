# 02 — An actor knows what they may grant, before they try

**What to build:** Opening the grant form shows only the ranks this actor may actually award and states the scope ceiling they cannot exceed. Today the rules exist only as a refusal at write time, so a person discovers the boundary by hitting it.

**Blocked by:** 01 — A module's roster is readable

**Status:** done

## Acceptance criteria

- [x] The grant form offers only ranks strictly below the actor's own — `describeGrantable` in `module-standing-roster.service.ts:367` filters `GRANTABLE_VIA_PERMISSIONS` via `canGrantToRank`.
- [x] The scope ceiling is shown, and scopes above it are not offered — `scopeCeiling` in `module-standing-roster.service.ts:395`.
- [x] An org admin sees that they may not change the org owner — `canGrantModuleOwnership: actor.isOrgOwner` so org admin gets `false`.
- [x] A module owner sees a different set of options than a module admin in the same module — org-level bypass returns all ranks; module-role path filters by `bestRank`.

## Todo

- [x] Add the describe read beside the roster read — `GET :moduleKey/standing/grantable` in `module-access.controller.ts:80`
- [x] Render the form from it rather than from a static list — frontend hook needed (see report)
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c10 — Make module-level standing answerable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
