# 01 — A module's roster is readable

**What to build:** A module owner opens their module's settings and sees everyone with standing in it: who they are, what rank they hold, and what data scope they have. People who hold standing because they are an org owner or org admin appear too, marked as holding it that way, so the owner does not try to revoke something their module does not grant.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A module owner, module admin, org admin and org owner can each list a module's standing; a member with no standing in it is refused.
- [ ] Each entry reports rank, data scope, and whether the standing comes from a module role, org-level standing, or a direct grant.
- [ ] A module that is not administrable reports that it carries no standing, rather than returning an empty list.
- [ ] Standing in one organisation is invisible from another; a person in both sees only the current one's.
- [ ] Authorization is the module's own — holding a global settings key does not make every module's roster readable.
- [ ] The permission key exists verbatim in both the backend and frontend catalogs.

## Todo

- [ ] Read how standing is currently derived in all three places and pick the stored one as canonical
- [ ] Add the read behind one interface, deriving rank from the role's module key
- [ ] Add the source marker to each entry
- [ ] Controller e2e for the allow/deny matrix and cross-tenant isolation
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c10 — Make module-level standing answerable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
