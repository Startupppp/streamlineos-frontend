# 01 — A module's roster is readable

**What to build:** A module owner opens their module's settings and sees everyone with standing in it: who they are, what rank they hold, and what data scope they have. People who hold standing because they are an org owner or org admin appear too, marked as holding it that way, so the owner does not try to revoke something their module does not grant.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] A module owner, module admin, org admin and org owner can each list a module's standing; a member with no standing in it is refused.
- [x] Each entry reports rank, data scope, and whether the standing comes from a module role, org-level standing, or a direct grant.
- [x] A module that is not administrable reports that it carries no standing, rather than returning an empty list.
- [x] Standing in one organisation is invisible from another; a person in both sees only the current one's.
- [x] Authorization is the module's own — holding a global settings key does not make every module's roster readable.
- [x] The permission key exists verbatim in both the backend and frontend catalogs — backend: `MODULE_ACCESS_PERMISSIONS` generates `${moduleKey}:access:view` and `${moduleKey}:access:manage`; frontend barrel line needed (see report).

## Todo

- [x] Read how standing is currently derived in all three places and pick the stored one as canonical — `module-standing.ts:resolveModuleManagementStanding`
- [x] Add the read behind one interface, deriving rank from the role's module key — `module-standing-roster.service.ts:listStanding`
- [x] Add the source marker to each entry — `StandingEntry.source` in `module-standing-roster.service.ts:38`
- [x] Controller e2e for the allow/deny matrix and cross-tenant isolation — `module-access.controller.e2e-spec.ts` "Standing roster reads" describe block
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c10 — Make module-level standing answerable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
