# 05 — Module ownership transfers in one operation

**What to build:** An org owner hands a module to a new head in a single action. The new owner holds standing, the outgoing owner does not, and neither state can half-apply. Today this is a manual sweep and an ex-owner keeps standing until someone remembers.

**Blocked by:** 04 — Standing can be granted and revoked

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Transfer appoints the new owner and removes the outgoing one in one transaction.
- [ ] A failure part-way leaves the previous owner in place — never both owners, never neither.
- [ ] An org owner can appoint an owner for a module that currently has none.
- [ ] Every module and its current owner is listable, so an orphaned module is visible.
- [ ] Transfer is refused for a module that is not administrable.

## Todo

- [ ] Reuse the organisation ownership-transfer pattern rather than writing a second
- [ ] Ensure the transaction mock in the spec actually invokes its callback
- [ ] Assert the no-owner and both-owners states are unreachable
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c10 — Make module-level standing answerable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
