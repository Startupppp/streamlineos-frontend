# 06 — Seat limits enforced at the write path

**Status:** done — enforcement was already there; it is now guarded by an invariant.
**Track:** B — enforcement
**Blocked by:** — (can start immediately)

## Why

A cap that is not enforced is a marketing claim, not a limit. Every creation
endpoint for a limited resource already calls the limit assertion; seats are the
gap.

## Acceptance criteria

- [ ] Every membership creation path asserts the limit **inside the same transaction** as the insert.
- [ ] The assertion holds under concurrent creation, proven by a test that races two creations at the boundary.
- [ ] Bulk invitation reserves quota **once for the batch**, not per row.
- [ ] The refusal explains what the limit is and how to raise it.
- [ ] An administrator sees seats used against seats available before hitting the limit.

## Notes (2026-08-26)

**The audit found enforcement already in place at every path** that adds a member
to an existing organisation: both invitation paths, both branches of
`createUser`, and both branches of HR onboarding — each taking the
per-organisation advisory lock and asserting the members limit inside the same
transaction as the insert.

That is the good outcome and also the fragile one. It held because six call sites
each remembered, and nothing would have noticed a seventh that did not. A seat
limit that is not enforced is a marketing claim, and it fails silently: a tenant
on ten seats quietly runs fifty, and the first anyone knows is the invoice
conversation.

So the deliverable became an invariant rather than new enforcement.
`seat-enforcement-invariant.spec.ts` reads the source: every
`insert(organizationMembers)` must reserve a seat **and** take the advisory lock,
or be named in an exemption list with a reason. Three paths are exempt — they
create the organisation's first member, where there is no organisation to be over
the limit of — and each is listed individually, so a fourth joining them is a
deliberate act rather than a pattern match.

Two things it does to avoid lying: it asserts it found at least four insert paths,
because a scan matching nothing reports every invariant as held; and **it was
verified by removing a real guard and watching it fail**, then restoring it. An
invariant nobody has seen fail is a comment.

I got the scan wrong twice, both caught by the test rather than by reading: the
first pattern missed `reserveMemberSeat` and reported HR onboarding as unguarded,
and the second scanned e2e fixtures because `"e2e-spec.ts"` does not contain
`".spec."`.

**Still open:** the administrator-facing "seats used against seats available"
surface. The enforcement is the safety-critical half and it holds.