# 04 — Standing can be granted and revoked

**What to build:** A module owner grants module-admin standing to a person, and revokes it, from the roster screen. Someone leaving the function loses their access in one action rather than a sweep of individual grants.

**Blocked by:** 03 — The read and the write share one predicate

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Granting standing takes effect on the grantee's next request without a re-login.
- [ ] Revoking removes every capability that standing conferred.
- [ ] A grant that exceeds the actor's rank or scope is refused with a reason naming the ceiling.
- [ ] Granting and revoking are audited with the actor, subject, module and rank.

## Todo

- [ ] Wire grant and revoke through the shared predicate
- [ ] Bump the permissions version so the cached snapshot is not stale
- [ ] Assert the audit rows
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c10 — Make module-level standing answerable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
