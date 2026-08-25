# 03 — The read and the write share one predicate

**What to build:** The grant form can never offer something the writer will refuse. The description of what may be granted and the enforcement of what may be granted are computed by the same comparison, so they cannot drift.

**Blocked by:** 02 — An actor knows what they may grant

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The rank and scope comparison exists in exactly one place, consumed by both the read and the write path.
- [ ] For a matrix of actor ranks and scopes, every grant the read offers is accepted by the writer.
- [ ] For the same matrix, every grant the read omits is refused by the writer.
- [ ] The existing write-side refusals are unchanged in behaviour.

## Todo

- [ ] Extract the comparison the grant path already performs
- [ ] Point both sides at it
- [ ] Write the agreement test across the full matrix — this is the ticket's real deliverable
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c10 — Make module-level standing answerable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
